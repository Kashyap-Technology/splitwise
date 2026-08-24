from django.urls import path

from apps.core.api.refresh_token import TokenRefreshApi

urlpatterns = [path("refresh/token/", TokenRefreshApi.as_view(), name="refresh_token")]
