import { calculatePrayerTimes, DEFAULT_INDONESIAN_REGIONS, RegionLocation } from './prayerTimes';

export interface StandardAmalanHX {
  id: string;
  title: string;
  category: string;
  baseXp: number;
  jamaahBonusXp?: number;
  hasJamaahOption?: boolean;
  prayerId?: 'subuh' | 'zhuhur' | 'ashar' | 'maghrib' | 'isya' | 'dzikir-pagi' | 'sholat-dhuha' | 'dzikir-petang';
  timeWindowDescription: string;
  isFastingTask?: boolean;
  isActive: boolean;
  recurrence: 'daily' | 'specific_days';
  penaltyLateXp?: number;
  note?: string;
  order: number;
}

export const FIVE_FARDHU_PRAYER_IDS = new Set(['subuh', 'zhuhur', 'ashar', 'maghrib', 'isya']);

export function isFiveDailyFardhuPrayer(item?: {
  id?: string;
  prayerId?: string;
  title?: string;
  hasJamaahOption?: boolean;
} | null): boolean {
  if (!item) return false;
  if (item.prayerId && FIVE_FARDHU_PRAYER_IDS.has(item.prayerId)) {
    return true;
  }
  const cleanId = (item.id || '').toLowerCase();
  if (
    cleanId.includes('sholat-subuh') ||
    cleanId.includes('sholat-dzuhur') ||
    cleanId.includes('sholat-zhuhur') ||
    cleanId.includes('sholat-ashar') ||
    cleanId.includes('sholat-maghrib') ||
    cleanId.includes('sholat-isya')
  ) {
    return true;
  }
  const normTitle = (item.title || '').toLowerCase();
  if (
    /\b(sh?olat|shalat)\s+(subuh|dzuhur|zhuhur|zuhur|ashar|asar|maghrib|magrib|isya'?)\b/i.test(
      normTitle
    )
  ) {
    return true;
  }
  return false;
}

export const LATE_POINT_MULTIPLIER = 0.75; // 75% dari poin asli (pengurangan 25%)

export function formatXpValue(xp: number): string {
  const num = Number(xp) || 0;
  const rounded = Math.round(num * 100) / 100;
  return String(rounded);
}

export function calculateTaskXpWithLatePolicy(
  originalXp: number,
  isLate?: boolean
): {
  originalXp: number;
  earnedXp: number;
  deductedXp: number;
  percentageReceived: number;
} {
  const safeOriginal = Math.max(0, Math.round((Number(originalXp) || 0) * 100) / 100);
  if (!isLate) {
    return {
      originalXp: safeOriginal,
      earnedXp: safeOriginal,
      deductedXp: 0,
      percentageReceived: 100
    };
  }
  const earnedXp = Math.round(safeOriginal * LATE_POINT_MULTIPLIER * 100) / 100;
  const deductedXp = Math.round((safeOriginal - earnedXp) * 100) / 100;
  return {
    originalXp: safeOriginal,
    earnedXp,
    deductedXp,
    percentageReceived: 75
  };
}

export const DEFAULT_STANDARD_AMALAN_HX: StandardAmalanHX[] = [
  {
    id: 'paten-sholat-subuh',
    title: 'Sholat Subuh',
    category: 'Shalat Wajib',
    baseXp: 15,
    jamaahBonusXp: 5,
    hasJamaahOption: true,
    prayerId: 'subuh',
    timeWindowDescription: 'Waktu Subuh s/d sebelum Terbit Matahari (Syuruq)',
    isActive: true,
    recurrence: 'daily',
    penaltyLateXp: 25,
    note: 'Batas tepat waktu dari adzan Subuh sampai Syuruq. Pengisian terlambat mendapatkan 75% dari poin asli.',
    order: 1
  },
  {
    id: 'paten-dzikir-pagi',
    title: 'Dzikir Pagi',
    category: 'Dzikir & Doa',
    baseXp: 5,
    prayerId: 'dzikir-pagi',
    timeWindowDescription: 'Setelah Subuh hingga sebelum Ashar',
    isActive: true,
    recurrence: 'daily',
    penaltyLateXp: 25,
    note: 'Membaca doa & dzikir pagi Al-Ma\'tsurat. Pengisian terlambat (sore/malam hari) mendapatkan 75% dari poin asli (3.75 XP).',
    order: 2
  },
  {
    id: 'paten-sholat-dhuha',
    title: 'Sholat Dhuha',
    category: 'Shalat Sunnah',
    baseXp: 10,
    prayerId: 'sholat-dhuha',
    timeWindowDescription: 'Pagi hari hingga sebelum Dzuhur',
    isActive: true,
    recurrence: 'daily',
    penaltyLateXp: 25,
    note: 'Minimal 2 rakaat shalat dhuha. Pengisian lewat waktu Dzuhur mendapatkan 75% dari poin asli (7.5 XP).',
    order: 3
  },
  {
    id: 'paten-sholat-dzuhur',
    title: 'Sholat Dzuhur',
    category: 'Shalat Wajib',
    baseXp: 15,
    jamaahBonusXp: 5,
    hasJamaahOption: true,
    prayerId: 'zhuhur',
    timeWindowDescription: 'Waktu Dzuhur s/d sebelum Adzan Ashar',
    isActive: true,
    recurrence: 'daily',
    penaltyLateXp: 25,
    note: 'Batas tepat waktu dari adzan Dzuhur sampai sebelum Ashar. Pengisian lewat batas mendapatkan 75% dari poin asli.',
    order: 4
  },
  {
    id: 'paten-sholat-ashar',
    title: 'Sholat Ashar',
    category: 'Shalat Wajib',
    baseXp: 15,
    jamaahBonusXp: 5,
    hasJamaahOption: true,
    prayerId: 'ashar',
    timeWindowDescription: 'Waktu Ashar s/d sebelum Adzan Maghrib',
    isActive: true,
    recurrence: 'daily',
    penaltyLateXp: 25,
    note: 'Batas tepat waktu dari adzan Ashar sampai sebelum Maghrib. Pengisian lewat batas mendapatkan 75% dari poin asli.',
    order: 5
  },
  {
    id: 'paten-dzikir-petang',
    title: 'Dzikir Petang',
    category: 'Dzikir & Doa',
    baseXp: 5,
    prayerId: 'dzikir-petang',
    timeWindowDescription: 'Setelah Ashar hingga sebelum Isya’',
    isActive: true,
    recurrence: 'daily',
    penaltyLateXp: 25,
    note: 'Membaca doa & dzikir petang Al-Ma\'tsurat. Pengisian lewat Isya\' mendapatkan 75% dari poin asli (3.75 XP).',
    order: 6
  },
  {
    id: 'paten-sholat-maghrib',
    title: 'Sholat Maghrib',
    category: 'Shalat Wajib',
    baseXp: 15,
    jamaahBonusXp: 5,
    hasJamaahOption: true,
    prayerId: 'maghrib',
    timeWindowDescription: 'Waktu Maghrib s/d sebelum Adzan Isya\'',
    isActive: true,
    recurrence: 'daily',
    penaltyLateXp: 25,
    note: 'Batas tepat waktu dari adzan Maghrib sampai sebelum Isya. Pengisian lewat batas mendapatkan 75% dari poin asli.',
    order: 7
  },
  {
    id: 'paten-sholat-isya',
    title: 'Sholat Isya\'',
    category: 'Shalat Wajib',
    baseXp: 15,
    jamaahBonusXp: 5,
    hasJamaahOption: true,
    prayerId: 'isya',
    timeWindowDescription: 'Waktu Isya\' s/d sebelum Subuh',
    isActive: true,
    recurrence: 'daily',
    penaltyLateXp: 25,
    note: 'Batas tepat waktu dari adzan Isya sampai tengah malam/Subuh.',
    order: 8
  },
  {
    id: 'paten-qiyamullail',
    title: 'Sholat Qiyamullail (Tahajjud & Witir)',
    category: 'Shalat Sunnah',
    baseXp: 10,
    timeWindowDescription: 'Sepertiga malam terakhir hingga sebelum Subuh',
    isActive: true,
    recurrence: 'daily',
    note: 'Shalat malam, tahajjud, atau witir sebelum masuk waktu Subuh.',
    order: 9
  },
  {
    id: 'paten-puasa-sunnah',
    title: 'Puasa Sunnah',
    category: 'Shaum Sunnah',
    baseXp: 10,
    timeWindowDescription: 'Mulai terbit fajar hingga tenggelam matahari',
    isFastingTask: true,
    isActive: true,
    recurrence: 'daily',
    note: 'Puasa Senin-Kamis, Ayyamul Bidh, Daud, atau puasa sunnah syar\'i lainnya.',
    order: 10
  },
  {
    id: 'paten-olahraga',
    title: 'Olahraga & Kebugaran Jasmani',
    category: 'Kesehatan & Rihlah',
    baseXp: 10,
    timeWindowDescription: 'Pagi atau sore hari (minimal 15-30 menit)',
    isActive: true,
    recurrence: 'daily',
    note: 'Aktivitas fisik menjaga kebugaran jasmani untuk kelancaran ibadah & bekerja.',
    order: 11
  }
];

export interface PrayerWindowStatus {
  isPrayer: boolean;
  isWithinWindow: boolean;
  isTooEarly: boolean;
  isLate: boolean;
  isExpiredDay: boolean;
  penalty: number;
  statusLabel: string;
  timeRangeLabel: string;
}

export function resolveTaskPrayerId(
  input?:
    | StandardAmalanHX['prayerId']
    | {
        id?: string;
        prayerId?: StandardAmalanHX['prayerId'];
        title?: string;
        note?: string;
        timeWindowInfo?: string;
        timeWindowDescription?: string;
      }
    | null
): StandardAmalanHX['prayerId'] | undefined {
  if (!input) return undefined;
  if (typeof input === 'string') return input;
  if (input.prayerId) return input.prayerId;

  const combined = `${input.id || ''} ${input.title || ''} ${input.timeWindowInfo || ''} ${
    input.timeWindowDescription || ''
  }`.toLowerCase();

  if (/\bdzikir\s+pagi\b|\bmatsurat\s+pagi\b|paten-dzikir-pagi/i.test(combined)) {
    return 'dzikir-pagi';
  }
  if (/\bdzikir\s+(petang|sore)\b|\bmatsurat\s+(petang|sore)\b|paten-dzikir-petang/i.test(combined)) {
    return 'dzikir-petang';
  }
  if (/\b(sh?olat|shalat)?\s*dhuha\b|paten-sholat-dhuha/i.test(combined)) {
    return 'sholat-dhuha';
  }
  if (/\b(sh?olat|shalat)\s+subuh\b|paten-sholat-subuh/i.test(combined)) {
    return 'subuh';
  }
  if (/\b(sh?olat|shalat)\s+(dzuhur|zhuhur|zuhur)\b|paten-sholat-dzuhur/i.test(combined)) {
    return 'zhuhur';
  }
  if (/\b(sh?olat|shalat)\s+(ashar|asar)\b|paten-sholat-ashar/i.test(combined)) {
    return 'ashar';
  }
  if (/\b(sh?olat|shalat)\s+(maghrib|magrib)\b|paten-sholat-maghrib/i.test(combined)) {
    return 'maghrib';
  }
  if (/\b(sh?olat|shalat)\s+isya'?\b|paten-sholat-isya/i.test(combined)) {
    return 'isya';
  }

  // Additional support for daily or weekly custom tasks with explicit time-of-day instructions
  const noteAndWindow = `${input.title || ''} ${input.note || ''} ${input.timeWindowInfo || ''}`.toLowerCase();
  if (/sebelum\s+(dzuhur|zhuhur|zuhur)/i.test(noteAndWindow)) {
    return 'sholat-dhuha';
  }
  if (/sebelum\s+(ashar|asar)|\bpagi\s+hari\b/i.test(noteAndWindow)) {
    return 'dzikir-pagi';
  }
  if (/sebelum\s+isya'?\b|\bsore\s+hari\b|\bpetang\b/i.test(noteAndWindow)) {
    return 'dzikir-petang';
  }

  return undefined;
}

/**
 * Checks prayer / amalan window status based on prayerTimes for the day
 */
export function evaluatePrayerWindow(
  prayerIdOrTask:
    | StandardAmalanHX['prayerId']
    | {
        id?: string;
        prayerId?: StandardAmalanHX['prayerId'];
        title?: string;
        note?: string;
        timeWindowInfo?: string;
        timeWindowDescription?: string;
      }
    | undefined,
  now: Date = new Date(),
  region: RegionLocation = DEFAULT_INDONESIAN_REGIONS[0]
): PrayerWindowStatus {
  const prayerId = resolveTaskPrayerId(prayerIdOrTask);

  if (!prayerId) {
    return {
      isPrayer: false,
      isWithinWindow: true,
      isTooEarly: false,
      isLate: false,
      isExpiredDay: false,
      penalty: 0,
      statusLabel: 'Tepat Waktu',
      timeRangeLabel: 'Sepanjang Hari'
    };
  }

  const times = calculatePrayerTimes(region.lat, region.lng, region.timezone, now);
  const findTime = (id: string) => times.find((t) => t.id === id);

  const subuh = findTime('subuh');
  const syuruq = findTime('syuruq');
  const zhuhur = findTime('zhuhur');
  const ashar = findTime('ashar');
  const maghrib = findTime('maghrib');
  const isya = findTime('isya');

  const toMinutes = (item?: { hour: number; minute: number }) => {
    if (!item) return 0;
    return item.hour * 60 + item.minute;
  };

  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  let startMinutes = 0;
  let endMinutes = 0;
  let startLabel = '';
  let endLabel = '';

  switch (prayerId) {
    case 'subuh':
      startMinutes = toMinutes(subuh);
      endMinutes = toMinutes(syuruq);
      startLabel = subuh?.timeStr || '04:30';
      endLabel = syuruq?.timeStr || '05:45';
      break;
    case 'zhuhur':
      startMinutes = toMinutes(zhuhur);
      endMinutes = toMinutes(ashar);
      startLabel = zhuhur?.timeStr || '11:55';
      endLabel = ashar?.timeStr || '15:10';
      break;
    case 'ashar':
      startMinutes = toMinutes(ashar);
      endMinutes = toMinutes(maghrib);
      startLabel = ashar?.timeStr || '15:10';
      endLabel = maghrib?.timeStr || '17:55';
      break;
    case 'maghrib':
      startMinutes = toMinutes(maghrib);
      endMinutes = toMinutes(isya);
      startLabel = maghrib?.timeStr || '17:55';
      endLabel = isya?.timeStr || '19:05';
      break;
    case 'isya':
      startMinutes = toMinutes(isya);
      endMinutes = 24 * 60; // Up to midnight / Subuh
      startLabel = isya?.timeStr || '19:05';
      endLabel = '23:59';
      break;
    case 'dzikir-pagi':
      startMinutes = toMinutes(subuh);
      endMinutes = toMinutes(ashar);
      startLabel = subuh?.timeStr || '04:30';
      endLabel = ashar?.timeStr || '15:10';
      break;
    case 'sholat-dhuha':
      startMinutes = toMinutes(syuruq);
      endMinutes = toMinutes(zhuhur);
      startLabel = syuruq?.timeStr || '06:00';
      endLabel = zhuhur?.timeStr || '11:55';
      break;
    case 'dzikir-petang':
      startMinutes = toMinutes(ashar);
      endMinutes = toMinutes(isya);
      startLabel = ashar?.timeStr || '15:10';
      endLabel = isya?.timeStr || '19:05';
      break;
  }

  const timeRangeLabel = `${startLabel} - ${endLabel} ${region.timezoneName || 'WIB'}`;

  if (currentMinutes < startMinutes) {
    return {
      isPrayer: true,
      isWithinWindow: false,
      isTooEarly: true,
      isLate: false,
      isExpiredDay: false,
      penalty: 0,
      statusLabel: `Belum Masuk Waktu (Mulai ${startLabel})`,
      timeRangeLabel
    };
  }

  if (currentMinutes >= startMinutes && currentMinutes <= endMinutes) {
    return {
      isPrayer: true,
      isWithinWindow: true,
      isTooEarly: false,
      isLate: false,
      isExpiredDay: false,
      penalty: 0,
      statusLabel: 'Tepat Waktu',
      timeRangeLabel
    };
  }

  // If passed endMinutes (late completion within the day / week)
  return {
    isPrayer: true,
    isWithinWindow: false,
    isTooEarly: false,
    isLate: true,
    isExpiredDay: false,
    penalty: 25,
    statusLabel: 'Terlambat (75% dari Poin Asli)',
    timeRangeLabel
  };
}

export interface FastingOption {
  id: string;
  name: string;
  description: string;
  recommendedDays?: number[]; // 0=Ahad, 1=Senin, 2=Selasa, 3=Rabu, 4=Kamis, 5=Jumat, 6=Sabtu
  requiresDayMatch?: boolean;
}

export const FASTING_OPTIONS: FastingOption[] = [
  {
    id: 'senin',
    name: 'Puasa Sunnah Hari Senin',
    description: 'Sunnah muakkadah yang selalu dijaga oleh Rasulullah SAW setiap awal pekan.',
    recommendedDays: [1],
    requiresDayMatch: true
  },
  {
    id: 'kamis',
    name: 'Puasa Sunnah Hari Kamis',
    description: 'Hari diangkatnya amalan manusia kepada Allah SWT.',
    recommendedDays: [4],
    requiresDayMatch: true
  },
  {
    id: 'ayyamul-bidh',
    name: 'Puasa Ayyamul Bidh (13, 14, 15 Hijriyah)',
    description: 'Puasa tiga hari di pertengahan bulan saat bulan purnama (pahala laksana puasa sepanjang tahun).',
    requiresDayMatch: false
  },
  {
    id: 'daud',
    name: 'Puasa Daud (Sehari Berpuasa, Sehari Tidak)',
    description: 'Puasa yang paling dicintai Allah SWT (pola selang-seling sehari).',
    requiresDayMatch: false
  },
  {
    id: 'syawwal',
    name: 'Puasa 6 Hari Syawwal',
    description: 'Puasa sunnah enam hari di bulan Syawwal setelah Idul Fitri.',
    requiresDayMatch: false
  },
  {
    id: 'asyura-tasua',
    name: 'Puasa Tasu\'a & Asyura (9 & 10 Muharram)',
    description: 'Menghapuskan dosa setahun yang telah lalu.',
    requiresDayMatch: false
  },
  {
    id: 'arafah',
    name: 'Puasa Arafah (9 Dzulhijjah)',
    description: 'Menghapuskan dosa setahun lalu dan setahun yang akan datang.',
    requiresDayMatch: false
  },
  {
    id: 'sunnah-lainnya',
    name: 'Puasa Sunnah Mutlak / Nadzar / Lainnya',
    description: 'Puasa sunnah syar\'i lainnya yang dikerjakan dengan niat ikhlas lillahi ta\'ala.',
    requiresDayMatch: false
  }
];

export function getHijriDateDetails(date: Date = new Date()) {
  try {
    const dtf = new Intl.DateTimeFormat('en-US-u-ca-islamic-umalqura', {
      day: 'numeric',
      month: 'numeric',
      year: 'numeric'
    });
    const parts = dtf.formatToParts(date);
    let day = 15;
    let month = 6;
    let year = 1448;
    for (const part of parts) {
      if (part.type === 'day') day = parseInt(part.value, 10) || 15;
      if (part.type === 'month') month = parseInt(part.value, 10) || 6;
      if (part.type === 'year') year = parseInt(part.value, 10) || 1448;
    }
    return { day, month, year };
  } catch (e) {
    return { day: 15, month: 6, year: 1448 };
  }
}

export function checkFastingMatch(
  fastingId: string,
  now: Date = new Date()
): { isValid: boolean; message: string; dayName: string } {
  const dayIndex = now.getDay();
  const dayNames = ['Ahad', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  const dayName = dayNames[dayIndex];

  const option = FASTING_OPTIONS.find((f) => f.id === fastingId);
  if (!option) {
    return { isValid: false, message: 'Pilihan puasa tidak ditemukan', dayName };
  }

  const hijri = getHijriDateDetails(now);
  const hijriMonthNames = [
    '', 'Muharram', 'Safar', 'Rabiul Awal', 'Rabiul Akhir',
    'Jumadil Awal', 'Jumadil Akhir', 'Rajab', 'Syaban', 'Ramadan',
    'Syawal', 'Dzulkaidah', 'Dzulhijjah'
  ];
  const hMonthName = hijriMonthNames[hijri.month] || `Bulan ${hijri.month}`;

  if (fastingId === 'senin') {
    if (dayIndex === 1) {
      return { isValid: true, message: `Masya Allah! Hari ini hari Senin, sangat tepat untuk Puasa Sunnah Senin.`, dayName };
    }
    return { isValid: false, message: `Hari ini hari ${dayName} (bukan Senin). Puasa Senin disunnahkan khusus di hari Senin.`, dayName };
  }

  if (fastingId === 'kamis') {
    if (dayIndex === 4) {
      return { isValid: true, message: `Masya Allah! Hari ini hari Kamis, sangat tepat untuk Puasa Sunnah Kamis.`, dayName };
    }
    return { isValid: false, message: `Hari ini hari ${dayName} (bukan Kamis). Puasa Kamis disunnahkan khusus di hari Kamis.`, dayName };
  }

  if (fastingId === 'ayyamul-bidh') {
    if (hijri.day >= 13 && hijri.day <= 15) {
      return { isValid: true, message: `Masya Allah! Hari ini tanggal ${hijri.day} ${hMonthName} ${hijri.year} H (Masuk dalam rentang Ayyamul Bidh 13, 14, 15).`, dayName };
    }
    return { isValid: false, message: `Hari ini tanggal ${hijri.day} ${hMonthName} ${hijri.year} H. Puasa Ayyamul Bidh disunnahkan pada tanggal 13, 14, dan 15 Hijriyah.`, dayName };
  }

  if (fastingId === 'syawwal') {
    if (hijri.month === 10) {
      return { isValid: true, message: `Alhamdulillah, saat ini berada di bulan Syawal (${hijri.day} Syawal ${hijri.year} H). Sah untuk Puasa 6 Hari Syawwal.`, dayName };
    }
    return { isValid: false, message: `Hari ini tanggal ${hijri.day} ${hMonthName} ${hijri.year} H (Bukan bulan Syawal). Puasa 6 hari Syawwal dikhususkan pada bulan Syawal.`, dayName };
  }

  if (fastingId === 'asyura-tasua') {
    if (hijri.month === 1 && (hijri.day === 9 || hijri.day === 10)) {
      return { isValid: true, message: `Masya Allah! Hari ini tanggal ${hijri.day} Muharram ${hijri.year} H (Tasu'a / 'Asyura).`, dayName };
    }
    return { isValid: false, message: `Hari ini tanggal ${hijri.day} ${hMonthName} ${hijri.year} H. Puasa Tasu'a & 'Asyura disunnahkan pada tanggal 9 & 10 Muharram.`, dayName };
  }

  if (fastingId === 'arafah') {
    if (hijri.month === 12 && hijri.day === 9) {
      return { isValid: true, message: `Masya Allah! Hari ini tanggal 9 Dzulhijjah ${hijri.year} H (Hari Arafah).`, dayName };
    }
    return { isValid: false, message: `Hari ini tanggal ${hijri.day} ${hMonthName} ${hijri.year} H. Puasa Arafah disunnahkan pada tanggal 9 Dzulhijjah.`, dayName };
  }

  return {
    isValid: true,
    message: `Alhamdulillah, niat ${option.name} terverifikasi untuk hari ini (${dayName}, ${hijri.day} ${hMonthName} ${hijri.year} H).`,
    dayName
  };
}

const STORAGE_KEY_PATEN = 'noorworship_standard_amalan_hx_v1';

function sanitizeStandardAmalanItems(items: StandardAmalanHX[]): StandardAmalanHX[] {
  return items.map((item) => {
    const isFardhu5 = isFiveDailyFardhuPrayer(item);
    const resolvedPrayerId = resolveTaskPrayerId(item);
    const updatedNote = item.note
      ? item.note.replace(/dipotong\s*5\s*XP/gi, 'mendapatkan 75% dari poin asli')
      : item.note;
    return {
      ...item,
      prayerId: resolvedPrayerId,
      hasJamaahOption: isFardhu5 ? true : false,
      jamaahBonusXp: isFardhu5 ? (item.jamaahBonusXp ?? 5) : undefined,
      penaltyLateXp: item.penaltyLateXp ? 25 : undefined,
      note: updatedNote
    };
  });
}

export function getStoredStandardAmalan(): StandardAmalanHX[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_PATEN);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return sanitizeStandardAmalanItems(parsed);
      }
    }
  } catch (e) {
    console.warn('Could not read stored standard amalan', e);
  }
  return sanitizeStandardAmalanItems(DEFAULT_STANDARD_AMALAN_HX);
}

export function saveStoredStandardAmalan(items: StandardAmalanHX[]): void {
  try {
    const sanitized = sanitizeStandardAmalanItems(items);
    localStorage.setItem(STORAGE_KEY_PATEN, JSON.stringify(sanitized));
    window.dispatchEvent(new Event('noorworship_standard_amalan_updated'));
  } catch (e) {
    console.warn('Could not save standard amalan', e);
  }
}

const KNOWN_PATEN_PHRASE_ALIASES: Record<string, string[]> = {
  'paten-sholat-subuh': [
    'shalat subuh',
    'shalat fardhu',
    'shalat wajib',
    'shalat 5 waktu',
    'shalat lima waktu'
  ],
  'paten-sholat-dzuhur': ['shalat dzuhur'],
  'paten-sholat-ashar': ['shalat ashar'],
  'paten-sholat-maghrib': ['shalat maghrib'],
  'paten-sholat-isya': ['shalat isya'],
  'paten-dzikir-pagi': ['dzikir pagi', 'dzikir pagi dan petang', 'dzikir pagi petang', 'matsurat pagi'],
  'paten-dzikir-petang': ['dzikir petang', 'dzikir sore', 'matsurat petang'],
  'paten-sholat-dhuha': ['shalat dhuha'],
  'paten-qiyamullail': ['qiyamullail', 'shalat tahajjud', 'tahajjud', 'shalat malam', 'shalat witir'],
  'paten-puasa-sunnah': ['puasa sunnah', 'puasa senin', 'puasa kamis', 'puasa daud', 'ayyamul bidh', 'puasa arafah', 'puasa syawal'],
  'paten-olahraga': ['olahraga', 'kebugaran jasmani', 'senam', 'jogging', 'lari pagi']
};

const STOP_WORDS = new Set([
  'dan',
  'atau',
  'yang',
  'di',
  'ke',
  'dari',
  'untuk',
  'pada',
  'minimal',
  'setiap',
  'hari',
  'harian',
  'pekan',
  'pekanan',
  'rutin',
  'membaca',
  'amalan',
  'ibadah',
  'surat',
  'surah'
]);

export function normalizeAmalanTitle(text: string): string {
  return (text || '')
    .toLowerCase()
    .replace(/[’'`´]/g, '')
    .replace(/&/g, ' dan ')
    .replace(/\bsh[ao]l[ao]t\b/g, 'shalat')
    .replace(/\b(?:zhuhur|zuhur|dzuhur)\b/g, 'dzuhur')
    .replace(/\b(?:ashr|ashar|asar)\b/g, 'ashar')
    .replace(/\b(?:isyak|isya)\b/g, 'isya')
    .replace(/\b(?:qiyamul\s*lail|qiyamullail)\b/g, 'qiyamullail')
    .replace(/\btahajud\b/g, 'tahajjud')
    .replace(/\b(?:shaum|saum)\b/g, 'puasa')
    .replace(/\b(?:zikir|dhikr)\b/g, 'dzikir')
    .replace(/\b(?:al[\s-]*ma?tsurat|matsurat)\b/g, 'matsurat')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function findConflictingStandardAmalan(
  candidateTitle: string,
  standardItems?: StandardAmalanHX[]
): StandardAmalanHX | null {
  const normCandidate = normalizeAmalanTitle(candidateTitle);
  if (!normCandidate) return null;

  const activeItems = (standardItems || getStoredStandardAmalan()).filter((item) => item.isActive);

  for (const item of activeItems) {
    const normItem = normalizeAmalanTitle(item.title);
    if (!normItem) continue;

    if (normCandidate === normItem) {
      return item;
    }

    const aliases = KNOWN_PATEN_PHRASE_ALIASES[item.id];
    if (aliases) {
      if (aliases.some((alias) => normCandidate.includes(alias))) {
        return item;
      }
      // Special check: combined "dzikir pagi ... petang" or "al-matsurat"
      if (
        (item.id === 'paten-dzikir-pagi' || item.id === 'paten-dzikir-petang') &&
        normCandidate.includes('dzikir') &&
        normCandidate.includes('matsurat')
      ) {
        return item;
      }
      continue;
    }

    // Custom amalan paten added by Dept HX
    if (
      (normItem.length >= 6 && normCandidate.includes(normItem)) ||
      (normCandidate.length >= 6 && normItem.includes(normCandidate))
    ) {
      return item;
    }

    const itemTokens = normItem.split(' ').filter((w) => w.length >= 3 && !STOP_WORDS.has(w));
    const candTokens = new Set(normCandidate.split(' ').filter((w) => w.length >= 3 && !STOP_WORDS.has(w)));
    if (itemTokens.length > 0 && itemTokens.every((t) => candTokens.has(t))) {
      return item;
    }
  }

  return null;
}

