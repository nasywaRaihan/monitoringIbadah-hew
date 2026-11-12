import React from 'react';
import { ActiveUser } from '../types';
import { getWeeklyStreakDays, hasUserCompletedIbadahToday } from '../services/streakService';

interface StreakModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeUser: ActiveUser;
  streakDays: number;
  onNavigateToRecitation?: () => void;
}

export const StreakModal: React.FC<StreakModalProps> = ({
  isOpen,
  onClose,
  activeUser,
  streakDays,
  onNavigateToRecitation,
}) => {
  if (!isOpen) return null;

  const weeklyDays = getWeeklyStreakDays(activeUser);
  const isDoneToday = hasUserCompletedIbadahToday(activeUser.id) || activeUser.lastActiveDate === weeklyDays[weeklyDays.length - 1]?.dateStr;
  const longestStreak = Math.max(activeUser.longestStreak || streakDays, streakDays);
  const totalActiveDays = Math.max((activeUser.activeDates || []).length, streakDays > 0 ? 1 : 0);

  return (
    <div className="fixed inset-0 z-50 bg-[#141b2b]/50 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150 border border-[#1b4332]/10 flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="relative bg-gradient-to-br from-[#012d1d] via-[#1b4332] to-[#00452c] p-6 text-white text-center overflow-hidden">
          {/* Decorative Background Elements */}
          <div className="absolute -top-10 -right-10 w-32 h-32 rounded-full bg-[#fed488]/10 blur-xl pointer-events-none" />
          <div className="absolute -bottom-8 -left-8 w-28 h-28 rounded-full bg-[#c1ecd4]/10 blur-lg pointer-events-none" />

          {/* Close Button */}
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup"
            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>

          {/* Animated Big Flame Badge */}
          <div className="relative inline-flex items-center justify-center mb-2">
            <div className="w-20 h-20 rounded-full bg-[#fed488]/20 flex items-center justify-center animate-pulse">
              <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-[#e65100] to-[#ffb300] flex items-center justify-center shadow-lg">
                <span
                  className="material-symbols-outlined text-[36px] text-white"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  local_fire_department
                </span>
              </div>
            </div>
            <span className="absolute -bottom-1 bg-[#ba1a1a] text-white text-[10px] font-extrabold px-2.5 py-0.5 rounded-full shadow-xs uppercase tracking-wide">
              {isDoneToday ? 'Menyala' : 'Pertahankan'}
            </span>
          </div>

          <h2 className="text-3xl font-extrabold text-white tracking-tight flex items-center justify-center gap-1.5">
            <span>{streakDays}</span>
            <span className="text-xl font-semibold text-[#fed488]">Hari</span>
          </h2>
          <p className="text-xs text-[#c1ecd4] mt-1 font-medium">
            Runtutan Istiqamah Ibadah Yaumiyah
          </p>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-4">
          {/* Status Box */}
          <div
            className={`p-3.5 rounded-2xl border text-xs leading-relaxed flex items-start gap-3 ${
              isDoneToday
                ? 'bg-[#e8f5e9] border-[#c1ecd4] text-[#00452c]'
                : 'bg-[#fff8e1] border-[#ffe082] text-[#785a1a]'
            }`}
          >
            <span
              className={`material-symbols-outlined text-[22px] shrink-0 ${
                isDoneToday ? 'text-[#00452c]' : 'text-[#e65100]'
              }`}
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              {isDoneToday ? 'check_circle' : 'hourglass_top'}
            </span>
            <div>
              <p className="font-bold text-sm">
                {isDoneToday
                  ? 'Api Istiqamah Aktif Hari Ini! 🔥'
                  : 'Selesaikan 1 Amalan Hari Ini! ⏳'}
              </p>
              <p className="text-[11px] mt-0.5 opacity-90">
                {isDoneToday
                  ? 'Alhamdulillah, kamu telah mencatatkan ibadah hari ini. Streak kamu aman dan akan berlanjut besok.'
                  : 'Centang minimal 1 shalat fardhu, dzikir, atau setoran tilawah hari ini agar api runtutan tidak padam.'}
              </p>
            </div>
          </div>

          {/* 7-Day Visual Calendar Tracker */}
          <div className="bg-[#f9f9ff] p-4 rounded-2xl border border-[#1b4332]/5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-[#141b2b] flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[16px] text-[#00452c]">calendar_month</span>
                Aktivitas 7 Hari Terakhir
              </span>
              <span className="text-[10px] text-[#414844] font-medium">
                {weeklyDays.filter((d) => d.isActive).length}/7 Hari Aktif
              </span>
            </div>

            <div className="grid grid-cols-7 gap-1.5 sm:gap-2 text-center">
              {weeklyDays.map((d) => (
                <div
                  key={d.dateStr}
                  className={`flex flex-col items-center py-2 px-1 rounded-xl transition-all ${
                    d.isToday
                      ? 'bg-white ring-2 ring-[#00452c] shadow-xs'
                      : d.isActive
                      ? 'bg-[#e8f5e9]'
                      : 'bg-[#f1f3ff]'
                  }`}
                >
                  <span className="text-[10px] font-semibold text-[#414844]">{d.dayShort}</span>
                  <div className="my-1.5 w-7 h-7 rounded-full flex items-center justify-center">
                    {d.isActive ? (
                      <span
                        className="material-symbols-outlined text-[18px] text-[#e65100]"
                        style={{ fontVariationSettings: "'FILL' 1" }}
                      >
                        local_fire_department
                      </span>
                    ) : d.isToday ? (
                      <span className="w-2.5 h-2.5 rounded-full bg-[#fed488] animate-ping" />
                    ) : (
                      <span className="w-1.5 h-1.5 rounded-full bg-[#ba1a1a]/25" />
                    )}
                  </div>
                  <span className={`text-[10px] font-bold ${d.isToday ? 'text-[#00452c]' : 'text-[#717973]'}`}>
                    {d.dateNumber}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Stats Summary Grid */}
          <div className="grid grid-cols-2 gap-2.5">
            <div className="p-3 bg-white rounded-2xl border border-[#1b4332]/8 shadow-xs text-center">
              <span className="text-[11px] text-[#414844] block">Rekor Terpanjang</span>
              <span className="text-lg font-extrabold text-[#012d1d] mt-0.5 block flex items-center justify-center gap-1">
                <span className="material-symbols-outlined text-[18px] text-[#785a1a]">emoji_events</span>
                {longestStreak} Hari
              </span>
            </div>
            <div className="p-3 bg-white rounded-2xl border border-[#1b4332]/8 shadow-xs text-center">
              <span className="text-[11px] text-[#414844] block">Total Hari Ibadah</span>
              <span className="text-lg font-extrabold text-[#00452c] mt-0.5 block flex items-center justify-center gap-1">
                <span className="material-symbols-outlined text-[18px] text-[#00452c]">verified</span>
                {totalActiveDays} Hari
              </span>
            </div>
          </div>

          {/* Hadits Card */}
          <div className="p-3.5 bg-gradient-to-r from-[#012d1d]/5 to-[#c1ecd4]/20 rounded-2xl border border-[#1b4332]/10 text-left">
            <p className="text-[11px] font-semibold text-[#012d1d] italic">
              "Amalan yang paling dicintai oleh Allah adalah amalan yang kontinu (istiqamah) walaupun sedikit."
            </p>
            <p className="text-[10px] text-[#414844] mt-1 font-medium">
              — HR. Al-Bukhari &amp; Muslim
            </p>
          </div>
        </div>

        {/* Modal Footer Actions */}
        <div className="p-4 border-t border-[#f1f3ff] bg-[#f9f9ff] flex items-center gap-2">
          {onNavigateToRecitation && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onNavigateToRecitation();
              }}
              className="flex-1 h-11 px-4 rounded-xl bg-white hover:bg-[#f1f3ff] text-[#012d1d] font-bold text-xs border border-[#1b4332]/10 flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-xs active:scale-95"
            >
              <span className="material-symbols-outlined text-[16px] text-[#ba1a1a]">mic</span>
              <span>Ujian Tilawah</span>
            </button>
          )}

          <button
            type="button"
            onClick={onClose}
            className="flex-1 h-11 px-4 rounded-xl bg-[#012d1d] hover:bg-[#1b4332] text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-md active:scale-95"
          >
            <span className="material-symbols-outlined text-[16px]">check</span>
            <span>Lanjutkan Ibadah</span>
          </button>
        </div>
      </div>
    </div>
  );
};
