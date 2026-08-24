import logging

from django.core.exceptions import PermissionDenied
from django.core.exceptions import ValidationError as DjangoValidationError
from django.http import Http404
from rest_framework import exceptions, status
from rest_framework.response import Response
from rest_framework.serializers import as_serializer_error
from rest_framework.views import exception_handler

logger = logging.getLogger(__name__)


def custom_exception_handler(exception, context):
    """
    {
        "message": "Error message",
        "extra": {}
    }
    """
    if isinstance(exception, DjangoValidationError):
        exception = exceptions.ValidationError(as_serializer_error(exception))

    if isinstance(exception, Http404):
        exception = exceptions.NotFound()

    if isinstance(exception, PermissionDenied):
        exception = exceptions.PermissionDenied()

    response = exception_handler(exception, context)

    # handle server error (python exceptions.)
    if response is None:
        logging.exception("Internal Server Error Occured.", exc_info=True)

        return Response(
            {"success": False, "message": "Internal Server Error.", "extra": {}},
            # if not specified [defaults to 200_OK]
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

    if isinstance(exception.detail, (list, dict)):
        response.data = {"detail": response.data}

    if isinstance(exception, exceptions.ValidationError):
        response.data["message"] = "Validation error"
        response.data["extra"] = {"fields": response.data["detail"]}
    else:
        response.data["message"] = response.data["detail"]
        response.data["extra"] = {}

    del response.data["detail"]

    return response
