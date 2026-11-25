import { ActiveUser } from '../types';

/**
 * Helper to get local date string YYYY-MM-DD
 * Using local time avoids UTC day shifting across timezones (e.g. WIB / UTC+7).
 */
export function getLocalDateString(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getYesterdayDateString(date: Date = new Date()): string {
  const yesterday = new Date(date);
  yesterday.setDate(yesterday.getDate() - 1);
  return getLocalDateString(yesterday);
}

export interface StreakCalculationResult {
  streakDays: number;
  longestStreak: number;
  lastActiveDate: string;
  activeDates: string[];
  isNewDayStreak: boolean;
  statusMessage: string;
}

/**
 * Validates that a completion record was genuinely completed on the target local calendar date (YYYY-MM-DD).
 * Prevents yesterday's completions (e.g. from UTC vs WIB timezone offset) from appearing checked on a new day.
 */
export function isCompletionValidForDate(
  comp: { completed?: boolean; completedAt?: string } | undefined,
  targetDateStr: string
): boolean {
  if (!comp || !comp.completed) return false;
  if (!comp.completedAt) return false;
  const parsed = new Date(comp.completedAt);
  if (Number.isNaN(parsed.getTime())) return false;
  return getLocalDateString(parsed) === targetDateStr;
}

/**
 * Checks whether the user has completed at least one ibadah task or recitation today (local calendar day).
 */
export function hasUserCompletedIbadahToday(userId: string, user?: ActiveUser): boolean {
  try {
    const todayStr = getLocalDateString();

    if (user?.dailyCompletions) {
      const fromCloudLocal = user.dailyCompletions[todayStr];
      if (
        fromCloudLocal &&
        Object.values(fromCloudLocal).some((c) => isCompletionValidForDate(c, todayStr))
      ) {
        return true;
      }
    }

    const raw = localStorage.getItem(`noorworship_completions_${userId}_${todayStr}`);
    if (raw) {
      const completions: Record<string, { completed?: boolean; completedAt?: string }> = JSON.parse(raw);
      if (Object.values(completions).some((c) => isCompletionValidForDate(c, todayStr))) {
        return true;
      }
    }
    return false;
  } catch {
    return false;
  }
}

/**
 * Evaluates current streak on app load without mutating unless day has lapsed.
 */
export function evaluateStreakOnLoad(user: ActiveUser): {
  currentStreak: number;
  isStreakAtRisk: boolean;
  isActiveToday: boolean;
} {
  const today = getLocalDateString();
  const yesterday = getYesterdayDateString();
  const lastActive = user.lastActiveDate;
  const isDoneToday = lastActive === today || hasUserCompletedIbadahToday(user.id, user);

  if (isDoneToday) {
    return {
      currentStreak: Math.max(1, user.streakDays || 1),
      isStreakAtRisk: false,
      isActiveToday: true,
    };
  }

  // Never completed any activity yet -> starts at 0
  if (!lastActive) {
    return {
      currentStreak: user.streakDays || 0,
      isStreakAtRisk: false,
      isActiveToday: false,
    };
  }

  // Active yesterday, today is still pending
  if (lastActive === yesterday) {
    return {
      currentStreak: user.streakDays || 0,
      isStreakAtRisk: true,
      isActiveToday: false,
    };
  }

  // Missed more than 1 day
  const diffDays = Math.floor(
    (new Date(today).getTime() - new Date(lastActive).getTime()) / (1000 * 60 * 60 * 24)
  );

  if (diffDays > 1) {
    return {
      currentStreak: 0, // Streak reset due to inactivity
      isStreakAtRisk: true,
      isActiveToday: false,
    };
  }

  return {
    currentStreak: user.streakDays || 0,
    isStreakAtRisk: true,
    isActiveToday: false,
  };
}

/**
 * Updates streak when a user completes a daily ibadah (prayer, dhikr, fasting, recitation).
 */
export function recordDailyActivityStreak(user: ActiveUser): StreakCalculationResult {
  const today = getLocalDateString();
  const yesterday = getYesterdayDateString();
  const lastActive = user.lastActiveDate;
  const currentStreak = user.streakDays || 0;
  const longestStreak = user.longestStreak || currentStreak || 1;
  const activeDates = Array.isArray(user.activeDates) ? [...user.activeDates] : [];

  if (!activeDates.includes(today)) {
    activeDates.push(today);
  }

  // Keep last 60 days
  if (activeDates.length > 60) {
    activeDates.splice(0, activeDates.length - 60);
  }

  // 1. Already recorded activity today
  if (lastActive === today) {
    return {
      streakDays: Math.max(1, currentStreak),
      longestStreak: Math.max(longestStreak, currentStreak),
      lastActiveDate: today,
      activeDates,
      isNewDayStreak: false,
      statusMessage: `Alhamdulillah! Ibadah hari ini bertambah. Runtutan ${currentStreak} hari aktif.`,
    };
  }

  // 2. Active yesterday -> streak increment
  if (lastActive === yesterday) {
    const newStreak = currentStreak + 1;
    const newLongest = Math.max(longestStreak, newStreak);
    return {
      streakDays: newStreak,
      longestStreak: newLongest,
      lastActiveDate: today,
      activeDates,
      isNewDayStreak: true,
      statusMessage: `🔥 MashaAllah! Runtutan istiqamah bertambah: ${newStreak} hari berturut-turut!`,
    };
  }

  // 3. First time or account with pre-set streak
  if (!lastActive) {
    // Preserve initial onboarding streak (e.g. 7 or 12 days) or start at 1
    const newStreak = currentStreak > 0 ? currentStreak + 1 : 1;
    const newLongest = Math.max(longestStreak, newStreak);
    return {
      streakDays: newStreak,
      longestStreak: newLongest,
      lastActiveDate: today,
      activeDates,
      isNewDayStreak: true,
      statusMessage: `🔥 Bismillah! Runtutan amalan berlanjut: ${newStreak} hari berturut-turut.`,
    };
  }

  // 4. Inactivity of 2+ days -> Restart streak to 1
  return {
    streakDays: 1,
    longestStreak: Math.max(longestStreak, 1),
    lastActiveDate: today,
    activeDates,
    isNewDayStreak: true,
    statusMessage: `Bismillah! Memulai kembali runtutan amalan: Hari ke-1. Tetap istiqamah!`,
  };
}

export interface DayOverview {
  dayName: string;
  dayShort: string;
  dateNumber: number;
  dateStr: string;
  isActive: boolean;
  isToday: boolean;
  isFuture: boolean;
}

/**
 * Builds the 7-day overview for the current week or the last 7 days.
 */
export function getWeeklyStreakDays(user: ActiveUser): DayOverview[] {
  const today = new Date();
  const todayStr = getLocalDateString(today);
  const activeDates = new Set(user.activeDates || []);

  // If user has lastActiveDate === today or completions today, ensure today is in set
  if (user.lastActiveDate === todayStr || hasUserCompletedIbadahToday(user.id, user)) {
    activeDates.add(todayStr);
  }

  const days: DayOverview[] = [];
  const dayNames = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
  const dayNamesFull = ['Ahad', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

  // Calculate past 6 days + today
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(today.getDate() - i);
    const dateStr = getLocalDateString(d);
    const dayOfWeek = d.getDay();

    days.push({
      dayName: dayNamesFull[dayOfWeek],
      dayShort: dayNames[dayOfWeek],
      dateNumber: d.getDate(),
      dateStr,
      isActive: activeDates.has(dateStr),
      isToday: dateStr === todayStr,
      isFuture: false,
    });
  }

  return days;
}
