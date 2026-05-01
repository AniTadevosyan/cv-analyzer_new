import re
from dataclasses import dataclass
from typing import List

from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity


@dataclass
class ScoringParameter:
    name: str
    description: str
    percentage: float


@dataclass
class CandidateScore:
    file_name: str
    score: float
    recommendation: str
    matched_skills: List[str]
    missing_skills: List[str]
    extracted_preview: str


def normalize_skills(raw_skills: str | None) -> List[str]:
    if not raw_skills:
        return []
    return [skill.strip() for skill in raw_skills.split(",") if skill.strip()]


def analyze_candidates(
    job_description: str,
    preferred_skills: List[str],
    resumes: List[tuple[str, str]],
    scoring_parameters: List[ScoringParameter] | None = None,
) -> List[CandidateScore]:
    if not job_description.strip():
        raise ValueError("Job description is required.")

    documents = [job_description] + [resume_text for _, resume_text in resumes]
    vectorizer = TfidfVectorizer(stop_words="english", ngram_range=(1, 2))
    matrix = vectorizer.fit_transform(documents)

    job_vector = matrix[0]
    resume_vectors = matrix[1:]
    similarities = cosine_similarity(job_vector, resume_vectors).flatten()

    results: List[CandidateScore] = []
    for index, (file_name, resume_text) in enumerate(resumes):
        skill_result = _match_skills(resume_text, preferred_skills)
        similarity_score = float(similarities[index] * 100)
        skill_score = _skill_score(skill_result["matched"], preferred_skills)
        default_score = (similarity_score * 0.7) + (skill_score * 0.3)
        final_score = _weighted_score(
            resume_text=resume_text,
            job_description=job_description,
            similarity_score=similarity_score,
            skill_score=skill_score,
            default_score=default_score,
            scoring_parameters=scoring_parameters or [],
        )

        results.append(
            CandidateScore(
                file_name=file_name,
                score=round(final_score, 2),
                recommendation=_recommendation(final_score),
                matched_skills=skill_result["matched"],
                missing_skills=skill_result["missing"],
                extracted_preview=_preview(resume_text),
            )
        )

    return sorted(results, key=lambda item: item.score, reverse=True)


def _weighted_score(
    resume_text: str,
    job_description: str,
    similarity_score: float,
    skill_score: float,
    default_score: float,
    scoring_parameters: List[ScoringParameter],
) -> float:
    if not scoring_parameters:
        return default_score

    total_weight = min(sum(parameter.percentage for parameter in scoring_parameters), 100)
    weighted_total = 0.0

    for parameter in scoring_parameters:
        component_score = _parameter_component_score(
            parameter=parameter,
            resume_text=resume_text,
            job_description=job_description,
            similarity_score=similarity_score,
            skill_score=skill_score,
        )
        weighted_total += component_score * (parameter.percentage / 100)

    remaining_weight = max(0, 100 - total_weight) / 100
    return max(0, min(100, weighted_total + (default_score * remaining_weight)))


def _parameter_component_score(
    parameter: ScoringParameter,
    resume_text: str,
    job_description: str,
    similarity_score: float,
    skill_score: float,
) -> float:
    combined = f"{parameter.name} {parameter.description or ''}".lower()

    if any(word in combined for word in ["job", "description", "responsibil", "requirement", "similarity", "role match"]):
        return similarity_score
    if any(word in combined for word in ["skill", "technical", "technology", "tool", "preferred"]):
        return skill_score
    if any(word in combined for word in ["experience", "years", "senior", "junior", "middle"]):
        return _experience_score(resume_text, job_description)
    if any(word in combined for word in ["education", "degree", "certification", "certificate", "university"]):
        return _keyword_group_score(resume_text, ["degree", "bachelor", "master", "university", "certified", "certificate", "certification"])
    if any(word in combined for word in ["soft", "communication", "team", "leadership", "management"]):
        return _keyword_group_score(resume_text, ["communication", "team", "leadership", "management", "collaboration", "problem solving", "ownership"])

    return _description_keyword_score(resume_text, f"{parameter.name} {parameter.description or ''}")


def _match_skills(text: str, skills: List[str]) -> dict[str, List[str]]:
    lower_text = text.lower()
    matched = []
    missing = []

    for skill in skills:
        pattern = r"\b" + re.escape(skill.lower()) + r"\b"
        if re.search(pattern, lower_text):
            matched.append(skill)
        else:
            missing.append(skill)

    return {"matched": matched, "missing": missing}


def _skill_score(matched_skills: List[str], preferred_skills: List[str]) -> float:
    if not preferred_skills:
        return 0.0
    return (len(matched_skills) / len(preferred_skills)) * 100


def _experience_score(resume_text: str, job_description: str) -> float:
    resume_years = _max_years(resume_text)
    required_years = _max_years(job_description)
    if required_years == 0:
        return 60 if resume_years else 30
    return min(100, (resume_years / required_years) * 100)


def _max_years(text: str) -> int:
    numbers = [int(match) for match in re.findall(r"(\d+)\+?\s*(?:years|year|yrs|yr)", text.lower())]
    return max(numbers) if numbers else 0


def _keyword_group_score(text: str, keywords: List[str]) -> float:
    lower_text = text.lower()
    if not keywords:
        return 0.0
    matched = sum(1 for keyword in keywords if keyword in lower_text)
    return min(100, (matched / max(1, len(keywords))) * 100 * 2)


def _description_keyword_score(resume_text: str, parameter_text: str) -> float:
    words = [
        word for word in re.findall(r"[a-zA-Z][a-zA-Z+#.]{2,}", parameter_text.lower())
        if word not in {"and", "the", "for", "with", "this", "that", "should", "candidate"}
    ]
    unique_words = sorted(set(words))
    if not unique_words:
        return 50.0
    lower_resume = resume_text.lower()
    matched = sum(1 for word in unique_words if word in lower_resume)
    return (matched / len(unique_words)) * 100


def _recommendation(score: float) -> str:
    if score >= 75:
        return "Strong Match"
    if score >= 50:
        return "Good Match"
    if score >= 30:
        return "Moderate Match"
    return "Low Match"


def _preview(text: str, limit: int = 450) -> str:
    cleaned = " ".join(text.split())
    return cleaned[:limit] + ("..." if len(cleaned) > limit else "")
