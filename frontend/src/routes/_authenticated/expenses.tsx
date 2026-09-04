import { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { Search, Plus, Filter, Calendar, Utensils, Plane, ShoppingCart, Info } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { useUserExpenseQuery } from '@/features/expense/api/useExpenseQuery'

export const Route = createFileRoute('/_authenticated/expenses')({
  component: RouteComponent,
})

interface ApiExpense {
  id: number
  title: string
  split_type: string
  amount: string
  category_id: number
  category_name: string
  group_id: number
  group_name: string
}

// Map category names to icons and colors
const getCategoryDetails = (categoryName: string) => {
  switch (categoryName?.toLowerCase()) {
    case 'food':
      return { icon: Utensils, colorClass: 'bg-rose-50 text-rose-600 border-rose-100' }
    case 'transport':
      return { icon: Plane, colorClass: 'bg-indigo-50 text-indigo-600 border-indigo-100' }
    default:
      return { icon: ShoppingCart, colorClass: 'bg-blue-50 text-blue-600 border-blue-100' }
  }
}

function RouteComponent() {
  const [searchQuery, setSearchQuery] = useState('')
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [selectedExpense, setSelectedExpense] = useState<ApiExpense | null>(null)
  const [isDetailOpen, setIsDetailOpen] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newAmount, setNewAmount] = useState('')
  
  const { data, isLoading } = useUserExpenseQuery()
  const expenses=data??[]

  // Extract expenses array safely from API response structure
  


  // Interactive search filter
  const filteredExpenses = expenses.filter(
    (exp:{[key:string]:any}) =>
      exp.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      exp.group_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      exp.category_name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleAddExpense = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTitle || !newAmount) return
    // Add mutation logic here
    setNewTitle('')
    setNewAmount('')
    setIsDialogOpen(false)
  }

  const handleRowClick = (expense: ApiExpense) => {
    setSelectedExpense(expense)
    setIsDetailOpen(true)
  }

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
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
            className="bg-slate-100/80 hover:bg-slate-200/80 border-0 rounded-xl gap-2 text-slate-700"
          >
            <Filter className="w-4 h-4 text-slate-500" />
            <span>Filter</span>
          </Button>
          <Button
            variant="outline"
            className="bg-slate-100/80 hover:bg-slate-200/80 border-0 rounded-xl gap-2 text-slate-700"
          >
            <Calendar className="w-4 h-4 text-slate-500" />
            <span>This Month</span>
          </Button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-slate-400 text-xs font-semibold uppercase tracking-wider">
                <th className="py-4 px-6 w-28">ID</th>
                <th className="py-4 px-6">Description</th>
                <th className="py-4 px-6">Category</th>
                <th className="py-4 px-6">Group</th>
                <th className="py-4 px-6 text-right">Amount</th>
                <th className="py-4 px-6 text-right">Split Type</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400 text-sm">
                    Loading expenses...
                  </td>
                </tr>
              ) : filteredExpenses.length > 0 ? (
                filteredExpenses.map((expense) => {
                  const categoryInfo = getCategoryDetails(expense.category_name)
                  const CategoryIcon = categoryInfo.icon
                  const formattedAmount = parseFloat(expense.amount).toFixed(2)

                  return (
                    <tr
                      key={expense.id}
                      onClick={() => handleRowClick(expense)}
                      className="hover:bg-slate-50/50 transition-colors cursor-pointer"
                    >
                      <td className="py-4 px-6 font-medium text-slate-600 whitespace-nowrap">
                        #{expense.id}
                      </td>
                      <td className="py-4 px-6">
                        <div className="font-bold text-lg text-slate-700">{expense.title}</div>
                      </td>
                      <td className="py-4 px-6">
                        <Badge
                          variant="outline"
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${categoryInfo.colorClass}`}
                        >
                          <CategoryIcon className="w-3.5 h-3.5" />
                          {expense.category_name}
                        </Badge>
                      </td>
                      <td className="py-4 px-6">
                        <span className="font-medium text-slate-700">{expense.group_name}</span>
                      </td>
                      <td className="py-4 px-6 text-right font-semibold text-slate-900 whitespace-nowrap">
                        ${formattedAmount}
                      </td>
                      <td className="py-4 px-6 text-right capitalize text-slate-600 font-medium whitespace-nowrap">
                        {expense.split_type}
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

      {/* Expense Detail Dialog */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="sm:max-w-md bg-white rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Info className="w-5 h-5 text-blue-600" />
              Expense Details
            </DialogTitle>
          </DialogHeader>
          {selectedExpense && (
            <div className="space-y-4 py-2">
              <div className="bg-slate-50 p-4 rounded-xl space-y-3">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-500">Expense ID</span>
                  <span className="font-semibold text-slate-900">#{selectedExpense.id}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-500">Title</span>
                  <span className="font-semibold text-slate-900">{selectedExpense.title}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-500">Amount</span>
                  <span className="font-bold text-slate-900">${parseFloat(selectedExpense.amount).toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-500">Category</span>
                  <span className="font-medium text-slate-900">{selectedExpense.category_name}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-500">Group</span>
                  <span className="font-medium text-slate-900">{selectedExpense.group_name}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-500">Split Type</span>
                  <span className="font-medium capitalize text-slate-900">{selectedExpense.split_type}</span>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setIsDetailOpen(false)}  className="w-full hover:bg-slate-800 text-white">
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}