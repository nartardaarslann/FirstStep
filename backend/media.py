import asyncio
import io
import os
import httpx
from PIL import Image, ImageOps, UnidentifiedImageError
from fastapi import HTTPException

STORAGE_BASE = (os.environ.get('INTEGRATION_PROXY_URL') or '').strip() or 'https://integrations.emergentagent.com'
STORAGE_URL = STORAGE_BASE.rstrip('/') + '/objstore/api/v1/storage'
storage_key = None
lock = asyncio.Lock()


async def init_storage():
    global storage_key
    async with lock:
        if not storage_key:
            async with httpx.AsyncClient(timeout=30) as client:
                res = await client.post(f'{STORAGE_URL}/init', json={'emergent_key': os.getenv('EMERGENT_LLM_KEY')})
                res.raise_for_status()
                storage_key = res.json()['storage_key']
    return storage_key


async def storage_call(method, path, data=None):
    global storage_key
    for attempt in range(2):
        key = await init_storage()
        async with httpx.AsyncClient(timeout=60) as client:
            response = await client.request(method, f'{STORAGE_URL}/objects/{path}',
                headers={'X-Storage-Key': key, 'Content-Type': 'image/jpeg'}, content=data)
        if response.status_code == 503 and attempt == 0:
            storage_key = None
            continue
        if response.status_code == 402:
            raise HTTPException(503, 'Fotoğraf yükleme şu an kullanılamıyor. Örnek öğünle devam edebilirsiniz.')
        if response.status_code >= 400:
            raise HTTPException(503, 'Fotoğraf servisine ulaşılamıyor. Lütfen tekrar deneyin.')
        return response


def compress_image(raw):
    try:
        image = Image.open(io.BytesIO(raw))
        if image.width * image.height > 25_000_000:
            raise HTTPException(413, 'Fotoğraf çok büyük. Daha küçük bir fotoğraf seçin.')
        image = ImageOps.exif_transpose(image).convert('RGB')
        image.thumbnail((1400, 1400))
        output = io.BytesIO()
        image.save(output, format='JPEG', quality=82)
        return output.getvalue()
    except (UnidentifiedImageError, OSError, Image.DecompressionBombError):
        raise HTTPException(422, 'Geçerli bir JPEG, PNG veya WebP fotoğraf seçin.')