from django.urls import path

from apps.users.views import (
    UserCreateAPi,
    UserDeleteApi,
    UserExportApi,
    UserListApi,
    UserLoginAPi,
    UserLogoutApi,
    UserMeApi,
    UserPasswordChangeApi,
    UserPasswordForgotApi,
    UserPasswordResetConfirmApi,
    UserSearchApi,
    UserUpdateApi,
)

urlpatterns = [
    path("register/", UserCreateAPi.as_view(), name="register"),
    path("update/", UserUpdateApi.as_view(), name="update"),
    path("delete/", UserDeleteApi.as_view(), name="delete"),
    path("login/", UserLoginAPi.as_view(), name="login"),
    path("logout/", UserLogoutApi.as_view(), name="logout"),
    # Signed-in change: proves ownership with the current password.
    path(
        "password/change/", UserPasswordChangeApi.as_view(), name="password-change"
    ),
    # Signed-out reset: request a link, then redeem it.
    path(
        "password/forgot/", UserPasswordForgotApi.as_view(), name="password-forgot"
    ),
    path(
        "password/reset/confirm/",
        UserPasswordResetConfirmApi.as_view(),
        name="password-reset-confirm",
    ),
    path("list/", UserListApi.as_view(), name="user-list"),
    path("search/", UserSearchApi.as_view(), name="user-search"),
    path("me/", UserMeApi.as_view(), name="me"),
    path("export/", UserExportApi.as_view(), name="export"),
]
