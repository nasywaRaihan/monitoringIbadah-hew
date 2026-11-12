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
 * Checks whether the user has completed at least one ibadah task or recitation today.
 */
export function hasUserCompletedIbadahToday(userId: string): boolean {
  try {
    const todayStr = getLocalDateString();
    const userCompletionKey = `noorworship_completions_${userId}_${todayStr}`;
    const raw = localStorage.getItem(userCompletionKey);
    if (!raw) return false;
    const completions: Record<string, { completed?: boolean }> = JSON.parse(raw);
    return Object.values(completions).some((c) => c && c.completed === true);
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
  const isDoneToday = lastActive === today || hasUserCompletedIbadahToday(user.id);

  if (isDoneToday) {
    return {
      currentStreak: user.streakDays || 1,
      isStreakAtRisk: false,
      isActiveToday: true,
    };
  }

  // Not done today yet
  if (!lastActive || lastActive === yesterday) {
    // Yesterday was active, today is still pending
    return {
      currentStreak: user.streakDays || 1,
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
    currentStreak: user.streakDays || 1,
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
  if (user.lastActiveDate === todayStr || hasUserCompletedIbadahToday(user.id)) {
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
