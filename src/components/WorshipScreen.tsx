import React, { useState, useEffect, useMemo } from 'react';
import { DailyTask, CommunityChallenge, ActiveUser } from '../types';
import { BRAND_ASSETS } from '../data/mockData';
import {
  calculatePrayerTimes,
  findNearestRegion,
  DEFAULT_INDONESIAN_REGIONS,
  RegionLocation,
  PrayerTimeItem
} from '../services/prayerTimes';
import { evaluatePrayerWindow, FastingOption } from '../services/amalanPaten';
import { MuraqabahConfirmModal } from './MuraqabahConfirmModal';
import { FastingSelectionModal } from './FastingSelectionModal';

interface WorshipScreenProps {
  tasks: DailyTask[];
  onToggleTask: (
    taskId: string,
    extraDetails?: { earnedXp?: number; fastingNote?: string; isJamaah?: boolean }
  ) => void;
  onAddTask?: (newTask: DailyTask) => void;
  onDeleteTask?: (taskId: string) => void;
  totalXp: number;
  streakDays: number;
  onNavigateToRecitation: () => void;
  onShowToast: (msg: string) => void;
  activeUser: ActiveUser;
  onOpenAuth: () => void;
}

export const WorshipScreen: React.FC<WorshipScreenProps> = ({
  tasks,
  onToggleTask,
  onAddTask,
  onDeleteTask,
  totalXp,
  streakDays,
  onNavigateToRecitation,
  onShowToast,
  activeUser,
  onOpenAuth
}) => {
  const [isOpeningStudio, setIsOpeningStudio] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);

  // Ustadz / Pembimbing privilege check: only Ustadz can add amalan
  const isUstadz = activeUser.role === 'admin' || activeUser.role === 'dept-hx' || activeUser.role === 'hq-admin';
  const isDeptHX = activeUser?.role === 'dept-hx' || activeUser?.role === 'hq-admin';

  // Filter tasks: Santri only sees tasks assigned to their halaqah or general/all
  const visibleTasks = useMemo(() => {
    if (isUstadz) return tasks;
    return tasks.filter(
      (t) => !t.targetHalaqah || t.targetHalaqah === 'Semua Halaqah' || t.targetHalaqah === 'Semua' || t.targetHalaqah === activeUser.halaqah
    );
  }, [tasks, isUstadz, activeUser.halaqah]);

  const doneCount = visibleTasks.filter((t) => t.completed).length;

  // --- REGIONAL LOCATION & VISITED AREA PRAYER TIMES STATE ---
  const [currentRegion, setCurrentRegion] = useState<RegionLocation>(() => {
    try {
      const saved = localStorage.getItem('noorworship_saved_region_v2');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.name && parsed.lat) return parsed;
      }
    } catch (e) {
      console.warn(e);
    }
    // Default: Purbalingga (PT HEW)
    return DEFAULT_INDONESIAN_REGIONS[0];
  });

  const [showRegionModal, setShowRegionModal] = useState(false);
  const [isDetectingGpsRegion, setIsDetectingGpsRegion] = useState(false);
  const [searchRegionQuery, setSearchRegionQuery] = useState('');

  useEffect(() => {
    try {
      localStorage.setItem('noorworship_saved_region_v2', JSON.stringify(currentRegion));
    } catch (e) {
      console.warn(e);
    }
  }, [currentRegion]);

  // --- ADD AMALAN IBADAH (KHUSUS USTADZ HALAQAH) STATE ---
  const [showAddAmalanModal, setShowAddAmalanModal] = useState(false);
  const [taskToDeleteInWorship, setTaskToDeleteInWorship] = useState<DailyTask | null>(null);
  const [newAmalanTitle, setNewAmalanTitle] = useState('');
  const [newAmalanCategory, setNewAmalanCategory] = useState('Sunnah Harian');
  const [newAmalanHalaqah, setNewAmalanHalaqah] = useState(activeUser.halaqah || 'Halaqah Al-Fajr');
  const [newAmalanXp, setNewAmalanXp] = useState<number>(15);

  // --- MURAQABAH & FASTING SELECTION STATES ---
  const [selectedTaskForConfirm, setSelectedTaskForConfirm] = useState<DailyTask | null>(null);
  const [showFastingModal, setShowFastingModal] = useState<boolean>(false);
  const [showMuraqabahModal, setShowMuraqabahModal] = useState<boolean>(false);
  const [selectedPrayerMode, setSelectedPrayerMode] = useState<'jamaah' | 'munfarid'>('jamaah');
  const [fastingNote, setFastingNote] = useState<string>('');

  const handleTaskClick = (task: DailyTask) => {
    if (task.completed) {
      onShowToast('Amalan yang telah dicentang tidak dapat dibatalkan (un-checklist) demi menjaga kejujuran mutaba\'ah.');
      return;
    }

    if (task.isLocked) {
      onShowToast(task.lockReason || 'Amalan ini belum dibuka');
      return;
    }

    setSelectedTaskForConfirm(task);
    setSelectedPrayerMode('jamaah');
    setFastingNote('');

    if (task.isFastingTask || task.title.toLowerCase().includes('puasa')) {
      setShowFastingModal(true);
      return;
    }

    const prayerStatus = evaluatePrayerWindow(task.prayerId, new Date(), currentRegion);
    if (prayerStatus.isTooEarly) {
      onShowToast(`Belum masuk waktu ${task.title}. Pengisian dibuka ${prayerStatus.timeRangeLabel}.`);
      return;
    }

    setShowMuraqabahModal(true);
  };

  const handleSelectFastingOption = (option: FastingOption, note?: string) => {
    setShowFastingModal(false);
    if (note) setFastingNote(note);
    setShowMuraqabahModal(true);
  };

  const handleConfirmMuraqabah = () => {
    if (!selectedTaskForConfirm) return;
    const task = selectedTaskForConfirm;
    const prayerStatus = evaluatePrayerWindow(task.prayerId, new Date(), currentRegion);
    const isLate = prayerStatus.isLate;
    const penalty = isLate ? 5 : 0;

    let earnedXp = task.xp;
    const isPrayer = task.hasJamaahOption || task.prayerId;
    if (isPrayer) {
      const base = 15;
      const bonus = selectedPrayerMode === 'jamaah' ? 5 : 0;
      earnedXp = Math.max(0, base + bonus - penalty);
    } else {
      earnedXp = Math.max(0, task.xp - penalty);
    }

    onToggleTask(task.id, {
      earnedXp,
      fastingNote: fastingNote || undefined,
      isJamaah: selectedPrayerMode === 'jamaah'
    });

    setShowMuraqabahModal(false);
    setSelectedTaskForConfirm(null);
  };
  const [newAmalanVerification, setNewAmalanVerification] = useState<'checklist' | 'setoran'>('checklist');
  const [newAmalanNote, setNewAmalanNote] = useState('');

  const handleStartRecitationTest = () => {
    setIsOpeningStudio(true);
    setTimeout(() => {
      setIsOpeningStudio(false);
      onNavigateToRecitation();
    }, 400);
  };



  const [currentTime, setCurrentTime] = useState<Date>(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Jadwal Shalat Astronomis Otomatis Disesuaikan dengan Daerah yang Dikunjungi
  const prayerTimesList: PrayerTimeItem[] = useMemo(() => {
    return calculatePrayerTimes(
      currentRegion.lat,
      currentRegion.lng,
      currentRegion.timezone,
      currentTime
    );
  }, [currentRegion, currentTime]);

  const {
    nextPrayer,
    prevPrayer,
    countdownText,
    progressPercent,
    masehiDateStr,
    hijriDateStr,
    liveClockStr
  } = useMemo(() => {
    const now = currentTime;
    const curMins = now.getHours() * 60 + now.getMinutes();

    // Masehi Indonesia
    const masehiFormatter = new Intl.DateTimeFormat('id-ID', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
    const masehiDateStr = masehiFormatter.format(now);

    // Hijriah
    let hijriDateStr = '';
    try {
      const hijriFormatter = new Intl.DateTimeFormat('id-ID-u-ca-islamic-umalqura', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      });
      hijriDateStr = hijriFormatter.format(now);
      if (!hijriDateStr.includes('H')) hijriDateStr += ' H';
    } catch {
      hijriDateStr = '14 Jumadil Akhir 1448 H';
    }

    const liveClockStr =
      now.toLocaleTimeString('id-ID', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      }) + ` ${currentRegion.timezoneName}`;

    const pSubuh = prayerTimesList.find((p) => p.id === 'subuh') || prayerTimesList[0];
    const pZhuhur = prayerTimesList.find((p) => p.id === 'zhuhur') || prayerTimesList[2];
    const pAshar = prayerTimesList.find((p) => p.id === 'ashar') || prayerTimesList[3];
    const pMaghrib = prayerTimesList.find((p) => p.id === 'maghrib') || prayerTimesList[4];
    const pIsya = prayerTimesList.find((p) => p.id === 'isya') || prayerTimesList[5];

    const mSubuh = pSubuh.hour * 60 + pSubuh.minute;
    const mZhuhur = pZhuhur.hour * 60 + pZhuhur.minute;
    const mAshar = pAshar.hour * 60 + pAshar.minute;
    const mMaghrib = pMaghrib.hour * 60 + pMaghrib.minute;
    const mIsya = pIsya.hour * 60 + pIsya.minute;

    let nextP = pSubuh;
    let prevP = pIsya;
    let diffMins = 0;
    let totalSegment = 0;
    let elapsedSegment = 0;

    if (curMins < mSubuh) {
      nextP = pSubuh;
      prevP = pIsya;
      diffMins = mSubuh - curMins;
      totalSegment = 24 * 60 - mIsya + mSubuh;
      elapsedSegment = 24 * 60 - mIsya + curMins;
    } else if (curMins < mZhuhur) {
      nextP = pZhuhur;
      prevP = pSubuh;
      diffMins = mZhuhur - curMins;
      totalSegment = mZhuhur - mSubuh;
      elapsedSegment = curMins - mSubuh;
    } else if (curMins < mAshar) {
      nextP = pAshar;
      prevP = pZhuhur;
      diffMins = mAshar - curMins;
      totalSegment = mAshar - mZhuhur;
      elapsedSegment = curMins - mZhuhur;
    } else if (curMins < mMaghrib) {
      nextP = pMaghrib;
      prevP = pAshar;
      diffMins = mMaghrib - curMins;
      totalSegment = mMaghrib - mAshar;
      elapsedSegment = curMins - mAshar;
    } else if (curMins < mIsya) {
      nextP = pIsya;
      prevP = pMaghrib;
      diffMins = mIsya - curMins;
      totalSegment = mIsya - mMaghrib;
      elapsedSegment = curMins - mMaghrib;
    } else {
      nextP = pSubuh;
      prevP = pIsya;
      diffMins = 24 * 60 - curMins + mSubuh;
      totalSegment = 24 * 60 - mIsya + mSubuh;
      elapsedSegment = curMins - mIsya;
    }

    let countdownText = '';
    if (diffMins <= 1) {
      countdownText = 'Waktu shalat telah tiba';
    } else if (diffMins < 60) {
      countdownText = `dalam ${diffMins} menit`;
    } else {
      const hrs = Math.floor(diffMins / 60);
      const remMins = diffMins % 60;
      countdownText = `dalam ${hrs} jam ${remMins > 0 ? `${remMins} mnt` : ''}`;
    }

    const progressPercent =
      totalSegment > 0
        ? Math.min(100, Math.max(0, Math.round((elapsedSegment / totalSegment) * 100)))
        : 50;

    return {
      nextPrayer: nextP,
      prevPrayer: prevP,
      countdownText,
      progressPercent,
      masehiDateStr,
      hijriDateStr,
      liveClockStr
    };
  }, [currentTime, currentRegion, prayerTimesList]);

  // Deteksi GPS otomatis untuk menyesuaikan daerah waktu shalat
  const handleDetectCurrentGpsRegion = () => {
    setIsDetectingGpsRegion(true);
    if (!navigator.geolocation) {
      setIsDetectingGpsRegion(false);
      onShowToast('Browser tidak mendukung Geolocation.');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        const matched = findNearestRegion(latitude, longitude);
        setCurrentRegion(matched);
        setIsDetectingGpsRegion(false);
        setShowRegionModal(false);
        onShowToast(`Waktu shalat otomatis disesuaikan dengan daerah: ${matched.name} (${matched.timezoneName}) 📍`);
      },
      (err) => {
        console.warn(err);
        setIsDetectingGpsRegion(false);
        onShowToast('Gagal membaca koordinat GPS. Pastikan izin lokasi aktif.');
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  // Tambah Amalan Ibadah khusus oleh Ustadz Halaqah
  const handleCreateAmalanByUstadz = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAmalanTitle.trim()) {
      onShowToast('Mohon masukkan nama amalan ibadah.');
      return;
    }

    const chosenXp = Number(newAmalanXp);
    if (chosenXp > 30) {
      onShowToast(
        'Peringatan: Batas maksimal 1 amalan harian Ustadz adalah 30 XP demi keadilan skor antar halaqah.'
      );
      return;
    }

    const currentCustomXp = visibleTasks
      .filter(
        (t) =>
          t.isCustomHalaqahTask &&
          (t.targetHalaqah === newAmalanHalaqah ||
            t.targetHalaqah === 'Semua Halaqah' ||
            t.targetHalaqah === 'Semua')
      )
      .reduce((sum, t) => sum + (t.xp || 0), 0);

    if (currentCustomXp + chosenXp > 30) {
      onShowToast(
        `Peringatan: Total poin amalan Ustadz untuk ${newAmalanHalaqah} hari ini sudah ${currentCustomXp} XP. Penambahan ${chosenXp} XP ini melebihi batas maksimal 30 XP (Sisa kuota: ${Math.max(
          0,
          30 - currentCustomXp
        )} XP).`
      );
      return;
    }

    const newTask: DailyTask = {
      id: `task-halaqah-${Date.now()}`,
      title: newAmalanTitle.trim(),
      category: newAmalanCategory,
      xp: Number(newAmalanXp),
      completed: false,
      targetHalaqah: newAmalanHalaqah,
      createdByName: activeUser.name,
      createdByRole: activeUser.role as any,
      isCustomHalaqahTask: true,
      note: newAmalanNote.trim() || undefined,
      isVerified: false,
      createdAt: new Date().toISOString()
    };

    if (onAddTask) {
      onAddTask(newTask);
    }
    setShowAddAmalanModal(false);
    setNewAmalanTitle('');
    setNewAmalanNote('');
  };



  return (
    <div className="flex flex-col w-full px-4 md:px-6 py-4 space-y-4 max-w-4xl mx-auto pb-28">
      {/* Active User Banner */}
      <div className="flex items-center justify-between p-3 rounded-2xl bg-white shadow-sm border border-[#1b4332]/5 gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <img
            src={activeUser.avatar || BRAND_ASSETS.currentUserAvatar}
            alt={activeUser.name}
            className="w-9 h-9 rounded-full object-cover shrink-0 shadow-sm ring-1 ring-[#c1ecd4]"
          />
          <div className="min-w-0">
            <span className="text-xs font-bold text-[#141b2b] truncate block">
              {activeUser.name}
            </span>
            <span className="text-[10px] text-[#414844] block truncate">
              {activeUser.role === 'admin' ? 'Ustadz Pembimbing' : 'Karyawan Aktif'} • {totalXp} XP • Kode: <span className="font-mono font-bold text-[#012d1d]">{activeUser.halaqahCode || 'HF-4092'}</span>
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className="px-2.5 py-1 rounded-full bg-[#c1ecd4] text-[#002114] text-[10px] font-bold flex items-center gap-1 shadow-2xs">
            <span className="material-symbols-outlined text-[13px] text-[#00452c]">verified</span>
            <span>{activeUser.halaqah}</span>
          </span>
        </div>
      </div>

      {/* Hijri & Next Prayer Hero Card — Real-time Synchronized */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#012d1d] via-[#1b4332] to-[#012d1d] text-white p-5 shadow-lg border border-[#c1ecd4]/20">
        <div className="absolute -right-10 -bottom-10 w-48 h-48 rounded-full bg-[#00452c]/50 blur-2xl pointer-events-none" />
        <div className="absolute -left-10 -top-10 w-36 h-36 rounded-full bg-[#fed488]/15 blur-xl pointer-events-none" />

        <div className="relative z-10 flex flex-col space-y-3.5">
          {/* Header Row: Visited Region & Real-time Live Clock */}
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => setShowRegionModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/15 hover:bg-white/25 text-[#92f7c3] text-xs font-bold backdrop-blur-md border border-[#92f7c3]/40 shadow-xs cursor-pointer transition-all active:scale-95"
              title="Sesuaikan daerah kunjungan"
            >
              <span className="material-symbols-outlined text-[15px] text-[#92f7c3]">location_on</span>
              <span>{currentRegion.name}</span>
              <span className="text-[11px] text-white/75 font-normal">({currentRegion.timezoneName})</span>
              <span className="material-symbols-outlined text-[14px] opacity-75">expand_more</span>
            </button>

            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#fed488]/20 text-[#fed488] text-[11px] font-mono font-bold tracking-wider backdrop-blur-md border border-[#fed488]/30">
              <span className="w-1.5 h-1.5 rounded-full bg-[#92f7c3] animate-ping" />
              <span>{liveClockStr}</span>
            </div>
          </div>

          {/* Dates: Hijriah & Modern (Ukuran Disamakan & Terletak di Bawah Informasi Lokasi) */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/10 text-[#ffdea5] text-xs font-semibold backdrop-blur-md border border-white/10 shadow-xs">
              <span className="material-symbols-outlined text-[14px]">calendar_month</span>
              <span>{hijriDateStr}</span>
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/10 text-[#dce2f7] text-xs font-semibold backdrop-blur-md border border-white/10 shadow-xs">
              <span className="material-symbols-outlined text-[14px]">event</span>
              <span>{masehiDateStr}</span>
            </span>
          </div>

          {/* Next Prayer Highlight */}
          <div className="flex items-baseline justify-between pt-0.5">
            <div>
              <div className="flex items-center gap-1.5 text-[#86af99] text-[11px] font-bold uppercase tracking-wider">
                <span className="material-symbols-outlined text-[15px] text-[#fed488]">schedule</span>
                <span>Shalat Berikutnya</span>
              </div>
              <div className="flex items-baseline gap-2 mt-0.5">
                <h2 className="text-3xl font-extrabold tracking-tight text-white">
                  {nextPrayer.name}
                </h2>
                <span className="text-[#ffdea5] text-xs font-bold px-2.5 py-0.5 rounded-full bg-[#012d1d]/80 border border-[#fed488]/20">
                  {countdownText}
                </span>
              </div>
            </div>

            <div className="text-right">
              <span className="font-amiri text-2xl text-[#fed488] block leading-tight">
                {nextPrayer.arabic}
              </span>
              <p className="text-xs font-bold text-[#86af99] mt-0.5 font-mono">
                {nextPrayer.timeStr} {currentRegion.timezoneName}
              </p>
            </div>
          </div>

          {/* Prayer timeline progress bar */}
          <div className="w-full pt-1">
            <div className="flex justify-between text-[11px] text-[#86af99] mb-1 font-medium">
              <span>{prevPrayer.name} ({prevPrayer.timeStr})</span>
              <span className="text-[#ffdea5] font-bold">{progressPercent}% Menuju {nextPrayer.name}</span>
              <span>{nextPrayer.name} ({nextPrayer.timeStr})</span>
            </div>
            <div className="h-2 w-full rounded-full bg-[#012d1d]/90 overflow-hidden border border-white/5">
              <div
                className="h-full bg-gradient-to-r from-[#fed488] to-[#92f7c3] rounded-full transition-all duration-700 ease-out"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          {/* 5 Daily Prayer Times Strip */}
          <div className="grid grid-cols-5 gap-1 sm:gap-1.5 pt-1">
            {prayerTimesList.filter((p) => p.isPrayer).map((p) => {
              const isNext = p.id === nextPrayer.id;
              return (
                <div
                  key={p.id}
                  className={`flex flex-col items-center justify-center py-2 px-0.5 sm:px-1 rounded-xl sm:rounded-2xl transition-all ${
                    isNext
                      ? 'bg-[#fed488]/25 border border-[#fed488] text-white shadow-sm ring-1 ring-[#fed488]/50'
                      : 'bg-white/5 hover:bg-white/10 text-[#dce2f7] border border-white/5'
                  }`}
                >
                  <span className={`text-[9px] sm:text-[10px] font-bold tracking-tight uppercase truncate max-w-full ${isNext ? 'text-[#fed488]' : 'text-[#86af99]'}`}>
                    {p.name}
                  </span>
                  <span className="text-[11px] sm:text-xs font-bold font-mono tabular-nums mt-0.5 whitespace-nowrap">
                    {p.timeStr}
                  </span>
                  {isNext && (
                    <span className="w-1.5 h-1.5 rounded-full bg-[#fed488] mt-1 animate-pulse" />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>



      {/* Streak & Ranking Widget */}
      <div className="grid grid-cols-3 gap-2.5">
        <div className="flex flex-col items-center justify-center p-3 rounded-2xl bg-white shadow-sm border border-[#1b4332]/5 text-center">
          <div className="flex items-center gap-1 text-[#775a19]">
            <span
              className="material-symbols-outlined text-[20px]"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              local_fire_department
            </span>
            <span className="text-xl font-bold text-[#141b2b]">{streakDays}</span>
          </div>
          <span className="text-xs text-[#414844] mt-0.5">Runtutan Hari</span>
        </div>

        <div className="flex flex-col items-center justify-center p-3 rounded-2xl bg-white shadow-sm border border-[#1b4332]/5 text-center">
          <div className="flex items-center gap-1 text-[#012d1d]">
            <span className="material-symbols-outlined text-[20px]">bolt</span>
            <span className="text-xl font-bold text-[#141b2b]">
              {totalXp.toLocaleString()}
            </span>
          </div>
          <span className="text-xs text-[#414844] mt-0.5">Total XP</span>
        </div>

        <div className="flex flex-col items-center justify-center p-3 rounded-2xl bg-white shadow-sm border border-[#1b4332]/5 text-center">
          <div className="flex items-center gap-1 text-[#775a19]">
            <span
              className="material-symbols-outlined text-[20px]"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              workspace_premium
            </span>
            <span className="text-xl font-bold text-[#141b2b]">#3</span>
          </div>
          <span className="text-xs text-[#414844] mt-0.5">Peringkat Halaqah</span>
        </div>
      </div>

      {/* Worship To-Do Checklist */}
      <div className="flex flex-col space-y-2.5 pt-1">
        <div className="flex flex-col space-y-1.5">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-[#141b2b] text-base">Amalan Ibadah Halaqah</h3>
              <span className="px-2.5 py-0.5 rounded-full bg-[#c1ecd4] text-[#002114] text-xs font-semibold">
                {doneCount}/{visibleTasks.length} Selesai
              </span>
            </div>
            <div className="flex items-center gap-2">
              {isUstadz ? (
                <button
                  type="button"
                  onClick={() => setShowAddAmalanModal(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-[#012d1d] to-[#1b4332] text-white text-xs font-bold hover:brightness-110 active:scale-95 transition-all shadow-xs cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[15px] text-[#92f7c3]">add_circle</span>
                  <span>+ Tambah Amalan Halaqah</span>
                </button>
              ) : null}
              <button
                onClick={() => setShowHistoryModal(true)}
                className="text-xs font-semibold text-[#012d1d] hover:underline cursor-pointer"
              >
                Riwayat
              </button>
            </div>
          </div>
          {/* Role Guidance Notice */}
          {isUstadz ? (
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#e9fbf2] border border-[#92f7c3]/50 text-xs text-[#00452c]">
              <div className="flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[16px] text-[#00452c]">verified_user</span>
                <span>Mode Pembimbing: Anda berwenang menetapkan amalan khusus untuk <strong>{activeUser.halaqah}</strong></span>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-[11px] text-[#414844]">
              <span className="material-symbols-outlined text-[14px] text-[#00452c]">school</span>
              <span>
                Kurikulum amalan dibina &amp; ditetapkan oleh <strong>{activeUser.supervisor || 'Ustadz Pembimbing'}</strong> ({activeUser.halaqah})
              </span>
            </div>
          )}        </div>

        {/* Task List */}
        <div className="space-y-2.5">
          {visibleTasks.map((task) => {
            const isRecitationType =
              task.isRecitationTest ||
              task.category === 'Al-Qur’an' ||
              task.category === 'Tilawah & Hifdz' ||
              /setor|ujian|rekam|murottal|tartil|surah|juz|hafalan/i.test(task.title);

            if (task.isAssigned && isRecitationType) {
              // Special Assigned Task Card (Surah Al-Mulk / Ujian Tilawah)
              return (
                <div
                  key={task.id}
                  className="p-3.5 sm:p-4 rounded-2xl bg-white shadow-xs border border-[#1b4332]/8 flex flex-col space-y-3"
                >
                  <div className="flex items-start justify-between gap-2.5">
                    <div className="flex items-start gap-2.5 sm:gap-3 min-w-0">
                      <button
                        onClick={() => onToggleTask(task.id)}
                        aria-label="Setor atau putar tilawah"
                        className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center mt-0.5 shrink-0 transition-transform active:scale-95 cursor-pointer ${
                          task.completed
                            ? 'bg-[#775a19] text-white shadow-2xs'
                            : 'bg-[#e9edff] text-[#012d1d] hover:bg-[#dce2f7]'
                        }`}
                      >
                        <span className="material-symbols-outlined text-[18px]">
                          {task.completed ? 'check' : 'play_arrow'}
                        </span>
                      </button>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h4
                            className={`font-bold text-sm sm:text-base text-[#141b2b] truncate ${
                              task.completed ? 'line-through opacity-75' : ''
                            }`}
                          >
                            {task.title}
                          </h4>
                          <span className="px-2 py-0.5 rounded-full bg-[#ffdea5] text-[#261900] text-[10px] font-bold uppercase tracking-wider">
                            Ditugaskan Ustadz
                          </span>
                          <span className="px-2 py-0.5 rounded-full bg-[#c1ecd4] text-[#002114] text-[10px] font-bold">
                            {task.type === "usbu'iyah" ? '🌙 1 Pekan (Usbu\'iyah)' : '☀️ 1 Hari (Yaumiyah)'}
                          </span>
                          <span className="px-2 py-0.5 rounded-full bg-[#f1f3ff] text-[#414844] text-[10px] font-semibold">
                            {task.isRecurring !== false ? '🔁 Berulang' : '⏹️ 1x Selesai'}
                          </span>
                        </div>
                        <p className="text-xs text-[#414844] mt-0.5">{task.category}</p>
                      </div>
                    </div>
                    <span className="text-xs sm:text-sm font-bold text-[#012d1d] shrink-0 bg-[#e9fbf2] px-2 py-0.5 rounded-lg">
                      +{task.xp} XP
                    </span>
                  </div>

                  {/* Action Tray: Responsive mobile stack */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-2 border-t border-[#f1f3ff]">
                    <div className="flex items-center gap-1.5 text-[#414844] text-xs font-medium">
                      <span className="material-symbols-outlined text-[16px] text-[#012d1d]">
                        graphic_eq
                      </span>
                      <span>Pengukuran Tajwid &amp; Suara AI</span>
                    </div>
                    <button
                      onClick={handleStartRecitationTest}
                      disabled={isOpeningStudio}
                      className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl sm:rounded-full bg-[#1b4332] hover:bg-[#012d1d] text-white text-xs font-bold shadow-xs active:scale-95 transition-all cursor-pointer min-h-[42px]"
                    >
                      {isOpeningStudio ? (
                        <>
                          <span className="material-symbols-outlined text-[16px] animate-spin">
                            refresh
                          </span>
                          <span>Membuka Studio...</span>
                        </>
                      ) : (
                        <>
                          <span className="material-symbols-outlined text-[16px]">mic</span>
                          <span>Mulai Ujian Sekarang</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            }

            if (task.isLocked) {
              return (
                <div
                  key={task.id}
                  className="flex items-center justify-between p-3.5 sm:p-4 rounded-2xl bg-[#f1f3ff] shadow-xs border border-[#1b4332]/5 opacity-90 gap-2.5"
                >
                  <div className="flex items-start gap-2.5 sm:gap-3 min-w-0">
                    <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-[#dce2f7] text-[#414844] flex items-center justify-center mt-0.5 shrink-0">
                      <span className="material-symbols-outlined text-[16px]">lock</span>
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-semibold text-sm sm:text-base text-[#141b2b] truncate">
                        {task.title}
                      </h4>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-xs text-[#414844]">{task.category}</span>
                        <span className="text-xs text-[#414844]">• {task.xp} XP</span>
                      </div>
                    </div>
                  </div>
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#dce2f7] text-[#414844] text-[11px] sm:text-xs font-medium shrink-0">
                    <span className="material-symbols-outlined text-[14px]">lock</span>
                    <span className="truncate max-w-[120px] sm:max-w-none">{task.lockReason || 'Belum Masuk Waktu'}</span>
                  </span>
                </div>
              );
            }

            // Normal & Ustadz Assigned Tasks
            return (
              <div
                key={task.id}
                onClick={() => handleTaskClick(task)}
                className="flex items-center justify-between p-3.5 sm:p-4 rounded-2xl bg-white shadow-xs border border-[#1b4332]/5 cursor-pointer hover:bg-[#f9f9ff] active:scale-[0.99] transition-all gap-2.5 select-none"
              >
                <div className="flex items-start gap-2.5 sm:gap-3 min-w-0">
                  <div
                    className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center mt-0.5 shrink-0 transition-all ${
                      task.completed
                        ? 'bg-[#00452c] text-white shadow-2xs'
                        : 'border-2 border-[#717973] hover:border-[#012d1d] bg-[#f9f9ff]'
                    }`}
                  >
                    {task.completed && (
                      <span className="material-symbols-outlined text-[18px]">check</span>
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <h4
                        className={`font-bold text-sm sm:text-base text-[#141b2b] truncate ${
                          task.completed ? 'line-through opacity-70' : ''
                        }`}
                      >
                        {task.title}
                      </h4>
                      {task.isAssigned && (
                        <>
                          <span className="px-2 py-0.5 rounded-full bg-[#ffdea5] text-[#261900] text-[9px] font-bold uppercase tracking-wider">
                            Ditugaskan Ustadz
                          </span>
                          <span className="px-1.5 py-0.5 rounded-full bg-[#c1ecd4] text-[#002114] text-[9px] font-bold">
                            {task.type === "usbu'iyah" ? '🌙 1 Pekan' : '☀️ 1 Hari'}
                          </span>
                          <span className="px-1.5 py-0.5 rounded-full bg-[#f1f3ff] text-[#414844] text-[9px] font-semibold">
                            {task.isRecurring !== false ? '🔁 Berulang' : '⏹️ 1x Selesai'}
                          </span>
                        </>
                      )}
                      {task.createdByName && !task.isAssigned && (
                        <span className="px-2 py-0.5 rounded-full bg-[#c1ecd4] text-[#002114] text-[9px] font-bold">
                          Oleh {task.createdByName}
                        </span>
                      )}
                      {task.targetHalaqah && task.targetHalaqah !== 'Semua Halaqah' && (
                        <span className="px-1.5 py-0.2 rounded-md bg-[#f1f3ff] text-[#414844] text-[9px] font-medium">
                          {task.targetHalaqah}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                      {task.isVerified ? (
                        <span className="text-xs text-[#00452c] flex items-center gap-0.5 font-semibold">
                          <span className="material-symbols-outlined text-[13px]">verified</span>{' '}
                          Terverifikasi Masjid
                        </span>
                      ) : (
                        <span className="text-xs text-[#414844]">{task.category}</span>
                      )}
                      <span className="text-xs text-[#414844]">• +{task.xp} XP</span>
                    </div>
                    {task.note && (
                      <p className="text-[11px] text-[#717973] mt-0.5 italic truncate">
                        Catatan: {task.note}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                      task.completed
                        ? 'bg-[#e9edff] text-[#414844]'
                        : 'bg-[#00452c] text-white shadow-2xs'
                    }`}
                  >
                    {task.completed ? 'Selesai' : 'Tandai Selesai'}
                  </span>

                  {isUstadz && task.isCustomHalaqahTask && onDeleteTask && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setTaskToDeleteInWorship(task);
                      }}
                      className="p-1.5 rounded-lg text-[#717973] hover:text-[#ba1a1a] hover:bg-red-50 transition-colors cursor-pointer min-w-[36px] min-h-[36px] flex items-center justify-center"
                      title="Hapus amalan halaqah ini"
                    >
                      <span className="material-symbols-outlined text-[18px]">delete</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>



      {/* Weekly Collective Focus Card */}
      <div className="rounded-2xl bg-[#f1f3ff] p-4 shadow-sm border border-[#1b4332]/5">
        <div className="flex items-center gap-3">
          <img
            className="w-16 h-16 rounded-xl object-cover shrink-0 shadow-sm"
            alt="Mushaf Al-Qur'an"
            src={BRAND_ASSETS.quranManuscript}
          />
          <div className="min-w-0 flex-1">
            <span className="text-[11px] text-[#775a19] uppercase font-bold tracking-wider">
              Refleksi Ayat Pekan Ini
            </span>
            <p
              className="font-amiri text-xl text-[#141b2b] truncate leading-relaxed my-0.5"
              dir="rtl"
            >
              أَلَا بِذِكْرِ اللَّهِ تَطْمَئِنُّ الْقُلُوبُ
            </p>
            <p className="text-xs text-[#414844] truncate">
              &quot;Ingatlah, hanya dengan mengingat Allah hati menjadi tenteram.&quot; (QS. Ar-Ra&apos;d: 28)
            </p>
          </div>
        </div>
      </div>

      {/* History Modal */}
      {showHistoryModal && (
        <div className="fixed inset-0 z-50 bg-[#141b2b]/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-[#f1f3ff]">
              <h3 className="font-bold text-base text-[#141b2b]">Riwayat Amalan Ibadah</h3>
              <button
                onClick={() => setShowHistoryModal(false)}
                className="w-8 h-8 rounded-full bg-[#f1f3ff] flex items-center justify-center text-[#414844] cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>
            <div className="py-4 space-y-2 text-xs text-[#414844]">
              <div className="flex justify-between py-1.5 border-b border-[#f1f3ff]">
                <span>Kemarin (13 Ramadan)</span>
                <span className="font-semibold text-[#012d1d]">4/4 Selesai • 350 XP</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-[#f1f3ff]">
                <span>12 Ramadan</span>
                <span className="font-semibold text-[#012d1d]">3/4 Selesai • 250 XP</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-[#f1f3ff]">
                <span>11 Ramadan</span>
                <span className="font-semibold text-[#012d1d]">4/4 Selesai • 350 XP</span>
              </div>
            </div>
            <button
              onClick={() => setShowHistoryModal(false)}
              className="w-full py-2.5 rounded-full bg-[#1b4332] text-white text-xs font-semibold cursor-pointer"
            >
              Tutup
            </button>
          </div>
        </div>
      )}





      {/* Modal: Sesuaikan Daerah & Waktu Shalat Berdasarkan Lokasi Kunjungan */}
      {showRegionModal && (
        <div className="fixed inset-0 z-50 bg-[#0c1322]/70 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-md w-full p-4 sm:p-5 shadow-2xl text-[#141b2b] space-y-3.5 my-auto relative border border-[#c1ecd4] max-h-[88vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-[#f1f3ff]">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-[#e9fbf2] text-[#00452c] flex items-center justify-center border border-[#92f7c3]/60 shadow-xs">
                  <span className="material-symbols-outlined text-[22px]">explore</span>
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-[#141b2b]">
                    Sesuaikan Daerah Waktu Shalat
                  </h3>
                  <p className="text-xs text-[#717973]">
                    Waktu shalat otomatis beradaptasi dengan kota/daerah yang didatangi
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowRegionModal(false)}
                className="w-8 h-8 rounded-full bg-[#f1f3ff] hover:bg-[#e4e7fa] flex items-center justify-center text-[#414844] cursor-pointer transition-colors"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            {/* GPS Auto-Detect Button */}
            <div className="p-3.5 rounded-2xl bg-gradient-to-br from-[#012d1d] to-[#1b4332] text-white space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-[#92f7c3] flex items-center gap-1">
                  <span className="material-symbols-outlined text-[16px]">satellite_alt</span>
                  <span>Deteksi Posisi Real GPS</span>
                </span>
                <span className="text-[10px] text-white/70">Akurasi Astronomis</span>
              </div>
              <p className="text-xs text-[#dce2f7] leading-relaxed">
                Gunakan koordinat satelit GPS perangkat untuk otomatis menghitung waktu shalat di lokasi Anda saat ini.
              </p>
              <button
                type="button"
                onClick={handleDetectCurrentGpsRegion}
                disabled={isDetectingGpsRegion}
                className="w-full py-2.5 px-3 rounded-xl bg-[#92f7c3] hover:bg-[#78e3ab] text-[#002114] font-bold text-xs flex items-center justify-center gap-2 shadow-sm cursor-pointer transition-all active:scale-95 disabled:opacity-50"
              >
                <span className={`material-symbols-outlined text-[16px] ${isDetectingGpsRegion ? 'animate-spin' : ''}`}>
                  my_location
                </span>
                <span>
                  {isDetectingGpsRegion ? 'Mengunci Lokasi GPS...' : '📍 Deteksi Otomatis Lokasi GPS Sekarang'}
                </span>
              </button>
            </div>

            {/* Daerah Aktif Saat Ini */}
            <div className="p-3 rounded-2xl bg-[#f9f9ff] border border-[#1b4332]/10 flex items-center justify-between text-xs">
              <div>
                <span className="text-[10px] text-[#717973] block uppercase tracking-wider font-semibold">Daerah Terpilih:</span>
                <strong className="text-sm text-[#012d1d]">{currentRegion.name}</strong>
                <span className="text-[#414844] block text-[11px]">{currentRegion.province} • {currentRegion.timezoneName} (UTC+{currentRegion.timezone})</span>
              </div>
              <span className="px-2.5 py-1 rounded-full bg-[#c1ecd4] text-[#002114] font-bold text-[10px]">
                Aktif ✓
              </span>
            </div>

            {/* Search / Filter City */}
            <div>
              <label className="block text-xs font-bold text-[#141b2b] mb-1">
                Pilih Kota / Daerah yang Sedang Dikunjungi
              </label>
              <div className="relative mb-2">
                <span className="material-symbols-outlined absolute left-3 top-2.5 text-[16px] text-[#717973]">
                  search
                </span>
                <input
                  type="text"
                  value={searchRegionQuery}
                  onChange={(e) => setSearchRegionQuery(e.target.value)}
                  placeholder="Cari Purbalingga, Jakarta, Bandung, Surabaya, dll..."
                  className="w-full pl-9 pr-3 py-2 rounded-xl bg-[#f9f9ff] border border-[#1b4332]/15 text-xs text-[#141b2b] placeholder-[#717973]/70 focus:outline-none focus:ring-2 focus:ring-[#00452c]/30 font-medium"
                />
              </div>

              {/* City List */}
              <div className="max-h-52 overflow-y-auto space-y-1.5 pr-1 scrollbar-thin">
                {DEFAULT_INDONESIAN_REGIONS.filter(
                  (reg) =>
                    reg.name.toLowerCase().includes(searchRegionQuery.toLowerCase()) ||
                    reg.province.toLowerCase().includes(searchRegionQuery.toLowerCase())
                ).map((reg) => {
                  const isSelected = reg.id === currentRegion.id;
                  return (
                    <button
                      key={reg.id}
                      type="button"
                      onClick={() => {
                        setCurrentRegion(reg);
                        setShowRegionModal(false);
                        onShowToast(`Waktu shalat disesuaikan dengan ${reg.name} (${reg.timezoneName}) 📍`);
                      }}
                      className={`w-full p-2.5 rounded-xl text-left flex items-center justify-between transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-[#00452c] text-white shadow-xs font-bold'
                          : 'bg-[#f1f3ff] hover:bg-[#e4e7fa] text-[#141b2b]'
                      }`}
                    >
                      <div className="min-w-0">
                        <span className="text-xs font-bold block truncate">{reg.name}</span>
                        <span className={`text-[10px] block truncate ${isSelected ? 'text-[#92f7c3]' : 'text-[#717973]'}`}>
                          {reg.province}
                        </span>
                      </div>
                      <span
                        className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${
                          isSelected ? 'bg-white/20 text-[#92f7c3]' : 'bg-white text-[#414844]'
                        }`}
                      >
                        {reg.timezoneName}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Tambah Amalan Ibadah Khusus Ustadz Halaqah */}
      {showAddAmalanModal && (
        <div className="fixed inset-0 z-50 bg-[#0c1322]/70 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-md w-full p-5 shadow-2xl text-[#141b2b] space-y-4 my-auto relative border border-[#c1ecd4]">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-[#f1f3ff]">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-[#e9fbf2] text-[#00452c] flex items-center justify-center border border-[#92f7c3]/60 shadow-xs">
                  <span className="material-symbols-outlined text-[22px]">assignment_add</span>
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-[#141b2b]">
                    Tambah Amalan Ibadah Halaqah
                  </h3>
                  <p className="text-xs text-[#717973]">
                    Ditetapkan oleh Ustadz {activeUser.name} untuk binaan karyawan
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowAddAmalanModal(false)}
                className="w-8 h-8 rounded-full bg-[#f1f3ff] hover:bg-[#e4e7fa] flex items-center justify-center text-[#414844] cursor-pointer transition-colors"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleCreateAmalanByUstadz} className="space-y-3.5 text-xs">
              {/* Judul Amalan */}
              <div>
                <label className="block font-bold text-[#141b2b] mb-1">
                  Nama Amalan Ibadah *
                </label>
                <input
                  type="text"
                  value={newAmalanTitle}
                  onChange={(e) => setNewAmalanTitle(e.target.value)}
                  placeholder="Contoh: Shalat Dhuha 4 Rakaat, Sedekah Subuh, Muraja'ah Juz 30"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#f9f9ff] border border-[#1b4332]/15 text-xs text-[#141b2b] placeholder-[#717973]/70 focus:outline-none focus:ring-2 focus:ring-[#00452c]/30 font-medium"
                  required
                />
              </div>

              {/* Kategori Amalan */}
              <div>
                <label className="block font-bold text-[#141b2b] mb-1">
                  Kategori Amalan
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  {[
                    'Sunnah Harian',
                    'Tilawah & Hifdz',
                    'Shalat Rawatib',
                    'Dzikir & Doa',
                    'Adab & Akhlak',
                    'Shalat Berjamaah',
                    'Lain-lain'
                  ].map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setNewAmalanCategory(cat)}
                      className={`py-2 px-2 rounded-xl text-center text-[11px] font-bold border cursor-pointer transition-all ${
                        newAmalanCategory === cat
                          ? 'bg-[#00452c] text-white border-[#00452c] shadow-xs'
                          : 'bg-[#f9f9ff] text-[#414844] border-[#1b4332]/10 hover:bg-[#e9fbf2]'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* Target Halaqah */}
              <div>
                <label className="block font-bold text-[#141b2b] mb-1">
                  Target Halaqah Karyawan
                </label>
                <select
                  value={newAmalanHalaqah}
                  onChange={(e) => setNewAmalanHalaqah(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#f9f9ff] border border-[#1b4332]/15 text-xs text-[#141b2b] focus:outline-none focus:ring-2 focus:ring-[#00452c]/30 font-semibold"
                >
                  <option value={activeUser.halaqah}>{activeUser.halaqah} (Halaqah Binaan Anda)</option>
                  <option value="Halaqah Al-Fajr">Halaqah Al-Fajr</option>
                  <option value="Hafiz Circle">Hafiz Circle</option>
                  <option value="Semua Halaqah">Semua Halaqah (Umum)</option>
                </select>
              </div>

              {/* Reward XP */}
              <div>
                <label className="block font-bold text-[#141b2b] mb-1">
                  Reward XP untuk Karyawan
                </label>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-1.5">
                  {[
                    { val: 5, label: '5 XP' },
                    { val: 10, label: '10 XP' },
                    { val: 15, label: '15 XP (Standar)' },
                    { val: 20, label: '20 XP' },
                    { val: 25, label: '25 XP' },
                    { val: 30, label: '30 XP (Tinggi)' },
                    { val: 50, label: '50 XP (Istimewa)' }
                  ].map((xpItem) => (
                    <button
                      key={xpItem.val}
                      type="button"
                      onClick={() => setNewAmalanXp(xpItem.val)}
                      className={`py-2 px-1 rounded-xl text-[11px] font-extrabold cursor-pointer transition-all ${
                        newAmalanXp === xpItem.val
                          ? 'bg-[#fed488] text-[#785a1a] ring-1 ring-[#fed488] shadow-2xs font-extrabold'
                          : 'bg-[#f1f3ff] text-[#414844] hover:bg-[#e4e7fa]'
                      }`}
                    >
                      {xpItem.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Mode Verifikasi */}
              <div>
                <label className="block font-bold text-[#141b2b] mb-1">
                  Metode Verifikasi Penyelesaian
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setNewAmalanVerification('checklist')}
                    className={`p-2.5 rounded-xl border text-left cursor-pointer transition-all ${
                      newAmalanVerification === 'checklist'
                        ? 'border-[#00452c] bg-[#e9fbf2] text-[#00452c]'
                        : 'border-[#1b4332]/10 bg-[#f9f9ff] text-[#414844]'
                    }`}
                  >
                    <span className="font-bold block text-xs">Checklist Mandiri</span>
                    <span className="text-[10px] text-[#717973] block mt-0.5">Karyawan mencentang setelah mengerjakan</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setNewAmalanVerification('setoran')}
                    className={`p-2.5 rounded-xl border text-left cursor-pointer transition-all ${
                      newAmalanVerification === 'setoran'
                        ? 'border-[#00452c] bg-[#e9fbf2] text-[#00452c]'
                        : 'border-[#1b4332]/10 bg-[#f9f9ff] text-[#414844]'
                    }`}
                  >
                    <span className="font-bold block text-xs">Verifikasi Ustadz</span>
                    <span className="text-[10px] text-[#717973] block mt-0.5">Divalidasi langsung oleh Pembimbing</span>
                  </button>
                </div>
              </div>

              {/* Catatan / Petunjuk Khusus Ustadz */}
              <div>
                <label className="block font-bold text-[#141b2b] mb-1">
                  Petunjuk / Catatan Pembimbing (Opsional)
                </label>
                <input
                  type="text"
                  value={newAmalanNote}
                  onChange={(e) => setNewAmalanNote(e.target.value)}
                  placeholder="Contoh: Dikerjakan sebelum waktu shalat Zhuhur"
                  className="w-full px-3.5 py-2 rounded-xl bg-[#f9f9ff] border border-[#1b4332]/15 text-xs text-[#141b2b] placeholder-[#717973]/70 focus:outline-none focus:ring-2 focus:ring-[#00452c]/30"
                />
              </div>

              {/* Actions */}
              <div className="pt-2 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddAmalanModal(false)}
                  className="w-1/3 py-2.5 rounded-2xl bg-[#f1f3ff] hover:bg-[#e4e7fa] text-[#414844] font-bold text-xs cursor-pointer transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="w-2/3 py-2.5 rounded-2xl bg-gradient-to-r from-[#012d1d] to-[#1b4332] text-white font-extrabold text-xs shadow-md hover:brightness-105 active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-[16px] text-[#92f7c3]">send</span>
                  <span>Tugaskan ke Karyawan</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Selection Fasting Type */}
      <FastingSelectionModal
        isOpen={showFastingModal}
        onClose={() => setShowFastingModal(false)}
        onSelectFasting={handleSelectFastingOption}
      />

      {/* Modal Muraqabah Confirmation & Oath */}
      <MuraqabahConfirmModal
        isOpen={showMuraqabahModal}
        onClose={() => setShowMuraqabahModal(false)}
        task={selectedTaskForConfirm}
        prayerStatus={
          selectedTaskForConfirm
            ? evaluatePrayerWindow(selectedTaskForConfirm.prayerId, new Date(), currentRegion)
            : null
        }
        selectedPrayerMode={selectedPrayerMode}
        onChangePrayerMode={setSelectedPrayerMode}
        fastingNote={fastingNote}
        onConfirm={handleConfirmMuraqabah}
      />

      {/* Modal Konfirmasi Hapus Amalan Halaqah Ustadz */}
      {taskToDeleteInWorship && (
        <div className="fixed inset-0 z-50 bg-[#141b2b]/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in zoom-in-95 duration-150">
          <div className="bg-white rounded-3xl max-w-md w-full p-5 sm:p-6 shadow-2xl space-y-4 border border-[#1b4332]/10">
            <div className="flex items-center gap-3 pb-3 border-b border-[#f1f3ff]">
              <div className="w-10 h-10 rounded-2xl bg-rose-100 text-rose-800 flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-[22px]">warning</span>
              </div>
              <div>
                <h3 className="font-bold text-base text-[#141b2b]">
                  Konfirmasi Hapus Amalan
                </h3>
                <p className="text-xs text-[#414844]">
                  Tindakan ini memerlukan kepastian Ustadz Pembimbing
                </p>
              </div>
            </div>

            <p className="text-xs text-[#141b2b] leading-relaxed">
              Apakah Anda yakin ingin menghapus amalan berikut dari daftar mutaba&apos;ah halaqah?
            </p>

            <div className="p-3.5 rounded-2xl bg-[#f9f9ff] border border-[#1b4332]/10 space-y-1">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-900 text-[10px] font-bold">
                  Akan Dihapus
                </span>
                <span className="text-[10px] text-[#717973] font-medium">
                  • {taskToDeleteInWorship.category}
                </span>
                <span className="px-2 py-0.5 rounded-full bg-[#e9edff] text-[#012d1d] text-[10px] font-bold">
                  +{taskToDeleteInWorship.xp} XP
                </span>
              </div>
              <h4 className="text-sm font-bold text-[#141b2b] mt-1">
                {taskToDeleteInWorship.title}
              </h4>
            </div>

            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-[11px] text-amber-900 flex items-start gap-2">
              <span className="material-symbols-outlined text-[16px] text-amber-700 shrink-0 mt-0.5">
                info
              </span>
              <span>
                Amalan yang dihapus tidak dapat dikembalikan dan akan otomatis hilang dari tampilan mutaba&apos;ah karyawan.
              </span>
            </div>

            <div className="flex gap-2 pt-2 border-t border-[#f1f3ff]">
              <button
                type="button"
                onClick={() => setTaskToDeleteInWorship(null)}
                className="flex-1 py-2.5 rounded-xl bg-[#f1f3ff] hover:bg-[#e4e7ff] text-[#414844] font-bold text-xs cursor-pointer transition-colors"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => {
                  if (onDeleteTask && taskToDeleteInWorship) {
                    onDeleteTask(taskToDeleteInWorship.id);
                    onShowToast(`Amalan "${taskToDeleteInWorship.title}" berhasil dihapus.`);
                  }
                  setTaskToDeleteInWorship(null);
                }}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs shadow-md cursor-pointer transition-all active:scale-95 flex items-center justify-center gap-1.5"
              >
                <span className="material-symbols-outlined text-[16px]">delete</span>
                <span>Ya, Hapus Amalan</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
