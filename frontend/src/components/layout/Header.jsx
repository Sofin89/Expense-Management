import React from 'react';
import { Moon, Sun, LogOut, User } from 'lucide-react';
import { Button } from '../ui/button';
import { useAuth } from '../../hooks/useAuth';
import { useAuthStore } from '../../store/authStore';
import { NotificationBell } from '../notifications/NotificationBell';

export const Header = () => {
  const { user, signOut } = useAuth();
  const { company } = useAuthStore();
  const [darkMode, setDarkMode] = React.useState(false);

  React.useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  return (
    <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-16 items-center px-6 justify-between">
        <div className="flex items-center space-x-4">
          <h1 className="text-xl font-bold">ExpenseTracker</h1>
          {company && (
            <span className="text-sm text-muted-foreground">
              {company.name} • {company.currency}
            </span>
          )}
        </div>
        
        <div className="flex items-center space-x-4">
          <NotificationBell />
          
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setDarkMode(!darkMode)}
          >
            {darkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </Button>
          
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                <User className="h-4 w-4 text-primary-foreground" />
              </div>
              <div className="text-sm">
                <div className="font-medium">{user?.name}</div>
                <div className="text-muted-foreground capitalize">{user?.role}</div>
              </div>
            </div>
            
            <Button
              variant="ghost"
              size="icon"
              onClick={signOut}
              title="Sign out"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
};