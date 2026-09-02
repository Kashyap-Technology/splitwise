import type { LucideIcon } from 'lucide-react'

export type GroupBalanceStatus = 'credit' | 'settled' | 'debt'

export type GroupExpense = {
  id: string
  title: string
  date: string
  paidBy: string
  icon: LucideIcon
  totalAmount: number
  yourAmount: number
}

export interface GroupBalance {
  id: number
  name: string
  avatarUrl?: string
  amount: number
  statusType: 'credit' | 'debit' | 'settled'
  statusText: string
}

export type GroupDetails = {
  id: string
  name: string
  description: string
  totalSpend: number
  totalExpensesCount: number
  userBalance: number
  settlePeopleCount: number
  expenses: GroupExpense[]
  balances: GroupBalance[]
}

export type ExpenseCategory = {
  id: number
  name: string
}

export type GroupMember = {
  id: number
  name: string
}
