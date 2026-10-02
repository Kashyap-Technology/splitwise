import re
import urllib.parse
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.conf import settings
from django.contrib.auth.tokens import default_token_generator
from django.core import mail
from django.test import TestCase, override_settings
from django.utils.http import int_to_base36
from rest_framework.permissions import AllowAny
from rest_framework.test import APIClient

from apps.users.email import send_password_reset_email
from apps.users.views import UserPasswordResetConfirmApi

User = get_user_model()


def _token_from_link(body):
    """Pull the token back out of an emailed reset link.

    Handles both link shapes: the current single `reset=<uid>.<token>`
    parameter, and older `?uid=..&token=..` links.
    """
    combined = re.search(r"[?&]reset=([A-Za-z0-9]+)\.([A-Za-z0-9]+-[A-Za-z0-9]+)", body)
    if combined:
        return combined.group(2)

    legacy = re.search(r"[?&]token=([A-Za-z0-9]+-[A-Za-z0-9]+)", body)
    return legacy.group(1) if legacy else None


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
        self.assertIn("https://app.example.com/reset-password?", body)
        self.assertIn("?reset=", body)

        # The token has to be read back out of the email and verified. It
        # cannot be compared against one minted here: Django's token embeds a
        # second-resolution timestamp, so a locally generated token differs
        # from the emailed one whenever a second ticks between the two calls.
        token = _token_from_link(body)
        self.assertIsNotNone(token, f"no token found in: {body!r}")
        self.assertTrue(default_token_generator.check_token(self.user, token))

    def test_link_keeps_a_literal_ampersand(self):
        """The bug this guards: escaping the URL turns its `&` into `&amp;`,
        and mail clients that pass that through un-decoded deliver a link with
        no token at all. The page then reports a missing token for a link that
        looks fine."""
        self.client.post(self.url, {"email": "samyam@example.com"}, format="json")

        html = mail.outbox[0].alternatives[0][0]
        href = re.search(r'<a href="([^"]*)"[^>]*>\s*Choose a new password', html)
        self.assertIsNotNone(href, "reset button not found in the HTML part")

        url = href.group(1)
        self.assertNotIn("&amp;", url, "query separator was HTML-escaped")
        self.assertIn("?reset=", url)

        # One parameter. There must be no `&` in the link at all: a rewriting
        # mail client is what ate `uid` out of the previous two-parameter form,
        # and it cannot mangle a query with nothing to split.
        query = url.split("?", 1)[1]
        self.assertNotIn("&", query, "link still has more than one parameter")

        # And the single credential must round-trip back to uid + token.
        credential = urllib.parse.parse_qs(query)["reset"][0]
        uid, _, token = credential.partition(".")
        self.assertEqual(uid, int_to_base36(self.user.pk))
        self.assertTrue(
            default_token_generator.check_token(self.user, token),
            "credential did not split back into a valid uid and token",
        )

    def test_url_is_unescaped_but_the_name_is_still_escaped(self):
        """Name is free text and must be escaped; the URL is machine-built and
        must not be. Confusing the two is what caused the broken link."""
        user = User.objects.create_user(
            name="<b>Sam</b>", email="markup@example.com", password="oldpassword123"
        )
        token = default_token_generator.make_token(user)

        with override_settings(
            EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend"
        ):
            send_password_reset_email(user=user, token=token)

        html = mail.outbox[0].alternatives[0][0]
        self.assertNotIn("<b>Sam</b>", html)
        self.assertIn("&lt;b&gt;Sam&lt;/b&gt;", html)

        href = re.search(r'href="([^"]*)"[^>]*>\s*Choose a new password', html)
        self.assertNotIn("&amp;", href.group(1))
        self.assertNotIn("<", href.group(1))

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


class FrontendUrlFromAllowedHostsTests(TestCase):
    """The reset link is built from ALLOWED_HOSTS, so its correctness depends on
    a string that lives in the deployment environment and nobody edits in the
    repo. These pin the real production value and the shapes it can take."""

    # The value actually set in the deployed environment.
    PROD = "https://splitwise-ten-ebon.vercel.app,splitwise-3m6a.onrender.com"

    def build(self, raw):
        """Resolve the helper against a raw ALLOWED_HOSTS string.

        The helper reads the module-level ALLOWED_HOSTS in config.settings.base,
        not django.conf.settings, so that is what has to be patched.
        """
        from config.settings import base

        parsed = [h.strip() for h in raw.split(",") if h.strip()]
        with patch.object(base, "ALLOWED_HOSTS", parsed):
            return base._frontend_url_from_allowed_hosts()

    def test_production_value_resolves_to_the_frontend(self):
        url = self.build(self.PROD)

        self.assertEqual(url, "https://splitwise-ten-ebon.vercel.app")
        self.assertTrue(
            url.startswith("https://"), "the emailed link must be https in production"
        )

    def test_production_value_never_leaks_the_api_host(self):
        """The reset link must land on a page with a form, not on the API."""
        self.assertNotIn("onrender.com", self.build(self.PROD))

    def test_scheme_is_added_when_the_entry_has_none(self):
        self.assertEqual(
            self.build("splitwise-ten-ebon.vercel.app"),
            "https://splitwise-ten-ebon.vercel.app",
        )

    def test_loopback_gets_the_vite_dev_port(self):
        # Each keeps its own hostname; only the port is added.
        for raw, expected in (
            ("localhost", "http://localhost:3000"),
            ("localhost,127.0.0.1", "http://localhost:3000"),
            ("127.0.0.1", "http://127.0.0.1:3000"),
        ):
            with self.subTest(raw=raw):
                self.assertEqual(self.build(raw), expected)

    def test_existing_port_is_not_duplicated(self):
        self.assertEqual(self.build("localhost:5173"), "http://localhost:5173")

    def test_blank_and_empty_entries_are_skipped(self):
        self.assertEqual(self.build(" , ,splitwise-ten-ebon.vercel.app"),
                         "https://splitwise-ten-ebon.vercel.app")

    def test_falls_back_when_nothing_is_configured(self):
        self.assertEqual(self.build(""), "http://localhost:3000")

    def test_emailed_link_is_built_from_this_value_end_to_end(self):
        """Ties the helper to the email, so the two cannot drift apart."""
        user = User.objects.create_user(
            name="Sam", email="samyam@example.com", password="oldpassword123"
        )
        token = default_token_generator.make_token(user)

        with override_settings(
            EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend",
            FRONTEND_URL=self.build(self.PROD),
        ):
            send_password_reset_email(user=user, token=token)

        body = mail.outbox[0].body
        self.assertIn(
            "https://splitwise-ten-ebon.vercel.app/reset-password?reset="
            f"{int_to_base36(user.pk)}.{token}",
            body,
        )
