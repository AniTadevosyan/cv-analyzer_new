@echo off
start "CV Analyzer Backend" cmd /k "cd backend && python -m venv .venv && call .venv\Scripts\activate && pip install -r requirements.txt && uvicorn app.main:app --reload --port 8000"
start "CV Analyzer Frontend" cmd /k "npm install && npm run dev -- --host 0.0.0.0 --port 8080"
