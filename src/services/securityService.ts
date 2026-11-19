import { ActiveUser } from '../types';

const DEPT_HX_PASSCODE_KEY = 'noorworship_dept_hx_passcode_prod_v1';
const DEPT_HX_CUSTOM_SET_KEY = 'noorworship_dept_hx_custom_set_prod_v1';
const USTADZ_PINS_MAP_KEY = 'noorworship_ustadz_pins_prod_v1';
const SECURITY_AUDIT_LOG_KEY = 'noorworship_security_audit_log_prod_v1';
const LOCKOUT_STATE_KEY = 'noorworship_auth_lockout_prod_v1';

export interface SecurityAuditEntry {
  id: string;
  timestamp: string;
  actor: string;
  action: string;
  target: string;
}

interface LockoutRecord {
  failedCount: number;
  lockedUntilMs: number;
}

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 30 * 1000; // 30 seconds lockout after 5 failed attempts

export function getLockoutRemainingSeconds(scope: 'dept-hx' | 'ustadz' | 'santri'): number {
  try {
    const raw = localStorage.getItem(`${LOCKOUT_STATE_KEY}_${scope}`);
    if (!raw) return 0;
    const data: LockoutRecord = JSON.parse(raw);
    if (!data.lockedUntilMs) return 0;
    const diff = data.lockedUntilMs - Date.now();
    if (diff <= 0) {
      localStorage.removeItem(`${LOCKOUT_STATE_KEY}_${scope}`);
      return 0;
    }
    return Math.ceil(diff / 1000);
  } catch {
    return 0;
  }
}

export function recordFailedAuthAttempt(scope: 'dept-hx' | 'ustadz' | 'santri'): {
  locked: boolean;
  remainingAttempts: number;
  lockoutSeconds: number;
} {
  try {
    const key = `${LOCKOUT_STATE_KEY}_${scope}`;
    const raw = localStorage.getItem(key);
    const current: LockoutRecord = raw
      ? JSON.parse(raw)
      : { failedCount: 0, lockedUntilMs: 0 };

    const nextCount = current.failedCount + 1;
    if (nextCount >= MAX_FAILED_ATTEMPTS) {
      const lockedUntilMs = Date.now() + LOCKOUT_DURATION_MS;
      localStorage.setItem(
        key,
        JSON.stringify({ failedCount: nextCount, lockedUntilMs })
      );
      return {
        locked: true,
        remainingAttempts: 0,
        lockoutSeconds: Math.ceil(LOCKOUT_DURATION_MS / 1000)
      };
    } else {
      localStorage.setItem(
        key,
        JSON.stringify({ failedCount: nextCount, lockedUntilMs: 0 })
      );
      return {
        locked: false,
        remainingAttempts: MAX_FAILED_ATTEMPTS - nextCount,
        lockoutSeconds: 0
      };
    }
  } catch {
    return { locked: false, remainingAttempts: 3, lockoutSeconds: 0 };
  }
}

export function resetFailedAuthAttempts(scope: 'dept-hx' | 'ustadz' | 'santri'): void {
  try {
    localStorage.removeItem(`${LOCKOUT_STATE_KEY}_${scope}`);
  } catch {}
}

/**
 * Returns the active Master Passcode for Dept HX.
 * Defaults to 'hx2026' until customized by Dept HX.
 */
export function getDeptHXPasscode(registeredUsers?: ActiveUser[]): string {
  try {
    const saved = localStorage.getItem(DEPT_HX_PASSCODE_KEY);
    if (saved && saved.trim().length > 0) {
      return saved.trim();
    }
  } catch {}

  if (registeredUsers && registeredUsers.length > 0) {
    const hxUser = registeredUsers.find(
      (u) => u.role === 'dept-hx' || u.role === 'hq-admin'
    );
    if (hxUser && hxUser.passcode && hxUser.passcode.trim().length > 0) {
      return hxUser.passcode.trim();
    }
  }

  return 'hx2026';
}

export function isDeptHXCustomPasscodeSet(): boolean {
  try {
    return localStorage.getItem(DEPT_HX_CUSTOM_SET_KEY) === 'true';
  } catch {
    return false;
  }
}

/**
 * Verifies a candidate passcode for Dept HX.
 * If Dept HX has customized their passcode, ONLY the exact custom passcode is accepted.
 * If still on initial setup, 'hx2026' (or 'HX2026') is accepted.
 */
export function verifyDeptHXPasscode(
  inputCode: string,
  registeredUsers?: ActiveUser[]
): boolean {
  const clean = inputCode.trim();
  if (!clean) return false;

  const currentMaster = getDeptHXPasscode(registeredUsers);
  if (isDeptHXCustomPasscodeSet()) {
    return clean === currentMaster;
  }

  // Initial state before customization: accept exact master or case-insensitive hx2026
  return (
    clean === currentMaster ||
    clean.toLowerCase() === 'hx2026'
  );
}

/**
 * Updates the Master Passcode for Dept HX after verifying the current passcode.
 */
export function updateDeptHXPasscode(
  currentInput: string,
  newPasscode: string,
  registeredUsers?: ActiveUser[]
): { success: boolean; message: string } {
  if (!verifyDeptHXPasscode(currentInput, registeredUsers)) {
    return {
      success: false,
      message: 'Kode Otorisasi Dept HX saat ini tidak sesuai!'
    };
  }

  const cleanNew = newPasscode.trim();
  if (cleanNew.length < 4) {
    return {
      success: false,
      message: 'Kode Otorisasi Dept HX baru minimal harus 4 karakter.'
    };
  }

  if (/\s/.test(cleanNew)) {
    return {
      success: false,
      message: 'Kode Otorisasi tidak boleh mengandung spasi.'
    };
  }

  try {
    localStorage.setItem(DEPT_HX_PASSCODE_KEY, cleanNew);
    localStorage.setItem(DEPT_HX_CUSTOM_SET_KEY, 'true');
    addSecurityAuditLog(
      'Direktorat Dept HX',
      'Mengubah Kode Otorisasi Master Dept HX',
      'Portal Dept HX Pusat'
    );
    return {
      success: true,
      message: 'Kode Otorisasi Master Dept HX berhasil diperbarui dengan aman!'
    };
  } catch {
    return {
      success: false,
      message: 'Gagal menyimpan Kode Otorisasi baru ke penyimpanan lokal.'
    };
  }
}

/**
 * Retrieves the map of custom Ustadz PINs per Halaqah name.
 */
export function getUstadzPinsMap(): Record<string, string> {
  try {
    const raw = localStorage.getItem(USTADZ_PINS_MAP_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') return parsed;
    }
  } catch {}
  return {};
}

/**
 * Gets the effective Ustadz Passcode for a specific Halaqah.
 * Priority:
 * 1. Explicit Ustadz PIN map (`noorworship_ustadz_pins_prod_v1`)
 * 2. Registered Ustadz user (`role === 'admin'`) for that Halaqah
 * 3. Halaqah object `pin` in `noorworship_unified_halaqahs_prod_v1`
 * 4. Initial default `'1234'` ONLY if never configured
 */
export function getUstadzPasscodeForHalaqah(
  halaqahName: string,
  registeredUsers?: ActiveUser[]
): string {
  const cleanName = (halaqahName || '').trim();
  const pinsMap = getUstadzPinsMap();

  if (cleanName && pinsMap[cleanName]) {
    return pinsMap[cleanName];
  }

  // Case-insensitive lookup in pinsMap
  const lowerName = cleanName.toLowerCase();
  for (const [k, v] of Object.entries(pinsMap)) {
    if (k.trim().toLowerCase() === lowerName && v) {
      return v;
    }
  }

  if (registeredUsers && registeredUsers.length > 0 && cleanName) {
    const matchedUstadz = registeredUsers.find(
      (u) =>
        u.role === 'admin' &&
        (u.halaqah || '').trim().toLowerCase() === lowerName
    );
    if (matchedUstadz && matchedUstadz.passcode) {
      return matchedUstadz.passcode.trim();
    }
  }

  try {
    const saved = localStorage.getItem('noorworship_unified_halaqahs_prod_v1');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) {
        const found = parsed.find(
          (h: any) => h?.name && h.name.trim().toLowerCase() === lowerName
        );
        if (found && found.pin) {
          return String(found.pin).trim();
        }
      }
    }
  } catch {}

  return '1234';
}

/**
 * Strictly verifies the Ustadz Passcode for a given Halaqah.
 * Does NOT allow '1234' or 'admin123' fallback bypass if the Halaqah has its own PIN!
 */
export function verifyUstadzPasscode(
  halaqahName: string,
  inputPasscode: string,
  registeredUsers?: ActiveUser[]
): boolean {
  const cleanInput = inputPasscode.trim();
  if (!cleanInput) return false;

  const expected = getUstadzPasscodeForHalaqah(halaqahName, registeredUsers);
  return cleanInput === expected;
}

/**
 * Updates the Ustadz Passcode for a specific Halaqah.
 * Requires Dept HX Master Passcode authorization to execute.
 */
export function updateUstadzPasscodeForHalaqah(
  halaqahName: string,
  newPasscode: string,
  deptHxVerificationCode: string,
  registeredUsers?: ActiveUser[]
): { success: boolean; message: string } {
  if (!verifyDeptHXPasscode(deptHxVerificationCode, registeredUsers)) {
    return {
      success: false,
      message: 'Verifikasi gagal: Kode Otorisasi Dept HX salah!'
    };
  }

  const cleanHalaqah = halaqahName.trim();
  if (!cleanHalaqah) {
    return {
      success: false,
      message: 'Pilih kelompok Halaqah terlebih dahulu.'
    };
  }

  const cleanPin = newPasscode.trim();
  if (cleanPin.length < 4) {
    return {
      success: false,
      message: 'PIN / Password Ustadz/ah baru minimal harus 4 karakter.'
    };
  }

  try {
    // 1. Save in dedicated Ustadz PINs map
    const pinsMap = getUstadzPinsMap();
    pinsMap[cleanHalaqah] = cleanPin;
    localStorage.setItem(USTADZ_PINS_MAP_KEY, JSON.stringify(pinsMap));

    // 2. Also update pin inside unified halaqahs list in localStorage
    const savedHalaqahs = localStorage.getItem('noorworship_unified_halaqahs_prod_v1');
    if (savedHalaqahs) {
      const parsed = JSON.parse(savedHalaqahs);
      if (Array.isArray(parsed)) {
        const updated = parsed.map((h: any) =>
          h?.name && h.name.trim().toLowerCase() === cleanHalaqah.toLowerCase()
            ? { ...h, pin: cleanPin }
            : h
        );
        localStorage.setItem('noorworship_unified_halaqahs_prod_v1', JSON.stringify(updated));
      }
    }

    addSecurityAuditLog(
      'Direktorat Dept HX',
      'Memperbarui PIN / Passcode Supervisor Ustadz/ah',
      cleanHalaqah
    );

    return {
      success: true,
      message: `PIN Ustadz/ah untuk ${cleanHalaqah} berhasil diperbarui!`
    };
  } catch {
    return {
      success: false,
      message: 'Gagal menyimpan perubahan PIN Ustadz/ah.'
    };
  }
}

export function getSecurityAuditLogs(): SecurityAuditEntry[] {
  try {
    const raw = localStorage.getItem(SECURITY_AUDIT_LOG_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {}
  return [];
}

export function addSecurityAuditLog(
  actor: string,
  action: string,
  target: string
): void {
  try {
    const existing = getSecurityAuditLogs();
    const entry: SecurityAuditEntry = {
      id: `sec-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toLocaleString('id-ID', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }),
      actor,
      action,
      target
    };
    const updated = [entry, ...existing].slice(0, 30);
    localStorage.setItem(SECURITY_AUDIT_LOG_KEY, JSON.stringify(updated));
  } catch {}
}
