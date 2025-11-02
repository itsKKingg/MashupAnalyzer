// src/components/TabNavigation.tsx
// Updated to remove Compare tab

import { Music, BarChart3, Sparkles, TrendingUp, Scissors } from 'lucide-react';

export type TabId = 'prepare' | 'analyze' | 'discover' | 'visualize' | 'uvr5';

interface TabNavigationProps {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
  trackCount: number;
  mashupCount: number;
}

export function TabNavigation({
  activeTab,
  onTabChange,
  trackCount,
  mashupCount,
}: TabNavigationProps) {
  const tabs = [
    { id: 'prepare' as TabId, label: 'Prepare', icon: Music },
    { id: 'analyze' as TabId, label: 'Analyze', icon: BarChart3, badge: trackCount },
    { id: 'discover' as TabId, label: 'Discover', icon: Sparkles, badge: mashupCount },
    { id: 'visualize' as TabId, label: 'Visualize', icon: TrendingUp },
    { id: 'uvr5' as TabId, label: 'UVR5', icon: Scissors },
  ];

  return (
    <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
      <div className="max-w-7xl mx-auto px-4">
        <nav className="flex space-x-1 overflow-x-auto">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`
                  flex items-center gap-2 px-4 py-3 border-b-2 font-medium text-sm transition-colors whitespace-nowrap
                  ${
                    isActive
                      ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                      : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:border-gray-300 dark:hover:border-gray-600'
                  }
                `}
              >
                <Icon size={18} />
                <span>{tab.label}</span>
                {tab.badge !== undefined && tab.badge > 0 && (
                  <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 text-xs rounded-full font-semibold">
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>
    </div>
  );
}