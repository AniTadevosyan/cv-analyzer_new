# CV Analyzer Backend

Clean FastAPI backend for the CV Analyzer project.

## What it does
- Upload and read PDF, DOCX, and TXT resumes
- Compare resumes with a job description
- Match preferred skills
- Rank candidates by score
- Save analysis history in SQLite
- Provide Swagger API documentation

## Structure
```text
backend/
  app/
    api/          # API routes
    core/         # settings and config
    db/           # database connection
    models/       # SQLAlchemy models
    schemas/      # Pydantic response schemas
    services/     # CV text extraction and scoring logic
    main.py
  requirements.txt
  .env.example
  .runtime.txt
```

## Run locally
```bash
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

Open:
```text
http://127.0.0.1:8000/docs
```

## Main endpoints
```text
GET  /api/health
POST /api/analyze
GET  /api/analyses
GET  /api/analyses/{analysis_id}
```

## Analyze request
Use `multipart/form-data`:

| Field | Type | Required | Description |
|---|---|---:|---|
| job_description | string | Yes | Job description text |
| preferred_skills | string | No | Comma-separated skills, e.g. `Python, FastAPI, SQL` |
| files | file[] | Yes | One or more CV files |

## cURL example
```bash
curl -X POST "http://127.0.0.1:8000/api/analyze" \
  -F "job_description=We need a Python backend developer with FastAPI and SQL" \
  -F "preferred_skills=Python,FastAPI,SQL,Docker" \
  -F "files=@./sample_cv.pdf"
```

## System email setup
To send interview invitations and application update emails from the system email, create `backend/.env` from `backend/.env.example` and fill in the SMTP values.

Example for Gmail:
- Enable 2-step verification on the Gmail account
- Create an App Password
- Use that App Password as `SMTP_PASSWORD`

Required variables:
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_USERNAME=your-system-email@gmail.com
SMTP_PASSWORD=your-app-password
SMTP_FROM_EMAIL=your-system-email@gmail.com
SMTP_USE_TLS=true
```

Email endpoint:
- `POST /api/candidates/{candidate_id}/send-email`
