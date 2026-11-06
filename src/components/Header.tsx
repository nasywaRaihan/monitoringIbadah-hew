import React from 'react';
import { BRAND_ASSETS } from '../data/mockData';
import { ActiveUser } from '../types';

interface HeaderProps {
  currentTab: string;
  onOpenNotifications: () => void;
  onOpenAuth: () => void;
  onLogout?: () => void;
  onOpenSplash?: () => void;
  onOpenSheets: () => void;
  isSheetsConnected: boolean;
  unreadCount?: number;
  currentRole: 'member' | 'admin' | 'dept-hx' | 'hq-admin';
  activeUser?: ActiveUser;
}

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  onOpenNotifications,
  onOpenAuth,
  onLogout,
  onOpenSplash,
  onOpenSheets,
  isSheetsConnected,
  unreadCount = 2,
  currentRole,
  activeUser
}) => {
  const [isProfileMenuOpen, setIsProfileMenuOpen] = React.useState(false);
  const isSantri = currentRole === 'member' || activeUser?.role === 'member';

  const getSubhead = () => {
    switch (currentTab) {
      case 'worship':
        return activeUser ? `Ibadah Harian • ${activeUser.name}` : 'Ibadah Harian';
      case 'recitation':
        return isSantri
          ? (activeUser ? `Ujian Tilawah • ${activeUser.name}` : 'Sesi Ujian Tilawah')
          : 'Penilaian Ujian Mengaji Karyawan';
      case 'leaderboard':
        return 'Peringkat Karyawan & Halaqah';
      case 'admin':
        return 'Dashboard Supervisor Ustadz';
      case 'students':
        return activeUser?.halaqah ? `Karyawan Binaan • ${activeUser.halaqah}` : 'Daftar Karyawan Halaqah';
      case 'dept-hx':
      case 'hq-admin':
        return 'Dashboard Pusat Dept HX';
      default:
        return 'Ibadah Harian';
    }
  };

  return (
    <header className="sticky top-0 w-full z-40 bg-[#f9f9ff]/90 backdrop-blur-xl border-b border-[#1b4332]/5 shadow-[0_1px_8px_rgba(0,0,0,0.03)] transition-colors">
      <div className="h-16 px-4 md:px-6 flex items-center justify-between gap-3 max-w-4xl mx-auto relative">
        {/* Left: Brand Identity & Active User Halaqah */}
        <div className="flex items-center gap-3 min-w-0">
          <img
            alt="Logo"
            className="h-8 w-auto object-contain shrink-0 cursor-pointer"
            src={BRAND_ASSETS.logo}
            onClick={onOpenSplash}
            title="Klik untuk melihat Splash Screen"
          />
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="font-bold text-lg text-[#012d1d] tracking-tight leading-tight">
                NoorWorship
              </span>

            </div>
            <span className="text-xs text-[#414844] truncate font-medium">
              {getSubhead()}
            </span>
          </div>
        </div>

        {/* Right: Notification Bell & Profile Avatar */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">

          <button
            aria-label="Notifications"
            onClick={onOpenNotifications}
            className="w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center rounded-full text-[#414844] hover:text-[#012d1d] hover:bg-[#e9edff] transition-colors relative cursor-pointer"
          >
            <span className="material-symbols-outlined text-[20px] sm:text-[22px]">notifications</span>
            {unreadCount > 0 && (
              <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-[#775a19] ring-2 ring-[#f9f9ff]"></span>
            )}
          </button>

          {/* Profile Button with Dropdown */}
          <div className="relative">
            <button
              onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
              title={
                activeUser
                  ? `Akun: ${activeUser.name} (${activeUser.halaqah})`
                  : 'Menu Akun'
              }
              className="relative flex items-center pl-1 group cursor-pointer"
            >
              <img
                alt={activeUser?.name || 'Profile'}
                className="w-8 h-8 rounded-full object-cover shadow-[0_0_8px_rgba(1,45,29,0.12)] ring-2 ring-transparent group-hover:ring-[#1b4332]/30 transition-all"
                src={activeUser?.avatar || BRAND_ASSETS.currentUserAvatar}
              />
              <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-[#53b889] ring-2 ring-white" />
            </button>

            {/* Profile Popover Menu */}
            {isProfileMenuOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setIsProfileMenuOpen(false)}
                />
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-[#1b4332]/10 p-2 z-50 animate-in fade-in-50 zoom-in-95 duration-150">
                  <div className="px-3 py-2 border-b border-[#f1f3ff] mb-1">
                    <p className="text-xs font-bold text-[#141b2b] truncate">
                      {activeUser?.name || 'Pengguna'}
                    </p>
                    <p className="text-[11px] text-[#414844] truncate">
                      {activeUser?.halaqah || 'Halaqah Al-Fajr'}
                    </p>
                    <span className="inline-block mt-1 px-2 py-0.2 rounded-full bg-[#c1ecd4] text-[#002114] text-[9px] font-bold">
                      {activeUser?.role === 'admin' ? 'Ustadz Pembimbing' : 'Karyawan Aktif'}
                    </span>
                  </div>

                  {onLogout && (
                    <button
                      onClick={() => {
                        setIsProfileMenuOpen(false);
                        onLogout();
                      }}
                      className="w-full px-3 py-2 rounded-xl text-left text-xs font-semibold text-[#ba1a1a] hover:bg-[#ffdad6]/60 flex items-center gap-2 transition-colors cursor-pointer mt-0.5 border-t border-[#f1f3ff]"
                    >
                      <span className="material-symbols-outlined text-[16px]">
                        logout
                      </span>
                      <span>Keluar (Logout)</span>
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
