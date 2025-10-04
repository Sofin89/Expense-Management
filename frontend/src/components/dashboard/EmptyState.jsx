import React from 'react';
import { motion } from 'framer-motion';
import { FileText, TrendingUp, Bell } from 'lucide-react';
import { Card, CardContent } from '../ui/card';

export const EmptyState = () => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <Card className="text-center py-12">
        <CardContent className="space-y-6">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
            <FileText className="h-8 w-8 text-primary" />
          </div>
          
          <div className="space-y-2">
            <h3 className="text-xl font-semibold">No expenses yet</h3>
            <p className="text-muted-foreground max-w-md mx-auto">
              Submit your first expense to see analytics, track approvals, and manage your spending in one place.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-2xl mx-auto">
            <div className="flex items-start space-x-3 p-4 rounded-lg border">
              <FileText className="h-5 w-5 text-primary mt-0.5" />
              <div className="text-left">
                <h4 className="font-medium">Submit Expenses</h4>
                <p className="text-sm text-muted-foreground">
                  Upload receipts and submit expenses for approval
                </p>
              </div>
            </div>
            
            <div className="flex items-start space-x-3 p-4 rounded-lg border">
              <Bell className="h-5 w-5 text-primary mt-0.5" />
              <div className="text-left">
                <h4 className="font-medium">Real-time Updates</h4>
                <p className="text-sm text-muted-foreground">
                  Get instant notifications on approval status
                </p>
              </div>
            </div>
            
            <div className="flex items-start space-x-3 p-4 rounded-lg border">
              <TrendingUp className="h-5 w-5 text-primary mt-0.5" />
              <div className="text-left">
                <h4 className="font-medium">Track Analytics</h4>
                <p className="text-sm text-muted-foreground">
                  Monitor spending patterns and categories
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};