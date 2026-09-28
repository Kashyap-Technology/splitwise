#!/usr/bin/env python
"""Django's command-line utility for administrative tasks."""

import os
import sys

from decouple import config


def main():
    """Run administrative tasks."""

    # An explicit DJANGO_SETTINGS_MODULE wins, so `manage.py migrate` on Render
    # loads the same settings module gunicorn does. DJANGO_ENV is the fallback.
    if "DJANGO_SETTINGS_MODULE" not in os.environ:
        django_env = config("DJANGO_ENV", default="development")
        os.environ["DJANGO_SETTINGS_MODULE"] = f"config.settings.{django_env}"

    try:
        from django.core.management import execute_from_command_line
    except ImportError as exc:
        raise ImportError(
            "Couldn't import Django. Are you sure it's installed and "
            "available on your PYTHONPATH environment variable? Did you "
            "forget to activate a virtual environment?"
        ) from exc
    execute_from_command_line(sys.argv)


if __name__ == "__main__":
    main()
