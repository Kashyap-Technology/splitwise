from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.test import TestCase, override_settings

from apps.core.services import get_storj_public_url
from apps.users.selectors import search_users

User = get_user_model()


class UserSearchTests(TestCase):
    def test_search_users_by_name_contains_query(self):
        User.objects.create_user(
            name="Alice Johnson",
            email="alice@example.com",
            password="secret123",
        )
        User.objects.create_user(
            name="Bob Smith",
            email="bob@example.com",
            password="secret123",
        )

        users = list(search_users(query="alice"))

        self.assertEqual(len(users), 1)
        self.assertEqual(users[0].name, "Alice Johnson")
        self.assertEqual(users[0].email, "alice@example.com")

    @override_settings(
        STORJ_ENDPOINT="https://gateway.storjshare.io",
        STORJ_BUCKET_NAME="splitwise",
    )
    @patch("apps.core.services.boto3.client")
    def test_get_storj_public_url_uses_signed_download_url(self, mock_client):
        mock_client.return_value.generate_presigned_url.return_value = (
            "https://gateway.storjshare.io/splitwise/profiles/test.png?X-Amz-Algorithm=AWS4-HMAC-SHA256"
        )

        url = get_storj_public_url(image_key="profiles/test.png")

        self.assertEqual(
            url,
            "https://gateway.storjshare.io/splitwise/profiles/test.png?X-Amz-Algorithm=AWS4-HMAC-SHA256",
        )
        mock_client.return_value.generate_presigned_url.assert_called_once_with(
            ClientMethod="get_object",
            Params={"Bucket": "splitwise", "Key": "profiles/test.png"},
            ExpiresIn=3600,
            HttpMethod="GET",
        )
