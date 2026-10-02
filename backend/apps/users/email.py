from django.conf import settings
from django.core.mail import EmailMultiAlternatives
from django.utils.html import escape
from django.utils.http import int_to_base36, urlencode


def send_password_reset_email(*, user, token):
    """Email a one-time password-reset link to `user`.

    The link points at the SPA rather than an API path, because the user has to
    land on a form to choose a new password and the token has to survive the
    page load in the query string.

    `token` must come from Django's `default_token_generator`. It is an HMAC
    over the user's primary key, email, last login and current password hash, so
    it stops verifying the instant the password changes -- no server-side row
    to delete and no second source of truth to keep in sync.
    """
    # One query parameter, not two.
    #
    # The link used to be `?uid=<b36>&token=<token>`. Observed arriving in the
    # browser as `?uid=&token=dftelv-...` -- the first parameter's value eaten,
    # the last one intact. `int_to_base36` never returns an empty string for any
    # pk, so the backend did not send it that way; something between the mail
    # server and the browser rewrote the URL and mishandled the `&`.
    #
    # Nothing can split a URL that has nothing to split. `<uid>.<token>` is a
    # single opaque value: no `&`, so no second parameter to lose, and both
    # halves are base36/hex so `.` cannot occur inside either one.
    credential = f"{int_to_base36(user.pk)}.{token}"
    reset_url = (
        f"{settings.FRONTEND_URL.rstrip('/')}/reset-password"
        f"?{urlencode({'reset': credential})}"
    )

    # `name` is user-supplied free text and genuinely needs escaping. The URL
    # must not be: `escape()` rewrites `&` to `&amp;`, and mail clients that
    # pass that through un-decoded deliver a mangled link. There is nothing to
    # escape here anyway -- the credential is base36, hex and one hyphen.
    name = escape(user.name)
    safe_url = reset_url

    # "expires in 1440 minutes" is technically right and reads like a bug.
    seconds = settings.PASSWORD_RESET_TIMEOUT
    if seconds % 86400 == 0:
        window = f"{seconds // 86400} day" + ("s" if seconds >= 172800 else "")
    elif seconds % 3600 == 0:
        window = f"{seconds // 3600} hour" + ("s" if seconds >= 7200 else "")
    else:
        minutes = seconds // 60
        window = f"{minutes} minute" + ("" if minutes == 1 else "s")

    subject = "Reset your Splitwise password"

    text_content = (
        f"Hello {user.name},\n\n"
        f"We got a request to reset the password for your Splitwise account.\n\n"
        f"Choose a new password here:\n"
        f"{reset_url}\n\n"
        f"This link expires in {window} and can only be used once.\n\n"
        f"If you did not ask for this, you can ignore this email. "
        f"Your password will not change until you use the link above.\n\n"
        f"— The Splitwise Team"
    )

    html_content = f"""
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Reset your password</title>
    </head>
    <body style="margin:0;padding:0;background-color:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
        <table role="presentation" style="width:100%;border-collapse:collapse;">
            <tr>
                <td align="center" style="padding:40px 20px;">
                    <table role="presentation" style="max-width:480px;width:100%;border-collapse:collapse;">
                        <tr>
                            <td align="center" style="padding:0 0 32px 0;">
                                <div style="display:inline-flex;align-items:center;gap:8px;">
                                    <div style="width:36px;height:36px;border-radius:10px;background-color:#2563eb;display:inline-flex;align-items:center;justify-content:center;">
                                        <span style="color:#ffffff;font-size:18px;font-weight:bold;">S</span>
                                    </div>
                                    <span style="font-size:22px;font-weight:700;color:#2563eb;letter-spacing:-0.5px;">Splitwise</span>
                                </div>
                            </td>
                        </tr>
                        <tr>
                            <td style="background-color:#ffffff;border-radius:16px;padding:40px 32px;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
                                <div style="text-align:center;margin-bottom:24px;">
                                    <div style="width:56px;height:56px;border-radius:50%;background-color:#eff6ff;display:inline-flex;align-items:center;justify-content:center;">
                                        <span style="font-size:24px;">🔑</span>
                                    </div>
                                </div>
                                <h1 style="margin:0 0 8px 0;font-size:24px;font-weight:700;color:#0f172a;text-align:center;">
                                    Reset your password
                                </h1>
                                <p style="margin:0 0 24px 0;font-size:15px;color:#64748b;text-align:center;line-height:1.5;">
                                    Hi {name}, choose a new password for your account.
                                </p>
                                <div style="text-align:center;margin-bottom:20px;">
                                    <a href="{safe_url}" style="display:inline-block;background-color:#2563eb;color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:10px;font-size:15px;font-weight:600;letter-spacing:0.2px;">
                                        Choose a new password
                                    </a>
                                </div>
                                <p style="margin:0;font-size:13px;color:#94a3b8;text-align:center;line-height:1.5;">
                                    Or copy and paste this link:<br>
                                    <a href="{safe_url}" style="color:#2563eb;text-decoration:underline;word-break:break-all;">{safe_url}</a>
                                </p>
                                <p style="margin:20px 0 0 0;font-size:12px;color:#94a3b8;text-align:center;line-height:1.5;">
                                    This link expires in {window} and works once.
                                </p>
                            </td>
                        </tr>
                        <tr>
                            <td align="center" style="padding:24px 0 0 0;">
                                <p style="margin:0;font-size:12px;color:#94a3b8;line-height:1.6;">
                                    Splitwise — Split expenses with friends, effortlessly.<br>
                                    Didn't request this? Ignore the email and your password stays as it is.
                                </p>
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
        </table>
    </body>
    </html>
    """

    msg = EmailMultiAlternatives(
        subject=subject,
        body=text_content,
        from_email=settings.DEFAULT_FROM_EMAIL,
        to=[user.email],
    )
    msg.attach_alternative(html_content, "text/html")
    msg.send()
