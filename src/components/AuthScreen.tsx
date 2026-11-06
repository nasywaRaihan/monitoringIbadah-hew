import React, { useState } from 'react';
import { ActiveUser } from '../types';
import { BRAND_ASSETS } from '../data/mockData';

interface AuthScreenProps {
  registeredUsers: ActiveUser[];
  onLoginSuccess: (user: ActiveUser) => void;
  onShowToast: (msg: string) => void;
  onRegisterNewUser?: (newUser: {
    name: string;
    halaqah: string;
    halaqahCode: string;
    passcode: string;
    phone?: string;
    role: 'member' | 'admin';
  }) => void;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({
  registeredUsers,
  onLoginSuccess,
  onShowToast
}) => {
  // Login screen strictly has three tabs: 'user' (Santri), 'ustadz' (Ustadz), and 'dept-hx' (Direktorat)
  const [authRoleTab, setAuthRoleTab] = useState<'user' | 'ustadz' | 'dept-hx'>('user');

  // --- SANTRI (USER) LOGIN STATE ---
  const [santriIdentifier, setSantriIdentifier] = useState('');
  const [santriPassword, setSantriPassword] = useState('');
  const [showSantriPassword, setShowSantriPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [santriError, setSantriError] = useState<string | null>(null);
  const [isSubmittingSantri, setIsSubmittingSantri] = useState(false);

  // --- USTADZ (HALAQOH) LOGIN STATE ---
  const [selectedHalaqah, setSelectedHalaqah] = useState('Halaqah Al-Fajr');
  const [ustadzPasscode, setUstadzPasscode] = useState('');
  const [showUstadzPasscode, setShowUstadzPasscode] = useState(false);
  const [ustadzError, setUstadzError] = useState<string | null>(null);
  const [isSubmittingUstadz, setIsSubmittingUstadz] = useState(false);
  // --- DEPT HX LOGIN STATE ---
  const [deptHXPasscode, setDeptHXPasscode] = useState('');
  const [showDeptHXPasscode, setShowDeptHXPasscode] = useState(false);
  const [deptHXError, setDeptHXError] = useState<string | null>(null);
  const [isSubmittingDeptHX, setIsSubmittingDeptHX] = useState(false);

  const predefinedHalaqahs = [
    { name: 'Halaqah Al-Fajr', code: 'HF-4092', pin: '1234', supervisor: 'Ustadz Farhan', sk: 'SK Dept HX #018' },
    { name: 'Hafiz Circle', code: 'HC-1108', pin: '1234', supervisor: 'Ustadz Tariq Mansoor', sk: 'SK Dept HX #004' },
    { name: 'Youth Tajweed', code: 'YT-7721', pin: '1234', supervisor: 'Ustadzah Sarah', sk: 'SK Dept HX #022' },
    { name: 'Madinah Memorization Circle', code: 'MC-9901', pin: '1234', supervisor: 'Ustadz Mansoor', sk: 'SK Dept HX #009' },
    { name: 'Noor Al-Huda Tajweed Circle', code: 'NH-3382', pin: '1234', supervisor: 'Ustadz Zulkifli', sk: 'SK Dept HX #015' }
  ];

  // Quick Demo Santri Accounts (Only member role)
  const demoSantriAccounts = registeredUsers.filter((u) => u.role === 'member').slice(0, 3);

  // Quick Demo Ustadz Accounts
  const demoUstadzAccounts = registeredUsers.filter((u) => u.role === 'admin');

  // Quick Demo Dept HX Accounts
  const demoDeptHXAccounts = registeredUsers.filter((u) => u.role === 'dept-hx' || u.role === 'hq-admin');

  // Live Detection of user's pre-assigned halaqah by Dept HX
  const matchedSantri = registeredUsers.find((u) => {
    if (!santriIdentifier.trim()) return false;
    const clean = santriIdentifier.trim().toLowerCase();
    return (
      u.name.toLowerCase() === clean ||
      (u.email && u.email.toLowerCase() === clean) ||
      u.id.toLowerCase() === clean
    );
  });

  // Handle Santri (User) Login
  const handleSantriLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setSantriError(null);

    const cleanIdentifier = santriIdentifier.trim().toLowerCase();
    const cleanPass = santriPassword.trim();

    if (!cleanIdentifier) {
      setSantriError('Masukkan nama karyawan atau username Anda');
      return;
    }
    if (!cleanPass) {
      setSantriError('Masukkan kata sandi / passcode karyawan');
      return;
    }

    setIsSubmittingSantri(true);

    setTimeout(() => {
      // Find matching user in Dept HX registered directory
      const matched = registeredUsers.find((u) => {
        const nameMatches = u.name.toLowerCase() === cleanIdentifier;
        const emailMatches = u.email && u.email.toLowerCase() === cleanIdentifier;
        const idMatches = u.id.toLowerCase() === cleanIdentifier;
        return nameMatches || emailMatches || idMatches;
      });

      if (!matched) {
        setIsSubmittingSantri(false);
        setSantriError(
          'Karyawan belum terdaftar di Dept HX. Silakan hubungi pengurus atau daftarkan karyawan melalui Menu Dept HX.'
        );
        return;
      }

      // Check passcode
      if (matched.passcode && matched.passcode !== cleanPass && cleanPass !== '1234') {
        setIsSubmittingSantri(false);
        setSantriError('Kata sandi salah. Gunakan default demo "1234" jika belum diubah.');
        return;
      }

      setIsSubmittingSantri(false);
      onShowToast(
        `Ahlan wa Sahlan, ${matched.name}! Anda langsung masuk ke ${matched.halaqah} (Penetapan Resmi Dept HX).`
      );
      onLoginSuccess(matched);
    }, 350);
  };

  // Quick One-Click Demo Santri Login
  const handleQuickSantriLogin = (user: ActiveUser) => {
    setSantriIdentifier(user.name);
    setSantriPassword(user.passcode || '1234');
    setSantriError(null);
    setIsSubmittingSantri(true);

    setTimeout(() => {
      setIsSubmittingSantri(false);
      onShowToast(
        `Ahlan wa Sahlan, ${user.name}! Anda langsung masuk ke ${user.halaqah} (Penetapan Resmi Dept HX).`
      );
      onLoginSuccess(user);
    }, 300);
  };

  // Handle Ustadz / Halaqah Login
  const handleUstadzLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setUstadzError(null);

    const cleanPass = ustadzPasscode.trim();
    if (!cleanPass) {
      setUstadzError('Masukkan passcode supervisor Ustadz (default: 1234)');
      return;
    }

    setIsSubmittingUstadz(true);

    setTimeout(() => {
      // Find matching halaqah preset
      const currentHalaqah = predefinedHalaqahs.find((h) => h.name === selectedHalaqah);

      // Verify passcode (accepts '1234' or 'admin123' or halaqah pin)
      if (cleanPass !== '1234' && cleanPass !== 'admin123' && cleanPass !== currentHalaqah?.pin) {
        setIsSubmittingUstadz(false);
        setUstadzError('Passcode supervisor salah! Masukkan PIN resmi Ustadz: 1234');
        return;
      }

      setIsSubmittingUstadz(false);

      // Check if existing ustadz user matches this halaqah
      const existingUstadz = registeredUsers.find(
        (u) => (u.role === 'admin' || u.role === 'dept-hx') && u.halaqah === selectedHalaqah
      );

      const targetUstadz: ActiveUser = existingUstadz || {
        id: `ustadz-${Date.now()}`,
        name: currentHalaqah?.supervisor || 'Ustadz Pembimbing',
        halaqah: selectedHalaqah,
        halaqahCode: currentHalaqah?.code || 'HF-4092',
        passcode: cleanPass,
        avatar: BRAND_ASSETS.currentUserAvatar,
        role: 'admin',
        totalXp: 2850,
        streakDays: 28,
        supervisor: 'Direktorat Dept HX',
        assignedHalaqahBy: 'Dept HX',
        hxAssignmentId: `HX-USTADZ-${currentHalaqah?.code || '001'}`,
        hxStatus: 'Resmi Dept HX'
      };

      onShowToast(
        `Ahlan wa Sahlan, ${targetUstadz.name}! Konsol Halaqah ${targetUstadz.halaqah} aktif.`
      );
      onLoginSuccess(targetUstadz);
    }, 350);
  };

  // Quick One-Click Demo Ustadz Login
  const handleQuickUstadzLogin = (user: ActiveUser) => {
    setSelectedHalaqah(user.halaqah);
    setUstadzPasscode(user.passcode || '1234');
    setUstadzError(null);
    setIsSubmittingUstadz(true);

    setTimeout(() => {
      setIsSubmittingUstadz(false);
      onShowToast(`Ahlan wa Sahlan, ${user.name}! Membuka konsol Halaqah ${user.halaqah}.`);
      onLoginSuccess(user);
    }, 300);
  };

  // Handle Dept HX Login
  const handleDeptHXLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setDeptHXError(null);

    const cleanPass = deptHXPasscode.trim();
    if (!cleanPass) {
      setDeptHXError('Masukkan kode otorisasi Dept HX (default: 1234)');
      return;
    }

    setIsSubmittingDeptHX(true);

    setTimeout(() => {
      // Dept HX Global PIN check
      if (cleanPass !== '1234' && cleanPass !== 'hx2026') {
        setIsSubmittingDeptHX(false);
        setDeptHXError('Kode otorisasi salah! Masukkan PIN resmi Dept HX: 1234');
        return;
      }

      setIsSubmittingDeptHX(false);

      // Find primary Dept HX account
      const deptUser = registeredUsers.find(u => u.role === 'dept-hx') || {
        id: 'user-dept-hx-auto',
        name: 'Direktorat Dept HX',
        halaqah: 'Dept HX Pusat',
        halaqahCode: 'HX-HQ-01',
        passcode: cleanPass,
        avatar: BRAND_ASSETS.currentUserAvatar,
        role: 'dept-hx',
        totalXp: 9990,
        streakDays: 45,
        supervisor: 'Direktorat Dept HX Pusat',
        assignedHalaqahBy: 'Dept HX',
        hxAssignmentId: 'HX-2026-HQ',
        hxStatus: 'Resmi Dept HX'
      };

      onShowToast(`Otorisasi Berhasil! Selamat datang di Portal Direktorat Dept HX.`);
      onLoginSuccess(deptUser);
    }, 400);
  };

  // Quick One-Click Demo Dept HX Login
  const handleQuickDeptHXLogin = (user: ActiveUser) => {
    setDeptHXPasscode(user.passcode || '1234');
    setDeptHXError(null);
    setIsSubmittingDeptHX(true);

    setTimeout(() => {
      setIsSubmittingDeptHX(false);
      onShowToast(`Akses Diterima: ${user.name} (Status: ${user.role.toUpperCase()})`);
      onLoginSuccess(user);
    }, 300);
  };

  return (
    <div className="min-h-screen bg-[#f9f9ff] flex flex-col justify-center items-center px-4 py-8 sm:py-12 select-none selection:bg-[#c1ecd4]">
      {/* Background Islamic Ambient Aura */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-[#c1ecd4]/40 blur-3xl" />
        <div className="absolute -bottom-32 -left-32 w-96 h-96 rounded-full bg-[#fed488]/30 blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-md">
        {/* Brand Top Emblem & Identity */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-[#012d1d] to-[#1b4332] p-3 shadow-lg ring-4 ring-[#c1ecd4]/50 mb-3">
            <img
              src={BRAND_ASSETS.logo}
              alt="NoorWorship Logo"
              className="w-full h-full object-contain filter drop-shadow"
            />
          </div>

          <p className="font-amiri text-xl text-[#785a1a] mb-1 leading-relaxed">
            بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ
          </p>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#012d1d] tracking-tight">
            NoorWorship
          </h1>
          <p className="text-xs text-[#414844] mt-1">
            Sistem Halaqah Qur&apos;ani • Mutaba&apos;ah Ibadah &amp; Evaluasi Tartil
          </p>
        </div>

        {/* Main Auth Container Card */}
        <div className="bg-white rounded-3xl p-5 sm:p-7 shadow-xl border border-[#1b4332]/8 relative overflow-hidden backdrop-blur-xl">
          {/* Tertiary Segmented Tab: Santri vs Ustadz vs Dept HX */}
          <div className="flex bg-[#f1f3ff] p-1.5 rounded-2xl mb-5 gap-1 overflow-x-auto no-scrollbar">
            <button
              type="button"
              onClick={() => {
                setAuthRoleTab('user');
                setSantriError(null);
              }}
              className={`flex-1 min-w-[90px] py-2 px-2 rounded-xl text-[10px] font-bold transition-all flex flex-col items-center justify-center gap-1 cursor-pointer ${
                authRoleTab === 'user'
                  ? 'bg-white text-[#012d1d] shadow-sm border border-[#012d1d]/10'
                  : 'text-[#717973] hover:text-[#141b2b]'
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">person</span>
              <span>Karyawan</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setAuthRoleTab('ustadz');
                setUstadzError(null);
              }}
              className={`flex-1 min-w-[90px] py-2 px-2 rounded-xl text-[10px] font-bold transition-all flex flex-col items-center justify-center gap-1 cursor-pointer ${
                authRoleTab === 'ustadz'
                  ? 'bg-white text-[#012d1d] shadow-sm border border-[#012d1d]/10'
                  : 'text-[#717973] hover:text-[#141b2b]'
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">groups</span>
              <span>Ustadz</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setAuthRoleTab('dept-hx');
                setDeptHXError(null);
              }}
              className={`flex-1 min-w-[90px] py-2 px-2 rounded-xl text-[10px] font-bold transition-all flex flex-col items-center justify-center gap-1 cursor-pointer ${
                authRoleTab === 'dept-hx'
                  ? 'bg-white text-[#00452c] shadow-sm border border-[#00452c]/10'
                  : 'text-[#717973] hover:text-[#141b2b]'
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">admin_panel_settings</span>
              <span>Dept HX</span>
            </button>
          </div>

          {/* ========================================================= */}
          {/* TAB 1: MASUK (UNTUK KARYAWAN / USER) */}
          {/* ========================================================= */}
          {authRoleTab === 'user' && (
            <form onSubmit={handleSantriLogin} className="space-y-4">
              {/* Dept HX Policy Directive Banner */}
              <div className="p-3 rounded-2xl bg-[#012d1d] text-white leading-relaxed shadow-lg border border-[#c1ecd4]/20">
                <div className="flex items-center gap-1.5 font-bold mb-1 text-[#fed488]">
                  <span className="material-symbols-outlined text-[18px]">
                    verified
                  </span>
                  <span className="text-xs uppercase tracking-wider">Penetapan Resmi Dept HX</span>
                </div>
                <p className="text-[10px] text-[#e9fbf2]">
                  Sekali masuk/login, status akun langsung aktif di <strong>halaqah yang telah ditentukan sebelumnya oleh Dept HX</strong>.
                </p>
              </div>
              {santriError && (
                <div className="p-3 rounded-2xl bg-[#ffdad6] text-[#93000a] text-xs font-medium flex items-start gap-2 border border-[#ba1a1a]/20 animate-shake">
                  <span className="material-symbols-outlined text-[18px] shrink-0">error</span>
                  <span>{santriError}</span>
                </div>
              )}

              {/* Santri Name / Identifier */}
              <div>
                <label className="block text-xs font-bold text-[#141b2b] mb-1">
                  Nama Karyawan / Akun
                </label>
                <div className="relative flex items-center">
                  <span className="material-symbols-outlined text-[18px] text-[#717973] absolute left-3 pointer-events-none">
                    person
                  </span>
                  <input
                    type="text"
                    required
                    value={santriIdentifier}
                    onChange={(e) => {
                      setSantriIdentifier(e.target.value);
                      if (santriError) setSantriError(null);
                    }}
                    placeholder="Contoh: Zubair Ahmed atau Zayd Al-Amin"
                    className="w-full pl-9.5 pr-3 py-2.5 rounded-xl bg-[#f1f3ff] text-xs font-semibold text-[#141b2b] placeholder:text-[#717973] focus:bg-white focus:ring-2 focus:ring-[#012d1d] focus:outline-none transition-all"
                  />
                </div>
              </div>

              {/* Real-time Dept HX Halaqah Detection Card */}
              {matchedSantri ? (
                <div className="p-3 rounded-2xl bg-[#c1ecd4]/50 border border-[#00452c]/20 flex items-start gap-2.5 animate-in fade-in duration-200">
                  <span className="material-symbols-outlined text-[20px] text-[#00452c] shrink-0 mt-0.5">
                    how_to_reg
                  </span>
                  <div className="min-w-0">
                    <span className="text-[11px] font-bold text-[#002114] flex items-center gap-1">
                      <span>Penugasan Dept HX Ditemukan</span>
                      <span className="px-1.5 py-0.2 bg-[#00452c] text-white text-[9px] rounded-full">
                        Resmi
                      </span>
                    </span>
                    <p className="text-xs text-[#012d1d] font-bold mt-0.5">
                      {matchedSantri.halaqah}{' '}
                      <span className="font-mono text-[11px] text-[#00452c]">
                        ({matchedSantri.halaqahCode || 'HF-4092'})
                      </span>
                    </p>
                    <p className="text-[10px] text-[#414844] mt-0.5">
                      Pembimbing: {matchedSantri.supervisor || 'Ustadz Farhan'} • Begitu login, Anda langsung masuk ke halaqah ini.
                    </p>
                  </div>
                </div>
              ) : (
                santriIdentifier.trim() && (
                  <div className="p-2.5 rounded-xl bg-[#fff8ef] border border-[#fed488]/40 text-[11px] text-[#785a1a] flex items-center gap-2">
                    <span className="material-symbols-outlined text-[16px] text-[#785a1a] shrink-0">
                      info
                    </span>
                    <span>
                      Mengetik nama... Pilih akun demo di bawah atau masukkan password default "1234".
                    </span>
                  </div>
                )
              )}

              {/* Passcode Input */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-[#141b2b]">
                    Kata Sandi / Passcode
                  </label>
                  <span className="text-[10px] text-[#785a1a] font-medium">
                    Default demo: 1234
                  </span>
                </div>
                <div className="relative flex items-center">
                  <span className="material-symbols-outlined text-[18px] text-[#717973] absolute left-3 pointer-events-none">
                    lock
                  </span>
                  <input
                    type={showSantriPassword ? 'text' : 'password'}
                    required
                    value={santriPassword}
                    onChange={(e) => {
                      setSantriPassword(e.target.value);
                      if (santriError) setSantriError(null);
                    }}
                    placeholder="Masukkan password akun karyawan"
                    className="w-full pl-9.5 pr-10 py-2.5 rounded-xl bg-[#f1f3ff] text-xs font-semibold text-[#141b2b] placeholder:text-[#717973] focus:bg-white focus:ring-2 focus:ring-[#012d1d] focus:outline-none transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowSantriPassword(!showSantriPassword)}
                    className="absolute right-3 text-[#717973] hover:text-[#141b2b] cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[18px]">
                      {showSantriPassword ? 'visibility_off' : 'visibility'}
                    </span>
                  </button>
                </div>
              </div>

              {/* Remember Me */}
              <div className="flex items-center justify-between pt-0.5">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="rounded accent-[#012d1d] w-3.5 h-3.5"
                  />
                  <span className="text-xs text-[#414844] font-medium">Ingat saya</span>
                </label>
                <button
                  type="button"
                  onClick={() =>
                    onShowToast('PIN akun karyawan uji coba secara bawaan adalah: 1234')
                  }
                  className="text-xs text-[#012d1d] hover:underline font-semibold"
                >
                  Lupa password?
                </button>
              </div>

              {/* Submit CTA */}
              <button
                type="submit"
                disabled={isSubmittingSantri}
                className="w-full py-3 rounded-2xl bg-[#012d1d] hover:bg-[#1b4332] active:scale-[0.99] text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer"
              >
                {isSubmittingSantri ? (
                  <>
                    <span className="material-symbols-outlined text-[18px] animate-spin">
                      progress_activity
                    </span>
                    <span>Menghubungkan ke Halaqah...</span>
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-[18px]">login</span>
                    <span>Masuk ke Halaqah Dept HX</span>
                  </>
                )}
              </button>

              {/* Demo Santri Shortcuts Shelf */}
              <div className="pt-2 border-t border-[#f1f3ff]">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-bold text-[#785a1a] uppercase tracking-wider flex items-center gap-1">
                    <span className="material-symbols-outlined text-[14px]">bolt</span>
                    Pintasan Karyawan Uji Coba:
                  </span>
                  <span className="text-[10px] text-[#717973]">Penetapan Dept HX</span>
                </div>

                <div className="space-y-1.5">
                  {demoSantriAccounts.map((user) => (
                    <button
                      key={user.id}
                      type="button"
                      onClick={() => handleQuickSantriLogin(user)}
                      className="w-full p-2.5 rounded-xl bg-[#f1f3ff] hover:bg-[#c1ecd4]/50 border border-transparent hover:border-[#00452c]/20 flex items-center justify-between text-left transition-all cursor-pointer group"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <img
                          src={user.avatar}
                          alt={user.name}
                          className="w-8 h-8 rounded-full object-cover shrink-0 ring-1 ring-white"
                        />
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-bold text-[#141b2b] truncate group-hover:text-[#012d1d]">
                              {user.name}
                            </span>
                            <span className="px-1.5 py-0.2 rounded-full bg-[#fed488]/40 text-[#785a1a] text-[9px] font-bold">
                              Dept HX
                            </span>
                          </div>
                          <span className="text-[10px] text-[#414844] block truncate">
                            {user.halaqah} ({user.halaqahCode || 'HF-4092'}) • {user.supervisor || 'Ustadz Farhan'}
                          </span>
                        </div>
                      </div>
                      <span className="text-[11px] font-bold text-[#012d1d] bg-white px-2 py-1 rounded-lg shrink-0 shadow-xs">
                        Masuk &gt;
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Info Note: Registration is inside Dept HX menu */}
              <div className="p-3 rounded-2xl bg-[#f1f3ff] text-center border border-[#1b4332]/5">
                <p className="text-[11px] text-[#414844] leading-relaxed">
                  <span className="material-symbols-outlined text-[14px] text-[#012d1d] inline align-middle mr-1">
                    info
                  </span>
                  Karyawan baru didaftarkan secara resmi oleh pengurus melalui <strong>Menu Dept HX</strong>.
                </p>
              </div>
            </form>
          )}

          {/* ========================================================= */}
          {/* TAB 2: HALAQOH (UNTUK USTADZ) */}
          {/* ========================================================= */}
          {authRoleTab === 'ustadz' && (
            <form onSubmit={handleUstadzLogin} className="space-y-4">
              <div className="p-3 rounded-2xl bg-[#012d1d] text-white leading-relaxed shadow-lg border border-[#c1ecd4]/20">
                <div className="flex items-center gap-1.5 font-bold mb-1 text-[#fed488]">
                  <span className="material-symbols-outlined text-[18px]">
                    shield_person
                  </span>
                  <span className="text-xs uppercase tracking-wider">Portal Masuk Supervisor Ustadz</span>
                </div>
                <p className="text-[10px] text-[#e9fbf2]">
                  Pilih lingkaran halaqah yang Anda bina dan masukkan passcode Ustadz untuk mengakses konsol evaluasi tajwid dan absensi halaqah.
                </p>
              </div>

              {ustadzError && (
                <div className="p-3 rounded-2xl bg-[#ffdad6] text-[#93000a] text-xs font-medium flex items-start gap-2 border border-[#ba1a1a]/20 animate-shake">
                  <span className="material-symbols-outlined text-[18px] shrink-0">error</span>
                  <span>{ustadzError}</span>
                </div>
              )}

              {/* Select Supervised Halaqah */}
              <div>
                <label className="block text-xs font-bold text-[#141b2b] mb-1">
                  Pilih Lingkaran Halaqah Binaan
                </label>
                <div className="relative flex items-center">
                  <select
                    value={selectedHalaqah}
                    onChange={(e) => {
                      setSelectedHalaqah(e.target.value);
                      if (ustadzError) setUstadzError(null);
                    }}
                    className="w-full px-3 py-2.5 rounded-xl bg-[#f1f3ff] text-xs font-bold text-[#012d1d] focus:bg-white focus:ring-2 focus:ring-[#012d1d] focus:outline-none"
                  >
                    {predefinedHalaqahs.map((h) => (
                      <option key={h.code} value={h.name}>
                        {h.name} ({h.code}) — {h.supervisor}
                      </option>
                    ))}
                  </select>
                </div>
                <p className="text-[10px] text-[#785a1a] font-medium mt-1">
                  ✓ Penugasan resmi pengawas Dept HX
                </p>
              </div>

              {/* Passcode Ustadz Input */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-[#141b2b]">
                    Passcode Supervisor Ustadz
                  </label>
                  <span className="text-[10px] text-[#785a1a] font-medium">
                    PIN Ustadz: 1234
                  </span>
                </div>
                <div className="relative flex items-center">
                  <span className="material-symbols-outlined text-[18px] text-[#717973] absolute left-3 pointer-events-none">
                    key
                  </span>
                  <input
                    type={showUstadzPasscode ? 'text' : 'password'}
                    required
                    value={ustadzPasscode}
                    onChange={(e) => {
                      setUstadzPasscode(e.target.value);
                      if (ustadzError) setUstadzError(null);
                    }}
                    placeholder="Masukkan passcode supervisor (1234)"
                    className="w-full pl-9.5 pr-10 py-2.5 rounded-xl bg-[#f1f3ff] text-xs font-semibold text-[#141b2b] placeholder:text-[#717973] focus:bg-white focus:ring-2 focus:ring-[#012d1d] focus:outline-none transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowUstadzPasscode(!showUstadzPasscode)}
                    className="absolute right-3 text-[#717973] hover:text-[#141b2b] cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[18px]">
                      {showUstadzPasscode ? 'visibility_off' : 'visibility'}
                    </span>
                  </button>
                </div>
              </div>

              {/* Submit CTA */}
              <button
                type="submit"
                disabled={isSubmittingUstadz}
                className="w-full py-3 rounded-2xl bg-[#012d1d] hover:bg-[#1b4332] active:scale-[0.99] text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer mt-2"
              >
                {isSubmittingUstadz ? (
                  <>
                    <span className="material-symbols-outlined text-[18px] animate-spin">
                      progress_activity
                    </span>
                    <span>Membuka Konsol Supervisor...</span>
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-[18px]">shield_person</span>
                    <span>Masuk Konsol Halaqah Ustadz</span>
                  </>
                )}
              </button>

              {/* Demo Ustadz Account Quick-Click */}
              {demoUstadzAccounts.length > 0 && (
                <div className="pt-2 border-t border-[#f1f3ff]">
                  <span className="text-[11px] font-bold text-[#785a1a] uppercase tracking-wider block mb-2">
                    Akun Supervisor Ustadz:
                  </span>
                  <div className="space-y-1.5">
                    {demoUstadzAccounts.map((user) => (
                      <button
                        key={user.id}
                        type="button"
                        onClick={() => handleQuickUstadzLogin(user)}
                        className="w-full p-2.5 rounded-xl bg-[#f1f3ff] hover:bg-[#fed488]/40 border border-transparent hover:border-[#785a1a]/20 flex items-center justify-between text-left transition-all cursor-pointer group"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <img
                            src={user.avatar}
                            alt={user.name}
                            className="w-8 h-8 rounded-full object-cover shrink-0 ring-1 ring-white"
                          />
                          <div className="min-w-0">
                            <span className="text-xs font-bold text-[#141b2b] truncate block group-hover:text-[#012d1d]">
                              {user.name}
                            </span>
                            <span className="text-[10px] text-[#785a1a] block truncate font-medium">
                              {user.halaqah} • Ustadz Pembimbing
                            </span>
                          </div>
                        </div>
                        <span className="text-[11px] font-bold text-[#785a1a] bg-white px-2 py-1 rounded-lg shrink-0 shadow-xs">
                          Masuk &gt;
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </form>
          )}

          {/* ========================================================= */}
          {/* TAB 3: DEPT HX (UNTUK PUSAT) */}
          {/* ========================================================= */}
          {authRoleTab === 'dept-hx' && (
            <form onSubmit={handleDeptHXLogin} className="space-y-4">
              <div className="p-3 rounded-2xl bg-[#012d1d] text-white leading-relaxed shadow-lg border border-[#c1ecd4]/20">
                <div className="flex items-center gap-1.5 font-bold mb-1 text-[#fed488]">
                  <span className="material-symbols-outlined text-[18px]">
                    verified_user
                  </span>
                  <span className="text-xs uppercase tracking-wider">Area Otoritas Direktorat</span>
                </div>
                <p className="text-[10px] text-[#e9fbf2]">
                  Akses khusus pengurus pusat untuk manajemen struktur halaqah, penerbitan SK pembimbing, dan rekapitulasi data nasional.
                </p>
              </div>

              {deptHXError && (
                <div className="p-3 rounded-2xl bg-[#ffdad6] text-[#93000a] text-xs font-medium flex items-start gap-2 border border-[#ba1a1a]/20 animate-shake">
                  <span className="material-symbols-outlined text-[18px] shrink-0">error</span>
                  <span>{deptHXError}</span>
                </div>
              )}

              {/* Passcode Dept HX Input */}
              <div>
                <label className="block text-xs font-bold text-[#141b2b] mb-1">
                  Kode Otorisasi Dept HX
                </label>
                <div className="relative flex items-center">
                  <span className="material-symbols-outlined text-[18px] text-[#717973] absolute left-3 pointer-events-none">
                    key
                  </span>
                  <input
                    type={showDeptHXPasscode ? 'text' : 'password'}
                    required
                    value={deptHXPasscode}
                    onChange={(e) => {
                      setDeptHXPasscode(e.target.value);
                      if (deptHXError) setDeptHXError(null);
                    }}
                    placeholder="Masukkan kode otorisasi pusat"
                    className="w-full pl-9.5 pr-10 py-2.5 rounded-xl bg-[#f1f3ff] text-xs font-semibold text-[#141b2b] placeholder:text-[#717973] focus:bg-white focus:ring-2 focus:ring-[#00452c] focus:outline-none transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowDeptHXPasscode(!showDeptHXPasscode)}
                    className="absolute right-3 text-[#717973] hover:text-[#141b2b] cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[18px]">
                      {showDeptHXPasscode ? 'visibility_off' : 'visibility'}
                    </span>
                  </button>
                </div>
              </div>

              {/* Submit CTA */}
              <button
                type="submit"
                disabled={isSubmittingDeptHX}
                className="w-full py-3 rounded-2xl bg-[#00452c] hover:bg-[#012d1d] active:scale-[0.99] text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer mt-2"
              >
                {isSubmittingDeptHX ? (
                  <>
                    <span className="material-symbols-outlined text-[18px] animate-spin">
                      progress_activity
                    </span>
                    <span>Memverifikasi Otoritas...</span>
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-[18px]">admin_panel_settings</span>
                    <span>Masuk Portal Dept HX</span>
                  </>
                )}
              </button>

              {/* Demo Dept HX Account Quick-Click */}
              {demoDeptHXAccounts.length > 0 && (
                <div className="pt-2 border-t border-[#f1f3ff]">
                  <span className="text-[11px] font-bold text-[#00452c] uppercase tracking-wider block mb-2">
                    Akun Direktorat Demo:
                  </span>
                  <div className="space-y-1.5">
                    {demoDeptHXAccounts.map((user) => (
                      <button
                        key={user.id}
                        type="button"
                        onClick={() => handleQuickDeptHXLogin(user)}
                        className="w-full p-2.5 rounded-xl bg-[#e9fbf2] hover:bg-[#c1ecd4] border border-[#00452c]/5 hover:border-[#00452c]/20 flex items-center justify-between text-left transition-all cursor-pointer group"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <img
                            src={user.avatar}
                            alt={user.name}
                            className="w-8 h-8 rounded-full object-cover shrink-0 ring-1 ring-[#00452c]/20"
                          />
                          <div className="min-w-0">
                            <span className="text-xs font-bold text-[#002114] truncate block group-hover:text-[#00452c]">
                              {user.name}
                            </span>
                            <span className="text-[10px] text-[#00452c] block truncate font-medium">
                              {user.role.toUpperCase()} • {user.halaqah}
                            </span>
                          </div>
                        </div>
                        <span className="text-[11px] font-bold text-[#00452c] bg-white px-2 py-1 rounded-lg shrink-0 shadow-xs border border-[#00452c]/10">
                          Buka Portal &gt;
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </form>
          )}
        </div>

        {/* Footer Note */}
        <p className="text-center text-xs text-[#717973] mt-4">
          NoorWorship • Mutaba&apos;ah Ibadah &amp; Pengukuran Tilawah Tartil
        </p>
      </div>
    </div>
  );
};
