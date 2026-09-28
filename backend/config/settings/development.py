import dj_database_url

from .base import *

DEBUG = True

DATABASES = {
    "default": dj_database_url.config(
        default=config("DEVELOPMENT_DATABASE_URL"), conn_max_age=60, ssl_require=False
    )
}

EMAIL_BACKEND = "django.core.mail.backends.console.EmailBackend"

INSTALLED_APPS = [*INSTALLED_APPS, "silk"]
MIDDLEWARE = [
    "silk.middleware.SilkyMiddleware",
    *MIDDLEWARE,
]

# Local dev runs over plain http on a different port than the API, so cookies stay
# SameSite=Lax and insecure. Production overrides both via COOKIE_SAMESITE/COOKIE_SECURE.
SIMPLE_JWT = {**SIMPLE_JWT, "AUTH_COOKIE_SECURE": False, "AUTH_COOKIE_SAMESITE": "Lax"}


LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "handlers": {
        "console": {
            "class": "logging.StreamHandler",
        },
    },
    "root": {
        "handlers": ["console"],
        "level": "INFO",
    },
}

MEDIA_URL = "/media/"
MEDIA_ROOT = BASE_DIR / "media"

SILKY_ANALYZE_QUERIES = True
SILKY_PYTHON_PROFILER = True
