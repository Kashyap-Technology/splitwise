from decimal import Decimal

from django.test import TestCase
from rest_framework.test import APIClient

from apps.expenses.models import Category, Expense
from apps.expenses.services import create_expense
from apps.groups.models import Group, GroupMembership
from apps.users.models import User


class CategoryStatsTests(TestCase):
    """The annotations behind the /categories screen.

    Two questions are answered per category and they use different scopes:
    `expense_count` is global (is it in use at all?) and `your_spend` is
    per-viewer (what did it cost me?).
    """

    def setUp(self):
        self.alice = User.objects.create_user(
            name="alice", email="alice@example.com", password="pw"
        )
        self.bob = User.objects.create_user(
            name="bob", email="bob@example.com", password="pw"
        )
        self.carol = User.objects.create_user(
            name="carol", email="carol@example.com", password="pw"
        )

        self.food = Category.objects.create(name="Food", created_by=self.alice)
        self.rent = Category.objects.create(name="Rent", created_by=self.alice)
        self.unused = Category.objects.create(name="Unused", created_by=self.alice)

        self.group = Group.objects.create(name="Flat", created_by=self.alice)
        for index, user in enumerate([self.alice, self.bob, self.carol]):
            GroupMembership.objects.create(
                group=self.group,
                user=user,
                role="admin" if index == 0 else "member",
            )

    def make_expense(self, *, category, amount, payers, participants, title="e"):
        return create_expense(
            user=self.alice,
            group=self.group,
            title=title,
            category_id=category.id,
            amount=Decimal(amount),
            split_type="equal",
            payers=payers,
            participants=participants,
        )

    def categories_for(self, user):
        client = APIClient()
        client.force_authenticate(user=user)
        response = client.get("/api/expenses/category/list/")
        self.assertEqual(response.status_code, 200, response.content)
        return {row["name"]: row for row in response.data["data"]}

    def test_list_includes_every_category_even_unused_ones(self):
        rows = self.categories_for(self.alice)

        self.assertEqual(len(rows), 3)
        self.assertIn("Unused", rows)

    def test_unused_category_reports_zero_count_and_zero_spend(self):
        row = self.categories_for(self.alice)["Unused"]

        self.assertEqual(row["expense_count"], 0)
        self.assertEqual(Decimal(str(row["your_spend"])), Decimal("0.00000"))

    def test_expense_count_is_global_not_per_user(self):
        # Bob pays and everyone participates, so alice's own share is $30 but
        # the category has been used once in total.
        self.make_expense(
            category=self.food,
            amount="90.00",
            payers=[{"user_id": self.bob.id, "amount_paid": "90.00"}],
            participants=[{"user_id": u.id} for u in [self.alice, self.bob, self.carol]],
        )

        row = self.categories_for(self.alice)["Food"]
        self.assertEqual(row["expense_count"], 1)
        self.assertEqual(Decimal(str(row["your_spend"])), Decimal("30.00000"))

    def test_your_spend_sums_your_own_shares_across_expenses(self):
        self.make_expense(
            category=self.rent,
            amount="60.00",
            payers=[{"user_id": self.alice.id, "amount_paid": "60.00"}],
            participants=[{"user_id": u.id} for u in [self.alice, self.bob]],
            title="rent a",
        )
        self.make_expense(
            category=self.rent,
            amount="60.00",
            payers=[{"user_id": self.alice.id, "amount_paid": "60.00"}],
            participants=[{"user_id": u.id} for u in [self.alice, self.bob]],
            title="rent b",
        )

        self.assertEqual(
            Decimal(str(self.categories_for(self.alice)["Rent"]["your_spend"])),
            Decimal("60.00000"),
        )

    def test_your_spend_differs_per_viewer_for_the_same_category(self):
        # One $90 expense split three ways: alice owes 30, carol owes 30.
        self.make_expense(
            category=self.food,
            amount="90.00",
            payers=[{"user_id": self.bob.id, "amount_paid": "90.00"}],
            participants=[{"user_id": u.id} for u in [self.alice, self.bob, self.carol]],
        )

        self.assertEqual(
            Decimal(str(self.categories_for(self.alice)["Food"]["your_spend"])),
            Decimal("30.00000"),
        )
        # Bob fronted the whole bill, so his own participant share is 30.
        self.assertEqual(
            Decimal(str(self.categories_for(self.bob)["Food"]["your_spend"])),
            Decimal("30.00000"),
        )

    def test_a_user_outside_the_expense_owes_nothing_for_that_category(self):
        # Carol is a group member but takes part in none of this expense.
        self.make_expense(
            category=self.food,
            amount="90.00",
            payers=[{"user_id": self.alice.id, "amount_paid": "90.00"}],
            participants=[{"user_id": u.id} for u in [self.alice, self.bob]],
        )

        self.assertEqual(
            Decimal(str(self.categories_for(self.carol)["Food"]["your_spend"])),
            Decimal("0.00000"),
        )

    def test_counts_are_not_inflated_by_multiple_participants(self):
        # A payer who is also a participant joins both sides of the filter. A
        # single joined aggregate would multiply here; subqueries must not.
        self.make_expense(
            category=self.food,
            amount="60.00",
            payers=[{"user_id": self.alice.id, "amount_paid": "60.00"}],
            participants=[{"user_id": self.alice.id}, {"user_id": self.bob.id}],
        )

        row = self.categories_for(self.alice)["Food"]
        self.assertEqual(row["expense_count"], 1)
        self.assertEqual(Decimal(str(row["your_spend"])), Decimal("30.00000"))

    def test_created_by_name_is_returned(self):
        self.assertEqual(
            self.categories_for(self.alice)["Food"]["created_by"], "alice"
        )

    def test_create_accepts_an_icon_key(self):
        client = APIClient()
        client.force_authenticate(user=self.alice)

        response = client.post(
            "/api/expenses/category/create/",
            {"name": "Groceries", "icon": "food"},
            format="json",
        )

        self.assertEqual(response.status_code, 201, response.content)
        created = Category.objects.get(name="Groceries")
        self.assertEqual(created.icon, "food")

    def test_create_without_an_icon_leaves_it_null(self):
        client = APIClient()
        client.force_authenticate(user=self.alice)

        response = client.post(
            "/api/expenses/category/create/", {"name": "Odd"}, format="json"
        )

        self.assertEqual(response.status_code, 201, response.content)
        self.assertIsNone(Category.objects.get(name="Odd").icon)

    def test_a_category_in_use_cannot_be_deleted(self):
        # Expense.category is on_delete=PROTECT, which is why the categories
        # screen offers no delete action.
        self.make_expense(
            category=self.food,
            amount="10.00",
            payers=[{"user_id": self.alice.id, "amount_paid": "10.00"}],
            participants=[{"user_id": self.alice.id}],
        )

        with self.assertRaises(Exception):
            self.food.delete()

        self.assertTrue(Category.objects.filter(id=self.food.id).exists())
        self.assertEqual(Expense.objects.count(), 1)