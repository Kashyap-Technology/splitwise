from django.conf import settings
from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.views import APIView
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.tokens import RefreshToken

from apps.core.api.responses import api_success
from apps.core.exceptions import ApplicationError
from apps.core.services import set_jwt_cookies


class TokenRefreshApi(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]

    def post(self, request):
        refresh_token = request.COOKIES.get(settings.SIMPLE_JWT["AUTH_COOKIE_REFRESH"])

        if refresh_token is None:
            raise ApplicationError("Refresh Token is Missing")

        try:
            refresh = RefreshToken(refresh_token)
        except TokenError:
            raise ApplicationError("Invalid or Expired Refresh Token")

        new_access_token = str(refresh.access_token)

        response = api_success(
            data=None, message="Token Refreshed.", status_code=status.HTTP_200_OK
        )

        return set_jwt_cookies(response=response, access_token=new_access_token)
