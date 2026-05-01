import json
from typing import List

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from sqlalchemy.orm import Session, joinedload

from app.core.config import settings
from app.db.session import get_db
from app.models.analysis import Analysis, CandidateResult, Parameter, User
from app.schemas.analysis import (
    CandidateEmailRequest,
    AnalysisOut,
    AuthOut,
    HealthOut,
    ParameterCreate,
    ParameterOut,
    UserCreate,
    UserLogin,
)
from app.services.analyzer import ScoringParameter, analyze_candidates, normalize_skills
from app.services.security import create_access_token, get_current_user, hash_password, verify_password
from app.services.text_extractor import extract_text_from_upload
from app.services.email_service import EmailNotConfiguredError, build_candidate_message, send_system_email

router = APIRouter()


@router.get("/health", response_model=HealthOut)
def health_check():
    return {"status": "ok", "service": settings.app_name}


@router.post("/auth/signup", response_model=AuthOut, status_code=status.HTTP_201_CREATED)
def signup(payload: UserCreate, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.email == payload.email.lower()).first()
    if existing:
        raise HTTPException(status_code=400, detail="This email is already registered.")

    user = User(
        full_name=payload.full_name.strip(),
        email=payload.email.lower(),
        password_hash=hash_password(payload.password),
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return {"access_token": create_access_token(user.id), "user": user}


@router.post("/auth/login", response_model=AuthOut)
def login(payload: UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == payload.email.lower()).first()
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Incorrect email or password.")
    if not user.is_active:
        raise HTTPException(status_code=403, detail="This account is inactive.")
    return {"access_token": create_access_token(user.id), "user": user}


@router.get("/auth/me")
def me(current_user: User = Depends(get_current_user)):
    return current_user


@router.get("/parameters", response_model=list[ParameterOut])
def list_parameters(db: Session = Depends(get_db)):
    return db.query(Parameter).order_by(Parameter.created_at.asc()).all()


@router.post("/parameters", response_model=ParameterOut, status_code=status.HTTP_201_CREATED)
def create_parameter(
    payload: ParameterCreate,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    current_total = sum(row.percentage for row in db.query(Parameter).all())
    if current_total + payload.percentage > 100:
        remaining = max(0, 100 - current_total)
        raise HTTPException(
            status_code=400,
            detail=f"The total percentage of all parameters cannot exceed 100%. Remaining available percentage: {remaining:.2f}%.",
        )

    parameter = Parameter(
        name=payload.name.strip(),
        description=(payload.description or "").strip(),
        percentage=payload.percentage,
    )
    db.add(parameter)
    db.commit()
    db.refresh(parameter)
    return parameter


@router.delete("/parameters/{parameter_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_parameter(
    parameter_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    parameter = db.query(Parameter).filter(Parameter.id == parameter_id).first()
    if not parameter:
        raise HTTPException(status_code=404, detail="Parameter not found.")
    db.delete(parameter)
    db.commit()
    return None


@router.post("/analyze", response_model=AnalysisOut, status_code=201)
async def analyze_resumes(
    job_title: str = Form(...),
    job_description: str = Form(...),
    preferred_skills: str = Form(""),
    approval_threshold: float = Form(70),
    files: List[UploadFile] = File(...),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    if not files:
        raise HTTPException(status_code=400, detail="Please upload at least one CV.")
    if not job_title.strip():
        raise HTTPException(status_code=400, detail="Job title is required.")
    if approval_threshold < 0 or approval_threshold > 100:
        raise HTTPException(status_code=400, detail="Approval threshold must be between 0 and 100%.")

    skills = normalize_skills(preferred_skills)
    resumes: list[tuple[str, str]] = []

    for file in files:
        text = await extract_text_from_upload(file)
        if not text.strip():
            raise HTTPException(status_code=400, detail=f"No readable text found in {file.filename}.")
        resumes.append((file.filename or "resume", text))

    parameter_rows = db.query(Parameter).order_by(Parameter.created_at.asc()).all()
    scoring_parameters = [
        ScoringParameter(name=row.name, description=row.description or "", percentage=row.percentage)
        for row in parameter_rows
    ]
    applied_parameters = [{"name": row.name, "percentage": row.percentage} for row in parameter_rows]

    try:
        scored_candidates = analyze_candidates(job_description, skills, resumes, scoring_parameters)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    analysis = Analysis(
        job_title=job_title.strip(),
        job_description=job_description,
        preferred_skills=json.dumps(skills),
        approval_threshold=approval_threshold,
        applied_parameters=json.dumps(applied_parameters),
    )
    db.add(analysis)
    db.flush()

    for rank, candidate in enumerate(scored_candidates, start=1):
        decision = "interview" if candidate.score >= approval_threshold else "reject"
        db.add(
            CandidateResult(
                analysis_id=analysis.id,
                file_name=candidate.file_name,
                rank=rank,
                score=candidate.score,
                recommendation=candidate.recommendation,
                decision=decision,
                matched_skills=json.dumps(candidate.matched_skills),
                missing_skills=json.dumps(candidate.missing_skills),
                extracted_preview=candidate.extracted_preview,
            )
        )

    db.commit()
    return _get_analysis_or_404(db, analysis.id)


@router.get("/analyses", response_model=list[AnalysisOut])
def list_analyses(db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    analyses = (
        db.query(Analysis)
        .options(joinedload(Analysis.candidates))
        .order_by(Analysis.created_at.desc())
        .all()
    )
    return [_serialize_analysis(item) for item in analyses]


@router.get("/analyses/{analysis_id}", response_model=AnalysisOut)
def get_analysis(analysis_id: int, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    return _get_analysis_or_404(db, analysis_id)



@router.post("/candidates/{candidate_id}/send-email")
def send_candidate_email(
    candidate_id: int,
    payload: CandidateEmailRequest,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    candidate = (
        db.query(CandidateResult)
        .options(joinedload(CandidateResult.analysis))
        .filter(CandidateResult.id == candidate_id)
        .first()
    )
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate result not found.")

    job_title = candidate.analysis.job_title if candidate.analysis else "the open position"
    candidate_name = candidate.file_name.rsplit(".", 1)[0]
    message_type = "interview" if candidate.decision == "interview" else "application_update"
    subject, body = build_candidate_message(candidate_name, job_title, message_type)

    try:
        send_system_email(str(payload.recipient_email), subject, body)
    except EmailNotConfiguredError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Email could not be sent: {exc}") from exc

    return {
        "status": "sent",
        "recipient_email": str(payload.recipient_email),
        "subject": subject,
        "message_type": message_type,
    }
def _get_analysis_or_404(db: Session, analysis_id: int) -> AnalysisOut:
    analysis = (
        db.query(Analysis)
        .options(joinedload(Analysis.candidates))
        .filter(Analysis.id == analysis_id)
        .first()
    )
    if not analysis:
        raise HTTPException(status_code=404, detail="Analysis not found.")
    return _serialize_analysis(analysis)


def _safe_json_list(value: str | None):
    try:
        loaded = json.loads(value or "[]")
        return loaded if isinstance(loaded, list) else []
    except json.JSONDecodeError:
        return []


def _serialize_analysis(analysis: Analysis) -> AnalysisOut:
    return AnalysisOut(
        id=analysis.id,
        job_title=analysis.job_title or "General Position",
        job_description=analysis.job_description,
        preferred_skills=_safe_json_list(analysis.preferred_skills),
        approval_threshold=analysis.approval_threshold or 70,
        applied_parameters=_safe_json_list(analysis.applied_parameters),
        created_at=analysis.created_at,
        candidates=[
            {
                "id": candidate.id,
                "file_name": candidate.file_name,
                "rank": candidate.rank,
                "score": candidate.score,
                "recommendation": candidate.recommendation,
                "decision": candidate.decision or "review",
                "matched_skills": _safe_json_list(candidate.matched_skills),
                "missing_skills": _safe_json_list(candidate.missing_skills),
                "extracted_preview": candidate.extracted_preview or "",
            }
            for candidate in analysis.candidates
        ],
    )
