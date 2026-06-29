"""
Author: yuanzi
Date: 2025-12-11
Description: 
"""
import logging
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from typing import Any

import emails  # type: ignore
import jwt
from jwt.exceptions import InvalidTokenError

from app.core import security
from app.core.config import settings

logger = logging.getLogger(__name__)


@dataclass
class EmailData:
    html_content: str
    subject: str


# NOTE: Email MJML/HTML template files were removed from the repo.
# To avoid runtime failures from missing files, we no longer render
# templates from disk and instead assemble minimal HTML inline.
def _inline_html(title: str, body_lines: list[str]) -> str:
    """Build a small inline HTML email to replace removed templates."""
    items = "".join(f"<p>{line}</p>" for line in body_lines)
    return (
        "<!doctype html><html><head><meta charset='utf-8'>"
        f"<title>{title}</title>"
        "</head><body>"
        f"<h2>{title}</h2>"
        f"{items}"
        "</body></html>"
    )


def send_email(
    *,
    email_to: str,
    subject: str = "",
    html_content: str = "",
) -> None:
    assert settings.emails_enabled, "no provided configuration for email variables"
    message = emails.Message(
        subject=subject,
        html=html_content,
        mail_from=(settings.EMAILS_FROM_NAME, settings.EMAILS_FROM_EMAIL),
    )
    smtp_options = {"host": settings.SMTP_HOST, "port": settings.SMTP_PORT}
    if settings.SMTP_TLS:
        smtp_options["tls"] = True
    elif settings.SMTP_SSL:
        smtp_options["ssl"] = True
    if settings.SMTP_USER:
        smtp_options["user"] = settings.SMTP_USER
    if settings.SMTP_PASSWORD:
        smtp_options["password"] = settings.SMTP_PASSWORD
    response = message.send(to=email_to, smtp=smtp_options)
    logger.info(f"send email result: {response}")


def generate_test_email(email_to: str) -> EmailData:
    project_name = settings.PROJECT_NAME
    subject = f"{project_name} - Test email"
    html_content = _inline_html(
        subject,
        [
            f"This is a test email from {settings.PROJECT_NAME}.",
            f"Recipient: {email_to}",
        ],
    )
    return EmailData(html_content=html_content, subject=subject)


def generate_reset_password_email(email_to: str, email: str, token: str) -> EmailData:
    project_name = settings.PROJECT_NAME
    subject = f"{project_name} - Password recovery for user {email}"
    link = f"{settings.FRONTEND_HOST}/reset-password?token={token}"
    html_content = _inline_html(
        subject,
        [
            f"Hello {email},",
            "You (or someone else) requested a password reset.",
            f"This link is valid for {settings.EMAIL_RESET_TOKEN_EXPIRE_HOURS} hours.",
            f"Reset link: <a href=\"{link}\">{link}</a>",
            "If you did not request this, you can ignore this email.",
        ],
    )
    return EmailData(html_content=html_content, subject=subject)


def generate_new_account_email(
    email_to: str, username: str, password: str
) -> EmailData:
    project_name = settings.PROJECT_NAME
    subject = f"{project_name} - New account for user {username}"
    html_content = _inline_html(
        subject,
        [
            f"Welcome {username} to {settings.PROJECT_NAME}.",
            f"Login email: {email_to}",
            f"Temporary password: {password}",
            f"Sign in: <a href=\"{settings.FRONTEND_HOST}\">{settings.FRONTEND_HOST}</a>",
        ],
    )
    return EmailData(html_content=html_content, subject=subject)


def generate_password_reset_token(email: str) -> str:
    delta = timedelta(hours=settings.EMAIL_RESET_TOKEN_EXPIRE_HOURS)
    now = datetime.now(timezone.utc)
    expires = now + delta
    exp = expires.timestamp()
    encoded_jwt = jwt.encode(
        {"exp": exp, "nbf": now, "sub": email},
        settings.SECRET_KEY,
        algorithm=security.ALGORITHM,
    )
    return encoded_jwt


def verify_password_reset_token(token: str) -> str | None:
    try:
        decoded_token = jwt.decode(
            token, settings.SECRET_KEY, algorithms=[security.ALGORITHM]
        )
        return str(decoded_token["sub"])
    except InvalidTokenError:
        return None
