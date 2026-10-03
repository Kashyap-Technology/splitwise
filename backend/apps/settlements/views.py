from django.db.models import Q
from rest_framework import serializers, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView

from apps.core.api.responses import api_success
from apps.core.services import get_storj_public_url
from apps.groups.selectors import (
    get_group_balance,
    get_group_for_member,
    get_user_groups,
)
from apps.settlements.models import Settlement
from apps.settlements.services import settlement_create


class UserSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    name = serializers.CharField()
    email = serializers.EmailField()
    # Settlements are shown as "who pays whom", so both sides of every row need
    # a face to be recognisable. Without this the client could only fall back to
    # coloured initials.
    profile_image_url = serializers.SerializerMethodField()

    def get_profile_image_url(self, obj):
        return get_storj_public_url(image_key=obj.profile_imagekey)


class GroupSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    name = serializers.CharField()


class SettlementCreateApi(APIView):
    permission_classes = [IsAuthenticated]

    class InputSerializer(serializers.Serializer):
        to_user_id = serializers.IntegerField()
        amount = serializers.DecimalField(max_digits=10, decimal_places=5)

    class OutputSerializer(serializers.Serializer):
        id = serializers.IntegerField()
        from_user = serializers.IntegerField(source="from_user_id")
        to_user = serializers.IntegerField(source="to_user_id")
        amount = serializers.DecimalField(max_digits=10, decimal_places=2)

    def post(self, request, group_id):
        group = get_group_for_member(group_id=group_id, user=request.user)

        serializer = self.InputSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        settlement = settlement_create(
            group=group, from_user=request.user, **serializer.validated_data
        )

        return api_success(
            data=self.OutputSerializer(settlement).data,
            message="Settlement recorded successfully",
            status_code=status.HTTP_201_CREATED,
        )


class UserSettlementListApi(APIView):
    permission_classes = [IsAuthenticated]

    class OutputSerializer(serializers.Serializer):
        id = serializers.IntegerField(allow_null=True)
        group = GroupSerializer()
        from_user = UserSerializer()
        to_user = UserSerializer()
        amount = serializers.DecimalField(max_digits=10, decimal_places=5)
        direction = serializers.SerializerMethodField()
        status = serializers.CharField()
        created_at = serializers.DateTimeField(allow_null=True)

        def get_direction(self, obj):
            return (
                "paid"
                if _get_from_user_id(obj) == self.context["request"].user.id
                else "received"
            )

    def get(self, request):
        recorded_settlements = (
            Settlement.objects.filter(
                Q(from_user=request.user) | Q(to_user=request.user)
            )
            .select_related("group", "from_user", "to_user")
            .order_by("-created_at")
        )
        settlement_history = [
            {
                "id": settlement.id,
                "group": settlement.group,
                "from_user": settlement.from_user,
                "to_user": settlement.to_user,
                "amount": settlement.amount,
                "status": "recorded",
                "created_at": settlement.created_at,
            }
            for settlement in recorded_settlements
        ]
        current_settlements = []

        for group in get_user_groups(user=request.user).prefetch_related("members"):
            balance = get_group_balance(group=group)
            members = {
                member.id: member for member in group.members.all()
            }
            debtors = [
                [user_id, -amount]
                for user_id, amount in balance.items()
                if amount < 0 and user_id in members
            ]
            creditors = [
                [user_id, amount]
                for user_id, amount in balance.items()
                if amount > 0 and user_id in members
            ]

            debtor_index = 0
            creditor_index = 0
            while debtor_index < len(debtors) and creditor_index < len(creditors):
                debtor_id, amount_owed = debtors[debtor_index]
                creditor_id, amount_due = creditors[creditor_index]
                amount = min(amount_owed, amount_due)

                if request.user.id in (debtor_id, creditor_id):
                    current_settlements.append(
                        {
                            "id": None,
                            "group": group,
                            "from_user": members[debtor_id],
                            "to_user": members[creditor_id],
                            "amount": amount,
                            "status": "suggested",
                            "created_at": None,
                        }
                    )

                debtors[debtor_index][1] -= amount
                creditors[creditor_index][1] -= amount
                if debtors[debtor_index][1] == 0:
                    debtor_index += 1
                if creditors[creditor_index][1] == 0:
                    creditor_index += 1

        current_data = self.OutputSerializer(
            current_settlements,
            many=True,
            context={"request": request},
        ).data
        history_data = self.OutputSerializer(
            settlement_history,
            many=True,
            context={"request": request},
        ).data

        return api_success(
            data={
                "current_settlements": current_data,
                "settlement_history": history_data,
                "summary": {
                    "current_settlement_count": len(current_data),
                    "history_count": len(history_data),
                    "total_to_pay": sum(
                        (
                            item["amount"]
                            for item in current_settlements
                            if item["from_user"].id == request.user.id
                        ),
                        0,
                    ),
                    "total_to_receive": sum(
                        (
                            item["amount"]
                            for item in current_settlements
                            if item["to_user"].id == request.user.id
                        ),
                        0,
                    ),
                },
            },
            message="User settlements fetched successfully.",
            status_code=status.HTTP_200_OK,
        )


def _get_from_user_id(obj):
    if isinstance(obj, dict):
        return obj["from_user"].id
    return obj.from_user_id
