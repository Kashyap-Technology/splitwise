import json
from decimal import Decimal

from django.test import TestCase
from rest_framework.test import APIClient

from apps.expenses.models import Category
from apps.expenses.services import create_expense
from apps.groups.models import Group, GroupMembership
from apps.settlements.services import settlement_create
from apps.users.export import build_export
from apps.users.models import User


class UserExportTests(TestCase):
    """The data-export contract.

    Two things are load-bearing beyond the happy path: the export must not leak
    another member's email address, and it must not include groups the
    requester has nothing to do with.
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
        self.outsider = User.objects.create_user(
            name="outsider", email="outsider@example.com", password="pw"
        )

        self.category = Category.objects.create(name="Food", created_by=self.alice)

        self.group = Group.objects.create(
            name="Flat", description="shared costs", created_by=self.alice
        )
        for user, role in [
            (self.alice, "admin"),
            (self.bob, "member"),
        ]:
            GroupMembership.objects.create(
                group=self.group, user=user, role=role, created_by=self.alice
            )

        # A group the requester is not in at all.
        self.other_group = Group.objects.create(
            name="Secret", description="not yours", created_by=self.carol
        )
        GroupMembership.objects.create(
            group=self.other_group,
            user=self.carol,
            role="admin",
            created_by=self.carol,
        )
        self.make_expense(group=self.other_group, payer=self.carol, participants=[self.carol.id])

        self.client = APIClient()

    def make_expense(self, *, group, payer, participants, amount="90.00"):
        return create_expense(
            user=payer,
            group=group,
            title=f"{group.name} dinner",
            category_id=self.category.id,
            amount=Decimal(amount),
            split_type="equal",
            payers=[{"user_id": payer.id, "amount_paid": amount}],
            participants=[{"user_id": user_id} for user_id in participants],
        )

    def two_way(self, *, group, payer, amount="90.00"):
        """Payer splits with alice, the requester."""
        others = [self.alice.id] if payer.id != self.alice.id else [self.bob.id]
        return self.make_expense(
            group=group,
            payer=payer,
            participants=[payer.id, *others],
            amount=amount,
        )

    def get_json(self, user):
        self.client.force_authenticate(user=user)
        response = self.client.get("/api/users/export/")
        self.assertEqual(response.status_code, 200, response.content)
        self.assertEqual(response["Content-Type"], "application/json")
        return json.loads(response.content)

    # --- shape ------------------------------------------------------------

    def test_export_includes_account_totals_and_groups(self):
        data = self.get_json(self.alice)

        self.assertEqual(data["account"]["email"], "alice@example.com")
        self.assertEqual(data["totals"]["groups"], 1)
        self.assertEqual(data["totals"]["expenses"], 0)

    def test_expense_carries_payers_participants_and_viewer_shares(self):
        expense = self.two_way(group=self.group, payer=self.bob)

        data = self.get_json(self.alice)
        exported = data["groups"][0]["expenses"][0]

        self.assertEqual(exported["id"], expense.id)
        self.assertEqual(exported["title"], "Flat dinner")
        self.assertEqual(exported["category"], "Food")
        self.assertEqual(exported["split_type"], "equal")
        # Bob paid all of it; alice participated in half.
        self.assertEqual(Decimal(exported["your_paid"]), Decimal("0"))
        self.assertEqual(Decimal(exported["your_share"]), Decimal("45"))
        self.assertEqual(len(exported["payers"]), 1)
        self.assertEqual(len(exported["participants"]), 2)

    def test_your_paid_is_set_when_the_viewer_is_the_payer(self):
        self.two_way(group=self.group, payer=self.alice)

        exported = self.get_json(self.alice)["groups"][0]["expenses"][0]

        self.assertEqual(Decimal(exported["your_paid"]), Decimal("90"))
        self.assertEqual(Decimal(exported["your_share"]), Decimal("45"))

    def test_your_share_is_not_inflated_when_viewer_pays_and_participates(self):
        # Alice is on both sides of the same expense. Resolving the two
        # independently is the whole reason the viewer shares are queried
        # separately rather than joined together.
        self.two_way(group=self.group, payer=self.alice)

        exported = self.get_json(self.alice)["groups"][0]["expenses"][0]

        self.assertEqual(Decimal(exported["your_paid"]), Decimal("90"))
        self.assertEqual(Decimal(exported["your_share"]), Decimal("45"))

    def test_your_role_is_included_per_group(self):
        data = self.get_json(self.alice)
        self.assertEqual(data["groups"][0]["your_role"], "admin")

        data = self.get_json(self.bob)
        self.assertEqual(data["groups"][0]["your_role"], "member")

    def test_settlements_are_included(self):
        self.two_way(group=self.group, payer=self.bob)
        # Owed to nobody yet: bob fronted and alice participated, so bob is owed.
        settlement_create(
            group=self.group,
            from_user=self.alice,
            to_user_id=self.bob.id,
            amount=Decimal("10.00"),
        )

        data = self.get_json(self.alice)
        settlements = data["groups"][0]["settlements"]

        self.assertEqual(len(settlements), 1)
        self.assertEqual(settlements[0]["from"], "alice")
        self.assertEqual(settlements[0]["to"], "bob")
        self.assertEqual(Decimal(settlements[0]["amount"]), Decimal("10"))

    # --- scoping ----------------------------------------------------------

    def test_groups_the_requester_is_not_in_are_excluded(self):
        data = self.get_json(self.alice)

        self.assertEqual([g["name"] for g in data["groups"]], ["Flat"])
        self.assertNotIn("Secret", json.dumps(data))

    def test_other_members_emails_are_never_included(self):
        self.two_way(group=self.group, payer=self.bob)

        blob = json.dumps(self.get_json(self.alice))

        self.assertNotIn("bob@example.com", blob)
        self.assertNotIn("carol@example.com", blob)
        # The requester's own email is theirs and should be present.
        self.assertIn("alice@example.com", blob)
        # Names are needed to make the rows meaningful.
        self.assertIn("bob", blob)

    def test_an_outsider_sees_no_groups(self):
        data = self.get_json(self.outsider)

        self.assertEqual(data["groups"], [])
        self.assertEqual(data["totals"]["groups"], 0)

    def test_export_requires_authentication(self):
        client = APIClient()
        self.assertEqual(client.get("/api/users/export/").status_code, 401)

    def test_totals_aggregate_across_groups(self):
        self.two_way(group=self.group, payer=self.alice)

        totals = self.get_json(self.alice)["totals"]

        self.assertEqual(totals["groups"], 1)
        self.assertEqual(totals["expenses"], 1)
        self.assertEqual(Decimal(totals["gross_expense_total"]), Decimal("90"))
        self.assertEqual(Decimal(totals["your_total_paid"]), Decimal("90"))
        self.assertEqual(Decimal(totals["your_total_share"]), Decimal("45"))
        # Paid 90, owed 45, so the groups owe the viewer the difference.
        self.assertEqual(Decimal(totals["your_net"]), Decimal("45"))

    def test_your_net_is_negative_when_you_owe(self):
        self.two_way(group=self.group, payer=self.bob)

        self.assertEqual(Decimal(self.get_json(self.alice)["totals"]["your_net"]), Decimal("-45"))

    def test_totals_are_empty_rather_than_missing_for_an_outsider(self):
        totals = self.get_json(self.outsider)["totals"]

        self.assertEqual(totals["gross_expense_total"], "0")
        self.assertEqual(totals["your_net"], "0")

    # --- builder ----------------------------------------------------------

    def test_build_export_is_callable_without_http(self):
        self.two_way(group=self.group, payer=self.alice)

        data = build_export(self.alice)

        self.assertEqual(data["totals"]["expenses"], 1)
        self.assertEqual(data["account"]["name"], "alice")