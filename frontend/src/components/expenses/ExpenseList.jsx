import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileText, Clock, CheckCircle, XCircle, Search, Filter, Download } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { useExpenses } from '../../hooks/useExpenses';
import { formatCurrency, formatDate, getStatusColor } from '../../utils';

const statusFilters = ['all', 'pending', 'approved', 'rejected'];
const categoryFilters = ['all', 'Travel', 'Meals', 'Entertainment', 'Office Supplies', 'Software', 'Hardware', 'Training', 'Other'];

export const ExpenseList = () => {
  const { expenses } = useExpenses();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [sortBy, setSortBy] = useState('date');

  const getStatusIcon = (status) => {
    const icons = {
      pending: Clock,
      approved: CheckCircle,
      rejected: XCircle,
    };
    const Icon = icons[status] || Clock;
    return <Icon className="h-4 w-4" />;
  };

  const filteredExpenses = expenses
    .filter(expense => {
      const matchesSearch = expense.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           expense.description?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'all' || expense.status === statusFilter;
      const matchesCategory = categoryFilter === 'all' || expense.category === categoryFilter;
      
      return matchesSearch && matchesStatus && matchesCategory;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'amount':
          return b.amount - a.amount;
        case 'title':
          return a.title.localeCompare(b.title);
        case 'date':
        default:
          return new Date(b.date) - new Date(a.date);
      }
    });

  const getTotalAmount = () => {
    return filteredExpenses.reduce((total, expense) => total + (expense.convertedAmount || expense.amount), 0);
  };

  if (expenses.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <FileText className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">No expenses yet</h3>
          <p className="text-muted-foreground text-center mb-4">
            Submit your first expense to see it listed here.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Expense History</CardTitle>
        <CardDescription>
          View and manage your submitted expenses
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Filters and Search */}
        <div className="space-y-4 mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search expenses..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="input text-sm"
              >
                {statusFilters.map(filter => (
                  <option key={filter} value={filter}>
                    Status: {filter.charAt(0).toUpperCase() + filter.slice(1)}
                  </option>
                ))}
              </select>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="input text-sm"
              >
                {categoryFilters.map(filter => (
                  <option key={filter} value={filter}>
                    Category: {filter === 'all' ? 'All' : filter}
                  </option>
                ))}
              </select>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="input text-sm"
              >
                <option value="date">Sort by: Date</option>
                <option value="amount">Sort by: Amount</option>
                <option value="title">Sort by: Title</option>
              </select>
            </div>
          </div>
          
          {/* Summary */}
          <div className="flex justify-between items-center text-sm text-muted-foreground">
            <span>
              Showing {filteredExpenses.length} of {expenses.length} expenses
            </span>
            {filteredExpenses.length > 0 && (
              <span className="font-medium">
                Total: {formatCurrency(getTotalAmount())}
              </span>
            )}
          </div>
        </div>

        {/* Expenses List */}
        <div className="space-y-4">
          <AnimatePresence>
            {filteredExpenses.map((expense, index) => (
              <motion.div
                key={expense._id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ delay: index * 0.05 }}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center space-x-4 flex-1 min-w-0">
                  <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                    <FileText className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-1">
                      <h4 className="font-medium truncate">{expense.title}</h4>
                      <Badge variant="outline" className="text-xs">
                        {expense.category}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground truncate">
                      {formatDate(expense.date)}
                      {expense.description && ` • ${expense.description}`}
                    </p>
                    {expense.approverComment && (
                      <p className="text-sm text-muted-foreground mt-1">
                        <strong>Comment:</strong> {expense.approverComment}
                      </p>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center space-x-4 flex-shrink-0 ml-4">
                  <div className="text-right">
                    <p className="font-semibold">
                      {formatCurrency(expense.amount, expense.currency)}
                    </p>
                    {expense.convertedAmount && expense.currency !== expense.companyCurrency && (
                      <p className="text-xs text-muted-foreground">
                        {formatCurrency(expense.convertedAmount, expense.companyCurrency)}
                      </p>
                    )}
                  </div>
                  
                  <Badge 
                    variant={expense.status} 
                    className="flex items-center space-x-1 min-w-[100px] justify-center"
                  >
                    {getStatusIcon(expense.status)}
                    <span className="capitalize">{expense.status}</span>
                  </Badge>

                  {expense.receiptUrl && (
                    <Button
                      variant="ghost"
                      size="icon"
                      asChild
                    >
                      <a href={expense.receiptUrl} target="_blank" rel="noopener noreferrer">
                        <Download className="h-4 w-4" />
                      </a>
                    </Button>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {filteredExpenses.length === 0 && (
            <div className="text-center py-12">
              <Filter className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No matching expenses</h3>
              <p className="text-muted-foreground">
                Try adjusting your search or filters
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};