from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class CandidateResultOut(BaseModel):
    id: int
    file_name: str
    rank: int
    score: float
    recommendation: str
    decision: str
    matched_skills: List[str]
    missing_skills: List[str]
    extracted_preview: str

    model_config = ConfigDict(from_attributes=True)


class AppliedParameterOut(BaseModel):
    name: str
    percentage: float


class AnalysisOut(BaseModel):
    id: int
    job_title: str
    job_description: str
    preferred_skills: List[str]
    approval_threshold: float
    applied_parameters: List[AppliedParameterOut]
    created_at: datetime
    candidates: List[CandidateResultOut]

    model_config = ConfigDict(from_attributes=True)


class HealthOut(BaseModel):
    status: str
    service: str


class UserCreate(BaseModel):
    full_name: str = Field(..., min_length=2, max_length=120)
    email: EmailStr
    password: str = Field(..., min_length=6)


class UserLogin(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=1)


class UserOut(BaseModel):
    id: int
    full_name: str
    email: EmailStr
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class AuthOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


class ParameterCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=120)
    description: Optional[str] = ""
    percentage: float = Field(..., gt=0, le=100)


class ParameterOut(BaseModel):
    id: int
    name: str
    description: str | None
    percentage: float
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class CandidateEmailRequest(BaseModel):
    recipient_email: EmailStr
