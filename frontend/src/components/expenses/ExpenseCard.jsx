import React from 'react';
import { motion } from 'framer-motion';
import { FileText, Calendar, User, MessageCircle, Download } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { formatCurrency, formatDate } from '../../utils';

export const ExpenseCard = ({ expense, onAction, showActions = false, isApprover = false }) => {
  const getStatusVariant = (status) => {
    const variants = {
      pending: 'pending',
      approved: 'approved',
      rejected: 'rejected'
    };
    return variants[status] || 'default';
  };

  const handleApprove = () => {
    onAction?.(expense._id, 'approved');
  };

  const handleReject = () => {
    onAction?.(expense._id, 'rejected');
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="hover:shadow-md transition-shadow">
        <CardHeader className="pb-3">
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                {expense.title}
              </CardTitle>
              <CardDescription className="flex items-center gap-4 mt-2">
                <span className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  {formatDate(expense.date)}
                </span>
                {expense.submitter && (
                  <span className="flex items-center gap-1">
                    <User className="h-4 w-4" />
                    {expense.submitter.name}
                  </span>
                )}
              </CardDescription>
            </div>
            <Badge variant={getStatusVariant(expense.status)} className="capitalize">
              {expense.status}
            </Badge>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* Amount and Currency */}
          <div className="flex justify-between items-center">
            <div>
              <p className="text-2xl font-bold text-primary">
                {formatCurrency(expense.amount, expense.currency)}
              </p>
              {expense.convertedAmount && expense.currency !== expense.companyCurrency && (
                <p className="text-sm text-muted-foreground">
                  {formatCurrency(expense.convertedAmount, expense.companyCurrency)}
                </p>
              )}
            </div>
            <Badge variant="outline" className="text-sm">
              {expense.category}
            </Badge>
          </div>

          {/* Description */}
          {expense.description && (
            <div>
              <p className="text-sm text-muted-foreground">{expense.description}</p>
            </div>
          )}

          {/* Approver Comment */}
          {expense.approverComment && (
            <div className="bg-muted/50 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <MessageCircle className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Approver Comment</span>
              </div>
              <p className="text-sm text-muted-foreground">{expense.approverComment}</p>
            </div>
          )}

          {/* Receipt and Actions */}
          <div className="flex justify-between items-center pt-2 border-t">
            {expense.receiptUrl && (
              <Button
                variant="outline"
                size="sm"
                asChild
              >
                <a href={expense.receiptUrl} target="_blank" rel="noopener noreferrer">
                  <Download className="h-4 w-4 mr-2" />
                  View Receipt
                </a>
              </Button>
            )}
            
            {showActions && isApprover && expense.status === 'pending' && (
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={handleApprove}
                  className="bg-green-600 hover:bg-green-700"
                >
                  Approve
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleReject}
                  className="text-red-600 border-red-600 hover:bg-red-50"
                >
                  Reject
                </Button>
              </div>
            )}
          </div>

          {/* Audit Trail */}
          {expense.auditTrail && expense.auditTrail.length > 0 && (
            <div className="text-xs text-muted-foreground">
              Last updated: {formatDate(expense.updatedAt)}
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
};