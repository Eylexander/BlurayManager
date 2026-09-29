import React from 'react';

const variants = {
  ghost: 'text-muted-foreground hover:text-foreground hover:bg-accent',
  danger: 'text-muted-foreground hover:text-destructive hover:bg-destructive/10',
  primary: 'text-primary hover:bg-primary/10',
} as const;

const sizes = {
  md: 'w-9 h-9',
  lg: 'w-10 h-10',
} as const;

interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Accessible name; also shown as the tooltip */
  label: string;
  variant?: keyof typeof variants;
  /** Pass a size here rather than w-/h- classes, which lose to the defaults in CSS order */
  size?: keyof typeof sizes;
  children: React.ReactNode;
}

/** Square, icon-only button (close, edit, delete…) with a required accessible label. */
export const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ label, variant = 'ghost', size = 'md', className = '', type = 'button', children, ...props }, ref) => (
    <button
      ref={ref}
      type={type}
      aria-label={label}
      title={label}
      className={`inline-grid place-items-center ${sizes[size]} shrink-0 rounded-lg transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 disabled:opacity-50 disabled:pointer-events-none [&_svg]:w-[18px] [&_svg]:h-[18px] ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  ),
);

IconButton.displayName = 'IconButton';
