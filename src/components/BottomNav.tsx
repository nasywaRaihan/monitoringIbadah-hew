import React from 'react';
import { TabType } from '../types';

interface BottomNavProps {
  currentTab: TabType;
  onChangeTab: (tab: TabType) => void;
  currentRole?: 'member' | 'admin' | 'dept-hx' | 'hq-admin';
}

export const BottomNav: React.FC<BottomNavProps> = ({
  currentTab,
  onChangeTab,
  currentRole = 'member'
}) => {
  const isSantri = currentRole === 'member';
  const isUstadz = currentRole === 'admin';

  // Navigation items customized per role:
  // - Santri (member): Ibadah, Peringkat, Tilawah
  // - Ustadz (admin): Dashboard, Santri (list santri di halaqah), Peringkat
  // - Dept HX / HQ: Dashboard (Dept HX), Tilawah, Peringkat
  let navItems: { id: TabType; label: string; icon: string }[];

  if (isSantri) {
    navItems = [
      { id: 'worship', label: 'Ibadah', icon: 'mosque' },
      { id: 'leaderboard', label: 'Peringkat', icon: 'emoji_events' },
      { id: 'recitation', label: 'Tilawah', icon: 'mic' }
    ];
  } else if (isUstadz) {
    navItems = [
      { id: 'admin', label: 'Dashboard', icon: 'dashboard' },
      { id: 'students', label: 'Karyawan', icon: 'groups' },
      { id: 'leaderboard', label: 'Peringkat', icon: 'emoji_events' }
    ];
  } else {
    // Akun Dept HX / HQ: Menu Dept HX dinamakan Dashboard, Tilawah, dan Peringkat
    navItems = [
      { id: 'dept-hx', label: 'Dashboard', icon: 'dashboard' },
      { id: 'recitation', label: 'Tilawah', icon: 'mic' },
      { id: 'leaderboard', label: 'Peringkat', icon: 'emoji_events' }
    ];
  }

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 bg-[#f9f9ff]/92 backdrop-blur-xl border-t border-[#1b4332]/8 shadow-[0_-2px_16px_rgba(1,45,29,0.06)]"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      <div className="flex items-center justify-around h-16 max-w-4xl mx-auto px-2">
        {navItems.map((item) => {
          const isActive =
            currentTab === item.id ||
            (item.id === 'dept-hx' && currentTab === 'hq-admin');
          return (
            <button
              key={item.id}
              onClick={() => onChangeTab(item.id)}
              className={`flex flex-col items-center justify-center min-w-[68px] h-12 gap-0.5 transition-all relative cursor-pointer ${
                isActive
                  ? 'text-[#1b4332] font-semibold'
                  : 'text-[#414844] hover:text-[#012d1d]'
              }`}
            >
              <span
                className={`material-symbols-outlined text-[22px] transition-transform ${
                  isActive ? 'scale-110' : ''
                }`}
                style={isActive ? { fontVariationSettings: "'FILL' 1" } : undefined}
              >
                {item.icon}
              </span>
              <span className="text-[11px] tracking-tight leading-none">
                {item.label}
              </span>
              {isActive && (
                <span className="absolute bottom-1 w-1.5 h-1.5 rounded-full bg-[#1b4332]" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};
