import { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { Search, Plus, Filter, Calendar, Utensils, Plane, ShoppingCart } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'

export const Route = createFileRoute('/_authenticated/expenses')({
  component: RouteComponent,
})

interface Expense {
  id: string
  date: string
  title: string
  subtitle: string
  category: {
    label: string
    icon: React.ElementType
    colorClass: string
  }
  paidBy: {
    name: string
    avatar?: string
    fallback: string
    bgColor?: string
  }
  amount: string
  yourShare: string
  isPositive: boolean
}

const initialExpenses: Expense[] = [
  {
    id: '1',
    date: 'Oct 12',
    title: 'Dinner at Momofuku',
    subtitle: 'NYC Trip',
    category: { label: 'Food', icon: Utensils, colorClass: 'bg-rose-50 text-rose-600 border-rose-100' },
    paidBy: { name: 'You', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100', fallback: 'AC' },
    amount: '$142.50',
    yourShare: '+$71.25',
    isPositive: true,
  },
  {
    id: '2',
    date: 'Oct 10',
    title: 'Delta Flights',
    subtitle: 'NYC Trip',
    category: { label: 'Travel', icon: Plane, colorClass: 'bg-indigo-50 text-indigo-600 border-indigo-100' },
    paidBy: { name: 'Sarah', fallback: 'S', bgColor: 'bg-emerald-500 text-white' },
    amount: '$850.00',
    yourShare: '-$425.00',
    isPositive: false,
  },
  {
    id: '3',
    date: 'Oct 05',
    title: 'Groceries',
    subtitle: 'Apartment',
    category: { label: 'Groceries', icon: ShoppingCart, colorClass: 'bg-blue-50 text-blue-600 border-blue-100' },
    paidBy: { name: 'You', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100', fallback: 'AC' },
    amount: '$85.20',
    yourShare: '+$42.60',
    isPositive: true,
  },
]

function RouteComponent() {
  const [expenseList, setExpenseList] = useState<Expense[]>(initialExpenses)
  const [searchQuery, setSearchQuery] = useState('')
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newAmount, setNewAmount] = useState('')

  // Interactive search filter
  const filteredExpenses = expenseList.filter(
    (exp) =>
      exp.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      exp.subtitle.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // Handle adding a new expense
  const handleAddExpense = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTitle || !newAmount) return

    const numAmount = parseFloat(newAmount) || 0
    const newEntry: Expense = {
      id: Date.now().toString(),
      date: 'Today',
      title: newTitle,
      subtitle: 'General',
      category: { label: 'Food', icon: Utensils, colorClass: 'bg-rose-50 text-rose-600 border-rose-100' },
      paidBy: { name: 'You', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100', fallback: 'AC' },
      amount: `$${numAmount.toFixed(2)}`,
      yourShare: `+$${(numAmount / 2).toFixed(2)}`,
      isPositive: true,
    }

    setExpenseList([newEntry, ...expenseList])
    setNewTitle('')
    setNewAmount('')
    setIsDialogOpen(false)
  }

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header with Add Expense Modal */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Expenses</h1>
          <p className="text-sm text-slate-500 mt-1">Track and manage all shared costs.</p>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger render={
            <Button className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-4 py-2 flex items-center gap-2 shadow-sm">
              <Plus className="w-4 h-4" />
              <span>Add Expense</span>
            </Button>
          }/>
          <DialogContent className="sm:max-w-md bg-white rounded-2xl">
            <DialogHeader>
              <DialogTitle>Add New Expense</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleAddExpense} className="space-y-4 py-2">
              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  placeholder="e.g. Dinner, Coffee"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="amount">Amount ($)</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={newAmount}
                  onChange={(e) => setNewAmount(e.target.value)}
                />
              </div>
              <DialogFooter className="pt-2">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white">
                  Save Expense
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filter Bar with Working Search Input */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search expenses..."
            className="pl-9 bg-slate-100/80 border-0 focus-visible:ring-1 focus-visible:ring-slate-300 rounded-xl text-sm"
          />
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <Button
            variant="outline"
            onClick={() => alert('Filter options modal/dropdown logic goes here')}
            className="bg-slate-100/80 hover:bg-slate-200/80 border-0 rounded-xl gap-2 text-slate-700"
          >
            <Filter className="w-4 h-4 text-slate-500" />
            <span>Filter</span>
          </Button>
          <Button
            variant="outline"
            onClick={() => alert('Date range picker logic goes here')}
            className="bg-slate-100/80 hover:bg-slate-200/80 border-0 rounded-xl gap-2 text-slate-700"
          >
            <Calendar className="w-4 h-4 text-slate-500" />
            <span>This Month</span>
          </Button>
        </div>
      </div>

      {/* Expenses Table */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-slate-400 text-xs font-semibold uppercase tracking-wider">
                <th className="py-4 px-6 w-28">Date</th>
                <th className="py-4 px-6">Description</th>
                <th className="py-4 px-6">Category</th>
                <th className="py-4 px-6">Paid By</th>
                <th className="py-4 px-6 text-right">Amount</th>
                <th className="py-4 px-6 text-right">Your Share</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredExpenses.length > 0 ? (
                filteredExpenses.map((expense) => {
                  const CategoryIcon = expense.category.icon
                  return (
                    <tr key={expense.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-4 px-6 font-medium text-slate-600 whitespace-nowrap">
                        {expense.date}
                      </td>
                      <td className="py-4 px-6">
                        <div className="font-semibold text-slate-900">{expense.title}</div>
                        <div className="text-xs text-slate-400 mt-0.5">{expense.subtitle}</div>
                      </td>
                      <td className="py-4 px-6">
                        <Badge
                          variant="outline"
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${expense.category.colorClass}`}
                        >
                          <CategoryIcon className="w-3.5 h-3.5" />
                          {expense.category.label}
                        </Badge>
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-2">
                          <Avatar className="w-6 h-6">
                            {expense.paidBy.avatar ? (
                              <AvatarImage src={expense.paidBy.avatar} alt={expense.paidBy.name} />
                            ) : null}
                            <AvatarFallback
                              className={`text-[10px] font-bold ${
                                expense.paidBy.bgColor || 'bg-slate-200 text-slate-700'
                              }`}
                            >
                              {expense.paidBy.fallback}
                            </AvatarFallback>
                          </Avatar>
                          <span className="font-medium text-slate-700">{expense.paidBy.name}</span>
                        </div>
                      </td>
                      <td className="py-4 px-6 text-right font-semibold text-slate-900 whitespace-nowrap">
                        {expense.amount}
                      </td>
                      <td
                        className={`py-4 px-6 text-right font-bold whitespace-nowrap ${
                          expense.isPositive ? 'text-emerald-500' : 'text-rose-500'
                        }`}
                      >
                        {expense.yourShare}
                      </td>
                    </tr>
                  )
                })
              ) : (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400 text-sm">
                    No expenses found matching "{searchQuery}".
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}