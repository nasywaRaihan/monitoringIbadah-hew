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
  // - Ustadz (admin): Dashboard, Karyawan (list binaan), Peringkat
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
    navItems = [
      { id: 'dept-hx', label: 'Dashboard', icon: 'dashboard' },
      { id: 'recitation', label: 'Tilawah', icon: 'mic' },
      { id: 'leaderboard', label: 'Peringkat', icon: 'emoji_events' }
    ];
  }

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 bg-[#f9f9ff]/95 backdrop-blur-xl border-t border-[#1b4332]/8 shadow-[0_-2px_16px_rgba(1,45,29,0.06)]"
      style={{ paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 8px)' }}
      aria-label="Navigasi Bawah Utama"
    >
      <div className="flex items-center justify-around h-16 max-w-md md:max-w-xl mx-auto px-3">
        {navItems.map((item) => {
          const isActive =
            currentTab === item.id ||
            (item.id === 'dept-hx' && currentTab === 'hq-admin');
          return (
            <button
              key={item.id}
              onClick={() => onChangeTab(item.id)}
              className="flex flex-col items-center justify-center flex-1 min-h-[52px] py-1 transition-all relative cursor-pointer select-none group active:scale-95"
              aria-current={isActive ? 'page' : undefined}
            >
              {/* Material Design 3 Active Pill Indicator */}
              <div
                className={`relative flex items-center justify-center w-14 h-8 rounded-full transition-all duration-200 ${
                  isActive
                    ? 'bg-[#c1ecd4] text-[#002114] shadow-2xs'
                    : 'text-[#414844] group-hover:bg-[#1b4332]/5 group-hover:text-[#012d1d]'
                }`}
              >
                <span
                  className="material-symbols-outlined text-[22px] transition-transform"
                  style={isActive ? { fontVariationSettings: "'FILL' 1" } : undefined}
                >
                  {item.icon}
                </span>
              </div>

              {/* Label */}
              <span
                className={`text-[11px] mt-1 tracking-tight leading-none transition-colors ${
                  isActive
                    ? 'font-bold text-[#002114]'
                    : 'font-medium text-[#414844] group-hover:text-[#012d1d]'
                }`}
              >
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
