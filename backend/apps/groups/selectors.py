from django.contrib.auth import get_user_model
from django.db.models import Sum
from django.shortcuts import get_object_or_404

from apps.expenses.models import ExpenseParticipant, ExpensePayer
from apps.groups.exception import (
    GroupDoesNotExistsError,
    GroupMembershipNotFound,
    ReceiverDoesNotExistsError,
)
from apps.groups.models import Group, GroupInvitation
from apps.settlements.models import Settlement

User = get_user_model()


def list_group():
    return Group.objects.all()


def get_user_groups(*, user):
    return Group.objects.filter(group_memberships__user=user).distinct()


def get_group_by_id(*, group_id):
    try:
        return Group.objects.get(pk=group_id)
    except Exception:
        raise GroupDoesNotExistsError()


def get_group_for_member(*, group_id, user):
    group = Group.objects.filter(id=group_id, group_memberships__user=user).first()

    if not group:
        raise GroupMembershipNotFound
    return group


def get_receiver_by_id(*, receiver_id):
    receiver = User.objects.filter(pk=receiver_id).first()
    if not receiver:
        raise ReceiverDoesNotExistsError()
    return receiver


def get_invitation_by_token(*, token):
    return get_object_or_404(GroupInvitation, token=token)


def get_group_member_list(*, group):
    return group.group_memberships.select_related("user")


def get_group_balance(*, group):
    amount_paid_per_user = (
        ExpensePayer.objects.filter(expense__group=group)
        .values_list("user_id")
        .annotate(total_paid=Sum("amount_paid"))
    )

    amount_to_pay_per_user = (
        ExpenseParticipant.objects.filter(expense__group=group)
        .values_list("user_id")
        .annotate(total_to_pay=Sum("amount_to_pay"))
    )

    settlement_amount_paid_per_user = (
        Settlement.objects.filter(group=group)
        .values_list("from_user_id")
        .annotate(settlement_paid=Sum("amount"))
    )

    settlement_amount_received_per_user = (
        Settlement.objects.filter(group=group)
        .values_list("to_user_id")
        .annotate(settlement_received=Sum("amount"))
    )

    paid_map = dict(amount_paid_per_user)
    owed_map = dict(amount_to_pay_per_user)
    settlement_paid_map = dict(settlement_amount_paid_per_user)
    settlement_received_map = dict(settlement_amount_received_per_user)

    # user_id => amount_to_receive / amount_to_pay
    balance = {}

    user_ids = set(paid_map.keys()) | set(owed_map.keys())

    for user_id in user_ids:
        balance[user_id] = (
            paid_map.get(user_id, 0)
            - owed_map.get(user_id, 0)
            + settlement_paid_map.get(user_id, 0)
            - settlement_received_map.get(user_id, 0)
        )

    return balance


def group_settlement(*, balance):
    """Reduce a group's balances to the fewest debtor -> creditor transfers.

    Returns a list of ``{from_id, from, to_id, to, amount}`` dicts. The ids are
    what let a client turn a suggestion into a real settlement: names alone can
    only be displayed, so a payer picking a receiver had nothing to submit.
    """
    # user_id => user map
    group_members = {
        user.id: user for user in User.objects.filter(id__in=balance.keys())
    }

    # debtors and creditors
    debtors = []
    creditors = []
    for user_id, balance in balance.items():
        if balance > 0:
            creditors.append([user_id, balance])
        elif balance < 0:
            debtors.append([user_id, -balance])

    # Largest exposure first. It keeps the transfer count near-minimal and, more
    # importantly here, makes the output stable: dict ordering of `balance`
    # otherwise decides the pairing, so the same group could return different
    # suggestions on two requests and the UI would show a different plan.
    debtors.sort(key=lambda row: (-row[1], row[0]))
    creditors.sort(key=lambda row: (-row[1], row[0]))

    settlements = []
    i = j = 0

    while i < len(creditors) and j < len(debtors):
        creditor_id, credit = creditors[i]
        debtor_id, debit = debtors[j]

        amount = min(debit, credit)

        settlements.append(
            {
                "from_id": debtor_id,
                "from": group_members[debtor_id].name,
                "to_id": creditor_id,
                "to": group_members[creditor_id].name,
                "amount": amount,
            }
        )

        # update balance
        creditors[i][1] -= amount
        debtors[j][1] -= amount

        # update pointer
        if creditors[i][1] == 0:
            i += 1
        if debtors[j][1] == 0:
            j += 1

    return settlements
