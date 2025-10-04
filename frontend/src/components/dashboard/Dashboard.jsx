import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { useExpenses } from '../../hooks/useExpenses';
import { useAuthStore } from '../../store/authStore';
import { KpiCards } from './KpiCards';
import { Analytics } from './Analytics';
import { EmptyState } from './EmptyState';
import { ExpenseForm } from '../expenses/ExpenseForm';
import { ApprovalQueue } from '../approvals/ApprovalQueue';

export const Dashboard = () => {
  const { expenses, analytics, approvals } = useExpenses();
  const { user } = useAuthStore();
  const hasData = expenses.length > 0;

  if (!hasData) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Dashboard</h1>
            <p className="text-muted-foreground">
              Welcome back, {user?.name}
            </p>
          </div>
        </div>
        
        <EmptyState />
        <ExpenseForm />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome back, {user?.name}
          </p>
        </div>
      </div>

      <KpiCards />
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Analytics />
        </div>
        
        <div>
          {user?.role !== 'employee' && approvals.length > 0 && (
            <ApprovalQueue />
          )}
          
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
              >
                <ExpenseForm onSuccess={() => window.location.reload()} />
              </motion.div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};