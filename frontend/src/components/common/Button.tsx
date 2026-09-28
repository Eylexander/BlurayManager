import React from 'react';
import { Loader } from 'lucide-react';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'success' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  loadingText?: string;
  /** Always full width; by default buttons are full width on mobile only */
  fullWidth?: boolean;
  /** Keep the natural width at every breakpoint */
  inline?: boolean;
  icon?: React.ReactNode;
  children: React.ReactNode;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary: 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm shadow-primary/20',
  secondary: 'bg-card text-foreground border border-border hover:bg-accent',
  ghost: 'text-muted-foreground hover:bg-accent hover:text-foreground',
  success: 'bg-emerald-600 text-white hover:bg-emerald-600/90 shadow-sm shadow-emerald-600/20',
  danger: 'bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-sm shadow-destructive/20',
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'h-9 px-3 text-sm',
  md: 'h-11 sm:h-10 px-4 text-sm',
  lg: 'h-12 px-6 text-base',
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      loading = false,
      loadingText,
      fullWidth = false,
      inline = false,
      icon,
      disabled,
      children,
      className = '',
      type = 'button',
      ...props
    },
    ref,
  ) => {
    const baseStyles =
      'group inline-flex items-center justify-center gap-2 font-medium rounded-lg whitespace-nowrap transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100 [&_svg]:w-4 [&_svg]:h-4 [&_svg]:shrink-0';
    const widthStyles = fullWidth ? 'w-full' : inline ? '' : 'w-full sm:w-auto';

    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled || loading}
        aria-busy={loading || undefined}
        className={`${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${widthStyles} ${className}`}
        {...props}
      >
        {loading ? (
          <>
            <Loader className="animate-spin" />
            {loadingText ?? children}
          </>
        ) : (
          <>
            {icon}
            {children}
          </>
        )}
      </button>
    );
  },
);

Button.displayName = 'Button';
