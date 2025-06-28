import io
from minio import Minio
from app.config import settings

_client = Minio(
    endpoint=settings.MINIO_ENDPOINT,
    access_key=settings.MINIO_ACCESS_KEY,
    secret_key=settings.MINIO_SECRET_KEY,
    secure=False
)

def ensure_bucket_exists(bucket: str):
    if not _client.bucket_exists(bucket):
        _client.make_bucket(bucket)


def upload_file(bucket: str, object_name: str, data: bytes, content_type: str):
    _client.put_object(bucket, object_name, io.BytesIO(data), len(data), content_type)

def download_file_from_minio(bucket: str, object_name: str) -> bytes:
    response = _client.get_object(bucket, object_name)
    return response.read()

def list_pdfs(bucket: str) -> list[str]:
    if not _client.bucket_exists(bucket):
        return []
    return [
        obj.object_name
        for obj in _client.list_objects(bucket, recursive=True)
        if obj.object_name.lower().endswith(".pdf")
    ]

def delete_pdf(bucket: str, object_name: str) -> bool:
    if not _client.bucket_exists(bucket):
        return False

    objs = [o for o in _client.list_objects(bucket, prefix=object_name) 
            if o.object_name == object_name]
    if not objs:
        return False
    _client.remove_object(bucket, object_name)
    return True

def list_buckets():
    return [bucket.name for bucket in _client.list_buckets()]

def create_bucket(bucket: str):
    if not _client.bucket_exists(bucket):
        _client.make_bucket(bucket)
        return True
    return False

def delete_bucket_and_contents(bucket: str) -> bool:
    if not _client.bucket_exists(bucket):
        return False

    objects_iter = _client.list_objects(bucket, recursive=True)
    for obj in objects_iter:
        _client.remove_object(bucket, obj.object_name)

    _client.remove_bucket(bucket)
    return True