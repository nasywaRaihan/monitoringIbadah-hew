import React, { useState, useMemo, useEffect, useRef } from 'react';
import { ActiveUser } from '../types';
import { BRAND_ASSETS } from '../data/mockData';
import {
  verifyDeptHXPasscode,
  verifyUstadzPasscode,
  getUstadzPasscodeForHalaqah,
  getLockoutRemainingSeconds,
  recordFailedAuthAttempt,
  resetFailedAuthAttempts
} from '../services/securityService';
import { formatSupervisorDisplayName } from '../services/ustadzTitle';

interface RememberedSessionItem {
  id: string;
  name: string;
  halaqah: string;
  halaqahCode: string;
  passcode: string;
  supervisor?: string;
  role: 'member' | 'admin';
  savedAt: string;
}

const REMEMBERED_SESSIONS_KEY = 'noorworship_remembered_sessions_v1';
const REMEMBER_ME_PREF_KEY = 'noorworship_remember_me_pref_v1';

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
  // Login screen strictly has three tabs: 'user' (Karyawan), 'ustadz' (Ustadz), and 'dept-hx' (Direktorat)
  const [authRoleTab, setAuthRoleTab] = useState<'user' | 'ustadz' | 'dept-hx'>('user');

  const [rememberMe, setRememberMe] = useState<boolean>(() => {
    try {
      const savedPref = localStorage.getItem(REMEMBER_ME_PREF_KEY);
      return savedPref !== 'false';
    } catch {
      return true;
    }
  });

  const [rememberedSessions, setRememberedSessions] = useState<RememberedSessionItem[]>(() => {
    const list: RememberedSessionItem[] = [];
    try {
      const raw = localStorage.getItem(REMEMBERED_SESSIONS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          parsed.forEach((item: any) => {
            if (item && item.name && item.role === 'member') {
              list.push(item);
            }
          });
        }
      }
    } catch {}

    // Also seed from last active user on this device (HP or Laptop) if they previously logged in as member
    try {
      const rawActive = localStorage.getItem('noorworship_active_user_prod_v1');
      if (rawActive) {
        const parsedActive = JSON.parse(rawActive);
        if (
          parsedActive &&
          parsedActive.name &&
          parsedActive.role === 'member' &&
          parsedActive.id !== 'user-dept-hx'
        ) {
          const exists = list.some(
            (s) => s.name.trim().toLowerCase() === parsedActive.name.trim().toLowerCase()
          );
          if (!exists) {
            list.unshift({
              id: parsedActive.id,
              name: parsedActive.name,
              halaqah: parsedActive.halaqah || 'Halaqah Utama',
              halaqahCode: parsedActive.halaqahCode || 'HL-1001',
              passcode: parsedActive.passcode || '',
              supervisor: parsedActive.supervisor,
              role: 'member',
              savedAt: new Date().toISOString()
            });
          }
        }
      }
    } catch {}

    return list.slice(0, 5);
  });

  // --- KARYAWAN (USER) LOGIN STATE ---
  const [santriIdentifier, setSantriIdentifier] = useState<string>(() => {
    try {
      const pref = localStorage.getItem(REMEMBER_ME_PREF_KEY);
      if (pref !== 'false' && rememberedSessions.length > 0) {
        return rememberedSessions[0].name;
      }
    } catch {}
    return '';
  });
  const [santriPassword, setSantriPassword] = useState<string>(() => {
    try {
      const pref = localStorage.getItem(REMEMBER_ME_PREF_KEY);
      if (pref !== 'false' && rememberedSessions.length > 0) {
        return rememberedSessions[0].passcode || '';
      }
    } catch {}
    return '';
  });
  const [showSantriPassword, setShowSantriPassword] = useState(false);
  const [santriError, setSantriError] = useState<string | null>(null);
  const [isSubmittingSantri, setIsSubmittingSantri] = useState(false);
  const [isHistoryDropdownOpen, setIsHistoryDropdownOpen] = useState(false);
  const nameFieldContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutsideTouchOrClick = (e: MouseEvent | TouchEvent) => {
      if (
        nameFieldContainerRef.current &&
        !nameFieldContainerRef.current.contains(e.target as Node)
      ) {
        setIsHistoryDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideTouchOrClick);
    document.addEventListener('touchstart', handleOutsideTouchOrClick);
    return () => {
      document.removeEventListener('mousedown', handleOutsideTouchOrClick);
      document.removeEventListener('touchstart', handleOutsideTouchOrClick);
    };
  }, []);

  const saveRememberedSession = (user: ActiveUser, shouldRemember: boolean) => {
    try {
      localStorage.setItem(REMEMBER_ME_PREF_KEY, shouldRemember ? 'true' : 'false');
      const cleanNameLower = user.name.trim().toLowerCase();
      if (shouldRemember) {
        const entry: RememberedSessionItem = {
          id: user.id,
          name: user.name,
          halaqah: user.halaqah || 'Halaqah Utama',
          halaqahCode: user.halaqahCode || 'HL-1001',
          passcode: user.passcode || '',
          supervisor: user.supervisor,
          role: 'member',
          savedAt: new Date().toISOString()
        };
        const updated = [
          entry,
          ...rememberedSessions.filter((s) => s.name.trim().toLowerCase() !== cleanNameLower)
        ].slice(0, 5);
        setRememberedSessions(updated);
        localStorage.setItem(REMEMBERED_SESSIONS_KEY, JSON.stringify(updated));
      } else {
        const updated = rememberedSessions.filter(
          (s) => s.name.trim().toLowerCase() !== cleanNameLower
        );
        setRememberedSessions(updated);
        localStorage.setItem(REMEMBERED_SESSIONS_KEY, JSON.stringify(updated));
      }
    } catch {}
  };

  const handleRemoveRememberedSession = (nameToRemove: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const cleanLower = nameToRemove.trim().toLowerCase();
    const updated = rememberedSessions.filter((s) => s.name.trim().toLowerCase() !== cleanLower);
    setRememberedSessions(updated);
    try {
      localStorage.setItem(REMEMBERED_SESSIONS_KEY, JSON.stringify(updated));
    } catch {}
    if (santriIdentifier.trim().toLowerCase() === cleanLower) {
      setSantriIdentifier('');
      setSantriPassword('');
    }
  };

  // Filter remembered sessions & registered members for mobile-friendly touch suggestions
  const filteredRememberedSessions = useMemo(() => {
    const q = santriIdentifier.trim().toLowerCase();
    if (!q) return rememberedSessions;
    return rememberedSessions.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.halaqah.toLowerCase().includes(q) ||
        s.name.toLowerCase() === q
    );
  }, [rememberedSessions, santriIdentifier]);

  const matchingDirectorySuggestions = useMemo(() => {
    const q = santriIdentifier.trim().toLowerCase();
    if (q.length < 2) return [];
    const rememberedNames = new Set(
      rememberedSessions.map((s) => s.name.trim().toLowerCase())
    );
    return registeredUsers
      .filter((u) => {
        if (u.role !== 'member') return false;
        const lower = u.name.trim().toLowerCase();
        if (rememberedNames.has(lower)) return false;
        if (lower === q) return false;
        return lower.includes(q);
      })
      .slice(0, 5);
  }, [registeredUsers, rememberedSessions, santriIdentifier]);

  // Dynamically load registered Halaqahs created by Dept HX
  const availableHalaqahs = useMemo(() => {
    const map = new Map<string, { name: string; code: string; pin: string; supervisor: string }>();
    let deletedNames: string[] = [];
    try {
      const savedDel = localStorage.getItem('noorworship_deleted_halaqah_names_prod_v1');
      if (savedDel) {
        const parsedDel = JSON.parse(savedDel);
        if (Array.isArray(parsedDel)) deletedNames = parsedDel.map((d: string) => d.trim().toLowerCase());
      }
    } catch {}

    const isInvalidHalaqah = (hName?: string) => {
      if (!hName) return true;
      const clean = hName.trim();
      const lower = clean.toLowerCase();
      return (
        !clean ||
        clean === 'Dept HX Pusat' ||
        clean === 'Tanpa Halaqah' ||
        clean === 'Belum Ada Halaqah' ||
        deletedNames.includes(lower)
      );
    };

    try {
      const saved = localStorage.getItem('noorworship_unified_halaqahs_prod_v1');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          parsed.forEach((h: any) => {
            if (h && h.name && !isInvalidHalaqah(h.name)) {
              map.set(h.name, {
                name: h.name,
                code: h.code || 'HL-1001',
                pin: getUstadzPasscodeForHalaqah(h.name, registeredUsers),
                supervisor: formatSupervisorDisplayName(h.supervisor)
              });
            }
          });
        }
      }
    } catch {}

    registeredUsers.forEach((u) => {
      if (u.halaqah && !isInvalidHalaqah(u.halaqah) && !map.has(u.halaqah)) {
        map.set(u.halaqah, {
          name: u.halaqah,
          code: u.halaqahCode || 'HL-1001',
          pin: getUstadzPasscodeForHalaqah(u.halaqah, registeredUsers),
          supervisor: u.role === 'admin' ? formatSupervisorDisplayName(u.name, u.gender) : formatSupervisorDisplayName(u.supervisor)
        });
      }
    });

    return Array.from(map.values());
  }, [registeredUsers]);

  // --- USTADZ (HALAQOH) LOGIN STATE ---
  const [selectedHalaqah, setSelectedHalaqah] = useState<string>(
    () => availableHalaqahs[0]?.name || ''
  );
  const [ustadzPasscode, setUstadzPasscode] = useState('');
  const [showUstadzPasscode, setShowUstadzPasscode] = useState(false);
  const [ustadzError, setUstadzError] = useState<string | null>(null);
  const [isSubmittingUstadz, setIsSubmittingUstadz] = useState(false);

  // --- DEPT HX LOGIN STATE ---
  const [deptHXPasscode, setDeptHXPasscode] = useState('');
  const [showDeptHXPasscode, setShowDeptHXPasscode] = useState(false);
  const [deptHXError, setDeptHXError] = useState<string | null>(null);
  const [isSubmittingDeptHX, setIsSubmittingDeptHX] = useState(false);

  // Live Detection of user's pre-assigned halaqah by Dept HX
  const matchedSantri = registeredUsers.find((u) => {
    if (!santriIdentifier.trim() || u.role !== 'member') return false;
    const clean = santriIdentifier.trim().toLowerCase();
    return (
      u.name.toLowerCase() === clean ||
      (u.email && u.email.toLowerCase() === clean) ||
      u.id.toLowerCase() === clean
    );
  });

  // Handle Karyawan (User) Login
  const handleSantriLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setSantriError(null);

    const remLock = getLockoutRemainingSeconds('santri');
    if (remLock > 0) {
      setSantriError(`Akses dikunci sementara karena terlalu banyak percobaan gagal. Silakan tunggu ${remLock} detik.`);
      return;
    }

    const cleanIdentifier = santriIdentifier.trim().toLowerCase();
    const cleanPass = santriPassword.trim();

    if (!cleanIdentifier) {
      setSantriError('Masukkan nama lengkap karyawan sesuai yang didaftarkan Dept HX');
      return;
    }
    if (!cleanPass) {
      setSantriError('Masukkan PIN / kata sandi karyawan Anda');
      return;
    }

    setIsSubmittingSantri(true);

    setTimeout(() => {
      const matched = registeredUsers.find((u) => {
        if (u.role === 'dept-hx' || u.role === 'hq-admin') return false;
        const nameMatches = u.name.toLowerCase() === cleanIdentifier;
        const emailMatches = u.email && u.email.toLowerCase() === cleanIdentifier;
        const idMatches = u.id.toLowerCase() === cleanIdentifier;
        return nameMatches || emailMatches || idMatches;
      });

      if (!matched) {
        setIsSubmittingSantri(false);
        setSantriError(
          'Nama karyawan belum terdaftar di database Dept HX. Silakan hubungi Dept HX untuk pendaftaran akun.'
        );
        return;
      }

      if (matched.passcode && matched.passcode !== cleanPass) {
        setIsSubmittingSantri(false);
        const attempt = recordFailedAuthAttempt('santri');
        if (attempt.locked) {
          setSantriError(`Akses dikunci selama ${attempt.lockoutSeconds} detik karena 5x percobaan PIN salah.`);
        } else {
          setSantriError(`PIN / Kata sandi tidak sesuai! Sisa percobaan: ${attempt.remainingAttempts}x.`);
        }
        return;
      }

      resetFailedAuthAttempts('santri');
      saveRememberedSession(matched, rememberMe);
      setIsSubmittingSantri(false);
      onShowToast(
        `Ahlan wa Sahlan, ${matched.name}! Anda masuk ke ${matched.halaqah}.`
      );
      onLoginSuccess(matched);
    }, 300);
  };

  // Handle Ustadz / Halaqah Login
  const handleUstadzLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setUstadzError(null);

    const remLock = getLockoutRemainingSeconds('ustadz');
    if (remLock > 0) {
      setUstadzError(`Akses Ustadz/ah dikunci sementara. Tunggu ${remLock} detik sebelum mencoba kembali.`);
      return;
    }

    const targetHalaqahName = selectedHalaqah || availableHalaqahs[0]?.name || '';
    if (!targetHalaqahName) {
      setUstadzError(
        'Belum ada kelompok Halaqah yang terdaftar. Silakan masuk ke Portal Dept HX terlebih dahulu untuk membuat Halaqah.'
      );
      return;
    }

    const cleanPass = ustadzPasscode.trim();
    if (!cleanPass) {
      setUstadzError('Masukkan PIN / Passcode Supervisor Ustadz/ah');
      return;
    }

    setIsSubmittingUstadz(true);

    setTimeout(() => {
      const currentHalaqah = availableHalaqahs.find((h) => h.name === targetHalaqahName);
      const existingUstadz = registeredUsers.find(
        (u) => u.role === 'admin' && u.halaqah === targetHalaqahName
      );

      if (!verifyUstadzPasscode(targetHalaqahName, cleanPass, registeredUsers)) {
        setIsSubmittingUstadz(false);
        const attempt = recordFailedAuthAttempt('ustadz');
        if (attempt.locked) {
          setUstadzError(
            `Akses dikunci selama ${attempt.lockoutSeconds} detik karena 5x percobaan PIN salah.`
          );
        } else {
          setUstadzError(
            `Passcode supervisor untuk ${targetHalaqahName} salah! Sisa percobaan: ${attempt.remainingAttempts}x.`
          );
        }
        return;
      }

      resetFailedAuthAttempts('ustadz');
      setIsSubmittingUstadz(false);

      const targetUstadz: ActiveUser = existingUstadz
        ? { ...existingUstadz, passcode: cleanPass }
        : {
            id: `ustadz-${targetHalaqahName.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
            name: formatSupervisorDisplayName(currentHalaqah?.supervisor),
            halaqah: targetHalaqahName,
            halaqahCode: currentHalaqah?.code || 'HL-1001',
            passcode: cleanPass,
            avatar: BRAND_ASSETS.currentUserAvatar,
            role: 'admin',
            totalXp: 0,
            streakDays: 0,
            supervisor: 'Departemen HX (Human Experience)',
            assignedHalaqahBy: 'Dept HX',
            hxAssignmentId: `HX-USTADZ-${currentHalaqah?.code || '001'}`,
            hxStatus: 'Resmi Dept HX'
          };

      onShowToast(
        `Ahlan wa Sahlan, ${targetUstadz.name}! Konsol Halaqah ${targetUstadz.halaqah} aktif.`
      );
      onLoginSuccess(targetUstadz);
    }, 300);
  };

  // Handle Dept HX Login
  const handleDeptHXLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setDeptHXError(null);

    const remLock = getLockoutRemainingSeconds('dept-hx');
    if (remLock > 0) {
      setDeptHXError(`Otorisasi Dept HX terkunci sementara. Silakan tunggu ${remLock} detik.`);
      return;
    }

    const cleanPass = deptHXPasscode.trim();
    if (!cleanPass) {
      setDeptHXError('Masukkan kode otorisasi Dept HX');
      return;
    }

    setIsSubmittingDeptHX(true);

    setTimeout(() => {
      if (!verifyDeptHXPasscode(cleanPass, registeredUsers)) {
        setIsSubmittingDeptHX(false);
        const attempt = recordFailedAuthAttempt('dept-hx');
        if (attempt.locked) {
          setDeptHXError(
            `Otorisasi Dept HX dikunci selama ${attempt.lockoutSeconds} detik karena 5x percobaan gagal.`
          );
        } else {
          setDeptHXError(
            `Kode otorisasi tidak valid! Sisa percobaan: ${attempt.remainingAttempts}x.`
          );
        }
        return;
      }

      resetFailedAuthAttempts('dept-hx');
      setIsSubmittingDeptHX(false);

      const foundDeptUser = registeredUsers.find((u) => u.role === 'dept-hx' || u.role === 'hq-admin');
      const deptUser: ActiveUser = foundDeptUser
        ? {
            ...foundDeptUser,
            name: 'Departemen HX (Human Experience)',
            supervisor: 'Departemen HX (Human Experience)'
          }
        : {
            id: 'user-dept-hx',
            name: 'Departemen HX (Human Experience)',
            halaqah: 'Dept HX Pusat',
            halaqahCode: 'HX-HQ-01',
            passcode: cleanPass,
            avatar: BRAND_ASSETS.currentUserAvatar,
            role: 'dept-hx',
            totalXp: 0,
            streakDays: 0,
            supervisor: 'Departemen HX (Human Experience)',
            assignedHalaqahBy: 'Dept HX',
            hxAssignmentId: 'HX-2026-HQ',
            hxStatus: 'Resmi Dept HX'
          };

      onShowToast('Otorisasi Berhasil! Selamat datang di Portal Departemen HX (Human Experience).');
      onLoginSuccess(deptUser);
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
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-[#012d1d] p-1.5 shadow-xl ring-4 ring-[#c1ecd4]/50 mb-3 overflow-hidden relative">
            <img
              src={BRAND_ASSETS.logo}
              alt=""
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
              className="w-full h-full object-contain filter drop-shadow rounded-2xl relative z-10"
            />
            <span className="absolute inset-0 flex items-center justify-center text-[#fed488] font-extrabold text-xl tracking-tight select-none pointer-events-none">
              JT
            </span>
          </div>

          <p className="font-amiri text-xl text-[#785a1a] mb-1 leading-relaxed">
            بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ
          </p>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#012d1d] tracking-tight">
            JejakTaqwa
          </h1>
          <p className="text-xs text-[#414844] mt-1">
            Sistem Halaqoh • Muthoba&apos;ah dan Hafalan
          </p>
        </div>

        {/* Main Auth Container Card */}
        <div className="bg-white rounded-3xl p-5 sm:p-7 shadow-xl border border-[#1b4332]/8 relative overflow-hidden backdrop-blur-xl">
          {/* Segmented Tab: Karyawan vs Ustadz vs Dept HX */}
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
              <span>Ustadz/ah</span>
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
              <div className="p-3 rounded-2xl bg-[#012d1d] text-white leading-relaxed shadow-lg border border-[#c1ecd4]/20">
                <div className="flex items-center gap-1.5 font-bold mb-1 text-[#fed488]">
                  <span className="material-symbols-outlined text-[18px]">verified</span>
                  <span className="text-xs uppercase tracking-wider">Portal Masuk Karyawan</span>
                </div>
                <p className="text-[10px] text-[#e9fbf2]">
                  Masukkan <strong>Nama Lengkap Karyawan</strong> dan <strong>PIN</strong> yang telah didaftarkan oleh Departemen HX (Human Experience).
                </p>
              </div>

              {santriError && (
                <div className="p-3 rounded-2xl bg-[#ffdad6] text-[#93000a] text-xs font-medium flex items-start gap-2 border border-[#ba1a1a]/20">
                  <span className="material-symbols-outlined text-[18px] shrink-0">error</span>
                  <span>{santriError}</span>
                </div>
              )}

              <div ref={nameFieldContainerRef} className="relative">
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-[#141b2b]">
                    Nama Lengkap Karyawan
                  </label>
                </div>
                <div className="relative flex items-center">
                  <span className="material-symbols-outlined text-[18px] text-[#717973] absolute left-3 pointer-events-none">
                    person
                  </span>
                  <input
                    type="text"
                    name="username"
                    autoComplete="username"
                    required
                    value={santriIdentifier}
                    onFocus={() => setIsHistoryDropdownOpen(true)}
                    onClick={() => setIsHistoryDropdownOpen(true)}
                    onChange={(e) => {
                      setSantriIdentifier(e.target.value);
                      setIsHistoryDropdownOpen(true);
                      if (santriError) setSantriError(null);
                    }}
                    placeholder="Ketik nama lengkap sesuai data Dept HX..."
                    className="w-full pl-9.5 pr-8 py-2.5 rounded-xl bg-[#f1f3ff] text-xs font-semibold text-[#141b2b] placeholder:text-[#717973] focus:bg-white focus:ring-2 focus:ring-[#012d1d] focus:outline-none transition-all"
                  />
                  {santriIdentifier && (
                    <button
                      type="button"
                      onClick={() => {
                        setSantriIdentifier('');
                        setSantriPassword('');
                        setIsHistoryDropdownOpen(true);
                      }}
                      className="absolute right-2.5 text-[#717973] hover:text-[#141b2b] cursor-pointer"
                      title="Bersihkan input"
                    >
                      <span className="material-symbols-outlined text-[16px]">close</span>
                    </button>
                  )}
                </div>

                {/* Mobile & Desktop Touch-Friendly Remembered Sessions + Directory Suggestions Dropdown */}
                {isHistoryDropdownOpen &&
                  (filteredRememberedSessions.length > 0 ||
                    matchingDirectorySuggestions.length > 0) && (
                    <div className="absolute left-0 right-0 top-full mt-1.5 z-30 bg-white rounded-2xl shadow-xl border border-[#012d1d]/15 overflow-hidden max-h-60 overflow-y-auto animate-in fade-in duration-150">
                      {filteredRememberedSessions.length > 0 && (
                        <div>
                          <div className="px-3 py-1.5 bg-[#f1f3ff] border-b border-[#012d1d]/10 flex items-center justify-between">
                            <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#012d1d] flex items-center gap-1">
                              <span className="material-symbols-outlined text-[13px]">
                                bookmark_added
                              </span>
                              <span>Riwayat Sesi Tersimpan</span>
                            </span>
                            <span className="text-[10px] text-[#717973]">Ketuk untuk isi otomatis</span>
                          </div>
                          {filteredRememberedSessions.map((session) => (
                            <div
                              key={session.name}
                              onClick={() => {
                                setSantriIdentifier(session.name);
                                if (session.passcode) {
                                  setSantriPassword(session.passcode);
                                }
                                setSantriError(null);
                                setIsHistoryDropdownOpen(false);
                              }}
                              className="px-3 py-2.5 hover:bg-[#c1ecd4]/35 active:bg-[#c1ecd4]/50 border-b border-[#f1f3ff] last:border-b-0 flex items-center justify-between gap-2 cursor-pointer transition-colors"
                            >
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-1.5">
                                  <span className="text-xs font-bold text-[#012d1d] truncate">
                                    {session.name}
                                  </span>
                                  <span className="px-1.5 py-0.2 rounded-full bg-[#c1ecd4] text-[#002114] text-[9px] font-bold shrink-0">
                                    Tersimpan
                                  </span>
                                </div>
                                <p className="text-[10px] text-[#414844] truncate mt-0.5">
                                  {session.halaqah} ({session.halaqahCode})
                                </p>
                              </div>
                              <button
                                type="button"
                                onClick={(e) => handleRemoveRememberedSession(session.name, e)}
                                className="w-6 h-6 rounded-full hover:bg-rose-100 text-[#717973] hover:text-rose-700 flex items-center justify-center shrink-0 cursor-pointer"
                                title="Hapus dari riwayat sesi"
                              >
                                <span className="material-symbols-outlined text-[14px]">close</span>
                              </button>
                            </div>
                          ))}
                        </div>
                      )}

                      {matchingDirectorySuggestions.length > 0 && (
                        <div>
                          <div className="px-3 py-1.5 bg-[#f9f9ff] border-b border-[#012d1d]/10">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-[#414844] flex items-center gap-1">
                              <span className="material-symbols-outlined text-[13px]">
                                person_search
                              </span>
                              <span>Saran Nama Karyawan Terdaftar</span>
                            </span>
                          </div>
                          {matchingDirectorySuggestions.map((u) => (
                            <div
                              key={u.id}
                              onClick={() => {
                                setSantriIdentifier(u.name);
                                setSantriError(null);
                                setIsHistoryDropdownOpen(false);
                              }}
                              className="px-3 py-2 hover:bg-[#f1f3ff] active:bg-[#e4e7ff] border-b border-[#f1f3ff] last:border-b-0 flex items-center justify-between gap-2 cursor-pointer transition-colors"
                            >
                              <div className="min-w-0">
                                <p className="text-xs font-bold text-[#141b2b] truncate">{u.name}</p>
                                <p className="text-[10px] text-[#717973] truncate">
                                  {u.halaqah} ({u.halaqahCode})
                                </p>
                              </div>
                              <span className="material-symbols-outlined text-[15px] text-[#012d1d]">
                                north_west
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                {/* Quick-Select Remembered Session Chips (Always visible on HP & Laptop when sessions exist) */}
                {rememberedSessions.length > 0 && (
                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    <span className="text-[10px] font-semibold text-[#717973] flex items-center gap-0.5">
                      <span className="material-symbols-outlined text-[13px] text-[#00452c]">
                        history
                      </span>
                      <span>Sesi Tersimpan:</span>
                    </span>
                    {rememberedSessions.map((session) => {
                      const isSelected =
                        santriIdentifier.trim().toLowerCase() ===
                        session.name.trim().toLowerCase();
                      return (
                        <button
                          key={session.name}
                          type="button"
                          onClick={() => {
                            setSantriIdentifier(session.name);
                            if (session.passcode) {
                              setSantriPassword(session.passcode);
                            }
                            setSantriError(null);
                            setIsHistoryDropdownOpen(false);
                          }}
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11px] font-bold transition-all cursor-pointer border ${
                            isSelected
                              ? 'bg-[#012d1d] text-white border-[#012d1d] shadow-2xs'
                              : 'bg-[#f1f3ff] hover:bg-[#c1ecd4]/50 text-[#012d1d] border-[#012d1d]/10'
                          }`}
                        >
                          <span className="material-symbols-outlined text-[13px]">
                            account_circle
                          </span>
                          <span className="truncate max-w-[150px]">{session.name}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {matchedSantri && (
                <div className="p-3 rounded-2xl bg-[#c1ecd4]/50 border border-[#00452c]/20 flex items-start gap-2.5 animate-in fade-in duration-200">
                  <span className="material-symbols-outlined text-[20px] text-[#00452c] shrink-0 mt-0.5">
                    how_to_reg
                  </span>
                  <div className="min-w-0">
                    <span className="text-[11px] font-bold text-[#002114] flex items-center gap-1">
                      <span>Terdaftar di Database Dept HX</span>
                      <span className="px-1.5 py-0.2 bg-[#00452c] text-white text-[9px] rounded-full">
                        Resmi
                      </span>
                    </span>
                    <p className="text-xs text-[#012d1d] font-bold mt-0.5">
                      {matchedSantri.halaqah}{' '}
                      <span className="font-mono text-[11px] text-[#00452c]">
                        ({matchedSantri.halaqahCode})
                      </span>
                    </p>
                    <p className="text-[10px] text-[#414844] mt-0.5">
                      Pembimbing: {formatSupervisorDisplayName(matchedSantri.supervisor)}
                    </p>
                  </div>
                </div>
              )}

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-[#141b2b]">
                    PIN / Kata Sandi Karyawan
                  </label>
                </div>
                <div className="relative flex items-center">
                  <span className="material-symbols-outlined text-[18px] text-[#717973] absolute left-3 pointer-events-none">
                    lock
                  </span>
                  <input
                    type={showSantriPassword ? 'text' : 'password'}
                    name="password"
                    autoComplete="current-password"
                    required
                    value={santriPassword}
                    onChange={(e) => {
                      setSantriPassword(e.target.value);
                      if (santriError) setSantriError(null);
                    }}
                    placeholder="Masukkan PIN akun karyawan"
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

              <div className="flex items-center justify-between pt-0.5">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => {
                      setRememberMe(e.target.checked);
                      try {
                        localStorage.setItem(
                          REMEMBER_ME_PREF_KEY,
                          e.target.checked ? 'true' : 'false'
                        );
                      } catch {}
                    }}
                    className="rounded accent-[#012d1d] w-3.5 h-3.5"
                  />
                  <span className="text-xs text-[#414844] font-medium">Ingat sesi saya</span>
                </label>
                <button
                  type="button"
                  onClick={() =>
                    onShowToast('Silakan hubungi pengurus Departemen HX (Human Experience) untuk informasi PIN akun Anda.')
                  }
                  className="text-xs text-[#012d1d] hover:underline font-semibold cursor-pointer"
                >
                  Lupa PIN?
                </button>
              </div>

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
                    <span>Memverifikasi Data Karyawan...</span>
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-[18px]">login</span>
                    <span>Masuk ke Akun Karyawan</span>
                  </>
                )}
              </button>

              <div className="p-3 rounded-2xl bg-[#f1f3ff] text-center border border-[#1b4332]/5">
                <p className="text-[11px] text-[#414844] leading-relaxed">
                  <span className="material-symbols-outlined text-[14px] text-[#012d1d] inline align-middle mr-1">
                    info
                  </span>
                  Karyawan didaftarkan secara resmi oleh Departemen Human Experience
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
                  <span className="material-symbols-outlined text-[18px]">shield_person</span>
                  <span className="text-xs uppercase tracking-wider">Portal Masuk Supervisor Ustadz/ah</span>
                </div>
                <p className="text-[10px] text-[#e9fbf2]">
                  Pilih lingkaran halaqah ampuan Anda dan masukkan PIN Ustadz/ah untuk mengakses konsol evaluasi tajwid dan presensi halaqah.
                </p>
              </div>

              {ustadzError && (
                <div className="p-3 rounded-2xl bg-[#ffdad6] text-[#93000a] text-xs font-medium flex items-start gap-2 border border-[#ba1a1a]/20">
                  <span className="material-symbols-outlined text-[18px] shrink-0">error</span>
                  <span>{ustadzError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-[#141b2b] mb-1">
                  Pilih Lingkaran Halaqah Ampuan
                </label>
                {availableHalaqahs.length > 0 ? (
                  <div className="relative flex items-center">
                    <select
                      value={selectedHalaqah || availableHalaqahs[0]?.name || ''}
                      onChange={(e) => {
                        setSelectedHalaqah(e.target.value);
                        if (ustadzError) setUstadzError(null);
                      }}
                      className="w-full px-3 py-2.5 rounded-xl bg-[#f1f3ff] text-xs font-bold text-[#012d1d] focus:bg-white focus:ring-2 focus:ring-[#012d1d] focus:outline-none"
                    >
                      {availableHalaqahs.map((h) => (
                        <option key={h.name} value={h.name}>
                          {h.name} ({h.code}) — {h.supervisor}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div className="p-3 rounded-xl bg-[#fff8ef] border border-[#fed488]/60 text-[11px] text-[#785a1a]">
                    Belum ada kelompok Halaqah terdaftar. Silakan masuk ke tab <strong>Dept HX</strong> terlebih dahulu untuk membuat Halaqah atau mengimpor Excel.
                  </div>
                )}
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-[#141b2b]">
                    PIN / Passcode Supervisor Ustadz/ah
                  </label>
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
                    placeholder="Masukkan passcode supervisor Ustadz/ah"
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

              <button
                type="submit"
                disabled={isSubmittingUstadz || availableHalaqahs.length === 0}
                className="w-full py-3 rounded-2xl bg-[#012d1d] hover:bg-[#1b4332] disabled:opacity-50 active:scale-[0.99] text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer mt-2"
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
                    <span>Masuk Konsol Halaqah Ustadz/ah</span>
                  </>
                )}
              </button>
            </form>
          )}

          {/* ========================================================= */}
          {/* TAB 3: DEPT HX (UNTUK PUSAT) */}
          {/* ========================================================= */}
          {authRoleTab === 'dept-hx' && (
            <form onSubmit={handleDeptHXLogin} className="space-y-4">
              <div className="p-3 rounded-2xl bg-[#012d1d] text-white leading-relaxed shadow-lg border border-[#c1ecd4]/20">
                <div className="flex items-center gap-1.5 font-bold mb-1 text-[#fed488]">
                  <span className="material-symbols-outlined text-[18px]">verified_user</span>
                  <span className="text-xs uppercase tracking-wider">Area Otoritas Departemen Human Experience</span>
                </div>
                <p className="text-[10px] text-[#e9fbf2]">
                  Akses khusus pengurus pusat untuk pendaftaran karyawan asli, pembuatan kelompok halaqah, penetapan Ustadz/ah pembimbing, dan rekapitulasi mutaba&apos;ah.
                </p>
              </div>

              {deptHXError && (
                <div className="p-3 rounded-2xl bg-[#ffdad6] text-[#93000a] text-xs font-medium flex items-start gap-2 border border-[#ba1a1a]/20">
                  <span className="material-symbols-outlined text-[18px] shrink-0">error</span>
                  <span>{deptHXError}</span>
                </div>
              )}

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
                    placeholder="Masukkan kode otorisasi Dept HX"
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
            </form>
          )}
        </div>

        {/* Footer Note */}
        <p className="text-center text-xs text-[#717973] mt-4">
          JejakTaqwa • Aplikasi monitoring ibadah karyawan PT Herba Emas Wahidatama
        </p>
      </div>
    </div>
  );
};
