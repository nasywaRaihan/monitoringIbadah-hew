import { ActiveUser } from '../types';

const FEMALE_KEYWORDS = [
  'ustadzah',
  'ustz',
  'aisyah',
  'fatimah',
  'khadijah',
  'siti',
  'nurul',
  'zahra',
  'azzahra',
  'nisa',
  'annisa',
  'maryam',
  'halimah',
  'zainab',
  'sarah',
  'rina',
  'dewi',
  'fitri',
  'putri',
  'rahma',
  'rahmawati',
  'nabila',
  'salma',
  'yasmin',
  'amina',
  'aminah',
  'ummu',
  'hafshah',
  'ruqayyah',
  'sumayyah',
  'asma',
  'wardah',
  'laila',
  'nadia',
  'syifa',
  'intan',
  'dian',
  'ayu',
  'lestari',
  'indri',
  'maya',
  'wulan',
  'kartika',
  'ratna',
  'sri',
  'endang',
  'wahyuni',
  'handayani',
  'kusuma',
  'ningrum',
  'setiawati',
  'susanti',
  'purnamasari',
  'permata'
];

const MALE_KEYWORDS = [
  'muhammad',
  'mohammad',
  'ahmad',
  'abdul',
  'abdullah',
  'abdurrahman',
  'ibrahim',
  'ismail',
  'yusuf',
  'umar',
  'omar',
  'ali',
  'utsman',
  'hasan',
  'husain',
  'bilal',
  'khalid',
  'zaid',
  'zayd',
  'zubair',
  'farhan',
  'tariq',
  'hamza',
  'hamzah',
  'luqman',
  'salman',
  'rayyan',
  'rayhan',
  'reihan',
  'faris',
  'fauzan',
  'rizky',
  'ridwan',
  'taufik',
  'hidayat',
  'pratama',
  'putra',
  'saputra',
  'santoso',
  'wijaya',
  'gunawan',
  'setiawan',
  'kurniawan',
  'abu'
];

/**
 * Infers gender ('L' for male, 'P' for female, undefined if generic/unknown)
 * from explicit gender field or person's name/title.
 */
export function inferUstadzGender(
  name?: string | null,
  explicitGender?: 'L' | 'P'
): 'L' | 'P' | undefined {
  if (explicitGender === 'L' || explicitGender === 'P') {
    return explicitGender;
  }
  if (!name) return undefined;
  const clean = name.trim();
  const lower = clean.toLowerCase();

  if (
    lower === 'ustadz pembimbing' ||
    lower === 'ustadz/ah pembimbing' ||
    lower === 'ustadz/ah' ||
    lower === 'pembimbing'
  ) {
    return undefined;
  }

  if (lower.startsWith('ustadzah') || lower.startsWith('ustz.') || lower.startsWith('ustz ')) {
    return 'P';
  }

  const tokens = lower.replace(/[^a-z\s]/g, ' ').split(/\s+/).filter(Boolean);
  for (const token of tokens) {
    if (FEMALE_KEYWORDS.includes(token)) {
      return 'P';
    }
  }
  for (const token of tokens) {
    if (MALE_KEYWORDS.includes(token)) {
      return 'L';
    }
  }

  if (lower.startsWith('ustadz ') && !lower.startsWith('ustadz/ah')) {
    return 'L';
  }

  return undefined;
}

/**
 * Returns the appropriate title ('Ustadz', 'Ustadzah', or 'Ustadz/ah')
 * based on gender or name.
 */
export function getUstadzTitle(
  nameOrUser?: string | ActiveUser | null,
  explicitGender?: 'L' | 'P'
): 'Ustadz' | 'Ustadzah' | 'Ustadz/ah' {
  const name =
    typeof nameOrUser === 'string'
      ? nameOrUser
      : nameOrUser?.name || '';
  const gender =
    explicitGender ||
    (typeof nameOrUser === 'object' && nameOrUser !== null
      ? nameOrUser.gender
      : undefined);

  const detected = inferUstadzGender(name, gender);
  if (detected === 'P') return 'Ustadzah';
  if (detected === 'L') return 'Ustadz';
  return 'Ustadz/ah';
}

/**
 * Normalizes a supervisor name so that:
 * - Generic placeholder becomes 'Ustadz/ah Pembimbing'
 * - Female supervisor gets 'Ustadzah <Name>' if prefixed with Ustadz/Ustadzah
 * - Male supervisor gets 'Ustadz <Name>' if prefixed with Ustadz/Ustadzah
 */
export function formatSupervisorDisplayName(
  rawName?: string | null,
  explicitGender?: 'L' | 'P'
): string {
  const clean = (rawName || '').trim();
  if (
    !clean ||
    clean.toLowerCase() === 'ustadz pembimbing' ||
    clean.toLowerCase() === 'ustadz/ah pembimbing'
  ) {
    if (explicitGender === 'P') return 'Ustadzah Pembimbing';
    if (explicitGender === 'L') return 'Ustadz Pembimbing';
    return 'Ustadz/ah Pembimbing';
  }

  const gender = inferUstadzGender(clean, explicitGender);
  const stripped = clean
    .replace(/^(ustadz\/ah|ustadzah|ustadz|ustz\.?|ust\.?)\s+/i, '')
    .trim();

  if (!stripped || stripped.toLowerCase() === 'pembimbing') {
    if (gender === 'P') return 'Ustadzah Pembimbing';
    if (gender === 'L') return 'Ustadz Pembimbing';
    return 'Ustadz/ah Pembimbing';
  }

  if (gender === 'P') {
    return `Ustadzah ${stripped}`;
  }
  if (gender === 'L') {
    return `Ustadz ${stripped}`;
  }

  if (/^(ustadz\/ah|ustadzah|ustadz)/i.test(clean)) {
    return `Ustadz/ah ${stripped}`;
  }

  return clean;
}
