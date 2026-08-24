from django.db import transaction
from django.http import Http404
from django.shortcuts import get_object_or_404
from rest_framework.exceptions import NotFound

from apps.core.models import AuditLog
from apps.core.services import _delete_from_storj, _upload_to_storj, create_audit_log
from apps.groups.email import send_group_invitation_email
from apps.groups.exception import (
    InvitationAlreadyAcceptedError,
    NotAGroupMemberError,
    PendingBalanceError,
    PermissionDeniedError,
    SenderIsNotGroupAdminError,
    UserAlreadyGroupMemberError,
    UserInvitationAlreadySentError,
)
from apps.groups.models import Group, GroupInvitation, GroupMembership
from apps.groups.selectors import get_group_balance


def _check_user_group_membership(*, group, user_id):
    return group.group_memberships.all().filter(user_id=user_id).exists()


def _get_user_group_balance(*, group, user_id):
    balance = get_group_balance(group=group)

    # format:  {1: Decimal('3.33000'), 2: Decimal('-436.66000'), 4: Decimal('433.33000')}
    user_balance = balance.get(user_id, 0)
    return user_balance


def _update_group_in_db(*, data, group, user, image_key):
    if "name" in data:
        group.name = data["name"]

    if "description" in data:
        group.description = data["description"]

    group.group_imagekey = image_key
    group.updated_by = user
    group.save()

    create_audit_log(
        user=user,
        action=AuditLog.AuditAction.UPDATE,
        model_name=AuditLog.ModelName.GROUP,
        message="Group Updated.",
    )

    return group


@transaction.atomic
def create_group(*, user, name, description, group_image):
    image_key = _upload_to_storj(folder="groups", image=group_image)

    group = Group.objects.create(
        name=name,
        description=description,
        group_imagekey=image_key,
        created_by=user,
        updated_by=user,
    )

    GroupMembership.objects.create(
        group=group,
        user=user,
        role=GroupMembership.Role.ADMIN,
        created_by=user,
        updated_by=user,
    )

    create_audit_log(
        user=user,
        action=AuditLog.AuditAction.CREATE,
        model_name=AuditLog.ModelName.GROUP,
        message="Group Created.",
    )

    return group


@transaction.atomic
def invite_user_to_group(*, request, sender, receiver, group):
    # sender must be and admin
    is_admin = GroupMembership.objects.filter(
        group=group, user=sender, role=GroupMembership.Role.ADMIN
    ).exists()

    if not is_admin:
        raise SenderIsNotGroupAdminError()

    # receiver must not already belong to the group
    is_member = GroupMembership.objects.filter(group=group, user=receiver).exists()

    if is_member:
        raise UserAlreadyGroupMemberError()

    # invitation already send previously to this user in this group
    pending_invitation = GroupInvitation.objects.filter(
        group=group, receiver=receiver, status=GroupInvitation.Status.PENDING
    ).exists()

    if pending_invitation:
        raise UserInvitationAlreadySentError()

    invitation = GroupInvitation.objects.create(
        group=group,
        sender=sender,
        receiver=receiver,
        created_by=sender,
    )

    # send invitation email
    send_group_invitation_email(request=request, invitation=invitation)

    create_audit_log(
        user=request.user,
        action=AuditLog.AuditAction.INVITED,
        model_name=AuditLog.ModelName.GROUP_INVITATION,
        message="Invited to Group.",
    )

    return invitation


@transaction.atomic
def accept_group_invitation(*, invitation, user):
    # if invitation is already accepted
    if invitation.status == GroupInvitation.Status.ACCEPTED:
        raise InvitationAlreadyAcceptedError()

    invitation.status = GroupInvitation.Status.ACCEPTED
    invitation.updated_by = user
    invitation.save(update_fields=["status", "updated_by", "updated_at"])

    GroupMembership.objects.create(
        group=invitation.group,
        user=invitation.receiver,
        role=GroupMembership.Role.MEMBER,
        created_by=user,
        updated_by=user,
    )

    create_audit_log(
        user=user,
        action=AuditLog.AuditAction.ACCEPTED,
        model_name=AuditLog.ModelName.GROUP_MEMBERSHIP,
        message="Invitation Accepted.",
    )


def delete_group(*, group_id, user):
    # get group or 404
    group = get_object_or_404(Group, pk=group_id)

    if group.created_by != user:
        raise PermissionDeniedError()

    if group.group_imagekey:
        _delete_from_storj(image_key=group.group_imagekey)

    create_audit_log(
        user=user,
        action=AuditLog.AuditAction.DELETE,
        model_name=AuditLog.ModelName.GROUP,
        message="Group deleted",
    )

    group.delete()


def update_group(*, group_id, user, data):
    group = get_object_or_404(Group, pk=group_id)

    if group.created_by != user:
        raise PermissionDeniedError("You don't have permission to update this Group.")

    if "group_image" not in data:
        return _update_group_in_db(
            user=user,
            group=group,
            data=data,
            image_key=group.group_imagekey,
        )

    if group.group_imagekey:
        _delete_from_storj(image_key=group.group_imagekey)

    image_key = _upload_to_storj(folder="groups", image=data["group_image"])

    return _update_group_in_db(group=group, data=data, user=user, image_key=image_key)


def remove_user_from_group(*, group_id, user_id, request):
    group = get_object_or_404(Group, id=group_id)

    # only admin can remove
    if group.created_by != request.user:
        raise PermissionDeniedError(
            detail="Only admin can remove member from group group."
        )

    # check if user is a member of group or not
    is_member = _check_user_group_membership(group=group, user_id=user_id)

    if is_member is False:
        raise NotAGroupMemberError()

    if user_id == group.created_by.id:
        raise PermissionDeniedError(detail="The admin of group cannot remove himself.")

    member_to_delete = get_object_or_404(GroupMembership, group=group_id, user=user_id)

    create_audit_log(
        user=request.user,
        action=AuditLog.AuditAction.INVITED,
        model_name=AuditLog.ModelName.GROUP_INVITATION,
        message="Removed from group",
    )

    member_to_delete.delete()


def leave_group(*, request, user_id, group_id):
    try:
        group = get_object_or_404(Group, pk=group_id)
    except Http404:
        raise NotFound("Group not found.")

    # check if user is a member of group or not
    is_member = _check_user_group_membership(group=group, user_id=user_id)

    if is_member is False:
        raise NotAGroupMemberError()

    # check for pending balance
    user_balance = _get_user_group_balance(group=group, user_id=user_id)

    if user_balance < 0:
        raise PendingBalanceError()

    member_to_remove = get_object_or_404(GroupMembership, group=group_id, user=user_id)

    create_audit_log(
        user=request.user,
        action=AuditLog.AuditAction.LEAVE,
        model_name=AuditLog.ModelName.GROUP,
        message="Leave Group.",
    )

    member_to_remove.delete()
