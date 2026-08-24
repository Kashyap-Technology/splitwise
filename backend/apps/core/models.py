from django.conf import settings
from django.db import models


# Timestamped Model
class TimeStampedModel(models.Model):
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True


# Audit Mode
class AuditModel(TimeStampedModel):
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="%(class)s_created",
    )

    updated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="%(class)s_updated",
    )

    class Meta:
        abstract = True


class AuditLog(TimeStampedModel):
    class AuditAction(models.TextChoices):
        CREATE = "create", "Create"
        UPDATE = "update", "Update"
        DELETE = "delete", "Delete"
        LOGIN = "login", "Login"
        LOGOUT = "logout", "Logout"
        INVITED = "invited", "Invited"
        ACCEPTED = "accepted", "Accepted"
        PASSWORD_REST = "password_reset", "Password Reset"
        REMOVE = "remove", "Remove"
        LEAVE = "leave", "Leave"

    class ModelName(models.TextChoices):
        USER = "user", "User"
        GROUP = "group", "Group"
        GROUP_MEMBERSHIP = "group_membership", "Group Membership"
        GROUP_INVITATION = "group_invitation", "Group Invitation"
        CATEGORY = "category", "Category"
        EXPENSE = "expense", "Expense"
        EXPENSE_PAYER = "expense_payer", "Expense Payer"
        EXPENSE_PARTICIPANT = "expense_participant", "Expense Participant"
        SETTLEMENT = "settlement", "Settlement"

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="audit_logs",
    )

    action = models.CharField(max_length=20, choices=AuditAction.choices)

    model_name = models.CharField(max_length=50, choices=ModelName.choices)

    message = models.CharField(
        max_length=255,
        blank=True,
    )

    class Meta:
        db_table = "audit_log"
