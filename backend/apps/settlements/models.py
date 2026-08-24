from django.conf import settings
from django.db import models

from apps.core.models import AuditModel
from apps.groups.models import Group


class Settlement(AuditModel):
    group = models.ForeignKey(
        Group, on_delete=models.CASCADE, related_name="settlements"
    )

    from_user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="settlements_payer",
    )

    to_user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="settlements_receiver",
    )

    amount = models.DecimalField(max_digits=10, decimal_places=5)

    class Meta:
        db_table = "settlements"
