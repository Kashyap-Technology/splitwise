import dj_database_url
from decouple import config

from .base import *

DEBUG = False

DATABASES = {
    "default": dj_database_url.config(
        default=config("DATABASE_URL"),
        conn_max_age=600,
        ssl_require=True,
    )
}

# The Vercel frontend is a different site from the Render API, so the JWT cookies
# are cross-site and must be SameSite=None + Secure. Secure values are the default
# here; the env vars exist so a same-origin deployment can relax them.
SIMPLE_JWT = {
    **SIMPLE_JWT,
    "AUTH_COOKIE_SECURE": config("COOKIE_SECURE", default=True, cast=bool),
    "AUTH_COOKIE_SAMESITE": config("COOKIE_SAMESITE", default="None"),
}

SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
SECURE_SSL_REDIRECT = config("SECURE_SSL_REDIRECT", default=True, cast=bool)
SECURE_HSTS_SECONDS = config("SECURE_HSTS_SECONDS", default=31536000, cast=int)
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = True
SECURE_CONTENT_TYPE_NOSNIFF = True
SECURE_REFERRER_POLICY = "same-origin"
X_FRAME_OPTIONS = "DENY"

LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "handlers": {"console": {"class": "logging.StreamHandler"}},
    "root": {"handlers": ["console"], "level": "INFO"},
}
