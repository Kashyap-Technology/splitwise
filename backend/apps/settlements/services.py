from django.db import transaction
from rest_framework.exceptions import ValidationError

from apps.core.models import AuditLog
from apps.core.services import create_audit_log
from apps.groups.selectors import get_group_balance
from apps.settlements.exceptions import ReceiverDoesNotExists, SettleToSelfError
from apps.settlements.models import Settlement


def _get_receiver(*, group, to_user_id):
    return group.group_memberships.filter(user_id=to_user_id).exists()


@transaction.atomic
def settlement_create(*, group, from_user, to_user_id, amount):
    if from_user.id == to_user_id:
        raise SettleToSelfError()

    receiver = _get_receiver(group=group, to_user_id=to_user_id)

    if not receiver:
        raise ReceiverDoesNotExists()

    balance = get_group_balance(
        group=group,
    )

    from_user_balance = balance.get(from_user.id, 0)

    if from_user_balance >= 0:
        raise ValidationError("You don't owe in this group. ")

    if amount > abs(from_user_balance):
        raise ValidationError("You are paying more than you owe.")

    settlement = Settlement(
        group=group,
        from_user=from_user,
        to_user_id=to_user_id,
        amount=amount,
        created_by=from_user,
    )
    settlement.full_clean()
    settlement.save()

    create_audit_log(
        user=from_user,
        action=AuditLog.AuditAction.CREATE,
        model_name=AuditLog.ModelName.SETTLEMENT,
        message="Settlemnet Created",
    )

    return settlement
