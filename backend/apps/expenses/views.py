from django.db.models import Q
from rest_framework import serializers, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView

from apps.core.api.responses import api_success
from apps.expenses.models import Expense
from apps.expenses.selectors import get_category
from apps.expenses.services import (
    create_category,
    create_expense,
    delete_expense,
    update_expense,
)
from apps.groups.selectors import (
    get_group_balance,
    get_group_by_id,
    get_group_for_member,
    group_settlement,
)


class CategoryListApi(APIView):
    permission_classes = [IsAuthenticated]

    class OutputSerializer(serializers.Serializer):
        id = serializers.IntegerField()
        name = serializers.CharField()
        icon = serializers.CharField()
        created_by = serializers.CharField(source="created_by.name", allow_null=True)

    def get(self, request):
        categories = get_category()

        serializer = self.OutputSerializer(categories, many=True)

        return api_success(
            data=serializer.data,
            message="Categories Fetched Successfully.",
            status_code=status.HTTP_200_OK,
        )


class CategoryCreateApi(APIView):
    permission_classes = [IsAuthenticated]

    class InputSerializer(serializers.Serializer):
        name = serializers.CharField()
        icon = serializers.CharField(required=False)

    class OutputSerializer(serializers.Serializer):
        id = serializers.IntegerField()
        name = serializers.CharField()
        icon = serializers.CharField()

    def post(self, request):
        serializer = self.InputSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        category = create_category(
            **serializer.validated_data, user=request.user, created_by=request.user
        )

        return api_success(
            data=self.OutputSerializer(category).data,
            message="Category created successfully",
            status_code=status.HTTP_201_CREATED,
        )


class PayerSerializer(serializers.Serializer):
    user_id = serializers.IntegerField()
    amount_paid = serializers.DecimalField(
        max_digits=10, decimal_places=5
    )


class ParticipantSerializer(serializers.Serializer):
    user_id = serializers.IntegerField()
    value = serializers.DecimalField(
        max_digits=10, decimal_places=2, required=False, allow_null=True
    )


class ExpenseCreateApi(APIView):
    permission_classes = [IsAuthenticated]

    class InputSerializer(serializers.Serializer):
        title = serializers.CharField(max_length=255)
        category_id = serializers.IntegerField()
        amount = serializers.DecimalField(max_digits=10, decimal_places=5)
        split_type = serializers.ChoiceField(choices=["equal", "exact", "percentage"])
        payers = PayerSerializer(many=True)
        participants = ParticipantSerializer(many=True)

    class OutputSerializer(serializers.Serializer):
        id = serializers.IntegerField()
        title = serializers.CharField()
        amount = serializers.DecimalField(max_digits=10, decimal_places=5)
        split_type = serializers.CharField()

    def post(self, request, group_id):
        group = get_group_for_member(group_id=group_id, user=request.user)

        serializer = self.InputSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        expense = create_expense(
            user=request.user, group=group, **serializer.validated_data
        )

        return api_success(
            data=self.OutputSerializer(expense).data,
            message="Expense created successfully",
            status_code=status.HTTP_201_CREATED,
        )


class ExpenseUpdateApi(APIView):
    permission_classes = [IsAuthenticated]

    class InputSerializer(serializers.Serializer):
        title = serializers.CharField(max_length=255)
        category_id = serializers.IntegerField()
        amount = serializers.DecimalField(max_digits=10, decimal_places=5)
        split_type = serializers.ChoiceField(choices=["equal", "exact", "percentage"])
        payers = PayerSerializer(many=True)
        participants = ParticipantSerializer(many=True)

    class OutputSerializer(serializers.Serializer):
        id = serializers.IntegerField()
        title = serializers.CharField()
        amount = serializers.DecimalField(max_digits=10, decimal_places=5)
        split_type = serializers.CharField()

    def patch(self, request, expense_id):
        serializer = self.InputSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        updated_expense = update_expense(
            request=request, expense_id=expense_id, **serializer.validated_data
        )

        return api_success(
            data=self.OutputSerializer(updated_expense).data,
            status_code=status.HTTP_200_OK,
            message="Expense Updated Successfully.",
        )


class ExpenseDeleteApi(APIView):
    permission_classes = [IsAuthenticated]

    def delete(self, request, expense_id):
        delete_expense(request=request, expense_id=expense_id)

        return api_success(
            data=None,
            message="Expense Deleted Successfully.",
            status_code=status.HTTP_200_OK,
        )


class GroupExpenseListApi(APIView):
    permission_classes = [IsAuthenticated]

    class OutputSerializer(serializers.Serializer):
        id = serializers.IntegerField()
        title = serializers.CharField()
        split_type = serializers.CharField()
        amount = serializers.DecimalField(max_digits=10, decimal_places=5)
        category_id = serializers.IntegerField(source="category.id")
        category_name = serializers.CharField(source="category.name")

    def get(self, request, group_id):
        group = get_group_for_member(group_id=group_id, user=request.user)
        expenses = (
            Expense.objects.filter(group=group)
            .select_related("category")
            .order_by("-created_at")
        )

        serializer = self.OutputSerializer(expenses, many=True)

        return api_success(
            data=serializer.data,
            message="Group expenses fetched successfully.",
            status_code=status.HTTP_200_OK,
        )


class UserExpenseListApi(APIView):
    permission_classes = [IsAuthenticated]

    class OutputSerializer(serializers.Serializer):
        id = serializers.IntegerField()
        title = serializers.CharField()
        split_type = serializers.CharField()
        amount = serializers.DecimalField(max_digits=10, decimal_places=5)
        category_id = serializers.IntegerField(source="category.id")
        category_name = serializers.CharField(source="category.name")
        group_id = serializers.IntegerField(source="group.id")
        group_name = serializers.CharField(source="group.name")

    def get(self, request):
        expenses = (
            Expense.objects.filter(
                Q(expense_payers__user=request.user)
                | Q(expense_participants__user=request.user)
            )
            .select_related("category", "group")
            .distinct()
            .order_by("-created_at")
        )

        serializer = self.OutputSerializer(expenses, many=True)

        return api_success(
            data=serializer.data,
            message="User expenses fetched successfully.",
            status_code=status.HTTP_200_OK,
        )


class GroupBalanceApi(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, group_id):
        group = get_group_by_id(group_id=group_id)

        balance = get_group_balance(group=group)
        print(balance)

        return api_success(
            data=balance,
            message="Successfully fetched group balance.",
            status_code=status.HTTP_200_OK,
        )


class UserSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    name = serializers.CharField()


class GroupSettlementApi(APIView):
    permission_classes = [IsAuthenticated]

    class OutputSerializer(serializers.Serializer):
        from_user = serializers.CharField(source="from")
        to_user = serializers.CharField(source="to")
        amount = serializers.DecimalField(decimal_places=2, max_digits=10)

    def get(self, request, group_id):
        group = get_group_by_id(group_id=group_id)

        balance = get_group_balance(group=group)

        settlements = group_settlement(balance=balance)

        serializer = self.OutputSerializer(settlements, many=True).data

        return api_success(
            data=serializer,
            message="Sucessfully fetched group settlement",
            status_code=status.HTTP_200_OK,
        )
