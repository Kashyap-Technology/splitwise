from rest_framework import status

from apps.core.exceptions import ApplicationError


class SettleToSelfError(ApplicationError):
    status_code = status.HTTP_403_FORBIDDEN
    default_detail = "Cannot settle with self."
    default_code = "can't_settle_with_self"


class ReceiverDoesNotExists(ApplicationError):
    status_code = status.HTTP_404_NOT_FOUND
    default_detail = "Receiver Does not Exists."
    default_code = "can'receiver_does_not_exists"
