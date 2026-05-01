# CV Analyzer — Frontend + Backend

Full project with React frontend and FastAPI backend.

## What is included
- Login / Signup connected to backend
- CV upload and real backend analysis
- Add Parameter functionality
- Validation: all parameter percentages together cannot exceed 100%
- Pricing removed completely
- SQLite database support

## Run everything together on Windows
Double-click:

```text
start-dev.bat
```

Or run:

```bash
start-dev.bat
```

## Run manually

### Backend
```bash
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

Backend Swagger:
```text
http://127.0.0.1:8000/docs
```

### Frontend
Open another terminal:

```bash
npm install
npm run dev -- --host 0.0.0.0 --port 8080
```

Frontend:
```text
http://localhost:8080
```

## Main API endpoints
- POST `/api/auth/signup`
- POST `/api/auth/login`
- GET `/api/parameters`
- POST `/api/parameters`
- DELETE `/api/parameters/{id}`
- POST `/api/analyze`
