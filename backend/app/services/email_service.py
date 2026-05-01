from email.message import EmailMessage
import smtplib
import ssl

from app.core.config import settings


class EmailNotConfiguredError(RuntimeError):
    pass


def build_candidate_message(candidate_name: str, job_title: str, message_type: str) -> tuple[str, str]:
    if message_type == "interview":
        subject = f"Interview Invitation for {job_title}"
        body = f"""Dear {candidate_name},

Thank you for applying for the {job_title} position.

We reviewed your CV and would like to invite you to the next stage of the recruitment process.

Please reply to this email with your available time slots for an interview.

Best regards,
Recruitment Team"""
        return subject, body

    subject = f"Application Update for {job_title}"
    body = f"""Dear {candidate_name},

Thank you for applying for the {job_title} position.

After reviewing your CV, we will not continue with your application for this role at this stage.

We appreciate your interest and wish you success in your job search.

Best regards,
Recruitment Team"""
    return subject, body


def send_system_email(to_email: str, subject: str, body: str) -> None:
    if not settings.smtp_host or not settings.smtp_username or not settings.smtp_password:
        raise EmailNotConfiguredError(
            "System email is not configured. Add SMTP_HOST, SMTP_PORT, SMTP_USERNAME, SMTP_PASSWORD, and SMTP_FROM_EMAIL in backend/.env."
        )

    from_email = settings.smtp_from_email or settings.smtp_username
    message = EmailMessage()
    message["From"] = from_email
    message["To"] = to_email
    message["Subject"] = subject
    message.set_content(body)

    if settings.smtp_use_tls:
        context = ssl.create_default_context()
        with smtplib.SMTP_SSL(settings.smtp_host, settings.smtp_port, context=context) as server:
            server.login(settings.smtp_username, settings.smtp_password)
            server.send_message(message)
    else:
        with smtplib.SMTP(settings.smtp_host, settings.smtp_port) as server:
            server.starttls(context=ssl.create_default_context())
            server.login(settings.smtp_username, settings.smtp_password)
            server.send_message(message)
