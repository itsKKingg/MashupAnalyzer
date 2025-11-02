import { MashupCategoryFilter } from '../types/track';
import { Star, ThumbsUp, Minus, X } from 'lucide-react';

interface MashupFilterBarProps {
  categoryFilter: MashupCategoryFilter;
  onCategoryChange: (category: MashupCategoryFilter) => void;
  categoryCounts: {
    all: number;
    excellent: number;
    good: number;
    fair: number;
    poor: number;
  };
}

export function MashupFilterBar({
  categoryFilter,
  onCategoryChange,
  categoryCounts
}: MashupFilterBarProps) {
  const categories: Array<{
    value: MashupCategoryFilter;
    label: string;
    icon: typeof Star;
    color: string;
    activeColor: string;
  }> = [
    {
      value: 'all',
      label: 'All',
      icon: Star,
      color: 'bg-gray-100 text-gray-700 hover:bg-gray-200',
      activeColor: 'bg-gray-700 text-white'
    },
    {
      value: 'excellent',
      label: 'Excellent',
      icon: Star,
      color: 'bg-green-50 text-green-700 hover:bg-green-100',
      activeColor: 'bg-green-600 text-white'
    },
    {
      value: 'good',
      label: 'Good',
      icon: ThumbsUp,
      color: 'bg-blue-50 text-blue-700 hover:bg-blue-100',
      activeColor: 'bg-blue-600 text-white'
    },
    {
      value: 'fair',
      label: 'Fair',
      icon: Minus,
      color: 'bg-yellow-50 text-yellow-700 hover:bg-yellow-100',
      activeColor: 'bg-yellow-600 text-white'
    },
    {
      value: 'poor',
      label: 'Poor',
      icon: X,
      color: 'bg-gray-50 text-gray-600 hover:bg-gray-100',
      activeColor: 'bg-gray-600 text-white'
    }
  ];

  return (
    <div className="bg-white rounded-xl shadow-md border border-gray-200 p-4 mb-4">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-sm font-semibold text-gray-700">Filter by Quality:</span>
      </div>
      
      <div className="flex flex-wrap gap-2">
        {categories.map(({ value, label, icon: Icon, color, activeColor }) => {
          const isActive = categoryFilter === value;
          const count = categoryCounts[value];
          
          return (
            <button
              key={value}
              onClick={() => onCategoryChange(value)}
              className={`
                flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm
                transition-all duration-200 transform hover:scale-105
                ${isActive ? activeColor : color}
                ${count === 0 && value !== 'all' ? 'opacity-50 cursor-not-allowed' : ''}
              `}
              disabled={count === 0 && value !== 'all'}
            >
              <Icon size={16} />
              <span>{label}</span>
              <span className={`
                px-2 py-0.5 rounded-full text-xs font-bold
                ${isActive ? 'bg-white/20' : 'bg-black/10'}
              `}>
                {count}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}