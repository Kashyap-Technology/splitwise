from django.conf import settings
from django.core.mail import EmailMultiAlternatives
from decouple import config, Csv


def send_group_invitation_email(*, request, invitation):
    allowed_hosts = config("ALLOWED_HOSTS", cast=Csv())
    frontend_url = allowed_hosts[0] if allowed_hosts else ""
    accept_url = f"{frontend_url.rstrip('/')}/invite/{invitation.token}"

    subject = f"You've been invited to join {invitation.group.name} on Splitsy"

    text_content = (
        f"Hello {invitation.receiver.name},\n\n"
        f"{invitation.sender.name} has invited you to join the group "
        f"'{invitation.group.name}' on Splitsy.\n\n"
        f"Click the link below to accept the invitation:\n"
        f"{accept_url}\n\n"
        f"— The Splitsy Team"
    )

    html_content = f"""
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Group Invitation</title>
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
                                    <span style="font-size:22px;font-weight:700;color:#2563eb;letter-spacing:-0.5px;">Splitsy</span>
                                </div>
                            </td>
                        </tr>
                        <tr>
                            <td style="background-color:#ffffff;border-radius:16px;padding:40px 32px;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
                                <div style="text-align:center;margin-bottom:24px;">
                                    <div style="width:56px;height:56px;border-radius:50%;background-color:#eff6ff;display:inline-flex;align-items:center;justify-content:center;">
                                        <span style="font-size:24px;">👥</span>
                                    </div>
                                </div>
                                <h1 style="margin:0 0 8px 0;font-size:24px;font-weight:700;color:#0f172a;text-align:center;">
                                    You're Invited!
                                </h1>
                                <p style="margin:0 0 24px 0;font-size:15px;color:#64748b;text-align:center;line-height:1.5;">
                                    {invitation.sender.name} has invited you to join a group on Splitsy.
                                </p>
                                <div style="background-color:#f8fafc;border-radius:12px;padding:20px;margin-bottom:28px;">
                                    <div style="display:flex;align-items:center;gap:12px;">
                                        <div style="width:40px;height:40px;border-radius:10px;background-color:#e0e7ff;display:flex;align-items:center;justify-content:center;flex-shrink:0;">
                                            <span style="font-size:18px;">🏠</span>
                                        </div>
                                        <div>
                                            <div style="font-size:16px;font-weight:600;color:#0f172a;">{invitation.group.name}</div>
                                            <div style="font-size:13px;color:#64748b;margin-top:2px;">Group Invitation</div>
                                        </div>
                                    </div>
                                </div>
                                <div style="text-align:center;margin-bottom:20px;">
                                    <a href="{accept_url}" style="display:inline-block;background-color:#2563eb;color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:10px;font-size:15px;font-weight:600;letter-spacing:0.2px;">
                                        Accept Invitation
                                    </a>
                                </div>
                                <p style="margin:0;font-size:13px;color:#94a3b8;text-align:center;line-height:1.5;">
                                    Or copy and paste this link:<br>
                                    <a href="{accept_url}" style="color:#2563eb;text-decoration:underline;word-break:break-all;">{accept_url}</a>
                                </p>
                            </td>
                        </tr>
                        <tr>
                            <td align="center" style="padding:24px 0 0 0;">
                                <p style="margin:0;font-size:12px;color:#94a3b8;line-height:1.6;">
                                    Splitsy — Split expenses with friends, effortlessly.<br>
                                    You received this email because someone invited you to a group.
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
        to=[invitation.receiver.email],
    )
    msg.attach_alternative(html_content, "text/html")
    msg.send()
