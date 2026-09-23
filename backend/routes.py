from datetime import timedelta
from fastapi import APIRouter, Depends, HTTPException, Request, UploadFile, File, Response
from starlette.concurrency import run_in_threadpool
from pymongo import ReturnDocument
from pymongo.errors import DuplicateKeyError
from core import db, uid, now, local_now, current_user
from models import (User, DetectInput, Detection, MealInput, Meal, DailyLog, LogInput, Subscription, ThemeInput)
from scoring import SAMPLES, score_meal, overall, insight
from media import storage_call, compress_image
from report import build_report

router = APIRouter()


async def day_data(user, date):
    log = await db.daily_logs.find_one({'user_id': user['user_id'], 'date': date}, {'_id': 0})
    log = DailyLog(**(log or {'date': date})).model_dump()
    meals = await db.meals.find({'user_id': user['user_id'], 'date': date}, {'_id': 0}).sort('timestamp', -1).to_list(500)
    log['overall_score'] = overall(meals, log)
    if meals or log['sleep'] is not None or log['water'] or log['recovery_mode'] or log['journal_entry']:
        await db.daily_logs.update_one({'user_id': user['user_id'], 'date': date}, {'$set': log}, upsert=True)
    return log, meals


@router.get('/health')
async def health():
    await db.command('ping')
    return {'status': 'ok', 'app': 'Ritim'}


@router.get('/assets/{key}')
async def public_asset(key: str):
    asset = await db.assets.find_one({'key': key}, {'_id': 0})
    if not asset:
        raise HTTPException(404, 'Görsel bulunamadı.')
    res = await storage_call('GET', asset['storage_path'])
    return Response(res.content, media_type='image/jpeg', headers={'Cache-Control': 'public, max-age=86400'})


@router.get('/dashboard')
async def dashboard(request: Request, user=Depends(current_user)):
    local = local_now(request)
    date = local.date().isoformat()
    log, meals = await day_data(user, date)
    usage = await db.usage.find_one({'user_id': user['user_id'], 'date': date}, {'_id': 0})
    start = (local.date() - timedelta(days=6)).isoformat()
    logs = await db.daily_logs.find({'user_id': user['user_id'], 'date': {'$gte': start, '$lte': date}}, {'_id': 0}).to_list(7)
    totals = {k: round(sum(m['macros'][k] for m in meals), 1) for k in ['protein', 'carbs', 'fat', 'fiber', 'sugar']}
    micros = {k: round(sum(m['micronutrients'][k] for m in meals), 1) for k in ['iron', 'calcium', 'magnesium', 'vitamin_c']}
    return {'date': date, 'log': DailyLog(**log), 'meals': [Meal(**m) for m in meals],
            'timeline': [DailyLog(**v) for v in logs], 'macros': totals,
            'micronutrients': micros if user['subscription'] == 'pro' else None,
            'camera_used': (usage or {}).get('count', 0), 'camera_limit': None if user['subscription'] == 'pro' else 5,
            'insight': insight(meals, log, local.hour) if user['subscription'] == 'pro' else None}


@router.post('/detect', response_model=Detection)
async def detect(data: DetectInput, request: Request, user=Depends(current_user)):
    if data.image_id and not await db.images.find_one({'image_id': data.image_id, 'user_id': user['user_id']}, {'_id': 0}):
        raise HTTPException(404, 'Fotoğraf bulunamadı.')
    date = local_now(request).date().isoformat()
    key = {'user_id': user['user_id'], 'date': date}
    await db.usage.update_one(key, {'$setOnInsert': {'count': 0}}, upsert=True)
    query = {**key, **({'count': {'$lt': 5}} if user['subscription'] == 'free' else {})}
    used = await db.usage.find_one_and_update(query, {'$inc': {'count': 1}}, return_document=ReturnDocument.AFTER, projection={'_id': 0})
    if not used:
        raise HTTPException(429, 'Bugünkü 5 analiz hakkını kullandın. Yarın devam edebilir veya Pro denemesini açabilirsin.')
    detection = {'detection_id': uid('detect'), **SAMPLES[data.sample], 'image_id': data.image_id, 'simulated': True}
    await db.detections.insert_one({**detection, 'user_id': user['user_id'], 'created_at': now().isoformat()})
    return Detection(**detection)


@router.post('/meals', response_model=Meal)
async def save_meal(data: MealInput, request: Request, user=Depends(current_user)):
    existing = await db.meals.find_one({'detection_id': data.detection_id, 'user_id': user['user_id']}, {'_id': 0})
    if existing:
        return Meal(**existing)
    detection = await db.detections.find_one({'detection_id': data.detection_id, 'user_id': user['user_id']}, {'_id': 0})
    if not detection:
        raise HTTPException(404, 'Analiz bulunamadı. Fotoğrafı tekrar analiz et.')
    local = local_now(request)
    meal = {**Detection(**detection).model_dump(), 'meal_id': uid('meal'), 'user_id': user['user_id'],
            'tag': data.tag, 'meal_type': data.meal_type, **score_meal(data.tag, detection['macros']),
            'date': local.date().isoformat(), 'timestamp': now().isoformat(), 'local_hour': local.hour}
    try:
        await db.meals.insert_one(meal.copy())
    except DuplicateKeyError:
        meal = await db.meals.find_one({'detection_id': data.detection_id, 'user_id': user['user_id']}, {'_id': 0})
    await day_data(user, local.date().isoformat())
    return Meal(**meal)


@router.get('/meals', response_model=list[Meal])
async def list_meals(user=Depends(current_user)):
    rows = await db.meals.find({'user_id': user['user_id']}, {'_id': 0}).sort('timestamp', -1).to_list(200)
    return [Meal(**r) for r in rows]


@router.delete('/meals/{meal_id}')
async def delete_meal(meal_id: str, user=Depends(current_user)):
    meal = await db.meals.find_one({'meal_id': meal_id, 'user_id': user['user_id']}, {'_id': 0})
    if not meal:
        raise HTTPException(404, 'Öğün bulunamadı.')
    await db.meals.delete_one({'meal_id': meal_id, 'user_id': user['user_id']})
    await day_data(user, meal['date'])
    await db.daily_logs.update_one({'user_id': user['user_id'], 'date': meal['date']}, {'$set': {'overall_score': (await day_data(user, meal['date']))[0]['overall_score']}})
    return {'ok': True}


@router.put('/logs/today', response_model=DailyLog)
async def save_log(data: LogInput, request: Request, user=Depends(current_user)):
    date = local_now(request).date().isoformat()
    payload = data.model_dump(exclude_none=True)
    if data.recovery_mode and not (data.journal_entry or '').strip():
        raise HTTPException(422, 'Dinlenme gününe bir cümlelik not ekle.')
    await db.daily_logs.update_one({'user_id': user['user_id'], 'date': date}, {'$set': payload}, upsert=True)
    log, _ = await day_data(user, date)
    return DailyLog(**log)


@router.put('/subscription', response_model=User)
async def subscription(data: Subscription, user=Depends(current_user)):
    # Explicit prototype feature switch. No payment is collected.
    update = {'subscription': data.tier}
    if data.tier == 'free':
        update['theme'] = 'light'
    await db.users.update_one({'user_id': user['user_id']}, {'$set': update})
    return User(**{**user, **update})


@router.put('/theme', response_model=User)
async def theme(data: ThemeInput, user=Depends(current_user)):
    if user['subscription'] != 'pro':
        raise HTTPException(403, 'Özel temalar Pro ile kullanılabilir.')
    await db.users.update_one({'user_id': user['user_id']}, {'$set': data.model_dump()})
    return User(**{**user, **data.model_dump()})


@router.post('/images')
async def upload_image(file: UploadFile = File(...), user=Depends(current_user)):
    raw = await file.read(10 * 1024 * 1024 + 1)
    if len(raw) > 10 * 1024 * 1024:
        raise HTTPException(413, 'Fotoğraf en fazla 10 MB olabilir.')
    compressed = await run_in_threadpool(compress_image, raw)
    image_id = uid('image')
    result = await storage_call('PUT', f"ritim/uploads/{user['user_id']}/{image_id}.jpg", compressed)
    await db.images.insert_one({'image_id': image_id, 'user_id': user['user_id'], 'storage_path': result.json()['path']})
    return {'image_id': image_id, 'image_url': f'/api/images/{image_id}'}


@router.get('/images/{image_id}')
async def get_image(image_id: str, user=Depends(current_user)):
    image = await db.images.find_one({'image_id': image_id, 'user_id': user['user_id']}, {'_id': 0})
    if not image:
        raise HTTPException(404, 'Fotoğraf bulunamadı.')
    res = await storage_call('GET', image['storage_path'])
    return Response(res.content, media_type='image/jpeg', headers={'Cache-Control': 'private, max-age=3600'})


@router.get('/report')
async def report(request: Request, user=Depends(current_user)):
    local = local_now(request)
    await day_data(user, local.date().isoformat())
    start = (local.date() - timedelta(days=29)).isoformat()
    query = {'user_id': user['user_id'], 'date': {'$gte': start, '$lte': local.date().isoformat()}}
    meals = await db.meals.find(query, {'_id': 0}).sort('timestamp', 1).to_list(2000)
    logs = await db.daily_logs.find(query, {'_id': 0}).sort('date', 1).to_list(30)
    pdf = await run_in_threadpool(build_report, user, meals, logs)
    return Response(pdf, media_type='application/pdf', headers={'Content-Disposition': 'attachment; filename="ritim-klinik-rapor.pdf"'})