import React from 'react';
import { cn } from '../../utils';

// ✅ Keep as named export but make sure it's exported correctly
export const Badge = React.forwardRef(({ className, variant = 'default', ...props }, ref) => {
  const baseStyles = 'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2';
  
  const variants = {
    default: 'border-transparent bg-primary text-primary-foreground hover:bg-primary/80',
    secondary: 'border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80',
    destructive: 'border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80',
    outline: 'text-foreground',
    success: 'border-transparent bg-green-100 text-green-800 hover:bg-green-200',
    warning: 'border-transparent bg-yellow-100 text-yellow-800 hover:bg-yellow-200',
    pending: 'border-transparent bg-yellow-100 text-yellow-800 hover:bg-yellow-200',
    approved: 'border-transparent bg-green-100 text-green-800 hover:bg-green-200',
    rejected: 'border-transparent bg-red-100 text-red-800 hover:bg-red-200',
  };

  return (
    <div
      ref={ref}
      className={cn(baseStyles, variants[variant], className)}
      {...props}
    />
  );
});

Badge.displayName = 'Badge';

// ✅ Make sure there's no default export if using named export