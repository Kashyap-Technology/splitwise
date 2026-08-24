from rest_framework import status

from apps.core.exceptions import ApplicationError


class SenderIsNotGroupAdminError(ApplicationError):
    status_code = status.HTTP_403_FORBIDDEN
    default_detail = "Only group admins are allowed to send Invitation."
    default_code = "invitation_not_allowed"


class UserAlreadyGroupMemberError(ApplicationError):
    status_code = status.HTTP_409_CONFLICT
    default_detail = "User you are trying to invite already exists in this group."
    default_code = "user_already_in_group"


class UserInvitationAlreadySentError(ApplicationError):
    status_code = status.HTTP_409_CONFLICT
    default_detail = "An Invitation was already sent to this user."
    default_code = "invitation_already_sent"


class InvitationAlreadyAcceptedError(ApplicationError):
    status_code = status.HTTP_409_CONFLICT
    default_detail = "The Invitation has already been accepted."
    default_code = "invitation_already_accepted"


class GroupMembershipNotFound(ApplicationError):
    status_code = status.HTTP_403_FORBIDDEN
    default_detail = "The You are not a member of this Group"
    default_code = "group_membership_not_found"


class PermissionDeniedError(ApplicationError):
    status_code = status.HTTP_403_FORBIDDEN
    default_detail = "You Don't have permission for this action."
    default_code = "permissiion_denied"


class GroupDoesNotExistsError(ApplicationError):
    status_code = status.HTTP_404_NOT_FOUND
    default_detail = "Group does not exists."
    default_code = "group_does_not_exists"


class NotAGroupMemberError(ApplicationError):
    status_code = status.HTTP_404_NOT_FOUND
    default_detail = "The user doesnt belong to the group."
    default_code = "not_a_group_member"


class PendingBalanceError(ApplicationError):
    status_code = (status.HTTP_400_BAD_REQUEST,)
    default_detail = "Can't leave group with out settlement."
    default_code = "pending_group_balance"


class ReceiverDoesNotExistsError(ApplicationError):
    status_code = status.HTTP_400_BAD_REQUEST
    default_detail = "Receiver Doesn't exist."
    default_code = "reciver_does_not_exists"
