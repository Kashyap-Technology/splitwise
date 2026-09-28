import logging

from django.conf import settings
from django.contrib.auth import authenticate, get_user_model
from django.db import transaction
from django.utils import timezone
from rest_framework_simplejwt.tokens import RefreshToken

from apps.core.models import AuditLog
from apps.core.services import _delete_from_storj, _upload_to_storj, create_audit_log
from apps.users.exceptions import InvalidCredentialsError

User = get_user_model()


logger = logging.getLogger(__name__)


def _update_user_in_db(*, user, name, phone, image_key=None):
    user.name = name
    user.phone = phone
    user.profile_imagekey = image_key

    user.full_clean()
    user.save()

    create_audit_log(
        user=user,
        action=AuditLog.AuditAction.UPDATE,
        model_name=AuditLog.ModelName.USER,
        message="User updated successfully",
    )

    return user


@transaction.atomic
def create_user(*, name, email, phone, password, profile_image):
    image_key = _upload_to_storj(folder="profiles", image=profile_image)

    user = User(name=name, email=email, phone=phone, profile_imagekey=image_key)
    user.set_password(password)
    user.full_clean()
    user.save()

    create_audit_log(
        user=user,
        action=AuditLog.AuditAction.CREATE,
        model_name=AuditLog.ModelName.USER,
        message="User registed successfully",
    )

    return user


# og update user block
# @transaction.atomic
# def update_user(*, user, name, phone, profile_image):
#     if not profile_image:
#         return _update_user_in_db(
#             user=user,
#             name=name,
#             phone=phone,
#             image_key=user.profile_imagekey,
#         )

#     if user.profile_imagekey:
#         _delete_from_storj(image_key=user.profile_imagekey)

#     image_key = _upload_to_storj(folder="profiles", image=profile_image)

#     return _update_user_in_db(
#         user=user,
#         name=name,
#         phone=phone,
#         image_key=image_key,
#     )


# Sentinel value to distinguish between "field not provided" and "field set to None/null"
UNSET = object()

def update_user(
    *,
    user,
    name=UNSET,
    phone=UNSET,
    profile_image=UNSET,
):
    # 1. Update text fields if provided
    if name is not UNSET:
        user.name = name

    if phone is not UNSET:
        user.phone = phone

    # 2. Handle profile image logic outside atomic block to avoid blocking DB locks
    if profile_image is not UNSET:
        old_image_key = user.profile_imagekey

        if profile_image is None:
            # User explicitly sent null -> clear image
            user.profile_imagekey = None
            if old_image_key:
                _delete_from_storj(image_key=old_image_key)
        else:
            # User uploaded a new file -> upload first, then update key
            new_image_key = _upload_to_storj(folder="profiles", image=profile_image)
            user.profile_imagekey = new_image_key

            # Clean up old file from Storj after successful upload
            if old_image_key:
                _delete_from_storj(image_key=old_image_key)

    # 3. Save database changes atomically
    with transaction.atomic():
        user.save()

    return user


@transaction.atomic
def delete_user(*, user):
    if user.profile_imagekey:
        _delete_from_storj(image_key=user.profile_imagekey)

    create_audit_log(
        user=user,
        model_name=AuditLog.ModelName.USER,
        action=AuditLog.AuditAction.DELETE,
        message="User deleted.",
    )

    user.delete()


@transaction.atomic
def login_user(*, email, password):
    user = authenticate(email=email, password=password)

    if user is None:
        raise InvalidCredentialsError()

    user.last_login = timezone.now()
    user.save(update_fields=["last_login"])

    refresh = RefreshToken.for_user(user)

    create_audit_log(
        user=user,
        action=AuditLog.AuditAction.LOGIN,
        model_name=AuditLog.ModelName.USER,
        message="User login successfully",
    )

    return {"user": user, "refresh": str(refresh), "access": str(refresh.access_token)}


def set_jwt_cookies(response, access_token, refresh_token):
    jwt_settings = settings.SIMPLE_JWT

    # set access token
    response.set_cookie(
        key=jwt_settings["AUTH_COOKIE"],
        value=access_token,
        secure=jwt_settings["AUTH_COOKIE_SECURE"],
        httponly=jwt_settings["AUTH_COOKIE_HTTP_ONLY"],
        samesite=jwt_settings["AUTH_COOKIE_SAMESITE"],
    )

    # set refresth token
    response.set_cookie(
        key=jwt_settings["AUTH_COOKIE_REFRESH"],
        value=refresh_token,
        secure=jwt_settings["AUTH_COOKIE_SECURE"],
        httponly=jwt_settings["AUTH_COOKIE_HTTP_ONLY"],
        samesite=jwt_settings["AUTH_COOKIE_SAMESITE"],
    )

    return response


@transaction.atomic
def reset_user_password(*, user, new_password):
    user.set_password(new_password)
    user.save(update_fields=["password"])

    create_audit_log(
        user=user,
        action=AuditLog.AuditAction.PASSWORD_REST,
        model_name=AuditLog.ModelName.USER,
        message="Password Changed",
    )
    return user
