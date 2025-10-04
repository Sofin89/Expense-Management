import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, User, Calendar, Clock, Filter, Search, CheckCircle, XCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { useExpenses } from '../../hooks/useExpenses';
import { useAuthStore } from '../../store/authStore';
import { formatCurrency, formatDate, formatDistanceToNow } from '../../utils';

export const ApprovalQueue = () => {
  const { approvals, updateExpenseStatus, fetchApprovals } = useExpenses();
  const { user } = useAuthStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [loadingAction, setLoadingAction] = useState(null);

  const handleApprove = async (expenseId, comment = '') => {
    setLoadingAction(expenseId);
    const result = await updateExpenseStatus(expenseId, 'approved', comment);
    setLoadingAction(null);
    
    if (result.success) {
      // Success handled by store update
    } else {
      alert(result.error);
    }
  };

  const handleReject = async (expenseId, comment = '') => {
    const rejectComment = comment || prompt('Please provide a reason for rejection:');
    if (rejectComment === null) return; // User cancelled
    
    setLoadingAction(expenseId);
    const result = await updateExpenseStatus(expenseId, 'rejected', rejectComment);
    setLoadingAction(null);
    
    if (result.success) {
      // Success handled by store update
    } else {
      alert(result.error);
    }
  };

  const handleQuickApprove = async (expenseId) => {
    await handleApprove(expenseId, 'Approved via quick action');
  };

  const handleQuickReject = async (expenseId) => {
    await handleReject(expenseId, 'Rejected via quick action');
  };

  const filteredApprovals = approvals.filter(expense => {
    const matchesSearch = 
      expense.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      expense.submitter?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      expense.description?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || expense.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const getUrgencyColor = (createdAt) => {
    const daysOld = (Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60 * 24);
    if (daysOld > 7) return 'text-red-500';
    if (daysOld > 3) return 'text-orange-500';
    return 'text-green-500';
  };

  const getUrgencyBadge = (createdAt) => {
    const daysOld = (Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60 * 24);
    if (daysOld > 7) return { variant: 'destructive', text: 'Overdue' };
    if (daysOld > 3) return { variant: 'warning', text: 'Urgent' };
    return { variant: 'default', text: 'Recent' };
  };

  if (approvals.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <CheckCircle className="h-16 w-16 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">No pending approvals</h3>
          <p className="text-muted-foreground text-center">
            You're all caught up! There are no expenses waiting for your approval.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <AlertCircle className="h-5 w-5 text-orange-500" />
          <span>Approval Queue</span>
          <Badge variant="secondary" className="ml-2">
            {filteredApprovals.length} pending
          </Badge>
        </CardTitle>
        <CardDescription>
          Review and approve expense submissions from your team
        </CardDescription>
        
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mt-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search expenses..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="input w-full sm:w-40"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="space-y-4">
          <AnimatePresence>
            {filteredApprovals.map((expense, index) => (
              <motion.div
                key={expense._id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ delay: index * 0.1 }}
                className="p-4 border rounded-lg hover:shadow-md transition-shadow"
              >
                <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                  {/* Expense Details */}
                  <div className="flex-1 space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                          <User className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <h4 className="font-semibold text-lg">{expense.title}</h4>
                          <div className="flex items-center space-x-4 text-sm text-muted-foreground mt-1">
                            <span className="flex items-center space-x-1">
                              <User className="h-3 w-3" />
                              <span>{expense.submitter?.name}</span>
                            </span>
                            <span className="flex items-center space-x-1">
                              <Calendar className="h-3 w-3" />
                              <span>{formatDate(expense.date)}</span>
                            </span>
                            <span className="flex items-center space-x-1">
                              <Clock className="h-3 w-3" />
                              <span className={getUrgencyColor(expense.createdAt)}>
                                {formatDistanceToNow(expense.createdAt)} ago
                              </span>
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Badge variant="outline" className="text-sm">
                          {expense.category}
                        </Badge>
                        <Badge variant={expense.status}>
                          {expense.status}
                        </Badge>
                        {expense.status === 'pending' && (
                          <Badge variant={getUrgencyBadge(expense.createdAt).variant}>
                            {getUrgencyBadge(expense.createdAt).text}
                          </Badge>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                      
                      {expense.description && (
                        <div className="md:col-span-2">
                          <p className="text-sm text-muted-foreground">
                            {expense.description}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Approval History */}
                    {expense.approvalHistory && expense.approvalHistory.length > 0 && (
                      <div className="bg-muted/50 rounded-lg p-3">
                        <h5 className="text-sm font-medium mb-2">Approval History</h5>
                        <div className="space-y-2">
                          {expense.approvalHistory.map((history, idx) => (
                            <div key={idx} className="flex items-center justify-between text-xs">
                              <span className="font-medium">{history.approverName}</span>
                              <Badge variant={history.status === 'approved' ? 'approved' : 'rejected'}>
                                {history.status}
                              </Badge>
                              <span className="text-muted-foreground">
                                {formatDate(history.timestamp)}
                              </span>
                              {history.comment && (
                                <span className="text-muted-foreground flex-1 ml-4">
                                  "{history.comment}"
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Action Buttons */}
                  {expense.status === 'pending' && (
                    <div className="flex flex-col space-y-2 min-w-[200px]">
                      <Button
                        onClick={() => handleQuickApprove(expense._id)}
                        disabled={loadingAction === expense._id}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        {loadingAction === expense._id ? (
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        ) : (
                          <CheckCircle className="h-4 w-4 mr-2" />
                        )}
                        Approve
                      </Button>
                      
                      <Button
                        onClick={() => handleQuickReject(expense._id)}
                        disabled={loadingAction === expense._id}
                        variant="outline"
                        className="text-red-600 border-red-600 hover:bg-red-50"
                      >
                        {loadingAction === expense._id ? (
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600"></div>
                        ) : (
                          <XCircle className="h-4 w-4 mr-2" />
                        )}
                        Reject
                      </Button>

                      <Button
                        onClick={() => {
                          const comment = prompt('Please provide an approval comment (optional):');
                          if (comment !== null) {
                            handleApprove(expense._id, comment);
                          }
                        }}
                        variant="outline"
                        size="sm"
                        disabled={loadingAction === expense._id}
                      >
                        Approve with Comment
                      </Button>
                    </div>
                  )}
                </div>

                {/* Receipt Preview */}
                {expense.receiptUrl && (
                  <div className="mt-4 pt-4 border-t">
                    <h5 className="text-sm font-medium mb-2">Receipt</h5>
                    <div className="flex items-center space-x-2">
                      <img
                        src={expense.receiptUrl}
                        alt="Receipt"
                        className="w-20 h-20 object-cover rounded border cursor-pointer"
                        onClick={() => window.open(expense.receiptUrl, '_blank')}
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(expense.receiptUrl, '_blank')}
                      >
                        View Full Receipt
                      </Button>
                    </div>
                  </div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>

          {filteredApprovals.length === 0 && (
            <div className="text-center py-12">
              <Filter className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No matching expenses</h3>
              <p className="text-muted-foreground">
                Try adjusting your search criteria
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};