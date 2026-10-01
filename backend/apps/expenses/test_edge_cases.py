"""Regression tests for equal-split rounding that can produce negative shares.

amount / n rounded up, times n, can exceed amount. The leftover is then
negative and lands entirely on the last participant, so their amount_to_pay
goes below zero and fails the model's MinValueValidator(0).
"""

from decimal import ROUND_HALF_UP, Decimal

from django.test import TestCase

from apps.expenses.models import Category
from apps.expenses.services import _calculate_equal_split, create_expense
from apps.groups.models import Group, GroupMembership
from apps.users.models import User

CENT = Decimal("0.01")


def _expected_shares(amount, n):
    """Reference implementation: floor to cents, then hand out leftover cents."""
    total_cents = int((amount * 100).to_integral_value(rounding=ROUND_HALF_UP))
    base, extra = divmod(total_cents, n)

    return [
        Decimal(base + (1 if i < extra else 0)) / 100 for i in range(n)
    ]


class EqualSplitRoundingTests(TestCase):
    def test_never_produces_a_negative_share(self):
        """Regression: 0.07 across 12 gave the last person -0.04."""
        cases = [
            ("0.07", 12),
            ("0.07", 10),
            ("0.10", 12),
            ("0.05", 7),
            ("0.01", 3),
            ("1.00", 200),
            ("10.00", 7),
            ("99999.99", 12),
        ]

        for amount_str, n in cases:
            with self.subTest(amount=amount_str, participants=n):
                amount = Decimal(amount_str)
                shares = _calculate_equal_split(
                    amount=amount,
                    participants=[{"user_id": i + 1} for i in range(n)],
                )

                total = sum(shares.values(), Decimal("0"))
                self.assertEqual(total, amount)
                self.assertEqual(
                    min(shares.values()) >= Decimal("0"),
                    True,
                    f"equal split of {amount_str} across {n} produced a negative "
                    f"share: min={min(shares.values())}",
                )

    def test_matches_floor_then_distribute_reference(self):
        """Distribution should be within a cent and fully balanced."""
        for amount_str, n in [("10.00", 3), ("0.07", 12), ("1000.00", 7)]:
            with self.subTest(amount=amount_str, participants=n):
                shares = list(
                    _calculate_equal_split(
                        amount=Decimal(amount_str),
                        participants=[{"user_id": i + 1} for i in range(n)],
                    ).values()
                )
                expected = _expected_shares(Decimal(amount_str), n)

                self.assertEqual(len(shares), n)
                self.assertEqual(sum(shares), Decimal(amount_str))
                # no share differs from the exact average by more than a cent
                average = Decimal(amount_str) / n
                for value in shares:
                    self.assertLessEqual(
                        abs(value - average), CENT, f"{value} vs average {average}"
                    )
                # the set of distinct values matches the reference distribution
                self.assertEqual(
                    sorted(set(shares)),
                    sorted(set(expected)),
                    f"distribution shape differs from reference for "
                    f"{amount_str} across {n}",
                )


class EqualSplitPersistenceTests(TestCase):
    """The negative-share bug surfaced as a model validation error on save."""

    def setUp(self):
        self.admin = User.objects.create_user(
            name="admin", email="admin@example.com", password="pw"
        )
        self.category = Category.objects.create(name="Food", created_by=self.admin)
        self.group = Group.objects.create(name="Trip", created_by=self.admin)

        self.members = []
        for i in range(12):
            user = User.objects.create_user(
                name=f"m{i}", email=f"m{i}@example.com", password="pw"
            )
            GroupMembership.objects.create(
                group=self.group, user=user, role="member"
            )
            self.members.append(user)

    def test_tiny_expense_across_twelve_people_saves_cleanly(self):
        expense = create_expense(
            user=self.admin,
            group=self.group,
            title="tiny",
            category_id=self.category.id,
            amount=Decimal("0.07"),
            split_type="equal",
            payers=[{"user_id": self.members[0].id, "amount_paid": "0.07"}],
            participants=[{"user_id": m.id} for m in self.members],
        )

        shares = [
            p.amount_to_pay for p in expense.expense_participants.all()
        ]

        self.assertEqual(sum(shares, Decimal("0")), Decimal("0.07"))
        self.assertGreaterEqual(min(shares), Decimal("0"))