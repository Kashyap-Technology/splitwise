from django.contrib.auth import get_user_model

User = get_user_model()


def list_user():
    return User.objects.all()
