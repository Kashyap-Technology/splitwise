from datetime import timedelta
from pathlib import Path

from decouple import Csv, config

BASE_DIR = Path(__file__).resolve().parent.parent

SECRET_KEY = config("SECRET_KEY")
ALLOWED_HOSTS = config("ALLOWED_HOSTS", cast=Csv())


# Application definition
INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    # apps
    "apps.users",
    "apps.core",
    "apps.groups",
    "apps.expenses",
    "apps.settlements",
    # third party
    "rest_framework",
    "rest_framework_simplejwt",
    "corsheaders",
    "anymail",
]

MIDDLEWARE = [
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]
CORS_ALLOW_CREDENTIALS = True
CORS_ALLOWED_ORIGINS = config(
    "CORS_ALLOWED_ORIGINS", default="http://localhost:3000", cast=Csv()
)

ROOT_URLCONF = "config.urls"
AUTH_USER_MODEL = "users.User"
REST_FRAMEWORK = {
    "EXCEPTION_HANDLER": "apps.core.api.exceptions.custom_exception_handler",
    "DEFAULT_AUTHENTICATION_CLASSES": [
        "apps.core.authentication.CookieJWTAuthentication",
    ],
    "DEFAULT_PARSER_CLASSES": [
        "rest_framework.parsers.JSONParser",
        "rest_framework.parsers.FormParser",
        "rest_framework.parsers.MultiPartParser",
    ],
}

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "config.wsgi.application"

SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(minutes=60),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=1),
    "AUTH_COOKIE": "access_token",
    "AUTH_COOKIE_REFRESH": "refresh_token",
    "AUTH_COOKIE_SECURE": config("COOKIE_SECURE", default=False, cast=bool),
    "AUTH_COOKIE_HTTP_ONLY": True,
    "AUTH_COOKIE_SAMESITE": config("COOKIE_SAMESITE", default="Lax"),
}


DEFAULT_FROM_EMAIL = config("DEFAULT_FROM_EMAIL")
EMAIL_BACKEND = "anymail.backends.brevo.EmailBackend"
ANYMAIL = {
    "BREVO_API_KEY": config("BREVO_API_KEY"),
}


STORJ_ACCESS_KEY = config("STORJ_ACCESS_KEY")
STORJ_SECRET_KEY = config("STORJ_SECRET_KEY")
STORJ_ENDPOINT = config("STORJ_ENDPOINT")
STORJ_BUCKET_NAME = config("STORJ_BUCKET_NAME")

AUTH_PASSWORD_VALIDATORS = [
    {
        "NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.MinimumLengthValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.CommonPasswordValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.NumericPasswordValidator",
    },
]


LANGUAGE_CODE = "en-us"
TIME_ZONE = "UTC"
USE_I18N = True
USE_TZ = True


STATIC_URL = "static/"
