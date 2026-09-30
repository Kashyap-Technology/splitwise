from decimal import Decimal

from django.test import SimpleTestCase
from rest_framework.exceptions import ValidationError

from apps.expenses.services import (
	_calculate_participant_amount,
	_calculate_payer_amount,
)


class ExpenseAllocationTests(SimpleTestCase):
	def test_participant_amounts_are_calculated_equally_for_each_split_type(self):
		participants = [{"user_id": 10}, {"user_id": 20}, {"user_id": 30}]

		for split_type in ("equal", "exact", "percentage"):
			with self.subTest(split_type=split_type):
				amounts = _calculate_participant_amount(
					split_type=split_type,
					amount=Decimal("10.00"),
					participants=participants,
				)

				self.assertEqual(
					amounts,
					{
						10: Decimal("3.33"),
						20: Decimal("3.33"),
						30: Decimal("3.34"),
					},
				)

	def test_payer_amounts_are_validated_independently_of_participants(self):
		amounts = _calculate_payer_amount(
			amount=Decimal("10.00"),
			payers=[
				{"user_id": 1, "amount_paid": Decimal("4.00")},
				{"user_id": 2, "amount_paid": Decimal("6.00")},
			],
		)

		self.assertEqual(amounts, {1: Decimal("4.00"), 2: Decimal("6.00")})

	def test_empty_participant_list_is_rejected(self):
		with self.assertRaises(ValidationError):
			_calculate_participant_amount(
				split_type="exact", amount=Decimal("10.00"), participants=[]
			)
