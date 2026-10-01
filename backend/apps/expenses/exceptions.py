from rest_framework import status

from apps.core.exceptions import ApplicationError


class CategoryAlreadyExistsError(ApplicationError):
    status_code = status.HTTP_400_BAD_REQUEST
    default_detail = "Category with this name Already Exists."
    default_code = "category_already_exists"


class CategoryDoesNotExistsError(ApplicationError):
    status_code = status.HTTP_400_BAD_REQUEST
    default_detail = "Category with this name Does not Exists."
    default_code = "category_does_not_exists"


class NotGroupMemberError(ApplicationError):
    status_code = status.HTTP_400_BAD_REQUEST
    default_detail = "One or More user are not memeber of this group."
    default_code = "invalid_group_memberships"


class InvalidPaidAmount(ApplicationError):
    status_code = status.HTTP_400_BAD_REQUEST
    default_detail = (
        "Accumulated amount paid by all payers must match expense's total amount."
    )
    default_code = "invlid_paid_amount"


class InvalidExactSplitError(ApplicationError):
    status_code = status.HTTP_400_BAD_REQUEST
    default_code = "invalid_exact_split"
    default_detail = "Split amount doesn't match total expense."


class InvalidPercentageSplitError(ApplicationError):
    status_code = status.HTTP_400_BAD_REQUEST
    default_code = "invalid_percentage_split"
    default_detail = "Percentages must add up to 100%."


class InvalidSplitValueError(ApplicationError):
    status_code = status.HTTP_400_BAD_REQUEST
    default_code = "invalid_split_value"
    default_detail = "Split values must be valid numbers."


class DuplicateUserInSplitError(ApplicationError):
    status_code = status.HTTP_400_BAD_REQUEST
    default_code = "duplicate_user_in_split"
    default_detail = "The same user cannot appear twice in a split."


class UnsupportedSplitTypeError(ApplicationError):
    status_code = status.HTTP_400_BAD_REQUEST
    default_detail = "The selected split type is not supported"
    default_code = "unsupported_split_type"


class ExpenseDoesNotExistsError(ApplicationError):
    status_code = status.HTTP_404_NOT_FOUND
    default_detail = "Expense Does not exists"
    default_code = "expense_does_not_exists"
