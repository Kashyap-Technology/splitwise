from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.contrib.auth.tokens import default_token_generator
from django.core import mail
from django.test import TestCase, override_settings
from django.utils.http import int_to_base36
from rest_framework.permissions import AllowAny
from rest_framework.test import APIClient

from apps.users.views import UserPasswordResetConfirmApi

User = get_user_model()


@override_settings(
    EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend",
    FRONTEND_URL="https://app.example.com",
)
# FRONTEND_URL is derived from ALLOWED_HOSTS at import time, so it is overridden
# here rather than configured through a separate environment variable.
class PasswordForgotTests(TestCase):
    """POST /api/users/password/forgot/"""

    def setUp(self):
        self.client = APIClient()
        self.url = "/api/users/password/forgot/"
        self.user = User.objects.create_user(
            name="Samyam", email="samyam@example.com", password="oldpassword123"
        )

    def test_sends_email_with_a_usable_link(self):
        with self.captureOnCommitCallbacks(execute=True):
            response = self.client.post(
                self.url, {"email": "samyam@example.com"}, format="json"
            )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(mail.outbox), 1)

        msg = mail.outbox[0]
        self.assertEqual(msg.to, ["samyam@example.com"])

        body = msg.body
        # Both parameters the confirm endpoint needs must be in the link.
        self.assertIn(f"uid={int_to_base36(self.user.pk)}", body)
        self.assertIn("token=", body)
        self.assertIn("https://app.example.com/reset-password?", body)

        # And the token in the email has to actually verify, otherwise the
        # whole flow is theatre.
        token = default_token_generator.make_token(self.user)
        self.assertIn(token, body)
        self.assertTrue(default_token_generator.check_token(self.user, token))

    def test_email_has_html_alternative(self):
        self.client.post(self.url, {"email": "samyam@example.com"}, format="json")

        self.assertEqual(len(mail.outbox[0].alternatives), 1)
        content, mimetype = mail.outbox[0].alternatives[0]
        self.assertEqual(mimetype, "text/html")
        self.assertIn("Choose a new password", content)

    def test_unknown_email_gives_the_same_answer_as_a_known_one(self):
        """No account enumeration: a stranger must not learn which addresses
        are registered from the response."""
        known = self.client.post(
            self.url, {"email": "samyam@example.com"}, format="json"
        )
        mail.outbox.clear()

        unknown = self.client.post(
            self.url, {"email": "nobody@example.com"}, format="json"
        )

        self.assertEqual(known.status_code, unknown.status_code)
        self.assertEqual(known.data["message"], unknown.data["message"])
        self.assertEqual(len(mail.outbox), 0)

    def test_case_insensitive_match_still_finds_the_account(self):
        self.client.post(
            self.url, {"email": "SAMYAM@EXAMPLE.COM"}, format="json"
        )

        self.assertEqual(len(mail.outbox), 1)

    def test_malformed_email_is_a_validation_error(self):
        response = self.client.post(self.url, {"email": "not-an-email"}, format="json")

        self.assertEqual(response.status_code, 400)

    def test_smtp_failure_does_not_leak_or_500(self):
        with patch(
            "apps.users.views.send_password_reset_email",
            side_effect=Exception("smtp down"),
        ):
            response = self.client.post(
                self.url, {"email": "samyam@example.com"}, format="json"
            )

        # Answers as though it worked, so an outage cannot be used to probe
        # which addresses exist.
        self.assertEqual(response.status_code, 200)


@override_settings(EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend")
class PasswordResetConfirmTests(TestCase):
    """POST /api/users/password/reset/confirm/"""

    def setUp(self):
        self.client = APIClient()
        self.url = "/api/users/password/reset/confirm/"
        self.user = User.objects.create_user(
            name="Samyam", email="samyam@example.com", password="oldpassword123"
        )

    def payload(self, **overrides):
        token = default_token_generator.make_token(self.user)
        body = {
            "uid": int_to_base36(self.user.pk),
            "token": token,
            "new_password": "brandnewpass456",
            "confirm_password": "brandnewpass456",
        }
        body.update(overrides)
        return body

    def test_valid_token_sets_the_new_password(self):
        response = self.client.post(self.url, self.payload(), format="json")

        self.assertEqual(response.status_code, 200)
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password("brandnewpass456"))
        self.assertFalse(self.user.check_password("oldpassword123"))

    def test_token_cannot_be_replayed(self):
        """The HMAC covers the password hash, so re-salting on change
        invalidates the link that was just used."""
        body = self.payload()

        first = self.client.post(self.url, body, format="json")
        second = self.client.post(self.url, body, format="json")

        self.assertEqual(first.status_code, 200)
        self.assertEqual(second.status_code, 400)
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password("brandnewpass456"))

    @override_settings(PASSWORD_RESET_TIMEOUT=-1)
    def test_expired_token_is_refused(self):
        response = self.client.post(self.url, self.payload(), format="json")

        self.assertEqual(response.status_code, 400)
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password("oldpassword123"))

    def test_garbage_token_is_refused(self):
        response = self.client.post(
            self.url, self.payload(token="not-a-token"), format="json"
        )

        self.assertEqual(response.status_code, 400)
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password("oldpassword123"))

    def test_token_for_another_user_is_refused(self):
        """A valid token paired with someone else's uid must not work. This is
        the case the uid-is-only-a-hint design has to get right."""
        other = User.objects.create_user(
            name="Pawan", email="pawan@example.com", password="pawanpass789"
        )

        response = self.client.post(
            self.url, self.payload(uid=int_to_base36(other.pk)), format="json"
        )

        self.assertEqual(response.status_code, 400)
        other.refresh_from_db()
        self.assertTrue(other.check_password("pawanpass789"))

    def test_unknown_uid_is_refused_without_a_500(self):
        response = self.client.post(self.url, self.payload(uid="zzzz999"), format="json")

        self.assertEqual(response.status_code, 400)

    def test_non_base36_uid_is_refused_without_a_500(self):
        response = self.client.post(self.url, self.payload(uid="!!"), format="json")

        self.assertEqual(response.status_code, 400)

    def test_mismatched_confirmation_is_rejected(self):
        response = self.client.post(
            self.url, self.payload(confirm_password="different1"), format="json"
        )

        self.assertEqual(response.status_code, 400)
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password("oldpassword123"))

    def test_weak_password_is_rejected_by_the_validator(self):
        response = self.client.post(
            self.url,
            self.payload(new_password="123", confirm_password="123"),
            format="json",
        )

        self.assertEqual(response.status_code, 400)
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password("oldpassword123"))

    def test_does_not_require_authentication(self):
        """The whole point: the user cannot sign in, so this cannot need a
        session. Sent with no credentials whatsoever."""
        response = self.client.post(self.url, self.payload(), format="json")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.wsgi_request.user.is_authenticated, False)

    def test_view_allows_anyone_explicitly(self):
        """Guards the wiring, so a later `permission_classes` edit cannot
        quietly make this unreachable for the people who need it."""
        view = UserPasswordResetConfirmApi.as_view()

        self.assertIn(AllowAny, view.cls.permission_classes)
        self.assertEqual(view.cls.authentication_classes, [])
