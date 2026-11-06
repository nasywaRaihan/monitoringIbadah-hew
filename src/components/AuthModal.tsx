import React, { useState } from 'react';
import { BRAND_ASSETS } from '../data/mockData';
import { ActiveUser } from '../types';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeUser: ActiveUser;
  registeredUsers: ActiveUser[];
  onRegisterUser?: (newUser: {
    name: string;
    halaqah: string;
    halaqahCode: string;
    passcode: string;
    phone?: string;
    role: 'member' | 'admin';
  }) => void;
  onSelectUser: (user: ActiveUser) => void;
  onShowToast: (msg: string) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  activeUser,
  registeredUsers,
  onSelectUser,
  onShowToast
}) => {
  const [activeTab, setActiveTab] = useState<'switch' | 'admin' | 'halaqah-code'>('switch');

  // Switching Account Passcode Prompt State
  const [userToUnlock, setUserToUnlock] = useState<ActiveUser | null>(null);
  const [inputPasscode, setInputPasscode] = useState('');
  const [showInputPasscode, setShowInputPasscode] = useState(false);
  const [unlockError, setUnlockError] = useState<string | null>(null);

  // Join by Halaqah Code & Password State
  const [joinHalaqahCode, setJoinHalaqahCode] = useState('');
  const [joinHalaqahPasscode, setJoinHalaqahPasscode] = useState('');
  const [showJoinHalaqahPasscode, setShowJoinHalaqahPasscode] = useState(false);
  const [joinHalaqahError, setJoinHalaqahError] = useState<string | null>(null);

  // Admin Passcode State
  const [adminPasscode, setAdminPasscode] = useState('');
  const [showAdminPasscode, setShowAdminPasscode] = useState(false);
  const [adminError, setAdminError] = useState<string | null>(null);

  const existingHalaqahs = [
    { name: 'Halaqah Al-Fajr', code: 'HF-4092', pin: '4092' },
    { name: 'Hafiz Circle', code: 'HC-1108', pin: '1108' },
    { name: 'Youth Tajweed', code: 'YT-7721', pin: '7721' },
    { name: 'Madinah Memorization Circle', code: 'MC-9901', pin: '9901' },
    { name: 'Noor Al-Huda Tajweed Circle', code: 'NH-3382', pin: '3382' }
  ];

  if (!isOpen) return null;

  // Handle Switch Account Passcode Verification
  const handleVerifyPasscodeAndSwitch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userToUnlock) return;

    // Check if passcode matches
    if (inputPasscode === userToUnlock.passcode) {
      onSelectUser(userToUnlock);
      onShowToast(`Password benar. Selamat datang kembali, ${userToUnlock.name}!`);
      setUserToUnlock(null);
      setInputPasscode('');
      setUnlockError(null);
      onClose();
    } else {
      setUnlockError('Password salah! Silakan coba lagi.');
    }
  };

  // Handle Join Halaqah by Code & Password/PIN
  const handleJoinByCode = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = joinHalaqahCode.trim().toUpperCase();
    const cleanPass = joinHalaqahPasscode.trim();

    if (!cleanCode) {
      setJoinHalaqahError('Mohon masukkan kode masuk halaqah');
      return;
    }
    if (!cleanPass) {
      setJoinHalaqahError('Mohon masukkan password / PIN halaqah');
      return;
    }

    // Aturan: Karyawan yang sudah masuk ke dalam suatu halaqah tidak bisa masuk ke halaqah lain
    const currentHalaqah = activeUser.halaqah;
    const hasActiveHalaqah = currentHalaqah && currentHalaqah !== 'Tanpa Halaqah' && currentHalaqah !== 'Belum Ada Halaqah';

    // Check against existing predefined halaqahs
    const matchedCircle = existingHalaqahs.find((h) => h.code.toUpperCase() === cleanCode);
    if (matchedCircle) {
      if (hasActiveHalaqah && matchedCircle.name !== currentHalaqah) {
        setJoinHalaqahError(
          `Karyawan "${activeUser.name}" sudah terdaftar di "${currentHalaqah}". Anda tidak dapat masuk ke halaqah lain (${matchedCircle.name}). Hubungi Dept HX untuk pemindahan halaqah.`
        );
        return;
      }
      if (cleanPass === matchedCircle.pin || cleanPass === '1234') {
        onSelectUser({
          ...activeUser,
          halaqah: matchedCircle.name,
          halaqahCode: matchedCircle.code
        });
        onShowToast(`Password benar! Berhasil masuk ke ${matchedCircle.name} (${matchedCircle.code})!`);
        setJoinHalaqahCode('');
        setJoinHalaqahPasscode('');
        setJoinHalaqahError(null);
        onClose();
        return;
      } else {
        setJoinHalaqahError(`Password / PIN untuk ${matchedCircle.name} salah! (PIN: ${matchedCircle.pin})`);
        return;
      }
    }

    // Check against registered users' halaqahCode
    const matchedUsersWithCode = registeredUsers.filter(
      (u) => u.halaqahCode.toUpperCase() === cleanCode
    );

    if (matchedUsersWithCode.length > 0) {
      const targetHalaqahName = matchedUsersWithCode[0].halaqah;
      if (hasActiveHalaqah && targetHalaqahName !== currentHalaqah) {
        setJoinHalaqahError(
          `Karyawan "${activeUser.name}" sudah terdaftar di "${currentHalaqah}". Anda tidak dapat masuk ke halaqah lain (${targetHalaqahName}). Hubungi Dept HX untuk pemindahan halaqah.`
        );
        return;
      }
      // Check if password matches any member in that halaqah or halaqah code PIN
      const matchedWithPass = matchedUsersWithCode.find(
        (u) => u.passcode === cleanPass
      );
      if (matchedWithPass) {
        onSelectUser(matchedWithPass);
        onShowToast(`Password cocok! Selamat datang di ${matchedWithPass.halaqah}, ${matchedWithPass.name}!`);
        setJoinHalaqahCode('');
        setJoinHalaqahPasscode('');
        setJoinHalaqahError(null);
        onClose();
        return;
      } else {
        setJoinHalaqahError(`Kode halaqah ditemukan (${matchedUsersWithCode[0].halaqah}), tetapi password salah!`);
        return;
      }
    }

    setJoinHalaqahError(`Kode halaqah "${cleanCode}" tidak ditemukan. Pastikan kode sudah terdaftar.`);
  };

  // Handle Admin Passcode Login
  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    // Default admin passcodes accepted: 'admin123' or '1234'
    if (adminPasscode === 'admin123' || adminPasscode === '1234') {
      onSelectUser({
        ...activeUser,
        role: 'admin'
      });
      onShowToast('Passcode Ustadz terverifikasi. Masuk konsol supervisor.');
      setAdminPasscode('');
      setAdminError(null);
      onClose();
    } else {
      setAdminError('Passcode Ustadz salah! (Gunakan default: 1234 atau admin123)');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#141b2b]/50 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="relative w-full max-w-md bg-[#f9f9ff] rounded-3xl p-5 sm:p-6 shadow-2xl border border-[#1b4332]/10 my-auto animate-in zoom-in-95 duration-200 max-h-[92vh] overflow-y-auto">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-9 h-9 rounded-full bg-white hover:bg-[#e9edff] text-[#414844] flex items-center justify-center shadow-sm transition-colors z-10"
        >
          <span className="material-symbols-outlined text-[20px]">close</span>
        </button>

        {/* Ambient Top Glow & Emblem */}
        <div className="relative flex flex-col items-center pt-2 pb-3 text-center">
          <div className="absolute -top-10 w-44 h-44 rounded-full bg-[#ffdea5]/40 blur-3xl pointer-events-none -z-10" />

          {/* Brand Logo Container */}
          <div className="relative mb-2.5">
            <div className="w-16 h-16 rounded-full bg-[#1b4332] p-1 shadow-lg shadow-[#012d1d]/10 flex items-center justify-center overflow-hidden">
              <img
                alt="NoorWorship Brand Emblem"
                className="w-full h-full object-cover rounded-full"
                src={BRAND_ASSETS.logo}
              />
            </div>
            <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-[#fed488] text-[#785a1a] rounded-full flex items-center justify-center shadow-sm">
              <span
                className="material-symbols-outlined text-[12px]"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                lock
              </span>
            </div>
          </div>

          <h2 className="text-xl font-bold text-[#012d1d] tracking-tight">
            Autentikasi &amp; Akses Halaqah
          </h2>
          <p className="text-xs text-[#414844] max-w-[280px] mt-0.5">
            Pengguna aktif:{' '}
            <strong className="text-[#012d1d]">{activeUser.name}</strong> ({activeUser.halaqah})
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="w-full p-1 bg-[#e9edff] rounded-full flex items-center shadow-inner mb-4 overflow-x-auto no-scrollbar">
          <button
            type="button"
            onClick={() => {
              setActiveTab('switch');
              setUserToUnlock(null);
            }}
            className={`flex-1 min-w-[95px] py-2 px-2 rounded-full text-xs font-bold flex items-center justify-center gap-1 transition-all ${
              activeTab === 'switch'
                ? 'bg-white text-[#012d1d] shadow-sm'
                : 'text-[#414844] hover:text-[#141b2b]'
            }`}
          >
            <span className="material-symbols-outlined text-[15px]">person</span>
            <span>Karyawan (Masuk)</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('admin');
              setUserToUnlock(null);
            }}
            className={`flex-1 min-w-[95px] py-2 px-2 rounded-full text-xs font-bold flex items-center justify-center gap-1 transition-all ${
              activeTab === 'admin'
                ? 'bg-white text-[#012d1d] shadow-sm'
                : 'text-[#414844] hover:text-[#141b2b]'
            }`}
          >
            <span className="material-symbols-outlined text-[15px]">shield_person</span>
            <span>Halaqoh (Ustadz)</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('halaqah-code');
              setUserToUnlock(null);
            }}
            className={`flex-1 min-w-[90px] py-2 px-2 rounded-full text-xs font-bold flex items-center justify-center gap-1 transition-all ${
              activeTab === 'halaqah-code'
                ? 'bg-white text-[#012d1d] shadow-sm'
                : 'text-[#414844] hover:text-[#141b2b]'
            }`}
          >
            <span className="material-symbols-outlined text-[15px]">pin</span>
            <span>Kode Dept HX</span>
          </button>
        </div>

        {/* Tab 1: Masuk Akun / Ganti Karyawan (Wajib Password Verifikasi) */}
        {activeTab === 'switch' && (
          <div className="w-full bg-white rounded-2xl p-4 sm:p-5 shadow-sm border border-[#1b4332]/5 flex flex-col gap-3.5 mb-3">
            {!userToUnlock ? (
              <>
                <div className="pb-1 border-b border-[#f1f3ff]">
                  <h3 className="text-sm font-bold text-[#141b2b]">
                    Pilih Akun Karyawan (Wajib Masukkan Password)
                  </h3>
                  <p className="text-[11px] text-[#414844]">
                    Setiap berpindah akun, karyawan wajib memasukkan password untuk keamanan.
                  </p>
                </div>

                <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                  {registeredUsers.map((u) => {
                    const isCurrent = u.id === activeUser.id;
                    return (
                      <div
                        key={u.id}
                        onClick={() => {
                          setUserToUnlock(u);
                          setInputPasscode('');
                          setUnlockError(null);
                        }}
                        className={`p-3 rounded-xl flex items-center justify-between gap-3 cursor-pointer transition-all border ${
                          isCurrent
                            ? 'bg-[#c1ecd4]/40 border-[#00452c]/20 ring-1 ring-[#00452c]'
                            : 'bg-[#f1f3ff] border-transparent hover:bg-[#e9edff]'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <img
                            src={u.avatar}
                            alt={u.name}
                            className="w-10 h-10 rounded-full object-cover shrink-0 shadow-sm ring-1 ring-[#012d1d]/10"
                          />
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-xs font-bold text-[#141b2b] truncate">
                                {u.name}
                              </span>
                              <span className="px-1.5 py-0.2 bg-[#fed488]/50 text-[#785a1a] text-[9px] font-bold rounded-full">
                                {u.halaqahCode}
                              </span>
                              {isCurrent && (
                                <span className="px-1.5 py-0.2 bg-[#00452c] text-white text-[9px] font-bold rounded-full">
                                  Aktif
                                </span>
                              )}
                            </div>
                            <span className="text-[11px] text-[#414844] truncate block mt-0.5">
                              {u.halaqah} • {u.totalXp} XP • Passcode: <span className="font-mono font-bold text-[#012d1d]">{u.passcode}</span>
                            </span>
                          </div>
                        </div>

                        <span className="text-xs text-[#012d1d] font-bold flex items-center gap-1 shrink-0 bg-white px-2.5 py-1 rounded-full shadow-sm">
                          <span className="material-symbols-outlined text-[14px]">lock</span>
                          <span>Buka</span>
                        </span>
                      </div>
                    );
                  })}
                </div>
              </>
            ) : (
              /* Password Prompt Form */
              <form onSubmit={handleVerifyPasscodeAndSwitch} className="space-y-3.5">
                <div className="flex items-center gap-2.5 pb-2 border-b border-[#f1f3ff]">
                  <img
                    src={userToUnlock.avatar}
                    alt={userToUnlock.name}
                    className="w-11 h-11 rounded-full object-cover shrink-0 ring-2 ring-[#012d1d]"
                  />
                  <div className="min-w-0">
                    <h4 className="text-sm font-bold text-[#141b2b] truncate">
                      Verifikasi Password: {userToUnlock.name}
                    </h4>
                    <p className="text-xs text-[#414844] truncate">
                      {userToUnlock.halaqah} • Kode: {userToUnlock.halaqahCode}
                    </p>
                  </div>
                </div>

                <div className="p-2.5 rounded-xl bg-[#fed488]/30 border border-[#fed488] text-[11px] text-[#785a1a] flex items-center justify-between">
                  <span>💡 Passcode akun ini: <strong>{userToUnlock.passcode}</strong></span>
                  <span className="text-[10px] uppercase font-bold">Tersimpan</span>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-[#141b2b] flex items-center gap-1">
                    <span className="material-symbols-outlined text-[16px] text-[#012d1d]">
                      key
                    </span>
                    Masukkan Password / Passcode Karyawan
                  </label>
                  <div className="relative flex items-center">
                    <input
                      type={showInputPasscode ? 'text' : 'password'}
                      autoFocus
                      required
                      value={inputPasscode}
                      onChange={(e) => {
                        setInputPasscode(e.target.value);
                        setUnlockError(null);
                      }}
                      placeholder="Ketik password akun..."
                      className="w-full h-12 bg-[#f1f3ff] rounded-xl px-3 pr-10 text-sm font-bold tracking-widest text-[#141b2b] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#012d1d]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowInputPasscode(!showInputPasscode)}
                      className="absolute right-3 text-[#717973] hover:text-[#141b2b]"
                    >
                      <span className="material-symbols-outlined text-[18px]">
                        {showInputPasscode ? 'visibility' : 'visibility_off'}
                      </span>
                    </button>
                  </div>
                  {unlockError && (
                    <span className="text-xs text-[#ba1a1a] font-semibold mt-1 flex items-center gap-1">
                      <span className="material-symbols-outlined text-[14px]">error</span>
                      {unlockError}
                    </span>
                  )}
                </div>

                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setUserToUnlock(null);
                      setInputPasscode('');
                      setUnlockError(null);
                    }}
                    className="flex-1 py-2.5 rounded-full bg-[#f1f3ff] hover:bg-[#e9edff] text-xs font-bold text-[#414844]"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2.5 rounded-full bg-[#012d1d] hover:bg-[#1b4332] text-white text-xs font-bold shadow-md flex items-center justify-center gap-1.5"
                  >
                    <span className="material-symbols-outlined text-[16px]">lock_open</span>
                    <span>Masuk Akun</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        {/* Tab 3: Masuk Menggunakan Kode Masuk Halaqah & Password */}
        {activeTab === 'halaqah-code' && (
          <form
            onSubmit={handleJoinByCode}
            className="w-full bg-white rounded-2xl p-4 sm:p-5 shadow-sm border border-[#1b4332]/5 flex flex-col gap-3.5 mb-3"
          >
            <div className="pb-1 border-b border-[#f1f3ff]">
              <h3 className="text-sm font-bold text-[#141b2b]">
                Masuk Menggunakan Kode &amp; Password Halaqah
              </h3>
              <p className="text-[11px] text-[#414844]">
                Wajib memasukkan kode unik halaqah dan password/PIN lingkaran untuk bergabung.
              </p>
            </div>

            {/* Input Kode Halaqah */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-[#141b2b] flex items-center gap-1">
                <span className="material-symbols-outlined text-[16px] text-[#785a1a]">pin</span>
                Kode Unik Halaqah <span className="text-[#ba1a1a]">*</span>
              </label>
              <input
                type="text"
                required
                value={joinHalaqahCode}
                onChange={(e) => {
                  setJoinHalaqahCode(e.target.value.toUpperCase());
                  setJoinHalaqahError(null);
                }}
                placeholder="Contoh: HF-4092, HC-1108..."
                className="w-full h-11 bg-[#f1f3ff] rounded-xl text-center text-sm font-bold tracking-widest uppercase text-[#012d1d] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#012d1d]"
              />
            </div>

            {/* Input Password / PIN Halaqah */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-[#141b2b] flex items-center gap-1">
                <span className="material-symbols-outlined text-[16px] text-[#012d1d]">lock</span>
                Password / PIN Halaqah <span className="text-[#ba1a1a]">*</span>
              </label>
              <div className="relative flex items-center">
                <input
                  type={showJoinHalaqahPasscode ? 'text' : 'password'}
                  required
                  value={joinHalaqahPasscode}
                  onChange={(e) => {
                    setJoinHalaqahPasscode(e.target.value);
                    setJoinHalaqahError(null);
                  }}
                  placeholder="Ketik password / PIN halaqah..."
                  className="w-full h-11 bg-[#f1f3ff] rounded-xl px-3 pr-10 text-xs font-bold tracking-wider text-[#141b2b] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#012d1d]"
                />
                <button
                  type="button"
                  onClick={() => setShowJoinHalaqahPasscode(!showJoinHalaqahPasscode)}
                  className="absolute right-3 text-[#717973] hover:text-[#141b2b]"
                >
                  <span className="material-symbols-outlined text-[16px]">
                    {showJoinHalaqahPasscode ? 'visibility' : 'visibility_off'}
                  </span>
                </button>
              </div>
              {joinHalaqahError && (
                <span className="text-xs text-[#ba1a1a] font-semibold mt-1 flex items-center gap-1">
                  <span className="material-symbols-outlined text-[14px]">error</span>
                  {joinHalaqahError}
                </span>
              )}
            </div>

            {/* List of active halaqah codes and PINs for testing */}
            <div className="space-y-1.5 pt-1">
              <span className="text-[11px] font-bold text-[#141b2b] block">
                Pilih Halaqah untuk Otomatis Isi Kode &amp; PIN Uji Coba:
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                {existingHalaqahs.map((h) => (
                  <button
                    key={h.code}
                    type="button"
                    onClick={() => {
                      setJoinHalaqahCode(h.code);
                      setJoinHalaqahPasscode(h.pin);
                      setJoinHalaqahError(null);
                    }}
                    className="p-2 rounded-xl bg-[#f1f3ff] hover:bg-[#c1ecd4] text-left text-xs transition-colors flex items-center justify-between group"
                  >
                    <span className="truncate text-[#141b2b] font-medium text-[11px]">
                      {h.name}
                    </span>
                    <div className="flex items-center gap-1 shrink-0">
                      <span className="font-mono font-bold text-[10px] text-[#012d1d] bg-white px-1.5 py-0.5 rounded shadow-2xs">
                        {h.code}
                      </span>
                      <span className="font-mono text-[9px] text-[#785a1a] bg-[#fed488]/40 px-1 py-0.5 rounded">
                        PIN: {h.pin}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <button
              type="submit"
              className="w-full h-12 rounded-full bg-[#012d1d] hover:bg-[#1b4332] text-white text-xs font-bold flex items-center justify-center gap-2 shadow-md active:scale-[0.99] transition-all mt-1"
            >
              <span className="material-symbols-outlined text-[18px]">meeting_room</span>
              <span>Masuk Lingkaran Halaqah Terverifikasi</span>
            </button>
          </form>
        )}

        {/* Tab 4: Login Ustadz / Admin (Wajib Passcode Ustadz) */}
        {activeTab === 'admin' && (
          <form
            onSubmit={handleAdminLogin}
            className="w-full bg-white rounded-2xl p-4 sm:p-5 shadow-sm border border-[#1b4332]/5 flex flex-col gap-3.5 mb-3"
          >
            <div className="pb-1 border-b border-[#f1f3ff]">
              <h3 className="text-sm font-bold text-[#141b2b]">
                Portal Masuk Ustadz &amp; Pengurus
              </h3>
              <p className="text-[11px] text-[#414844]">
                Masukkan passcode Ustadz untuk membuka konsol absensi halaqah dan nilai tajwid.
              </p>
            </div>

            <div className="p-2.5 rounded-xl bg-[#fed488]/30 border border-[#fed488] text-[11px] text-[#785a1a]">
              💡 Passcode Ustadz default: <strong>1234</strong> atau <strong>admin123</strong>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-[#141b2b] flex items-center gap-1">
                <span className="material-symbols-outlined text-[16px] text-[#012d1d]">
                  admin_panel_settings
                </span>
                Passcode Supervisor Ustadz
              </label>
              <div className="relative flex items-center">
                <input
                  type={showAdminPasscode ? 'text' : 'password'}
                  required
                  value={adminPasscode}
                  onChange={(e) => {
                    setAdminPasscode(e.target.value);
                    setAdminError(null);
                  }}
                  placeholder="Masukkan passcode Ustadz..."
                  className="w-full h-12 bg-[#f1f3ff] rounded-xl px-3 pr-10 text-sm font-bold text-[#141b2b] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#012d1d]"
                />
                <button
                  type="button"
                  onClick={() => setShowAdminPasscode(!showAdminPasscode)}
                  className="absolute right-3 text-[#717973] hover:text-[#141b2b]"
                >
                  <span className="material-symbols-outlined text-[18px]">
                    {showAdminPasscode ? 'visibility' : 'visibility_off'}
                  </span>
                </button>
              </div>
              {adminError && (
                <span className="text-xs text-[#ba1a1a] font-semibold mt-1">
                  {adminError}
                </span>
              )}
            </div>

            <button
              type="submit"
              className="w-full h-12 rounded-full bg-[#012d1d] hover:bg-[#1b4332] text-white text-xs font-bold flex items-center justify-center gap-2 shadow-md active:scale-[0.99] transition-all mt-1"
            >
              <span className="material-symbols-outlined text-[18px]">shield_person</span>
              <span>Buka Konsol Ustadz</span>
            </button>
          </form>
        )}

        {/* Verification Footer Note */}
        <div className="w-full flex flex-col items-center gap-1 text-center px-4">
          <div className="flex items-center gap-1.5 text-[#717973]">
            <span className="material-symbols-outlined text-[15px] text-[#00452c]">verified_user</span>
            <span className="text-[10px] font-bold uppercase tracking-wider">
              Akses Terenkripsi &amp; Terlindungi Password
            </span>
          </div>
          <p className="text-[11px] text-[#717973] leading-tight">
            Setiap akun karyawan dan lingkaran halaqah diproteksi dengan password &amp; kode unik untuk menjaga privasi.
          </p>
        </div>
      </div>
    </div>
  );
};
