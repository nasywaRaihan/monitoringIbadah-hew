import React from 'react';
import { BRAND_ASSETS } from '../data/mockData';
import { ActiveUser } from '../types';
import { PremiumInitialAvatar } from './PremiumInitialAvatar';
import { getUstadzTitle } from '../services/ustadzTitle';

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
  unreadCount = 0,
  currentRole,
  activeUser
}) => {
  const [isProfileMenuOpen, setIsProfileMenuOpen] = React.useState(false);
  const [logoError, setLogoError] = React.useState(false);
  const isSantri = currentRole === 'member' || activeUser?.role === 'member';

  const getSubhead = () => {
    switch (currentTab) {
      case 'worship':
        return 'Ibadah Harian';
      case 'recitation':
        return isSantri
          ? (activeUser ? `Ujian Tilawah • ${activeUser.name}` : 'Sesi Ujian Tilawah')
          : 'Penilaian Ujian Mengaji Karyawan';
      case 'leaderboard':
        return 'Peringkat Karyawan & Halaqah';
      case 'admin':
        return `Dashboard Supervisor ${getUstadzTitle(activeUser)}`;
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
    <header className="sticky top-0 w-full z-40 bg-[#f9f9ff]/92 backdrop-blur-xl border-b border-[#1b4332]/8 shadow-[0_1px_8px_rgba(0,0,0,0.03)] transition-colors">
      <div className="h-16 px-3.5 sm:px-6 flex items-center justify-between gap-2.5 max-w-4xl mx-auto relative">
        {/* Left: Brand Identity & Active User Subtitle */}
        <div className="flex items-center gap-2.5 min-w-0">
          <button
            type="button"
            onClick={onOpenSplash}
            title="Klik untuk melihat Splash Screen"
            className="p-1 -ml-1 rounded-xl hover:bg-[#1b4332]/5 active:scale-95 transition-all cursor-pointer shrink-0 min-w-[44px] min-h-[44px] flex items-center justify-center"
            aria-label="Logo JejakTaqwa"
          >
            {!logoError ? (
              <img
                alt=""
                onError={() => setLogoError(true)}
                className="h-9 w-9 rounded-xl object-contain shrink-0 shadow-xs ring-1 ring-[#00452c]/10 bg-[#012d1d]"
                src={BRAND_ASSETS.logo}
              />
            ) : (
              <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-[#012d1d] to-[#1b4332] flex items-center justify-center shrink-0 shadow-xs ring-1 ring-[#fed488]/40">
                <svg viewBox="0 0 24 24" className="w-5 h-5 text-[#fed488]" fill="currentColor" aria-hidden="true">
                  <path d="M12 2L14.4 7.2L20 8L15.8 12L16.9 17.6L12 14.9L7.1 17.6L8.2 12L4 8L9.6 7.2L12 2Z" />
                </svg>
              </div>
            )}
          </button>

          <div className="flex flex-col min-w-0">
            <span className="font-extrabold text-base sm:text-lg text-[#012d1d] tracking-tight leading-tight truncate">
              JejakTaqwa
            </span>
            <span className="text-[11px] text-[#414844] truncate font-medium">
              {getSubhead()}
            </span>
          </div>
        </div>

        {/* Right: Notification Bell & Profile Avatar */}
        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          <button
            aria-label="Notifikasi"
            title={unreadCount > 0 ? `${unreadCount} pemberitahuan belum dibaca` : 'Pemberitahuan & Pengingat'}
            onClick={onOpenNotifications}
            className="w-11 h-11 flex items-center justify-center rounded-full text-[#414844] hover:text-[#012d1d] hover:bg-[#e9edff] active:scale-95 transition-all relative cursor-pointer"
          >
            <span className="material-symbols-outlined text-[22px]">notifications</span>
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-[#ba1a1a] text-white text-[10px] font-extrabold flex items-center justify-center ring-2 ring-[#f9f9ff] shadow-2xs">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
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
              aria-label="Menu Akun Pengguna"
              className="relative w-11 h-11 flex items-center justify-center rounded-full active:scale-95 transition-transform cursor-pointer"
            >
              <PremiumInitialAvatar
                name={activeUser?.name || 'Pengguna'}
                role={activeUser?.role || currentRole}
                className="w-9 h-9 rounded-full"
              />
              <span
                className={`absolute bottom-1 right-1 w-2.5 h-2.5 rounded-full ring-2 ring-white ${
                  (activeUser?.role || currentRole) === 'dept-hx' ||
                  (activeUser?.role || currentRole) === 'hq-admin'
                    ? 'bg-[#2563eb]'
                    : (activeUser?.role || currentRole) === 'admin'
                    ? 'bg-[#d97706]'
                    : 'bg-[#53b889]'
                }`}
              />
            </button>

            {/* Profile Popover Menu */}
            {isProfileMenuOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setIsProfileMenuOpen(false)}
                />
                <div className="absolute right-0 mt-2 w-64 max-w-[calc(100vw-32px)] bg-white rounded-2xl shadow-xl border border-[#1b4332]/10 p-2 z-50 animate-in fade-in-50 zoom-in-95 duration-150">
                  <div className="px-3 py-2.5 border-b border-[#f1f3ff] mb-1">
                    <p className="text-xs font-bold text-[#141b2b] truncate">
                      {activeUser?.role === 'dept-hx' || activeUser?.role === 'hq-admin'
                        ? 'Departemen HX (Human Experience)'
                        : activeUser?.name || 'Pengguna'}
                    </p>
                    <p className="text-[11px] text-[#414844] truncate mt-0.5">
                      {activeUser?.halaqah || 'Halaqah Al-Fajr'}
                    </p>
                    <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-[9px] font-bold ${
                          activeUser?.role === 'admin'
                            ? 'bg-[#fff3d1] text-[#785a1a] border border-[#fed488]'
                            : activeUser?.role === 'dept-hx' || activeUser?.role === 'hq-admin'
                            ? 'bg-[#dbeafe] text-[#1e3a8a] border border-[#93c5fd]'
                            : 'bg-[#c1ecd4] text-[#002114]'
                        }`}
                      >
                        {activeUser?.role === 'admin'
                          ? `${getUstadzTitle(activeUser)} Pembimbing`
                          : activeUser?.role === 'dept-hx' || activeUser?.role === 'hq-admin'
                          ? 'Departemen HX (Human Experience)'
                          : 'Karyawan Aktif'}
                      </span>
                      {currentRole === 'member' &&
                        (!activeUser || activeUser.role === 'member') &&
                        activeUser?.streakDays !== undefined && (
                          <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-[#fff8e1] text-[#785a1a] text-[9px] font-bold border border-[#ffe082]">
                            🔥 {activeUser.streakDays} Hari
                          </span>
                        )}
                    </div>
                  </div>

                  {onLogout && (
                    <button
                      onClick={() => {
                        setIsProfileMenuOpen(false);
                        onLogout();
                      }}
                      className="w-full px-3 py-2.5 rounded-xl text-left text-xs font-semibold text-[#ba1a1a] hover:bg-[#ffdad6]/60 flex items-center gap-2 transition-colors cursor-pointer mt-0.5 border-t border-[#f1f3ff]"
                    >
                      <span className="material-symbols-outlined text-[18px]">
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
