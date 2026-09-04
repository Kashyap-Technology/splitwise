from django.urls import path

from apps.expenses.views import (
    CategoryCreateApi,
    CategoryListApi,
    ExpenseCreateApi,
    ExpenseDeleteApi,
    ExpenseUpdateApi,
    GroupBalanceApi,
    GroupExpenseListApi,
    GroupSettlementApi,
    UserExpenseListApi,
)

urlpatterns = [
    path("category/create/", CategoryCreateApi.as_view(), name="create-category"),
    path("category/list/", CategoryListApi.as_view(), name="create-category"),
    path("<int:group_id>/create/", ExpenseCreateApi.as_view(), name="create"),
    path("<int:group_id>/expenses/", GroupExpenseListApi.as_view(), name="group-expenses"),
    path("user/expenses/", UserExpenseListApi.as_view(), name="user-expenses"),
    path("<int:expense_id>/update/", ExpenseUpdateApi.as_view(), name="update"),
    path("<int:expense_id>/delete/", ExpenseDeleteApi.as_view(), name="delete"),
    path(
        "group/<int:group_id>/balance/", GroupBalanceApi.as_view(), name="group-balance"
    ),
    path(
        "group/<int:group_id>/settlement/",
        GroupSettlementApi.as_view(),
        name="group-settlementI",
    ),
]
