"""Exhaustive numeric verification of split math and balances.

Prints a readable matrix and asserts two invariants on every case:
  1. per-expense: sum(amount_to_pay) == amount  and  sum(amount_paid) == amount
  2. per-group:   sum(balance.values()) == 0
"""

from decimal import ROUND_HALF_UP, Decimal
from itertools import product

from django.test import TestCase

from apps.expenses.models import Category
from apps.expenses.services import (
    _calculate_exact_split,
    _calculate_payer_amount,
    _calculate_percentage_split,
    create_expense,
)
from apps.groups.models import Group, GroupMembership
from apps.groups.selectors import get_group_balance, group_settlement
from apps.users.models import User

CENT = Decimal("0.01")

AMOUNTS = [
    "0.01",
    "0.07",
    "1.00",
    "9.99",
    "10.00",
    "33.33",
    "99.99",
    "100.00",
    "123.45",
    "1000.00",
    "1234.56",
    "99999.99",
]

# Percentage groups that each sum to exactly 100.
PERCENT_GROUPS = [
    ["100"],
    ["50", "50"],
    ["99.99", "0.01"],
    ["33.33", "33.33", "33.34"],
    ["33.3", "33.3", "33.4"],
    ["25", "25", "25", "25"],
    ["12.5", "12.5", "25", "25", "25"],
    ["1", "2", "3", "4", "5", "6", "7", "72"],
    ["10", "10", "10", "10", "10", "10", "10", "10", "20"],
    ["0.01", "0.02", "0.97", "25", "24.99", "25", "24.01"],
]


class SplitMathMatrixTests(TestCase):
    """Pure-function verification across a wide amount x split-type matrix."""

    def test_equal_split_always_reconciles(self):
        checked = 0
        for amount_str in AMOUNTS:
            amount = Decimal(amount_str)
            for n in range(1, 13):
                with self.subTest(amount=amount_str, participants=n):
                    ids = list(range(1, n + 1))
                    amounts = _calculate_payer_amount(
                        amount=amount,
                        payers=[{"user_id": 1, "amount_paid": amount_str}],
                    )
                    del amounts
                    from apps.expenses.services import _calculate_equal_split

                    shares = _calculate_equal_split(
                        amount=amount,
                        participants=[{"user_id": i} for i in ids],
                    )

                    self.assertEqual(
                        sum(shares.values(), Decimal("0")),
                        amount,
                        f"equal split of {amount_str} across {n} did not reconcile",
                    )
                    # Equal split floors to whole cents then hands out leftover cents one
                    # each, so shares differ by at most a cent and nothing
                    # can go negative.
                    values = list(shares.values())
                    self.assertEqual(sum(values, Decimal("0")), amount)
                    self.assertGreaterEqual(min(values), Decimal("0"))
                    self.assertLessEqual(
                        max(values) - min(values), CENT, f"spread too wide for {amount_str}/{n}"
                    )
                    self.assertEqual(len(shares), n)
                    checked += 1
        print(f"\n  equal split: {checked} (amount x participant-count) combinations reconciled")

    def test_exact_split_reconciles_across_amounts(self):
        checked = 0
        for amount_str in AMOUNTS:
            amount = Decimal(amount_str)
            for n in (1, 2, 3, 4, 5, 7):
                with self.subTest(amount=amount_str, parts=n):
                    base = (amount / n).quantize(CENT, rounding=ROUND_HALF_UP)
                    shares = [
                        base for _ in range(n - 1)
                    ] + [amount - base * (n - 1)]

                    result = _calculate_exact_split(
                        amount=amount,
                        participants=[
                            {"user_id": i + 1, "value": str(shares[i])}
                            for i in range(n)
                        ],
                    )

                    self.assertEqual(sum(result.values(), Decimal("0")), amount)
                    checked += 1
        print(f"  exact split:  {checked} combinations reconciled")

    def test_percentage_split_reconciles_across_matrix(self):
        checked = 0
        for amount_str, group in product(AMOUNTS, PERCENT_GROUPS):
            amount = Decimal(amount_str)
            with self.subTest(amount=amount_str, shares=len(group)):
                result = _calculate_percentage_split(
                    amount=amount,
                    participants=[
                        {"user_id": i + 1, "value": v} for i, v in enumerate(group)
                    ],
                )

                self.assertEqual(
                    sum(result.values(), Decimal("0")),
                    amount,
                    f"percentage split of {amount_str} by {group} lost or gained money",
                )
                self.assertEqual(len(result), len(group))
                checked += 1
        print(f"  percentage:   {checked} (amount x share-group) combinations reconciled")


class GroupLedgerTests(TestCase):
    """Every expense in a group must leave the ledger balanced."""

    def setUp(self):
        self.admin = User.objects.create_user(
            name="admin", email="admin@example.com", password="pw"
        )
        self.alice = User.objects.create_user(
            name="alice", email="alice@example.com", password="pw"
        )
        self.bob = User.objects.create_user(
            name="bob", email="bob@example.com", password="pw"
        )
        self.category = Category.objects.create(name="Food", created_by=self.admin)
        self.group = Group.objects.create(name="Trip", created_by=self.admin)
        for user in (self.admin, self.alice, self.bob):
            GroupMembership.objects.create(group=self.group, user=user, role="member")
        self.ids = [self.admin.id, self.alice.id, self.bob.id]

    def add(self, *, amount, split_type, participants, payers):
        return create_expense(
            user=self.admin,
            group=self.group,
            title=f"{split_type}-{amount}",
            category_id=self.category.id,
            amount=Decimal(amount),
            split_type=split_type,
            payers=payers,
            participants=participants,
        )

    def test_mixed_split_types_stay_balanced(self):
        scenarios = [
            {
                "amount": "90.00",
                "split_type": "equal",
                "payers": [{"user_id": self.ids[1], "amount_paid": "90.00"}],
                "participants": [{"user_id": i} for i in self.ids],
            },
            {
                "amount": "100.00",
                "split_type": "exact",
                "payers": [{"user_id": self.ids[0], "amount_paid": "100.00"}],
                "participants": [
                    {"user_id": self.ids[1], "value": "90.00"},
                    {"user_id": self.ids[2], "value": "10.00"},
                ],
            },
            {
                "amount": "60.00",
                "split_type": "percentage",
                "payers": [{"user_id": self.ids[2], "amount_paid": "60.00"}],
                "participants": [
                    {"user_id": self.ids[0], "value": "50"},
                    {"user_id": self.ids[1], "value": "50"},
                ],
            },
            {
                "amount": "0.07",
                "split_type": "percentage",
                "payers": [{"user_id": self.ids[0], "amount_paid": "0.07"}],
                "participants": [
                    {"user_id": self.ids[1], "value": "33.33"},
                    {"user_id": self.ids[2], "value": "33.33"},
                    {"user_id": self.ids[0], "value": "33.34"},
                ],
            },
            {
                "amount": "1000.00",
                "split_type": "exact",
                "payers": [
                    {"user_id": self.ids[0], "amount_paid": "500.00"},
                    {"user_id": self.ids[1], "amount_paid": "500.00"},
                ],
                "participants": [
                    {"user_id": self.ids[0], "value": "250.00"},
                    {"user_id": self.ids[1], "value": "250.00"},
                    {"user_id": self.ids[2], "value": "500.00"},
                ],
            },
        ]

        for scenario in scenarios:
            expense = self.add(**scenario)

            paid = sum(
                (p.amount_paid for p in expense.expense_payers.all()), Decimal("0")
            )
            owed = sum(
                (p.amount_to_pay for p in expense.expense_participants.all()),
                Decimal("0"),
            )
            self.assertEqual(paid, owed, scenario["split_type"])
            self.assertEqual(paid, Decimal(scenario["amount"]), scenario["split_type"])

        balance = get_group_balance(group=self.group)
        self.assertEqual(sum(balance.values(), Decimal("0")), Decimal("0"))

        print("\n  group balance after 5 mixed expenses:", {k: str(v) for k, v in balance.items()})

        # Expected by hand across all five expenses:
        #   admin  -30 +100 -30 +0.04 +250 = 290.04
        #   alice  +60 -90 -30 -0.02 +250 = 189.98
        #   bob    -30 -10 +60 -0.02 -500 = -480.02
        self.assertEqual(balance[self.ids[0]].quantize(CENT), Decimal("290.04"))
        self.assertEqual(balance[self.ids[1]].quantize(CENT), Decimal("189.98"))
        self.assertEqual(balance[self.ids[2]].quantize(CENT), Decimal("-480.02"))

    def test_every_scenario_settles_to_zero(self):
        for scenario in (
            {"amount": "100.00", "split_type": "percentage",
             "payers": [{"user_id": self.ids[0], "amount_paid": "100.00"}],
             "participants": [{"user_id": self.ids[1], "value": "80"},
                             {"user_id": self.ids[2], "value": "20"}]},
            {"amount": "0.07", "split_type": "equal",
             "payers": [{"user_id": self.ids[1], "amount_paid": "0.07"}],
             "participants": [{"user_id": i} for i in self.ids]},
            {"amount": "1234.56", "split_type": "exact",
             "payers": [{"user_id": self.ids[2], "amount_paid": "1234.56"}],
             "participants": [{"user_id": self.ids[0], "value": "111.11"},
                             {"user_id": self.ids[1], "value": "111.11"},
                             {"user_id": self.ids[2], "value": "1012.34"}]},
        ):
            with self.subTest(amount=scenario["amount"], split_type=scenario["split_type"]):
                self.add(**scenario)
                balance = get_group_balance(group=self.group)
                self.assertEqual(sum(balance.values(), Decimal("0")), Decimal("0"))

                settlements = group_settlement(balance=balance)
                by_name = {self.admin.name: self.admin,
                           self.alice.name: self.alice,
                           self.bob.name: self.bob}

                remaining = dict(balance)
                for s in settlements:
                    remaining[by_name[s["from"]].id] += s["amount"]
                    remaining[by_name[s["to"]].id] -= s["amount"]

                for uid, value in remaining.items():
                    self.assertEqual(
                        value.quantize(CENT),
                        Decimal("0.00"),
                        f"settlement left user {uid} at {value}",
                    )

                print(
                    f"  settled {scenario['split_type']:<11} {scenario['amount']:>9}"
                    f" -> {len(settlements)} transfer(s), all balances zero"
                )