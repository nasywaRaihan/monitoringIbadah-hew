import React, { useState, useEffect, useMemo, useRef } from 'react';
import { User } from 'firebase/auth';
import {
  collection,
  onSnapshot,
  doc,
  setDoc,
  deleteDoc,
  updateDoc,
  query,
  getDocs,
  where,
  Timestamp,
  arrayUnion,
  getDoc,
  writeBatch
} from 'firebase/firestore';
import {
  db,
  safeFirestoreWrite,
  isFirestoreQuotaExhausted,
  checkAndMarkQuotaExhausted
} from './services/firebase';
import {
  getDirectiveDurationMs,
  getDirectiveExpiresAtMs,
  isDirectiveCurrentlyActive,
  isDirectiveExpired
} from './services/directiveLifecycle';
import {
  getUstadzTitle,
  formatSupervisorDisplayName,
  inferUstadzGender
} from './services/ustadzTitle';
import {
  initAuth,
  googleSignIn,
  logout
} from './services/googleAuth';
import {
  findOrCreateSpreadsheet,
  logDailyTaskToSheets,
  logRecitationToSheets,
  syncRosterToSheets,
  appendRow,
  SpreadsheetInfo
} from './services/googleSheets';
import {
  INITIAL_DAILY_TASKS,
  ALL_RECITERS_DIRECTORY,
  BRAND_ASSETS,
  DEFAULT_IBADAH_DIRECTIVES,
  DEFAULT_HALAQAH_ROSTER,
  DEFAULT_ATTENDANCE_SESSIONS
} from './data/mockData';
import {
  TabType,
  DailyTask,
  DailyTaskCompletionRecord,
  ActiveUser,
  IbadahDirective,
  StudentTaskSubmission,
  HalaqahAttendanceSession
} from './types';
import { SplashScreen } from './components/SplashScreen';
import { AuthScreen } from './components/AuthScreen';
import { Header } from './components/Header';
import { WorshipScreen } from './components/WorshipScreen';
import { RecitationScreen } from './components/RecitationScreen';
import { LeaderboardScreen } from './components/LeaderboardScreen';
import AdminScreen from './components/AdminScreen';
import { HalaqahStudentsScreen } from './components/HalaqahStudentsScreen';
import { HQAdminScreen, DEFAULT_BASE_HALAQAHS } from './components/HQAdminScreen';
import { BottomNav } from './components/BottomNav';
import { NotificationsModal } from './components/NotificationsModal';
import { AuthModal } from './components/AuthModal';
import { GoogleSheetsModal } from './components/GoogleSheetsModal';
import { ImportedReciterRecord, downloadPerColumnCSV } from './services/csvExport';
import { DeptHXPasscodeModal } from './components/DeptHXPasscodeModal';
import {
  StandardAmalanHX,
  getStoredStandardAmalan,
  applyCloudStandardAmalan,
  serializeStandardAmalanForFirestore,
  findConflictingStandardAmalan,
  isFiveDailyFardhuPrayer
} from './services/amalanPaten';
import {
  recordDailyActivityStreak,
  evaluateStreakOnLoad,
  getLocalDateString,
  isCompletionValidForDate
} from './services/streakService';

export default function App() {
  // Splash & Authentication Lifecycle State
  const [isSplashVisible, setIsSplashVisible] = useState<boolean>(true);
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('noorworship_is_logged_in_prod_v1');
      return saved === 'true';
    } catch {
      return false;
    }
  });

  // Official Bootstrap Account for Departemen HX (Human Experience) (No dummy employees)
  const DEFAULT_USERS: ActiveUser[] = [
    {
      id: 'user-dept-hx',
      name: 'Departemen HX (Human Experience)',
      halaqah: 'Dept HX Pusat',
      halaqahCode: 'HX-HQ-01',
      passcode: 'hx2026',
      avatar: BRAND_ASSETS.currentUserAvatar,
      role: 'dept-hx',
      totalXp: 0,
      streakDays: 0,
      supervisor: 'Departemen HX (Human Experience)',
      assignedHalaqahBy: 'Dept HX',
      hxAssignmentId: 'HX-2026-HQ',
      hxStatus: 'Resmi Dept HX'
    }
  ];

  const normalizeDeptHXUser = (u: ActiveUser): ActiveUser => {
    if (!u) return u;
    const isDeptHXAccount =
      u.id === 'user-dept-hx' ||
      u.role === 'dept-hx' ||
      u.role === 'hq-admin' ||
      (u.name && u.name.toLowerCase().includes('direktorat dept hx'));
    const hasLegacySup =
      u.supervisor && u.supervisor.toLowerCase().includes('direktorat dept hx');
    const hasLegacyInitialBonus =
      (!u.activeDates || u.activeDates.length === 0) &&
      !u.lastActiveDate &&
      ((u.totalXp === 150 && u.streakDays === 1) || (u.totalXp === 50 && u.streakDays === 1));
    if (!isDeptHXAccount && !hasLegacySup && !hasLegacyInitialBonus) return u;
    return {
      ...u,
      name: isDeptHXAccount ? 'Departemen HX (Human Experience)' : u.name,
      supervisor:
        isDeptHXAccount || hasLegacySup
          ? 'Departemen HX (Human Experience)'
          : u.supervisor,
      ...(hasLegacyInitialBonus ? { totalXp: 0, streakDays: 0 } : {})
    };
  };

  const normalizePersonKey = (name?: string, role?: string): string => {
    const raw = (name || '').trim().replace(/\s+/g, ' ').toLowerCase();
    if (!raw) return '';
    if (role === 'admin') {
      const stripped = raw.replace(/^(ustadz\/ah|ustadzah|ustadz|ust\.?)\s+/i, '').trim();
      return `admin:${stripped || raw}`;
    }
    return `${role || 'member'}:${raw}`;
  };

  const mergeDailyCompletions = (
    a?: Record<string, Record<string, DailyTaskCompletionRecord>>,
    b?: Record<string, Record<string, DailyTaskCompletionRecord>>
  ): Record<string, Record<string, DailyTaskCompletionRecord>> | undefined => {
    if (!a && !b) return undefined;
    const allDates = Array.from(new Set([...Object.keys(a || {}), ...Object.keys(b || {})])).sort();
    // Retain up to the latest 10 days to keep Firestore document lightweight
    const recentDates = allDates.slice(-10);
    const merged: Record<string, Record<string, DailyTaskCompletionRecord>> = {};

    recentDates.forEach((dateKey) => {
      const mapA = a?.[dateKey] || {};
      const mapB = b?.[dateKey] || {};
      const taskKeys = new Set([...Object.keys(mapA), ...Object.keys(mapB)]);
      const dayMerged: Record<string, DailyTaskCompletionRecord> = {};
      taskKeys.forEach((taskId) => {
        const compA = isCompletionValidForDate(mapA[taskId], dateKey) ? mapA[taskId] : undefined;
        const compB = isCompletionValidForDate(mapB[taskId], dateKey) ? mapB[taskId] : undefined;
        if (compA && compB) {
          dayMerged[taskId] = {
            ...compA,
            ...compB,
            completed: true,
            xp: compB.xp !== undefined ? compB.xp : compA.xp,
            note: compB.note || compA.note,
            completedAt: compB.completedAt || compA.completedAt
          };
        } else if (compB) {
          dayMerged[taskId] = compB;
        } else if (compA) {
          dayMerged[taskId] = compA;
        }
      });
      if (Object.keys(dayMerged).length > 0) {
        merged[dateKey] = dayMerged;
      }
    });

    return Object.keys(merged).length > 0 ? merged : undefined;
  };

  const mergeTwoUserRecords = (
    primary: ActiveUser,
    secondary: ActiveUser,
    preferPrimaryXp = false
  ): ActiveUser => {
    const mergedCompletions = mergeDailyCompletions(
      secondary.dailyCompletions,
      primary.dailyCompletions
    );
    const mergedActiveDates = Array.from(
      new Set([...(secondary.activeDates || []), ...(primary.activeDates || [])])
    ).sort();
    const resolvedTotalXp = preferPrimaryXp
      ? typeof primary.totalXp === 'number'
        ? primary.totalXp
        : secondary.totalXp || 0
      : Math.max(primary.totalXp || 0, secondary.totalXp || 0);
    return {
      ...secondary,
      ...primary,
      totalXp: resolvedTotalXp,
      streakDays: Math.max(primary.streakDays || 0, secondary.streakDays || 0),
      longestStreak: Math.max(primary.longestStreak || 0, secondary.longestStreak || 0),
      lastActiveDate:
        (primary.lastActiveDate || '') >= (secondary.lastActiveDate || '')
          ? primary.lastActiveDate || secondary.lastActiveDate
          : secondary.lastActiveDate || primary.lastActiveDate,
      ...(mergedActiveDates.length > 0 ? { activeDates: mergedActiveDates } : {}),
      ...(mergedCompletions ? { dailyCompletions: mergedCompletions } : {})
    };
  };

  const deduplicateActiveUsers = (
    users: ActiveUser[]
  ): { unique: ActiveUser[]; duplicateIds: string[] } => {
    const byKey = new Map<string, ActiveUser>();
    const duplicateIds: string[] = [];

    users.forEach((rawUser) => {
      const u = normalizeDeptHXUser(rawUser);
      if (!u || !u.id) return;
      const key =
        u.role === 'dept-hx' || u.role === 'hq-admin'
          ? 'dept-hx'
          : normalizePersonKey(u.name, u.role);
      if (!key) return;

      const existing = byKey.get(key);
      if (!existing) {
        byKey.set(key, u);
        return;
      }

      if (existing.id === u.id) {
        byKey.set(key, mergeTwoUserRecords(u, existing));
        return;
      }

      const existingHasActiveHalaqah =
        existing.halaqah &&
        existing.halaqah !== 'Tanpa Halaqah' &&
        existing.halaqah !== 'Belum Ada Halaqah';
      const candidateHasActiveHalaqah =
        u.halaqah &&
        u.halaqah !== 'Tanpa Halaqah' &&
        u.halaqah !== 'Belum Ada Halaqah';

      if (candidateHasActiveHalaqah && !existingHasActiveHalaqah) {
        duplicateIds.push(existing.id);
        byKey.set(key, mergeTwoUserRecords(u, existing));
      } else if (
        candidateHasActiveHalaqah === existingHasActiveHalaqah &&
        (u.totalXp || 0) > (existing.totalXp || 0)
      ) {
        duplicateIds.push(existing.id);
        byKey.set(key, mergeTwoUserRecords(u, existing));
      } else {
        duplicateIds.push(u.id);
        byKey.set(key, mergeTwoUserRecords(existing, u));
      }
    });

    return { unique: Array.from(byKey.values()), duplicateIds };
  };

  const LEGACY_DEMO_USER_IDS = new Set([
    'user-zubair',
    'user-farhan',
    'user-tariq',
    'user-zayd',
    'user-bilal',
    'user-hamza',
    'user-luqman',
    'user-omar',
    'user-faris',
    'user-salman',
    'user-rayyan',
    'user-khalid'
  ]);

  const LEGACY_DEMO_SESSION_IDS = new Set(['att-session-1', 'att-session-2']);
  const LEGACY_DEMO_DIRECTIVE_IDS = new Set(['ibadah-1', 'ibadah-2', 'ibadah-3', 'ibadah-4']);

  // Helper to strip undefined fields so Firebase Firestore setDoc never rejects objects
  const sanitizeFirestoreData = <T,>(obj: T): T => JSON.parse(JSON.stringify(obj));

  const [registeredUsers, setRegisteredUsers] = useState<ActiveUser[]>(() => {
    try {
      const saved = localStorage.getItem('noorworship_registered_users_prod_v1');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const filtered = parsed.filter((u: ActiveUser) => !LEGACY_DEMO_USER_IDS.has(u.id));
          return deduplicateActiveUsers(filtered).unique;
        }
      }
    } catch (e) {
      console.warn('Could not load saved users from localStorage', e);
    }
    return DEFAULT_USERS;
  });

  const [activeUser, setActiveUser] = useState<ActiveUser>(() => {
    try {
      const saved = localStorage.getItem('noorworship_active_user_prod_v1');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.id && !LEGACY_DEMO_USER_IDS.has(parsed.id)) {
          return normalizeDeptHXUser(parsed);
        }
      }
    } catch (e) {
      console.warn('Could not load active user from localStorage', e);
    }
    return DEFAULT_USERS[0];
  });

  const [currentTab, setCurrentTab] = useState<TabType>(() => {
    if (activeUser?.role === 'admin') return 'admin';
    if (activeUser?.role === 'dept-hx' || activeUser?.role === 'hq-admin') return 'dept-hx';
    return 'worship';
  });

  const [tasks, setTasks] = useState<DailyTask[]>(() => {
    try {
      const saved = localStorage.getItem('noorworship_saved_tasks_v4') || localStorage.getItem('noorworship_saved_tasks_v3');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed
            .filter(
              (t: DailyTask) =>
                t.id !== 'task-4' &&
                !t.title.toLowerCase().includes('shalat zhuhur di masjid')
            )
            .map((t: DailyTask) => ({ ...t, completed: false }));
        }
      }
    } catch (e) {
      console.warn(e);
    }
    return INITIAL_DAILY_TASKS.map((t) => ({ ...t, completed: false }));
  });

  useEffect(() => {
    try {
      localStorage.setItem('noorworship_saved_tasks_v4', JSON.stringify(tasks));
      localStorage.setItem('noorworship_saved_tasks_v3', JSON.stringify(tasks));
    } catch (e) {
      console.warn(e);
    }
  }, [tasks]);

  const [ibadahDirectives, setIbadahDirectives] = useState<IbadahDirective[]>([]);

  const syncedUserIdsRef = useRef<Set<string>>(new Set());

  // Real-time listener for Firestore users (with circuit-breaker & single-pass sync to prevent write storms)
  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, 'users'),
      (snapshot) => {
        const firestoreUsers: ActiveUser[] = [];
        const firestoreIds = new Set<string>();
        snapshot.forEach((docSnap) => {
          if (LEGACY_DEMO_USER_IDS.has(docSnap.id)) {
            if (!isFirestoreQuotaExhausted() && !syncedUserIdsRef.current.has(`del:${docSnap.id}`)) {
              syncedUserIdsRef.current.add(`del:${docSnap.id}`);
              safeFirestoreWrite(() => deleteDoc(doc(db, 'users', docSnap.id)));
            }
            return;
          }
          firestoreIds.add(docSnap.id);
          syncedUserIdsRef.current.add(docSnap.id);
          firestoreUsers.push({ id: docSnap.id, ...docSnap.data() } as ActiveUser);
        });

        let deletedIdsSet = new Set<string>();
        try {
          const rawDel = localStorage.getItem('noorworship_deleted_student_ids_prod_v1');
          if (rawDel) {
            const parsedDel = JSON.parse(rawDel);
            if (Array.isArray(parsedDel)) deletedIdsSet = new Set(parsedDel);
          }
        } catch {}

        setRegisteredUsers((prev) => {
          const userMap = new Map<string, ActiveUser>();
          DEFAULT_USERS.forEach((u) => userMap.set(u.id, normalizeDeptHXUser(u)));
          prev
            .filter((u) => !LEGACY_DEMO_USER_IDS.has(u.id) && !deletedIdsSet.has(u.id))
            .forEach((u) => userMap.set(u.id, normalizeDeptHXUser(u)));
          firestoreUsers
            .filter((u) => !deletedIdsSet.has(u.id))
            .forEach((rawFsUser) => {
              const fsUser = normalizeDeptHXUser(rawFsUser);
              const prevUser = userMap.get(fsUser.id);
              userMap.set(fsUser.id, prevUser ? mergeTwoUserRecords(fsUser, prevUser, true) : fsUser);
            });
          const { unique, duplicateIds } = deduplicateActiveUsers(Array.from(userMap.values()));

          if (!snapshot.metadata.hasPendingWrites && !isFirestoreQuotaExhausted()) {
            // Purge duplicate user IDs from Firestore at most once per ID
            duplicateIds.forEach((dupId) => {
              if (firestoreIds.has(dupId) && !syncedUserIdsRef.current.has(`del:${dupId}`)) {
                syncedUserIdsRef.current.add(`del:${dupId}`);
                safeFirestoreWrite(() => deleteDoc(doc(db, 'users', dupId)));
              }
            });

            // Auto-sync any local user not yet saved in Firestore at most once per ID
            unique.forEach((u) => {
              if (
                !firestoreIds.has(u.id) &&
                !syncedUserIdsRef.current.has(u.id) &&
                !LEGACY_DEMO_USER_IDS.has(u.id) &&
                !deletedIdsSet.has(u.id)
              ) {
                syncedUserIdsRef.current.add(u.id);
                safeFirestoreWrite(() =>
                  setDoc(doc(db, 'users', u.id), sanitizeFirestoreData(u), { merge: true })
                );
              }
            });
          }

          return unique;
        });
      },
      (err) => {
        checkAndMarkQuotaExhausted(err);
      }
    );
    return () => unsub();
  }, []);

  // Halaqah Attendance Sessions (Ustadz & Dept HX unified real-time sync)
  const [attendanceSessions, setAttendanceSessions] = useState<HalaqahAttendanceSession[]>(() => {
    try {
      const saved = localStorage.getItem('noorworship_attendance_sessions_prod_v1');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {
      console.warn('Failed loading attendance sessions from localStorage', e);
    }
    return DEFAULT_ATTENDANCE_SESSIONS;
  });

  // Listen to Firestore 'halaqahAttendanceSessions' collection in real-time
  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, 'halaqahAttendanceSessions'),
      (snap) => {
        const sessions: HalaqahAttendanceSession[] = [];
        snap.forEach((d) => {
          if (LEGACY_DEMO_SESSION_IDS.has(d.id)) {
            deleteDoc(doc(db, 'halaqahAttendanceSessions', d.id)).catch(() => {});
            return;
          }
          sessions.push({ id: d.id, ...d.data() } as HalaqahAttendanceSession);
        });
        sessions.sort((a, b) => new Date(b.createdAt || b.date).getTime() - new Date(a.createdAt || a.date).getTime());
        setAttendanceSessions(sessions);
        try {
          localStorage.setItem('noorworship_attendance_sessions_prod_v1', JSON.stringify(sessions));
        } catch (e) {}
      },
      (err) => {
        console.warn('Firestore attendanceSessions snapshot listener error (fallback to local):', err);
      }
    );

    return () => unsub();
  }, []);

  const getAttendanceMemberXp = (m?: { status?: string; xpAwarded?: number }): number => {
    if (!m) return 0;
    if (m.status === 'hadir') {
      return typeof m.xpAwarded === 'number' ? m.xpAwarded : 15;
    }
    return 0;
  };

  const findMatchingAttendanceMember = (
    members: HalaqahAttendanceSession['members'] | undefined,
    user: ActiveUser
  ) => {
    if (!members || members.length === 0) return undefined;
    const userPersonKey = normalizePersonKey(user.name, 'member');
    return members.find(
      (m) =>
        m.userId === user.id ||
        (userPersonKey && normalizePersonKey(m.userName, 'member') === userPersonKey)
    );
  };

  const handleSaveAttendanceSession = async (session: HalaqahAttendanceSession) => {
    const previousSession = attendanceSessions.find((s) => s.id === session.id);

    // 1. Update state & localStorage immediately
    setAttendanceSessions((prev) => {
      const existingIdx = prev.findIndex((s) => s.id === session.id);
      let updated: HalaqahAttendanceSession[];
      if (existingIdx >= 0) {
        updated = [...prev];
        updated[existingIdx] = session;
      } else {
        updated = [session, ...prev];
      }
      try {
        localStorage.setItem('noorworship_attendance_sessions_prod_v1', JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });

    // 2. Persist to Firestore
    try {
      const sanitizedSession = JSON.parse(JSON.stringify(session));
      await safeFirestoreWrite(
        () =>
          setDoc(
            doc(db, 'halaqahAttendanceSessions', session.id),
            {
              ...sanitizedSession,
              syncedWithHX: true,
              updatedAt: new Date().toISOString()
            },
            { merge: true }
          ),
        { force: true }
      );
    } catch (e) {
      console.error('Error saving attendance session to Firestore:', e);
    }

    // 3. Calculate XP delta per member (handles both new session & editing an existing session)
    const computeAdjustedUsers = (usersList: ActiveUser[]) => {
      const updates: Array<{ userId: string; newXp: number }> = [];
      const updatedUsers = usersList.map((u) => {
        if (u.role !== 'member') return u;
        const oldMember = findMatchingAttendanceMember(previousSession?.members, u);
        const newMember = findMatchingAttendanceMember(session.members, u);
        const oldXp = getAttendanceMemberXp(oldMember);
        const newXpAward = getAttendanceMemberXp(newMember);
        const deltaXp = newXpAward - oldXp;

        if (deltaXp !== 0) {
          const newXp = Math.max(0, Math.round(((u.totalXp || 0) + deltaXp) * 100) / 100);
          updates.push({ userId: u.id, newXp });
          return { ...u, totalXp: newXp };
        }
        return u;
      });
      return { updatedUsers, updates };
    };

    const { updates: xpUpdatesToSync } = computeAdjustedUsers(registeredUsers);

    setRegisteredUsers((prev) => {
      const { updatedUsers } = computeAdjustedUsers(prev);
      try {
        localStorage.setItem('noorworship_registered_users_prod_v1', JSON.stringify(updatedUsers));
      } catch {}
      return updatedUsers;
    });

    for (const upd of xpUpdatesToSync) {
      safeFirestoreWrite(
        () => setDoc(doc(db, 'users', upd.userId), { totalXp: upd.newXp }, { merge: true }),
        { force: true }
      );
      if (activeUser?.id === upd.userId) {
        setTotalXp(upd.newXp);
        setActiveUser((curr) => (curr.id === upd.userId ? { ...curr, totalXp: upd.newXp } : curr));
      }
    }

    showToast(`Presensi ${session.halaqahName} berhasil disimpan & disinkronkan ke Dept HX!`);
  };

  const handleDeleteAttendanceSession = async (sessionId: string) => {
    const targetSession = attendanceSessions.find((s) => s.id === sessionId);

    // 1. Update attendanceSessions state & localStorage
    setAttendanceSessions((prev) => {
      const updated = prev.filter((s) => s.id !== sessionId);
      try {
        localStorage.setItem('noorworship_attendance_sessions_prod_v1', JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });

    // 2. Deduct XP from members who earned XP in the deleted session
    const hadirCountInSession =
      targetSession?.members?.filter((m) => getAttendanceMemberXp(m) > 0).length || 0;
    let deductedCount = 0;

    if (targetSession && targetSession.members && targetSession.members.length > 0) {
      const computeDeductedUsers = (usersList: ActiveUser[]) => {
        const deductions: Array<{ userId: string; newXp: number }> = [];
        const updatedUsers = usersList.map((u) => {
          if (u.role !== 'member') return u;
          const matchedMember = findMatchingAttendanceMember(targetSession.members, u);
          const xpToDeduct = getAttendanceMemberXp(matchedMember);

          if (xpToDeduct > 0) {
            const newXp = Math.max(0, Math.round(((u.totalXp || 0) - xpToDeduct) * 100) / 100);
            deductions.push({ userId: u.id, newXp });
            return { ...u, totalXp: newXp };
          }
          return u;
        });
        return { updatedUsers, deductions };
      };

      const { deductions: deductedUpdates } = computeDeductedUsers(registeredUsers);
      deductedCount = deductedUpdates.length;

      setRegisteredUsers((prev) => {
        const { updatedUsers } = computeDeductedUsers(prev);
        try {
          localStorage.setItem('noorworship_registered_users_prod_v1', JSON.stringify(updatedUsers));
        } catch {}
        return updatedUsers;
      });

      for (const upd of deductedUpdates) {
        safeFirestoreWrite(
          () => setDoc(doc(db, 'users', upd.userId), { totalXp: upd.newXp }, { merge: true }),
          { force: true }
        );
        if (activeUser?.id === upd.userId) {
          setTotalXp(upd.newXp);
          setActiveUser((curr) => (curr.id === upd.userId ? { ...curr, totalXp: upd.newXp } : curr));
        }
      }
    }

    // 3. Delete session document from Firestore
    try {
      await safeFirestoreWrite(
        () => deleteDoc(doc(db, 'halaqahAttendanceSessions', sessionId)),
        { force: true }
      );
      const countToDisplay = deductedCount || hadirCountInSession;
      showToast(
        countToDisplay > 0
          ? `Sesi presensi dihapus & poin XP (-15 XP) dari ${countToDisplay} anggota telah dikurangi.`
          : 'Sesi presensi berhasil dihapus.'
      );
    } catch (e) {
      console.error('Error deleting attendance session:', e);
      showToast('Gagal menghapus sesi presensi dari database.');
    }
  };

  // Real-time listener for Firestore directives
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'ibadahDirectives'), (snapshot) => {
      const directives: IbadahDirective[] = [];
      snapshot.forEach((docSnap) => {
        if (LEGACY_DEMO_DIRECTIVE_IDS.has(docSnap.id)) {
          deleteDoc(doc(db, 'ibadahDirectives', docSnap.id)).catch(() => {});
          return;
        }
        directives.push({ id: docSnap.id, ...docSnap.data() } as IbadahDirective);
      });
      setIbadahDirectives(directives);
    });
    return () => unsub();
  }, []);

  const [directiveClockMs, setDirectiveClockMs] = useState<number>(() => Date.now());
  const processedExpirationKeysRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const interval = setInterval(() => {
      setDirectiveClockMs(Date.now());
    }, 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  // Automatically deactivate expired non-recurring Yaumiyah (1d) / Usbu'iyah (7d) directives,
  // or roll forward recurring directives to their next period in Firestore.
  useEffect(() => {
    if (ibadahDirectives.length === 0) return;

    ibadahDirectives.forEach(async (d) => {
      if (d.status !== 'Aktif') return;
      if (!isDirectiveExpired(d, directiveClockMs)) return;

      const expiryKey = `${d.id}_${d.expiresAt || d.createdAt || ''}`;
      if (processedExpirationKeysRef.current.has(expiryKey)) return;
      processedExpirationKeysRef.current.add(expiryKey);

      try {
        if (d.isRecurring === true) {
          const durationMs = getDirectiveDurationMs(d);
          let nextExpMs = (getDirectiveExpiresAtMs(d) || directiveClockMs) + durationMs;
          while (nextExpMs <= directiveClockMs) {
            nextExpMs += durationMs;
          }

          await updateDoc(doc(db, 'ibadahDirectives', d.id), {
            expiresAt: new Date(nextExpMs).toISOString(),
            compliancePercent: 0,
            lastResetAt: new Date(directiveClockMs).toISOString()
          });

          const subSnap = await getDocs(collection(db, `ibadahDirectives/${d.id}/submissions`));
          for (const subDoc of subSnap.docs) {
            await updateDoc(subDoc.ref, {
              isCompleted: false,
              completedAt: '',
              notes: 'Periode baru dimulai otomatis'
            });
          }
        } else {
          await updateDoc(doc(db, 'ibadahDirectives', d.id), {
            status: 'Selesai',
            autoDeactivated: true,
            deactivatedAt: new Date(directiveClockMs).toISOString()
          });
        }
      } catch (e) {
        console.error('Error processing directive expiration:', e);
        processedExpirationKeysRef.current.delete(expiryKey);
      }
    });
  }, [ibadahDirectives, directiveClockMs]);

  // Listen for submissions for each directive to maintain compliance stats
  useEffect(() => {
    if (ibadahDirectives.length === 0) return;

    const unsubs = ibadahDirectives.map(directive => {
      return onSnapshot(collection(db, `ibadahDirectives/${directive.id}/submissions`), (subSnap) => {
        const submissions: StudentTaskSubmission[] = [];
        subSnap.forEach(d => {
          submissions.push(d.data() as StudentTaskSubmission);
        });

        setIbadahDirectives(prev => prev.map(d => {
          if (d.id === directive.id) {
            const completedCount = submissions.filter(s => s.isCompleted).length;
            const compliancePercent = Math.round((completedCount / (submissions.length || 1)) * 100);
            return { ...d, submissions, compliancePercent };
          }
          return d;
        }));
      });
    });

    return () => unsubs.forEach(u => u());
  }, [ibadahDirectives.map(d => d.id).join(',')]);

  // Helper to resolve merged completions for today (local calendar day only) across Firestore & localStorage
  const getEffectiveTodayCompletions = React.useCallback(
    (
      user?: ActiveUser,
      allUsers?: ActiveUser[],
      targetLocalTodayStr?: string
    ): Record<string, DailyTaskCompletionRecord> => {
      if (!user) return {};
      const localTodayStr = targetLocalTodayStr || getLocalDateString();
      const personKey = normalizePersonKey(user.name, user.role);

      const matchedInRegistry = (allUsers || []).find(
        (u) =>
          u.id === user.id ||
          (personKey && normalizePersonKey(u.name, u.role) === personKey)
      );

      const combined: Record<string, DailyTaskCompletionRecord> = {};
      const mergeIntoCombined = (map?: Record<string, DailyTaskCompletionRecord>) => {
        if (!map || typeof map !== 'object') return;
        Object.entries(map).forEach(([taskId, comp]) => {
          if (!isCompletionValidForDate(comp, localTodayStr)) return;
          const prev = combined[taskId];
          if (prev) {
            combined[taskId] = {
              ...prev,
              ...comp,
              completed: true,
              xp: comp.xp !== undefined ? comp.xp : prev.xp,
              note: comp.note || prev.note,
              completedAt: comp.completedAt || prev.completedAt
            };
          } else {
            combined[taskId] = comp;
          }
        });
      };

      // 1. Read from localStorage for localTodayStr only (never UTC date, which lags by 7h in WIB)
      const storageKeys = Array.from(
        new Set([
          `noorworship_completions_${user.id}_${localTodayStr}`,
          ...(matchedInRegistry
            ? [`noorworship_completions_${matchedInRegistry.id}_${localTodayStr}`]
            : []),
          ...(personKey ? [`noorworship_completions_${personKey}_${localTodayStr}`] : [])
        ])
      );

      storageKeys.forEach((key) => {
        try {
          const raw = localStorage.getItem(key);
          if (raw) {
            mergeIntoCombined(JSON.parse(raw));
          }
        } catch {}
      });

      // 2. Read from Firestore-synced user.dailyCompletions & matchedInRegistry.dailyCompletions for localTodayStr only
      mergeIntoCombined(user.dailyCompletions?.[localTodayStr]);
      mergeIntoCombined(matchedInRegistry?.dailyCompletions?.[localTodayStr]);

      return combined;
    },
    []
  );

  const backfilledCloudCompletionSignatureRef = useRef<string>('');
  const currentLocalTodayStr = getLocalDateString(new Date(directiveClockMs));

  // Keep activeUser and localStorage completions synchronized in real-time when Firestore users update or day rolls over
  useEffect(() => {
    if (!activeUser?.id) return;
    const personKey = normalizePersonKey(activeUser.name, activeUser.role);
    const matched = registeredUsers.find(
      (u) =>
        u.id === activeUser.id ||
        (personKey && normalizePersonKey(u.name, u.role) === personKey)
    );

    const localTodayStr = currentLocalTodayStr;
    const effectiveCompletions = getEffectiveTodayCompletions(
      activeUser,
      registeredUsers,
      localTodayStr
    );
    const hasEffectiveCompletions = Object.keys(effectiveCompletions).length > 0;

    try {
      const storageKeysToSync = Array.from(
        new Set([
          `noorworship_completions_${activeUser.id}_${localTodayStr}`,
          ...(matched ? [`noorworship_completions_${matched.id}_${localTodayStr}`] : []),
          ...(personKey ? [`noorworship_completions_${personKey}_${localTodayStr}`] : [])
        ])
      );
      if (hasEffectiveCompletions) {
        const serialized = JSON.stringify(effectiveCompletions);
        storageKeysToSync.forEach((k) => localStorage.setItem(k, serialized));
      } else {
        storageKeysToSync.forEach((k) => localStorage.removeItem(k));
      }
    } catch {}

    if (!matched) return;

    const mergedUser = mergeTwoUserRecords(matched, activeUser, true);
    const nextDailyCompletions = mergeDailyCompletions(
      mergedUser.dailyCompletions,
      hasEffectiveCompletions ? { [localTodayStr]: effectiveCompletions } : undefined
    );

    // Sync to Firestore if cloud record either lacks today's valid completions OR has stale/contaminated entries for today
    if (matched.role === 'member') {
      const cloudTodayRaw = matched.dailyCompletions?.[localTodayStr] || {};
      const cleanTodayMap = nextDailyCompletions?.[localTodayStr] || {};
      const cloudNeedsSync =
        JSON.stringify(cloudTodayRaw) !== JSON.stringify(cleanTodayMap);
      const sig = `${matched.id}:${localTodayStr}:${JSON.stringify(cleanTodayMap)}`;
      if (cloudNeedsSync && backfilledCloudCompletionSignatureRef.current !== sig) {
        backfilledCloudCompletionSignatureRef.current = sig;
        safeFirestoreWrite(
          () =>
            updateDoc(
              doc(db, 'users', matched.id),
              sanitizeFirestoreData({
                dailyCompletions: nextDailyCompletions || {},
                totalXp: mergedUser.totalXp,
                streakDays: mergedUser.streakDays,
                longestStreak: mergedUser.longestStreak,
                lastActiveDate: mergedUser.lastActiveDate,
                activeDates: mergedUser.activeDates
              })
            ).catch(() =>
              setDoc(
                doc(db, 'users', matched.id),
                sanitizeFirestoreData({
                  dailyCompletions: nextDailyCompletions || {},
                  totalXp: mergedUser.totalXp,
                  streakDays: mergedUser.streakDays,
                  longestStreak: mergedUser.longestStreak,
                  lastActiveDate: mergedUser.lastActiveDate,
                  activeDates: mergedUser.activeDates
                }),
                { merge: true }
              )
            ),
          { force: true }
        );
      }
    }

    const prevCompJson = JSON.stringify(activeUser.dailyCompletions || {});
    const nextCompJson = JSON.stringify(nextDailyCompletions || {});
    if (
      mergedUser.id !== activeUser.id ||
      mergedUser.totalXp !== activeUser.totalXp ||
      mergedUser.streakDays !== activeUser.streakDays ||
      mergedUser.halaqah !== activeUser.halaqah ||
      prevCompJson !== nextCompJson
    ) {
      const syncedActiveUser: ActiveUser = {
        ...mergedUser,
        dailyCompletions: nextDailyCompletions
      };
      setActiveUser(syncedActiveUser);
      if (syncedActiveUser.totalXp !== totalXp) setTotalXp(syncedActiveUser.totalXp);
      if (syncedActiveUser.streakDays !== streakDays) setStreakDays(syncedActiveUser.streakDays);
    }
  }, [
    registeredUsers,
    activeUser?.id,
    activeUser?.name,
    currentLocalTodayStr,
    getEffectiveTodayCompletions
  ]);

  const [standardAmalanItems, setStandardAmalanItems] = useState<StandardAmalanHX[]>(() =>
    getStoredStandardAmalan()
  );
  // Real-time sync for Amalan Pasti Dept HX across localStorage events and Firestore
  useEffect(() => {
    const updateIfDifferent = (next: StandardAmalanHX[]) => {
      setStandardAmalanItems((prev) =>
        JSON.stringify(prev) === JSON.stringify(next) ? prev : next
      );
    };

    const handleLocalStandardAmalanUpdate = () => {
      updateIfDifferent(getStoredStandardAmalan());
    };

    window.addEventListener('noorworship_standard_amalan_updated', handleLocalStandardAmalanUpdate);
    window.addEventListener('storage', handleLocalStandardAmalanUpdate);

    const unsubFirestorePaten = onSnapshot(
      doc(db, 'systemSettings', 'standardAmalanHX'),
      (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          if (Array.isArray(data?.items) && data.items.length > 0) {
            const synced = applyCloudStandardAmalan(data.items as StandardAmalanHX[]);
            updateIfDifferent(synced);
          }
        } else {
          const currentLocal = getStoredStandardAmalan();
          safeFirestoreWrite(() =>
            setDoc(
              doc(db, 'systemSettings', 'standardAmalanHX'),
              {
                items: serializeStandardAmalanForFirestore(currentLocal),
                updatedAt: new Date().toISOString()
              },
              { merge: true }
            )
          );
        }
      },
      () => {}
    );

    return () => {
      window.removeEventListener('noorworship_standard_amalan_updated', handleLocalStandardAmalanUpdate);
      window.removeEventListener('storage', handleLocalStandardAmalanUpdate);
      unsubFirestorePaten();
    };
  }, []);

  // Merge 11 Amalan Paten Dept HX + Ustadz directives for activeUser
  useEffect(() => {
    if (!activeUser) return;

    const todayStr = currentLocalTodayStr;
    const userCompletions = getEffectiveTodayCompletions(activeUser, registeredUsers, todayStr);

    // 1. Amalan Paten Dept HX (11 Baku)
    const patenItems = standardAmalanItems.filter((p) => p.isActive);
    const patenTasks: DailyTask[] = patenItems.map((p) => {
      const taskId = `paten-${p.id}`;
      const comp = userCompletions[taskId];
      const isCompleted = Boolean(comp?.completed);
      const isFardhu5 = isFiveDailyFardhuPrayer(p);
      const currentFullXp =
        isFardhu5 && comp?.isJamaah
          ? Number(p.baseXp) + Number(p.jamaahBonusXp ?? 5)
          : Number(p.baseXp);
      const currentLateXp = Math.round(currentFullXp * 0.75 * 100) / 100;
      const displayXp = isCompleted
        ? comp?.xp !== undefined &&
          (Math.abs(Number(comp.xp) - currentFullXp) < 0.05 ||
            Math.abs(Number(comp.xp) - currentLateXp) < 0.05)
          ? Number(comp.xp)
          : comp?.xp !== undefined && Number(comp.xp) % 1 !== 0
          ? currentLateXp
          : currentFullXp
        : p.baseXp;

      return {
        id: taskId,
        title: p.title,
        category: p.category,
        xp: displayXp,
        jamaahBonusXp: p.jamaahBonusXp,
        completed: isCompleted,
        isPatenHX: true,
        prayerId: p.prayerId,
        hasJamaahOption: p.hasJamaahOption,
        isFastingTask: p.isFastingTask,
        timeWindowInfo: p.timeWindowDescription,
        note: (isCompleted && comp?.note) || p.note
      };
    });

    // 2. Ustadz Directives for activeUser's halaqah (exclude expired non-recurring tasks and duplicates of Dept HX Amalan Pasti)
    const activeUserCleanName = (activeUser.name || '').trim().toLowerCase();
    const ustadzTasks: DailyTask[] = ibadahDirectives
      .filter((d) => isDirectiveCurrentlyActive(d, directiveClockMs))
      .filter((d) => !findConflictingStandardAmalan(d.title, patenItems))
      .filter((d) => {
        const target = (d as any).targetHalaqah;
        return !target || target === 'Semua Halaqah' || target === 'Semua' || target === activeUser.halaqah;
      })
      .map((d) => {
        const taskId = `task-directive-${d.id}`;
        const submission = d.submissions?.find(
          (s) =>
            s.studentId === activeUser.id ||
            (activeUserCleanName && (s.studentName || '').trim().toLowerCase() === activeUserCleanName)
        );
        const comp = userCompletions[taskId];
        const resetAfterMidnight = d.lastResetAt && Date.parse(d.lastResetAt) > new Date(todayStr).getTime();
        const isSubmissionCompletedToday =
          Boolean(submission?.isCompleted) && (submission as any)?.completedDate === todayStr;
        const isDone = Boolean(isSubmissionCompletedToday || (!resetAfterMidnight && comp?.completed));
        const validityDays = d.type === 'yaumiyah' ? 1 : 7;

        return {
          id: taskId,
          directiveId: d.id,
          title: d.title,
          category: d.category,
          xp: isDone && comp?.xp !== undefined ? comp.xp : d.xp,
          completed: isDone,
          isAssigned: true,
          isRecitationTest: (d as any).isRecitationTest || false,
          isRecurring: d.isRecurring ?? false,
          type: d.type,
          validityDays: d.validityDays || validityDays,
          expiresAt: d.expiresAt || (getDirectiveExpiresAtMs(d) ? new Date(getDirectiveExpiresAtMs(d)!).toISOString() : undefined),
          note: (isDone && comp?.note) || d.target,
          targetHalaqah: (d as any).targetHalaqah || activeUser.halaqah
        };
      });

    const nextTasks = [...patenTasks, ...ustadzTasks];
    setTasks((prev) => (JSON.stringify(prev) === JSON.stringify(nextTasks) ? prev : nextTasks));
  }, [
    standardAmalanItems,
    ibadahDirectives,
    activeUser?.id,
    activeUser?.name,
    activeUser?.halaqah,
    activeUser?.dailyCompletions,
    registeredUsers,
    directiveClockMs,
    currentLocalTodayStr,
    getEffectiveTodayCompletions
  ]);


  const [isNotificationsOpen, setIsNotificationsOpen] = useState<boolean>(false);
  const [unreadNotifCount, setUnreadNotifCount] = useState<number>(0);
  const [isAuthOpen, setIsAuthOpen] = useState<boolean>(false);
  const [isSheetsModalOpen, setIsSheetsModalOpen] = useState<boolean>(false);
  const [isDeptHXUnlocked, setIsDeptHXUnlocked] = useState<boolean>(() => {
    return activeUser?.role === 'dept-hx' || activeUser?.role === 'hq-admin';
  });
  const [isDeptHXPinModalOpen, setIsDeptHXPinModalOpen] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const [totalXp, setTotalXp] = useState<number>(() => activeUser.totalXp);
  const [streakDays, setStreakDays] = useState<number>(() => activeUser.streakDays);
  const [currentRole, setCurrentRole] = useState<'member' | 'admin' | 'dept-hx' | 'hq-admin'>(
    () => activeUser.role
  );

  // Sync to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('noorworship_registered_users_prod_v1', JSON.stringify(registeredUsers));
    } catch (e) {
      console.warn('Failed saving users to localStorage', e);
    }
  }, [registeredUsers]);

  useEffect(() => {
    try {
      localStorage.setItem('noorworship_active_user_prod_v1', JSON.stringify(activeUser));
    } catch (e) {
      console.warn('Failed saving active user to localStorage', e);
    }
  }, [activeUser]);

  // Evaluate & maintain streak consistency on load / user switch
  useEffect(() => {
    if (!activeUser?.id) return;
    const evaluated = evaluateStreakOnLoad(activeUser);
    if (evaluated.currentStreak !== streakDays) {
      setStreakDays(evaluated.currentStreak);
    }
  }, [activeUser?.id]);

  // Guard: Role-based strict tab enforcement
  useEffect(() => {
    const isHX = currentRole === 'dept-hx' || currentRole === 'hq-admin';
    const isUstadz = currentRole === 'admin';
    const isSantri = currentRole === 'member';

    if (isHX) {
      if (!isDeptHXUnlocked) {
        setIsDeptHXUnlocked(true);
      }
      // Dept HX accounts must never land on employee/worship or ustadz-specific tabs
      if (currentTab === 'worship' || currentTab === 'admin' || currentTab === 'students') {
        setCurrentTab('dept-hx');
      }
    } else if (isUstadz) {
      if (currentTab === 'worship' || currentTab === 'dept-hx' || currentTab === 'hq-admin') {
        setCurrentTab('admin');
      }
    } else if (isSantri) {
      if (currentTab === 'admin' || currentTab === 'students' || currentTab === 'dept-hx' || currentTab === 'hq-admin') {
        setCurrentTab('worship');
      }
    }
  }, [currentRole, currentTab, isDeptHXUnlocked]);

  // Google Sheets integration state
  const [googleUser, setGoogleUser] = useState<User | null>(null);
  const [googleToken, setGoogleToken] = useState<string | null>(null);
  const [spreadsheet, setSpreadsheet] = useState<SpreadsheetInfo | null>(null);
  const [isConnectingGoogle, setIsConnectingGoogle] = useState<boolean>(false);

  useEffect(() => {
    const unsubscribe = initAuth(
      async (user, token) => {
        setGoogleUser(user);
        if (token) {
          setGoogleToken(token);
          try {
            const sheetInfo = await findOrCreateSpreadsheet(token);
            setSpreadsheet(sheetInfo);
          } catch (e) {
            console.warn('Could not auto-fetch spreadsheet on load:', e);
          }
        }
      },
      () => {
        setGoogleUser(null);
        setGoogleToken(null);
        setSpreadsheet(null);
      }
    );
    return () => unsubscribe();
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 3200);
  };

  const handleRegisterUser = async (newUserData: {
    name: string;
    halaqah: string;
    halaqahCode: string;
    passcode: string;
    phone?: string;
    role: 'member' | 'admin';
    gender?: 'L' | 'P';
  }) => {
    const cleanRawName = newUserData.name.trim().replace(/\s+/g, ' ');
    const inferredGender = newUserData.gender || inferUstadzGender(cleanRawName);
    const formattedName =
      newUserData.role === 'admin'
        ? formatSupervisorDisplayName(cleanRawName, inferredGender)
        : cleanRawName;

    const targetKey = normalizePersonKey(formattedName, newUserData.role);
    const existingDuplicate = registeredUsers.find(
      (u) =>
        u.role !== 'dept-hx' &&
        u.role !== 'hq-admin' &&
        (normalizePersonKey(u.name, u.role) === targetKey ||
          u.name.trim().replace(/\s+/g, ' ').toLowerCase() === formattedName.toLowerCase())
    );

    if (existingDuplicate) {
      showToast(
        `❌ Nama "${formattedName}" sudah terdaftar di sistem (${existingDuplicate.halaqah || 'Terdaftar'}). Nama yang sama tidak dapat diinput dua kali!`
      );
      return;
    }

    const newUser: ActiveUser = {
      id: `user-${Date.now()}`,
      name: formattedName,
      halaqah: newUserData.halaqah,
      halaqahCode: newUserData.halaqahCode,
      passcode: newUserData.passcode,
      phone: newUserData.phone,
      avatar: BRAND_ASSETS.currentUserAvatar,
      role: newUserData.role,
      gender: inferredGender,
      totalXp: 0,
      streakDays: 0,
      assignedHalaqahBy: 'Dept HX',
      hxAssignmentId: `HX-${Date.now().toString().slice(-4)}`,
      hxStatus: 'Resmi Dept HX',
      supervisor: 'Ustadz/ah Pembimbing (SK Dept HX)'
    };

    setRegisteredUsers((prev) => deduplicateActiveUsers([newUser, ...prev]).unique);
    
    try {
      await setDoc(doc(db, 'users', newUser.id), sanitizeFirestoreData(newUser), { merge: true });
    } catch (e) {
      console.error('Error registering user in Firestore:', e);
    }

    setActiveUser(newUser);
    setTotalXp(newUser.totalXp);
    setStreakDays(newUser.streakDays);
    setCurrentRole(newUser.role);
    setIsLoggedIn(true);
    try {
      localStorage.setItem('noorworship_is_logged_in_prod_v1', 'true');
      localStorage.setItem('noorworship_active_user_prod_v1', JSON.stringify(newUser));
    } catch (e) {
      console.warn(e);
    }

    if (newUser.role === 'admin') {
      setCurrentTab('admin');
    } else {
      setCurrentTab('worship');
    }

    if (googleToken && spreadsheet) {
      try {
        await appendRow(googleToken, spreadsheet.id, 'RecitersRoster', [
          newUser.id,
          newUser.name,
          newUser.halaqah,
          newUser.role === 'admin' ? `${getUstadzTitle(newUser)} / Supervisor` : 'Karyawan Baru (Dept HX)',
          '0%',
          '0/0',
          newUser.streakDays,
          newUser.totalXp,
          `Terdaftar via Sistem (Kode Dept HX: ${newUser.halaqahCode})`
        ]);
        showToast(`Tersimpan otomatis di Google Sheets (RecitersRoster)!`);
      } catch (e) {
        console.error('Error logging new user to Sheets:', e);
      }
    }
  };

  const handleRegisterSantriByDeptHX = async (newUserData: {
    name: string;
    halaqah: string;
    halaqahCode: string;
    passcode: string;
    phone?: string;
    role: 'member' | 'admin';
    gender?: 'L' | 'P';
  }) => {
    const cleanRawName = newUserData.name.trim().replace(/\s+/g, ' ');
    const inferredGender = newUserData.gender || inferUstadzGender(cleanRawName);
    const formattedName =
      newUserData.role === 'admin'
        ? formatSupervisorDisplayName(cleanRawName, inferredGender)
        : cleanRawName;

    const targetKey = normalizePersonKey(formattedName, newUserData.role);
    const existingDuplicate = registeredUsers.find(
      (u) =>
        u.role !== 'dept-hx' &&
        u.role !== 'hq-admin' &&
        (normalizePersonKey(u.name, u.role) === targetKey ||
          u.name.trim().replace(/\s+/g, ' ').toLowerCase() === formattedName.toLowerCase())
    );

    if (existingDuplicate) {
      const hasActiveHalaqah =
        existingDuplicate.halaqah &&
        existingDuplicate.halaqah !== 'Tanpa Halaqah' &&
        existingDuplicate.halaqah !== 'Belum Ada Halaqah';
      if (hasActiveHalaqah) {
        showToast(
          `❌ Nama "${formattedName}" sudah terdaftar di "${existingDuplicate.halaqah}". Nama yang sama tidak dapat diinput dua kali!`
        );
        return;
      }

      // If existing user was in 'Tanpa Halaqah', update their existing record instead of creating a duplicate
      const reassignedUser: ActiveUser = {
        ...existingDuplicate,
        name: formattedName,
        halaqah: newUserData.halaqah,
        halaqahCode: newUserData.halaqahCode,
        passcode: newUserData.passcode || existingDuplicate.passcode || '1234',
        phone: newUserData.phone || existingDuplicate.phone,
        role: newUserData.role,
        gender: inferredGender
      };
      setRegisteredUsers((prev) =>
        deduplicateActiveUsers(prev.map((u) => (u.id === existingDuplicate.id ? reassignedUser : u))).unique
      );
      try {
        await setDoc(doc(db, 'users', reassignedUser.id), sanitizeFirestoreData(reassignedUser), { merge: true });
      } catch (e) {
        console.error('Error updating existing santri in Firestore:', e);
      }
      return;
    }

    const newUser: ActiveUser = {
      id: `user-${Date.now()}`,
      name: formattedName,
      halaqah: newUserData.halaqah,
      halaqahCode: newUserData.halaqahCode,
      passcode: newUserData.passcode || '1234',
      phone: newUserData.phone || '',
      avatar: BRAND_ASSETS.currentUserAvatar,
      role: newUserData.role,
      gender: inferredGender,
      totalXp: 0,
      streakDays: 0,
      assignedHalaqahBy: 'Dept HX',
      hxAssignmentId: `HX-${Date.now().toString().slice(-4)}`,
      hxStatus: 'Resmi Dept HX',
      supervisor: 'Ustadz/ah Pembimbing (SK Dept HX)'
    };

    setRegisteredUsers((prev) => deduplicateActiveUsers([newUser, ...prev]).unique);

    try {
      await setDoc(doc(db, 'users', newUser.id), sanitizeFirestoreData(newUser), { merge: true });
    } catch (e) {
      console.error('Error registering santri in Firestore:', e);
    }

    if (googleToken && spreadsheet) {
      try {
        await appendRow(googleToken, spreadsheet.id, 'RecitersRoster', [
          newUser.id,
          newUser.name,
          newUser.halaqah,
          newUser.role === 'admin' ? `${getUstadzTitle(newUser)} / Supervisor` : 'Karyawan Baru (Dept HX)',
          '0%',
          '0/0',
          newUser.streakDays,
          newUser.totalXp,
          `Didaftarkan Dept HX (Kode: ${newUser.halaqahCode})`
        ]);
        showToast(`Data karyawan "${newUser.name}" tersimpan di Google Sheets`);
      } catch (e) {
        console.error('Error logging new user to Sheets:', e);
      }
    }
  };

  const handleUpdateUserPasscode = async (
    userId: string,
    newPasscode: string,
    role?: 'member' | 'admin' | 'dept-hx',
    halaqahName?: string
  ) => {
    const cleanPin = newPasscode.trim();
    if (!cleanPin) return;

    setRegisteredUsers((prev) => {
      const exists = prev.some(
        (u) =>
          u.id === userId ||
          (role === 'dept-hx' && (u.role === 'dept-hx' || u.role === 'hq-admin')) ||
          (role === 'admin' && halaqahName && u.role === 'admin' && u.halaqah.toLowerCase() === halaqahName.toLowerCase())
      );

      if (exists) {
        return prev.map((u) => {
          const isMatch =
            u.id === userId ||
            (role === 'dept-hx' && (u.role === 'dept-hx' || u.role === 'hq-admin')) ||
            (role === 'admin' && halaqahName && u.role === 'admin' && u.halaqah.toLowerCase() === halaqahName.toLowerCase());
          if (isMatch) {
            setDoc(doc(db, 'users', u.id), { passcode: cleanPin }, { merge: true }).catch(() => {});
            return { ...u, passcode: cleanPin };
          }
          return u;
        });
      }

      if (role === 'admin' && halaqahName) {
        const newUstadzUser: ActiveUser = {
          id: userId,
          name: `Ustadz/ah ${halaqahName}`,
          halaqah: halaqahName,
          halaqahCode: 'HX-001',
          passcode: cleanPin,
          avatar: BRAND_ASSETS.currentUserAvatar,
          role: 'admin',
          totalXp: 0,
          streakDays: 0,
          supervisor: 'Departemen HX (Human Experience)',
          assignedHalaqahBy: 'Dept HX',
          hxAssignmentId: `HX-UST-${Date.now().toString().slice(-4)}`,
          hxStatus: 'Resmi Dept HX'
        };
        setDoc(doc(db, 'users', newUstadzUser.id), sanitizeFirestoreData(newUstadzUser), { merge: true }).catch(() => {});
        return [newUstadzUser, ...prev];
      }

      return prev;
    });

    if (
      activeUser &&
      (activeUser.id === userId ||
        (role === 'dept-hx' && (activeUser.role === 'dept-hx' || activeUser.role === 'hq-admin')))
    ) {
      setActiveUser((prev) => ({ ...prev, passcode: cleanPin }));
    }
  };

  const handleImportReciters = async (records: ImportedReciterRecord[]) => {
    if (!records || records.length === 0) return;

    let currentHalaqahs: any[] = [];
    try {
      const saved = localStorage.getItem('noorworship_unified_halaqahs_prod_v1');
      if (saved) currentHalaqahs = JSON.parse(saved);
      else currentHalaqahs = [...DEFAULT_BASE_HALAQAHS];
    } catch {
      currentHalaqahs = [...DEFAULT_BASE_HALAQAHS];
    }

    const createdOrUpdatedUsers: ActiveUser[] = [];
    const newHalaqahNames: string[] = [];
    const importedHalaqahLowerSet = new Set<string>();
    const importedUserLowerNames = new Set<string>();
    const seenExcelMemberKeys = new Set<string>();
    let skippedDuplicateRows = 0;

    for (const record of records) {
      if (!record.name || !record.name.trim()) continue;
      const cleanName = record.name.trim().replace(/\s+/g, ' ');
      const memberKey = normalizePersonKey(cleanName, 'member');
      if (seenExcelMemberKeys.has(memberKey)) {
        skippedDuplicateRows++;
        continue;
      }
      seenExcelMemberKeys.add(memberKey);

      const cleanHalaqah = (record.halaqah || 'Halaqah Utama').trim().replace(/\s+/g, ' ');
      const cleanSupervisor = formatSupervisorDisplayName(
        (record.supervisor || 'Ustadz/ah Pembimbing').trim().replace(/\s+/g, ' ')
      );
      const cleanPasscode = (record.passcode || '1234').trim();

      importedHalaqahLowerSet.add(cleanHalaqah.toLowerCase());
      importedUserLowerNames.add(cleanName.toLowerCase());

      let halaqahCode = 'HL-1001';
      const existingHalaqah = currentHalaqahs.find(
        (h) => h?.name && h.name.trim().toLowerCase() === cleanHalaqah.toLowerCase()
      );
      if (existingHalaqah) {
        halaqahCode = existingHalaqah.code;
        existingHalaqah.supervisor = cleanSupervisor;
      } else {
        const words = cleanHalaqah.split(/\s+/);
        const initials =
          words
            .map((w: string) => w[0])
            .join('')
            .toUpperCase()
            .slice(0, 3) || 'HL';
        const randomCode = `${initials}-${Math.floor(1000 + Math.random() * 9000)}`;
        halaqahCode = randomCode;
        currentHalaqahs.push({
          id: `halaqah-import-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          name: cleanHalaqah,
          code: randomCode,
          supervisor: cleanSupervisor,
          schedule: 'Senin & Kamis 05:30 WIB',
          location: 'Masjid Perusahaan',
          department: 'Dept HX',
          description: `Halaqah ampuan ${cleanSupervisor}`,
          targetJuz: 'Juz 30 & Tahsin'
        });
        if (!newHalaqahNames.includes(cleanHalaqah)) {
          newHalaqahNames.push(cleanHalaqah);
        }
      }

      // Ensure Ustadz Pembimbing account is also registered/updated without duplicating by name
      const ustadzKey = normalizePersonKey(cleanSupervisor, 'admin');
      const existingUstadzInBatch = createdOrUpdatedUsers.find(
        (u) =>
          u.role === 'admin' &&
          (normalizePersonKey(u.name, 'admin') === ustadzKey ||
            u.halaqah.trim().toLowerCase() === cleanHalaqah.toLowerCase())
      );
      const existingUstadzInState = registeredUsers.find(
        (u) =>
          u.role === 'admin' &&
          (normalizePersonKey(u.name, 'admin') === ustadzKey ||
            u.halaqah.trim().toLowerCase() === cleanHalaqah.toLowerCase())
      );
      const existingUstadz = existingUstadzInBatch || existingUstadzInState;

      if (!existingUstadz && cleanSupervisor) {
        const ustadzUser: ActiveUser = {
          id: `user-ustadz-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          name: cleanSupervisor,
          halaqah: cleanHalaqah,
          halaqahCode: halaqahCode,
          passcode: '1234',
          avatar: BRAND_ASSETS.currentUserAvatar,
          role: 'admin',
          totalXp: 0,
          streakDays: 0,
          assignedHalaqahBy: 'SK Dept HX',
          hxAssignmentId: `HX-UST-${Date.now().toString().slice(-4)}`,
          hxStatus: 'Resmi Dept HX',
          supervisor: 'Departemen HX (Human Experience)'
        };
        createdOrUpdatedUsers.push(ustadzUser);
        syncedUserIdsRef.current.add(ustadzUser.id);
      } else if (existingUstadz && !existingUstadzInBatch) {
        const updatedUstadz: ActiveUser = {
          ...existingUstadz,
          name: cleanSupervisor,
          halaqah: cleanHalaqah,
          halaqahCode: halaqahCode
        };
        createdOrUpdatedUsers.push(updatedUstadz);
        syncedUserIdsRef.current.add(updatedUstadz.id);
      }

      // Check if employee with same name already exists in registeredUsers
      const existingMember = registeredUsers.find(
        (u) => u.role === 'member' && normalizePersonKey(u.name, 'member') === memberKey
      );

      const memberUser: ActiveUser = existingMember
        ? {
            ...existingMember,
            name: cleanName,
            halaqah: cleanHalaqah,
            halaqahCode: halaqahCode,
            passcode: cleanPasscode,
            phone: record.phone || existingMember.phone || '',
            assignedHalaqahBy: 'Import Dept HX',
            hxStatus: 'Resmi Dept HX',
            supervisor: cleanSupervisor
          }
        : {
            id: `user-import-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
            name: cleanName,
            halaqah: cleanHalaqah,
            halaqahCode: halaqahCode,
            passcode: cleanPasscode,
            phone: record.phone || '',
            avatar: BRAND_ASSETS.currentUserAvatar,
            role: 'member',
            totalXp: 0,
            streakDays: 0,
            assignedHalaqahBy: 'Import Dept HX',
            hxAssignmentId: `HX-${Date.now().toString().slice(-4)}`,
            hxStatus: 'Resmi Dept HX',
            supervisor: cleanSupervisor
          };

      createdOrUpdatedUsers.push(memberUser);
      syncedUserIdsRef.current.add(memberUser.id);
    }

    if (createdOrUpdatedUsers.length > 0) {
      // 1. Remove imported halaqah names from deletedHalaqahNames in localStorage
      try {
        const savedDelH = localStorage.getItem('noorworship_deleted_halaqah_names_prod_v1');
        if (savedDelH) {
          const parsedDelH = JSON.parse(savedDelH);
          if (Array.isArray(parsedDelH)) {
            const cleanedDelH = parsedDelH.filter(
              (d: string) => !importedHalaqahLowerSet.has(d.trim().toLowerCase())
            );
            localStorage.setItem(
              'noorworship_deleted_halaqah_names_prod_v1',
              JSON.stringify(cleanedDelH)
            );
          }
        }
      } catch {}

      // 2. Remove imported user names/IDs from deletedStudentIds in localStorage
      try {
        const savedDelS = localStorage.getItem('noorworship_deleted_student_ids_prod_v1');
        if (savedDelS) {
          const parsedDelS = JSON.parse(savedDelS);
          if (Array.isArray(parsedDelS)) {
            const importedIdsSet = new Set(createdOrUpdatedUsers.map((u) => u.id));
            const cleanedDelS = parsedDelS.filter(
              (s: string) =>
                !importedIdsSet.has(s) && !importedUserLowerNames.has(s.trim().toLowerCase())
            );
            localStorage.setItem(
              'noorworship_deleted_student_ids_prod_v1',
              JSON.stringify(cleanedDelS)
            );
          }
        }
      } catch {}

      // 3. Clear any stale userHalaqahOverrides for imported users
      try {
        const savedOverrides = localStorage.getItem('noorworship_user_halaqah_overrides_prod_v1');
        if (savedOverrides) {
          const parsedOverrides = JSON.parse(savedOverrides);
          if (parsedOverrides && typeof parsedOverrides === 'object') {
            createdOrUpdatedUsers.forEach((u) => {
              delete parsedOverrides[u.id];
            });
            localStorage.setItem(
              'noorworship_user_halaqah_overrides_prod_v1',
              JSON.stringify(parsedOverrides)
            );
          }
        }
      } catch {}

      // 4. Update registeredUsers state immediately
      setRegisteredUsers((prev) => {
        const { unique } = deduplicateActiveUsers([
          ...createdOrUpdatedUsers,
          ...prev
        ]);
        return unique;
      });

      try {
        localStorage.setItem(
          'noorworship_unified_halaqahs_prod_v1',
          JSON.stringify(currentHalaqahs)
        );
      } catch (e) {
        console.warn(e);
      }

      // 5. Commit all imported users and halaqahs to Firestore in a single atomic batch if quota is available
      if (!isFirestoreQuotaExhausted()) {
        safeFirestoreWrite(async () => {
          const batch = writeBatch(db);
          createdOrUpdatedUsers.slice(0, 400).forEach((u) => {
            batch.set(doc(db, 'users', u.id), sanitizeFirestoreData(u), { merge: true });
          });
          currentHalaqahs.slice(0, 80).forEach((h) => {
            if (h && h.id && h.name) {
              batch.set(doc(db, 'halaqahs', h.id), sanitizeFirestoreData(h), { merge: true });
            }
          });
          await batch.commit();
        });
      }
      window.dispatchEvent(new Event('noorworship_halaqah_updated'));
      showToast(
        `Alhamdulillah! Berhasil mengimpor ${seenExcelMemberKeys.size} data karyawan unik${
          skippedDuplicateRows > 0 ? ` (${skippedDuplicateRows} nama ganda dilewati)` : ''
        }${
          newHalaqahNames.length > 0
            ? ` dan mendaftarkan ${newHalaqahNames.length} halaqah baru`
            : ''
        }.`
      );
    }
  };

  const handleExportAllReciters = () => {
    const headers = [
      'No',
      'Nama Karyawan',
      'Kelompok Halaqah',
      'Ustadz/ah Pembimbing',
      'Status Akun',
      'Streak Hari',
      'Total XP',
      'Kode Halaqah'
    ];
    const rows = registeredUsers
      .filter((u) => u.role !== 'dept-hx' && u.role !== 'hq-admin')
      .map((u, idx) => [
        idx + 1,
        u.name,
        u.halaqah,
        formatSupervisorDisplayName(u.supervisor),
        u.role === 'admin' ? `${getUstadzTitle(u)} / Pembimbing` : 'Karyawan Aktif',
        u.streakDays,
        u.role === 'admin' ? '-' : u.totalXp,
        u.halaqahCode || '-'
      ]);
    downloadPerColumnCSV('Data_Karyawan_JejakTaqwa_Lokal', headers, rows, 'Karyawan');
    showToast('Alhamdulillah! Seluruh data karyawan berhasil diekspor ke file Excel (.xlsx).');
  };

  const handleDeleteSantriByDeptHX = async (studentId: string) => {
    setRegisteredUsers((prev) => prev.filter((u) => u.id !== studentId));
    try {
      await deleteDoc(doc(db, 'users', studentId));
    } catch (e) {
      console.error('Error deleting user from Firestore:', e);
    }
  };

  const handleUpdateUserHalaqah = async (studentId: string, newHalaqah: string, newHalaqahCode?: string) => {
    setRegisteredUsers((prev) =>
      prev.map((u) => {
        if (u.id === studentId) {
          const updated = {
            ...u,
            halaqah: newHalaqah,
            ...(newHalaqahCode ? { halaqahCode: newHalaqahCode } : {})
          };
          setDoc(doc(db, 'users', studentId), sanitizeFirestoreData(updated), { merge: true }).catch((e) => {
            console.error('Error updating user halaqah in Firestore:', e);
          });
          return updated;
        }
        return u;
      })
    );
  };

  const handleRenameHalaqahForAll = async (oldName: string, newName: string, newCode?: string) => {
    const cleanOld = (oldName || '').trim().toLowerCase();
    if (!cleanOld) return;
    setRegisteredUsers((prev) =>
      prev.map((u) => {
        if (u.halaqah && u.halaqah.trim().toLowerCase() === cleanOld) {
          const updated = {
            ...u,
            halaqah: newName,
            ...(newCode ? { halaqahCode: newCode } : {})
          };
          setDoc(doc(db, 'users', u.id), sanitizeFirestoreData(updated), { merge: true }).catch((e) => {
            console.error('Error renaming halaqah for user in Firestore:', e);
          });
          return updated;
        }
        return u;
      })
    );
  };

  const handleSelectUser = (selected: ActiveUser) => {
    setActiveUser(selected);
    setTotalXp(selected.totalXp);
    setStreakDays(selected.streakDays);
    setCurrentRole(selected.role);
    setIsLoggedIn(true);
    try {
      localStorage.setItem('noorworship_is_logged_in_prod_v1', 'true');
      localStorage.setItem('noorworship_active_user_prod_v1', JSON.stringify(selected));
    } catch (e) {
      console.warn(e);
    }
    if (selected.role === 'admin') {
      setCurrentTab('admin');
    } else if (selected.role === 'dept-hx' || selected.role === 'hq-admin') {
      setCurrentTab('dept-hx');
      setIsDeptHXUnlocked(true);
    } else {
      setCurrentTab('worship');
    }
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    try {
      localStorage.removeItem('noorworship_is_logged_in_prod_v1');
    } catch (e) {
      console.warn(e);
    }
    showToast('Anda telah keluar dari akun.');
  };

  const handleConnectGoogle = async () => {
    setIsConnectingGoogle(true);
    try {
      const res = await googleSignIn();
      if (res && res.accessToken) {
        setGoogleUser(res.user);
        setGoogleToken(res.accessToken);
        showToast('Memeriksa dan membuat spreadsheet di Google Drive Anda...');
        const sheetInfo = await findOrCreateSpreadsheet(res.accessToken);
        setSpreadsheet(sheetInfo);
        await syncRosterToSheets(res.accessToken, sheetInfo.id, ALL_RECITERS_DIRECTORY);
        showToast(`Terhubung! Spreadsheet "JejakTaqwa - Database & Rekap Halaqah" siap.`);
      }
    } catch (err: any) {
      console.error(err);
      showToast(`Gagal menghubungkan Google: ${err.message}`);
    } finally {
      setIsConnectingGoogle(false);
    }
  };

  const handleDisconnectGoogle = async () => {
    try {
      await logout();
      setGoogleUser(null);
      setGoogleToken(null);
      setSpreadsheet(null);
      showToast('Koneksi Google Sheets diputus.');
    } catch (err: any) {
      console.error(err);
      showToast(`Gagal logout: ${err.message}`);
    }
  };

  const handleToggleTask = async (
    taskId: string,
    extraDetails?: { earnedXp?: number; fastingNote?: string; isJamaah?: boolean }
  ) => {
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;

    // Permanent lock: Once checked, cannot be un-checked
    if (task.completed) {
      showToast('Amalan yang telah dicentang tidak dapat dibatalkan (un-checklist) demi menjaga kejujuran.');
      return;
    }

    const localTodayStr = getLocalDateString();
    const personKey = normalizePersonKey(activeUser.name, activeUser.role);
    const userCompletions = {
      ...getEffectiveTodayCompletions(activeUser, registeredUsers, localTodayStr)
    };

    const finalXp = extraDetails?.earnedXp !== undefined ? extraDetails.earnedXp : task.xp;
    const fastingNoteStr = extraDetails?.fastingNote ? ` (Niat: ${extraDetails.fastingNote})` : '';

    userCompletions[taskId] = {
      completed: true,
      xp: finalXp,
      note: (task.note || '') + fastingNoteStr,
      isJamaah: extraDetails?.isJamaah,
      completedAt: new Date().toISOString()
    };

    try {
      const serialized = JSON.stringify(userCompletions);
      localStorage.setItem(`noorworship_completions_${activeUser.id}_${localTodayStr}`, serialized);
      if (personKey) {
        localStorage.setItem(`noorworship_completions_${personKey}_${localTodayStr}`, serialized);
      }
    } catch (e) {}

    setTasks((prev) =>
      prev.map((t) =>
        t.id === taskId
          ? {
              ...t,
              completed: true,
              xp: finalXp,
              note: (t.note || '') + fastingNoteStr
            }
          : t
      )
    );

    const isMonitoringHx = activeUser.role === 'dept-hx' || activeUser.role === 'hq-admin';
    const streakResult = recordDailyActivityStreak(activeUser);
    const newXp = isMonitoringHx ? 0 : Math.round((totalXp + finalXp) * 100) / 100;
    setTotalXp(newXp);
    setStreakDays(isMonitoringHx ? 0 : streakResult.streakDays);

    const updatedDailyCompletions = mergeDailyCompletions(activeUser.dailyCompletions, {
      [localTodayStr]: userCompletions
    });

    const updatedUser: ActiveUser = {
      ...activeUser,
      totalXp: newXp,
      streakDays: isMonitoringHx ? 0 : streakResult.streakDays,
      longestStreak: isMonitoringHx ? 0 : streakResult.longestStreak,
      lastActiveDate: streakResult.lastActiveDate,
      activeDates: streakResult.activeDates,
      dailyCompletions: updatedDailyCompletions
    };
    setActiveUser(updatedUser);

    setRegisteredUsers((prev) =>
      prev.map((u) =>
        u.id === activeUser.id || (personKey && normalizePersonKey(u.name, u.role) === personKey)
          ? { ...updatedUser, id: u.id }
          : u
      )
    );

    try {
      localStorage.setItem('noorworship_active_user_prod_v1', JSON.stringify(updatedUser));
    } catch (e) {}

    await safeFirestoreWrite(
      () =>
        setDoc(
          doc(db, 'users', activeUser.id),
          sanitizeFirestoreData({
            totalXp: newXp,
            streakDays: streakResult.streakDays,
            longestStreak: streakResult.longestStreak,
            lastActiveDate: streakResult.lastActiveDate,
            activeDates: streakResult.activeDates,
            dailyCompletions: updatedDailyCompletions
          }),
          { merge: true }
        ),
      { force: true }
    );

    if (task.directiveId) {
      const submissionRef = doc(db, `ibadahDirectives/${task.directiveId}/submissions`, activeUser.id);
      await safeFirestoreWrite(
        () =>
          setDoc(
            submissionRef,
            {
              studentId: activeUser.id,
              studentName: activeUser.name,
              studentAvatar: activeUser.avatar || '',
              halaqah: activeUser.halaqah || '',
              isCompleted: true,
              completedDate: localTodayStr,
              completedAt: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB'
            },
            { merge: true }
          ),
        { force: true }
      );
    }

    if (streakResult.isNewDayStreak) {
      showToast(`${streakResult.statusMessage} (+${finalXp} XP "${task.title}")`);
    } else {
      showToast(`Alhamdulillah! +${finalXp} XP diraih untuk amalan "${task.title}" (terkunci)`);
    }

    if (googleToken && spreadsheet) {
      try {
        await logDailyTaskToSheets(googleToken, spreadsheet.id, task.title, task.category, finalXp, activeUser.name);
      } catch (e) {
        console.error('Error logging to Sheets:', e);
      }
    }
  };

  const handleAddTask = async (newTask: DailyTask) => {
    const conflictingStandard = findConflictingStandardAmalan(newTask.title);
    if (conflictingStandard) {
      showToast(
        `Amalan "${newTask.title}" sudah ada di Amalan Pasti Dept HX ("${conflictingStandard.title}"). Gunakan amalan lain.`
      );
      return;
    }

    const targetHalaqah = newTask.targetHalaqah || activeUser?.halaqah || 'Halaqah Al-Fajr';
    const directiveId = newTask.directiveId || `ibadah-${Date.now()}`;

    const taskWithDirective: DailyTask = {
      ...newTask,
      id: `task-directive-${directiveId}`,
      directiveId: directiveId,
      targetHalaqah: targetHalaqah,
      isAssigned: true
    };

    setTasks((prev) => [taskWithDirective, ...prev]);

    try {
      const taskType = newTask.type || 'yaumiyah';
      const validityDays = taskType === 'yaumiyah' ? 1 : 7;
      const now = new Date();
      const expDate = new Date(now.getTime() + validityDays * 24 * 60 * 60 * 1000);

      const newDirective = {
        id: directiveId,
        type: taskType,
        title: newTask.title,
        target: newTask.note || `Target amalan dari ${getUstadzTitle(activeUser)}`,
        xp: newTask.xp || 15,
        compliancePercent: 0,
        status: 'Aktif',
        category: newTask.category || 'Sunnah Harian',
        isRecurring: newTask.isRecurring ?? false,
        validityDays,
        expiresAt: newTask.expiresAt || expDate.toISOString(),
        targetHalaqah: targetHalaqah,
        createdBy: formatSupervisorDisplayName(activeUser?.name, activeUser?.gender),
        createdAt: newTask.createdAt || now.toISOString()
      };

      await setDoc(doc(db, 'ibadahDirectives', directiveId), newDirective, { merge: true });

      const studentMap = new Map<string, any>();
      DEFAULT_HALAQAH_ROSTER.forEach(s => {
        if (s.halaqah === targetHalaqah || targetHalaqah === 'Semua Halaqah' || targetHalaqah === 'Semua') {
          studentMap.set(s.id, s);
        }
      });
      if (registeredUsers && registeredUsers.length > 0) {
        registeredUsers.forEach(u => {
          if (u.role === 'member' && (u.halaqah === targetHalaqah || targetHalaqah === 'Semua Halaqah' || targetHalaqah === 'Semua')) {
            studentMap.set(u.id, u);
          }
        });
      }

      for (const s of Array.from(studentMap.values())) {
        await setDoc(doc(db, `ibadahDirectives/${directiveId}/submissions`, s.id), {
          studentId: s.id,
          studentName: s.name,
          studentAvatar: s.avatar || '',
          halaqah: s.halaqah || targetHalaqah,
          isCompleted: false,
          notes: `Tugas baru diterbitkan ${getUstadzTitle(activeUser).toLowerCase()}`
        });
      }

      showToast(`Amalan "${newTask.title}" berhasil disiarkan ke karyawan ${targetHalaqah}!`);
    } catch (e) {
      console.error('Error saving task to Firestore:', e);
      showToast(`Amalan "${newTask.title}" ditambahkan untuk ${targetHalaqah}.`);
    }
  };

  const handleDeleteTask = (taskId: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
    showToast('Amalan halaqah berhasil dihapus.');
  };



  const handleSubmitRecitation = async (earnedXp: number, details?: { ayah: string; score: number; studentId?: string; studentName?: string }) => {
    const isDeptHX = activeUser.role === 'dept-hx' || activeUser.role === 'hq-admin';
    const isUstadz = activeUser.role === 'admin';
    const targetStudentId = details?.studentId;

    if (isDeptHX) {
      // Dept HX evaluation: Internal to Dept HX only! (Does NOT add XP to Klasemen)
      showToast(`Hasil evaluasi tilawah Dept HX tersimpan privat di Rekap Internal HX (Tidak memengaruhi Klasemen Karyawan).`);
    } else if (isUstadz && targetStudentId) {
      // Ustadz evaluation: Adds XP to Karyawan for Klasemen & marks student streak!
      setRegisteredUsers((prev) =>
        prev.map((usr) => {
          if (usr.id === targetStudentId) {
            const studentStreak = recordDailyActivityStreak(usr);
            const updatedStudent: ActiveUser = {
              ...usr,
              totalXp: (usr.totalXp || 0) + earnedXp,
              streakDays: studentStreak.streakDays,
              longestStreak: studentStreak.longestStreak,
              lastActiveDate: studentStreak.lastActiveDate,
              activeDates: studentStreak.activeDates
            };
            setDoc(doc(db, 'users', targetStudentId), updatedStudent, { merge: true }).catch((e) => {
              console.error('Error syncing student XP to Firestore:', e);
            });
            return updatedStudent;
          }
          return usr;
        })
      );
      showToast(`Alhamdulillah! Nilai tilawah ${getUstadzTitle(activeUser)} untuk ${details?.studentName || 'Karyawan'} tersimpan (+${earnedXp} XP Klasemen).`);
    } else if (!isDeptHX && !isUstadz) {
      // Regular employee self-tilawah submission (guided by Ustadz)
      const streakResult = recordDailyActivityStreak(activeUser);
      const newXp = totalXp + earnedXp;
      setTotalXp(newXp);
      setStreakDays(streakResult.streakDays);

      const updatedUser: ActiveUser = {
        ...activeUser,
        totalXp: newXp,
        streakDays: streakResult.streakDays,
        longestStreak: streakResult.longestStreak,
        lastActiveDate: streakResult.lastActiveDate,
        activeDates: streakResult.activeDates
      };
      setActiveUser(updatedUser);

      setRegisteredUsers((prev) =>
        prev.map((u) => (u.id === activeUser.id ? updatedUser : u))
      );

      try {
        await setDoc(doc(db, 'users', activeUser.id), updatedUser, { merge: true });
        localStorage.setItem('noorworship_active_user_prod_v1', JSON.stringify(updatedUser));
      } catch (e) {}

      if (streakResult.isNewDayStreak) {
        showToast(`Alhamdulillah! ${streakResult.statusMessage} (+${earnedXp} XP Ujian Tilawah)`);
      }
    }

    const todayStr = getLocalDateString();
    const userCompletionKey = `noorworship_completions_${activeUser.id}_${todayStr}`;
    let userCompletions: Record<string, DailyTaskCompletionRecord> = {};
    try {
      const raw = localStorage.getItem(userCompletionKey);
      if (raw) userCompletions = JSON.parse(raw);
    } catch (e) {}

    setTasks((prev) =>
      prev.map((t) => {
        const isRecitationTask = t.id === 'task-3' || t.isRecitationTest || t.category === 'Al-Qur’an' || t.category === 'Tilawah & Hifdz' || /setor|tilawah|alqur'an|quran/i.test(t.title);
        if (isRecitationTask) {
          userCompletions[t.id] = {
            completed: true,
            xp: t.xp,
            note: 'Telah disetor',
            completedAt: new Date().toISOString()
          };
          return { ...t, completed: true };
        }
        return t;
      })
    );
    try {
      localStorage.setItem(userCompletionKey, JSON.stringify(userCompletions));
    } catch (e) {}

    const ayahTitle = details?.ayah || 'Surah Al-Mulk (Ayat 1)';
    const scoreVal = details?.score || 94;
    const logName = details?.studentName || activeUser.name;

    if (googleToken && spreadsheet) {
      try {
        await logRecitationToSheets(googleToken, spreadsheet.id, logName, ayahTitle, `${scoreVal}% (Mumtaz)`, '96%', '92%', '95%', 'Mumtaz • Top 5% Karyawan Halaqah', 'Alhamdulillah bacaan tartil dan makharij fasih, tingkatkan ketukan mad akhir ayat.');
        showToast(`Hasil tes tilawah ${logName} disimpan di Google Sheets!`);
      } catch (e) {
        console.error('Error logging recitation to Sheets:', e);
      }
    }
  };

  if (isSplashVisible) {
    return <SplashScreen isLoggedIn={isLoggedIn} activeUserName={activeUser?.name} onFinish={() => setIsSplashVisible(false)} />;
  }

  if (!isLoggedIn) {
    return (
      <>
        <AuthScreen registeredUsers={registeredUsers} onLoginSuccess={(user: ActiveUser) => handleSelectUser(user)} onRegisterNewUser={async (userData: any) => { await handleRegisterUser(userData); showToast(`Ahlan wa Sahlan, ${userData.name}! Pendaftaran berhasil.`); }} onShowToast={showToast} />
        {toastMessage && (
          <div className="fixed bottom-6 inset-x-4 mx-auto w-fit max-w-md z-[90] bg-[#293040] text-[#edf0ff] px-3.5 py-2 rounded-2xl shadow-xl flex items-center gap-2 transition-all animate-in fade-in slide-in-from-bottom-2 duration-200">
            <span className="material-symbols-outlined text-[17px] text-[#92f7c3] shrink-0">check_circle</span>
            <span className="text-xs font-semibold leading-snug line-clamp-2">{toastMessage}</span>
          </div>
        )}
      </>
    );
  }

  return (
    <div className="min-h-screen bg-[#f9f9ff] text-[#141b2b] flex flex-col font-sans selection:bg-[#c1ecd4] selection:text-[#012d1d]">
      <Header currentTab={currentTab} onOpenNotifications={() => setIsNotificationsOpen(true)} onOpenAuth={() => setIsAuthOpen(true)} onLogout={handleLogout} onOpenSplash={() => setIsSplashVisible(true)} onOpenSheets={() => setIsSheetsModalOpen(true)} isSheetsConnected={!!googleToken && !!spreadsheet} unreadCount={unreadNotifCount} currentRole={currentRole} activeUser={activeUser} />
      <main className="flex-1 flex flex-col w-full">
        {currentTab === 'worship' && (
          <WorshipScreen
            tasks={tasks}
            onToggleTask={handleToggleTask}
            onAddTask={handleAddTask}
            onDeleteTask={handleDeleteTask}
            totalXp={totalXp}
            streakDays={streakDays}
            onNavigateToRecitation={() => setCurrentTab('recitation')}
            onNavigateToLeaderboard={() => setCurrentTab('leaderboard')}
            onShowToast={showToast}
            activeUser={activeUser}
            registeredUsers={registeredUsers}
            onOpenAuth={() => setIsAuthOpen(true)}
            attendanceSessions={attendanceSessions}
          />
        )}
        {currentTab === 'recitation' && <RecitationScreen onBack={() => { if (currentRole === 'admin') setCurrentTab('admin'); else if (currentRole === 'dept-hx' || currentRole === 'hq-admin') setCurrentTab('dept-hx'); else setCurrentTab('worship'); }} onSubmitRecitation={handleSubmitRecitation} onShowToast={showToast} currentRole={currentRole} activeUser={activeUser} registeredUsers={registeredUsers} googleToken={googleToken} spreadsheetId={spreadsheet?.id} />}
        {currentTab === 'leaderboard' && <LeaderboardScreen userXp={totalXp} userStreak={streakDays} onShowToast={showToast} activeUser={activeUser} onOpenAuth={() => setIsAuthOpen(true)} registeredUsers={registeredUsers} />}
        {currentTab === 'admin' && <AdminScreen onShowToast={showToast} onOpenSheets={() => setIsSheetsModalOpen(true)} isSheetsConnected={!!googleToken && !!spreadsheet} onOpenAuth={() => setIsAuthOpen(true)} onAddHalaqahTask={handleAddTask} activeUser={activeUser} registeredUsers={registeredUsers} ibadahDirectives={ibadahDirectives} setIbadahDirectives={setIbadahDirectives} attendanceSessions={attendanceSessions} onSaveAttendanceSession={handleSaveAttendanceSession} onDeleteAttendanceSession={handleDeleteAttendanceSession} />}
        {currentTab === 'students' && <HalaqahStudentsScreen activeUser={activeUser} registeredUsers={registeredUsers} attendanceSessions={attendanceSessions} onShowToast={showToast} />}
        {(currentTab === 'dept-hx' || currentTab === 'hq-admin') && ((isDeptHXUnlocked || currentRole === 'dept-hx' || currentRole === 'hq-admin') ? <HQAdminScreen ibadahDirectives={ibadahDirectives} onShowToast={showToast} onOpenSheets={() => setIsSheetsModalOpen(true)} isSheetsConnected={!!googleToken && !!spreadsheet} registeredUsers={registeredUsers} onOpenRegister={() => setIsAuthOpen(true)} onRegisterSantri={handleRegisterSantriByDeptHX} onDeleteSantri={handleDeleteSantriByDeptHX} onUpdateUserHalaqah={handleUpdateUserHalaqah} onRenameHalaqahForAll={handleRenameHalaqahForAll} onLockDeptHX={() => { setIsDeptHXUnlocked(false); setCurrentTab('leaderboard'); showToast('Akses Dept HX telah dikunci kembali.'); }} attendanceSessions={attendanceSessions} onSaveAttendanceSession={handleSaveAttendanceSession} onDeleteAttendanceSession={handleDeleteAttendanceSession} onUpdateUserPasscode={handleUpdateUserPasscode} /> : (
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center max-w-md mx-auto my-auto space-y-4 min-h-[55vh]">
            <div className="w-16 h-16 rounded-3xl bg-[#012d1d] text-[#fed488] flex items-center justify-center shadow-lg mx-auto"><span className="material-symbols-outlined text-[32px]" style={{ fontVariationSettings: "'FILL' 1" }}>admin_panel_settings</span></div>
            <div><span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-[#1b4332]/10 text-[#00452c] text-xs font-bold uppercase tracking-wider mb-2"><span className="material-symbols-outlined text-[14px]">lock</span>Area Terbatas</span><h2 className="text-xl font-bold text-[#141b2b]">Otorisasi Dept HX Diperlukan</h2><p className="text-xs text-[#717973] mt-1.5 max-w-sm leading-relaxed">Halaman ini memuat kewenangan penataan struktur halaqah, manajemen amalan, dan penerbitan SK pembimbing. Masukkan kode otorisasi untuk mengakses.</p></div>
            <div className="flex items-center gap-2.5 w-full max-w-xs pt-2"><button onClick={() => setCurrentTab(currentRole === 'admin' ? 'admin' : 'worship')} className="flex-1 py-2.5 rounded-full bg-[#f1f3ff] hover:bg-[#e4e7ff] text-[#414844] text-xs font-bold transition-colors cursor-pointer">Kembali</button><button onClick={() => setIsDeptHXPinModalOpen(true)} className="flex-1 py-2.5 rounded-full bg-[#012d1d] hover:bg-[#1b4332] text-white text-xs font-bold transition-all shadow-md active:scale-95 cursor-pointer flex items-center justify-center gap-1.5"><span className="material-symbols-outlined text-[16px]">key</span><span>Masukkan Kode</span></button></div>
          </div>
        ))}
      </main>
      <BottomNav currentTab={currentTab} currentRole={currentRole} onChangeTab={(tab: TabType) => { if (tab === 'dept-hx' || tab === 'hq-admin') { if (!isDeptHXUnlocked && currentRole !== 'dept-hx' && currentRole !== 'hq-admin') { setIsDeptHXPinModalOpen(true); return; } } if (tab === 'admin' && currentRole === 'member') { showToast('Menu Dashboard hanya dapat diakses oleh Ustadz/ah'); return; } if (tab === 'students' && currentRole === 'member') { showToast('Menu Karyawan hanya dapat diakses oleh Ustadz/ah'); return; } if (tab === 'worship' && currentRole !== 'member') { return; } setCurrentTab(tab); }} />
      <NotificationsModal
        isOpen={isNotificationsOpen}
        onClose={() => setIsNotificationsOpen(false)}
        activeUser={activeUser}
        onUnreadCountChange={setUnreadNotifCount}
        onAction={(action: string) => {
          if (action === 'open-recitation') {
            setCurrentTab('recitation');
          } else if (action === 'open-worship') {
            setCurrentTab('worship');
          } else if (action === 'open-admin') {
            setCurrentTab('admin');
          }
        }}
      />
      <AuthModal isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)} activeUser={activeUser} registeredUsers={registeredUsers} onRegisterUser={handleRegisterUser} onSelectUser={handleSelectUser} onShowToast={showToast} />
      <GoogleSheetsModal isOpen={isSheetsModalOpen} onClose={() => setIsSheetsModalOpen(false)} user={googleUser} spreadsheet={spreadsheet} onConnectGoogle={handleConnectGoogle} onDisconnectGoogle={handleDisconnectGoogle} isConnecting={isConnectingGoogle} accessToken={googleToken} onShowToast={showToast} onImportReciters={handleImportReciters} onExportAll={handleExportAllReciters} />
      <DeptHXPasscodeModal isOpen={isDeptHXPinModalOpen} onClose={() => { setIsDeptHXPinModalOpen(false); if (!isDeptHXUnlocked && (currentTab === 'dept-hx' || currentTab === 'hq-admin')) { setCurrentTab(currentRole === 'admin' ? 'admin' : 'worship'); } }} onSuccess={() => { setIsDeptHXUnlocked(true); setCurrentTab('dept-hx'); }} onShowToast={showToast} registeredUsers={registeredUsers} />
      {toastMessage && (
        <div className="fixed bottom-20 inset-x-4 mx-auto w-fit max-w-md z-[90] bg-[#293040] text-[#edf0ff] px-3.5 py-2 rounded-2xl shadow-xl flex items-center gap-2 transition-all animate-in fade-in slide-in-from-bottom-2 duration-200">
          <span className="material-symbols-outlined text-[17px] text-[#92f7c3] shrink-0">check_circle</span>
          <span className="text-xs font-semibold leading-snug line-clamp-2">{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
