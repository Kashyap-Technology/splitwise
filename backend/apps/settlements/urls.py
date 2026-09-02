from django.urls import path

from apps.settlements.views import SettlementCreateApi, UserSettlementListApi

urlpatterns = [
    path("my/settlements/", UserSettlementListApi.as_view(), name="user-settlements"),
    path("<int:group_id>/create/", SettlementCreateApi.as_view(), name="create"),
]
