import React from 'react';
import { motion } from 'framer-motion';
import { AlertCircle, User, Calendar } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { useExpenses } from '../../hooks/useExpenses';
import { formatCurrency, formatDate } from '../../utils';

export const ApprovalQueue = () => {
  const { approvals, updateExpenseStatus } = useExpenses();

  if (approvals.length === 0) {
    return null;
  }

  const handleApprove = async (expenseId) => {
    await updateExpenseStatus(expenseId, 'approved', 'Approved via dashboard');
  };

  const handleReject = async (expenseId) => {
    await updateExpenseStatus(expenseId, 'rejected', 'Rejected via dashboard');
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <AlertCircle className="h-5 w-5 text-orange-500" />
          <span>Approval Queue</span>
          <Badge variant="secondary">{approvals.length}</Badge>
        </CardTitle>
        <CardDescription>
          Expenses awaiting your approval
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {approvals.map((expense, index) => (
            <motion.div
              key={expense._id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className="p-4 border rounded-lg space-y-3"
            >
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="font-medium">{expense.title}</h4>
                  <p className="text-sm text-muted-foreground">{expense.category}</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold">
                    {formatCurrency(expense.amount, expense.currency)}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                <div className="flex items-center space-x-1">
                  <User className="h-3 w-3" />
                  <span>{expense.submitter?.name}</span>
                </div>
                <div className="flex items-center space-x-1">
                  <Calendar className="h-3 w-3" />
                  <span>{formatDate(expense.date)}</span>
                </div>
              </div>
              
              {expense.description && (
                <p className="text-sm text-muted-foreground">{expense.description}</p>
              )}
              
              <div className="flex space-x-2">
                <Button
                  size="sm"
                  onClick={() => handleApprove(expense._id)}
                  className="flex-1"
                >
                  Approve
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleReject(expense._id)}
                  className="flex-1"
                >
                  Reject
                </Button>
              </div>
            </motion.div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};