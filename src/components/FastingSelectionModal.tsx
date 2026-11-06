import React, { useState } from 'react';
import { FASTING_OPTIONS, FastingOption, checkFastingMatch } from '../services/amalanPaten';

interface FastingSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectFasting: (fastingOption: FastingOption, customNote?: string) => void;
}

export const FastingSelectionModal: React.FC<FastingSelectionModalProps> = ({
  isOpen,
  onClose,
  onSelectFasting
}) => {
  const [selectedFastingId, setSelectedFastingId] = useState<string>('senin');
  const [customDescription, setCustomDescription] = useState<string>('');
  const now = new Date();
  const dayIndex = now.getDay();
  const dayNames = ['Ahad', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  const currentDayName = dayNames[dayIndex];

  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  // Auto recommend based on today
  const recommendedId = dayIndex === 1 ? 'senin' : dayIndex === 4 ? 'kamis' : 'daud';

  const handleConfirm = () => {
    const chosen = FASTING_OPTIONS.find((f) => f.id === selectedFastingId) || FASTING_OPTIONS[0];
    const match = checkFastingMatch(chosen.id, now);

    if (!match.isValid) {
      setErrorMessage(match.message);
      return;
    }

    const note = customDescription.trim()
      ? `${chosen.name} - ${customDescription.trim()}`
      : chosen.name;

    onSelectFasting(chosen, note);
  };

  const selectedOption = FASTING_OPTIONS.find((f) => f.id === selectedFastingId);
  const matchResult = selectedOption ? checkFastingMatch(selectedOption.id, now) : null;

  return (
    <div className="fixed inset-0 z-50 bg-[#141b2b]/60 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="relative w-full max-w-lg bg-white rounded-3xl p-4 sm:p-6 shadow-2xl border border-[#1b4332]/10 animate-in zoom-in-95 duration-200 my-auto flex flex-col space-y-3.5 max-h-[88vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-start gap-3 pb-3 border-b border-[#f1f3ff]">
          <div className="w-12 h-12 rounded-2xl bg-[#fed488]/30 text-[#775a19] flex items-center justify-center shrink-0 shadow-sm">
            <span
              className="material-symbols-outlined text-[28px]"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              wb_twilight
            </span>
          </div>
          <div className="flex-1 pr-6">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="px-2 py-0.5 rounded-full bg-[#fed488]/40 text-[#775a19] text-[10px] font-bold">
                Hari Ini: {currentDayName}
              </span>
              <span className="px-2 py-0.5 rounded-full bg-[#c1ecd4] text-[#002114] text-[10px] font-bold">
                +10 XP
              </span>
            </div>
            <h3 className="font-bold text-base text-[#141b2b] mt-0.5">
              Pilih Jenis Shaum / Puasa Sunnah
            </h3>
            <p className="text-xs text-[#414844] mt-0.5 font-medium">
              Sistem akan memverifikasi kesesuaian hari dan mencatat niat puasa sunnah Anda.
            </p>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[#f1f3ff] hover:bg-[#e9edff] text-[#414844] flex items-center justify-center transition-colors cursor-pointer shrink-0"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        {/* List of Sunnah Fasting Options */}
        <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
          {FASTING_OPTIONS.map((opt) => {
            const isMatchToday =
              (opt.id === 'senin' && dayIndex === 1) ||
              (opt.id === 'kamis' && dayIndex === 4) ||
              (!opt.requiresDayMatch);
            const isSelected = selectedFastingId === opt.id;

            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => setSelectedFastingId(opt.id)}
                className={`w-full text-left p-3 rounded-2xl border transition-all cursor-pointer flex items-start gap-3 ${
                  isSelected
                    ? 'bg-[#e9fbf2] border-[#00452c] text-[#002114] shadow-xs'
                    : 'bg-white border-[#1b4332]/10 text-[#414844] hover:bg-[#f9f9ff]'
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-full border flex items-center justify-center mt-0.5 shrink-0 ${
                    isSelected
                      ? 'border-[#00452c] bg-[#00452c] text-white'
                      : 'border-[#717973]'
                  }`}
                >
                  {isSelected && (
                    <span className="material-symbols-outlined text-[13px]">check</span>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-xs font-bold leading-tight">{opt.name}</span>
                  </div>
                  <p className="text-[11px] text-[#717973] mt-0.5 leading-snug">
                    {opt.description}
                  </p>
                </div>
              </button>
            );
          })}
        </div>

        {/* Live Day Detection & Validation Box */}
        {matchResult && (
          <div
            className={`p-3 rounded-2xl text-xs flex items-center gap-2 border ${
              matchResult.isValid
                ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                : 'bg-amber-50 border-amber-200 text-amber-900'
            }`}
          >
            <span
              className={`material-symbols-outlined text-[18px] shrink-0 ${
                matchResult.isValid ? 'text-emerald-700' : 'text-amber-700'
              }`}
            >
              {matchResult.isValid ? 'check_circle' : 'info'}
            </span>
            <span className="text-[11px] leading-relaxed">{matchResult.message}</span>
          </div>
        )}

        {/* Optional Custom Note */}
        <div>
          <label className="text-[11px] font-bold text-[#414844] block mb-1">
            Keterangan Tambahan / Niat Khusus (Opsional):
          </label>
          <input
            type="text"
            value={customDescription}
            onChange={(e) => setCustomDescription(e.target.value)}
            placeholder="Misal: Puasa qadha + sunnah, atau istiqomah puasa Daud hari ke-5..."
            className="w-full px-3 py-2 text-xs rounded-xl border border-[#1b4332]/15 bg-[#f9f9ff] focus:bg-white focus:border-[#00452c] focus:outline-none transition-colors"
          />
        </div>

        {/* Error Notification if any */}
        {errorMessage && (
          <div className="p-2.5 rounded-xl bg-red-50 border border-red-200 text-red-900 text-xs flex items-center gap-2">
            <span className="material-symbols-outlined text-[16px] text-red-600 shrink-0">error</span>
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center gap-2 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-[#f1f3ff] hover:bg-[#e9edff] text-xs font-bold text-[#414844] transition-colors cursor-pointer min-h-[44px] flex items-center justify-center active:scale-98"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={matchResult ? !matchResult.isValid : false}
            className={`w-full flex-1 py-3 px-4 rounded-xl text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-md active:scale-98 transition-all cursor-pointer min-h-[46px] ${
              matchResult && !matchResult.isValid
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-[#00452c] hover:bg-[#012d1d]'
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">how_to_reg</span>
            <span>Konfirmasi Puasa Sunnah (+10 XP)</span>
          </button>
        </div>
      </div>
    </div>
  );
};
