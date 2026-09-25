import { z } from 'zod'

export const SplitTypeEnum = z.enum(['equal', 'exact', 'percentage'])
export type SplitType = z.infer<typeof SplitTypeEnum>

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
    .min(1, 'Select at least one payer'),
  participants: z
    .array(
      z.object({
        user_id: z.number({ message: 'User ID must be a number' }),
        amount_to_pay: z.coerce.string().optional(),
        percentage: z.coerce.string().optional(),
      }),
    )
    .min(1, 'Select at least one participant'),
}).superRefine((expense, context) => {
  const paidTotal = expense.payers.reduce(
    (total, payer) => total + Number(payer.amount_paid || 0),
    0,
  )

  if (expense.split_type !== 'equal' && (
    expense.payers.some((payer) => Number(payer.amount_paid || 0) <= 0) ||
    Math.abs(paidTotal - expense.amount) > 0.001
  )) {
    context.addIssue({
      code: 'custom',
      path: ['payers'],
      message: `Payer amounts must add up to $${expense.amount.toFixed(2)}`,
    })
  }

  if (expense.split_type === 'exact') {
    const participantTotal = expense.participants.reduce(
      (total, participant) => total + Number(participant.amount_to_pay || 0),
      0,
    )

    if (
      expense.participants.some(
        (participant) => Number(participant.amount_to_pay || 0) <= 0,
      ) ||
      Math.abs(participantTotal - expense.amount) > 0.001
    ) {
      context.addIssue({
        code: 'custom',
        path: ['participants'],
        message: `Exact amounts must add up to $${expense.amount.toFixed(2)}`,
      })
    }
  }

  if (expense.split_type === 'percentage') {
    const percentageTotal = expense.participants.reduce(
      (total, participant) => total + Number(participant.percentage || 0),
      0,
    )

    if (
      expense.participants.some(
        (participant) => Number(participant.percentage || 0) <= 0,
      ) ||
      Math.abs(percentageTotal - 100) > 0.001
    ) {
      context.addIssue({
        code: 'custom',
        path: ['participants'],
        message: 'Percentages must add up to 100%',
      })
    }
  }
})

export type CreateExpenseInput = z.infer<typeof expenseSchema>
