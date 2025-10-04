import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Save, Building, DollarSign, Clock, Users, Bell, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { api } from '../../utils/api';
import { useAuthStore } from '../../store/authStore';

export const AdminSettings = () => {
  const [settings, setSettings] = useState({
    companyName: '',
    currency: 'USD',
    autoApproveLimit: 100,
    reminderSchedule: 24,
    approvalFlow: ['manager'],
    notificationSettings: {
      email: true,
      push: true,
      reminders: true
    }
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { company } = useAuthStore();

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await api.get('/api/admin/settings');
      setSettings(response.data);
    } catch (error) {
      console.error('Failed to fetch settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.put('/api/admin/settings', settings);
      alert('Settings saved successfully!');
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleTestReminders = async () => {
    try {
      await api.post('/api/admin/test-reminders');
      alert('Reminder test initiated!');
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to test reminders');
    }
  };

  const updateApprovalFlow = (index, value) => {
    const newFlow = [...settings.approvalFlow];
    newFlow[index] = value;
    setSettings(prev => ({ ...prev, approvalFlow: newFlow }));
  };

  const addApprovalStep = () => {
    setSettings(prev => ({
      ...prev,
      approvalFlow: [...prev.approvalFlow, 'manager']
    }));
  };

  const removeApprovalStep = (index) => {
    if (settings.approvalFlow.length > 1) {
      const newFlow = settings.approvalFlow.filter((_, i) => i !== index);
      setSettings(prev => ({ ...prev, approvalFlow: newFlow }));
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Company Settings</h2>
          <p className="text-muted-foreground">
            Configure your expense management system
          </p>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? (
            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          Save Changes
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Company Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Building className="h-5 w-5" />
              <span>Company Information</span>
            </CardTitle>
            <CardDescription>
              Basic company details and currency settings
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Company Name</label>
              <Input
                value={settings.companyName}
                onChange={(e) => setSettings(prev => ({ ...prev, companyName: e.target.value }))}
                placeholder="Your Company Name"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Base Currency</label>
              <select
                value={settings.currency}
                onChange={(e) => setSettings(prev => ({ ...prev, currency: e.target.value }))}
                className="input"
              >
                <option value="USD">USD - US Dollar</option>
                <option value="EUR">EUR - Euro</option>
                <option value="GBP">GBP - British Pound</option>
                <option value="CAD">CAD - Canadian Dollar</option>
                <option value="AUD">AUD - Australian Dollar</option>
                <option value="JPY">JPY - Japanese Yen</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Auto-approve Limit</label>
              <div className="flex items-center space-x-2">
                <DollarSign className="h-4 w-4 text-muted-foreground" />
                <Input
                  type="number"
                  value={settings.autoApproveLimit}
                  onChange={(e) => setSettings(prev => ({ ...prev, autoApproveLimit: parseFloat(e.target.value) }))}
                  placeholder="100"
                  min="0"
                  step="1"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Expenses below this amount will be automatically approved
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Approval Flow */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Users className="h-5 w-5" />
              <span>Approval Flow</span>
            </CardTitle>
            <CardDescription>
              Configure the expense approval sequence
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              {settings.approvalFlow.map((step, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex items-center space-x-2"
                >
                  <Badge variant="outline" className="w-8 h-8 flex items-center justify-center">
                    {index + 1}
                  </Badge>
                  <select
                    value={step}
                    onChange={(e) => updateApprovalFlow(index, e.target.value)}
                    className="input flex-1"
                  >
                    <option value="manager">Manager</option>
                    <option value="finance">Finance Team</option>
                    <option value="admin">Administrator</option>
                  </select>
                  {settings.approvalFlow.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeApprovalStep(index)}
                    >
                      ×
                    </Button>
                  )}
                </motion.div>
              ))}
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={addApprovalStep}
              className="w-full"
            >
              + Add Approval Step
            </Button>
            <div className="p-3 bg-muted/50 rounded-lg">
              <p className="text-sm text-muted-foreground">
                <strong>Current flow:</strong> {settings.approvalFlow.map(step => 
                  step.charAt(0).toUpperCase() + step.slice(1)
                ).join(' → ')}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Notification Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Bell className="h-5 w-5" />
              <span>Notifications</span>
            </CardTitle>
            <CardDescription>
              Configure email and notification preferences
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              {Object.entries(settings.notificationSettings).map(([key, value]) => (
                <div key={key} className="flex items-center justify-between">
                  <label className="text-sm font-medium capitalize">
                    {key.replace(/([A-Z])/g, ' $1')}
                  </label>
                  <input
                    type="checkbox"
                    checked={value}
                    onChange={(e) => setSettings(prev => ({
                      ...prev,
                      notificationSettings: {
                        ...prev.notificationSettings,
                        [key]: e.target.checked
                      }
                    }))}
                    className="w-4 h-4 text-primary rounded"
                  />
                </div>
              ))}
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Reminder Schedule</label>
              <div className="flex items-center space-x-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <Input
                  type="number"
                  value={settings.reminderSchedule}
                  onChange={(e) => setSettings(prev => ({ ...prev, reminderSchedule: parseInt(e.target.value) }))}
                  placeholder="24"
                  min="1"
                />
                <span className="text-sm text-muted-foreground">hours</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Send reminders for pending approvals after this many hours
              </p>
            </div>

            <Button
              type="button"
              variant="outline"
              onClick={handleTestReminders}
              className="w-full"
            >
              Test Reminder System
            </Button>
          </CardContent>
        </Card>

        {/* System Information */}
        <Card>
          <CardHeader>
            <CardTitle>System Information</CardTitle>
            <CardDescription>
              Current system status and statistics
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="font-medium">Company ID</p>
                <p className="text-muted-foreground">{company?._id || '—'}</p>
              </div>
              <div>
                <p className="font-medium">Default Currency</p>
                <p className="text-muted-foreground">{company?.currency || 'USD'}</p>
              </div>
              <div>
                <p className="font-medium">Timezone</p>
                <p className="text-muted-foreground">UTC</p>
              </div>
              <div>
                <p className="font-medium">System Version</p>
                <p className="text-muted-foreground">1.0.0</p>
              </div>
            </div>
            
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-sm text-green-800">
                <strong>Status:</strong> All systems operational
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};