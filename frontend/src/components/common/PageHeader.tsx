import { ReactNode } from 'react';

interface PageHeaderProps {
  title: ReactNode;
  description?: ReactNode;
  icon?: ReactNode;
  /** Buttons aligned to the right on wide screens */
  actions?: ReactNode;
}

/** Title block shared by the dashboard pages. */
export function PageHeader({ title, description, icon, actions }: PageHeaderProps) {
  return (
    <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 sm:mb-8">
      <div className="flex items-center gap-3 sm:gap-4 min-w-0">
        {icon && (
          <div className="shrink-0 grid place-items-center w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-primary/10 text-primary [&_svg]:w-5 [&_svg]:h-5 sm:[&_svg]:w-6 sm:[&_svg]:h-6">
            {icon}
          </div>
        )}
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">{title}</h1>
          {description && <p className="mt-0.5 text-sm sm:text-base text-muted-foreground">{description}</p>}
        </div>
      </div>
      {actions && <div className="flex items-center gap-2 sm:gap-3 shrink-0">{actions}</div>}
    </header>
  );
}
