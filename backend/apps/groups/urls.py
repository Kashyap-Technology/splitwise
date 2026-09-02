from django.urls import path

from apps.groups.views import (
    GroupCreateApi,
    GroupDetailApi,
    GroupDeleteApi,
    GroupInvitationAcceptApi,
    GroupInvitationCreateApi,
    GroupLeaveApi,
    GroupListApi,
    GroupMemberListpApi,
    GroupRemoveAPi,
    GroupUpdateApi,
    UserGroupApi,
)

urlpatterns = [
    path("groups/", GroupListApi.as_view(), name="list-group"),
    path("groups/create/", GroupCreateApi.as_view(), name="create-group"),
    path(
        "groups/<int:group_id>/detail/",
        GroupDetailApi.as_view(),
        name="group-detail",
    ),
    path(
        "groups/<int:group_id>/invite/",
        GroupInvitationCreateApi.as_view(),
        name="group-invitation",
    ),
    path(
        "groups/<uuid:token>/invitation/accept/",
        GroupInvitationAcceptApi.as_view(),
        name="accept-invitation",
    ),
    path(
        "groups/<int:group_id>/members/",
        GroupMemberListpApi.as_view(),
        name="list-group-member",
    ),
    path(
        "groups/<int:group_id>/delete/", GroupDeleteApi.as_view(), name="delete-group"
    ),
    path(
        "groups/<int:group_id>/update/", GroupUpdateApi.as_view(), name="update-group"
    ),
    path("user/group/", UserGroupApi.as_view(), name="user-group"),
    path(
        "group/<int:group_id>/<int:user_id>/remove/",
        GroupRemoveAPi.as_view(),
        name="group-remove",
    ),
    path(
        "group/<int:group_id>/<int:user_id>/leave/",
        GroupLeaveApi.as_view(),
        name="group-leave",
    ),
]
