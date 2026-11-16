import React from 'react';
import { Disc3 } from 'lucide-react';

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
  primary: 'bg-primary text-primary-foreground hover:brightness-110 key-edge [--glow:hsl(var(--primary)/0.65)]',
  secondary: 'bg-card text-foreground border border-input hover:border-foreground/40 key-edge',
  ghost: 'text-muted-foreground hover:bg-accent hover:text-foreground',
  success: 'bg-emerald-600 text-white hover:brightness-110 key-edge',
  danger: 'bg-destructive text-destructive-foreground hover:brightness-110 key-edge',
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
      'group inline-flex items-center justify-center gap-2 font-semibold rounded-md whitespace-nowrap transition-[color,background-color,border-color,filter,transform,box-shadow] duration-150 disabled:cursor-not-allowed disabled:opacity-50 [&_svg]:w-4 [&_svg]:h-4 [&_svg]:shrink-0';
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
            <Disc3 className="animate-spin" />
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
