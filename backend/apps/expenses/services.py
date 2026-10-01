from decimal import ROUND_FLOOR, ROUND_HALF_UP, Decimal

from django.db import transaction
from rest_framework.validators import ValidationError

from apps.core.models import AuditLog
from apps.core.services import create_audit_log
from apps.expenses.exceptions import (
    CategoryAlreadyExistsError,
    CategoryDoesNotExistsError,
    DuplicateUserInSplitError,
    ExpenseDoesNotExistsError,
    InvalidExactSplitError,
    InvalidPaidAmount,
    InvalidPercentageSplitError,
    InvalidSplitValueError,
    NotGroupMemberError,
    UnsupportedSplitTypeError,
)
from apps.expenses.models import Category, Expense, ExpenseParticipant, ExpensePayer
from apps.groups.exception import PermissionDeniedError
from apps.groups.models import GroupMembership

CENT = Decimal("0.01")


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


def _reject_duplicate_users(entries, *, label):
    user_ids = [entry["user_id"] for entry in entries]

    if len(user_ids) != len(set(user_ids)):
        raise DuplicateUserInSplitError(label)


def _coerce_value(raw):
    """Coerce a participant `value` to Decimal, rejecting None/NaN.

    `value` is optional on the wire, so it can arrive missing or null. Decimal
    raises ConversionSyntax on None, which would surface as a 500.
    """
    if raw is None or raw == "":
        return Decimal("0")

    try:
        return Decimal(str(raw))
    except (ArithmeticError, ValueError, TypeError):
        raise InvalidSplitValueError()


def _calculate_payer_amount(*, amount, payers):
    _reject_duplicate_users(payers, label="payers")

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
    _reject_duplicate_users(participants, label="participants")

    user_ids = [p["user_id"] for p in participants]
    no_of_participants = len(user_ids)

    amount = Decimal(str(amount))

    # Floor the per-person share to whole cents, then hand the leftover cents out
    # one each. Rounding the share up instead (and dumping the whole remainder on
    # the last person) makes that remainder negative whenever amount/n does not
    # divide cleanly: 0.07 across 12 people gave the last person -0.04, which the
    # model's MinValueValidator(0) on amount_to_pay then rejects on save.
    total_cents = int((amount * 100).to_integral_value(rounding=ROUND_HALF_UP))
    base_cents, extra_cents = divmod(total_cents, no_of_participants)

    return {
        user_id: Decimal(base_cents + (1 if index < extra_cents else 0)) / 100
        for index, user_id in enumerate(user_ids)
    }


def _calculate_exact_split(*, amount, participants):
    _reject_duplicate_users(participants, label="participants")

    amount = Decimal(str(amount))
    total = sum(_coerce_value(p.get("value")) for p in participants)

    if total != amount:
        raise InvalidExactSplitError()

    return {p["user_id"]: _coerce_value(p.get("value")) for p in participants}


def _calculate_percentage_split(*, amount, participants):
    _reject_duplicate_users(participants, label="participants")

    amount = Decimal(str(amount))
    values = {p["user_id"]: _coerce_value(p.get("value")) for p in participants}
    total_percentage = sum(values.values(), Decimal("0"))

    if total_percentage != Decimal("100"):
        raise InvalidPercentageSplitError()

    total_cents = int((amount * 100).to_integral_value(rounding=ROUND_HALF_UP))

    amounts = {}
    for p in participants:
        # Floor rather than round up, for the same reason as equal splits: an
        # individually rounded-up share can push the total past the expense
        # amount and leave the remainder negative.
        share_cents = (total_cents * values[p["user_id"]] / Decimal("100")).to_integral_value(
            rounding=ROUND_FLOOR
        )
        amounts[p["user_id"]] = share_cents / 100

    # Hand out the leftover cents one each, largest percentage first, so the
    # rounding lands on the biggest shares and no share can go negative.
    leftover = total_cents - sum(int(v * 100) for v in amounts.values())
    if leftover > 0:
        for participant in sorted(
            participants, key=lambda p: values[p["user_id"]], reverse=True
        )[:leftover]:
            amounts[participant["user_id"]] += CENT

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
        created_by=user,
        updated_by=user,
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


def _get_manageable_expense(*, expense_id, user):
    """Fetch an expense the user is allowed to edit or delete.

    Permissions mirror the rest of the group endpoints: you must be a member of
    the owning group, and editing is limited to group admins. Previously this
    compared against `group.created_by`, which excluded every admin who was not
    the group's original creator.
    """
    expense = (
        Expense.objects.filter(id=expense_id)
        .select_related("group")
        .first()
    )

    if expense is None:
        raise ExpenseDoesNotExistsError()

    membership = GroupMembership.objects.filter(
        group=expense.group, user=user
    ).first()

    if membership is None:
        raise NotGroupMemberError()

    if membership.role != GroupMembership.Role.ADMIN:
        raise PermissionDeniedError()

    return expense


@transaction.atomic
def delete_expense(*, request, expense_id):
    expense = _get_manageable_expense(expense_id=expense_id, user=request.user)

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
    expense = _get_manageable_expense(expense_id=expense_id, user=request.user)
    group = expense.group

    # get and validate category
    category = _get_valid_category(category_id=category_id)

    new_payers = {p["user_id"] for p in payers}
    new_participants = {p["user_id"] for p in participants}

    _validate_group_members(group=group, user_ids=new_payers | new_participants)

    payer_amounts = _calculate_payer_amount(amount=amount, payers=payers)
    participant_amounts = _calculate_participant_amount(
        amount=amount, participants=participants, split_type=split_type
    )

    expense.title = title
    expense.category = category
    expense.amount = amount
    expense.split_type = split_type
    expense.updated_by = request.user

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
