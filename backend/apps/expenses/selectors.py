from decimal import Decimal

from django.db.models import Count, DecimalField, OuterRef, Subquery, Sum
from django.db.models.functions import Coalesce

from apps.expenses.models import Category, Expense, ExpenseParticipant


def get_category(*, user=None):
    """All categories, optionally annotated with how the given user uses them.

    Two different questions are answered here and they are deliberately kept
    apart:

    * `expense_count` is global, so it answers "is this category in use at all?".
      That matters because `Expense.category` is `on_delete=PROTECT`, so a
      category with any expense on it can never be deleted.
    * `your_spend` is per user, so it answers "what has this cost me?". It sums
      the viewer's own participant share, which is what they actually owe,
      rather than the full expense total which may be mostly other people's.

    Each is a separate grouped subquery rather than one joined aggregate: the
    participation filter spans two relations, so a single joined Sum would
    cross-multiply the rows and inflate the figure.
    """
    queryset = Category.objects.select_related("created_by")

    if user is None:
        return queryset

    money = DecimalField(max_digits=12, decimal_places=5)

    user_spend = (
        ExpenseParticipant.objects.filter(
            user=user,
            expense__category=OuterRef("pk"),
        )
        .values("expense__category")
        .annotate(total=Sum("amount_to_pay"))
        .values("total")[:1]
    )

    return queryset.annotate(
        expense_count=Count("expenses", distinct=True),
        your_spend=Coalesce(
            Subquery(user_spend, output_field=money),
            Decimal("0"),
            output_field=money,
        ),
    )


# Kept for callers that want every category plus global usage without needing
# the requesting user, e.g. management or reporting code.
def get_category_with_expense_counts():
    money = DecimalField(max_digits=12, decimal_places=5)

    return Category.objects.select_related("created_by").annotate(
        expense_count=Count("expenses", distinct=True),
        total_spent=Coalesce(
            Subquery(
                Expense.objects.filter(category=OuterRef("pk"))
                .values("category")
                .annotate(total=Sum("amount"))
                .values("total")[:1],
                output_field=money,
            ),
            Decimal("0"),
            output_field=money,
        ),
    )