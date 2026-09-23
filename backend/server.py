import logging
import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from core import db, client
from auth import router as auth_router
from routes import router
from media import init_storage


@asynccontextmanager
async def lifespan(app):
    await db.users.create_index('email', unique=True)
    await db.users.create_index('user_id', unique=True)
    await db.user_sessions.create_index('token_hash', unique=True)
    await db.user_sessions.create_index('expires_at', expireAfterSeconds=0)
    await db.daily_logs.create_index([('user_id', 1), ('date', 1)], unique=True)
    await db.usage.create_index([('user_id', 1), ('date', 1)], unique=True)
    await db.meals.create_index('detection_id', unique=True)
    await db.meals.create_index([('user_id', 1), ('date', 1)])
    await db.auth_attempts.create_index('expires_at', expireAfterSeconds=0)
    try:
        await init_storage()
    except Exception:
        logging.exception('Photo storage initialization deferred')
    yield
    client.close()


app = FastAPI(title='Ritim API', lifespan=lifespan)
origins = [v.strip() for v in os.getenv('CORS_ORIGINS', '').split(',') if v.strip()]
app.add_middleware(CORSMiddleware, allow_origins=origins or ['*'],
                   allow_credentials=False, allow_methods=['*'], allow_headers=['*'])
app.include_router(auth_router, prefix='/api')
app.include_router(router, prefix='/api')