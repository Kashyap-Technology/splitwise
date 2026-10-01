import { z } from 'zod'

export const SplitTypeEnum = z.enum(['equal', 'exact', 'percentage'])
export type SplitType = z.infer<typeof SplitTypeEnum>

const round2 = (n: number) => Math.round(n * 100) / 100

// The backend compares payer, exact and percentage totals exactly, using
// Decimal arithmetic. This tolerance only absorbs float summation error here.
const FLOAT_EPSILON = 1e-6

// A payer who contributed nothing is a participant, not a payer: the model
// enforces MinValueValidator(1.0) on ExpensePayer.amount_paid, so sending a $0
// payer fails validation server-side. These are dropped from the payload rather
// than rejected, since "Alice paid all of it, Bob paid nothing" is a legitimate
// expense that the user expresses by selecting both under Paid By.
export const activePayers = <T extends { amount_paid?: string | null }>(
  payers: T[]
): T[] =>
  payers.filter((payer) => {
    const paid = Number(payer.amount_paid ?? 0)
    return Number.isFinite(paid) && paid > 0
  })

export const expenseSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  category_id: z.coerce.number({ message: 'Select a category' }).min(1, 'Category is required'),
  amount: z.coerce.number({ message: 'Enter amount' }).positive('Amount must be greater than 0'),
  split_type: SplitTypeEnum,
  payers: z
    .array(
      z.object({
        user_id: z.number({ message: 'User ID is required' }),
        amount_paid: z.coerce.string().optional(),
      }),
    )
    .min(1, 'Select at least one payer')
    // The backend keys amounts by user_id, so a repeated user would collapse and
    // silently drop money from the split.
    .refine(
      (payers) => new Set(payers.map((p) => Number(p.user_id))).size === payers.length,
      { message: 'The same payer cannot be selected twice' },
    ),
  participants: z
    .array(
      z.object({
        user_id: z.number({ message: 'User ID must be a number' }),
        // Dollars for exact, percent for percentage. The backend ignores it for equal.
        value: z.coerce.number().nullish(),
      }),
    )
    .min(1, 'Select at least one participant')
    .refine(
      (participants) =>
        new Set(participants.map((p) => Number(p.user_id))).size === participants.length,
      { message: 'The same participant cannot be selected twice' },
    ),
}).superRefine((expense, context) => {
  // Payer amounts are always explicit and independent of split_type: the split
  // type only governs how the owed amount is distributed across participants.
  // Mirrors _calculate_payer_amount in the backend, which requires the total
  // paid to match the expense amount exactly for every split type.
  //
  // Payers contributing nothing are ignored rather than counted as an error, so
  // this reports only a genuine total mismatch.
  const paying = activePayers(expense.payers)
  const paidTotal = paying.reduce(
    (total, payer) => total + Number(payer.amount_paid || 0),
    0,
  )

  if (paying.length === 0) {
    context.addIssue({
      code: 'custom',
      path: ['payers'],
      message: 'Enter how much each payer paid',
    })
  } else if (Math.abs(paidTotal - expense.amount) > FLOAT_EPSILON) {
    context.addIssue({
      code: 'custom',
      path: ['payers'],
      message: `Payer amounts must add up to $${expense.amount.toFixed(2)} (currently $${round2(paidTotal)})`,
    })
  }

  // The backend compares these totals exactly (Decimal arithmetic), so the
  // tolerance here only absorbs float summation error, not real drift.
  if (expense.split_type === 'exact') {
    // Negative shares would make the model's MinValueValidator reject the row
    // and, worse, would let one member owe money to the group.
    const negative = expense.participants.find((p) => (p.value ?? 0) < 0)
    if (negative) {
      context.addIssue({
        code: 'custom',
        path: ['participants'],
        message: 'Owed amounts cannot be negative',
      })
      return
    }

    const total = expense.participants.reduce(
      (sum, p) => sum + (p.value ?? 0),
      0,
    )
    if (Math.abs(total - expense.amount) > FLOAT_EPSILON) {
      context.addIssue({
        code: 'custom',
        path: ['participants'],
        message: `Exact amounts must add up to $${expense.amount.toFixed(2)} (currently $${total.toFixed(2)})`,
      })
    }
  }

  if (expense.split_type === 'percentage') {
    const negative = expense.participants.find((p) => (p.value ?? 0) < 0)
    if (negative) {
      context.addIssue({
        code: 'custom',
        path: ['participants'],
        message: 'Percentages cannot be negative',
      })
      return
    }

    const total = expense.participants.reduce(
      (sum, p) => sum + (p.value ?? 0),
      0,
    )
    if (Math.abs(total - 100) > FLOAT_EPSILON) {
      context.addIssue({
        code: 'custom',
        path: ['participants'],
        message: `Percentages must add up to 100% (currently ${round2(total)}%)`,
      })
    }
  }
})

export type CreateExpenseInput = z.infer<typeof expenseSchema>
