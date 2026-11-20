import React, { useState, useEffect, useMemo } from 'react';
import { collection, onSnapshot, query, orderBy, limit } from 'firebase/firestore';
import { db } from '../services/firebase';
import { LeaderboardUser, ActiveUser } from '../types';
import { DEFAULT_BASE_HALAQAHS, HalaqahDetail } from './HQAdminScreen';
import { PremiumInitialAvatar } from './PremiumInitialAvatar';
import { getUstadzTitle, formatSupervisorDisplayName } from '../services/ustadzTitle';

interface LeaderboardScreenProps {
  userXp: number;
  userStreak: number;
  onShowToast: (msg: string) => void;
  activeUser?: ActiveUser;
  onOpenAuth?: () => void;
  registeredUsers?: ActiveUser[];
}

const BASE_EMPLOYEES_ROSTER: ActiveUser[] = [];

const LEGACY_DEMO_IDS = new Set([
  'user-zubair',
  'user-zayd',
  'user-tariq',
  'user-farhan',
  'user-hamza',
  'user-omar',
  'user-bilal',
  'user-faris'
]);

export const LeaderboardScreen: React.FC<LeaderboardScreenProps> = ({
  userXp,
  userStreak,
  onShowToast,
  activeUser,
  onOpenAuth,
  registeredUsers
}) => {
  const isDeptHX = activeUser?.role === 'dept-hx' || activeUser?.role === 'hq-admin';
  const [scope, setScope] = useState<'group' | 'global'>('group');
  const [selectedMilestone, setSelectedMilestone] = useState<{
    title: string;
    desc: string;
    xp: string;
    icon: string;
    tips: string;
  } | null>(null);
  const [selectedLeaderboardUser, setSelectedLeaderboardUser] = useState<LeaderboardUser | null>(null);
  const [liveUsers, setLiveUsers] = useState<ActiveUser[]>([]);
  
  // Sub-filter for Dept HX in "Per Halaqah" mode: 'all' or specific halaqah name
  const [selectedHalaqahFilter, setSelectedHalaqahFilter] = useState<string>('all');

  // Listen to all users in Firestore for leaderboard
  useEffect(() => {
    const q = query(collection(db, 'users'), orderBy('totalXp', 'desc'), limit(100));
    const unsub = onSnapshot(q, (snapshot) => {
      const users: ActiveUser[] = [];
      snapshot.forEach((docSnap) => {
        if (LEGACY_DEMO_IDS.has(docSnap.id)) return;
        users.push({ id: docSnap.id, ...docSnap.data() } as ActiveUser);
      });
      setLiveUsers(users);
    });
    return () => unsub();
  }, []);

  // List of all halaqahs (loaded from localStorage unified list or defaults)
  const halaqahDetailsList = useMemo<HalaqahDetail[]>(() => {
    let list: HalaqahDetail[] = [];
    try {
      const saved = localStorage.getItem('noorworship_unified_halaqahs_prod_v1');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) list = parsed;
      }
    } catch (e) {
      console.warn(e);
    }
    if (list.length === 0) {
      list = DEFAULT_BASE_HALAQAHS;
    }
    return list;
  }, []);

  // Merged pool of all rankable employee users
  const allEmployees = useMemo<ActiveUser[]>(() => {
    let deletedIds = new Set<string>();
    let overrides: Record<string, string> = {};
    try {
      const savedDel = localStorage.getItem('noorworship_deleted_student_ids_prod_v1');
      if (savedDel) {
        const parsed = JSON.parse(savedDel);
        if (Array.isArray(parsed)) deletedIds = new Set(parsed);
      }
      const savedOv = localStorage.getItem('noorworship_user_halaqah_overrides_prod_v1');
      if (savedOv) {
        const parsedOv = JSON.parse(savedOv);
        if (parsedOv && typeof parsedOv === 'object') overrides = parsedOv;
      }
    } catch {}

    const map = new Map<string, ActiveUser>();

    // 1. Base employees
    BASE_EMPLOYEES_ROSTER.forEach((u) => {
      if (!deletedIds.has(u.id)) map.set(u.id, u);
    });

    // 2. Overlay registeredUsers (e.g. newly added by Dept HX or AuthScreen)
    if (registeredUsers && registeredUsers.length > 0) {
      registeredUsers.forEach((u) => {
        if (u.role === 'member' && !LEGACY_DEMO_IDS.has(u.id) && !deletedIds.has(u.id)) {
          const effectiveHalaqah = overrides[u.id] !== undefined ? overrides[u.id] : u.halaqah;
          map.set(u.id, { ...(map.get(u.id) || {}), ...u, halaqah: effectiveHalaqah });
        }
      });
    }

    // 3. Overlay Firestore live users
    liveUsers.forEach((u) => {
      if (u.role === 'member' && !LEGACY_DEMO_IDS.has(u.id) && !deletedIds.has(u.id)) {
        const effectiveHalaqah = overrides[u.id] !== undefined ? overrides[u.id] : u.halaqah;
        map.set(u.id, { ...(map.get(u.id) || {}), ...u, halaqah: effectiveHalaqah });
      }
    });

    // 4. Ensure activeUser's live XP and streak are always reflected immediately
    if (activeUser && activeUser.role === 'member' && !LEGACY_DEMO_IDS.has(activeUser.id) && !deletedIds.has(activeUser.id)) {
      const effectiveHalaqah = overrides[activeUser.id] !== undefined ? overrides[activeUser.id] : activeUser.halaqah;
      map.set(activeUser.id, {
        ...(map.get(activeUser.id) || {}),
        ...activeUser,
        halaqah: effectiveHalaqah,
        totalXp: userXp,
        streakDays: userStreak
      });
    }

    return Array.from(map.values());
  }, [liveUsers, registeredUsers, activeUser, userXp, userStreak]);

  // Unique list of halaqah names found in halaqahDetailsList + allEmployees
  const allHalaqahNames = useMemo<string[]>(() => {
    let deletedNames: string[] = [];
    try {
      const savedDel = localStorage.getItem('noorworship_deleted_halaqah_names_prod_v1');
      if (savedDel) {
        const parsedDel = JSON.parse(savedDel);
        if (Array.isArray(parsedDel)) deletedNames = parsedDel.map((d: string) => d.trim().toLowerCase());
      }
    } catch {}

    const isInvalid = (name?: string) => {
      if (!name) return true;
      const clean = name.trim();
      return (
        !clean ||
        clean === 'Dept HX Pusat' ||
        clean === 'Tanpa Halaqah' ||
        clean === 'Belum Ada Halaqah' ||
        deletedNames.includes(clean.toLowerCase())
      );
    };

    const names = new Set<string>();
    halaqahDetailsList.forEach((h) => {
      if (!isInvalid(h.name)) names.add(h.name);
    });
    allEmployees.forEach((u) => {
      if (u.halaqah && !isInvalid(u.halaqah)) names.add(u.halaqah);
    });
    return Array.from(names);
  }, [halaqahDetailsList, allEmployees]);

  // Helper to get formatted ranked leaderboard list for a given set of users
  const formatLeaderboardUsers = (users: ActiveUser[]): LeaderboardUser[] => {
    return [...users]
      .sort((a, b) => {
        const xpDiff = (b.totalXp || 0) - (a.totalXp || 0);
        if (xpDiff !== 0) return xpDiff;
        const streakDiff = (b.streakDays || 0) - (a.streakDays || 0);
        if (streakDiff !== 0) return streakDiff;
        return (a.name || '').localeCompare(b.name || '', 'id');
      })
      .map((u, index) => ({
        rank: index + 1,
        name: u.name,
        xp: u.totalXp || 0,
        streak: u.streakDays || 0,
        avatar: u.avatar || 'https://lh3.googleusercontent.com/aida-public/AB6AXuDD9rhoZ_oKw2kaX_ib087jl58ZWxEyxXJe-f4-lkyam50XjJD1y4vmoJo_OP09N6wOgiWdvpNv5yr2G5JpuvLbm3TjeqXW0MHbuS6TtuFe6htOFVs18a00iBznKV3vany3LAk28L6AP7NVZ7sHf96ricgJ9NAjW7IvzR3eOOx6e1jpn11EVj5B7ar7C5WcI3CuYTneLk3RmV3-rVsJ7YE27-9cIjSlc_qil1T1R8WayBovHjw6vbVCog',
        isCurrentUser: u.id === activeUser?.id,
        tajweedAcc: (u.totalXp || 0) > 0 ? Math.min(99, Math.max(86, Math.floor(90 + ((u.totalXp || 0) % 9)))) : 0,
        badge: index === 0 ? 'Peringkat 1' : index === 1 ? 'Peringkat 2' : index === 2 ? 'Peringkat 3' : 'Karyawan',
        roleOrCircle: u.halaqah
      }));
  };

  // National / Global ranking (accumulated from all employees across all halaqahs)
  const nationalLeaderboard = useMemo<LeaderboardUser[]>(() => {
    return formatLeaderboardUsers(allEmployees);
  }, [allEmployees, activeUser?.id]);

  // Halaqah-specific ranking for current view
  // If Dept HX & specific halaqah chosen: use that. If member: use activeUser's halaqah
  const activeHalaqahTarget = isDeptHX
    ? (selectedHalaqahFilter === 'all' ? (allHalaqahNames[0] || 'Halaqah Al-Fajr') : selectedHalaqahFilter)
    : (activeUser?.halaqah || 'Halaqah Al-Fajr');

  const singleHalaqahLeaderboard = useMemo<LeaderboardUser[]>(() => {
    const targetLower = (activeHalaqahTarget || '').trim().toLowerCase();
    const halaqahMembers = allEmployees.filter(
      (u) => (u.halaqah || '').trim().toLowerCase() === targetLower
    );
    return formatLeaderboardUsers(halaqahMembers);
  }, [allEmployees, activeHalaqahTarget, activeUser?.id]);

  // Current active list for podium display
  const currentList = scope === 'global' ? nationalLeaderboard : singleHalaqahLeaderboard;
  const top1 = currentList[0];
  const top2 = currentList[1];
  const top3 = currentList[2];
  const remainingReciters = currentList.slice(3);

  // Per-halaqah breakdown for Dept HX when in "all" mode
  const halaqahBreakdowns = useMemo(() => {
    return allHalaqahNames.map((name) => {
      const detail = halaqahDetailsList.find((h) => h.name === name);
      const members = allEmployees.filter((u) => u.halaqah === name);
      const ranked = formatLeaderboardUsers(members);
      const totalXp = members.reduce((sum, u) => sum + (u.totalXp || 0), 0);
      const avgAcc = members.length > 0
        ? Math.round(ranked.reduce((sum, r) => sum + r.tajweedAcc, 0) / members.length)
        : 0;

      return {
        name,
        code: detail?.code || 'HF-DIR',
        supervisor: formatSupervisorDisplayName(detail?.supervisor) || 'Ustadz/ah Pembina',
        dept: detail?.dept || 'Dept Operasional',
        memberCount: members.length,
        totalXp,
        avgAcc,
        rankedList: ranked
      };
    });
  }, [allHalaqahNames, halaqahDetailsList, allEmployees]);

  return (
    <div className="flex flex-col w-full px-4 md:px-6 py-4 space-y-5 max-w-4xl mx-auto pb-28">
      {/* Sub-header & Motivational Greeting */}
      <div className="flex items-start sm:items-center justify-between gap-2 sm:gap-4 pt-1">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 min-w-0">
            <span
              className="material-symbols-outlined text-[#775a19] text-[18px] sm:text-[20px] shrink-0"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              stars
            </span>
            <h2 className="text-[15px] sm:text-xl font-bold text-[#012d1d] tracking-tight leading-snug truncate">
              Papan Peringkat Karyawan
            </h2>
          </div>
          <p className="text-[11px] sm:text-xs text-[#414844] mt-0.5 leading-snug">
            Berlomba-lomba dalam amal kebaikan (Fastabiqul Khairat)
          </p>
        </div>

        {/* Mini Timer Chip */}
        <div className="flex items-center gap-1 bg-[#e9edff] px-2 sm:px-3 py-1 rounded-full shadow-sm shrink-0 whitespace-nowrap">
          <span className="material-symbols-outlined text-[13px] sm:text-[15px] text-[#775a19] shrink-0">schedule</span>
          <span className="text-[10px] sm:text-xs text-[#141b2b] font-semibold">Reset Ahad</span>
        </div>
      </div>

      {/* Floating Active User Sticky Ranking Card or Supervisor Monitoring Banner (Placed directly below 'berlomba-lomba' and above Scope Buttons) */}
      {isDeptHX || activeUser?.role === 'admin' ? (
        <div className="w-full bg-[#012d1d] text-white rounded-2xl p-3.5 sm:p-4 flex items-start sm:items-center justify-between gap-2.5 sm:gap-3 border border-[#c1ecd4]/30 shadow-sm overflow-hidden">
          <div className="flex items-start sm:items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-[#fed488] text-[#785a1a] flex items-center justify-center font-bold shadow-xs shrink-0">
              <span className="material-symbols-outlined text-[18px] sm:text-[20px]">admin_panel_settings</span>
            </div>
            <div className="min-w-0 flex-1">
              <h4 className="text-xs sm:text-sm font-bold text-white flex items-center flex-wrap gap-1.5">
                <span className="whitespace-nowrap">Mode Monitoring {activeUser?.role === 'admin' ? getUstadzTitle(activeUser) : 'Dept HX'}</span>
                <span className="text-[10px] bg-[#c1ecd4] text-[#002114] px-2 py-0.5 rounded-full font-bold whitespace-nowrap">
                  {scope === 'group' ? 'Monitoring Per Halaqah' : 'Monitoring Akumulasi Nasional'}
                </span>
              </h4>
              <p className="text-[11px] text-[#c1ecd4]/90 mt-1 sm:mt-0.5 leading-snug">
                {isDeptHX
                  ? scope === 'group'
                    ? 'Memantau kompetisi sehat antar santri di tiap kelompok halaqah binaan secara terpisah.'
                    : 'Memantau klasemen agregat seluruh karyawan secara nasional lintas seluruh halaqah.'
                  : `Akun ${getUstadzTitle(activeUser)} berfungsi memantau. Poin & peringkat sepenuhnya milik santri/karyawan.`}
              </p>
            </div>
          </div>
          <span className="text-xs font-bold text-[#fed488] shrink-0 bg-white/10 px-3 py-1 rounded-full border border-white/20 hidden md:inline-block whitespace-nowrap">
            Pengawas Klasemen
          </span>
        </div>
      ) : (
        <div className="w-full bg-[#f1f3ff] rounded-2xl p-3 sm:p-4 flex items-center justify-between gap-2.5 sm:gap-3 border-2 border-[#1b4332]/20 shadow-sm overflow-hidden">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
            <div className="flex flex-col items-center justify-center w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-[#1b4332] text-white font-bold text-[11px] sm:text-xs shrink-0 shadow-sm">
              #{currentList.findIndex((u) => u.isCurrentUser) >= 0 ? currentList.findIndex((u) => u.isCurrentUser) + 1 : '-'}
            </div>
            <PremiumInitialAvatar
              name={activeUser?.name || 'Karyawan'}
              role={activeUser?.role}
              className="w-9 h-9 sm:w-11 sm:h-11 rounded-full shrink-0 ring-2 ring-[#1b4332]/20 shadow-sm"
            />
            <div className="min-w-0 flex-1">
              <h4 className="text-xs sm:text-sm font-bold text-[#141b2b] truncate">{activeUser?.name}</h4>
              <span className="text-[10px] text-[#00452c] font-semibold block truncate">{activeUser?.halaqah}</span>
            </div>
          </div>

          {/* XP Stats Block */}
          <div className="text-right shrink-0">
            <div className="text-sm sm:text-base font-bold text-[#012d1d] tabular-nums">
              {userXp.toLocaleString()} <span className="text-[11px] sm:text-xs text-[#414844] font-normal">XP</span>
            </div>
            <div className="flex items-center justify-end gap-0.5 text-[11px] sm:text-xs text-[#00452c] font-semibold whitespace-nowrap">
              <span className="material-symbols-outlined text-[13px] sm:text-[14px]">arrow_upward</span>
              <span>Peringkat Aktif</span>
            </div>
          </div>
        </div>
      )}

      {/* Scope Segmented Control */}
      <div className="w-full bg-[#e1e8fd] p-1 rounded-full flex relative select-none">
        <button
          onClick={() => {
            setScope('group');
            if (isDeptHX) {
              onShowToast('Beralih ke Menu HX Pusat: Klasemen Terpisah Per Halaqah');
            } else {
              onShowToast(`Beralih ke peringkat ${activeUser?.halaqah || 'Halaqah Al-Fajr'}`);
            }
          }}
          className={`flex-1 py-2 px-3 rounded-full flex items-center justify-center gap-1.5 text-xs font-bold transition-all duration-300 cursor-pointer ${
            scope === 'group'
              ? 'bg-white text-[#012d1d] shadow-sm'
              : 'text-[#414844] hover:text-[#012d1d]'
          }`}
        >
          <span className="material-symbols-outlined text-[17px]">
            {isDeptHX ? 'corporate_fare' : 'group'}
          </span>
          <span>
            {isDeptHX ? 'HX Pusat (Per Halaqah)' : (activeUser?.halaqah || 'Halaqah Saya')}
          </span>
        </button>

        <button
          onClick={() => {
            setScope('global');
            onShowToast(
              isDeptHX
                ? 'Beralih ke Peringkat Nasional (Akumulasi Seluruh Karyawan)'
                : 'Beralih ke peringkat nasional & global'
            );
          }}
          className={`flex-1 py-2 px-3 rounded-full flex items-center justify-center gap-1.5 text-xs font-bold transition-all duration-300 cursor-pointer ${
            scope === 'global'
              ? 'bg-white text-[#012d1d] shadow-sm'
              : 'text-[#414844] hover:text-[#012d1d]'
          }`}
        >
          <span className="material-symbols-outlined text-[17px]">public</span>
          <span>
            {isDeptHX ? 'Nasional (Seluruh Karyawan)' : 'Nasional & Global'}
          </span>
        </button>
      </div>

      {/* SPECIAL DEPT HX FILTER BAR FOR PER-HALAQAH VIEW (Placed under Scope Buttons) */}
      {isDeptHX && scope === 'group' && (
        <div className="w-full bg-white rounded-2xl p-3 sm:p-3.5 border border-[#1b4332]/10 shadow-sm space-y-2.5 overflow-hidden">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 text-xs font-bold text-[#012d1d] min-w-0 flex-1">
              <span className="material-symbols-outlined text-[18px] text-[#00452c] shrink-0">hub</span>
              <span className="leading-snug">Pilih Tampilan Peringkat Halaqah Binaan</span>
            </div>
            <span className="text-[10px] bg-[#c1ecd4] text-[#002114] px-2 py-0.5 rounded-full font-bold shrink-0 whitespace-nowrap">
              {allHalaqahNames.length} Halaqah Aktif
            </span>
          </div>

          {/* Halaqah Filter Chips */}
          <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto pb-0.5 no-scrollbar">
            <button
              onClick={() => {
                setSelectedHalaqahFilter('all');
                onShowToast('Menampilkan peringkat setiap halaqah secara terpisah');
              }}
              className={`px-2.5 sm:px-3 py-1.5 rounded-xl text-[11px] sm:text-xs font-bold shrink-0 transition-all cursor-pointer inline-flex items-center gap-1.5 whitespace-nowrap ${
                selectedHalaqahFilter === 'all'
                  ? 'bg-[#012d1d] text-white shadow-sm'
                  : 'bg-[#f1f3ff] text-[#414844] hover:bg-[#e4e7ff]'
              }`}
            >
              <span className="material-symbols-outlined text-[15px] shrink-0">view_agenda</span>
              <span>Semua Halaqah (Terpisah)</span>
            </button>

            {allHalaqahNames.map((halName) => {
              const isSelected = selectedHalaqahFilter === halName;
              const count = allEmployees.filter((u) => u.halaqah === halName).length;
              return (
                <button
                  key={halName}
                  onClick={() => {
                    setSelectedHalaqahFilter(halName);
                    onShowToast(`Melihat peringkat internal ${halName}`);
                  }}
                  className={`px-2.5 sm:px-3 py-1.5 rounded-xl text-[11px] sm:text-xs font-bold shrink-0 transition-all cursor-pointer inline-flex items-center gap-1.5 whitespace-nowrap ${
                    isSelected
                      ? 'bg-[#012d1d] text-white shadow-sm'
                      : 'bg-[#f1f3ff] text-[#414844] hover:bg-[#e4e7ff]'
                  }`}
                >
                  <span>{halName}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full shrink-0 ${
                      isSelected ? 'bg-white/20 text-white' : 'bg-[#e1e8fd] text-[#141b2b]'
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* VIEW BRANCH 1: DEPT HX "ALL HALAQAHS" SEPARATED OVERVIEW */}
      {isDeptHX && scope === 'group' && selectedHalaqahFilter === 'all' ? (
        <div className="w-full space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-[#1b4332]/10">
            <div className="min-w-0 flex-1">
              <h3 className="text-sm sm:text-base font-bold text-[#012d1d] flex items-start sm:items-center gap-1.5 leading-snug">
                <span className="material-symbols-outlined text-[19px] sm:text-[20px] text-[#00452c] shrink-0 mt-0.5 sm:mt-0">format_list_bulleted</span>
                <span>Peringkat Setiap Halaqah (Terpisah Antar Halaqah)</span>
              </h3>
              <p className="text-[11px] sm:text-xs text-[#414844] mt-0.5 leading-snug">
                Masing-masing halaqah memiliki klasemen internal sendiri berdasarkan total XP anggota.
              </p>
            </div>
            <span className="text-[11px] sm:text-xs font-semibold text-[#00452c] bg-[#c1ecd4]/70 px-3 py-1 rounded-full shrink-0 whitespace-nowrap self-start sm:self-auto">
              {halaqahBreakdowns.length} Kelompok Terdata
            </span>
          </div>

          {/* Group Cards List: Each Halaqah Rendered Separately */}
          <div className="flex flex-col space-y-5">
            {halaqahBreakdowns.map((hGroup) => (
              <div
                key={hGroup.name}
                className="w-full bg-white rounded-2xl border border-[#1b4332]/10 shadow-sm overflow-hidden transition-all hover:border-[#1b4332]/25"
              >
                {/* Halaqah Card Header */}
                <div className="bg-gradient-to-r from-[#012d1d] to-[#1b4332] text-white p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-start sm:items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
                    <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-white/10 flex items-center justify-center text-[#fed488] shrink-0 border border-white/15 mt-0.5 sm:mt-0">
                      <span className="material-symbols-outlined text-[20px] sm:text-[22px]">mosque</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center flex-wrap gap-1.5 sm:gap-2">
                        <h4 className="text-sm sm:text-base font-bold text-white leading-snug">{hGroup.name}</h4>
                        <span className="px-2 py-0.5 bg-[#fed488] text-[#785a1a] text-[10px] font-bold rounded-full shrink-0 whitespace-nowrap">
                          {hGroup.code}
                        </span>
                      </div>
                      <p className="text-[11px] sm:text-xs text-[#c1ecd4] mt-1 flex items-center flex-wrap gap-x-1.5 gap-y-0.5 leading-snug">
                        <span>Pembimbing: {hGroup.supervisor}</span>
                        <span className="opacity-60">•</span>
                        <span>{hGroup.dept}</span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-2.5 w-full sm:w-auto pt-2.5 sm:pt-0 border-t border-white/10 sm:border-t-0 shrink-0">
                    <div className="text-left sm:text-right min-w-0">
                      <div className="text-sm font-bold text-[#fed488] tabular-nums leading-tight">
                        {hGroup.totalXp.toLocaleString()} XP
                      </div>
                      <div className="text-[10px] sm:text-[11px] text-[#c1ecd4] leading-snug mt-0.5 flex items-center sm:justify-end gap-1">
                        <span>{hGroup.memberCount} Anggota •</span>
                        <span className="inline-flex items-center gap-0.5 opacity-85">
                          <span className="material-symbols-outlined text-[11px]">lock</span>
                          Tilawah Dikunci
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setSelectedHalaqahFilter(hGroup.name);
                        onShowToast(`Membuka fokus podium ${hGroup.name}`);
                      }}
                      className="px-3 py-1.5 rounded-full bg-white/15 hover:bg-white/25 text-white text-xs font-bold transition-all inline-flex items-center gap-1 cursor-pointer shrink-0 whitespace-nowrap"
                    >
                      <span className="material-symbols-outlined text-[15px] shrink-0">podium</span>
                      <span>Fokus</span>
                    </button>
                  </div>
                </div>

                {/* Halaqah Internal Leaderboard Members List */}
                <div className="p-3.5 space-y-2">
                  {hGroup.rankedList.length === 0 ? (
                    <div className="text-center py-6 text-xs text-[#717973]">
                      Belum ada santri terdaftar di halaqah ini.
                    </div>
                  ) : (
                    hGroup.rankedList.map((user, idx) => (
                      <div
                        key={user.name + idx}
                        onClick={() => setSelectedLeaderboardUser(user)}
                        className={`w-full rounded-xl p-3 flex items-center justify-between gap-3 transition-all cursor-pointer ${
                          idx === 0
                            ? 'bg-[#fef9ee] border border-[#fed488]/60 hover:border-[#fed488]'
                            : idx === 1
                            ? 'bg-[#f8f9fc] border border-[#dce2f7] hover:border-[#012d1d]/30'
                            : idx === 2
                            ? 'bg-[#fffbf5] border border-[#ffdea5]/40 hover:border-[#ffdea5]'
                            : 'bg-white hover:bg-[#f9f9ff] border border-gray-100'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          {/* Rank Icon / Badge */}
                          <div className="w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
                            {idx === 0 ? (
                              <span className="w-full h-full rounded-full bg-[#fed488] text-[#785a1a] flex items-center justify-center">
                                🥇
                              </span>
                            ) : idx === 1 ? (
                              <span className="w-full h-full rounded-full bg-[#dce2f7] text-[#141b2b] flex items-center justify-center">
                                🥈
                              </span>
                            ) : idx === 2 ? (
                              <span className="w-full h-full rounded-full bg-[#e9c176] text-[#261900] flex items-center justify-center">
                                🥉
                              </span>
                            ) : (
                              <span className="text-xs font-semibold text-[#414844]">
                                #{user.rank}
                              </span>
                            )}
                          </div>

                          <PremiumInitialAvatar
                            name={user.name}
                            className="w-9 h-9 rounded-full shrink-0 shadow-xs"
                          />

                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs sm:text-sm font-bold text-[#141b2b] truncate">
                                {user.name}
                              </span>
                              {idx === 0 && (
                                <span className="text-[9px] font-bold bg-[#fed488] text-[#785a1a] px-1.5 py-0.2 rounded-full">
                                  Juara 1 Halaqah
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 mt-0.5 text-xs text-[#414844]">
                              <span className="text-[10px] text-[#00452c] font-semibold flex items-center gap-0.5">
                                <span className="material-symbols-outlined text-[13px]">local_fire_department</span>
                                {user.streak} hari
                              </span>
                              <span className="text-[10px] bg-[#f1f3ff] px-1.5 py-0.2 rounded-full text-[#717973] inline-flex items-center gap-0.5">
                                <span className="material-symbols-outlined text-[11px]">lock</span>
                                Tilawah Dikunci
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* XP Stats */}
                        <div className="text-right shrink-0">
                          <div className="text-sm font-bold text-[#012d1d]">
                            {user.xp.toLocaleString()}
                          </div>
                          <div className="text-[9px] text-[#717973] uppercase font-semibold">XP</div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        /* VIEW BRANCH 2: PODIUM + RANKING LIST (For Single Halaqah OR National Global) */
        <div className="w-full space-y-5">
          {/* Active Scope Label Info */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div className="flex items-start sm:items-center gap-2 min-w-0 flex-1">
              <span className="material-symbols-outlined text-[#00452c] text-[20px] shrink-0 mt-0.5 sm:mt-0">
                {scope === 'global' ? 'public' : 'workspace_premium'}
              </span>
              <div className="min-w-0 flex-1">
                <h3 className="text-sm font-bold text-[#141b2b] leading-snug">
                  {scope === 'global'
                    ? 'Klasemen Nasional (Akumulasi Seluruh Karyawan)'
                    : `Klasemen Internal: ${activeHalaqahTarget}`}
                </h3>
                <p className="text-[11px] text-[#717973] leading-snug mt-0.5">
                  {scope === 'global'
                    ? `Menampilkan total ${nationalLeaderboard.length} karyawan terakumulasi dari seluruh halaqah se-Indonesia`
                    : `Menampilkan ${singleHalaqahLeaderboard.length} santri aktif terdaftar pada ${activeHalaqahTarget}`}
                </p>
              </div>
            </div>

            {isDeptHX && scope === 'group' && selectedHalaqahFilter !== 'all' && (
              <button
                onClick={() => {
                  setSelectedHalaqahFilter('all');
                  onShowToast('Kembali ke tampilan semua halaqah terpisah');
                }}
                className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-full bg-[#e9edff] hover:bg-[#dce2f7] text-[#012d1d] border border-[#1b4332]/15 text-xs font-bold transition-all cursor-pointer shrink-0 whitespace-nowrap self-start sm:self-auto shadow-2xs"
              >
                <span className="material-symbols-outlined text-[15px] shrink-0">arrow_back</span>
                <span>Lihat Semua Halaqah</span>
              </button>
            )}
          </div>

          {/* Top 3 Podium Showcase Card */}
          <div className="w-full bg-gradient-to-b from-[#1b4332] via-[#1b4332] to-[#012d1d] text-white rounded-2xl p-3.5 sm:p-5 shadow-md relative overflow-hidden">
            {/* Ambient Geometry */}
            <svg
              className="absolute -right-6 -bottom-6 w-40 h-40 opacity-10 text-white pointer-events-none"
              fill="currentColor"
              viewBox="0 0 100 100"
            >
              <circle cx="50" cy="50" fill="none" r="45" stroke="currentColor" strokeDasharray="6 6" strokeWidth="4" />
              <polygon points="50,15 61,38 86,41 68,59 73,85 50,72 27,85 32,59 14,41 39,38" />
            </svg>

            <div className="relative z-10 flex items-center justify-between flex-wrap gap-2 pb-4 sm:pb-3">
              <span className="text-[11px] sm:text-xs uppercase tracking-wider text-[#ffdea5] font-bold min-w-0 truncate">
                {scope === 'global'
                  ? 'Podium Nasional Pekan Ini'
                  : `Karyawan Terbaik: ${activeHalaqahTarget}`}
              </span>
              <span className="text-[10px] sm:text-xs bg-white/15 backdrop-blur-md px-2.5 py-0.5 rounded-full text-[#e9c176] font-medium shrink-0 whitespace-nowrap">
                {`Pekan ke-${Math.ceil(new Date().getDate() / 7)} • ${new Intl.DateTimeFormat('id-ID', {
                  month: 'short',
                  year: 'numeric'
                }).format(new Date())}`}
              </span>
            </div>

            {/* Podium Layout */}
            <div className="relative z-10 grid grid-cols-3 gap-1.5 sm:gap-2 items-end pt-4 sm:pt-3 pb-1 text-center">
              {/* 2nd Place */}
              {top2 ? (
                <div className="flex flex-col items-center min-w-0">
                  <div className="relative mb-2">
                    <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full p-0.5 bg-[#dce2f7]/70 shadow-sm flex items-center justify-center">
                      <PremiumInitialAvatar
                        name={top2.name}
                        className="w-full h-full rounded-full"
                      />
                    </div>
                    <span className="absolute -bottom-1 -right-1 w-5 h-5 bg-[#dce2f7] text-[#141b2b] text-[10px] sm:text-[11px] font-bold rounded-full flex items-center justify-center shadow">
                      2
                    </span>
                  </div>
                  <h4 className="text-[11px] sm:text-xs font-bold truncate max-w-full px-0.5 text-white">{top2.name}</h4>
                  <span className="text-[10px] text-[#ffdea5] font-semibold tabular-nums">
                    {top2.xp.toLocaleString()} XP
                  </span>
                  <span className="text-[9px] text-[#86af99] truncate max-w-full px-0.5">
                    {top2.roleOrCircle || '🔒 Tilawah Dikunci'}
                  </span>
                </div>
              ) : (
                <div className="opacity-40 text-[10px] text-center text-white py-4">- Posisi 2 -</div>
              )}

              {/* 1st Place */}
              {top1 ? (
                <div className="flex flex-col items-center -translate-y-1.5 sm:-translate-y-2 min-w-0">
                  <div className="relative mb-2">
                    {/* Crown Icon */}
                    <span
                      aria-hidden="true"
                      className="text-[#fed488] absolute -top-4 sm:-top-5 left-1/2 -translate-x-1/2 drop-shadow animate-bounce inline-flex items-center justify-center"
                    >
                      <svg
                        viewBox="0 0 24 24"
                        fill="currentColor"
                        className="w-[20px] h-[20px] sm:w-[24px] sm:h-[24px]"
                      >
                        <path d="M5 16L3 5l5.5 5L12 4l3.5 6L21 5l-2 11H5zm14 3c0 .6-.4 1-1 1H6c-.6 0-1-.4-1-1v-1h14v1z" />
                      </svg>
                    </span>
                    <div className="w-15 h-15 sm:w-18 sm:h-18 rounded-full p-1 bg-gradient-to-tr from-[#fed488] to-[#ffdea5] shadow-lg flex items-center justify-center ring-2 ring-[#fed488]/50">
                      <PremiumInitialAvatar
                        name={top1.name}
                        className="w-full h-full rounded-full"
                      />
                    </div>
                    <span className="absolute -bottom-1 -right-1 w-5 h-5 sm:w-6 sm:h-6 bg-[#fed488] text-[#785a1a] text-[11px] sm:text-xs font-bold rounded-full flex items-center justify-center shadow">
                      1
                    </span>
                  </div>
                  <h4 className="text-xs sm:text-sm font-bold truncate max-w-full px-0.5 text-[#ffdea5]">{top1.name}</h4>
                  <span className="text-[11px] sm:text-xs font-bold text-white tabular-nums">{top1.xp.toLocaleString()} XP</span>
                  <span className="text-[9.5px] sm:text-[10px] text-[#92f7c3] font-semibold truncate max-w-full px-0.5">
                    {top1.roleOrCircle || 'Peringkat Utama'}
                  </span>
                </div>
              ) : (
                <div className="opacity-40 text-[10px] text-center text-white py-4">- Posisi 1 -</div>
              )}

              {/* 3rd Place */}
              {top3 ? (
                <div className="flex flex-col items-center min-w-0">
                  <div className="relative mb-2">
                    <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full p-0.5 bg-[#fed488]/40 shadow-sm flex items-center justify-center">
                      <PremiumInitialAvatar
                        name={top3.name}
                        className="w-full h-full rounded-full"
                      />
                    </div>
                    <span className="absolute -bottom-1 -right-1 w-5 h-5 bg-[#e9c176] text-[#261900] text-[10px] sm:text-[11px] font-bold rounded-full flex items-center justify-center shadow">
                      3
                    </span>
                  </div>
                  <h4 className="text-[11px] sm:text-xs font-bold truncate max-w-full px-0.5 text-white">{top3.name}</h4>
                  <span className="text-[10px] text-[#ffdea5] font-semibold tabular-nums">
                    {top3.xp.toLocaleString()} XP
                  </span>
                  <span className="text-[9px] text-[#86af99] truncate max-w-full px-0.5">
                    {top3.roleOrCircle || '🔒 Tilawah Dikunci'}
                  </span>
                </div>
              ) : (
                <div className="opacity-40 text-[10px] text-center text-white py-4">- Posisi 3 -</div>
              )}
            </div>
          </div>

          {/* Gamification Achievement Badges Horizontal Carousel (Locked) */}
          <div className="w-full space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[#717973] text-[20px]">lock</span>
                <h3 className="text-sm font-bold text-[#141b2b]">Lencana Capaian Ibadah</h3>
              </div>
              <span className="inline-flex items-center gap-1 text-[11px] text-amber-900 bg-amber-100 px-2.5 py-0.5 rounded-full font-bold">
                <span className="material-symbols-outlined text-[13px]">lock</span>
                Dikunci Sementara
              </span>
            </div>

            <div className="flex gap-3 overflow-x-auto pb-1 -mx-4 px-4 no-scrollbar">
              {[
                {
                  title: 'Master Itqan',
                  desc: 'Lencana dikunci sementara selama fokus uji coba mutaba\'ah amalan.'
                },
                {
                  title: 'Penjaga Masjid',
                  desc: 'Lencana dikunci sementara selama fokus uji coba mutaba\'ah amalan.'
                },
                {
                  title: 'Pembelajar Tanggap',
                  desc: 'Lencana dikunci sementara selama fokus uji coba mutaba\'ah amalan.'
                }
              ].map((badgeItem) => (
                <div
                  key={badgeItem.title}
                  onClick={() =>
                    onShowToast('Fitur Lencana Capaian Ibadah sedang dikunci sementara 🔒')
                  }
                  className="min-w-[210px] bg-[#f1f3ff]/80 p-3.5 rounded-2xl flex items-start gap-3 shadow-xs border border-[#1b4332]/10 shrink-0 cursor-pointer opacity-80 select-none"
                >
                  <div className="w-10 h-10 rounded-full bg-[#dce2f7] flex items-center justify-center text-[#414844] shrink-0">
                    <span className="material-symbols-outlined text-[20px]">lock</span>
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-[#141b2b] truncate flex items-center gap-1">
                      <span>{badgeItem.title}</span>
                    </div>
                    <div className="text-[11px] text-[#717973] line-clamp-2 mt-0.5">
                      {badgeItem.desc}
                    </div>
                    <span className="inline-flex items-center gap-1 mt-1.5 px-2 py-0.5 rounded-full bg-white text-[10px] text-[#414844] font-bold border border-[#1b4332]/10">
                      <span className="material-symbols-outlined text-[11px]">lock</span>
                      Dikunci
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Remaining Reciters List */}
          <div className="w-full space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-[#141b2b]">
                {scope === 'group'
                  ? `Daftar Anggota Lainnya (${activeHalaqahTarget})`
                  : 'Seluruh Karyawan (Peringkat #4 ke Bawah)'}
              </span>
              <span className="text-xs text-[#414844]">
                {remainingReciters.length} Santri
              </span>
            </div>

            {/* Ranked Cards Collection */}
            <div className="flex flex-col space-y-2">
              {remainingReciters.length === 0 ? (
                <div className="text-center py-6 text-xs text-[#717973] bg-white rounded-2xl border border-[#1b4332]/5">
                  Semua anggota telah berada di podium utama.
                </div>
              ) : (
                remainingReciters.map((user) => (
                  <div
                    key={user.name + user.rank}
                    className="w-full bg-white rounded-2xl p-3.5 shadow-sm border border-[#1b4332]/5 flex items-center justify-between gap-3 select-none"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-xs font-bold text-[#414844] w-5 text-center shrink-0">
                        {user.rank}
                      </span>
                      <PremiumInitialAvatar
                        name={user.name}
                        className="w-10 h-10 rounded-full shrink-0 shadow-sm"
                      />
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs sm:text-sm font-bold text-[#141b2b] truncate">
                            {user.name}
                          </span>
                          {user.isCurrentUser && (
                            <span className="px-1.5 py-0.2 rounded-full bg-[#c1ecd4] text-[#002114] text-[9px] font-bold">
                              Anda
                            </span>
                          )}
                          {scope === 'global' && user.roleOrCircle && (
                            <span className="px-1.5 py-0.2 rounded-full bg-[#e9edff] text-[#141b2b] text-[9px] font-semibold truncate hidden sm:inline">
                              {user.roleOrCircle}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5 text-xs text-[#414844]">
                          <span className="px-1.5 py-0.2 bg-[#f1f3ff] rounded-full text-[10px] font-semibold text-[#717973] inline-flex items-center gap-0.5">
                            <span className="material-symbols-outlined text-[11px]">lock</span>
                            Tilawah Dikunci
                          </span>
                          <span className="text-[10px] text-[#00452c] font-semibold">
                            🔥 {user.streak} hari
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-sm font-bold text-[#141b2b]">
                        {user.xp.toLocaleString()}
                      </div>
                      <div className="text-[10px] text-[#717973] uppercase font-semibold">XP</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Encouraging Fastabiqul Khairat Quote */}
      <div className="w-full bg-[#f1f3ff] rounded-2xl p-4 flex items-center gap-3 border border-[#1b4332]/5">
        <div className="w-10 h-10 rounded-full bg-[#ffdea5]/50 flex items-center justify-center text-[#775a19] shrink-0">
          <span className="material-symbols-outlined text-[20px]">format_quote</span>
        </div>
        <div className="min-w-0">
          <p
            className="font-amiri text-lg text-[#012d1d] text-right leading-relaxed mb-0.5"
            dir="rtl"
          >
            فَاسْتَبِقُوا الْخَيْرَاتِ
          </p>
          <p className="text-xs text-[#414844]">
            &ldquo;Maka berlomba-lombalah kamu dalam kebaikan.&rdquo; (QS. Al-Baqarah: 148)
          </p>
        </div>
      </div>

      {/* Modal Detail Profil & Peringkat Karyawan */}
      {selectedLeaderboardUser && (
        <div
          onClick={() => setSelectedLeaderboardUser(null)}
          className="fixed inset-0 z-[65] bg-[#141b2b]/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md bg-white rounded-3xl p-5 sm:p-6 shadow-2xl border border-[#1b4332]/15 space-y-4 animate-in zoom-in-95 duration-150"
          >
            <div className="flex items-center justify-between pb-3 border-b border-[#f1f3ff]">
              <div>
                <span className="px-2.5 py-0.5 rounded-full bg-[#c1ecd4] text-[#002114] text-[10px] font-bold">
                  Peringkat #{selectedLeaderboardUser.rank} • {selectedLeaderboardUser.badge || 'Karyawan'}
                </span>
                <h3 className="text-base font-bold text-[#141b2b] mt-1">
                  Capaian Ibadah &amp; Tilawah
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedLeaderboardUser(null)}
                className="w-8 h-8 rounded-full bg-[#f1f3ff] hover:bg-[#e4e7ff] text-[#414844] flex items-center justify-center cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <div className="flex flex-col items-center text-center p-4 rounded-2xl bg-[#f9f9ff] border border-[#1b4332]/10 space-y-2">
              <div className="relative">
                <PremiumInitialAvatar
                  name={selectedLeaderboardUser.name}
                  className="w-20 h-20 rounded-full ring-4 ring-white shadow-md"
                />
                <span className="absolute -bottom-1 -right-1 px-2 py-0.5 rounded-full bg-[#012d1d] text-[#fed488] text-[11px] font-extrabold shadow">
                  #{selectedLeaderboardUser.rank}
                </span>
              </div>
              <div>
                <h4 className="text-base font-bold text-[#141b2b]">
                  {selectedLeaderboardUser.name}
                </h4>
                <p className="text-xs text-[#414844] mt-0.5">
                  {selectedLeaderboardUser.roleOrCircle || activeHalaqahTarget}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200">
                <span className="text-[10px] font-semibold text-emerald-800 uppercase block">Total XP</span>
                <span className="text-base font-extrabold text-emerald-950 tabular-nums">
                  {selectedLeaderboardUser.xp.toLocaleString()}
                </span>
              </div>
              <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200">
                <span className="text-[10px] font-semibold text-amber-800 uppercase block">Istiqamah</span>
                <span className="text-base font-extrabold text-amber-950">
                  {selectedLeaderboardUser.streak} Hari
                </span>
              </div>
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200">
                <span className="text-[10px] font-semibold text-slate-600 uppercase block">Tilawah</span>
                <span className="text-xs font-bold text-slate-600 inline-flex items-center justify-center gap-0.5 mt-1">
                  <span className="material-symbols-outlined text-[14px]">lock</span>
                  Dikunci
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setSelectedLeaderboardUser(null)}
              className="w-full py-2.5 rounded-2xl bg-[#012d1d] hover:bg-[#1b4332] text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
            >
              Tutup Profil
            </button>
          </div>
        </div>
      )}

      {/* Modal Detail Lencana Capaian Ibadah */}
      {selectedMilestone && (
        <div
          onClick={() => setSelectedMilestone(null)}
          className="fixed inset-0 z-[65] bg-[#141b2b]/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm bg-white rounded-3xl p-5 sm:p-6 shadow-2xl border border-[#1b4332]/15 space-y-4 animate-in zoom-in-95 duration-150"
          >
            <div className="flex items-center justify-between pb-3 border-b border-[#f1f3ff]">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-[#fed488]/40 text-[#775a19] flex items-center justify-center">
                  <span
                    className="material-symbols-outlined text-[22px]"
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    {selectedMilestone.icon}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-[#775a19] uppercase tracking-wider block">
                    Lencana Capaian Ibadah
                  </span>
                  <h3 className="text-base font-bold text-[#141b2b]">{selectedMilestone.title}</h3>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedMilestone(null)}
                className="w-8 h-8 rounded-full bg-[#f1f3ff] hover:bg-[#e4e7ff] text-[#414844] flex items-center justify-center cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <div className="p-3.5 rounded-2xl bg-[#f9f9ff] border border-[#1b4332]/10 space-y-2 text-xs text-[#414844] leading-relaxed">
              <div className="flex items-center justify-between">
                <span className="font-bold text-[#141b2b]">Apresiasi Poin:</span>
                <span className="px-2.5 py-0.5 rounded-full bg-[#c1ecd4] text-[#002114] font-bold">
                  {selectedMilestone.xp}
                </span>
              </div>
              <p>{selectedMilestone.desc}</p>
            </div>

            <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-200/60 text-[11px] text-amber-950">
              <strong className="block mb-0.5">💡 Tips Meraih Lencana:</strong>
              {selectedMilestone.tips}
            </div>

            <button
              type="button"
              onClick={() => setSelectedMilestone(null)}
              className="w-full py-2.5 rounded-2xl bg-[#012d1d] hover:bg-[#1b4332] text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
            >
              Mengerti
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
