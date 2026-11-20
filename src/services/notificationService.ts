import { doc, setDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db, safeFirestoreWrite } from './firebase';

export interface AppNotification {
  id: string;
  targetUserId?: string;
  recipientName?: string;
  targetHalaqah?: string;
  isGlobal?: boolean;
  senderName?: string;
  title: string;
  message: string;
  time: string;
  read: boolean;
  type: 'worship' | 'assignment' | 'reminder' | 'broadcast' | 'appreciation' | 'streak';
  createdAt: string;
  batchId?: string;
}

const STORAGE_KEY = 'noorworship_notifications';
export const NOTIF_UPDATED_EVENT = 'noorworship-notifications-updated';

export function getLocalNotifications(): AppNotification[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    console.warn('Failed to parse local notifications', e);
    return [];
  }
}

export function saveLocalNotifications(list: AppNotification[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list.slice(0, 200)));
    window.dispatchEvent(new Event(NOTIF_UPDATED_EVENT));
  } catch (e) {
    console.warn('Failed to save local notifications', e);
  }
}

export async function pushNotification(
  notif: Omit<AppNotification, 'id' | 'time' | 'read' | 'createdAt'> & {
    id?: string;
    time?: string;
    read?: boolean;
    createdAt?: string;
  }
): Promise<AppNotification> {
  const now = new Date();
  const notifId =
    notif.id || `notif-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
  const timeStr =
    notif.time ||
    `Hari ini, ${now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB`;

  const fullNotif: AppNotification = {
    ...notif,
    id: notifId,
    time: timeStr,
    read: notif.read ?? false,
    createdAt: notif.createdAt || now.toISOString(),
  };

  // Save to localStorage immediately for instant UI responsiveness
  const existing = getLocalNotifications();
  saveLocalNotifications([fullNotif, ...existing.filter((n) => n.id !== notifId)]);

  // Persist to Firestore if quota available
  const cleanPayload: Record<string, any> = {};
  Object.entries(fullNotif).forEach(([k, v]) => {
    if (v !== undefined) cleanPayload[k] = v;
  });
  await safeFirestoreWrite(() => setDoc(doc(db, 'notifications', notifId), cleanPayload));

  return fullNotif;
}

export async function markNotificationAsReadInStore(notifId: string): Promise<void> {
  const existing = getLocalNotifications();
  const updated = existing.map((n) => (n.id === notifId ? { ...n, read: true } : n));
  saveLocalNotifications(updated);

  await safeFirestoreWrite(() => updateDoc(doc(db, 'notifications', notifId), { read: true }));
}

export async function deleteNotificationFromStore(notifId: string): Promise<void> {
  const existing = getLocalNotifications();
  const updated = existing.filter((n) => n.id !== notifId);
  saveLocalNotifications(updated);

  await safeFirestoreWrite(() => deleteDoc(doc(db, 'notifications', notifId)));
}

export function formatRelativeNotifTime(createdAt?: string, fallbackTime?: string): string {
  if (!createdAt) return fallbackTime || 'Baru saja';
  const date = new Date(createdAt);
  if (isNaN(date.getTime())) return fallbackTime || 'Baru saja';

  const diffMs = Date.now() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);

  if (diffMin < 1) return 'Baru saja';
  if (diffMin < 60) return `${diffMin} menit lalu`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours} jam lalu`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return 'Kemarin';
  if (diffDays < 7) return `${diffDays} hari lalu`;

  return date.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}
