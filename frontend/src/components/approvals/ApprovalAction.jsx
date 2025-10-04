import React, { useState } from 'react';
import { CheckCircle, XCircle, MessageCircle, MoreVertical } from 'lucide-react';
import { Button } from '../ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';

export const ApprovalActions = ({ expenseId, onAction, loading = false }) => {
  const [showDialog, setShowDialog] = useState(false);
  const [actionType, setActionType] = useState(null);
  const [comment, setComment] = useState('');

  const handleQuickAction = (status) => {
    onAction(expenseId, status, '');
  };

  const handleActionWithComment = () => {
    if (actionType) {
      onAction(expenseId, actionType, comment);
      setShowDialog(false);
      setComment('');
      setActionType(null);
    }
  };

  const openDialog = (type) => {
    setActionType(type);
    setShowDialog(true);
  };

  return (
    <>
      <div className="flex flex-col space-y-2">
        {/* Quick Actions */}
        <div className="flex space-x-2">
          <Button
            onClick={() => handleQuickAction('approved')}
            disabled={loading}
            className="flex-1 bg-green-600 hover:bg-green-700"
            size="sm"
          >
            <CheckCircle className="h-4 w-4 mr-2" />
            Approve
          </Button>
          <Button
            onClick={() => handleQuickAction('rejected')}
            disabled={loading}
            variant="outline"
            className="flex-1 text-red-600 border-red-600 hover:bg-red-50"
            size="sm"
          >
            <XCircle className="h-4 w-4 mr-2" />
            Reject
          </Button>
        </div>

        {/* Detailed Actions */}
        <div className="flex space-x-2">
          <Button
            onClick={() => openDialog('approved')}
            disabled={loading}
            variant="outline"
            size="sm"
            className="flex-1"
          >
            <MessageCircle className="h-4 w-4 mr-2" />
            Approve with Comment
          </Button>
          <Button
            onClick={() => openDialog('rejected')}
            disabled={loading}
            variant="outline"
            size="sm"
            className="flex-1"
          >
            <MessageCircle className="h-4 w-4 mr-2" />
            Reject with Comment
          </Button>
        </div>
      </div>

      {/* Comment Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {actionType === 'approved' ? 'Approve Expense' : 'Reject Expense'}
            </DialogTitle>
            <DialogDescription>
              {actionType === 'approved' 
                ? 'Add an optional comment for the submitter'
                : 'Please provide a reason for rejection'
              }
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder={
                actionType === 'approved' 
                  ? 'Great job! This expense looks good...'
                  : 'Please provide a reason for rejection...'
              }
              rows={4}
              className="input resize-none"
            />
            
            <div className="flex justify-end space-x-2">
              <Button
                variant="outline"
                onClick={() => setShowDialog(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleActionWithComment}
                disabled={loading || (actionType === 'rejected' && !comment.trim())}
                className={
                  actionType === 'approved' 
                    ? 'bg-green-600 hover:bg-green-700'
                    : 'bg-red-600 hover:bg-red-700'
                }
              >
                {actionType === 'approved' ? 'Approve' : 'Reject'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};