from apps.expenses.models import Category


def get_category():
    return Category.objects.select_related(
        "created_by",
    )
