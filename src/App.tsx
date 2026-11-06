import React, { useState, useEffect, useMemo } from 'react';
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
  getDoc
} from 'firebase/firestore';
import { db } from './services/firebase';
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
import { getStoredStandardAmalan } from './services/amalanPaten';

export default function App() {
  // Splash & Authentication Lifecycle State
  const [isSplashVisible, setIsSplashVisible] = useState<boolean>(true);
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('noorworship_is_logged_in');
      return saved === 'true';
    } catch {
      return false;
    }
  });

  // Registered Users Directory with pre-assigned halaqah by Dept HX
  const DEFAULT_USERS: ActiveUser[] = [
    {
      id: 'user-zubair',
      name: 'Zubair Ahmed',
      halaqah: 'Halaqah Al-Fajr',
      halaqahCode: 'HF-4092',
      passcode: '1234',
      avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDD9rhoZ_oKw2kaX_ib087jl58ZWxEyxXJe-f4-lkyam50XjJD1y4vmoJo_OP09N6wOgiWdvpNv5yr2G5JpuvLbm3TjeqXW0MHbuS6TtuFe6htOFVs18a00iBznKV3vany3LAk28L6AP7NVZ7sHf96ricgJ9NAjW7IvzR3eOOx6e1jpn11EVj5B7ar7C5WcI3CuYTneLk3RmV3-rVsJ7YE27-9cIjSlc_qil1T1R8WayBovHjw6vbVCog',
      role: 'member',
      totalXp: 1420,
      streakDays: 7,
      supervisor: 'Ustadz Farhan',
      assignedHalaqahBy: 'Dept HX',
      hxAssignmentId: 'HX-2026-081',
      hxStatus: 'Resmi Dept HX'
    },
    {
      id: 'user-farhan',
      name: 'Ustadz Farhan',
      halaqah: 'Halaqah Al-Fajr',
      halaqahCode: 'HF-4092',
      passcode: '1234',
      avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuByNNGi_lD7Io3zG-zuX1aVUKDmzjOoc5-OcbzMeGp_VokoCj0ecHRfr2rPFeoV-YkFob6LvNNTHtptfMgKsKgthT1j38bvvTncB9crVDK12gZ75nLsO6m-Bu-El2MGndKztg11ZOCqNWZizJ9bXROCHpppamkoNS1TKKo2NsFPVYqbfcBOWFHTiykrTC70Ubm-xxgZwE9emuyiY1s3kbTQOIuH8ryqG7XWp6Ni31JxpRbEz8d69w6Pmw',
      role: 'admin',
      totalXp: 3420,
      streakDays: 30,
      supervisor: 'Direktorat Dept HX',
      assignedHalaqahBy: 'Dept HX',
      hxAssignmentId: 'HX-2026-001',
      hxStatus: 'Resmi Dept HX'
    },
    {
      id: 'user-tariq',
      name: 'Tariq Mansoor',
      halaqah: 'Hafiz Circle',
      halaqahCode: 'HC-1108',
      passcode: '1234',
      avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBk9LWZ-0dEg9IaUBzxXTxLUfqZoGy8Q_Gyq5eDi0id422l1gTQRXmu7w2IRUuHKnuIIKDQfz0IqBGjhZolSIVvibJWwQh9isFTPI1q30Rtimj2C28zuAiMh9aejCr8Mrm22bx69cIaYiDngzNd-7HRJwZMIdc1HT_JjbH1nfrbjhcqmM4hG6bGivGECaOerT1I6Qr9T25Ia-I4lI1Bm2PPZWQ4GhNd14lU0olP2lEoLJjkI3TVKVwjYg',
      role: 'admin',
      totalXp: 2850,
      streakDays: 28,
      supervisor: 'Direktorat Dept HX',
      assignedHalaqahBy: 'Dept HX',
      hxAssignmentId: 'HX-2026-004',
      hxStatus: 'Resmi Dept HX'
    },
    {
      id: 'user-zayd',
      name: 'Zayd Al-Amin',
      halaqah: 'Halaqah Al-Fajr',
      halaqahCode: 'HF-4092',
      passcode: '1234',
      avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDFaQMyKnk2iLn9PRfVmgzOfoHE-e58Ab-VQMcTGdrxacm8wwW5nVi98gYcmjd_aHSNCKD0sbLlHflF6AoNGqxQ_Qheo_UDWOWgK1ivvZ9y8uvq7cdAjlrY5W6ibzXVRWlgMIxEXSbSK4NBiLsJ_1i-PslkBNixofnYzQWHbJhPmdsvZPmjWmq9Gf7Q02c1TuG4PIm9KXJKPp4IwrwHIie0wPPqYICwOCcU4f0tryN4MvTSkghJ6IZD_Q',
      role: 'member',
      totalXp: 2410,
      streakDays: 12,
      supervisor: 'Ustadz Farhan',
      assignedHalaqahBy: 'Dept HX',
      hxAssignmentId: 'HX-2026-092',
      hxStatus: 'Resmi Dept HX'
    },
    {
      id: 'user-dept-hx',
      name: 'Direktorat Dept HX',
      halaqah: 'Dept HX Pusat',
      halaqahCode: 'HX-HQ-01',
      passcode: '1234',
      avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCPpztXYvKG0hnmCFJGCCU0xwy2MPvneIXXKJ1BW4Rtejtyzgr02Vo9Su5UxcVuZz3-GF8hPwRY0_1vZl5PVdpW10j8rqRMIipsU_h8mEvEcJShkcDH86v76LYWTlWzju8eCZDjvFPYoqOVoLWKjpOXfZWK3-4DbGikcXmtwS-5rGtyiOB3ejK_8RqWALFKRcTWhwJTWUpwoH36hhTTWYZyTPHbKBimBp0b-0er8SFXjKlDEMOCN2_0Qg',
      role: 'dept-hx',
      totalXp: 9990,
      streakDays: 45,
      supervisor: 'Direktorat Dept HX Pusat',
      assignedHalaqahBy: 'Dept HX',
      hxAssignmentId: 'HX-2026-HQ',
      hxStatus: 'Resmi Dept HX'
    }
  ];

  const [registeredUsers, setRegisteredUsers] = useState<ActiveUser[]>(() => {
    try {
      const saved = localStorage.getItem('noorworship_registered_users_v2');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.warn('Could not load saved users from localStorage', e);
    }
    return DEFAULT_USERS;
  });

  const [activeUser, setActiveUser] = useState<ActiveUser>(() => {
    try {
      const saved = localStorage.getItem('noorworship_active_user_v2');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.id) return parsed;
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
          return parsed.filter(
            (t: DailyTask) =>
              t.id !== 'task-4' &&
              !t.title.toLowerCase().includes('shalat zhuhur di masjid')
          );
        }
      }
    } catch (e) {
      console.warn(e);
    }
    return INITIAL_DAILY_TASKS;
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

  // Real-time listener for Firestore users
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'users'), (snapshot) => {
      const firestoreUsers: ActiveUser[] = [];
      snapshot.forEach((docSnap) => {
        firestoreUsers.push({ id: docSnap.id, ...docSnap.data() } as ActiveUser);
      });

      if (firestoreUsers.length > 0) {
        setRegisteredUsers((prev) => {
          const userMap = new Map<string, ActiveUser>();
          DEFAULT_USERS.forEach((u) => userMap.set(u.id, u));
          prev.forEach((u) => userMap.set(u.id, u));
          firestoreUsers.forEach((u) => userMap.set(u.id, u));
          return Array.from(userMap.values());
        });
      }
    });
    return () => unsub();
  }, []);

  // Halaqah Attendance Sessions (Ustadz & Dept HX unified real-time sync)
  const [attendanceSessions, setAttendanceSessions] = useState<HalaqahAttendanceSession[]>(() => {
    try {
      const saved = localStorage.getItem('noorworship_attendance_sessions_v1');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
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
        if (!snap.empty) {
          const sessions: HalaqahAttendanceSession[] = [];
          snap.forEach((d) => {
            sessions.push({ id: d.id, ...d.data() } as HalaqahAttendanceSession);
          });
          sessions.sort((a, b) => new Date(b.createdAt || b.date).getTime() - new Date(a.createdAt || a.date).getTime());
          setAttendanceSessions(sessions);
          try {
            localStorage.setItem('noorworship_attendance_sessions_v1', JSON.stringify(sessions));
          } catch (e) {}
        }
      },
      (err) => {
        console.warn('Firestore attendanceSessions snapshot listener error (fallback to local):', err);
      }
    );

    return () => unsub();
  }, []);

  const handleSaveAttendanceSession = async (session: HalaqahAttendanceSession) => {
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
        localStorage.setItem('noorworship_attendance_sessions_v1', JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });

    // 2. Persist to Firestore
    try {
      // Remove any undefined fields to prevent FirebaseError
      const sanitizedSession = JSON.parse(JSON.stringify(session));
      await setDoc(doc(db, 'halaqahAttendanceSessions', session.id), {
        ...sanitizedSession,
        syncedWithHX: true,
        updatedAt: new Date().toISOString()
      }, { merge: true });
    } catch (e) {
      console.error('Error saving attendance session to Firestore:', e);
    }

    // 3. Award XP to attendee members who are 'hadir'
    if (session.members && session.members.length > 0) {
      const attendees = session.members.filter((m) => m.status === 'hadir');
      if (attendees.length > 0) {
        setRegisteredUsers((prev) =>
          prev.map((u) => {
            const found = attendees.find((a) => a.userId === u.id);
            if (found) {
              const bonus = 15;
              const newXp = (u.totalXp || 0) + bonus;
              setDoc(doc(db, 'users', u.id), { totalXp: newXp }, { merge: true }).catch(() => {});
              return { ...u, totalXp: newXp };
            }
            return u;
          })
        );
      }
    }

    showToast(`Presensi ${session.halaqahName} berhasil disimpan & disinkronkan ke Dept HX!`);
  };

  const handleDeleteAttendanceSession = async (sessionId: string) => {
    // 1. Update state & localStorage
    setAttendanceSessions((prev) => {
      const updated = prev.filter((s) => s.id !== sessionId);
      try {
        localStorage.setItem('noorworship_attendance_sessions_v1', JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });

    // 2. Delete from Firestore
    try {
      await deleteDoc(doc(db, 'halaqahAttendanceSessions', sessionId));
      showToast('Sesi presensi berhasil dihapus.');
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
        directives.push({ id: docSnap.id, ...docSnap.data() } as IbadahDirective);
      });
      setIbadahDirectives(directives);
    });
    return () => unsub();
  }, []);

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

  // Merge 11 Amalan Paten Dept HX + Ustadz directives for activeUser
  useEffect(() => {
    if (!activeUser) return;

    const todayStr = new Date().toISOString().split('T')[0];
    const userCompletionKey = `noorworship_completions_${activeUser.id}_${todayStr}`;
    let userCompletions: Record<string, { completed: boolean; xp?: number; note?: string }> = {};
    try {
      const raw = localStorage.getItem(userCompletionKey);
      if (raw) userCompletions = JSON.parse(raw);
    } catch (e) {}

    // 1. Amalan Paten Dept HX (11 Baku)
    const patenItems = getStoredStandardAmalan().filter((p) => p.isActive);
    const patenTasks: DailyTask[] = patenItems.map((p) => {
      const taskId = `paten-${p.id}`;
      const comp = userCompletions[taskId];
      return {
        id: taskId,
        title: p.title,
        category: p.category,
        xp: comp?.xp !== undefined ? comp.xp : p.baseXp,
        completed: comp?.completed || false,
        isPatenHX: true,
        prayerId: p.prayerId,
        hasJamaahOption: p.hasJamaahOption,
        isFastingTask: p.isFastingTask,
        timeWindowInfo: p.timeWindowDescription,
        note: comp?.note || p.note
      };
    });

    // 2. Ustadz Directives for activeUser's halaqah
    const ustadzTasks: DailyTask[] = ibadahDirectives
      .filter((d) => d.status === 'Aktif')
      .filter((d) => {
        const target = (d as any).targetHalaqah;
        return !target || target === 'Semua Halaqah' || target === 'Semua' || target === activeUser.halaqah;
      })
      .map((d) => {
        const taskId = `task-directive-${d.id}`;
        const submission = d.submissions?.find((s) => s.studentId === activeUser.id);
        const comp = userCompletions[taskId];
        const isDone = submission?.isCompleted || comp?.completed || false;
        const validityDays = d.type === 'yaumiyah' ? 1 : 7;

        return {
          id: taskId,
          directiveId: d.id,
          title: d.title,
          category: d.category,
          xp: comp?.xp !== undefined ? comp.xp : d.xp,
          completed: isDone,
          isAssigned: true,
          isRecitationTest: (d as any).isRecitationTest || false,
          isRecurring: d.isRecurring ?? true,
          type: d.type,
          validityDays: d.validityDays || validityDays,
          expiresAt: d.expiresAt,
          note: comp?.note || d.target,
          targetHalaqah: (d as any).targetHalaqah || activeUser.halaqah
        };
      });

    setTasks([...patenTasks, ...ustadzTasks]);
  }, [ibadahDirectives, activeUser?.id, activeUser?.halaqah]);


  const [isNotificationsOpen, setIsNotificationsOpen] = useState<boolean>(false);
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
      localStorage.setItem('noorworship_registered_users_v2', JSON.stringify(registeredUsers));
    } catch (e) {
      console.warn('Failed saving users to localStorage', e);
    }
  }, [registeredUsers]);

  useEffect(() => {
    try {
      localStorage.setItem('noorworship_active_user_v2', JSON.stringify(activeUser));
    } catch (e) {
      console.warn('Failed saving active user to localStorage', e);
    }
  }, [activeUser]);

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
  }) => {
    const newUser: ActiveUser = {
      id: `user-${Date.now()}`,
      name: newUserData.name,
      halaqah: newUserData.halaqah,
      halaqahCode: newUserData.halaqahCode,
      passcode: newUserData.passcode,
      phone: newUserData.phone,
      avatar: BRAND_ASSETS.currentUserAvatar,
      role: newUserData.role,
      totalXp: 50,
      streakDays: 1,
      assignedHalaqahBy: 'Dept HX',
      hxAssignmentId: `HX-${Date.now().toString().slice(-4)}`,
      hxStatus: 'Resmi Dept HX',
      supervisor: 'Ustadz Pembimbing (SK Dept HX)'
    };

    setRegisteredUsers((prev) => [newUser, ...prev]);
    
    try {
      await setDoc(doc(db, 'users', newUser.id), newUser);
    } catch (e) {
      console.error('Error registering user in Firestore:', e);
    }

    setActiveUser(newUser);
    setTotalXp(newUser.totalXp);
    setStreakDays(newUser.streakDays);
    setCurrentRole(newUser.role);
    setIsLoggedIn(true);
    try {
      localStorage.setItem('noorworship_is_logged_in', 'true');
      localStorage.setItem('noorworship_active_user_v2', JSON.stringify(newUser));
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
          newUser.role === 'admin' ? 'Ustadz / Supervisor' : 'Karyawan Baru (Dept HX)',
          '95.0%',
          '1/1',
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
  }) => {
    const newUser: ActiveUser = {
      id: `user-${Date.now()}`,
      name: newUserData.name,
      halaqah: newUserData.halaqah,
      halaqahCode: newUserData.halaqahCode,
      passcode: newUserData.passcode || '1234',
      phone: newUserData.phone,
      avatar: BRAND_ASSETS.currentUserAvatar,
      role: newUserData.role,
      totalXp: 150,
      streakDays: 1,
      assignedHalaqahBy: 'Dept HX',
      hxAssignmentId: `HX-${Date.now().toString().slice(-4)}`,
      hxStatus: 'Resmi Dept HX',
      supervisor: 'Ustadz Pembimbing (SK Dept HX)'
    };

    setRegisteredUsers((prev) => [newUser, ...prev]);

    try {
      await setDoc(doc(db, 'users', newUser.id), newUser);
    } catch (e) {
      console.error('Error registering santri in Firestore:', e);
    }

    if (googleToken && spreadsheet) {
      try {
        await appendRow(googleToken, spreadsheet.id, 'RecitersRoster', [
          newUser.id,
          newUser.name,
          newUser.halaqah,
          newUser.role === 'admin' ? 'Ustadz / Supervisor' : 'Karyawan Baru (Dept HX)',
          '95.0%',
          '1/1',
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

  const handleImportReciters = async (records: ImportedReciterRecord[]) => {
    if (!records || records.length === 0) return;

    let currentHalaqahs: any[] = [];
    try {
      const saved = localStorage.getItem('noorworship_unified_halaqahs_v2');
      if (saved) currentHalaqahs = JSON.parse(saved);
      else currentHalaqahs = [...DEFAULT_BASE_HALAQAHS];
    } catch {
      currentHalaqahs = [...DEFAULT_BASE_HALAQAHS];
    }

    const createdUsers: ActiveUser[] = [];
    const newHalaqahNames: string[] = [];

    for (const record of records) {
      if (!record.name || !record.name.trim()) continue;
      const cleanName = record.name.trim();
      const cleanHalaqah = (record.halaqah || 'Halaqah Al-Fajr').trim();
      const cleanSupervisor = (record.supervisor || 'Ustadz Pembimbing').trim();
      const cleanPasscode = (record.passcode || '1234').trim();

      let halaqahCode = 'HF-4092';
      const existingHalaqah = currentHalaqahs.find(
        (h) => h.name.toLowerCase() === cleanHalaqah.toLowerCase()
      );
      if (existingHalaqah) {
        halaqahCode = existingHalaqah.code;
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
          name: cleanHalaqah,
          code: randomCode,
          supervisor: cleanSupervisor,
          schedule: 'Senin & Kamis 05:30 WIB',
          location: 'Masjid Al-Ikhlas',
          department: 'Dept HX',
          description: `Halaqah binaan ${cleanSupervisor}`,
          targetJuz: 'Juz 30 & Tahsin'
        });
        if (!newHalaqahNames.includes(cleanHalaqah)) {
          newHalaqahNames.push(cleanHalaqah);
        }
      }

      const newUser: ActiveUser = {
        id: `user-import-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        name: cleanName,
        halaqah: cleanHalaqah,
        halaqahCode: halaqahCode,
        passcode: cleanPasscode,
        phone: record.phone || '',
        avatar: BRAND_ASSETS.currentUserAvatar,
        role: 'member',
        totalXp: 150,
        streakDays: 1,
        assignedHalaqahBy: 'Import Dept HX',
        hxAssignmentId: `HX-${Date.now().toString().slice(-4)}`,
        hxStatus: 'Resmi Dept HX',
        supervisor: cleanSupervisor
      };

      createdUsers.push(newUser);
      try {
        await setDoc(doc(db, 'users', newUser.id), newUser);
      } catch (err) {
        console.warn('Firestore user save notice:', err);
      }
    }

    if (createdUsers.length > 0) {
      setRegisteredUsers((prev) => [...createdUsers, ...prev]);
      try {
        localStorage.setItem(
          'noorworship_unified_halaqahs_v2',
          JSON.stringify(currentHalaqahs)
        );
      } catch (e) {
        console.warn(e);
      }
      window.dispatchEvent(new Event('noorworship_halaqah_updated'));
      showToast(
        `Alhamdulillah! Berhasil mengimpor ${createdUsers.length} data karyawan${
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
      'Ustadz Pembimbing',
      'Status Akun',
      'Streak Hari',
      'Total XP',
      'Kode Halaqah'
    ];
    const rows = registeredUsers.map((u, idx) => [
      idx + 1,
      u.name,
      u.halaqah,
      u.supervisor || 'Ustadz Pembimbing',
      u.role === 'admin' ? 'Ustadz / Pembimbing' : 'Karyawan Aktif',
      u.streakDays,
      u.totalXp,
      u.halaqahCode || '-'
    ]);
    downloadPerColumnCSV('Data_Karyawan_NoorWorship_Lokal', headers, rows, 'Karyawan');
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
          setDoc(doc(db, 'users', studentId), updated, { merge: true }).catch((e) => {
            console.error('Error updating user halaqah in Firestore:', e);
          });
          return updated;
        }
        return u;
      })
    );
  };

  const handleRenameHalaqahForAll = async (oldName: string, newName: string, newCode?: string) => {
    setRegisteredUsers((prev) =>
      prev.map((u) => {
        if (u.halaqah === oldName) {
          const updated = {
            ...u,
            halaqah: newName,
            ...(newCode ? { halaqahCode: newCode } : {})
          };
          setDoc(doc(db, 'users', u.id), updated, { merge: true }).catch((e) => {
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
      localStorage.setItem('noorworship_is_logged_in', 'true');
      localStorage.setItem('noorworship_active_user_v2', JSON.stringify(selected));
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
      localStorage.removeItem('noorworship_is_logged_in');
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
        showToast(`Terhubung! Spreadsheet "NoorWorship - Database & Rekap Halaqah" siap.`);
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

    const todayStr = new Date().toISOString().split('T')[0];
    const userCompletionKey = `noorworship_completions_${activeUser.id}_${todayStr}`;
    let userCompletions: Record<string, { completed: boolean; xp?: number; note?: string }> = {};
    try {
      const raw = localStorage.getItem(userCompletionKey);
      if (raw) userCompletions = JSON.parse(raw);
    } catch (e) {}

    const finalXp = extraDetails?.earnedXp !== undefined ? extraDetails.earnedXp : task.xp;
    const fastingNoteStr = extraDetails?.fastingNote ? ` (Niat: ${extraDetails.fastingNote})` : '';

    userCompletions[taskId] = {
      completed: true,
      xp: finalXp,
      note: (task.note || '') + fastingNoteStr
    };

    try {
      localStorage.setItem(userCompletionKey, JSON.stringify(userCompletions));
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

    const newXp = totalXp + finalXp;
    setTotalXp(newXp);
    const updatedUser = { ...activeUser, totalXp: newXp };
    setActiveUser(updatedUser);

    try {
      await setDoc(doc(db, 'users', activeUser.id), { totalXp: newXp }, { merge: true });
      localStorage.setItem('noorworship_active_user_v2', JSON.stringify(updatedUser));
    } catch (e) {
      console.error('Error syncing user XP:', e);
    }

    if (task.directiveId) {
      const submissionRef = doc(db, `ibadahDirectives/${task.directiveId}/submissions`, activeUser.id);
      try {
        await setDoc(
          submissionRef,
          {
            studentId: activeUser.id,
            studentName: activeUser.name,
            studentAvatar: activeUser.avatar || '',
            halaqah: activeUser.halaqah || '',
            isCompleted: true,
            completedAt: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB'
          },
          { merge: true }
        );
      } catch (e) {
        console.error('Error updating Firestore submission:', e);
      }
    }

    showToast(`Alhamdulillah! +${finalXp} XP diraih untuk amalan "${task.title}" (terkunci)`);

    if (googleToken && spreadsheet) {
      try {
        await logDailyTaskToSheets(googleToken, spreadsheet.id, task.title, task.category, finalXp, activeUser.name);
      } catch (e) {
        console.error('Error logging to Sheets:', e);
      }
    }
  };

  const handleAddTask = async (newTask: DailyTask) => {
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
      const newDirective = {
        id: directiveId,
        type: 'yaumiyah',
        title: newTask.title,
        target: newTask.note || 'Target amalan dari Ustadz',
        xp: newTask.xp || 50,
        compliancePercent: 0,
        status: 'Aktif',
        category: newTask.category || 'Sunnah Harian',
        targetHalaqah: targetHalaqah,
        createdBy: activeUser?.name || 'Ustadz Pembimbing',
        createdAt: newTask.createdAt || new Date().toISOString()
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
          notes: 'Tugas baru diterbitkan ustadz'
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
      // Ustadz evaluation: Adds XP to Karyawan for Klasemen!
      setRegisteredUsers((prev) =>
        prev.map((usr) => {
          if (usr.id === targetStudentId) {
            const updatedStudent = { ...usr, totalXp: (usr.totalXp || 0) + earnedXp };
            setDoc(doc(db, 'users', targetStudentId), updatedStudent, { merge: true }).catch((e) => {
              console.error('Error syncing student XP to Firestore:', e);
            });
            return updatedStudent;
          }
          return usr;
        })
      );
      showToast(`Alhamdulillah! Nilai tilawah Ustadz untuk ${details?.studentName || 'Karyawan'} tersimpan (+${earnedXp} XP Klasemen).`);
    } else if (!isDeptHX && !isUstadz) {
      // Regular employee self-tilawah submission (guided by Ustadz)
      const newXp = totalXp + earnedXp;
      setTotalXp(newXp);
      const updatedUser = { ...activeUser, totalXp: newXp };
      setActiveUser(updatedUser);
      try {
        await setDoc(doc(db, 'users', activeUser.id), updatedUser, { merge: true });
      } catch (e) {}
    }

    const todayStr = new Date().toISOString().split('T')[0];
    const userCompletionKey = `noorworship_completions_${activeUser.id}_${todayStr}`;
    let userCompletions: Record<string, { completed: boolean; xp?: number; note?: string }> = {};
    try {
      const raw = localStorage.getItem(userCompletionKey);
      if (raw) userCompletions = JSON.parse(raw);
    } catch (e) {}

    setTasks((prev) =>
      prev.map((t) => {
        const isRecitationTask = t.id === 'task-3' || t.isRecitationTest || t.category === 'Al-Qur’an' || t.category === 'Tilawah & Hifdz' || /setor|tilawah|alqur'an|quran/i.test(t.title);
        if (isRecitationTask) {
          userCompletions[t.id] = { completed: true, xp: t.xp, note: 'Telah disetor' };
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
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-[#293040] text-[#edf0ff] px-4 py-2.5 rounded-full shadow-xl flex items-center gap-2 transition-all animate-in fade-in slide-in-from-bottom-2 duration-200 max-w-sm text-center">
            <span className="material-symbols-outlined text-[18px] text-[#92f7c3] shrink-0">check_circle</span>
            <span className="text-xs font-semibold">{toastMessage}</span>
          </div>
        )}
      </>
    );
  }

  return (
    <div className="min-h-screen bg-[#f9f9ff] text-[#141b2b] flex flex-col font-sans selection:bg-[#c1ecd4] selection:text-[#012d1d]">
      <Header currentTab={currentTab} onOpenNotifications={() => setIsNotificationsOpen(true)} onOpenAuth={() => setIsAuthOpen(true)} onLogout={handleLogout} onOpenSplash={() => setIsSplashVisible(true)} onOpenSheets={() => setIsSheetsModalOpen(true)} isSheetsConnected={!!googleToken && !!spreadsheet} unreadCount={2} currentRole={currentRole} activeUser={activeUser} />
      <main className="flex-1 flex flex-col w-full">
        {currentTab === 'worship' && <WorshipScreen tasks={tasks} onToggleTask={handleToggleTask} onAddTask={handleAddTask} onDeleteTask={handleDeleteTask} totalXp={totalXp} streakDays={streakDays} onNavigateToRecitation={() => setCurrentTab('recitation')} onShowToast={showToast} activeUser={activeUser} onOpenAuth={() => setIsAuthOpen(true)} />}
        {currentTab === 'recitation' && <RecitationScreen onBack={() => { if (currentRole === 'admin') setCurrentTab('admin'); else if (currentRole === 'dept-hx' || currentRole === 'hq-admin') setCurrentTab('dept-hx'); else setCurrentTab('worship'); }} onSubmitRecitation={handleSubmitRecitation} onShowToast={showToast} currentRole={currentRole} activeUser={activeUser} registeredUsers={registeredUsers} googleToken={googleToken} spreadsheetId={spreadsheet?.id} />}
        {currentTab === 'leaderboard' && <LeaderboardScreen userXp={totalXp} userStreak={streakDays} onShowToast={showToast} activeUser={activeUser} onOpenAuth={() => setIsAuthOpen(true)} registeredUsers={registeredUsers} />}
        {currentTab === 'admin' && <AdminScreen onShowToast={showToast} onOpenSheets={() => setIsSheetsModalOpen(true)} isSheetsConnected={!!googleToken && !!spreadsheet} onOpenAuth={() => setIsAuthOpen(true)} onAddHalaqahTask={handleAddTask} activeUser={activeUser} registeredUsers={registeredUsers} ibadahDirectives={ibadahDirectives} setIbadahDirectives={setIbadahDirectives} attendanceSessions={attendanceSessions} onSaveAttendanceSession={handleSaveAttendanceSession} onDeleteAttendanceSession={handleDeleteAttendanceSession} />}
        {currentTab === 'students' && <HalaqahStudentsScreen activeUser={activeUser} registeredUsers={registeredUsers} onShowToast={showToast} />}
        {(currentTab === 'dept-hx' || currentTab === 'hq-admin') && ((isDeptHXUnlocked || currentRole === 'dept-hx' || currentRole === 'hq-admin') ? <HQAdminScreen ibadahDirectives={ibadahDirectives} onShowToast={showToast} onOpenSheets={() => setIsSheetsModalOpen(true)} isSheetsConnected={!!googleToken && !!spreadsheet} registeredUsers={registeredUsers} onOpenRegister={() => setIsAuthOpen(true)} onRegisterSantri={handleRegisterSantriByDeptHX} onDeleteSantri={handleDeleteSantriByDeptHX} onUpdateUserHalaqah={handleUpdateUserHalaqah} onRenameHalaqahForAll={handleRenameHalaqahForAll} onLockDeptHX={() => { setIsDeptHXUnlocked(false); setCurrentTab('leaderboard'); showToast('Akses Dept HX telah dikunci kembali.'); }} attendanceSessions={attendanceSessions} onSaveAttendanceSession={handleSaveAttendanceSession} onDeleteAttendanceSession={handleDeleteAttendanceSession} /> : (
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center max-w-md mx-auto my-auto space-y-4 min-h-[55vh]">
            <div className="w-16 h-16 rounded-3xl bg-[#012d1d] text-[#fed488] flex items-center justify-center shadow-lg mx-auto"><span className="material-symbols-outlined text-[32px]" style={{ fontVariationSettings: "'FILL' 1" }}>admin_panel_settings</span></div>
            <div><span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-[#1b4332]/10 text-[#00452c] text-xs font-bold uppercase tracking-wider mb-2"><span className="material-symbols-outlined text-[14px]">lock</span>Area Terbatas</span><h2 className="text-xl font-bold text-[#141b2b]">Otorisasi Dept HX Diperlukan</h2><p className="text-xs text-[#717973] mt-1.5 max-w-sm leading-relaxed">Halaman ini memuat kewenangan penataan struktur halaqah, manajemen amalan, dan penerbitan SK pembimbing. Masukkan kode otorisasi untuk mengakses.</p></div>
            <div className="flex items-center gap-2.5 w-full max-w-xs pt-2"><button onClick={() => setCurrentTab(currentRole === 'admin' ? 'admin' : 'worship')} className="flex-1 py-2.5 rounded-full bg-[#f1f3ff] hover:bg-[#e4e7ff] text-[#414844] text-xs font-bold transition-colors cursor-pointer">Kembali</button><button onClick={() => setIsDeptHXPinModalOpen(true)} className="flex-1 py-2.5 rounded-full bg-[#012d1d] hover:bg-[#1b4332] text-white text-xs font-bold transition-all shadow-md active:scale-95 cursor-pointer flex items-center justify-center gap-1.5"><span className="material-symbols-outlined text-[16px]">key</span><span>Masukkan Kode</span></button></div>
          </div>
        ))}
      </main>
      <BottomNav currentTab={currentTab} currentRole={currentRole} onChangeTab={(tab: TabType) => { if (tab === 'dept-hx' || tab === 'hq-admin') { if (!isDeptHXUnlocked && currentRole !== 'dept-hx' && currentRole !== 'hq-admin') { setIsDeptHXPinModalOpen(true); return; } } if (tab === 'admin' && currentRole === 'member') { showToast('Menu Dashboard hanya dapat diakses oleh Ustadz'); return; } if (tab === 'students' && currentRole === 'member') { showToast('Menu Karyawan hanya dapat diakses oleh Ustadz'); return; } if (tab === 'worship' && currentRole !== 'member') { return; } setCurrentTab(tab); }} />
      <NotificationsModal isOpen={isNotificationsOpen} onClose={() => setIsNotificationsOpen(false)} onAction={(action: string) => { if (action === 'open-recitation') { setCurrentTab('recitation'); } }} />
      <AuthModal isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)} activeUser={activeUser} registeredUsers={registeredUsers} onRegisterUser={handleRegisterUser} onSelectUser={handleSelectUser} onShowToast={showToast} />
      <GoogleSheetsModal isOpen={isSheetsModalOpen} onClose={() => setIsSheetsModalOpen(false)} user={googleUser} spreadsheet={spreadsheet} onConnectGoogle={handleConnectGoogle} onDisconnectGoogle={handleDisconnectGoogle} isConnecting={isConnectingGoogle} accessToken={googleToken} onShowToast={showToast} onImportReciters={handleImportReciters} onExportAll={handleExportAllReciters} />
      <DeptHXPasscodeModal isOpen={isDeptHXPinModalOpen} onClose={() => { setIsDeptHXPinModalOpen(false); if (!isDeptHXUnlocked && (currentTab === 'dept-hx' || currentTab === 'hq-admin')) { setCurrentTab(currentRole === 'admin' ? 'admin' : 'worship'); } }} onSuccess={() => { setIsDeptHXUnlocked(true); setCurrentTab('dept-hx'); }} onShowToast={showToast} />
      {toastMessage && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 bg-[#293040] text-[#edf0ff] px-4 py-2.5 rounded-full shadow-xl flex items-center gap-2 transition-all animate-in fade-in slide-in-from-bottom-2 duration-200 max-w-sm text-center">
          <span className="material-symbols-outlined text-[18px] text-[#92f7c3] shrink-0">check_circle</span>
          <span className="text-xs font-semibold">{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
