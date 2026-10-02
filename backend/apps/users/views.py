import json
import logging

from django.contrib.auth.password_validation import validate_password
from django.http import HttpResponse
from rest_framework import serializers, status
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.views import APIView

from apps.core.api.responses import api_success
from apps.core.models import AuditLog
from apps.core.services import create_audit_log, get_storj_public_url
from apps.users.export import build_export
from apps.users.selectors import list_user, search_users
from apps.users.services import (
    create_user,
    delete_user,
    login_user,
    reset_user_password,
    set_jwt_cookies,
    update_user,
)

logger = logging.getLogger(__name__)


class UserCreateAPi(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]
    parser_classes = [MultiPartParser, FormParser]

    class InputSerializer(serializers.Serializer):
        email = serializers.EmailField()
        password = serializers.CharField(write_only=True)
        name = serializers.CharField()
        phone = serializers.CharField(required=False, allow_blank=True)
        profile_image = serializers.ImageField(required=False, allow_null=True)

    class OutputSerializer(serializers.Serializer):
        id = serializers.IntegerField()
        email = serializers.EmailField()
        name = serializers.CharField()
        profile_imagekey = serializers.CharField(allow_null=True, required=False)
        profile_image_url = serializers.SerializerMethodField()

        def get_profile_image_url(self, obj):
            return get_storj_public_url(image_key=obj.profile_imagekey)

    def post(self, request):
        serializer = self.InputSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        user = create_user(**serializer.validated_data)

        return api_success(
            data=self.OutputSerializer(user).data,
            message="User Created Successfully",
            status_code=status.HTTP_201_CREATED,
        )


class UserSearchApi(APIView):
    permission_classes = [IsAuthenticated]

    class InputSerializer(serializers.Serializer):
        q = serializers.CharField(required=False, allow_blank=True)

    class OutputSerializer(serializers.Serializer):
        id = serializers.IntegerField()
        email = serializers.EmailField()
        name = serializers.CharField()
        phone = serializers.CharField(allow_null=True, required=False)
        profile_imagekey = serializers.CharField(allow_null=True, required=False)
        profile_image_url = serializers.SerializerMethodField()

        def get_profile_image_url(self, obj):
            return get_storj_public_url(image_key=obj.profile_imagekey)

    def get(self, request):
        query = request.query_params.get("q", "").strip()

        if not query:
            return api_success(
                data=[],
                message="No search query provided.",
                status_code=status.HTTP_200_OK,
            )

        users = search_users(query=query)
        serializer = self.OutputSerializer(users, many=True)

        return api_success(
            data=serializer.data,
            message="Users fetched successfully.",
            status_code=status.HTTP_200_OK,
        )


class UserUpdateApi(APIView):
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    class InputSerializer(serializers.Serializer):
        name = serializers.CharField()
        phone = serializers.CharField(required=False, allow_blank=True)
        profile_image = serializers.ImageField(required=False, allow_null=True)

    class OutputSerializer(serializers.Serializer):
        id = serializers.IntegerField()
        email = serializers.EmailField()
        name = serializers.CharField()
        phone = serializers.CharField(allow_null=True, required=False)
        profile_imagekey = serializers.CharField(allow_null=True, required=False)
        profile_image_url = serializers.SerializerMethodField()

        def get_profile_image_url(self, obj):
            return get_storj_public_url(image_key=obj.profile_imagekey)

    def patch(self, request):
        serializer = self.InputSerializer(data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)

        updated_user = update_user(user=request.user, **serializer.validated_data)

        return api_success(
            data=self.OutputSerializer(updated_user).data,
            message="User updated Successfully",
            status_code=status.HTTP_201_CREATED,
        )


class UserDeleteApi(APIView):
    permission_classes = [IsAuthenticated]

    def delete(self, request):
        delete_user(user=request.user)

        response = api_success(
            data=None,
            message="User Deleted Successfully.",
            status_code=status.HTTP_200_OK,
        )

        response.delete_cookie("access_token")
        response.delete_cookie("response_token")

        return response


class UserLoginAPi(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]

    class InputSerializer(serializers.Serializer):
        email = serializers.EmailField()
        password = serializers.CharField(write_only=True)

    class OutputSerializer(serializers.Serializer):
        id = serializers.IntegerField()
        email = serializers.EmailField()
        name = serializers.CharField()

    def post(self, request):
        serializer = self.InputSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        result = login_user(**serializer.validated_data)

        # get the user
        user = result["user"]

        response = api_success(
            data=self.OutputSerializer(user).data,
            message="User LoggedIn Successfully",
            status_code=status.HTTP_200_OK,
        )

        return set_jwt_cookies(
            response=response,
            refresh_token=result["refresh"],
            access_token=result["access"],
        )


class UserMeApi(APIView):
    permission_classes = [IsAuthenticated]

    class OutputSerializer(serializers.Serializer):
        id = serializers.IntegerField()
        email = serializers.EmailField()
        name = serializers.CharField()
        phone = serializers.CharField(allow_null=True, required=False)
        profile_imagekey = serializers.CharField(allow_null=True, required=False)
        profile_image_url = serializers.SerializerMethodField()

        def get_profile_image_url(self, obj):
            return get_storj_public_url(image_key=obj.profile_imagekey)

    def get(self, request):
        return api_success(
            data=self.OutputSerializer(request.user).data,
            message="Currently LoggedIn User",
            status_code=status.HTTP_200_OK,
        )


class UserExportApi(APIView):
    """Everything the requester owns, as JSON.

    JSON is the only format offered. A CSV bundle was built and dropped: an
    expense has many payers and many participants, so a flat column has to
    squash them into one cell, which reads in Excel but cannot be parsed back.
    For a human-readable copy there is a printable report at /report, which the
    browser can save as PDF without any server-side rendering.
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):
        data = build_export(user=request.user)

        # json.dumps rather than DRF's renderer: the payload is already plain
        # data and this keeps the file byte-identical to what build_export made.
        return HttpResponse(
            json.dumps(data, indent=2, ensure_ascii=False),
            content_type="application/json",
        )


class UserListApi(APIView):
    permission_classes = [IsAuthenticated]

    class OutputSerializer(serializers.Serializer):
        id = serializers.IntegerField()
        name = serializers.CharField()
        email = serializers.EmailField()
        phone = serializers.CharField(allow_null=True, required=False)
        profile_imagekey = serializers.CharField(allow_null=True, required=False)
        profile_image_url = serializers.SerializerMethodField()

        def get_profile_image_url(self, obj):
            return get_storj_public_url(image_key=obj.profile_imagekey)

    def get(self, request):
        users = list_user()

        return api_success(
            data=self.OutputSerializer(users, many=True).data,
            message="Sucessufly Fetched users",
            status_code=status.HTTP_200_OK,
        )


class UserLogoutApi(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        create_audit_log(
            user=request.user,
            action=AuditLog.AuditAction.LOGOUT,
            model_name=AuditLog.ModelName.USER,
            message="User logged out successfully.",
        )

        response = self.response = api_success(
            data=None,
            message="User Logout Successfully.",
            status_code=status.HTTP_200_OK,
        )

        response.delete_cookie("access_token")
        response.delete_cookie("refresh_token")

        return response


class UserPasswordResetApi(APIView):
    permission_classes = [IsAuthenticated]

    class InputSerializer(serializers.Serializer):
        old_password = serializers.CharField(write_only=True)
        new_password = serializers.CharField(
            write_only=True, validators=[validate_password]
        )

        def validate_old_password(self, value):
            user = self.context["request"].user
            if not user.check_password(value):
                raise serializers.ValidationError("Old password is incorrect..")
            return value

        def validate(self, attrs):
            if attrs["old_password"] == attrs["new_password"]:
                raise serializers.ValidationError(
                    "Old Password and New password can't be same."
                )
            return attrs

    def post(self, request):
        serializer = self.InputSerializer(
            data=request.data, context={"request": request}
        )
        serializer.is_valid(raise_exception=True)

        new_password = serializer.validated_data["new_password"]

        reset_user_password(user=request.user, new_password=new_password)

        return api_success(
            data=None,
            message="User Password Updated Success.",
            status_code=status.HTTP_200_OK,
        )
