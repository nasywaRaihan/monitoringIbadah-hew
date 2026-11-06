import React from 'react';
import { DailyTask } from '../types';
import { PrayerWindowStatus } from '../services/amalanPaten';

interface MuraqabahConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  task: DailyTask | null;
  prayerStatus?: PrayerWindowStatus | null;
  selectedPrayerMode: 'jamaah' | 'munfarid';
  onChangePrayerMode: (mode: 'jamaah' | 'munfarid') => void;
  fastingNote?: string;
  onConfirm: () => void;
}

export const MuraqabahConfirmModal: React.FC<MuraqabahConfirmModalProps> = ({
  isOpen,
  onClose,
  task,
  prayerStatus,
  selectedPrayerMode,
  onChangePrayerMode,
  fastingNote,
  onConfirm
}) => {
  if (!isOpen || !task) return null;

  const isPrayer = task.hasJamaahOption || (task as any).prayerId;
  const isLate = prayerStatus?.isLate;
  const penalty = isLate ? 5 : 0;

  // Calculate final XP
  let calculatedXp = task.xp;
  if (isPrayer) {
    const base = 15;
    const bonus = selectedPrayerMode === 'jamaah' ? 5 : 0;
    calculatedXp = Math.max(0, base + bonus - penalty);
  } else {
    calculatedXp = Math.max(0, task.xp - penalty);
  }

  return (
    <div className="fixed inset-0 z-50 bg-[#141b2b]/60 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="relative w-full max-w-lg bg-white rounded-3xl p-4 sm:p-6 shadow-2xl border border-[#1b4332]/10 animate-in zoom-in-95 duration-200 my-auto flex flex-col space-y-3.5 max-h-[88vh] overflow-y-auto">
        {/* Header with Islamic Icon */}
        <div className="flex items-start gap-3 pb-3 border-b border-[#f1f3ff]">
          <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-[#012d1d] text-[#fed488] flex items-center justify-center shrink-0 shadow-sm">
            <span
              className="material-symbols-outlined text-[24px] sm:text-[28px]"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              verified
            </span>
          </div>
          <div className="flex-1 pr-2 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="px-2 py-0.5 rounded-full bg-[#fed488]/40 text-[#775a19] text-[10px] font-bold uppercase tracking-wider">
                Muraqabatullah
              </span>
              <span className="px-2 py-0.5 rounded-full bg-[#c1ecd4] text-[#002114] text-[10px] font-bold">
                Permanen
              </span>
            </div>
            <h3 className="font-bold text-base text-[#141b2b] mt-0.5 leading-snug">
              Ikrar Kejujuran Amalan Ibadah
            </h3>
            <p className="text-xs text-[#414844] mt-0.5 font-medium truncate">
              Amalan: <strong className="text-[#012d1d]">{task.title}</strong>
            </p>
          </div>

          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-[#f1f3ff] hover:bg-[#e9edff] text-[#414844] flex items-center justify-center transition-colors cursor-pointer shrink-0 min-w-[36px] min-h-[36px]"
            aria-label="Tutup modal"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        {/* Prayer Jamaah vs Munfarid Selection (if applicable) */}
        {isPrayer && (
          <div className="p-3 rounded-2xl bg-[#f9f9ff] border border-[#1b4332]/10 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#012d1d] flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[16px] text-[#00452c]">
                  mosque
                </span>
                Metode Pelaksanaan Sholat:
              </span>
              <span className="text-[11px] text-[#717973]">
                {prayerStatus?.timeRangeLabel || ''}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => onChangePrayerMode('jamaah')}
                className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer min-h-[48px] ${
                  selectedPrayerMode === 'jamaah'
                    ? 'bg-[#e9fbf2] border-[#00452c] text-[#002114] shadow-xs'
                    : 'bg-white border-[#1b4332]/10 text-[#414844] hover:bg-[#f1f3ff]'
                }`}
              >
                <div className="flex items-center justify-between mb-0.5">
                  <span className="text-xs font-bold">Berjamaah</span>
                  <span className="text-[10px] font-extrabold text-[#00452c] bg-white px-1.5 py-0.2 rounded-full border border-[#00452c]/20">
                    +20 XP
                  </span>
                </div>
                <p className="text-[10px] text-[#717973] leading-tight">
                  Di Masjid / Mushola
                </p>
              </button>

              <button
                type="button"
                onClick={() => onChangePrayerMode('munfarid')}
                className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer min-h-[48px] ${
                  selectedPrayerMode === 'munfarid'
                    ? 'bg-[#e9fbf2] border-[#00452c] text-[#002114] shadow-xs'
                    : 'bg-white border-[#1b4332]/10 text-[#414844] hover:bg-[#f1f3ff]'
                }`}
              >
                <div className="flex items-center justify-between mb-0.5">
                  <span className="text-xs font-bold">Munfarid</span>
                  <span className="text-[10px] font-extrabold text-[#775a19] bg-white px-1.5 py-0.2 rounded-full border border-[#775a19]/20">
                    +15 XP
                  </span>
                </div>
                <p className="text-[10px] text-[#717973] leading-tight">
                  Sendiri tepat waktu
                </p>
              </button>
            </div>
          </div>
        )}

        {/* Time Window & Penalty Notification */}
        {prayerStatus && prayerStatus.isPrayer && (
          <div
            className={`p-3 rounded-2xl text-xs flex items-center justify-between gap-2 border ${
              isLate
                ? 'bg-amber-50/90 border-amber-200 text-amber-950'
                : 'bg-emerald-50/90 border-emerald-200 text-emerald-950'
            }`}
          >
            <div className="flex items-center gap-2 min-w-0">
              <span
                className={`material-symbols-outlined text-[18px] shrink-0 ${
                  isLate ? 'text-amber-600' : 'text-emerald-600'
                }`}
              >
                {isLate ? 'schedule' : 'task_alt'}
              </span>
              <div className="min-w-0">
                <span className="font-bold block truncate">
                  {isLate
                    ? 'Pengisian Lewat Rentang Waktu'
                    : 'Dalam Rentang Waktu Tepat'}
                </span>
                <span className="text-[10px] sm:text-[11px] opacity-80 block truncate">
                  {isLate
                    ? 'Penyesuaian keterlambatan (-5 XP)'
                    : `Waktu pengisian: ${prayerStatus.timeRangeLabel}`}
                </span>
              </div>
            </div>
            <div className="text-right shrink-0">
              <span className="text-xs font-bold block text-[#012d1d]">
                +{calculatedXp} XP
              </span>
              {isLate && (
                <span className="text-[10px] font-bold text-red-600 bg-red-100 px-1.5 py-0.2 rounded-full">
                  -5 XP
                </span>
              )}
            </div>
          </div>
        )}

        {/* Fasting Note Display */}
        {fastingNote && (
          <div className="p-3 rounded-2xl bg-[#fed488]/20 border border-[#775a19]/20 text-xs flex items-center gap-2 text-[#775a19]">
            <span className="material-symbols-outlined text-[18px] shrink-0">
              wb_twilight
            </span>
            <div className="min-w-0">
              <span className="font-bold block">Niat Shaum Sunnah:</span>
              <span className="text-[11px] text-[#414844] truncate block">{fastingNote}</span>
            </div>
          </div>
        )}

        {/* Ayat Pengingat & Tazkiyah Muraqabatullah */}
        <div className="p-3.5 rounded-2xl bg-[#012d1d]/5 border border-[#012d1d]/15 space-y-2">
          <div className="flex items-center gap-1.5 text-xs font-bold text-[#00452c]">
            <span className="material-symbols-outlined text-[16px]">menu_book</span>
            <span>Muraqabatullah:</span>
          </div>

          <p className="text-[11px] text-[#1b4332] italic font-serif leading-relaxed bg-white/70 p-2.5 rounded-xl border border-[#012d1d]/10">
            &ldquo;...Dan Dia bersama kamu di mana saja kamu berada. Dan Allah Maha Melihat apa yang kamu kerjakan.&rdquo;
            <span className="block text-[10px] font-sans font-semibold text-[#717973] not-italic mt-1 text-right">
              — QS. Al-Hadid: 4
            </span>
          </p>

          <p className="text-[11px] text-[#414844] leading-relaxed">
            Malaikat <strong>Raqib dan Atid</strong> senantiasa mencatat setiap amal. Centanglah dengan <strong>jujur dan ikhlas</strong> semata-mata karena Allah SWT.
          </p>
        </div>

        {/* Warning Permanent Lock */}
        <div className="p-2.5 rounded-xl bg-red-50 border border-red-200/70 text-red-900 text-[11px] flex items-center gap-2">
          <span className="material-symbols-outlined text-[16px] text-red-600 shrink-0">
            lock
          </span>
          <span className="leading-tight">
            <strong>Perhatian:</strong> Amalan yang telah dicentang <strong>tidak dapat dibatalkan</strong> demi menjaga amanah mutaba&apos;ah.
          </span>
        </div>

        {/* Actions */}
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
            onClick={onConfirm}
            className="w-full flex-1 py-3 px-4 rounded-xl bg-[#012d1d] hover:bg-[#1b4332] text-white text-xs font-bold flex items-center justify-center gap-2 shadow-md active:scale-98 transition-all cursor-pointer min-h-[46px]"
          >
            <span
              className="material-symbols-outlined text-[18px] text-[#fed488]"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              check_circle
            </span>
            <span className="truncate">Bismillah, Saya Bersaksi Telah Mengerjakan (+{calculatedXp} XP)</span>
          </button>
        </div>
      </div>
    </div>
  );
};
