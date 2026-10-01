"""Throwaway settings that run the Django test suite against SQLite.

Used only to verify the full create/update/delete expense path against a real
database. Not referenced by any deploy config.
"""

import dj_database_url

from .base import *  # noqa: F403

DEBUG = False

DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": ":memory:",
    }
}

INSTALLED_APPS = [app for app in INSTALLED_APPS if app != "silk"]  # noqa: F405
MIDDLEWARE = [m for m in MIDDLEWARE if "silk" not in m]  # noqa: F405

EMAIL_BACKEND = "django.core.mail.backends.locmem.EmailBackend"

PASSWORD_HASHERS = ["django.contrib.auth.hashers.MD5PasswordHasher"]

MEDIA_ROOT = "/tmp/splitwise-verify-media"

LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "handlers": {"null": {"class": "logging.NullHandler"}},
    "root": {"handlers": ["null"], "level": "CRITICAL"},
}

assert dj_database_url  # keep the import meaningful for parity with other settings