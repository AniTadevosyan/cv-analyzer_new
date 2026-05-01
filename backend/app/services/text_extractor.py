from io import BytesIO
from pathlib import Path

from docx import Document
from fastapi import HTTPException, UploadFile
from PyPDF2 import PdfReader

SUPPORTED_EXTENSIONS = {".pdf", ".docx", ".txt"}


async def extract_text_from_upload(file: UploadFile) -> str:
    suffix = Path(file.filename or "").suffix.lower()
    content = await file.read()

    if suffix not in SUPPORTED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type for {file.filename}. Please upload PDF, DOCX, or TXT.",
        )

    try:
        if suffix == ".pdf":
            return _extract_pdf(content)
        if suffix == ".docx":
            return _extract_docx(content)
        return content.decode("utf-8", errors="ignore")
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Could not read {file.filename}: {exc}") from exc


def _extract_pdf(content: bytes) -> str:
    reader = PdfReader(BytesIO(content))
    pages = [page.extract_text() or "" for page in reader.pages]
    return "\n".join(pages).strip()


def _extract_docx(content: bytes) -> str:
    document = Document(BytesIO(content))
    return "\n".join(paragraph.text for paragraph in document.paragraphs).strip()
