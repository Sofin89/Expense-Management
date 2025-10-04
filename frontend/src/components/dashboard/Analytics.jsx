import React from 'react';
import { motion } from 'framer-motion';
import { PieChart, BarChart3, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { useExpenses } from '../../hooks/useExpenses';
import { formatCurrency } from '../../utils';
import { useAuthStore } from '../../store/authStore';

export const Analytics = () => {
  const { analytics } = useExpenses();
  const { company } = useAuthStore();

  if (!analytics || !analytics.categoryBreakdown) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <BarChart3 className="h-5 w-5" />
            <span>Analytics</span>
          </CardTitle>
          <CardDescription>
            Expense analytics will appear here once you have data
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <TrendingUp className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No data available yet</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const { categoryBreakdown, monthlySpending } = analytics;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <BarChart3 className="h-5 w-5" />
          <span>Analytics</span>
        </CardTitle>
        <CardDescription>
          Your expense breakdown and spending trends
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Category Breakdown */}
        <div>
          <h4 className="font-medium mb-4 flex items-center space-x-2">
            <PieChart className="h-4 w-4" />
            <span>Spending by Category</span>
          </h4>
          <div className="space-y-3">
            {Object.entries(categoryBreakdown).map(([category, data], index) => (
              <motion.div
                key={category}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="flex items-center justify-between"
              >
                <div className="flex items-center space-x-3">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{
                      backgroundColor: `hsl(${index * 45}, 70%, 50%)`,
                    }}
                  />
                  <span className="text-sm capitalize">{category}</span>
                </div>
                <div className="text-right">
                  <div className="font-medium">
                    {formatCurrency(data.amount, company?.currency)}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {data.count} expense{data.count !== 1 ? 's' : ''}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Monthly Spending */}
        {monthlySpending && Object.keys(monthlySpending).length > 0 && (
          <div>
            <h4 className="font-medium mb-4">Monthly Spending</h4>
            <div className="space-y-2">
              {Object.entries(monthlySpending)
                .slice(-6) // Last 6 months
                .map(([month, amount], index) => (
                  <motion.div
                    key={month}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="flex items-center justify-between"
                  >
                    <span className="text-sm text-muted-foreground">{month}</span>
                    <div className="font-medium">
                      {formatCurrency(amount, company?.currency)}
                    </div>
                  </motion.div>
                ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};