from django.urls import path

from apps.settlements.views import SettlementCreateApi

urlpatterns = [
    path("<int:group_id>/create/", SettlementCreateApi.as_view(), name="create")
]
