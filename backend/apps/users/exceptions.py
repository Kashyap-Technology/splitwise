from rest_framework import status

from apps.core.exceptions import ApplicationError


class InvalidCredentialsError(ApplicationError):
    status_code = status.HTTP_401_UNAUTHORIZED
    default_detail = "Invalid Credentials Provided. "
    default_code = "invalid_credentials"
