import uuid

from django.conf import settings
from django.db import models

from apps.core.models import AuditModel


class Group(AuditModel):
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    group_imagekey = models.CharField(
        max_length=500,
        null=True,
        blank=True,
    )

    members = models.ManyToManyField(
        settings.AUTH_USER_MODEL,
        through="GroupMembership",
        through_fields=("group", "user"),
        related_name="user_groups",
    )

    class Meta:
        db_table = "groups"
        ordering = ["name"]

    def __str__(self):
        return self.name


class GroupMembership(AuditModel):
    class Role(models.TextChoices):
        ADMIN = "admin", "Admin"
        MEMBER = "member", "Member"

    group = models.ForeignKey(
        Group,
        on_delete=models.CASCADE,
        related_name="group_memberships",
    )

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="group_memberships",
    )

    role = models.CharField(
        max_length=20,
        choices=Role.choices,
        default=Role.MEMBER,
    )

    class Meta:
        db_table = "group_members"
        ordering = ["group", "user"]
        constraints = [
            models.UniqueConstraint(
                fields=["group", "user"],
                name="unique_users_per_group",
            )
        ]

    def __str__(self):
        return f"{self.user} belongs to group {self.group}."


class GroupInvitation(AuditModel):
    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        ACCEPTED = "accepted", "Accepted"

    group = models.ForeignKey(
        Group, on_delete=models.CASCADE, related_name="group_invitations"
    )

    sender = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="sent_group_invitations",
    )

    receiver = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="received_group_invitations",
    )

    status = models.CharField(
        max_length=20, choices=Status.choices, default=Status.PENDING
    )

    token = models.UUIDField(
        default=uuid.uuid4,
        unique=True,
        editable=False,
    )

    class Meta:
        db_table = "group_invitations"
