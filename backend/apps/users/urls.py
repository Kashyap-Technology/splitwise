from django.urls import path

from apps.users.views import (
    UserCreateAPi,
    UserDeleteApi,
    UserExportApi,
    UserListApi,
    UserLoginAPi,
    UserLogoutApi,
    UserMeApi,
    UserPasswordResetApi,
    UserSearchApi,
    UserUpdateApi,
)

urlpatterns = [
    path("register/", UserCreateAPi.as_view(), name="register"),
    path("update/", UserUpdateApi.as_view(), name="update"),
    path("delete/", UserDeleteApi.as_view(), name="delete"),
    path("login/", UserLoginAPi.as_view(), name="login"),
    path("logout/", UserLogoutApi.as_view(), name="logout"),
    path("password/reset/", UserPasswordResetApi.as_view(), name="password-reset"),
    path("list/", UserListApi.as_view(), name="user-list"),
    path("search/", UserSearchApi.as_view(), name="user-search"),
    path("me/", UserMeApi.as_view(), name="me"),
    path("export/", UserExportApi.as_view(), name="export"),
]
