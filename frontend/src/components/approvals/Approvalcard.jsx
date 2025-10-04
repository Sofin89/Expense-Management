import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { User, Calendar, FileText, MessageCircle, CheckCircle, XCircle, Clock, Download } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { useExpenses } from '../../hooks/useExpenses';
import { formatCurrency, formatDate, formatDistanceToNow } from '../../utils';

export const ApprovalCard = ({ expense, compact = false }) => {
  const { updateExpenseStatus } = useExpenses();
  const [loading, setLoading] = useState(false);
  const [showCommentInput, setShowCommentInput] = useState(false);
  const [comment, setComment] = useState('');

  const handleAction = async (status, customComment = '') => {
    setLoading(true);
    const finalComment = customComment || comment;
    const result = await updateExpenseStatus(expense._id, status, finalComment);
    setLoading(false);
    
    if (result.success) {
      setShowCommentInput(false);
      setComment('');
    } else {
      alert(result.error);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      approved: 'bg-green-100 text-green-800 border-green-200',
      rejected: 'bg-red-100 text-red-800 border-red-200',
    };
    return colors[status] || colors.pending;
  };

  const getStatusIcon = (status) => {
    const icons = {
      pending: Clock,
      approved: CheckCircle,
      rejected: XCircle,
    };
    const Icon = icons[status];
    return <Icon className="h-4 w-4" />;
  };

  if (compact) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.2 }}
      >
        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3 flex-1 min-w-0">
                <div className="w-8 h-8 bg-primary/10 rounded flex items-center justify-center flex-shrink-0">
                  <FileText className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium truncate">{expense.title}</h4>
                  <p className="text-sm text-muted-foreground truncate">
                    {expense.submitter?.name} • {formatDate(expense.date)}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center space-x-3 ml-4">
                <div className="text-right">
                  <p className="font-semibold">
                    {formatCurrency(expense.amount, expense.currency)}
                  </p>
                </div>
                
                <Badge 
                  variant={expense.status} 
                  className="flex items-center space-x-1 min-w-[80px] justify-center"
                >
                  {getStatusIcon(expense.status)}
                  <span className="capitalize">{expense.status}</span>
                </Badge>

                {expense.status === 'pending' && (
                  <div className="flex space-x-1">
                    <Button
                      size="sm"
                      onClick={() => handleAction('approved')}
                      disabled={loading}
                      className="h-8 w-8 p-0 bg-green-600 hover:bg-green-700"
                    >
                      <CheckCircle className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleAction('rejected')}
                      disabled={loading}
                      className="h-8 w-8 p-0 text-red-600 border-red-600 hover:bg-red-50"
                    >
                      <XCircle className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="hover:shadow-lg transition-all duration-200">
        <CardHeader className="pb-3">
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <CardTitle className="flex items-center gap-2 text-lg">
                <FileText className="h-5 w-5 text-primary" />
                {expense.title}
              </CardTitle>
              <CardDescription className="flex items-center gap-4 mt-2">
                <span className="flex items-center gap-1">
                  <User className="h-4 w-4" />
                  {expense.submitter?.name}
                </span>
                <span className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  {formatDate(expense.date)}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  {formatDistanceToNow(expense.createdAt)} ago
                </span>
              </CardDescription>
            </div>
            <Badge variant={expense.status} className="capitalize">
              {getStatusIcon(expense.status)}
              {expense.status}
            </Badge>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* Amount and Category */}
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

          {/* Receipt */}
          {expense.receiptUrl && (
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center space-x-3">
                <img
                  src={expense.receiptUrl}
                  alt="Receipt preview"
                  className="w-12 h-12 object-cover rounded border"
                />
                <span className="text-sm font-medium">Receipt attached</span>
              </div>
              <Button
                variant="outline"
                size="sm"
                asChild
              >
                <a href={expense.receiptUrl} target="_blank" rel="noopener noreferrer">
                  <Download className="h-4 w-4 mr-2" />
                  View
                </a>
              </Button>
            </div>
          )}

          {/* Approval History */}
          {expense.approvalHistory && expense.approvalHistory.length > 0 && (
            <div className="border-t pt-4">
              <h5 className="text-sm font-medium mb-2 flex items-center gap-2">
                <MessageCircle className="h-4 w-4" />
                Approval History
              </h5>
              <div className="space-y-2">
                {expense.approvalHistory.map((history, index) => (
                  <div key={index} className="flex items-center justify-between text-xs p-2 bg-muted/30 rounded">
                    <span className="font-medium">{history.approverName}</span>
                    <Badge variant={history.status === 'approved' ? 'approved' : 'rejected'}>
                      {history.status}
                    </Badge>
                    <span className="text-muted-foreground">
                      {formatDate(history.timestamp)}
                    </span>
                    {history.comment && (
                      <span className="text-muted-foreground flex-1 ml-4 truncate">
                        "{history.comment}"
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Action Buttons for Pending Expenses */}
          {expense.status === 'pending' && (
            <div className="border-t pt-4 space-y-3">
              {showCommentInput ? (
                <div className="space-y-2">
                  <textarea
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="Add a comment (optional)"
                    rows={3}
                    className="input resize-none"
                  />
                  <div className="flex space-x-2">
                    <Button
                      onClick={() => handleAction('approved')}
                      disabled={loading}
                      className="flex-1 bg-green-600 hover:bg-green-700"
                    >
                      {loading ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      ) : (
                        <CheckCircle className="h-4 w-4 mr-2" />
                      )}
                      Approve
                    </Button>
                    <Button
                      onClick={() => handleAction('rejected')}
                      disabled={loading}
                      variant="outline"
                      className="flex-1 text-red-600 border-red-600 hover:bg-red-50"
                    >
                      {loading ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600"></div>
                      ) : (
                        <XCircle className="h-4 w-4 mr-2" />
                      )}
                      Reject
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={() => {
                        setShowCommentInput(false);
                        setComment('');
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex space-x-2">
                  <Button
                    onClick={() => handleAction('approved', 'Approved')}
                    disabled={loading}
                    className="flex-1 bg-green-600 hover:bg-green-700"
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Quick Approve
                  </Button>
                  <Button
                    onClick={() => handleAction('rejected', 'Rejected')}
                    disabled={loading}
                    variant="outline"
                    className="flex-1 text-red-600 border-red-600 hover:bg-red-50"
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Quick Reject
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setShowCommentInput(true)}
                    disabled={loading}
                  >
                    <MessageCircle className="h-4 w-4 mr-2" />
                    Add Comment
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Current Status Display */}
          {expense.status !== 'pending' && expense.approverComment && (
            <div className="bg-muted/50 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <MessageCircle className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Approver Comment</span>
              </div>
              <p className="text-sm text-muted-foreground">{expense.approverComment}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
};