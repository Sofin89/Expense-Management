import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Users, Settings, BarChart3, Bell, Shield, Building } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { useAuthStore } from '../../store/authStore';
import { UserManagement } from './UserManagement';
import { AdminSettings } from './Settings';
import { AdminAnalytics } from './AdminAnalytics';

const adminTabs = [
  { id: 'users', name: 'User Management', icon: Users, description: 'Manage users and roles' },
  { id: 'analytics', name: 'Analytics', icon: BarChart3, description: 'Company-wide insights' },
  { id: 'settings', name: 'Settings', icon: Settings, description: 'Configure approval flows' },
];

export const AdminPanel = () => {
  const [activeTab, setActiveTab] = useState('users');
  const { user } = useAuthStore();

  if (user?.role !== 'admin') {
    return (
      <div className="flex items-center justify-center min-h-96">
        <Card className="max-w-md text-center">
          <CardContent className="pt-6">
            <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">Access Denied</h3>
            <p className="text-muted-foreground">
              You need administrator privileges to access this panel.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const renderTabContent = () => {
    switch (activeTab) {
      case 'users':
        return <UserManagement />;
      case 'analytics':
        return <AdminAnalytics />;
      case 'settings':
        return <AdminSettings />;
      default:
        return <UserManagement />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Admin Panel</h1>
          <p className="text-muted-foreground">
            Manage your company's expense system
          </p>
        </div>
        <div className="flex items-center space-x-2 text-sm text-muted-foreground">
          <Building className="h-4 w-4" />
          <span>Administrator</span>
        </div>
      </div>

      {/* Tab Navigation */}
      <Card>
        <CardContent className="p-0">
          <div className="flex border-b">
            {adminTabs.map((tab) => (
              <Button
                key={tab.id}
                variant="ghost"
                className={`flex-1 justify-start px-6 py-4 rounded-none border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-primary bg-primary/5 text-primary'
                    : 'border-transparent hover:bg-muted/50'
                }`}
                onClick={() => setActiveTab(tab.id)}
              >
                <tab.icon className="h-5 w-5 mr-3" />
                <div className="text-left">
                  <div className="font-medium">{tab.name}</div>
                  <div className="text-xs text-muted-foreground">{tab.description}</div>
                </div>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Tab Content */}
      <motion.div
        key={activeTab}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        {renderTabContent()}
      </motion.div>
    </div>
  );
};