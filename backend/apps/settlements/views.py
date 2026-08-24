from rest_framework import serializers, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView

from apps.core.api.responses import api_success
from apps.groups.selectors import get_group_for_member
from apps.settlements.services import settlement_create


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
