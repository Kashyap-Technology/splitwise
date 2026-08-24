from rest_framework import serializers, status
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView

from apps.core.api.responses import api_success
from apps.groups.models import Group
from apps.groups.selectors import (
    get_group_by_id,
    get_group_for_member,
    get_group_member_list,
    get_invitation_by_token,
    get_receiver_by_id,
    get_user_groups,
    list_group,
)
from apps.groups.services import (
    accept_group_invitation,
    create_group,
    delete_group,
    invite_user_to_group,
    leave_group,
    remove_user_from_group,
    update_group,
)


class UserSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    email = serializers.EmailField()
    name = serializers.CharField()


class GroupListApi(APIView):
    permission_classes = [IsAuthenticated]

    class OutputSerializer(serializers.Serializer):
        id = serializers.IntegerField()
        name = serializers.CharField()
        description = serializers.CharField()
        group_imagekey = serializers.CharField(allow_null=True)
        created_by = UserSerializer()

    def get(self, request):
        groups = list_group()

        serializer = self.OutputSerializer(
            groups, many=True, context={"request": request}
        )

        return api_success(
            data=serializer.data,
            message="Group Fetched Successfully.",
            status_code=status.HTTP_200_OK,
        )


class GroupCreateApi(APIView):
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    class InputSerializer(serializers.Serializer):
        name = serializers.CharField(max_length=255)
        description = serializers.CharField(required=False, allow_blank=True)
        group_image = serializers.ImageField(required=False, allow_null=True)

        # unique group name
        def validate_name(self, value):
            if Group.objects.filter(name__iexact=value).exists():
                raise serializers.ValidationError(
                    "A group with this name already exists."
                )
            return value

    class OutputSerializer(serializers.Serializer):
        id = serializers.IntegerField()
        name = serializers.CharField()
        description = serializers.CharField()
        group_imagekey = serializers.CharField(allow_null=True)

    def post(self, request):
        serializer = self.InputSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        group = create_group(
            user=request.user,
            **serializer.validated_data,
        )

        return api_success(
            data=self.OutputSerializer(group, context={"request": request}).data,
            message="Group created successfully.",
            status_code=status.HTTP_201_CREATED,
        )


class GroupInvitationCreateApi(APIView):
    permission_classes = [IsAuthenticated]

    class InputSerializer(serializers.Serializer):
        receiver_id = serializers.IntegerField()

    def post(self, request, group_id):
        serializer = self.InputSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        receiver_id = serializer.validated_data["receiver_id"]

        group = get_group_by_id(group_id=group_id)
        receiver = get_receiver_by_id(receiver_id=receiver_id)

        invite_user_to_group(
            request=request, sender=request.user, receiver=receiver, group=group
        )

        return api_success(
            data=None,
            message="Invitation Send Successfully.",
            status_code=status.HTTP_200_OK,
        )


class GroupInvitationAcceptApi(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, token):
        invitation = get_invitation_by_token(token=token)

        accept_group_invitation(invitation=invitation, user=request.user)

        return api_success(
            data=None,
            message="Invitation accepted successfully.",
            status_code=status.HTTP_200_OK,
        )


class GroupMemberListpApi(APIView):
    permission_classes = [IsAuthenticated]

    class OutputSerializer(serializers.Serializer):
        id = serializers.IntegerField(source="user.id")
        name = serializers.CharField(source="user.name")
        email = serializers.EmailField(source="user.email")
        role = serializers.CharField()

    def get(self, request, group_id):
        group = get_group_for_member(group_id=group_id, user=request.user)

        members = get_group_member_list(group=group)

        serializer = self.OutputSerializer(members, many=True)

        return api_success(
            data=serializer.data,
            message="Members of Group Fetche successfully.",
            status_code=status.HTTP_200_OK,
        )


class UserGroupApi(APIView):
    permission_classes = [IsAuthenticated]

    class OutputSerializer(serializers.Serializer):
        id = serializers.IntegerField()
        name = serializers.CharField()
        description = serializers.CharField()
        group_imagekey = serializers.CharField()

    def get(self, request):
        groups = get_user_groups(user=request.user)

        serializer = self.OutputSerializer(
            groups,
            many=True,
        )

        return api_success(
            data=serializer.data,
            message="Group for user Fetched Successfully.",
            status_code=status.HTTP_200_OK,
        )


class GroupDeleteApi(APIView):
    permission_classes = [IsAuthenticated]

    def delete(self, request, group_id):
        delete_group(group_id=group_id, user=request.user)

        return api_success(
            data=None,
            message="Group delted successfully",
            status_code=status.HTTP_200_OK,
        )


class GroupUpdateApi(APIView):
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    class InputSerializer(serializers.Serializer):
        name = serializers.CharField(max_length=255)
        description = serializers.CharField(required=False, allow_blank=True)
        group_image = serializers.ImageField(required=False, allow_null=True)

        # unique group name
        def validate_name(self, value):
            if Group.objects.filter(name__iexact=value).exists():
                raise serializers.ValidationError(
                    "A group with this name already exists."
                )
            return value

    class OutputSerializer(serializers.Serializer):
        id = serializers.IntegerField()
        name = serializers.CharField()
        description = serializers.CharField()
        group_imagekey = serializers.CharField(allow_null=True)

    def patch(self, request, group_id):
        serializer = self.InputSerializer(data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)

        updated_group = update_group(
            data=serializer.validated_data, user=request.user, group_id=group_id
        )

        serializer = self.OutputSerializer(updated_group)

        return api_success(
            data=serializer.data,
            message="Group Updated Successfully",
            status_code=status.HTTP_200_OK,
        )


class GroupLeaveApi(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, group_id, user_id):
        leave_group(request=request, group_id=group_id, user_id=user_id)

        return api_success(
            data=None,
            message="Group Leave Successfull.",
            status_code=status.HTTP_200_OK,
        )


class GroupRemoveAPi(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, group_id, user_id):
        # only admin can remove
        remove_user_from_group(group_id=group_id, user_id=user_id, request=request)

        return api_success(
            data=None,
            message="Member Removed Succesfully",
            status_code=status.HTTP_200_OK,
        )
