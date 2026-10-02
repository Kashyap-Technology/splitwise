"""Assembles everything belonging to one user, for data export.

Kept separate from the view so the shape can be asserted directly in tests
without going through HTTP.

JSON is the only format. A flat CSV was tried and dropped: an expense has many
payers *and* many participants, so a spreadsheet column has to collapse them
into one cell ("Alex: 60.00; Bob: 40.00"). That reads fine in Excel but cannot
be parsed back reliably, which defeats the point of taking your data out. A PDF
is worse still for extraction. JSON keeps every row addressable.

Scope note: this exports the requester's data. Group data is included because
they are a member of those groups and their expenses live there, but other
members appear by *name only*. Another person's email address is their data,
not the requester's, so it is not included anywhere in the export.
"""

from datetime import date, datetime
from decimal import Decimal

from apps.expenses.models import ExpenseParticipant, ExpensePayer
from apps.groups.models import Group
from apps.users.models import User

ZERO = Decimal("0")


def _decimal(value) -> str:
    """Decimal to a plain string. Keeps full precision, never float rounding."""
    if isinstance(value, Decimal):
        return format(value, "f")
    return str(value or "")


def _iso(value) -> str | None:
    if isinstance(value, (datetime, date)):
        return value.isoformat()
    return None


def _viewer_shares(user_id: int, group_ids: list[int]):
    """Maps expense_id -> the requester's own paid / owed amounts.

    Queried once per side for the whole export rather than per expense. A join
    through both relations at once would cross-multiply: the payer side and the
    participant side each need to be resolved independently.
    """
    if not group_ids:
        return {}, {}

    paid = {
        row["expense_id"]: row["amount_paid"]
        for row in ExpensePayer.objects.filter(
            user_id=user_id, expense__group_id__in=group_ids
        ).values("expense_id", "amount_paid")
    }
    share = {
        row["expense_id"]: row["amount_to_pay"]
        for row in ExpenseParticipant.objects.filter(
            user_id=user_id, expense__group_id__in=group_ids
        ).values("expense_id", "amount_to_pay")
    }
    return paid, share


def build_export(user: User) -> dict:
    """Every row the requester is entitled to, as a nested dict."""
    groups = list(
        Group.objects.filter(group_memberships__user=user)
        .prefetch_related(
            "group_memberships__user",
            "expenses__category",
            "expenses__expense_payers__user",
            "expenses__expense_participants__user",
            "settlements__from_user",
            "settlements__to_user",
        )
        .distinct()
        .order_by("name")
    )

    paid_by_expense, share_by_expense = _viewer_shares(
        user.id, [group.id for group in groups]
    )

    exported_groups = []

    for group in groups:
        membership = next(
            (m for m in group.group_memberships.all() if m.user_id == user.id), None
        )

        expenses = sorted(
            group.expenses.all(),
            key=lambda expense: (expense.created_at, expense.id),
            reverse=True,
        )

        exported_expenses = [
            {
                "id": expense.id,
                "title": expense.title,
                "amount": _decimal(expense.amount),
                "category": expense.category.name,
                "split_type": expense.split_type,
                "created_at": _iso(expense.created_at),
                "your_paid": _decimal(paid_by_expense.get(expense.id, ZERO)),
                "your_share": _decimal(share_by_expense.get(expense.id, ZERO)),
                "payers": [
                    {"name": payer.user.name, "amount": _decimal(payer.amount_paid)}
                    for payer in expense.expense_payers.all()
                ],
                "participants": [
                    {
                        "name": participant.user.name,
                        "amount": _decimal(participant.amount_to_pay),
                    }
                    for participant in expense.expense_participants.all()
                ],
            }
            for expense in expenses
        ]

        exported_settlements = [
            {
                "id": settlement.id,
                "from": settlement.from_user.name,
                "to": settlement.to_user.name,
                "amount": _decimal(settlement.amount),
                "created_at": _iso(settlement.created_at),
            }
            for settlement in group.settlements.all()
        ]

        exported_groups.append(
            {
                "id": group.id,
                "name": group.name,
                "description": group.description,
                "created_at": _iso(group.created_at),
                "your_role": membership.role if membership else None,
                "members": [
                    {"name": row.user.name, "role": row.role}
                    for row in group.group_memberships.all()
                ],
                "expenses": exported_expenses,
                "settlements": exported_settlements,
            }
        )

    return {
        "exported_at": datetime.now().isoformat(),
        "account": {
            "id": user.id,
            "name": user.name,
            "email": user.email,
            "phone": user.phone,
            "created_at": _iso(user.created_at),
        },
        "totals": {
            "groups": len(exported_groups),
            "expenses": sum(len(g["expenses"]) for g in exported_groups),
            "settlements": sum(len(g["settlements"]) for g in exported_groups),
            "gross_expense_total": _decimal(
                sum(
                    (Decimal(e["amount"]) for g in exported_groups for e in g["expenses"]),
                    ZERO,
                )
            ),
            "your_total_paid": _decimal(
                sum(
                    (Decimal(e["your_paid"]) for g in exported_groups for e in g["expenses"]),
                    ZERO,
                )
            ),
            "your_total_share": _decimal(
                sum(
                    (Decimal(e["your_share"]) for g in exported_groups for e in g["expenses"]),
                    ZERO,
                )
            ),
            # Positive means the groups collectively still owe you this much.
            "your_net": _decimal(
                sum(
                    (
                        Decimal(e["your_paid"]) - Decimal(e["your_share"])
                        for g in exported_groups
                        for e in g["expenses"]
                    ),
                    ZERO,
                )
            ),
        },
        "groups": exported_groups,
    }
