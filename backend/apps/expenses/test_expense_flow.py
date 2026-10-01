"""End-to-end verification of the expense split flow against a real database.

Exercises create_expense -> ExpensePayer/ExpenseParticipant rows ->
get_group_balance -> group_settlement, and asserts the accounting identity
holds for every split type: total paid == total owed, and group balances sum
to zero.

Run with: DJANGO_SETTINGS_MODULE=config.settings.verify manage.py test
"""

from decimal import Decimal

from django.test import TestCase
from rest_framework.test import APIClient

from apps.expenses.models import Category, Expense, ExpenseParticipant, ExpensePayer
from apps.expenses.services import create_expense, delete_expense, update_expense
from apps.groups.models import Group, GroupMembership
from apps.groups.selectors import get_group_balance, group_settlement
from apps.users.models import User

TWO_PLACES = Decimal("0.01")


class SplitFlowTestBase(TestCase):
    _counter = 0

    def _n(self):
        """Unique suffix for throwaway users (email is unique)."""
        SplitFlowTestBase._counter += 1
        return SplitFlowTestBase._counter

    def make_user(self, name):
        return User.objects.create_user(
            name=name, email=f"{name}@example.com", password="pw"
        )

    def setUp(self):
        self.admin = self.make_user("admin")
        self.alice = self.make_user("alice")
        self.bob = self.make_user("bob")
        self.category = Category.objects.create(name="Food", created_by=self.admin)

        self.group = Group.objects.create(name="Trip", created_by=self.admin)
        for index, user in enumerate([self.admin, self.alice, self.bob]):
            GroupMembership.objects.create(
                group=self.group,
                user=user,
                role="admin" if index == 0 else "member",
            )

    def members(self):
        return [self.admin, self.alice, self.bob]

    def make_expense(self, *, title, amount, split_type, payers, participants):
        return create_expense(
            user=self.admin,
            group=self.group,
            title=title,
            category_id=self.category.id,
            amount=Decimal(amount),
            split_type=split_type,
            payers=payers,
            participants=participants,
        )

    def assert_balanced(self, expense):
        """The core accounting invariant for a single expense."""
        paid = sum(
            (
                p.amount_paid
                for p in expense.expense_payers.all()
            ),
            Decimal("0"),
        )
        owed = sum(
            (
                q.amount_to_pay
                for q in expense.expense_participants.all()
            ),
            Decimal("0"),
        )

        self.assertEqual(
            paid,
            owed,
            f"{expense.split_type}: paid {paid} != owed {owed}",
        )
        self.assertEqual(
            paid,
            expense.amount,
            f"{expense.split_type}: paid {paid} != amount {expense.amount}",
        )
        return paid, owed

    def assert_group_balances_sum_to_zero(self):
        balance = get_group_balance(group=self.group)
        self.assertEqual(
            sum(balance.values(), Decimal("0")),
            Decimal("0"),
            f"group balances do not net to zero: {balance}",
        )
        return balance


class EqualSplitFlowTests(SplitFlowTestBase):
    def test_equal_split_persists_correct_shares(self):
        expense = self.make_expense(
            title="Dinner",
            amount="10.00",
            split_type="equal",
            payers=[{"user_id": self.alice.id, "amount_paid": "10.00"}],
            participants=[{"user_id": u.id} for u in self.members()],
        )

        amounts = {
            q.user_id: q.amount_to_pay for q in expense.expense_participants.all()
        }
        self.assertEqual(
            amounts,
            {
                self.admin.id: Decimal("3.34"),
                self.alice.id: Decimal("3.33"),
                self.bob.id: Decimal("3.33"),
            },
        )
        self.assert_balanced(expense)

    def test_equal_split_is_cent_exact_across_many_shapes(self):
        amounts = ["10.00", "0.07", "1.00", "33.33", "100.00", "1000.00", "1234.56"]
        counts = [1, 2, 3, 4, 5, 6, 7]

        for amount in amounts:
            for count in counts:
                with self.subTest(amount=amount, count=count):
                    participants = [
                        {"user_id": u.id}
                        for u in self.members()[:count]
                    ]
                    if count > 3:
                        # need more members than the 3 seeded
                        extra = []
                        for i in range(count - 3):
                            user = self.make_user(f"extra{self._n()}")
                            GroupMembership.objects.create(
                                group=self.group, user=user, role="member"
                            )
                            extra.append(user)
                        participants += [{"user_id": u.id} for u in extra]

                    expense = self.make_expense(
                        title=f"eq-{amount}-{count}",
                        amount=amount,
                        split_type="equal",
                        payers=[{"user_id": self.alice.id, "amount_paid": amount}],
                        participants=participants,
                    )
                    self.assert_balanced(expense)
                    self.assert_group_balances_sum_to_zero()
                    expense.delete()

    def test_single_participant_owes_everything(self):
        expense = self.make_expense(
            title="Solo",
            amount="42.42",
            split_type="equal",
            payers=[{"user_id": self.alice.id, "amount_paid": "42.42"}],
            participants=[{"user_id": self.bob.id}],
        )

        amounts = [q.amount_to_pay for q in expense.expense_participants.all()]
        self.assertEqual(amounts, [Decimal("42.42")])
        self.assert_balanced(expense)


class ExactSplitFlowTests(SplitFlowTestBase):
    def test_exact_split_persists_supplied_amounts(self):
        expense = self.make_expense(
            title="Groceries",
            amount="250.00",
            split_type="exact",
            payers=[{"user_id": self.admin.id, "amount_paid": "250.00"}],
            participants=[
                {"user_id": self.alice.id, "value": "200.00"},
                {"user_id": self.bob.id, "value": "25.50"},
                {"user_id": self.admin.id, "value": "24.50"},
            ],
        )

        amounts = {
            q.user_id: q.amount_to_pay for q in expense.expense_participants.all()
        }
        self.assertEqual(
            amounts,
            {
                self.alice.id: Decimal("200.00"),
                self.bob.id: Decimal("25.50"),
                self.admin.id: Decimal("24.50"),
            },
        )
        self.assert_balanced(expense)

    def test_exact_split_is_not_treated_as_equal(self):
        """A lopsided exact split must not be smoothed into equal shares."""
        expense = self.make_expense(
            title="Lopsided",
            amount="100.00",
            split_type="exact",
            payers=[{"user_id": self.admin.id, "amount_paid": "100.00"}],
            participants=[
                {"user_id": self.alice.id, "value": "90.00"},
                {"user_id": self.bob.id, "value": "10.00"},
            ],
        )

        amounts = sorted(
            q.amount_to_pay for q in expense.expense_participants.all()
        )
        self.assertEqual(amounts, [Decimal("10.00"), Decimal("90.00")])
        self.assert_balanced(expense)

    def test_exact_split_allows_zero_share(self):
        expense = self.make_expense(
            title="Free rider",
            amount="60.00",
            split_type="exact",
            payers=[{"user_id": self.admin.id, "amount_paid": "60.00"}],
            participants=[
                {"user_id": self.alice.id, "value": "60.00"},
                {"user_id": self.bob.id, "value": "0.00"},
            ],
        )

        amounts = {
            q.user_id: q.amount_to_pay for q in expense.expense_participants.all()
        }
        self.assertEqual(amounts[self.bob.id], Decimal("0"))
        self.assert_balanced(expense)

    def test_exact_split_mismatch_is_rejected(self):
        from apps.expenses.exceptions import InvalidExactSplitError

        with self.assertRaises(InvalidExactSplitError):
            self.make_expense(
                title="Bad",
                amount="100.00",
                split_type="exact",
                payers=[{"user_id": self.admin.id, "amount_paid": "100.00"}],
                participants=[
                    {"user_id": self.alice.id, "value": "40.00"},
                    {"user_id": self.bob.id, "value": "40.00"},
                ],
            )


class PercentageSplitFlowTests(SplitFlowTestBase):
    def test_percentage_split_scales_against_total(self):
        expense = self.make_expense(
            title="Rent",
            amount="200.00",
            split_type="percentage",
            payers=[{"user_id": self.admin.id, "amount_paid": "200.00"}],
            participants=[
                {"user_id": self.alice.id, "value": "25"},
                {"user_id": self.bob.id, "value": "75"},
            ],
        )

        amounts = {
            q.user_id: q.amount_to_pay for q in expense.expense_participants.all()
        }
        self.assertEqual(
            amounts,
            {self.alice.id: Decimal("50.00"), self.bob.id: Decimal("150.00")},
        )
        self.assert_balanced(expense)

    def test_percentage_split_is_cent_exact_with_awkward_shares(self):
        shares = [
            ("33.33", "33.33", "33.34"),
            ("33.3", "33.3", "33.4"),
            ("12.5", "12.5", "25", "25", "25"),
            ("1", "2", "3", "4", "5", "6", "7", "72"),
            ("99.99", "0.01"),
            ("50", "50"),
        ]
        amounts = ["10.00", "0.07", "1.00", "33.33", "100.00", "1000.00", "1234.56"]

        for amount in amounts:
            for share_group in shares:
                with self.subTest(amount=amount, shares=share_group):
                    needed = len(share_group)
                    extra_members = []
                    if needed > 3:
                        for i in range(needed - 3):
                            user = self.make_user(f"pct{self._n()}")
                            GroupMembership.objects.create(
                                group=self.group, user=user, role="member"
                            )
                            extra_members.append(user)

                    participants = [
                        {"user_id": u.id, "value": share}
                        for u, share in zip(
                            [*self.members(), *extra_members], share_group
                        )
                    ]

                    expense = self.make_expense(
                        title="pct",
                        amount=amount,
                        split_type="percentage",
                        payers=[
                            {"user_id": self.admin.id, "amount_paid": amount}
                        ],
                        participants=participants,
                    )
                    self.assert_balanced(expense)
                    self.assert_group_balances_sum_to_zero()
                    expense.delete()

    def test_percentage_split_rejects_total_that_is_not_100(self):
        from apps.expenses.exceptions import InvalidPercentageSplitError

        with self.assertRaises(InvalidPercentageSplitError):
            self.make_expense(
                title="Bad pct",
                amount="100.00",
                split_type="percentage",
                payers=[{"user_id": self.admin.id, "amount_paid": "100.00"}],
                participants=[
                    {"user_id": self.alice.id, "value": "33.33"},
                    {"user_id": self.bob.id, "value": "33.33"},
                    {"user_id": self.admin.id, "value": "33.33"},
                ],
            )


class MultiplePayerTests(SplitFlowTestBase):
    def test_multiple_payers_round_trip_exactly(self):
        expense = self.make_expense(
            title="Shared taxi",
            amount="30.00",
            split_type="equal",
            payers=[
                {"user_id": self.admin.id, "amount_paid": "10.00"},
                {"user_id": self.alice.id, "amount_paid": "10.00"},
                {"user_id": self.bob.id, "amount_paid": "10.00"},
            ],
            participants=[{"user_id": u.id} for u in self.members()],
        )

        self.assertEqual(
            {p.user_id: p.amount_paid for p in expense.expense_payers.all()},
            {
                self.admin.id: Decimal("10.00000"),
                self.alice.id: Decimal("10.00000"),
                self.bob.id: Decimal("10.00000"),
            },
        )
        self.assert_balanced(expense)

    def test_payer_total_must_equal_amount(self):
        from apps.expenses.exceptions import InvalidPaidAmount

        with self.assertRaises(InvalidPaidAmount):
            self.make_expense(
                title="Miscount",
                amount="30.00",
                split_type="equal",
                payers=[
                    {"user_id": self.admin.id, "amount_paid": "10.00"},
                    {"user_id": self.alice.id, "amount_paid": "10.00"},
                    {"user_id": self.bob.id, "amount_paid": "10.00"},
                ][:2],
                participants=[{"user_id": u.id} for u in self.members()],
            )


class BalanceAndSettlementTests(SplitFlowTestBase):
    def test_balances_reflect_each_split_type(self):
        self.make_expense(
            title="Dinner",
            amount="90.00",
            split_type="equal",
            payers=[{"user_id": self.alice.id, "amount_paid": "90.00"}],
            participants=[{"user_id": u.id} for u in self.members()],
        )
        self.make_expense(
            title="Lopsided",
            amount="100.00",
            split_type="exact",
            payers=[{"user_id": self.admin.id, "amount_paid": "100.00"}],
            participants=[
                {"user_id": self.alice.id, "value": "90.00"},
                {"user_id": self.bob.id, "value": "10.00"},
            ],
        )
        self.make_expense(
            title="Split",
            amount="60.00",
            split_type="percentage",
            payers=[{"user_id": self.bob.id, "amount_paid": "60.00"}],
            participants=[
                {"user_id": self.admin.id, "value": "50"},
                {"user_id": self.alice.id, "value": "50"},
            ],
        )

        balance = self.assert_group_balances_sum_to_zero()

        # Alice paid 90, owes 30 + 90 + 30 = 150 -> -60
        self.assertEqual(balance[self.alice.id], Decimal("-60.00"))
        # Bob paid 60, owes 30 + 10 = 40 -> +20
        self.assertEqual(balance[self.bob.id], Decimal("20.00"))
        # Admin paid 100, owes 30 + 30 = 60 -> +40
        self.assertEqual(balance[self.admin.id], Decimal("40.00"))

    def test_settlement_clears_every_balance(self):
        self.make_expense(
            title="Trip",
            amount="100.00",
            split_type="percentage",
            payers=[{"user_id": self.admin.id, "amount_paid": "100.00"}],
            participants=[
                {"user_id": self.alice.id, "value": "80"},
                {"user_id": self.bob.id, "value": "20"},
            ],
        )

        balance = get_group_balance(group=self.group)
        settlements = group_settlement(balance=balance)

        total = sum((s["amount"] for s in settlements), Decimal("0"))
        expected = sum((abs(v) for v in balance.values()), Decimal("0")) / Decimal("2")

        self.assertEqual(total, expected)

        # Applying the settlements must leave nobody owing anybody.
        # group_settlement keys its output by user *name*, so map back by name.
        by_name = {self.admin.name: self.admin, self.alice.name: self.alice, self.bob.name: self.bob}
        remaining = dict(balance)

        for s in settlements:
            remaining[by_name[s["from"]].id] += s["amount"]
            remaining[by_name[s["to"]].id] -= s["amount"]

        for uid, value in remaining.items():
            self.assertEqual(
                value.quantize(TWO_PLACES),
                Decimal("0.00"),
                f"settlement did not clear balance for user {uid}: {value}",
            )


class UpdateExpenseTests(SplitFlowTestBase):
    def test_update_replaces_participants_and_payers(self):
        expense = self.make_expense(
            title="Before",
            amount="100.00",
            split_type="equal",
            payers=[{"user_id": self.admin.id, "amount_paid": "100.00"}],
            participants=[{"user_id": u.id} for u in self.members()],
        )

        update_expense(
            request=self._request_for(self.admin),
            expense_id=expense.id,
            title="After",
            category_id=self.category.id,
            amount=Decimal("100.00"),
            split_type="percentage",
            payers=[{"user_id": self.bob.id, "amount_paid": "100.00"}],
            participants=[
                {"user_id": self.alice.id, "value": "60"},
                {"user_id": self.admin.id, "value": "40"},
            ],
        )

        expense.refresh_from_db()
        self.assertEqual(expense.split_type, "percentage")
        self.assertEqual(expense.title, "After")

        amounts = {
            q.user_id: q.amount_to_pay
            for q in expense.expense_participants.all()
        }
        self.assertEqual(
            amounts, {self.alice.id: Decimal("60.00"), self.admin.id: Decimal("40.00")}
        )

        payers = {p.user_id for p in expense.expense_payers.all()}
        self.assertEqual(payers, {self.bob.id})

    def test_delete_removes_payers_and_participants(self):
        expense = self.make_expense(
            title="Doomed",
            amount="50.00",
            split_type="equal",
            payers=[{"user_id": self.admin.id, "amount_paid": "50.00"}],
            participants=[{"user_id": u.id} for u in self.members()],
        )
        expense_id = expense.id

        delete_expense(request=self._request_for(self.admin), expense_id=expense_id)

        self.assertFalse(Expense.objects.filter(id=expense_id).exists())
        self.assertFalse(
            ExpensePayer.objects.filter(expense_id=expense_id).exists()
        )
        self.assertFalse(
            ExpenseParticipant.objects.filter(expense_id=expense_id).exists()
        )
        self.assert_group_balances_sum_to_zero()

    def test_delete_is_denied_for_non_admin_member(self):
        expense = self.make_expense(
            title="Protected",
            amount="50.00",
            split_type="equal",
            payers=[{"user_id": self.admin.id, "amount_paid": "50.00"}],
            participants=[{"user_id": u.id} for u in self.members()],
        )

        from apps.groups.exception import PermissionDeniedError

        with self.assertRaises(PermissionDeniedError):
            delete_expense(
                request=self._request_for(self.alice), expense_id=expense.id
            )

        self.assertTrue(Expense.objects.filter(id=expense.id).exists())

    def test_delete_is_denied_for_non_member(self):
        expense = self.make_expense(
            title="Private",
            amount="50.00",
            split_type="equal",
            payers=[{"user_id": self.admin.id, "amount_paid": "50.00"}],
            participants=[{"user_id": u.id} for u in self.members()],
        )

        outsider = self.make_user("outsider-delete")

        from apps.expenses.exceptions import NotGroupMemberError

        with self.assertRaises(NotGroupMemberError):
            delete_expense(
                request=self._request_for(outsider), expense_id=expense.id
            )

    def test_update_is_denied_for_non_admin_member(self):
        expense = self.make_expense(
            title="Locked",
            amount="50.00",
            split_type="equal",
            payers=[{"user_id": self.admin.id, "amount_paid": "50.00"}],
            participants=[{"user_id": u.id} for u in self.members()],
        )

        from apps.groups.exception import PermissionDeniedError

        with self.assertRaises(PermissionDeniedError):
            update_expense(
                request=self._request_for(self.bob),
                expense_id=expense.id,
                title="Hijacked",
                category_id=self.category.id,
                amount=Decimal("50.00"),
                split_type="equal",
                payers=[{"user_id": self.admin.id, "amount_paid": "50.00"}],
                participants=[{"user_id": self.admin.id}],
            )

        expense.refresh_from_db()
        self.assertEqual(expense.title, "Locked")

    def test_update_records_who_changed_it(self):
        expense = self.make_expense(
            title="Tracked",
            amount="50.00",
            split_type="equal",
            payers=[{"user_id": self.admin.id, "amount_paid": "50.00"}],
            participants=[{"user_id": u.id} for u in self.members()],
        )

        self.assertEqual(expense.created_by, self.admin)

        update_expense(
            request=self._request_for(self.admin),
            expense_id=expense.id,
            title="Tracked v2",
            category_id=self.category.id,
            amount=Decimal("75.00"),
            split_type="percentage",
            payers=[{"user_id": self.admin.id, "amount_paid": "75.00"}],
            participants=[
                {"user_id": self.admin.id, "value": "50"},
                {"user_id": self.alice.id, "value": "50"},
            ],
        )

        expense.refresh_from_db()
        self.assertEqual(expense.updated_by, self.admin)
        self.assertEqual(expense.amount, Decimal("75.00"))

        self.assert_balanced(expense)
        self.assertEqual(expense.expense_payers.count(), 1)
        self.assertEqual(expense.expense_participants.count(), 2)

    def test_update_can_switch_split_type_and_participants(self):
        expense = self.make_expense(
            title="Switch",
            amount="100.00",
            split_type="equal",
            payers=[{"user_id": self.admin.id, "amount_paid": "100.00"}],
            participants=[{"user_id": u.id} for u in self.members()],
        )

        update_expense(
            request=self._request_for(self.admin),
            expense_id=expense.id,
            title="Switched",
            category_id=self.category.id,
            amount=Decimal("100.00"),
            split_type="exact",
            payers=[{"user_id": self.alice.id, "amount_paid": "100.00"}],
            participants=[
                {"user_id": self.bob.id, "value": "80.00"},
                {"user_id": self.admin.id, "value": "20.00"},
            ],
        )

        expense.refresh_from_db()
        self.assertEqual(expense.split_type, "exact")

        amounts = {
            q.user_id: q.amount_to_pay
            for q in expense.expense_participants.all()
        }
        self.assertEqual(
            amounts, {self.bob.id: Decimal("80.00"), self.admin.id: Decimal("20.00")}
        )
        self.assertEqual(
            {p.user_id for p in expense.expense_payers.all()}, {self.alice.id}
        )

    def test_update_missing_expense_raises_not_found(self):
        from apps.expenses.exceptions import ExpenseDoesNotExistsError

        with self.assertRaises(ExpenseDoesNotExistsError):
            delete_expense(
                request=self._request_for(self.admin), expense_id=999999
            )

    def test_update_rolls_back_on_invalid_split(self):
        from apps.expenses.exceptions import InvalidPercentageSplitError

        expense = self.make_expense(
            title="Keep",
            amount="100.00",
            split_type="equal",
            payers=[{"user_id": self.admin.id, "amount_paid": "100.00"}],
            participants=[{"user_id": u.id} for u in self.members()],
        )

        with self.assertRaises(InvalidPercentageSplitError):
            update_expense(
                request=self._request_for(self.admin),
                expense_id=expense.id,
                title="Broken",
                category_id=self.category.id,
                amount=Decimal("100.00"),
                split_type="percentage",
                payers=[{"user_id": self.admin.id, "amount_paid": "100.00"}],
                participants=[{"user_id": self.alice.id, "value": "30"}],
            )

        expense.refresh_from_db()
        self.assertEqual(expense.title, "Keep")
        self.assertEqual(expense.split_type, "equal")
        self.assertEqual(expense.expense_participants.count(), 3)

    def _request_for(self, user):
        from rest_framework.test import APIRequestFactory

        request = APIRequestFactory().delete("/")
        request.user = user
        return request


class ApiContractTests(SplitFlowTestBase):
    """Verifies the wire contract the frontend depends on."""

    def setUp(self):
        super().setUp()
        self.client = APIClient()
        self.client.force_authenticate(user=self.admin)

    def create(self, payload):
        return self.client.post(
            f"/api/expenses/{self.group.id}/create/",
            payload,
            format="json",
        )

    def test_api_accepts_each_split_type(self):
        cases = {
            "equal": [
                {"user_id": self.alice.id},
                {"user_id": self.bob.id},
                {"user_id": self.admin.id},
            ],
            "exact": [
                {"user_id": self.alice.id, "value": "60.00"},
                {"user_id": self.bob.id, "value": "30.00"},
                {"user_id": self.admin.id, "value": "10.00"},
            ],
            "percentage": [
                {"user_id": self.alice.id, "value": "60"},
                {"user_id": self.bob.id, "value": "30"},
                {"user_id": self.admin.id, "value": "10"},
            ],
        }

        for split_type, participants in cases.items():
            with self.subTest(split_type=split_type):
                response = self.create(
                    {
                        "title": f"api {split_type}",
                        "category_id": self.category.id,
                        "amount": "100.00",
                        "split_type": split_type,
                        "payers": [
                            {"user_id": self.admin.id, "amount_paid": "100.00"}
                        ],
                        "participants": participants,
                    }
                )

                self.assertEqual(
                    response.status_code,
                    201,
                    f"{split_type}: {response.content}",
                )
                self.assertEqual(response.data["data"]["split_type"], split_type)

        self.assertEqual(Expense.objects.count(), 3)
        self.assert_group_balances_sum_to_zero()

    def test_api_rejects_duplicate_participant(self):
        response = self.create(
            {
                "title": "dupe",
                "category_id": self.category.id,
                "amount": "100.00",
                "split_type": "exact",
                "payers": [{"user_id": self.admin.id, "amount_paid": "100.00"}],
                "participants": [
                    {"user_id": self.alice.id, "value": "50.00"},
                    {"user_id": self.alice.id, "value": "50.00"},
                ],
            }
        )

        self.assertEqual(response.status_code, 400)

    def test_api_rejects_payer_total_mismatch(self):
        response = self.create(
            {
                "title": "mismatch",
                "category_id": self.category.id,
                "amount": "100.00",
                "split_type": "equal",
                "payers": [
                    {"user_id": self.admin.id, "amount_paid": "33.33"},
                    {"user_id": self.alice.id, "amount_paid": "33.33"},
                    {"user_id": self.bob.id, "amount_paid": "33.33"},
                ],
                "participants": [{"user_id": u.id} for u in self.members()],
            }
        )

        self.assertEqual(response.status_code, 400)

    def test_api_rejects_non_member(self):
        outsider = self.make_user("outsider")

        response = self.create(
            {
                "title": "outsider",
                "category_id": self.category.id,
                "amount": "100.00",
                "split_type": "equal",
                "payers": [{"user_id": outsider.id, "amount_paid": "100.00"}],
                "participants": [{"user_id": self.alice.id}],
            }
        )

        self.assertEqual(response.status_code, 400)

    def test_sub_cent_amount_is_rejected(self):
        # Shares are computed in whole cents, so a sub-cent total cannot split:
        # 0.00001 across three people would store 0 + 0 + 0.
        response = self.create(
            {
                "title": "sub-cent",
                "category_id": self.category.id,
                "amount": "10.005",
                "split_type": "equal",
                "payers": [{"user_id": self.admin.id, "amount_paid": "10.005"}],
                "participants": [{"user_id": u.id} for u in self.members()],
            }
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn("decimal", str(response.data).lower())

    def test_two_decimal_amount_is_accepted(self):
        response = self.create(
            {
                "title": "cents only",
                "category_id": self.category.id,
                "amount": "10.01",
                "split_type": "equal",
                "payers": [{"user_id": self.admin.id, "amount_paid": "10.01"}],
                "participants": [{"user_id": u.id} for u in self.members()],
            }
        )

        self.assertEqual(response.status_code, 201, response.content)
        expense = Expense.objects.get(title="cents only")
        self.assert_balanced(expense)

    def test_sub_dollar_expense_is_accepted(self):
        response = self.create(
            {
                "title": "coffee",
                "category_id": self.category.id,
                "amount": "0.75",
                "split_type": "percentage",
                "payers": [{"user_id": self.admin.id, "amount_paid": "0.75"}],
                "participants": [
                    {"user_id": self.alice.id, "value": "50"},
                    {"user_id": self.bob.id, "value": "50"},
                ],
            }
        )

        self.assertEqual(response.status_code, 201, response.content)

        expense = Expense.objects.get(title="coffee")
        self.assert_balanced(expense)

    def test_api_delete_and_update_round_trip(self):
        created = self.create(
            {
                "title": "editable",
                "category_id": self.category.id,
                "amount": "100.00",
                "split_type": "equal",
                "payers": [{"user_id": self.admin.id, "amount_paid": "100.00"}],
                "participants": [{"user_id": u.id} for u in self.members()],
            }
        )
        self.assertEqual(created.status_code, 201, created.content)
        expense_id = created.data["data"]["id"]

        patched = self.client.patch(
            f"/api/expenses/{expense_id}/update/",
            {
                "title": "edited",
                "category_id": self.category.id,
                "amount": "60.00",
                "split_type": "percentage",
                "payers": [{"user_id": self.alice.id, "amount_paid": "60.00"}],
                "participants": [
                    {"user_id": self.admin.id, "value": "25"},
                    {"user_id": self.bob.id, "value": "75"},
                ],
            },
            format="json",
        )
        self.assertEqual(patched.status_code, 200, patched.content)
        self.assertEqual(patched.data["data"]["title"], "edited")
        self.assertEqual(patched.data["data"]["split_type"], "percentage")

        expense = Expense.objects.get(id=expense_id)
        self.assertEqual(expense.title, "edited")
        self.assertEqual(expense.amount, Decimal("60.00"))
        self.assert_balanced(expense)

        deleted = self.client.delete(f"/api/expenses/{expense_id}/delete/")
        self.assertEqual(deleted.status_code, 200, deleted.content)
        self.assertFalse(Expense.objects.filter(id=expense_id).exists())
        self.assert_group_balances_sum_to_zero()

    def test_api_update_rejects_invalid_split(self):
        created = self.create(
            {
                "title": "guard",
                "category_id": self.category.id,
                "amount": "100.00",
                "split_type": "equal",
                "payers": [{"user_id": self.admin.id, "amount_paid": "100.00"}],
                "participants": [{"user_id": u.id} for u in self.members()],
            }
        )
        expense_id = created.data["data"]["id"]

        response = self.client.patch(
            f"/api/expenses/{expense_id}/update/",
            {
                "title": "bad",
                "category_id": self.category.id,
                "amount": "100.00",
                "split_type": "percentage",
                "payers": [{"user_id": self.admin.id, "amount_paid": "100.00"}],
                "participants": [{"user_id": self.alice.id, "value": "30"}],
            },
            format="json",
        )

        self.assertEqual(response.status_code, 400)
        # the original expense must be untouched
        expense = Expense.objects.get(id=expense_id)
        self.assertEqual(expense.title, "guard")
        self.assertEqual(expense.split_type, "equal")
        self.assertEqual(expense.expense_participants.count(), 3)

    def test_api_delete_denied_for_non_admin(self):
        created = self.create(
            {
                "title": "not yours",
                "category_id": self.category.id,
                "amount": "100.00",
                "split_type": "equal",
                "payers": [{"user_id": self.admin.id, "amount_paid": "100.00"}],
                "participants": [{"user_id": u.id} for u in self.members()],
            }
        )
        expense_id = created.data["data"]["id"]

        self.client.force_authenticate(user=self.bob)
        response = self.client.delete(f"/api/expenses/{expense_id}/delete/")

        self.assertEqual(response.status_code, 403)
        self.assertTrue(Expense.objects.filter(id=expense_id).exists())

    def test_api_delete_unknown_expense_returns_404(self):
        response = self.client.delete("/api/expenses/999999/delete/")
        self.assertEqual(response.status_code, 404)

    def test_group_detail_exposes_participant_shares(self):
        self.create(
            {
                "title": "detail",
                "category_id": self.category.id,
                "amount": "100.00",
                "split_type": "percentage",
                "payers": [{"user_id": self.admin.id, "amount_paid": "100.00"}],
                "participants": [
                    {"user_id": self.alice.id, "value": "70"},
                    {"user_id": self.bob.id, "value": "30"},
                ],
            }
        )

        response = self.client.get(f"/api/groups/{self.group.id}/detail/")
        self.assertEqual(response.status_code, 200, response.content)

        expense = response.data["data"]["expenses"][0]
        self.assertEqual(expense["split_type"], "percentage")

        shares = {
            p["user"]["id"]: p["amount_to_pay"] for p in expense["participants"]
        }
        self.assertEqual(
            {uid: Decimal(str(v)) for uid, v in shares.items()},
            {
                self.alice.id: Decimal("70.00000"),
                self.bob.id: Decimal("30.00000"),
            },
        )
