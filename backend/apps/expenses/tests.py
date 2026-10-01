from decimal import Decimal

from django.test import SimpleTestCase
from rest_framework.exceptions import ValidationError

from apps.expenses.exceptions import (
	DuplicateUserInSplitError,
	InvalidPercentageSplitError,
	InvalidSplitValueError,
)
from apps.expenses.services import (
	_calculate_participant_amount,
	_calculate_payer_amount,
)


class ParticipantSplitTests(SimpleTestCase):
	def test_equal_split_hands_out_leftover_cents(self):
		# Shares are floored to whole cents and the leftover cent goes to the
		# first participants, so nobody is ever overcharged by the rounding.
		amounts = _calculate_participant_amount(
			split_type="equal",
			amount=Decimal("10.00"),
			participants=[{"user_id": 10}, {"user_id": 20}, {"user_id": 30}],
		)

		self.assertEqual(
			amounts,
			{
				10: Decimal("3.34"),
				20: Decimal("3.33"),
				30: Decimal("3.33"),
			},
		)
		self.assertEqual(sum(amounts.values()), Decimal("10.00"))

	def test_equal_split_is_not_used_for_exact_or_percentage(self):
		# Each split type must honour the per-participant `value` it is given,
		# rather than silently falling back to an equal division.
		exact = _calculate_participant_amount(
			split_type="exact",
			amount=Decimal("100.00"),
			participants=[
				{"user_id": 10, "value": "30.00"},
				{"user_id": 20, "value": "70.00"},
			],
		)
		percentage = _calculate_participant_amount(
			split_type="percentage",
			amount=Decimal("100.00"),
			participants=[
				{"user_id": 10, "value": "30"},
				{"user_id": 20, "value": "70"},
			],
		)

		self.assertEqual(exact, {10: Decimal("30.00"), 20: Decimal("70.00")})
		self.assertEqual(percentage, {10: Decimal("30.00"), 20: Decimal("70.00")})

	def test_exact_split_uses_supplied_amounts(self):
		amounts = _calculate_participant_amount(
			split_type="exact",
			amount=Decimal("250.00"),
			participants=[
				{"user_id": 10, "value": "200.00"},
				{"user_id": 20, "value": "25.50"},
				{"user_id": 30, "value": "24.50"},
			],
		)

		self.assertEqual(
			amounts,
			{
				10: Decimal("200.00"),
				20: Decimal("25.50"),
				30: Decimal("24.50"),
			},
		)

	def test_exact_split_rejects_total_mismatch(self):
		with self.assertRaises(Exception):
			_calculate_participant_amount(
				split_type="exact",
				amount=Decimal("100.00"),
				participants=[
					{"user_id": 10, "value": "30.00"},
					{"user_id": 20, "value": "30.00"},
				],
			)

	def test_exact_split_rejects_missing_values(self):
		with self.assertRaises(Exception):
			_calculate_participant_amount(
				split_type="exact",
				amount=Decimal("100.00"),
				participants=[{"user_id": 10}, {"user_id": 20}],
			)

	def test_percentage_split_scales_values_against_total(self):
		amounts = _calculate_participant_amount(
			split_type="percentage",
			amount=Decimal("200.00"),
			participants=[
				{"user_id": 10, "value": "25"},
				{"user_id": 20, "value": "75"},
			],
		)

		self.assertEqual(amounts, {10: Decimal("50.00"), 20: Decimal("150.00")})

	def test_percentage_split_rejects_total_that_is_not_100(self):
		with self.assertRaises(Exception):
			_calculate_participant_amount(
				split_type="percentage",
				amount=Decimal("100.00"),
				participants=[
					{"user_id": 10, "value": "30"},
					{"user_id": 20, "value": "30"},
				],
			)

	def test_percentage_split_rejects_missing_values(self):
		with self.assertRaises(Exception):
			_calculate_participant_amount(
				split_type="percentage",
				amount=Decimal("100.00"),
				participants=[{"user_id": 10}, {"user_id": 20}],
			)

	def test_percentage_split_balances_rounding_remainder(self):
		amounts = _calculate_participant_amount(
			split_type="percentage",
			amount=Decimal("10.00"),
			participants=[
				{"user_id": 10, "value": "33.33"},
				{"user_id": 20, "value": "33.33"},
				{"user_id": 30, "value": "33.34"},
			],
		)

		self.assertEqual(sum(amounts.values()), Decimal("10.00"))

	def test_every_split_type_totals_the_expense_amount(self):
		cases = {
			"equal": [{"user_id": 1}, {"user_id": 2}, {"user_id": 3}],
			"exact": [
				{"user_id": 1, "value": "30.00"},
				{"user_id": 2, "value": "40.00"},
				{"user_id": 3, "value": "30.00"},
			],
			"percentage": [
				{"user_id": 1, "value": "30"},
				{"user_id": 2, "value": "40"},
				{"user_id": 3, "value": "30"},
			],
		}

		for split_type, participants in cases.items():
			with self.subTest(split_type=split_type):
				amounts = _calculate_participant_amount(
					split_type=split_type,
					amount=Decimal("100.00"),
					participants=participants,
				)

				self.assertEqual(sum(amounts.values()), Decimal("100.00"))

	def test_unsupported_split_type_is_rejected(self):
		with self.assertRaises(Exception):
			_calculate_participant_amount(
				split_type="shares",
				amount=Decimal("100.00"),
				participants=[{"user_id": 10}],
			)

	def test_empty_participant_list_is_rejected(self):
		with self.assertRaises(ValidationError):
			_calculate_participant_amount(
				split_type="exact", amount=Decimal("10.00"), participants=[]
			)

	def test_duplicate_participant_is_rejected(self):
		# Keying amounts by user_id would silently collapse the duplicate and
		# store less than the expense total.
		for split_type, participants in (
			("equal", [{"user_id": 10}, {"user_id": 10}]),
			(
				"exact",
				[{"user_id": 10, "value": "50.00"}, {"user_id": 10, "value": "50.00"}],
			),
			(
				"percentage",
				[{"user_id": 10, "value": "50"}, {"user_id": 10, "value": "50"}],
			),
		):
			with self.subTest(split_type=split_type):
				with self.assertRaises(DuplicateUserInSplitError):
					_calculate_participant_amount(
						split_type=split_type,
						amount=Decimal("100.00"),
						participants=participants,
					)

	def test_null_value_is_treated_as_zero_not_a_crash(self):
		# `value` is optional on the wire, so None must not reach Decimal()
		# (which raises ConversionSyntax -> a 500). It counts as $0 / 0%.
		amounts = _calculate_participant_amount(
			split_type="exact",
			amount=Decimal("100.00"),
			participants=[
				{"user_id": 10, "value": None},
				{"user_id": 20, "value": "100.00"},
			],
		)

		self.assertEqual(
			amounts, {10: Decimal("0"), 20: Decimal("100.00")}
		)

	def test_non_numeric_value_is_rejected_cleanly(self):
		with self.assertRaises(InvalidSplitValueError):
			_calculate_participant_amount(
				split_type="exact",
				amount=Decimal("100.00"),
				participants=[
					{"user_id": 10, "value": "abc"},
					{"user_id": 20, "value": "100.00"},
				],
			)

	def test_percentage_error_is_distinct_from_exact_error(self):
		with self.assertRaises(InvalidPercentageSplitError):
			_calculate_participant_amount(
				split_type="percentage",
				amount=Decimal("100.00"),
				participants=[{"user_id": 10, "value": "40"}, {"user_id": 20, "value": "40"}],
			)


class PayerAmountTests(SimpleTestCase):
	def test_payer_amounts_are_validated_independently_of_participants(self):
		amounts = _calculate_payer_amount(
			amount=Decimal("10.00"),
			payers=[
				{"user_id": 1, "amount_paid": Decimal("4.00")},
				{"user_id": 2, "amount_paid": Decimal("6.00")},
			],
		)

		self.assertEqual(amounts, {1: Decimal("4.00"), 2: Decimal("6.00")})

	def test_payer_amounts_must_total_the_expense_amount(self):
		with self.assertRaises(Exception):
			_calculate_payer_amount(
				amount=Decimal("10.00"),
				payers=[
					{"user_id": 1, "amount_paid": Decimal("3.33")},
					{"user_id": 2, "amount_paid": Decimal("3.33")},
					{"user_id": 3, "amount_paid": Decimal("3.33")},
				],
			)

	def test_duplicate_payer_is_rejected(self):
		# A repeated user_id collapses in the dict and the stored total would fall
		# short of the expense amount.
		with self.assertRaises(DuplicateUserInSplitError):
			_calculate_payer_amount(
				amount=Decimal("100.00"),
				payers=[
					{"user_id": 1, "amount_paid": Decimal("50.00")},
					{"user_id": 1, "amount_paid": Decimal("50.00")},
				],
			)

	def test_rounded_remainder_payer_split_is_accepted(self):
		# What the frontend sends for an equal 3-way payer split of 10.00.
		amounts = _calculate_payer_amount(
			amount=Decimal("10.00"),
			payers=[
				{"user_id": 1, "amount_paid": Decimal("3.33")},
				{"user_id": 2, "amount_paid": Decimal("3.33")},
				{"user_id": 3, "amount_paid": Decimal("3.34")},
			],
		)

		self.assertEqual(
			amounts,
			{
				1: Decimal("3.33"),
				2: Decimal("3.33"),
				3: Decimal("3.34"),
			},
		)