"""Model-level validator bounds, checked against a real database."""

from decimal import Decimal

from django.test import TestCase

from apps.expenses.models import Expense, ExpenseParticipant, ExpensePayer
from apps.users.models import User


class AmountValidatorTests(TestCase):
    """Validators are declared on the fields, so exercise them in isolation.

    full_clean() also validates the user FK, which needs a real row.
    """

    def setUp(self):
        self.user = User.objects.create_user(
            name="tester", email="tester@example.com", password="pw"
        )

    def test_sub_dollar_payer_amounts_are_accepted(self):
        # Was MinValueValidator(1.0), which rejected legitimate small shares.
        for amount in ("0.01", "0.10", "0.50", "0.99"):
            with self.subTest(amount=amount):
                ExpensePayer(
                    expense=None, user=self.user, amount_paid=Decimal(amount)
                ).full_clean(exclude=["expense"])

    def test_zero_payer_is_still_rejected(self):
        from django.core.exceptions import ValidationError

        with self.assertRaises(ValidationError):
            ExpensePayer(
                expense=None, user=self.user, amount_paid=Decimal("0.00")
            ).full_clean(exclude=["expense"])

    def test_expense_amount_bounds(self):
        from django.core.exceptions import ValidationError

        def build(amount):
            return Expense(
                group=None, category=None, title="x", amount=Decimal(amount)
            )

        # The field carries decimal_places=5, so the smallest representable
        # positive amount is 0.00001.
        for amount in ("0.00001", "0.01", "0.50", "1.00", "100.00"):
            with self.subTest(amount=amount):
                build(amount).full_clean(exclude=["group", "category"])

        for amount in ("0.00000", "-1.00"):
            with self.subTest(amount=amount):
                with self.assertRaises(ValidationError):
                    build(amount).full_clean(exclude=["group", "category"])

    def test_participant_allows_zero_share(self):
        ExpenseParticipant(
            expense=None, user=self.user, amount_to_pay=Decimal("0")
        ).full_clean(exclude=["expense"])