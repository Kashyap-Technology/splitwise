from decimal import Decimal

from django.contrib.auth import get_user_model
from django.core.validators import MinValueValidator
from django.db import models

from apps.core.models import AuditModel
from apps.groups.models import Group

User = get_user_model()


# Create your models here.
class Category(AuditModel):
    name = models.CharField(max_length=100, unique=True)
    icon = models.CharField(blank=True, null=True, max_length=255)

    class Meta:
        db_table = "expense_category"

    def __str__(self):
        return self.name


class Expense(AuditModel):
    class SplitType(models.TextChoices):
        EQUAL = "equal", "Equal"
        EXACT = "exact", "Exact"
        PERCENTAGE = "percentage", "Percentage"

    title = models.CharField(max_length=255)

    group = models.ForeignKey(Group, on_delete=models.CASCADE, related_name="expenses")

    category = models.ForeignKey(
        Category,
        on_delete=models.PROTECT,
        related_name="expenses",
    )

    amount = models.DecimalField(
        max_digits=10,
        decimal_places=5,
        validators=[MinValueValidator(Decimal("0.00001"))],
    )

    split_type = models.CharField(
        max_length=20, choices=SplitType.choices, default=SplitType.EQUAL
    )

    class Meta:
        db_table = "expenses"

    def __str__(self):
        return f"{self.title} in {self.group}"


class ExpensePayer(AuditModel):
    expense = models.ForeignKey(
        Expense, on_delete=models.CASCADE, related_name="expense_payers"
    )

    user = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name="expense_payers"
    )

    amount_paid = models.DecimalField(
        max_digits=10,
        decimal_places=5,
        validators=[MinValueValidator(Decimal("0.00001"))],
    )

    class Meta:
        db_table = "expense_payers"
        constraints = [
            models.UniqueConstraint(
                fields=["expense", "user"], name="unique_payer_per_expense"
            )
        ]

    def __str__(self):
        return f"{self.user} paid {self.amount_paid} for expense {self.expense}"


class ExpenseParticipant(AuditModel):
    expense = models.ForeignKey(
        Expense, on_delete=models.CASCADE, related_name="expense_participants"
    )

    user = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name="expense_participants"
    )

    amount_to_pay = models.DecimalField(
        max_digits=10, decimal_places=5, validators=[MinValueValidator(0)]
    )

    class Meta:
        db_table = "expense_participants"
        constraints = [
            models.UniqueConstraint(
                fields=["expense", "user"], name="unique_participant_per_user"
            )
        ]

    def __str__(self):
        return f"{self.user} needs to apy {self.amount_to_pay} for {self.expense}"
