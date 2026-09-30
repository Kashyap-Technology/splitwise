from django.conf import settings
from django.core.mail import send_mail
from decouple import config

def send_group_invitation_email(*, request, invitation):
    accept_url = (
        f"{config('BASE_URL').rstrip('/')}/api/groups/"
        f"{invitation.token}/invitation/accept/"
    )

    send_mail(
        subject=f"You have been invited to join {invitation.group.name}",
        message=(
            f"Hello {invitation.receiver.name},\n"
            f"{invitation.sender.name} invited you to join the group "
            f"{invitation.group.name}.\n"
            f"Accept the invitation here:\n"
            f"{accept_url}\n"
        ),
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[invitation.receiver.email],
    )
