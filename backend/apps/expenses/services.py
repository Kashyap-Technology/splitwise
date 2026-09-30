from decimal import ROUND_HALF_UP, Decimal

from django.db import transaction
from django.shortcuts import get_object_or_404
from rest_framework.validators import ValidationError

from apps.core.models import AuditLog
from apps.core.services import create_audit_log
from apps.expenses.exceptions import (
    CategoryAlreadyExistsError,
    CategoryDoesNotExistsError,
    ExpenseDoesNotExistsError,
    InvalidExactSplitError,
    InvalidPaidAmount,
    NotGroupMemberError,
    UnsupportedSplitTypeError,
)
from apps.expenses.models import Category, Expense, ExpenseParticipant, ExpensePayer


def _get_valid_category(*, category_id):
    category = Category.objects.filter(id=category_id).first()

    if category is None:
        raise CategoryDoesNotExistsError()

    return category


def _validate_group_members(*, group, user_ids):
    member_ids = set(group.group_memberships.values_list("user_id", flat=True))

    invalid_ids = user_ids - member_ids

    if invalid_ids:
        raise NotGroupMemberError()


def _calculate_payer_amount(*, amount, payers):
    total_paid_amount = sum(
        (Decimal(str(payer["amount_paid"])) for payer in payers), Decimal("0")
    )

    if total_paid_amount != Decimal(str(amount)):
        raise InvalidPaidAmount()

    amounts = {
        payer["user_id"]: Decimal(str(payer["amount_paid"])) for payer in payers
    }
    return amounts


def _calculate_equal_split(*, amount, participants):
    user_ids = [p["user_id"] for p in participants]
    no_of_participants = len(user_ids)

    amount = Decimal(str(amount))
    split_amount = (amount / no_of_participants).quantize(
        Decimal("0.01"), rounding=ROUND_HALF_UP
    )

    amounts = {id: split_amount for id in user_ids}

    remainder = amount - (split_amount * no_of_participants)
    amounts[user_ids[-1]] += remainder

    return amounts


def _calculate_exact_split(*, amount, participants):
    amount = Decimal(str(amount))
    total = sum(Decimal(str(p.get("value", 0))) for p in participants)

    if total != amount:
        raise InvalidExactSplitError()

    return {p["user_id"]: Decimal(str(p.get("value", 0))) for p in participants}


def _calculate_percentage_split(*, amount, participants):
    amount = Decimal(str(amount))
    total_percentage = sum(Decimal(str(p.get("value", 0))) for p in participants)

    if total_percentage != Decimal("100"):
        raise InvalidExactSplitError("Percentages must add up to 100%.")

    amounts = {}
    for p in participants:
        share = (amount * Decimal(str(p["value"]))) / Decimal("100")
        amounts[p["user_id"]] = share.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)

    # balance rounding remainder
    remainder = amount - sum(amounts.values())
    if remainder and amounts:
        last_id = participants[-1]["user_id"]
        amounts[last_id] += remainder

    return amounts


SPLIT_RESOLVERS = {
    Expense.SplitType.EQUAL.value: _calculate_equal_split,
    Expense.SplitType.EXACT.value: _calculate_exact_split,
    Expense.SplitType.PERCENTAGE.value: _calculate_percentage_split,
}


def _calculate_participant_amount(*, split_type, amount, participants):
    resolver = SPLIT_RESOLVERS.get(split_type)

    if resolver is None:
        raise UnsupportedSplitTypeError()
    if not participants:
        raise ValidationError("Participants amount required.")

    return resolver(amount=amount, participants=participants)


def create_category(*, name, icon=None, user, created_by):
    if Category.objects.filter(name__iexact=name).exists():
        raise CategoryAlreadyExistsError()

    category = Category(name=name, icon=icon, created_by=created_by)
    category.full_clean()
    category.save()

    create_audit_log(
        user=user,
        action=AuditLog.AuditAction.CREATE,
        model_name=AuditLog.ModelName.CATEGORY,
        message="Category Created.",
    )

    return category


@transaction.atomic
def create_expense(
    *, user, group, title, category_id, amount, split_type, payers, participants
):
    # validate and get category
    category = _get_valid_category(category_id=category_id)

    # get payers and participants id
    payer_ids = {p["user_id"] for p in payers}
    participant_ids = {p["user_id"] for p in participants}

    # validate all selected member belongs to the selected group (union of payers and participants)
    _validate_group_members(group=group, user_ids=payer_ids | participant_ids)

    # resolve payers amount
    payers_amounts = _calculate_payer_amount(amount=amount, payers=payers)

    # resolve participant amount
    participant_amounts = _calculate_participant_amount(
        split_type=split_type, amount=amount, participants=participants
    )

    # create expense
    expense = Expense(
        group=group,
        title=title,
        category=category,
        amount=amount,
        split_type=split_type,
    )
    expense.full_clean()
    expense.save()

    # bulk operation on payer object
    payer_objects = [
        ExpensePayer(
            expense=expense,
            user_id=user_id,
            amount_paid=paid_amount,
        )
        for user_id, paid_amount in payers_amounts.items()
    ]

    for payer in payer_objects:
        payer.full_clean()

    ExpensePayer.objects.bulk_create(payer_objects)

    # bulk operation on participants object
    participant_objects = [
        ExpenseParticipant(expense=expense, user_id=id, amount_to_pay=split_amount)
        for id, split_amount in participant_amounts.items()
    ]

    for participant in participant_objects:
        participant.full_clean()

    ExpenseParticipant.objects.bulk_create(participant_objects)

    create_audit_log(
        user=user,
        action=AuditLog.AuditAction.CREATE,
        model_name=AuditLog.ModelName.EXPENSE,
        message="Expense Created.",
    )

    return expense


def delete_expense(*, request, expense_id):
    try:
        expense = Expense.objects.get(id=expense_id)
    except Exception as e:
        raise ExpenseDoesNotExistsError()
    group = expense.group

    if group.created_by != request.user:
        raise ValidationError("Only the group admin can delete the group.")

    create_audit_log(
        user=request.user,
        action=AuditLog.AuditAction.DELETE,
        model_name=AuditLog.ModelName.EXPENSE,
        message="Expense Deleted.",
    )

    expense.delete()


@transaction.atomic
def update_expense(
    *,
    request,
    expense_id,
    title,
    category_id,
    amount,
    split_type,
    payers: list[dict],
    participants: list[dict],
):
    try:
        expense = Expense.objects.get(id=expense_id)
    except Expense.DoesNotExist:
        raise ValidationError("Expense not found.")

    group = expense.group

    if group.created_by != request.user:
        raise ValidationError("only the group admin can update the group")

    # get and validate category
    category = _get_valid_category(category_id=category_id)

    new_payers = {p["user_id"] for p in payers}
    new_participants = {p["user_id"] for p in participants}

    _validate_group_members(group=group, user_ids=new_payers | new_participants)

    payer_amounts = _calculate_payer_amount(amount=amount, payers=payers)
    participant_amounts = _calculate_participant_amount(
        amount=amount, participants=participants, split_type=split_type
    )

    expense = get_object_or_404(Expense, pk=expense_id)

    expense.title = title
    expense.category = category
    expense.amount = amount
    expense.split_type = split_type
    expense.payers = payers
    expense.participants = participants

    expense.full_clean()
    expense.save()

    # delete old payers and participants for this expense
    expense.expense_payers.all().delete()
    expense.expense_participants.all().delete()

    # bulk creation of payer
    payer_objects = [
        ExpensePayer(expense=expense, user_id=user_id, amount_paid=paid_amount)
        for user_id, paid_amount in payer_amounts.items()
    ]

    for payer in payer_objects:
        payer.full_clean()

    ExpensePayer.objects.bulk_create(payer_objects)

    # bulk creation of participants
    participant_objects = [
        ExpenseParticipant(
            expense=expense, user_id=user_id, amount_to_pay=amount_to_pay
        )
        for user_id, amount_to_pay in participant_amounts.items()
    ]

    for participant in participant_objects:
        participant.full_clean()

    ExpenseParticipant.objects.bulk_create(participant_objects)

    create_audit_log(
        user=request.user,
        action=AuditLog.AuditAction.UPDATE,
        model_name=AuditLog.ModelName.EXPENSE,
        message="Expense Updated.",
    )

    return expense
