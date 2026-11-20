import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, setLogLevel } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

// Silence internal Firestore SDK exponential backoff console.error logs when free-tier daily quota is reached
setLogLevel('silent');

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, (firebaseConfig as any).firestoreDatabaseId);
export const auth = getAuth(app);

let quotaCooldownUntilMs = 0;
try {
  sessionStorage.removeItem('noorworship_firestore_quota_exhausted_date');
} catch {}

export function isFirestoreQuotaExhausted(): boolean {
  return Date.now() < quotaCooldownUntilMs;
}

export function checkAndMarkQuotaExhausted(err: any): boolean {
  const msg = String(err?.message || err || '');
  const code = String(err?.code || '');
  if (
    code.includes('resource-exhausted') ||
    msg.includes('resource-exhausted') ||
    msg.includes('Quota limit exceeded') ||
    msg.includes('Quota exceeded')
  ) {
    // Cooldown background bulk syncs for 30 seconds instead of locking for the whole day
    quotaCooldownUntilMs = Date.now() + 30_000;
    return true;
  }
  return false;
}

export async function safeFirestoreWrite<T>(
  writeOperation: () => Promise<T>,
  options?: { force?: boolean }
): Promise<T | null> {
  if (!options?.force && isFirestoreQuotaExhausted()) return null;
  try {
    return await writeOperation();
  } catch (err) {
    if (!checkAndMarkQuotaExhausted(err)) {
      console.warn('Firestore write notice (fallback to local storage):', err);
    }
    return null;
  }
}
