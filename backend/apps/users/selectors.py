from django.contrib.auth import get_user_model
from django.db.models import Q

User = get_user_model()


def list_user():
    return User.objects.all()


def search_users(*, query):
    q = query.strip()
    if not q:
        return User.objects.none()

    return User.objects.filter(
        Q(name__icontains=q) | Q(email__icontains=q)
    ).order_by("name")
