export interface ApiExpensePayload {
  title: string
  category_id: number
  amount: number
  split_type: string
  payers: Array<{
    user_id: number
    amount_paid: string
  }>
  participants: Array<{
    user_id: number
  }>
}

export interface ExpenseCategoryResponse {

  id: number
  name: string
  icon: null
  created_by: string
}

export interface ExpenseResponse {
  id: number
  title: string
  split_type: string
  amount: number
  category_id: number
  category_name: string

}