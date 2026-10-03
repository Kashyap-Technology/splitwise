from decimal import Decimal

from django.db import transaction
from rest_framework.exceptions import ValidationError

from apps.core.models import AuditLog
from apps.core.services import create_audit_log
from apps.groups.selectors import get_group_balance
from apps.settlements.exceptions import ReceiverDoesNotExists, SettleToSelfError
from apps.settlements.models import Settlement


def _get_receiver(*, group, to_user_id):
    return group.group_memberships.filter(user_id=to_user_id).exists()


# Amounts carry 5 decimal places, so a rounding remainder smaller than half a
# cent is not a real debt. Comparing against this instead of a bare 0 stops a
# user who is owed 0.001 from being told they do not owe anything at all.
DUST_THRESHOLD = Decimal("0.005")


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

    # Only someone who is a net debtor in this group has anything to settle.
    # Without this check a creditor could "settle" downwards and manufacture
    # debt for themselves.
    if from_user_balance > -DUST_THRESHOLD:
        raise ValidationError(
            "You are not owed money in this group, so there is nothing to settle."
        )

    outstanding = abs(from_user_balance)

    if amount > outstanding:
        raise ValidationError(
            f"You are paying more than you owe. Your outstanding balance in this "
            f"group is {outstanding:.2f}."
        )

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
        message="Settlement Created",
    )

    return settlement
