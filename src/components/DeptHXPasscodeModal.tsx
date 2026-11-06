import React, { useState, useEffect, useRef } from 'react';

interface DeptHXPasscodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  onShowToast: (msg: string) => void;
}

const VALID_PASSCODES = ['1234', 'HX2026', 'hx2026', 'HX-HQ-01', 'hx-hq-01', 'dephtx', 'admin123'];

export const DeptHXPasscodeModal: React.FC<DeptHXPasscodeModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  onShowToast
}) => {
  const [passcode, setPasscode] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isShaking, setIsShaking] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setPasscode('');
      setErrorMsg(null);
      setIsShaking(false);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 150);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanCode = passcode.trim();

    if (!cleanCode) {
      setErrorMsg('Mohon masukkan kode akses Dept HX');
      return;
    }

    if (VALID_PASSCODES.includes(cleanCode)) {
      setErrorMsg(null);
      onSuccess();
      onShowToast('Otorisasi Dept HX berhasil dibuka ✓');
      onClose();
    } else {
      setErrorMsg('Kode otorisasi salah. Silakan coba lagi (Default: 1234)');
      setIsShaking(true);
      setTimeout(() => setIsShaking(false), 500);
    }
  };

  const handleDigitClick = (digit: string) => {
    if (passcode.length < 8) {
      setPasscode((prev) => prev + digit);
      setErrorMsg(null);
    }
  };

  const handleBackspace = () => {
    setPasscode((prev) => prev.slice(0, -1));
    setErrorMsg(null);
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#141b2b]/60 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div
        className={`w-full max-w-sm bg-white rounded-3xl shadow-2xl overflow-hidden border border-[#1b4332]/10 transition-transform ${
          isShaking ? 'animate-bounce' : 'animate-in zoom-in-95 duration-150'
        }`}
      >
        {/* Modal Header Banner */}
        <div className="p-5 bg-gradient-to-br from-[#012d1d] via-[#093522] to-[#1b4332] text-white relative overflow-hidden text-center">
          <div className="absolute -right-6 -top-6 w-24 h-24 rounded-full bg-[#fed488]/20 blur-xl pointer-events-none" />
          <div className="absolute -left-6 -bottom-6 w-24 h-24 rounded-full bg-[#c1ecd4]/20 blur-xl pointer-events-none" />

          <button
            onClick={onClose}
            className="absolute top-3.5 right-3.5 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
            title="Tutup"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>

          <div className="w-13 h-13 rounded-2xl bg-white/15 backdrop-blur-md text-[#fed488] flex items-center justify-center mx-auto mb-2.5 shadow-inner">
            <span
              className="material-symbols-outlined text-[28px]"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              admin_panel_settings
            </span>
          </div>

          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-white/15 text-[#92f7c3] text-[10px] font-bold uppercase tracking-wider mb-1">
            <span className="material-symbols-outlined text-[12px]">lock</span>
            Area Terbatas
          </span>
          <h3 className="text-base font-bold text-white tracking-tight">
            Kode Akses Menu Dept HX
          </h3>
          <p className="text-xs text-[#c1ecd4]/85 mt-1 leading-relaxed max-w-xs mx-auto">
            Halaman ini khusus untuk Direktorat Dept HX (Penataan halaqah, evaluasi mutaba&apos;ah &amp; penerbitan SK).
          </p>
        </div>

        {/* Modal Form */}
        <div className="p-5 space-y-4">
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-[#141b2b]">
                Masukkan PIN / Kode Otorisasi
              </label>

              <div className="relative">
                <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-[18px] text-[#717973]">
                  key
                </span>
                <input
                  ref={inputRef}
                  type={showPassword ? 'text' : 'password'}
                  value={passcode}
                  onChange={(e) => {
                    setPasscode(e.target.value);
                    setErrorMsg(null);
                  }}
                  placeholder="Ketik kode (contoh: 1234)"
                  className={`w-full pl-10 pr-10 py-3 rounded-2xl bg-[#f9f9ff] text-sm text-[#141b2b] placeholder:text-[#717973] border transition-all text-center tracking-widest font-mono text-base ${
                    errorMsg
                      ? 'border-red-500 focus:outline-red-500 bg-red-50/30'
                      : 'border-[#1b4332]/15 focus:outline-none focus:border-[#012d1d]'
                  }`}
                  autoComplete="off"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#717973] hover:text-[#141b2b] cursor-pointer"
                  title={showPassword ? 'Sembunyikan' : 'Tampilkan'}
                >
                  <span className="material-symbols-outlined text-[18px]">
                    {showPassword ? 'visibility_off' : 'visibility'}
                  </span>
                </button>
              </div>

              {errorMsg ? (
                <p className="text-xs text-red-600 font-semibold flex items-center justify-center gap-1 pt-1">
                  <span className="material-symbols-outlined text-[14px]">error</span>
                  <span>{errorMsg}</span>
                </p>
              ) : (
                <div className="flex items-center justify-between text-[11px] text-[#717973] pt-0.5 px-1">
                  <span>Kode default resmi:</span>
                  <button
                    type="button"
                    onClick={() => {
                      setPasscode('1234');
                      setErrorMsg(null);
                    }}
                    className="text-[#00452c] font-bold hover:underline cursor-pointer"
                  >
                    Gunakan 1234
                  </button>
                </div>
              )}
            </div>

            {/* Quick Numeric Keypad for fast entry */}
            <div className="grid grid-cols-3 gap-1.5 pt-1">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
                <button
                  key={digit}
                  type="button"
                  onClick={() => handleDigitClick(digit)}
                  className="h-10 rounded-xl bg-[#f1f3ff] hover:bg-[#e4e7ff] active:scale-95 text-xs font-bold text-[#141b2b] transition-all cursor-pointer flex items-center justify-center"
                >
                  {digit}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setPasscode('')}
                className="h-10 rounded-xl bg-[#f1f3ff] hover:bg-[#e4e7ff] text-[11px] font-semibold text-[#717973] transition-all cursor-pointer flex items-center justify-center"
              >
                Reset
              </button>
              <button
                type="button"
                onClick={() => handleDigitClick('0')}
                className="h-10 rounded-xl bg-[#f1f3ff] hover:bg-[#e4e7ff] active:scale-95 text-xs font-bold text-[#141b2b] transition-all cursor-pointer flex items-center justify-center"
              >
                0
              </button>
              <button
                type="button"
                onClick={handleBackspace}
                className="h-10 rounded-xl bg-[#f1f3ff] hover:bg-[#e4e7ff] text-xs font-bold text-[#717973] transition-all cursor-pointer flex items-center justify-center"
                title="Hapus digit"
              >
                <span className="material-symbols-outlined text-[16px]">backspace</span>
              </button>
            </div>

            {/* Action Buttons */}
            <div className="pt-2 flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2.5 rounded-full bg-[#f1f3ff] hover:bg-[#e4e7ff] text-[#414844] text-xs font-bold transition-colors cursor-pointer text-center"
              >
                Batal
              </button>
              <button
                type="submit"
                className="flex-1 py-2.5 rounded-full bg-[#012d1d] hover:bg-[#1b4332] text-white text-xs font-bold transition-all shadow-md active:scale-95 cursor-pointer flex items-center justify-center gap-1.5"
              >
                <span className="material-symbols-outlined text-[16px]">lock_open</span>
                <span>Buka Akses</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
