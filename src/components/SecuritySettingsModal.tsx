import React, { useState, useEffect, useMemo } from 'react';
import { ActiveUser } from '../types';
import {
  verifyDeptHXPasscode,
  updateDeptHXPasscode,
  getUstadzPasscodeForHalaqah,
  updateUstadzPasscodeForHalaqah,
  isDeptHXCustomPasscodeSet,
  getSecurityAuditLogs,
  addSecurityAuditLog,
  getLockoutRemainingSeconds,
  recordFailedAuthAttempt,
  resetFailedAuthAttempts,
  SecurityAuditEntry
} from '../services/securityService';
import { getUstadzTitle, formatSupervisorDisplayName } from '../services/ustadzTitle';

interface HalaqahItem {
  id?: string;
  name: string;
  code: string;
  supervisor: string;
}

interface SecuritySettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  registeredUsers: ActiveUser[];
  halaqahList: HalaqahItem[];
  onUpdateUserPasscode: (
    userId: string,
    newPasscode: string,
    role?: 'member' | 'admin' | 'dept-hx',
    halaqahName?: string
  ) => void;
  onShowToast: (msg: string) => void;
}

export const SecuritySettingsModal: React.FC<SecuritySettingsModalProps> = ({
  isOpen,
  onClose,
  registeredUsers,
  halaqahList,
  onUpdateUserPasscode,
  onShowToast
}) => {
  // Step 1: Strict Gatekeeper — Must verify current Dept HX Master Code before viewing/changing any credentials
  const [isGateUnlocked, setIsGateUnlocked] = useState(false);
  const [gatePasscode, setGatePasscode] = useState('');
  const [showGatePasscode, setShowGatePasscode] = useState(false);
  const [gateError, setGateError] = useState<string | null>(null);
  const [lockoutSeconds, setLockoutSeconds] = useState(0);

  // Active Tab inside Security Center
  const [activeTab, setActiveTab] = useState<'dept-hx' | 'ustadz' | 'karyawan' | 'audit'>('dept-hx');

  // Tab 1: Dept HX Master Passcode Form
  const [currentHxInput, setCurrentHxInput] = useState('');
  const [newHxPasscode, setNewHxPasscode] = useState('');
  const [confirmHxPasscode, setConfirmHxPasscode] = useState('');
  const [showHxFields, setShowHxFields] = useState(false);
  const [hxFormError, setHxFormError] = useState<string | null>(null);
  const [hxCustomActive, setHxCustomActive] = useState(() => isDeptHXCustomPasscodeSet());

  // Tab 2: Ustadz PINs per Halaqah
  const [ustadzSearch, setUstadzSearch] = useState('');
  const [editingHalaqahName, setEditingHalaqahName] = useState<string | null>(null);
  const [newUstadzPin, setNewUstadzPin] = useState('');
  const [confirmUstadzPin, setConfirmUstadzPin] = useState('');
  const [showUstadzPinMap, setShowUstadzPinMap] = useState<Record<string, boolean>>({});
  const [ustadzFormError, setUstadzFormError] = useState<string | null>(null);
  const [pinRefreshTick, setPinRefreshTick] = useState(0);

  // Tab 3: Karyawan PIN Reset
  const [employeeSearch, setEmployeeSearch] = useState('');
  const [editingEmployeeId, setEditingEmployeeId] = useState<string | null>(null);
  const [newEmployeePin, setNewEmployeePin] = useState('');
  const [revealedEmployeeIds, setRevealedEmployeeIds] = useState<Record<string, boolean>>({});

  // Tab 4: Security Audit Log
  const [auditLogs, setAuditLogs] = useState<SecurityAuditEntry[]>([]);

  useEffect(() => {
    if (isOpen) {
      // Always require fresh verification when opening the Security Center
      setIsGateUnlocked(false);
      setGatePasscode('');
      setGateError(null);
      setLockoutSeconds(getLockoutRemainingSeconds('dept-hx'));
      setCurrentHxInput('');
      setNewHxPasscode('');
      setConfirmHxPasscode('');
      setHxFormError(null);
      setEditingHalaqahName(null);
      setEditingEmployeeId(null);
      setShowUstadzPinMap({});
      setRevealedEmployeeIds({});
      setHxCustomActive(isDeptHXCustomPasscodeSet());
      setAuditLogs(getSecurityAuditLogs());
    }
  }, [isOpen]);

  useEffect(() => {
    if (lockoutSeconds <= 0) return;
    const timer = setInterval(() => {
      const rem = getLockoutRemainingSeconds('dept-hx');
      setLockoutSeconds(rem);
      if (rem <= 0) setGateError(null);
    }, 1000);
    return () => clearInterval(timer);
  }, [lockoutSeconds]);

  const allHalaqahs = useMemo(() => {
    const map = new Map<string, { name: string; code: string; supervisor: string; pin: string }>();

    halaqahList.forEach((h) => {
      if (h?.name) {
        map.set(h.name, {
          name: h.name,
          code: h.code || 'HX-001',
          supervisor: formatSupervisorDisplayName(h.supervisor),
          pin: getUstadzPasscodeForHalaqah(h.name, registeredUsers)
        });
      }
    });

    registeredUsers.forEach((u) => {
      if (u.halaqah && u.halaqah !== 'Dept HX Pusat' && !map.has(u.halaqah)) {
        map.set(u.halaqah, {
          name: u.halaqah,
          code: u.halaqahCode || 'HX-001',
          supervisor: u.role === 'admin' ? formatSupervisorDisplayName(u.name, u.gender) : formatSupervisorDisplayName(u.supervisor),
          pin: getUstadzPasscodeForHalaqah(u.halaqah, registeredUsers)
        });
      }
    });

    return Array.from(map.values());
  }, [halaqahList, registeredUsers, pinRefreshTick]);

  const filteredHalaqahs = useMemo(() => {
    if (!ustadzSearch.trim()) return allHalaqahs;
    const q = ustadzSearch.toLowerCase();
    return allHalaqahs.filter(
      (h) =>
        h.name.toLowerCase().includes(q) ||
        h.supervisor.toLowerCase().includes(q) ||
        h.code.toLowerCase().includes(q)
    );
  }, [allHalaqahs, ustadzSearch]);

  const employeeList = useMemo(() => {
    return registeredUsers
      .filter((u) => u.role === 'member')
      .filter((u) => {
        if (!employeeSearch.trim()) return true;
        const q = employeeSearch.toLowerCase();
        return (
          u.name.toLowerCase().includes(q) ||
          (u.halaqah || '').toLowerCase().includes(q)
        );
      });
  }, [registeredUsers, employeeSearch]);

  if (!isOpen) return null;

  const handleUnlockGate = (e: React.FormEvent) => {
    e.preventDefault();
    const remLock = getLockoutRemainingSeconds('dept-hx');
    if (remLock > 0) {
      setLockoutSeconds(remLock);
      setGateError(`Terlalu banyak percobaan gagal. Tunggu ${remLock} detik.`);
      return;
    }

    const clean = gatePasscode.trim();
    if (!clean) {
      setGateError('Masukkan Kode Otorisasi Dept HX saat ini untuk membuka Brankas Keamanan.');
      return;
    }

    if (verifyDeptHXPasscode(clean, registeredUsers)) {
      resetFailedAuthAttempts('dept-hx');
      setIsGateUnlocked(true);
      setCurrentHxInput(clean);
      setGateError(null);
    } else {
      const attempt = recordFailedAuthAttempt('dept-hx');
      if (attempt.locked) {
        setLockoutSeconds(attempt.lockoutSeconds);
        setGateError(
          `Brankas Keamanan dikunci selama ${attempt.lockoutSeconds} detik karena 5x percobaan gagal.`
        );
      } else {
        setGateError(
          `Kode Otorisasi salah! Sisa percobaan: ${attempt.remainingAttempts}x.`
        );
      }
    }
  };

  const handleSaveDeptHXPasscode = (e: React.FormEvent) => {
    e.preventDefault();
    setHxFormError(null);

    if (!currentHxInput.trim()) {
      setHxFormError('Masukkan Kode Otorisasi Dept HX saat ini.');
      return;
    }

    if (newHxPasscode.trim().length < 4) {
      setHxFormError('Kode Otorisasi baru minimal 4 karakter.');
      return;
    }

    if (newHxPasscode.trim() !== confirmHxPasscode.trim()) {
      setHxFormError('Konfirmasi Kode Otorisasi baru tidak cocok!');
      return;
    }

    if (newHxPasscode.trim() === currentHxInput.trim()) {
      setHxFormError('Kode Otorisasi baru harus berbeda dari kode saat ini.');
      return;
    }

    const res = updateDeptHXPasscode(
      currentHxInput.trim(),
      newHxPasscode.trim(),
      registeredUsers
    );

    if (!res.success) {
      setHxFormError(res.message);
      return;
    }

    // Also update the user-dept-hx record in state & Firestore
    onUpdateUserPasscode('user-dept-hx', newHxPasscode.trim(), 'dept-hx', 'Dept HX Pusat');
    setCurrentHxInput(newHxPasscode.trim());
    setNewHxPasscode('');
    setConfirmHxPasscode('');
    setHxCustomActive(true);
    setAuditLogs(getSecurityAuditLogs());
    onShowToast(res.message);
  };

  const handleSaveUstadzPin = (halaqahName: string) => {
    setUstadzFormError(null);
    const cleanPin = newUstadzPin.trim();
    const cleanConfirm = confirmUstadzPin.trim();

    if (cleanPin.length < 4) {
      setUstadzFormError('PIN / Password Ustadz/ah minimal harus 4 karakter.');
      return;
    }

    if (cleanPin !== cleanConfirm) {
      setUstadzFormError('Konfirmasi PIN Ustadz/ah tidak cocok!');
      return;
    }

    const res = updateUstadzPasscodeForHalaqah(
      halaqahName,
      cleanPin,
      currentHxInput,
      registeredUsers
    );

    if (!res.success) {
      setUstadzFormError(res.message);
      return;
    }

    // Sync with any admin user for this halaqah
    const ustadzUser = registeredUsers.find(
      (u) => u.role === 'admin' && (u.halaqah || '').toLowerCase() === halaqahName.toLowerCase()
    );
    if (ustadzUser) {
      onUpdateUserPasscode(ustadzUser.id, cleanPin, 'admin', halaqahName);
    } else {
      onUpdateUserPasscode(
        `ustadz-${halaqahName.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
        cleanPin,
        'admin',
        halaqahName
      );
    }

    setEditingHalaqahName(null);
    setNewUstadzPin('');
    setConfirmUstadzPin('');
    setPinRefreshTick((t) => t + 1);
    setAuditLogs(getSecurityAuditLogs());
    onShowToast(res.message);
  };

  const handleSaveEmployeePin = (emp: ActiveUser) => {
    const cleanPin = newEmployeePin.trim();
    if (cleanPin.length < 4) {
      onShowToast('PIN Karyawan minimal harus 4 karakter!');
      return;
    }

    onUpdateUserPasscode(emp.id, cleanPin, 'member', emp.halaqah);
    addSecurityAuditLog(
      'Departemen HX (Human Experience)',
      `Mengubah PIN Login Karyawan (${emp.halaqah})`,
      emp.name
    );
    setEditingEmployeeId(null);
    setNewEmployeePin('');
    setAuditLogs(getSecurityAuditLogs());
    onShowToast(`PIN login untuk karyawan "${emp.name}" berhasil diperbarui!`);
  };

  const getPasscodeStrength = (code: string) => {
    const c = code.trim();
    if (!c) return { label: 'Belum Diisi', color: 'bg-slate-200 text-slate-600', width: 'w-0' };
    if (c.length < 4) return { label: 'Terlalu Pendek (Min. 4)', color: 'bg-rose-100 text-rose-700', width: 'w-1/4' };
    const hasLetters = /[a-zA-Z]/.test(c);
    const hasNumbers = /[0-9]/.test(c);
    const hasSpecial = /[^a-zA-Z0-9]/.test(c);
    if (c.length >= 8 && hasLetters && hasNumbers && hasSpecial) {
      return { label: 'Sangat Kuat', color: 'bg-emerald-100 text-emerald-800', width: 'w-full' };
    }
    if (c.length >= 6 && hasLetters && hasNumbers) {
      return { label: 'Kuat', color: 'bg-teal-100 text-teal-800', width: 'w-3/4' };
    }
    return { label: 'Standar Valid', color: 'bg-amber-100 text-amber-800', width: 'w-2/4' };
  };

  const strength = getPasscodeStrength(newHxPasscode);

  return (
    <div className="fixed inset-0 z-[75] bg-[#141b2b]/65 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-150">
      <div className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-[#1b4332]/15 overflow-hidden my-auto max-h-[92vh] flex flex-col animate-in zoom-in-95 duration-150">
        {/* Top Security Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-br from-[#012d1d] via-[#093522] to-[#1b4332] text-white relative overflow-hidden shrink-0">
          <div className="absolute -right-8 -top-8 w-28 h-28 rounded-full bg-[#fed488]/15 blur-xl pointer-events-none" />
          <div className="flex items-start justify-between gap-3 relative z-10">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-white/15 backdrop-blur-md text-[#fed488] flex items-center justify-center shrink-0 shadow-inner">
                <span
                  className="material-symbols-outlined text-[24px]"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  shield_lock
                </span>
              </div>
              <div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="px-2 py-0.5 rounded-full bg-white/15 text-[#92f7c3] text-[10px] font-bold uppercase tracking-wider">
                    Brankas Kredensial Dept HX
                  </span>
                  {isGateUnlocked && (
                    <span className="px-2 py-0.5 rounded-full bg-[#fed488] text-[#261900] text-[10px] font-extrabold inline-flex items-center gap-1">
                      <span className="material-symbols-outlined text-[12px]">verified</span>
                      Sesi Terverifikasi
                    </span>
                  )}
                </div>
                <h3 className="text-base sm:text-lg font-extrabold text-white mt-0.5">
                  Pengaturan PIN &amp; Password Otoritas
                </h3>
                <p className="text-[11px] text-[#c1ecd4]/90">
                  Kelola Kode Master Dept HX, PIN Supervisor Ustadz/ah per Halaqah, dan Reset PIN Karyawan.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer shrink-0"
              title="Tutup"
            >
              <span className="material-symbols-outlined text-[18px]">close</span>
            </button>
          </div>
        </div>

        {/* STEP 1: STRICT RE-AUTHENTICATION GATE */}
        {!isGateUnlocked ? (
          <div className="p-5 sm:p-6 space-y-4 overflow-y-auto">
            <div className="p-4 rounded-2xl bg-[#f9f9ff] border border-[#1b4332]/10 flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#012d1d] text-[#fed488] flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-[20px]">lock_person</span>
              </div>
              <div className="space-y-1">
                <h4 className="text-xs sm:text-sm font-bold text-[#141b2b]">
                  Verifikasi Keamanan Berlapis Diperlukan
                </h4>
                <p className="text-xs text-[#414844] leading-relaxed">
                  Untuk mencegah perubahan PIN tanpa izin saat perangkat ditinggalkan, Anda wajib memasukkan <strong>Kode Otorisasi Dept HX Saat Ini</strong> sebelum membuka pengaturan password.
                </p>
              </div>
            </div>

            <form onSubmit={handleUnlockGate} className="space-y-3 max-w-md mx-auto pt-1">
              <div>
                <label className="block text-xs font-bold text-[#141b2b] mb-1.5">
                  Kode Otorisasi Dept HX Saat Ini
                </label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-[18px] text-[#717973]">
                    key
                  </span>
                  <input
                    type={showGatePasscode ? 'text' : 'password'}
                    disabled={lockoutSeconds > 0}
                    value={gatePasscode}
                    onChange={(e) => {
                      setGatePasscode(e.target.value);
                      setGateError(null);
                    }}
                    placeholder={
                      lockoutSeconds > 0
                        ? `Terkunci (${lockoutSeconds} detik)...`
                        : 'Ketik kode otorisasi Dept HX Anda...'
                    }
                    className="w-full pl-10 pr-10 py-3 rounded-2xl bg-[#f1f3ff] text-sm font-bold text-[#141b2b] placeholder:text-[#717973] border border-[#1b4332]/15 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#012d1d]"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => setShowGatePasscode(!showGatePasscode)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#717973] hover:text-[#141b2b] cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[18px]">
                      {showGatePasscode ? 'visibility_off' : 'visibility'}
                    </span>
                  </button>
                </div>
                {!hxCustomActive && (
                  <p className="text-[11px] text-[#717973] mt-1.5">
                    💡 Jika Anda belum pernah mengganti kode sejak instalasi awal, kode bawaan pabrik adalah <code className="px-1.5 py-0.5 rounded bg-[#e9edff] text-[#012d1d] font-mono font-bold">hx2026</code>. Segera ganti setelah masuk.
                  </p>
                )}
              </div>

              {gateError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 font-semibold flex items-center gap-2">
                  <span className="material-symbols-outlined text-[16px] shrink-0">error</span>
                  <span>{gateError}</span>
                </div>
              )}

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-2.5 rounded-full bg-[#f1f3ff] hover:bg-[#e4e7ff] text-[#414844] text-xs font-bold transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={lockoutSeconds > 0}
                  className="flex-1 py-2.5 rounded-full bg-[#012d1d] hover:bg-[#1b4332] disabled:opacity-50 text-white text-xs font-bold transition-all shadow-md active:scale-95 cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-[16px] text-[#fed488]">
                    lock_open
                  </span>
                  <span>Buka Brankas PIN</span>
                </button>
              </div>
            </form>
          </div>
        ) : (
          /* STEP 2: UNLOCKED SECURITY MANAGEMENT CONSOLE */
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
            {/* Navigation Tabs */}
            <div className="px-4 sm:px-5 pt-3 pb-2 border-b border-[#f1f3ff] flex items-center gap-1.5 overflow-x-auto no-scrollbar shrink-0 bg-[#f9f9ff]">
              <button
                type="button"
                onClick={() => setActiveTab('dept-hx')}
                className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shrink-0 whitespace-nowrap ${
                  activeTab === 'dept-hx'
                    ? 'bg-[#012d1d] text-white shadow-xs'
                    : 'bg-white text-[#414844] hover:bg-[#e9edff] border border-[#1b4332]/10'
                }`}
              >
                <span className="material-symbols-outlined text-[16px]">admin_panel_settings</span>
                <span>Password Dept HX</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('ustadz')}
                className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shrink-0 whitespace-nowrap ${
                  activeTab === 'ustadz'
                    ? 'bg-[#012d1d] text-white shadow-xs'
                    : 'bg-white text-[#414844] hover:bg-[#e9edff] border border-[#1b4332]/10'
                }`}
              >
                <span className="material-symbols-outlined text-[16px]">shield_person</span>
                <span>PIN Ustadz/ah ({allHalaqahs.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('karyawan')}
                className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shrink-0 whitespace-nowrap ${
                  activeTab === 'karyawan'
                    ? 'bg-[#012d1d] text-white shadow-xs'
                    : 'bg-white text-[#414844] hover:bg-[#e9edff] border border-[#1b4332]/10'
                }`}
              >
                <span className="material-symbols-outlined text-[16px]">badge</span>
                <span>PIN Karyawan ({employeeList.length})</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setAuditLogs(getSecurityAuditLogs());
                  setActiveTab('audit');
                }}
                className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shrink-0 whitespace-nowrap ${
                  activeTab === 'audit'
                    ? 'bg-[#012d1d] text-white shadow-xs'
                    : 'bg-white text-[#414844] hover:bg-[#e9edff] border border-[#1b4332]/10'
                }`}
              >
                <span className="material-symbols-outlined text-[16px]">policy</span>
                <span>Log Audit ({auditLogs.length})</span>
              </button>
            </div>

            {/* Tab Contents */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
              {/* TAB 1: DEPT HX MASTER PASSCODE */}
              {activeTab === 'dept-hx' && (
                <form onSubmit={handleSaveDeptHXPasscode} className="space-y-4">
                  <div className="p-3.5 rounded-2xl bg-[#e9fbf2] border border-[#00452c]/20 flex items-start gap-2.5 text-xs text-[#00452c]">
                    <span className="material-symbols-outlined text-[18px] shrink-0">
                      verified_user
                    </span>
                    <div className="space-y-0.5">
                      <span className="font-bold block">
                        Status Proteksi Master Dept HX:{' '}
                        {hxCustomActive
                          ? 'Kode Kustom Aktif (Semua Kode Bawaan Dinonaktifkan)'
                          : 'Menggunakan Kode Awal (Disarankan Segera Diganti)'}
                      </span>
                      <p className="text-[11px] leading-relaxed text-[#1b4332]">
                        Setelah Anda menyimpan Kode Otorisasi baru di bawah ini, sistem secara otomatis menutup semua kode lama dan hanya mengizinkan kode baru Anda untuk masuk ke Portal Dept HX.
                      </p>
                    </div>
                  </div>

                  {hxFormError && (
                    <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 font-semibold flex items-center gap-2">
                      <span className="material-symbols-outlined text-[16px] shrink-0">error</span>
                      <span>{hxFormError}</span>
                    </div>
                  )}

                  <div className="space-y-3">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-xs font-bold text-[#141b2b]">
                          Kode Otorisasi Dept HX Saat Ini <span className="text-rose-600">*</span>
                        </label>
                        <button
                          type="button"
                          onClick={() => setShowHxFields(!showHxFields)}
                          className="text-[11px] font-bold text-[#012d1d] hover:underline flex items-center gap-1 cursor-pointer"
                        >
                          <span className="material-symbols-outlined text-[14px]">
                            {showHxFields ? 'visibility_off' : 'visibility'}
                          </span>
                        </button>
                      </div>
                      <input
                        type={showHxFields ? 'text' : 'password'}
                        value={currentHxInput}
                        onChange={(e) => setCurrentHxInput(e.target.value)}
                        placeholder="Masukkan kode otorisasi saat ini"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-[#f9f9ff] border border-[#1b4332]/15 text-xs font-mono font-bold text-[#141b2b] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#012d1d]"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-[#141b2b] mb-1">
                          Kode Otorisasi Dept HX Baru <span className="text-rose-600">*</span>
                        </label>
                        <input
                          type={showHxFields ? 'text' : 'password'}
                          value={newHxPasscode}
                          onChange={(e) => {
                            setNewHxPasscode(e.target.value);
                            setHxFormError(null);
                          }}
                          placeholder="Minimal 4 karakter (tanpa spasi)"
                          className="w-full px-3.5 py-2.5 rounded-xl bg-[#f9f9ff] border border-[#1b4332]/15 text-xs font-mono font-bold text-[#012d1d] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#012d1d]"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-[#141b2b] mb-1">
                          Konfirmasi Kode Baru <span className="text-rose-600">*</span>
                        </label>
                        <input
                          type={showHxFields ? 'text' : 'password'}
                          value={confirmHxPasscode}
                          onChange={(e) => {
                            setConfirmHxPasscode(e.target.value);
                            setHxFormError(null);
                          }}
                          placeholder="Ketik ulang kode baru"
                          className="w-full px-3.5 py-2.5 rounded-xl bg-[#f9f9ff] border border-[#1b4332]/15 text-xs font-mono font-bold text-[#012d1d] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#012d1d]"
                        />
                      </div>
                    </div>

                    {/* Strength Indicator */}
                    <div className="p-3 rounded-xl bg-[#f9f9ff] border border-[#1b4332]/10 space-y-1.5">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-[#414844] font-semibold">Tingkat Kekuatan Kode:</span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${strength.color}`}>
                          {strength.label}
                        </span>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-slate-200 overflow-hidden">
                        <div className={`h-full bg-[#00452c] transition-all duration-300 ${strength.width}`} />
                      </div>
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3 rounded-2xl bg-[#012d1d] hover:bg-[#1b4332] text-white text-xs font-bold shadow-md active:scale-[0.99] transition-all cursor-pointer flex items-center justify-center gap-2"
                  >
                    <span className="material-symbols-outlined text-[18px] text-[#fed488]">
                      verified
                    </span>
                    <span>Simpan &amp; Aktifkan Kode Otorisasi Dept HX Baru</span>
                  </button>
                </form>
              )}

              {/* TAB 2: USTADZ/AH PASSCODES PER HALAQAH */}
              {activeTab === 'ustadz' && (
                <div className="space-y-3">
                  <div className="p-3 rounded-2xl bg-[#f9f9ff] border border-[#1b4332]/10 text-xs text-[#414844] flex items-start gap-2.5">
                    <span className="material-symbols-outlined text-[18px] text-[#012d1d] shrink-0">
                      key
                    </span>
                    <p className="text-[11px] leading-relaxed">
                      Setiap kelompok Halaqah memiliki <strong>PIN / Password Supervisor Ustadz/ah</strong> tersendiri. Hanya PIN yang ditetapkan di sini yang dapat digunakan Ustadz/ah untuk login ke konsol halaqahnya.
                    </p>
                  </div>

                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-3 top-2.5 text-[18px] text-[#717973]">
                      search
                    </span>
                    <input
                      type="text"
                      value={ustadzSearch}
                      onChange={(e) => setUstadzSearch(e.target.value)}
                      placeholder="Cari nama halaqah, ustadz/ah pembimbing, atau kode..."
                      className="w-full pl-9 pr-3 py-2 rounded-xl bg-[#f9f9ff] border border-[#1b4332]/15 text-xs text-[#141b2b] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#012d1d]"
                    />
                  </div>

                  {ustadzFormError && (
                    <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 font-semibold">
                      {ustadzFormError}
                    </div>
                  )}

                  {filteredHalaqahs.length === 0 ? (
                    <div className="p-6 rounded-2xl bg-[#f9f9ff] border border-dashed border-[#1b4332]/20 text-center text-xs text-[#717973]">
                      Belum ada kelompok Halaqah yang terdaftar.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {filteredHalaqahs.map((h, idx) => {
                        const isEditing = editingHalaqahName === h.name;
                        const isRevealed = !!showUstadzPinMap[h.name];

                        return (
                          <div
                            key={`${h.name}-${idx}`}
                            className="p-3.5 rounded-2xl bg-white border border-[#1b4332]/10 shadow-2xs space-y-2.5"
                          >
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                              <div>
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="text-xs sm:text-sm font-bold text-[#141b2b]">
                                    {h.name}
                                  </span>
                                  <span className="px-2 py-0.2 rounded-full bg-[#e9edff] text-[#012d1d] text-[10px] font-mono font-bold">
                                    {h.code}
                                  </span>
                                </div>
                                <p className="text-[11px] text-[#414844]">
                                  Pembimbing: <strong className="text-[#141b2b]">{h.supervisor}</strong>
                                </p>
                              </div>

                              <div className="flex items-center gap-2">
                                <div className="px-2.5 py-1 rounded-xl bg-[#f9f9ff] border border-[#1b4332]/10 flex items-center gap-1.5">
                                  <span className="text-[10px] text-[#717973] font-semibold">PIN:</span>
                                  <span className="text-xs font-mono font-extrabold text-[#012d1d]">
                                    {isRevealed ? h.pin : '••••••'}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setShowUstadzPinMap((prev) => ({
                                        ...prev,
                                        [h.name]: !prev[h.name]
                                      }))
                                    }
                                    className="text-[#717973] hover:text-[#012d1d] cursor-pointer flex items-center"
                                    title={isRevealed ? 'Sembunyikan PIN' : 'Lihat PIN'}
                                  >
                                    <span className="material-symbols-outlined text-[15px]">
                                      {isRevealed ? 'visibility_off' : 'visibility'}
                                    </span>
                                  </button>
                                </div>

                                <button
                                  type="button"
                                  onClick={() => {
                                    if (isEditing) {
                                      setEditingHalaqahName(null);
                                      setUstadzFormError(null);
                                    } else {
                                      setEditingHalaqahName(h.name);
                                      setNewUstadzPin('');
                                      setConfirmUstadzPin('');
                                      setUstadzFormError(null);
                                    }
                                  }}
                                  className="px-3 py-1.5 rounded-xl bg-[#012d1d] hover:bg-[#1b4332] text-white text-xs font-bold transition-colors cursor-pointer flex items-center gap-1"
                                >
                                  <span className="material-symbols-outlined text-[14px] text-[#fed488]">
                                    {isEditing ? 'close' : 'edit_square'}
                                  </span>
                                  <span>{isEditing ? 'Batal' : 'Ubah PIN'}</span>
                                </button>
                              </div>
                            </div>

                            {isEditing && (
                              <div className="pt-2.5 border-t border-[#f1f3ff] grid grid-cols-1 sm:grid-cols-3 gap-2 items-end">
                                <div>
                                  <label className="block text-[10px] font-bold text-[#141b2b] mb-1">
                                    PIN / Password {getUstadzTitle(h.supervisor)} Baru
                                  </label>
                                  <input
                                    type="text"
                                    value={newUstadzPin}
                                    onChange={(e) => setNewUstadzPin(e.target.value)}
                                    placeholder="Min. 4 karakter"
                                    className="w-full px-3 py-2 rounded-xl bg-[#f9f9ff] border border-[#1b4332]/15 text-xs font-mono font-bold text-[#012d1d] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#012d1d]"
                                  />
                                </div>
                                <div>
                                  <label className="block text-[10px] font-bold text-[#141b2b] mb-1">
                                    Konfirmasi PIN Baru
                                  </label>
                                  <input
                                    type="text"
                                    value={confirmUstadzPin}
                                    onChange={(e) => setConfirmUstadzPin(e.target.value)}
                                    placeholder="Ketik ulang PIN"
                                    className="w-full px-3 py-2 rounded-xl bg-[#f9f9ff] border border-[#1b4332]/15 text-xs font-mono font-bold text-[#012d1d] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#012d1d]"
                                  />
                                </div>
                                <button
                                  type="button"
                                  onClick={() => handleSaveUstadzPin(h.name)}
                                  className="h-9 px-3 rounded-xl bg-[#00452c] hover:bg-[#012d1d] text-white text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1 shadow-xs"
                                >
                                  <span className="material-symbols-outlined text-[15px] text-[#fed488]">
                                    check_circle
                                  </span>
                                  <span>Simpan PIN</span>
                                </button>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 3: EMPLOYEE PIN RESET */}
              {activeTab === 'karyawan' && (
                <div className="space-y-3">
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-3 top-2.5 text-[18px] text-[#717973]">
                      search
                    </span>
                    <input
                      type="text"
                      value={employeeSearch}
                      onChange={(e) => setEmployeeSearch(e.target.value)}
                      placeholder="Cari nama karyawan atau kelompok halaqah..."
                      className="w-full pl-9 pr-3 py-2 rounded-xl bg-[#f9f9ff] border border-[#1b4332]/15 text-xs text-[#141b2b] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#012d1d]"
                    />
                  </div>

                  {employeeList.length === 0 ? (
                    <div className="p-6 rounded-2xl bg-[#f9f9ff] border border-dashed border-[#1b4332]/20 text-center text-xs text-[#717973]">
                      Tidak ada data karyawan yang cocok.
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                      {employeeList.map((emp, idx) => {
                        const isEditing = editingEmployeeId === emp.id;
                        const isRevealed = !!revealedEmployeeIds[emp.id];

                        return (
                          <div
                            key={`${emp.id}-${idx}`}
                            className="p-3 rounded-2xl bg-white border border-[#1b4332]/10 flex flex-col gap-2"
                          >
                            <div className="flex items-center justify-between gap-2 flex-wrap">
                              <div>
                                <span className="text-xs font-bold text-[#141b2b] block">
                                  {emp.name}
                                </span>
                                <span className="text-[10px] text-[#717973]">
                                  {emp.halaqah} ({emp.halaqahCode})
                                </span>
                              </div>

                              <div className="flex items-center gap-2">
                                <div className="px-2.5 py-1 rounded-xl bg-[#f9f9ff] border border-[#1b4332]/10 flex items-center gap-1.5">
                                  <span className="text-[10px] text-[#717973]">PIN:</span>
                                  <span className="text-xs font-mono font-bold text-[#012d1d]">
                                    {isRevealed ? emp.passcode || '1234' : '••••'}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setRevealedEmployeeIds((prev) => ({
                                        ...prev,
                                        [emp.id]: !prev[emp.id]
                                      }))
                                    }
                                    className="text-[#717973] hover:text-[#012d1d] cursor-pointer flex items-center"
                                  >
                                    <span className="material-symbols-outlined text-[14px]">
                                      {isRevealed ? 'visibility_off' : 'visibility'}
                                    </span>
                                  </button>
                                </div>

                                <button
                                  type="button"
                                  onClick={() => {
                                    if (isEditing) {
                                      setEditingEmployeeId(null);
                                    } else {
                                      setEditingEmployeeId(emp.id);
                                      setNewEmployeePin(emp.passcode || '1234');
                                    }
                                  }}
                                  className="px-2.5 py-1.5 rounded-xl bg-[#e9edff] hover:bg-[#012d1d] hover:text-white text-[#012d1d] text-[11px] font-bold transition-colors cursor-pointer"
                                >
                                  {isEditing ? 'Batal' : 'Reset PIN'}
                                </button>
                              </div>
                            </div>

                            {isEditing && (
                              <div className="pt-2 border-t border-[#f1f3ff] flex items-center gap-2">
                                <input
                                  type="text"
                                  value={newEmployeePin}
                                  onChange={(e) => setNewEmployeePin(e.target.value)}
                                  placeholder="Ketik PIN baru (min. 4 karakter)"
                                  className="flex-1 px-3 py-1.5 rounded-xl bg-[#f9f9ff] border border-[#1b4332]/15 text-xs font-mono font-bold text-[#012d1d] focus:outline-none"
                                />
                                <button
                                  type="button"
                                  onClick={() => handleSaveEmployeePin(emp)}
                                  className="px-3.5 py-1.5 rounded-xl bg-[#012d1d] text-white text-xs font-bold cursor-pointer"
                                >
                                  Simpan
                                </button>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 4: SECURITY AUDIT LOG */}
              {activeTab === 'audit' && (
                <div className="space-y-2.5">
                  <div className="p-3 rounded-2xl bg-[#f9f9ff] border border-[#1b4332]/10 text-xs text-[#414844]">
                    Riwayat perubahan kredensial keamanan (Dept HX, Ustadz/ah, dan Karyawan) tercatat otomatis untuk audit internal.
                  </div>

                  {auditLogs.length === 0 ? (
                    <div className="p-6 rounded-2xl bg-white border border-dashed border-[#1b4332]/15 text-center text-xs text-[#717973]">
                      Belum ada riwayat perubahan PIN / Password yang tercatat.
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                      {auditLogs.map((log, idx) => (
                        <div
                          key={`${log.id}-${idx}`}
                          className="p-3 rounded-xl bg-white border border-[#1b4332]/10 flex items-center justify-between gap-2 text-xs"
                        >
                          <div>
                            <span className="font-bold text-[#141b2b] block">{log.action}</span>
                            <span className="text-[11px] text-[#00452c] font-semibold">
                              Target: {log.target} • Oleh: {log.actor}
                            </span>
                          </div>
                          <span className="text-[10px] text-[#717973] font-mono shrink-0">
                            {log.timestamp}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-3.5 sm:px-5 border-t border-[#f1f3ff] bg-[#f9f9ff] flex items-center justify-between gap-2 shrink-0">
              <button
                type="button"
                onClick={() => {
                  setIsGateUnlocked(false);
                  setGatePasscode('');
                }}
                className="px-3.5 py-2 rounded-full bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 text-xs font-bold transition-colors cursor-pointer inline-flex items-center gap-1"
              >
                <span className="material-symbols-outlined text-[15px]">lock</span>
                <span>Kunci Brankas</span>
              </button>

              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2 rounded-full bg-[#012d1d] hover:bg-[#1b4332] text-white text-xs font-bold transition-colors cursor-pointer"
              >
                Selesai &amp; Tutup
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
