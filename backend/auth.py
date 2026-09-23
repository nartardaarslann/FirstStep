import secrets
from datetime import timedelta
import bcrypt
import httpx
from fastapi import APIRouter, Depends, HTTPException, Request
from pymongo.errors import DuplicateKeyError
from core import db, now, uid, digest, current_user
from models import Register, Login, AuthResult, User, SessionExchange, Onboarding

router = APIRouter(prefix='/auth')


async def issue_session(user, token=None):
    token = token or secrets.token_urlsafe(48)
    await db.user_sessions.update_one({'token_hash': digest(token)}, {'$set': {
        'user_id': user['user_id'], 'created_at': now(),
        'expires_at': now() + timedelta(days=7)}}, upsert=True)
    return AuthResult(session_token=token, user=User(**user))


async def throttle(request, email):
    key = digest(f'{request.client.host}:{email.lower()}')
    doc = await db.auth_attempts.find_one({'key': key, 'expires_at': {'$gt': now()}}, {'_id': 0})
    if doc and doc['count'] >= 15:
        raise HTTPException(429, 'Çok fazla deneme. 15 dakika sonra tekrar deneyin.')
    if not doc:
        await db.auth_attempts.delete_many({'key': key})
        await db.auth_attempts.insert_one({'key': key, 'count': 1, 'expires_at': now() + timedelta(minutes=15)})
    else:
        await db.auth_attempts.update_one({'key': key}, {'$inc': {'count': 1}})


@router.post('/register', response_model=AuthResult)
async def register(data: Register, request: Request):
    await throttle(request, data.email)
    if len(data.password.encode()) > 72 or not data.name.strip():
        raise HTTPException(422, 'Adınızı ve en fazla 72 bayt uzunluğunda bir şifre girin.')
    user = {'user_id': uid('user'), 'name': data.name.strip(), 'email': data.email.lower(),
            'password_hash': bcrypt.hashpw(data.password.encode(), bcrypt.gensalt()).decode(),
            'subscription': 'free', 'theme': 'light', 'onboarding': None, 'created_at': now().isoformat()}
    try:
        await db.users.insert_one(user.copy())
    except DuplicateKeyError:
        raise HTTPException(409, 'Bu e-posta zaten kayıtlı. Giriş yapabilirsiniz.')
    return await issue_session(user)


@router.post('/login', response_model=AuthResult)
async def login(data: Login, request: Request):
    await throttle(request, data.email)
    user = await db.users.find_one({'email': data.email.lower()}, {'_id': 0})
    if not user or not user.get('password_hash') or len(data.password.encode()) > 72 or not bcrypt.checkpw(data.password.encode(), user['password_hash'].encode()):
        raise HTTPException(401, 'E-posta veya şifre hatalı.')
    return await issue_session(user)


@router.post('/session', response_model=AuthResult)
async def google_session(data: SessionExchange):
    async with httpx.AsyncClient(timeout=25) as client:
        try:
            result = await client.get('https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data', headers={'X-Session-ID': data.session_id})
        except httpx.HTTPError:
            raise HTTPException(503, 'Google girişine şu an ulaşılamıyor.')
    if result.status_code != 200:
        raise HTTPException(401, 'Google oturumu geçersiz. Yeniden deneyin.')
    identity = result.json()
    email = identity['email'].lower()
    await db.users.update_one({'email': email}, {'$setOnInsert': {
        'user_id': uid('user'), 'email': email, 'name': identity.get('name', email.split('@')[0]),
        'subscription': 'free', 'theme': 'light', 'onboarding': None, 'created_at': now().isoformat()}}, upsert=True)
    user = await db.users.find_one({'email': email}, {'_id': 0})
    return await issue_session(user, identity['session_token'])


@router.get('/me', response_model=User)
async def me(user=Depends(current_user)):
    return User(**user)


@router.post('/logout')
async def logout(request: Request, user=Depends(current_user)):
    token = request.headers.get('Authorization', '').removeprefix('Bearer ').strip()
    await db.user_sessions.delete_one({'token_hash': digest(token)})
    return {'ok': True}


@router.put('/onboarding', response_model=User)
async def onboarding(data: Onboarding, user=Depends(current_user)):
    await db.users.update_one({'user_id': user['user_id']}, {'$set': {'onboarding': data.model_dump()}})
    return User(**{**user, 'onboarding': data.model_dump()})