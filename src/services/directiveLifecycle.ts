import { IbadahDirective } from '../types';

const DAY_MS = 24 * 60 * 60 * 1000;

export function getDirectiveValidityDays(directive: Pick<IbadahDirective, 'type' | 'validityDays'>): number {
  if (typeof directive.validityDays === 'number' && directive.validityDays > 0) {
    return directive.validityDays;
  }
  return directive.type === 'yaumiyah' ? 1 : 7;
}

export function getDirectiveDurationMs(directive: Pick<IbadahDirective, 'type' | 'validityDays'>): number {
  return getDirectiveValidityDays(directive) * DAY_MS;
}

export function getDirectiveExpiresAtMs(
  directive: Pick<IbadahDirective, 'type' | 'validityDays' | 'expiresAt' | 'createdAt'>
): number | null {
  if (directive.expiresAt) {
    const parsed = Date.parse(directive.expiresAt);
    if (!Number.isNaN(parsed)) return parsed;
  }
  if (directive.createdAt) {
    const createdMs = Date.parse(directive.createdAt);
    if (!Number.isNaN(createdMs)) {
      return createdMs + getDirectiveDurationMs(directive);
    }
  }
  return null;
}

export function isDirectiveExpired(
  directive: Pick<IbadahDirective, 'type' | 'validityDays' | 'expiresAt' | 'createdAt'>,
  nowMs: number = Date.now()
): boolean {
  const expMs = getDirectiveExpiresAtMs(directive);
  if (expMs === null) return false;
  return nowMs >= expMs;
}

export function isDirectiveCurrentlyActive(
  directive: Pick<IbadahDirective, 'status' | 'isRecurring' | 'type' | 'validityDays' | 'expiresAt' | 'createdAt'>,
  nowMs: number = Date.now()
): boolean {
  if (directive.status !== 'Aktif') return false;
  // Non-recurring directives automatically become inactive once 1 day (yaumiyah) or 7 days (usbu'iyah) elapses
  if (directive.isRecurring !== true && isDirectiveExpired(directive, nowMs)) {
    return false;
  }
  return true;
}

export function formatDirectiveRemainingTime(
  directive: Pick<IbadahDirective, 'status' | 'isRecurring' | 'type' | 'validityDays' | 'expiresAt' | 'createdAt'>,
  nowMs: number = Date.now()
): string {
  if (directive.status !== 'Aktif') {
    return 'Nonaktif';
  }
  const expMs = getDirectiveExpiresAtMs(directive);
  if (expMs === null) {
    return directive.type === 'yaumiyah' ? 'Berlaku 1 Hari' : 'Berlaku 1 Pekan';
  }
  const diffMs = expMs - nowMs;
  if (diffMs <= 0) {
    return directive.isRecurring === true ? 'Memperbarui Periode...' : 'Nonaktif Otomatis';
  }
  const totalMinutes = Math.ceil(diffMs / (60 * 1000));
  if (totalMinutes < 60) {
    return `Sisa ${totalMinutes} mnt`;
  }
  const totalHours = Math.ceil(diffMs / (60 * 60 * 1000));
  if (totalHours < 24) {
    return `Sisa ${totalHours} jam`;
  }
  const totalDays = Math.ceil(diffMs / DAY_MS);
  return `Sisa ${totalDays} hari`;
}
