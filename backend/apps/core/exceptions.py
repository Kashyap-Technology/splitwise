from rest_framework import status
from rest_framework.exceptions import APIException


class ApplicationError(APIException):
    status_code = status.HTTP_400_BAD_REQUEST
    default_detail = "Application error."
    default_code = "application_error"


class UploadToStorjFailedErrror(ApplicationError):
    status_code = status.HTTP_406_NOT_ACCEPTABLE
    default_detail = "Upload to Storj Failed."
    default_code = "storj_upload_failed"
