from datetime import datetime

from sqlalchemy import Column, DateTime, Float, ForeignKey, Integer, String, Text, Boolean
from sqlalchemy.orm import relationship

from app.db.session import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    full_name = Column(String(120), nullable=False)
    email = Column(String(255), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)


class Parameter(Base):
    __tablename__ = "parameters"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(120), nullable=False)
    description = Column(Text, nullable=True)
    percentage = Column(Float, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)


class Analysis(Base):
    __tablename__ = "analyses"

    id = Column(Integer, primary_key=True, index=True)
    job_title = Column(String(180), nullable=False, default="General Position")
    job_description = Column(Text, nullable=False)
    preferred_skills = Column(Text, nullable=True)
    approval_threshold = Column(Float, nullable=False, default=70)
    applied_parameters = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    candidates = relationship(
        "CandidateResult",
        back_populates="analysis",
        cascade="all, delete-orphan",
        order_by="CandidateResult.rank",
    )


class CandidateResult(Base):
    __tablename__ = "candidate_results"

    id = Column(Integer, primary_key=True, index=True)
    analysis_id = Column(Integer, ForeignKey("analyses.id"), nullable=False)
    file_name = Column(String(255), nullable=False)
    rank = Column(Integer, nullable=False)
    score = Column(Float, nullable=False)
    recommendation = Column(String(50), nullable=False)
    decision = Column(String(40), nullable=False, default="review")
    matched_skills = Column(Text, nullable=True)
    missing_skills = Column(Text, nullable=True)
    extracted_preview = Column(Text, nullable=True)

    analysis = relationship("Analysis", back_populates="candidates")
