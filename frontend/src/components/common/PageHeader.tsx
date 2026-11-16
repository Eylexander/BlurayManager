import { ReactNode } from 'react';

interface PageHeaderProps {
  title: ReactNode;
  description?: ReactNode;
  icon?: ReactNode;
  /** Buttons aligned to the right on wide screens */
  actions?: ReactNode;
}

/**
 * Title block shared by the dashboard pages: the title set like the logo's
 * wordmark, over a rule that starts with a short bar of disc light.
 */
export function PageHeader({ title, description, icon, actions }: PageHeaderProps) {
  return (
    <header className="relative flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6 sm:mb-8 pb-4 border-b border-border animate-in">
      <div className="min-w-0">
        <h1 className="flex items-center gap-2.5 font-display text-3xl sm:text-4xl text-foreground [&_svg]:w-6 [&_svg]:h-6 sm:[&_svg]:w-7 sm:[&_svg]:h-7 [&_svg]:shrink-0 [&_svg]:text-primary">
          {icon}
          {title}
        </h1>
        {description && <p className="mt-2 text-sm sm:text-base text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex items-center gap-2 sm:gap-3 shrink-0">{actions}</div>}
      <span aria-hidden className="holo absolute left-0 -bottom-0.5 h-[3px] w-20 rounded-full" />
    </header>
  );
}
