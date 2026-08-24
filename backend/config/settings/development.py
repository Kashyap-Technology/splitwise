import dj_database_url

from .base import *

DEBUG = True

DATABASES = {
    "default": dj_database_url.config(
        default=config("DEVELOPMENT_DATABASE_URL"), conn_max_age=60, ssl_require=False
    )
}

EMAIL_BACKEND = "django.core.mail.backends.console.EmailBackend"


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
