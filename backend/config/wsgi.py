"""
WSGI config for config project.

It exposes the WSGI callable as a module-level variable named ``application``.

For more information on this file, see
https://docs.djangoproject.com/en/6.0/howto/deployment/wsgi/
"""

import os

from decouple import config
from django.core.wsgi import get_wsgi_application

# Must mirror manage.py: config.settings is an empty package, so pointing at it
# yields a settings module with no INSTALLED_APPS and no DATABASES.
os.environ.setdefault(
    "DJANGO_SETTINGS_MODULE",
    f"config.settings.{config('DJANGO_ENV', default='development')}",
)

application = get_wsgi_application()
