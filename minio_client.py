from minio import Minio
import io
from dotenv import load_dotenv
from minio import Minio, S3Error 
import os

# .env betöltése, ha használsz
load_dotenv()

# MinIO kliens konfigurálása
minio_client = Minio(
    endpoint=os.getenv("MINIO_ENDPOINT", "localhost:9000"),
    access_key=os.getenv("MINIO_ACCESS_KEY", "minioadmin"),
    secret_key=os.getenv("MINIO_SECRET_KEY", "minioadmin123"),
    secure=False  # http
)

def list_pdfs(bucket: str) -> list[str]:
    """
    Visszaadja az adott bucketben található .pdf fájlok listáját.
    Üres listát ad, ha a bucket nem létezik.
    """
    if not minio_client.bucket_exists(bucket):
        return []

    return [
        obj.object_name
        for obj in minio_client.list_objects(bucket, recursive=True)
        if obj.object_name.lower().endswith(".pdf")
    ]

def delete_pdf(bucket: str, object_name: str) -> bool:
    """
    Egyetlen PDF törlése a megadott bucketből.
    False-t ad vissza, ha a bucket / objektum nem létezett.
    """
    if not minio_client.bucket_exists(bucket):
        return False

    # objektum létezik?
    objs = [o for o in minio_client.list_objects(bucket, prefix=object_name) 
            if o.object_name == object_name]
    if not objs:
        return False

    minio_client.remove_object(bucket, object_name)
    return True

# Bucket ellenőrzése / létrehozása ha még nem létezik
def ensure_bucket_exists(bucket_name: str):
    if not minio_client.bucket_exists(bucket_name):
        minio_client.make_bucket(bucket_name)

# Fájl feltöltése adott bucketbe
def upload_file_to_minio(bucket: str, object_name: str, file_data: bytes, content_type: str):
    minio_client.put_object(
        bucket_name=bucket,
        object_name=object_name,
        data=io.BytesIO(file_data),
        length=len(file_data),
        content_type=content_type
    )

# Fájl letöltése bucketből
def download_file_from_minio(bucket: str, object_name: str) -> bytes:
    response = minio_client.get_object(bucket, object_name)
    return response.read()

# Bucketek listázása
def list_buckets():
    return [bucket.name for bucket in minio_client.list_buckets()]

# Bucket létrehozása (ha nem létezik)
def create_bucket(bucket: str):
    if not minio_client.bucket_exists(bucket):
        minio_client.make_bucket(bucket)
        return True
    return False

def delete_bucket_and_contents(bucket: str) -> bool:
    """
    Teljes workspace (bucket) törlése minden benne lévő objektummal együtt.
    True-val tér vissza, ha létezett és sikerült törölni.
    """
    if not minio_client.bucket_exists(bucket):
        return False

    # Összes objektum törlése
    objects_iter = minio_client.list_objects(bucket, recursive=True)
    for obj in objects_iter:
        minio_client.remove_object(bucket, obj.object_name)

    # Végül a bucket törlése
    minio_client.remove_bucket(bucket)
    return True