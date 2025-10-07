import * as React from 'react';
import { Badge } from '@/components/ui/badge';
import { Check } from 'lucide-react';

export type ChipItem = {
  key: string;
  label: React.ReactNode;
  icon?: React.ReactNode;
};

interface ChipListProps {
  items: ChipItem[];
  selected?: string | string[];
  multi?: boolean;
  className?: string;
  onToggle: (key: string) => void;
}

export function ChipList({ items, selected, multi = false, className, onToggle }: ChipListProps) {
  const isSelected = (k: string) => {
    if (multi) return Array.isArray(selected) && selected.includes(k);
    return typeof selected === 'string' && selected === k;
  };

  return (
    <div className={className ?? 'flex flex-wrap gap-2 mb-2'}>
      {items.map((it) => (
        <Badge
          key={it.key}
          variant={isSelected(it.key) ? 'default' : 'outline'}
          className="cursor-pointer px-4 py-2 min-h-[44px] flex items-center"
          onClick={() => onToggle(it.key)}
        >
          {/* Use a slightly smaller check icon that inherits the chip text color */}
          {isSelected(it.key) ? (
            <Check size={16} className="mr-2 text-current" aria-hidden="true" />
          ) : (
            it.icon
          )}
          {it.label}
        </Badge>
      ))}
    </div>
  );
}

export default ChipList;
