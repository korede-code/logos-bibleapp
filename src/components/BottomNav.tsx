/**
 * Logos Daily — Bottom Navigation Bar
 * =====================================
 * Accessible bottom navigation with:
 * - Active state indicators
 * - Badge counts for unread items
 * - WCAG 2.1 AA compliant labels and focus states
 */

import React from 'react';
import { Home, BookOpen, Search, Target, Heart, Settings } from 'lucide-react';
import { useAppStore, type AppScreen } from '../store/appStore';
import { getTheme } from '../utils/themeUtils';

const NAV_ITEMS: Array<{
  id: AppScreen;
  icon: React.ReactNode;
  label: string;
  badge?: (state: ReturnType<typeof useAppStore.getState>) => number;
}> = [
  {
    id: 'home',
    icon: <Home size={22} />,
    label: 'Home',
  },
  {
    id: 'reader',
    icon: <BookOpen size={22} />,
    label: 'Bible',
  },
  {
    id: 'search',
    icon: <Search size={22} />,
    label: 'Search',
  },
  {
    id: 'plans',
    icon: <Target size={22} />,
    label: 'Plans',
  },
  {
    id: 'prayer',
    icon: <Heart size={22} />,
    label: 'Prayer',
    badge: (state) => state.prayers.filter(p => p.status === 'praying').length,
  },
  {
    id: 'settings',
    icon: <Settings size={22} />,
    label: 'More',
  },
];

interface Props {
  hidden?: boolean;
}

const BottomNav: React.FC<Props> = ({ hidden }) => {
  const { currentScreen, navigate, readerSettings, prayers } = useAppStore();
  const theme = getTheme(readerSettings.theme);

  if (hidden) return null;

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-30 flex items-end"
      style={{
        backgroundColor: theme.navBg,
        borderTop: `1px solid ${theme.border}`,
        boxShadow: `0 -4px 24px ${theme.shadow}`,
        paddingBottom: 'env(safe-area-inset-bottom, 0)',
      }}
      aria-label="Main navigation"
      role="navigation"
    >
      {NAV_ITEMS.map(item => {
        const isActive = currentScreen === item.id;
        const badgeCount = item.badge ? item.badge({ ...useAppStore.getState(), prayers }) : 0;

        return (
          <button
            key={item.id}
            onClick={() => navigate(item.id)}
            className="flex-1 flex flex-col items-center justify-center py-3 transition-all duration-150 relative"
            style={{
              minHeight: '60px',
              color: isActive ? theme.navActive : theme.navText,
            }}
            aria-label={item.label}
            aria-current={isActive ? 'page' : undefined}
            role="tab"
            aria-selected={isActive}
          >
            {/* Active indicator dot */}
            {isActive && (
              <div
                className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full"
                style={{ backgroundColor: theme.navActive }}
                aria-hidden="true"
              />
            )}

            {/* Icon with badge */}
            <div className="relative">
              <div
                style={{
                  transform: isActive ? 'scale(1.1)' : 'scale(1)',
                  transition: 'transform 0.15s ease',
                }}
              >
                {item.icon}
              </div>
              {badgeCount > 0 && (
                <span
                  className="absolute -top-1.5 -right-1.5 flex items-center justify-center text-white rounded-full font-bold"
                  style={{
                    backgroundColor: '#CC4488',
                    fontSize: '9px',
                    minWidth: '16px',
                    height: '16px',
                    padding: '0 3px',
                  }}
                  aria-label={`${badgeCount} active items`}
                >
                  {badgeCount}
                </span>
              )}
            </div>

            {/* Label */}
            <span
              className="text-xs font-semibold mt-1"
              style={{
                fontSize: '10px',
                color: isActive ? theme.navActive : theme.navText,
                transition: 'color 0.15s ease',
              }}
            >
              {item.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
};

export default BottomNav;
