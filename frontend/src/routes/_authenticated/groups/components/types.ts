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

export type GroupBalance = {
  id: string
  name: string
  avatarUrl: string
  statusText: string
  amount: number
  statusType: GroupBalanceStatus
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
