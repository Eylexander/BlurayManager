import React from 'react';
import { Search } from 'lucide-react';

type SearchInputProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'>;

/** Text input with a leading search icon. */
export const SearchInput = React.forwardRef<HTMLInputElement, SearchInputProps>(
  ({ className = '', ...props }, ref) => (
    <div className={`relative ${className}`}>
      <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
      <input ref={ref} type="search" className="input pl-10" {...props} />
    </div>
  ),
);

SearchInput.displayName = 'SearchInput';
