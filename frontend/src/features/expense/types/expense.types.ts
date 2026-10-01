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
  icon: string | null
  created_by: string | null
  // Sent by /expenses/category/list/ so the categories screen can show which
  // categories are in use and what each has cost the viewer. `expense_count` is
  // global; `your_spend` is the viewer's own participant share.
  expense_count: number
  your_spend: string
}

export interface ExpenseResponse {
  id: number
  title: string
  split_type: string
  amount: number
  category_id: number
  category_name: string

}

export interface UserExpensesResponse{
  id:number
  title:string
  split_type:string
  amount:string
  category_id:number
  category_name:string
  group_id:number
  group_name:string
  // Added by /expenses/user/expenses/ so the feed can be grouped by day and
  // each row can show the viewer's own share instead of only the group total.
  created_at:string
  your_paid:string
  your_share:string
}