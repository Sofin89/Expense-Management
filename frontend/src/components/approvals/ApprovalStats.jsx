import React from 'react';
import { motion } from 'framer-motion';
import { Clock, CheckCircle, XCircle, TrendingUp, Users } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { useExpenses } from '../../hooks/useExpenses';
import { formatCurrency } from '../../utils';

export const ApprovalStats = () => {
  const { approvals, analytics } = useExpenses();

  const stats = {
    pending: approvals.filter(exp => exp.status === 'pending').length,
    approved: approvals.filter(exp => exp.status === 'approved').length,
    rejected: approvals.filter(exp => exp.status === 'rejected').length,
    total: approvals.length,
    avgApprovalTime: analytics?.approvalMetrics?.avgApprovalTime || 'N/A',
    approvalRate: analytics?.approvalMetrics?.approvalRate || 0,
  };

  const statCards = [
    {
      title: 'Pending',
      value: stats.pending,
      icon: Clock,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-50',
      description: 'Awaiting review'
    },
    {
      title: 'Approved',
      value: stats.approved,
      icon: CheckCircle,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      description: 'This month'
    },
    {
      title: 'Rejected',
      value: stats.rejected,
      icon: XCircle,
      color: 'text-red-600',
      bgColor: 'bg-red-50',
      description: 'This month'
    },
    {
      title: 'Approval Rate',
      value: `${stats.approvalRate}%`,
      icon: TrendingUp,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      description: 'Success rate'
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {statCards.map((stat, index) => (
        <motion.div
          key={stat.title}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1 }}
        >
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold">{stat.value}</p>
                  <p className="text-sm font-medium text-muted-foreground">
                    {stat.title}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {stat.description}
                  </p>
                </div>
                <div className={`p-3 rounded-full ${stat.bgColor}`}>
                  <stat.icon className={`h-6 w-6 ${stat.color}`} />
                </div>
              </div>
              
              {stat.title === 'Pending' && stats.pending > 0 && (
                <div className="mt-3">
                  <div className="flex justify-between text-xs text-muted-foreground mb-1">
                    <span>Urgent: {approvals.filter(exp => {
                      const daysOld = (Date.now() - new Date(exp.createdAt).getTime()) / (1000 * 60 * 60 * 24);
                      return daysOld > 3;
                    }).length}</span>
                    <span>Overdue: {approvals.filter(exp => {
                      const daysOld = (Date.now() - new Date(exp.createdAt).getTime()) / (1000 * 60 * 60 * 24);
                      return daysOld > 7;
                    }).length}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-1.5">
                    <div 
                      className="bg-yellow-500 h-1.5 rounded-full" 
                      style={{ 
                        width: `${(stats.pending / Math.max(stats.total, 1)) * 100}%` 
                      }}
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </div>
  );
};