from django.contrib.auth.models import (
    AbstractBaseUser,
    BaseUserManager,
    PermissionsMixin,
)
from django.db import models

from apps.core.models import TimeStampedModel


# Custom User Manager
class UserManager(BaseUserManager):
    def create_user(self, name, email, password, phone=None, **extra_fields):
        """
        Create and save user.
        """
        if not email:
            raise ValueError("Users must have an email.")

        if not name:
            raise ValueError("Name is required.")

        user = self.model(
            name=name, email=self.normalize_email(email), phone=phone, **extra_fields
        )

        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, name, email, password, phone=None, **extra_fields):
        """
        Create and save superuser.
        """

        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)

        if extra_fields.get("is_staff") is not True:
            raise ValueError("Superuser must have is_staff=True.")

        if extra_fields.get("is_superuser") is not True:
            raise ValueError("Superuser must have is_superuser=True.")

        user = self.create_user(
            name=name, email=email, password=password, phone=phone, **extra_fields
        )

        return user


# Custom User Model
class User(AbstractBaseUser, PermissionsMixin, TimeStampedModel):
    name = models.CharField(max_length=255)
    email = models.EmailField(
        unique=True,
        max_length=255,
    )
    phone = models.CharField(max_length=12, blank=True, null=True)
    profile_imagekey = models.CharField(
        max_length=500,
        null=True,
        blank=True,
    )

    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)
    is_superuser = models.BooleanField(default=False)

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = ["name"]

    objects = UserManager()

    def __str__(self):
        return self.email

    class Meta:
        db_table = "users"
