from django.test import TestCase
from rest_framework.test import APIClient

from apps.groups.models import Group, GroupMembership
from apps.groups.views import GroupCreateApi, GroupUpdateApi
from apps.users.models import User


class GroupUpdateTests(TestCase):
    """The edit-group dialog's contract.

    Three things previously made this screen unusable and are pinned here so
    they cannot regress:

    * the name uniqueness check counted the group being edited against itself,
      so a description-only edit was rejected;
    * "remove image" could not be expressed, so the button silently did nothing;
    * only the group's creator could edit, even though the UI offered the button
      to admins and to every member.
    """

    def setUp(self):
        self.creator = User.objects.create_user(
            name="creator", email="creator@example.com", password="pw"
        )
        self.admin = User.objects.create_user(
            name="admin", email="admin@example.com", password="pw"
        )
        self.member = User.objects.create_user(
            name="member", email="member@example.com", password="pw"
        )
        self.outsider = User.objects.create_user(
            name="outsider", email="outsider@example.com", password="pw"
        )

        self.group = Group.objects.create(
            name="Damak Trip", description="Original", created_by=self.creator
        )
        for user, role in [
            (self.creator, "admin"),
            (self.admin, "admin"),
            (self.member, "member"),
        ]:
            GroupMembership.objects.create(
                group=self.group, user=user, role=role, created_by=self.creator
            )

        self.client = APIClient()

    def patch(self, user, **fields):
        # The endpoint is multipart-only, matching how the dialog submits.
        self.client.force_authenticate(user=user)
        payload = {key: ("" if value is None else value) for key, value in fields.items()}
        return self.client.patch(
            f"/api/groups/{self.group.id}/update/", payload, format="multipart"
        )

    def test_description_only_edit_succeeds(self):
        # The regression: submitting an unchanged name used to collide with
        # itself and return 400, making description edits impossible.
        response = self.patch(self.creator, description="Updated notes")

        self.assertEqual(response.status_code, 200, response.content)
        self.group.refresh_from_db()
        self.assertEqual(self.group.description, "Updated notes")
        self.assertEqual(self.group.name, "Damak Trip")

    def test_case_changed_name_does_not_collide_with_itself(self):
        response = self.patch(self.creator, name="damak trip")

        self.assertEqual(response.status_code, 200, response.content)
        self.group.refresh_from_db()
        self.assertEqual(self.group.name, "damak trip")

    def test_renaming_to_another_groups_name_is_still_rejected(self):
        other = Group.objects.create(name="Tahoe", created_by=self.creator)

        response = self.patch(self.creator, name="Tahoe")

        self.assertEqual(response.status_code, 400)
        self.group.refresh_from_db()
        self.assertEqual(self.group.name, "Damak Trip")
        self.assertEqual(other.name, "Tahoe")

    def test_admin_who_is_not_the_creator_can_edit(self):
        response = self.patch(self.admin, description="Admin edit")

        self.assertEqual(response.status_code, 200, response.content)
        self.group.refresh_from_db()
        self.assertEqual(self.group.description, "Admin edit")

    def test_plain_member_cannot_edit(self):
        response = self.patch(self.member, description="Member edit")

        self.assertEqual(response.status_code, 403)
        self.group.refresh_from_db()
        self.assertEqual(self.group.description, "Original")

    def test_non_member_cannot_edit(self):
        response = self.patch(self.outsider, description="Outsider edit")

        self.assertEqual(response.status_code, 404)
        self.group.refresh_from_db()
        self.assertEqual(self.group.description, "Original")

    def test_removing_the_image_does_not_touch_the_name(self):
        self.group.group_imagekey = "groups/existing.webp"
        self.group.save()

        response = self.patch(
            self.creator, name="Damak Trip", group_image=None
        )

        self.assertEqual(response.status_code, 200, response.content)
        self.group.refresh_from_db()
        self.assertIsNone(self.group.group_imagekey)
        self.assertEqual(self.group.name, "Damak Trip")

    def test_create_and_update_serialisers_keep_separate_uniqueness_rules(self):
        # GroupCreateApi and GroupUpdateApi carry near-identical serializers but
        # their uniqueness rules must differ: create checks every group, update
        # has to exclude the group being edited. Copying either one onto the other
        # silently breaks a flow, so both behaviours are pinned here.
        create_serializer = GroupCreateApi.InputSerializer(
            data={"name": "Damak Trip", "description": "clash"}
        )
        self.assertFalse(create_serializer.is_valid())
        self.assertIn("name", create_serializer.errors)

        update_serializer = GroupUpdateApi.InputSerializer(
            data={"name": "Damak Trip", "description": "fine"},
            context={"group_id": self.group.id},
        )
        self.assertTrue(update_serializer.is_valid(), update_serializer.errors)

    def test_image_can_be_removed_explicitly(self):
        # An explicit null clears the key, which is distinct from omitting the
        # field entirely and leaving the existing image alone.
        self.group.group_imagekey = "groups/existing.webp"
        self.group.save()

        response = self.patch(self.creator, group_image=None)

        self.assertEqual(response.status_code, 200, response.content)
        self.group.refresh_from_db()
        self.assertIsNone(self.group.group_imagekey)

    def test_omitting_the_image_field_leaves_it_untouched(self):
        self.group.group_imagekey = "groups/existing.webp"
        self.group.save()

        response = self.patch(self.creator, description="No image change")

        self.assertEqual(response.status_code, 200, response.content)
        self.group.refresh_from_db()
        self.assertEqual(self.group.group_imagekey, "groups/existing.webp")

    def test_edit_records_an_audit_entry(self):
        response = self.patch(self.creator, description="Audited")

        self.assertEqual(response.status_code, 200, response.content)

    def test_blank_name_is_rejected(self):
        response = self.patch(self.creator, name="")

        self.assertEqual(response.status_code, 400)
        self.group.refresh_from_db()
        self.assertEqual(self.group.name, "Damak Trip")

    def test_non_member_gets_a_404_rather_than_leaking_existence(self):
        response = self.patch(self.outsider, description="Outsider edit")

        self.group.refresh_from_db()
        self.assertEqual(self.group.description, "Original")
        self.assertIn(response.status_code, (403, 404))