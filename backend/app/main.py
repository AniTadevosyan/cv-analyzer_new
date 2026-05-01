from sqlalchemy import inspect, text
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import router as api_router
from app.core.config import settings
from app.db.session import Base, engine
from app.models.analysis import Analysis, CandidateResult, Parameter, User  # noqa: F401

Base.metadata.create_all(bind=engine)


def run_lightweight_sqlite_migrations():
    """Keep local demo DBs working when new columns are added during development."""
    if not settings.database_url.startswith("sqlite"):
        return

    inspector = inspect(engine)
    table_names = inspector.get_table_names()

    with engine.begin() as connection:
        if "analyses" in table_names:
            columns = {column["name"] for column in inspector.get_columns("analyses")}
            if "job_title" not in columns:
                connection.execute(text("ALTER TABLE analyses ADD COLUMN job_title VARCHAR(180) NOT NULL DEFAULT 'General Position'"))
            if "approval_threshold" not in columns:
                connection.execute(text("ALTER TABLE analyses ADD COLUMN approval_threshold FLOAT NOT NULL DEFAULT 70"))
            if "applied_parameters" not in columns:
                connection.execute(text("ALTER TABLE analyses ADD COLUMN applied_parameters TEXT"))

        if "candidate_results" in table_names:
            columns = {column["name"] for column in inspector.get_columns("candidate_results")}
            if "decision" not in columns:
                connection.execute(text("ALTER TABLE candidate_results ADD COLUMN decision VARCHAR(40) NOT NULL DEFAULT 'review'"))


run_lightweight_sqlite_migrations()

app = FastAPI(
    title=settings.app_name,
    version="1.0.0",
    description="CV Analyzer API for ranking resumes against job requirements.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix=settings.api_prefix)


@app.get("/")
def root():
    return {
        "message": "CV Analyzer Backend is running",
        "docs": "/docs",
        "health": f"{settings.api_prefix}/health",
    }
