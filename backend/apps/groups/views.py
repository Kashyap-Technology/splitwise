from decimal import Decimal

from django.db.models import Count, OuterRef, Prefetch, Subquery, Sum
from rest_framework import serializers, status
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView

from apps.core.api.responses import api_success
from apps.core.services import get_storj_public_url
from apps.expenses.models import Expense
from apps.groups.models import Group, GroupMembership
from apps.groups.selectors import (
    get_group_balance,
    get_group_by_id,
    get_group_for_member,
    get_group_member_list,
    get_invitation_by_token,
    get_receiver_by_id,
    get_user_groups,
    group_settlement,
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
        group_image_url = serializers.SerializerMethodField()
        created_by = UserSerializer()

        def get_group_image_url(self, obj):
            return get_storj_public_url(image_key=obj.group_imagekey)

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
        group_image_url = serializers.SerializerMethodField()

        def get_group_image_url(self, obj):
            return get_storj_public_url(image_key=obj.group_imagekey)

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
    permission_classes = []

    def post(self, request, token):
        from django.http import HttpResponse

        invitation = get_invitation_by_token(token=token)

        try:
            accept_group_invitation(invitation=invitation, user=invitation.receiver)
        except Exception as e:
            return HttpResponse(
                f"""
                <!DOCTYPE html>
                <html lang="en">
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>Invitation Failed</title>
                    <style>
                        body {{ margin:0; padding:0; min-height:100vh; display:flex; align-items:center; justify-content:center; background:linear-gradient(135deg,#fef2f2,#fff); font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif; }}
                        .card {{ background:#fff; border-radius:16px; padding:48px 40px; max-width:400px; width:90%; text-align:center; box-shadow:0 4px 24px rgba(0,0,0,0.08); }}
                        .icon {{ width:64px; height:64px; border-radius:50%; background:#fef2f2; display:flex; align-items:center; justify-content:center; margin:0 auto 20px; font-size:28px; }}
                        h1 {{ margin:0 0 8px; font-size:24px; color:#0f172a; }}
                        p {{ margin:0 0 24px; color:#64748b; font-size:15px; line-height:1.5; }}
                        .btn {{ display:inline-block; background:#2563eb; color:#fff; text-decoration:none; padding:12px 28px; border-radius:10px; font-size:15px; font-weight:600; }}
                    </style>
                </head>
                <body>
                    <div class="card">
                        <div class="icon">❌</div>
                        <h1>Unable to Accept Invitation</h1>
                        <p>{str(e)}</p>
                        <a href="/" class="btn">Go to Splitwise</a>
                    </div>
                </body>
                </html>
                """,
                status=400,
            )

        return HttpResponse(
            """
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Invitation Accepted</title>
                <style>
                    body { margin:0; padding:0; min-height:100vh; display:flex; align-items:center; justify-content:center; background:linear-gradient(135deg,#eff6ff,#fff); font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif; }
                    .card { background:#fff; border-radius:16px; padding:48px 40px; max-width:400px; width:90%; text-align:center; box-shadow:0 4px 24px rgba(0,0,0,0.08); }
                    .icon { width:64px; height:64px; border-radius:50%; background:#ecfdf5; display:flex; align-items:center; justify-content:center; margin:0 auto 20px; font-size:28px; }
                    h1 { margin:0 0 8px; font-size:24px; color:#0f172a; }
                    p { margin:0 0 24px; color:#64748b; font-size:15px; line-height:1.5; }
                    .btn { display:inline-block; background:#2563eb; color:#fff; text-decoration:none; padding:12px 28px; border-radius:10px; font-size:15px; font-weight:600; }
                </style>
            </head>
            <body>
                <div class="card">
                    <div class="icon">🎉</div>
                    <h1>Invitation Accepted!</h1>
                    <p>You have successfully joined the group. You can now start splitting expenses with your friends.</p>
                    <a href="/" class="btn">Go to Splitwise</a>
                </div>
            </body>
            </html>
            """,
            status=200,
        )


class GroupMemberListpApi(APIView):
    permission_classes = [IsAuthenticated]

    class OutputSerializer(serializers.Serializer):
        id = serializers.IntegerField(source="user.id")
        name = serializers.CharField(source="user.name")
        email = serializers.EmailField(source="user.email")
        profile_image_url = serializers.SerializerMethodField()
        role = serializers.CharField()

        def get_profile_image_url(self, obj):
            return get_storj_public_url(image_key=obj.user.profile_imagekey)

    def get(self, request, group_id):
        group = get_group_for_member(group_id=group_id, user=request.user)

        members = get_group_member_list(group=group)

        serializer = self.OutputSerializer(members, many=True)

        return api_success(
            data=serializer.data,
            message="Members of Group Fetche successfully.",
            status_code=status.HTTP_200_OK,
        )


class GroupDetailUserSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    name = serializers.CharField()
    email = serializers.EmailField()
    profile_image_url = serializers.SerializerMethodField()

    def get_profile_image_url(self, obj):
        return get_storj_public_url(image_key=obj.profile_imagekey)


class GroupDetailMemberSerializer(serializers.Serializer):
    id = serializers.IntegerField(source="user.id")
    name = serializers.CharField(source="user.name")
    email = serializers.EmailField(source="user.email")
    profile_image_url = serializers.SerializerMethodField()
    role = serializers.CharField()

    def get_profile_image_url(self, obj):
        return get_storj_public_url(image_key=obj.user.profile_imagekey)


class GroupDetailPayerSerializer(serializers.Serializer):
    user = GroupDetailUserSerializer()
    amount_paid = serializers.DecimalField(max_digits=10, decimal_places=5)


class GroupDetailParticipantSerializer(serializers.Serializer):
    user = GroupDetailUserSerializer()
    amount_to_pay = serializers.DecimalField(max_digits=10, decimal_places=5)


class GroupDetailExpenseSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    title = serializers.CharField()
    amount = serializers.DecimalField(max_digits=10, decimal_places=5)
    split_type = serializers.CharField()
    category_id = serializers.IntegerField(source="category.id")
    category_name = serializers.CharField(source="category.name")
    created_at = serializers.DateTimeField()
    payers = serializers.SerializerMethodField()
    participants = serializers.SerializerMethodField()

    def get_payers(self, obj):
        return GroupDetailPayerSerializer(obj.expense_payers.all(), many=True).data

    def get_participants(self, obj):
        return GroupDetailParticipantSerializer(
            obj.expense_participants.all(), many=True
        ).data


class GroupDetailSettlementSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    from_user = GroupDetailUserSerializer()
    to_user = GroupDetailUserSerializer()
    amount = serializers.DecimalField(max_digits=10, decimal_places=5)
    created_at = serializers.DateTimeField()


class GroupDetailSettlementSuggestionSerializer(serializers.Serializer):
    # Ids travel with the names so the client can match a suggestion to the
    # viewer ("is this me?") and submit a settlement against the right pair,
    # instead of string-matching display names.
    from_user_id = serializers.IntegerField(source="from_id")
    to_user_id = serializers.IntegerField(source="to_id")
    from_user = serializers.CharField(source="from")
    to_user = serializers.CharField(source="to")
    amount = serializers.DecimalField(max_digits=10, decimal_places=5)


class GroupDetailBalanceSerializer(serializers.Serializer):
    user_id = serializers.IntegerField()
    user_name = serializers.CharField()
    balance = serializers.DecimalField(max_digits=10, decimal_places=5)


class GroupDetailOutputSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    name = serializers.CharField()
    description = serializers.CharField()
    group_imagekey = serializers.CharField(allow_null=True)
    group_image_url = serializers.SerializerMethodField()
    created_at = serializers.DateTimeField()
    members = GroupDetailMemberSerializer(many=True)
    expenses = GroupDetailExpenseSerializer(many=True)
    settlements = GroupDetailSettlementSerializer(many=True)
    settlement_suggestions = GroupDetailSettlementSuggestionSerializer(many=True)
    balances = GroupDetailBalanceSerializer(many=True)
    summary = serializers.DictField()

    def get_group_image_url(self, obj):
        return get_storj_public_url(image_key=obj["group_imagekey"])


class GroupDetailApi(APIView):
    permission_classes = [IsAuthenticated]

    class OutputSerializer(GroupDetailOutputSerializer):
        pass

    def get(self, request, group_id):
        group = get_group_for_member(group_id=group_id, user=request.user)
        group = (
            Group.objects.filter(pk=group.pk)
            .prefetch_related(
                "group_memberships__user",
                Prefetch(
                    "expenses",
                    queryset=Expense.objects.select_related("category")
                    .prefetch_related(
                        "expense_payers__user", "expense_participants__user"
                    )
                    .order_by("-created_at"),
                ),
                "settlements__from_user",
                "settlements__to_user",
            )
            .get()
        )

        members = list(group.group_memberships.all())
        expenses = list(group.expenses.all())
        settlements = list(group.settlements.all().order_by("-created_at"))

        balance_by_user = {
            membership.user_id: Decimal("0") for membership in members
        }
        total_paid = Decimal("0")
        total_owed = Decimal("0")

        for expense in expenses:
            total_paid += sum(
                (payer.amount_paid for payer in expense.expense_payers.all()),
                Decimal("0"),
            )
            total_owed += sum(
                (
                    participant.amount_to_pay
                    for participant in expense.expense_participants.all()
                ),
                Decimal("0"),
            )
            for payer in expense.expense_payers.all():
                balance_by_user[payer.user_id] = (
                    balance_by_user.get(payer.user_id, Decimal("0"))
                    + payer.amount_paid
                )
            for participant in expense.expense_participants.all():
                balance_by_user[participant.user_id] = (
                    balance_by_user.get(participant.user_id, Decimal("0"))
                    - participant.amount_to_pay
                )

        total_settled = Decimal("0")
        for settlement in settlements:
            total_settled += settlement.amount
            balance_by_user[settlement.from_user_id] = (
                balance_by_user.get(settlement.from_user_id, Decimal("0"))
                + settlement.amount
            )
            balance_by_user[settlement.to_user_id] = (
                balance_by_user.get(settlement.to_user_id, Decimal("0"))
                - settlement.amount
            )

        users = {membership.user_id: membership.user for membership in members}
        balances = [
            {
                "user_id": user_id,
                "user_name": users[user_id].name,
                "balance": balance,
            }
            for user_id, balance in balance_by_user.items()
            if user_id in users
        ]
        settlement_suggestions = group_settlement(balance=balance_by_user)

        data = {
            "id": group.id,
            "name": group.name,
            "description": group.description,
            "group_imagekey": group.group_imagekey,
            "created_at": group.created_at,
            "members": members,
            "expenses": expenses,
            "settlements": settlements,
            "settlement_suggestions": settlement_suggestions,
            "balances": balances,
            "summary": {
                "member_count": len(members),
                "expense_count": len(expenses),
                "total_expenses": sum(
                    (expense.amount for expense in expenses), Decimal("0")
                ),
                "total_paid": total_paid,
                "total_owed": total_owed,
                "total_settled": total_settled,
                "your_balance": balance_by_user.get(request.user.id, Decimal("0")),
            },
        }

        return api_success(
            data=self.OutputSerializer(data).data,
            message="Group details fetched successfully.",
            status_code=status.HTTP_200_OK,
        )


class UserGroupApi(APIView):
    permission_classes = [IsAuthenticated]

    class OutputSerializer(serializers.Serializer):
        id = serializers.IntegerField()
        name = serializers.CharField()
        description = serializers.CharField()
        group_imagekey = serializers.CharField()
        group_image_url = serializers.SerializerMethodField()
        member_count = serializers.IntegerField()
        total_expenses = serializers.DecimalField(
            max_digits=10, decimal_places=5, coerce_to_string=False
        )
        your_balance = serializers.SerializerMethodField()
        balance_status = serializers.SerializerMethodField()

        def get_group_image_url(self, obj):
            return get_storj_public_url(image_key=obj.group_imagekey)

        def get_your_balance(self, obj):
            # Precomputed in the view. Both this field and `balance_status` need
            # it, and each call runs four aggregate queries, so resolving them
            # per-field doubled the query count for every group in the list.
            return self.context["your_balances"].get(obj.id, Decimal("0"))

        def get_balance_status(self, obj):
            balance = self.get_your_balance(obj)
            if balance > 0:
                return "credit"
            if balance < 0:
                return "debt"
            return "settled"

    def get(self, request):
        member_counts = (
            GroupMembership.objects.filter(group=OuterRef("pk"))
            .values("group")
            .annotate(count=Count("user", distinct=True))
            .values("count")
        )
        total_expenses = (
            Expense.objects.filter(group=OuterRef("pk"))
            .values("group")
            .annotate(total=Sum("amount"))
            .values("total")
        )
        groups = get_user_groups(user=request.user).annotate(
            member_count=Subquery(member_counts),
            total_expenses=Subquery(total_expenses),
        )

        your_balances = {
            group.id: get_group_balance(group=group).get(request.user.id, Decimal("0"))
            for group in groups
        }

        serializer = self.OutputSerializer(
            groups,
            many=True,
            context={"request": request, "your_balances": your_balances},
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

        # Unique group name, excluding the group being edited. Without the
        # exclusion a group collides with itself, so saving without renaming --
        # for example to edit only the description -- was rejected outright.
        def validate_name(self, value):
            clash = (
                Group.objects.filter(name__iexact=value)
                .exclude(pk=self.context["group_id"])
                .exists()
            )
            if clash:
                raise serializers.ValidationError(
                    "A group with this name already exists."
                )
            return value

        def to_internal_value(self, data):
            values = super().to_internal_value(data)

            # DRF treats an empty multipart field as a missing field and drops
            # it, but the client sends `group_image=''` to mean "remove the
            # current image". The service distinguishes an absent key (leave the
            # image alone) from an explicit null (remove it), so the empty
            # string has to survive as a real null.
            raw_image = data.get("group_image") if hasattr(data, "get") else None
            if raw_image == "" and "group_image" not in values:
                values["group_image"] = None

            return values

    class OutputSerializer(serializers.Serializer):
        id = serializers.IntegerField()
        name = serializers.CharField()
        description = serializers.CharField()
        group_imagekey = serializers.CharField(allow_null=True)
        group_image_url = serializers.SerializerMethodField()

        def get_group_image_url(self, obj):
            return get_storj_public_url(image_key=obj.group_imagekey)

    def patch(self, request, group_id):
        serializer = self.InputSerializer(
            data=request.data, partial=True, context={"group_id": group_id}
        )
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
