import hashlib
import os
import secrets
from datetime import datetime, timezone
from pathlib import Path
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError
from dotenv import load_dotenv
from fastapi import HTTPException, Request
from motor.motor_asyncio import AsyncIOMotorClient

load_dotenv(Path(__file__).parent / '.env')
client = AsyncIOMotorClient(os.environ['MONGO_URL'], tz_aware=True)
db = client[os.environ['DB_NAME']]


def now():
    return datetime.now(timezone.utc)


def uid(prefix):
    return f'{prefix}_{secrets.token_hex(12)}'


def digest(token):
    return hashlib.sha256(token.encode()).hexdigest()


def local_now(request: Request):
    try:
        zone = ZoneInfo(request.headers.get('X-Timezone', 'Europe/Istanbul'))
    except (ZoneInfoNotFoundError, ValueError):
        zone = ZoneInfo('Europe/Istanbul')
    return now().astimezone(zone)


async def current_user(request: Request):
    token = request.headers.get('Authorization', '').removeprefix('Bearer ').strip()
    session = await db.user_sessions.find_one(
        {'token_hash': digest(token), 'expires_at': {'$gt': now()}}, {'_id': 0}) if token else None
    if not session:
        raise HTTPException(401, 'Oturumunuz sona erdi. Lütfen tekrar giriş yapın.')
    user = await db.users.find_one({'user_id': session['user_id']}, {'_id': 0, 'password_hash': 0})
    if not user:
        raise HTTPException(401, 'Kullanıcı bulunamadı.')
    return user