export type TabType = 'worship' | 'recitation' | 'leaderboard' | 'admin' | 'dept-hx' | 'hq-admin' | 'students';

export interface DailyTask {
  id: string;
  title: string;
  category: string;
  xp: number;
  completed: boolean;
  isVerified?: boolean;
  isAssigned?: boolean;
  isRecitationTest?: boolean;
  isLocked?: boolean;
  lockReason?: string;
  verses?: string;
  note?: string;
  targetHalaqah?: string;
  createdByRole?: 'admin' | 'dept-hx' | 'hq-admin';
  createdByName?: string;
  isCustomHalaqahTask?: boolean;
  createdAt?: string;
  directiveId?: string; // Links task to an Ustadz directive
  isRecurring?: boolean; // Whether task repeats daily/weekly or is one-off
  type?: 'yaumiyah' | 'usbu\'iyah';
  validityDays?: number; // 1 for yaumiyah, 7 for usbu'iyah
  expiresAt?: string;

  // Amalan Paten & Islamic Rules
  isPatenHX?: boolean;
  prayerId?: 'subuh' | 'zhuhur' | 'ashar' | 'maghrib' | 'isya' | 'dzikir-pagi' | 'sholat-dhuha' | 'dzikir-petang';
  hasJamaahOption?: boolean;
  isJamaah?: boolean;
  isFastingTask?: boolean;
  fastingType?: string;
  isLateSubmission?: boolean;
  penaltyApplied?: number;
  completedAtDate?: string;
  timeWindowInfo?: string;
}

export interface StudentTaskSubmission {
  studentId: string;
  studentName: string;
  studentAvatar: string;
  halaqah: string;
  isCompleted: boolean;
  completedAt?: string;
  notes?: string;
  verifiedByUstadz?: boolean;
}

export interface IbadahDirective {
  id: string;
  type: 'yaumiyah' | 'usbu\'iyah';
  title: string;
  target: string;
  xp: number;
  compliancePercent: number;
  status: 'Aktif' | 'Selesai';
  category: string;
  submissions?: StudentTaskSubmission[];
  isRecurring?: boolean; // Whether the directive auto-repeats or is single-period
  validityDays?: number; // 1 for yaumiyah, 7 for usbu'iyah
  expiresAt?: string;
  createdAt?: string;
}


export interface CommunityChallenge {
  id: string;
  title: string;
  author: string;
  authorAvatar: string;
  progressPercent: number;
  currentAmount?: string;
  targetAmount?: string;
  subtitle?: string;
  actionText: string;
  isCompleted?: boolean;
}

export interface RecitationWordDiagnostic {
  key: string;
  word: string;
  status: 'perfect' | 'correct' | 'warning' | 'error';
  tag: string;
  title: string;
  icon: string;
  body: string;
  audioHint: string;
  targetMetric?: string;
}

export interface LeaderboardUser {
  rank: number;
  name: string;
  xp: number;
  tajweedAcc: number;
  streak: number;
  avatar: string;
  isCurrentUser?: boolean;
  roleOrCircle?: string;
  badge?: string;
  todayGain?: string;
}

export interface ReciterProfile {
  id: string;
  name: string;
  group: string;
  supervisor: string;
  avatar: string;
  status: 'Mumtaz' | 'Top 1%' | 'Review Needed' | 'Jayyid Jiddan' | 'Youth League';
  isLive?: boolean;
  isFlagged?: boolean;
  flagMessage?: string;
  tajweedAcc: number;
  streakDays: number;
  totalXp: string;
  currentActivity: string;
  lastActive: string;
}

export interface ActiveUser {
  id: string;
  name: string;
  halaqah: string;
  halaqahCode: string;
  passcode: string;
  supervisor?: string;
  email?: string;
  phone?: string;
  avatar: string;
  role: 'member' | 'admin' | 'dept-hx' | 'hq-admin';
  totalXp: number;
  streakDays: number;
  lastActiveDate?: string;
  longestStreak?: number;
  activeDates?: string[];
  assignedHalaqahBy?: string; // 'Dept HX'
  hxAssignmentId?: string;
  hxStatus?: 'Resmi Dept HX' | 'Terdaftar';
}

export type AttendanceStatus = 'hadir' | 'izin' | 'sakit' | 'alpa';
export type UstadzAttendanceStatus = 'hadir' | 'izin' | 'sakit' | 'pengganti';

export interface MemberAttendance {
  userId: string;
  userName: string;
  userAvatar?: string;
  status: AttendanceStatus;
  notes?: string;
  markedAt?: string;
  xpAwarded?: number;
}

export interface HalaqahAttendanceSession {
  id: string;
  halaqahName: string;
  halaqahCode?: string;
  date: string;
  timeStr: string;
  sessionTitle: string;
  location: string;
  
  // Presensi Ustadz Pembimbing
  ustadzId: string;
  ustadzName: string;
  ustadzAvatar?: string;
  ustadzStatus: UstadzAttendanceStatus;
  ustadzNotes?: string;
  ustadzPenggantiName?: string;
  ustadzPenggantiKeterangan?: string;
  ustadzConfirmedAt?: string;

  // Presensi Anggota Halaqah
  members: MemberAttendance[];

  // Statistik & Rekap
  totalMembers: number;
  presentCount: number;
  attendanceRate: number;
  
  createdAt: string;
  updatedAt?: string;
  syncedWithHX: boolean;
}
