from fastapi import File, Form, HTTPException, Query, UploadFile
from fastapi import APIRouter
from services.minio_service import list_buckets, delete_bucket_and_contents, _client, list_pdfs, delete_pdf, create_bucket, ensure_bucket_exists, upload_file
from utils.helpers import get_conn

router= APIRouter()

@router.get("/buckets")
def get_buckets():
    return {"buckets": list_buckets()}

@router.delete("/delete-workspace")
def delete_workspace(name: str = Form(...)):
    bucket = f"workspace-{name}"
    deleted = delete_bucket_and_contents(bucket)
    if not deleted:
        raise HTTPException(status_code=404, detail=f"Bucket '{bucket}' doesn't exists")

    conn = get_conn()
    cur = conn.cursor()
    cur.execute("DELETE FROM documents WHERE workspace = %s", (name,))
    conn.commit()
    cur.close()
    conn.close()

    return {"message": f" Workspace '{name}' (and the bucket '{bucket}') deleted."}

@router.get("/list-pdfs")
def list_workspace_pdfs(workspace: str = Query(...)):

    bucket = f"workspace-{workspace}"
    if not _client.bucket_exists(bucket):
        raise HTTPException(status_code=404, detail=f"Bucket '{bucket}' doesn't exists")

    pdfs = list_pdfs(bucket)
    return {"pdfs": pdfs}

@router.delete("/delete-pdf")
def delete_pdf_endpoint(
    workspace: str = Form(...),
    filename:  str = Form(...)
):
    bucket = f"workspace-{workspace}"
    
    ok = delete_pdf(bucket, filename)
    if not ok:
        raise HTTPException(
            status_code=404,
            detail=f"'{filename}' is not in bucket {bucket}"
        )

    conn = get_conn()
    cur  = conn.cursor()
    cur.execute(
        "DELETE FROM documents WHERE workspace = %s AND filename = %s",
        (workspace, filename)
    )
    conn.commit()
    cur.close(); conn.close()

    return {"message": f" {filename} deleted from {workspace} workspace"}

@router.post("/create-bucket")
def create_new_bucket(name: str = Form(...)):
    created = create_bucket(name)
    if created:
        return {"message": f" Bucket '{name}' created."}
    else:
        return {"message": f" Bucket '{name}' already exists."}
    
@router.post("/upload-pdf")
def upload_pdf(
    file: UploadFile = File(...),
    workspace: str = Form(...)):
    if not file.filename.endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are supported")

    bucket = f"workspace-{workspace}"
    (bucket)

    file_data = file.file.read()
    upload_file(bucket, file.filename, file_data, content_type="application/pdf")

    return {"filename": file.filename, "bucket": bucket}
