import { z } from 'zod'

export const SplitTypeEnum = z.enum(['equal', 'exact', 'percentage'])
export type SplitType = z.infer<typeof SplitTypeEnum>

export const expenseSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  category_id: z.coerce.number({ message: 'Select a category' }).min(1, 'Category is required'),
  amount: z.coerce.number({ message: 'Enter amount' }).positive('Amount must be greater than 0'),
  split_type: SplitTypeEnum, // Validates 'equal' | 'exact' | 'percentage'
  payers: z
  .array(
    z.object({
      user_id: z.number({ message: 'User ID is required' }),
      amount_paid: z.coerce.string().min(1, 'Amount paid is required'),
      // or if you still want numeric validation but output a string:
      // amount_paid: z.number().min(0).transform((n) => String(n)),
    })
  )
  .min(1, 'Select at least one payer'),

  participants: z
    .array(
      z.object({
        user_id: z.number({ message: 'User ID must be a number' }),
      })
    )
    .min(1, 'Select at least one participant')
})

export type CreateExpenseInput = z.infer<typeof expenseSchema>

