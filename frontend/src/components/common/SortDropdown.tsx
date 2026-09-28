import { useState, useRef, useEffect } from 'react';
import { ArrowUpDown, Check } from 'lucide-react'; 
import { useTranslations } from 'next-intl';

type SortOption = 'recent' | 'name' | 'release_date' | 'rating';

type SortDropdownProps = {
  sortBy: SortOption;
  setSortBy: React.Dispatch<React.SetStateAction<SortOption>>;
};

const SortDropdown = ({ sortBy, setSortBy }: SortDropdownProps) => {
  const t = useTranslations();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const options = [
    { value: 'recent', label: t('filter.recentlyAdded') },
    { value: 'name', label: t('filter.name') },
    { value: 'release_date', label: t('filter.releaseDate') },
    { value: 'rating', label: t('filter.rating') },
  ];

  const currentLabel = options.find((o) => o.value === sortBy)?.label;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative p-[0.1rem]" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 appearance-none pl-3 pr-3 sm:pl-4 sm:pr-4 py-[0.45rem] sm:py-[0.65rem] bg-muted border border-border rounded-lg text-xs sm:text-sm font-medium text-foreground/80 md:hover:bg-accent md:focus:outline-none md:focus:ring-2 md:focus:ring-ring transition-colors cursor-pointer"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <span className="hidden sm:block truncate">
          {currentLabel}
        </span>
        
        <ArrowUpDown className="w-4 h-4 text-muted-foreground" />
      </button>

      {/* DROPDOWN MENU */}
      {isOpen && (
        <div className="absolute top-full mt-1 w-48 sm:right-[1px] bg-card border border-border rounded-lg shadow-lg z-50 overflow-hidden">
          <ul role="listbox">
            {options.map((option) => (
              <li
                key={option.value}
                role="option"
                aria-selected={sortBy === option.value}
                onClick={() => {
                  setSortBy(option.value as SortOption);
                  setIsOpen(false);
                }}
                className={`
                  flex items-center justify-between px-4 py-2 text-xs sm:text-sm cursor-pointer transition-colors
                  ${sortBy === option.value 
                    ? 'bg-primary/10 text-primary' 
                    : 'text-foreground/80 hover:bg-accent'}
                `}
              >
                <span>{option.label}</span>
                {sortBy === option.value && <Check className="w-3 h-3 ml-2" />}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default SortDropdown;