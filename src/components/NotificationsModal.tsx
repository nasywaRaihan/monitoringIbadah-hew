import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../services/firebase';
import { NOTIFICATIONS_LIST } from '../data/mockData';
import { ActiveUser } from '../types';
import {
  AppNotification,
  NOTIF_UPDATED_EVENT,
  getLocalNotifications,
  saveLocalNotifications,
  markNotificationAsReadInStore,
  deleteNotificationFromStore,
  formatRelativeNotifTime,
} from '../services/notificationService';

interface NotificationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAction?: (type: string) => void;
  activeUser?: ActiveUser;
  onUnreadCountChange?: (count: number) => void;
}

export const NotificationsModal: React.FC<NotificationsModalProps> = ({
  isOpen,
  onClose,
  onAction,
  activeUser,
  onUnreadCountChange,
}) => {
  const [firestoreNotifs, setFirestoreNotifs] = useState<AppNotification[]>([]);
  const [localNotifs, setLocalNotifs] = useState<AppNotification[]>(() => getLocalNotifications());
  const [filterTab, setFilterTab] = useState<'all' | 'unread'>('all');

  const userKey = activeUser?.id || activeUser?.name || 'guest';
  const readStorageKey = `noorworship_read_notifs_${userKey}`;
  const dismissedStorageKey = `noorworship_dismissed_notifs_${userKey}`;

  const [readIds, setReadIds] = useState<string[]>([]);
  const [dismissedIds, setDismissedIds] = useState<string[]>([]);

  // Load per-user read and dismissed notification IDs when activeUser changes
  useEffect(() => {
    try {
      const savedRead = localStorage.getItem(readStorageKey);
      setReadIds(savedRead ? JSON.parse(savedRead) : []);
    } catch {
      setReadIds([]);
    }
    try {
      const savedDismissed = localStorage.getItem(dismissedStorageKey);
      setDismissedIds(savedDismissed ? JSON.parse(savedDismissed) : []);
    } catch {
      setDismissedIds([]);
    }
  }, [readStorageKey, dismissedStorageKey]);

  // Listen to local notification updates
  const syncLocal = useCallback(() => {
    setLocalNotifs(getLocalNotifications());
  }, []);

  useEffect(() => {
    syncLocal();
    window.addEventListener(NOTIF_UPDATED_EVENT, syncLocal);
    window.addEventListener('storage', syncLocal);
    return () => {
      window.removeEventListener(NOTIF_UPDATED_EVENT, syncLocal);
      window.removeEventListener('storage', syncLocal);
    };
  }, [syncLocal, isOpen]);

  // Listen to Firestore notifications in real-time
  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, 'notifications'),
      (snapshot) => {
        const list: AppNotification[] = [];
        snapshot.forEach((docSnap) => {
          list.push({ id: docSnap.id, ...(docSnap.data() as any) });
        });
        setFirestoreNotifs(list);
      },
      (err) => {
        console.warn('Firestore notifications listener error:', err);
      }
    );
    return () => unsub();
  }, []);

  // Merge notifications from Firestore + localStorage + default list
  const mergedNotifications = useMemo(() => {
    const map = new Map<string, AppNotification>();
    (NOTIFICATIONS_LIST as AppNotification[]).forEach((n) => map.set(n.id, n));
    localNotifs.forEach((n) => map.set(n.id, n));
    firestoreNotifs.forEach((n) => map.set(n.id, n));

    return Array.from(map.values()).sort(
      (a: any, b: any) =>
        new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
    );
  }, [localNotifs, firestoreNotifs]);

  // Filter notifications relevant to the active user & deduplicate broadcasts
  const userNotifications = useMemo(() => {
    const seenBroadcastKeys = new Set<string>();

    return mergedNotifications
      .filter((item: any) => {
        if (dismissedIds.includes(item.id)) return false;
        if (!activeUser) return true;

        const isDeptHX =
          activeUser.role === 'dept-hx' || activeUser.role === 'hq-admin';
        const isUstadz = activeUser.role === 'admin';

        const matchesUserId =
          Boolean(item.targetUserId) && item.targetUserId === activeUser.id;
        const matchesUserName =
          Boolean(item.recipientName) &&
          item.recipientName.trim().toLowerCase() ===
            activeUser.name.trim().toLowerCase();
        const itemHalaqah = item.targetHalaqah || item.halaqah;
        const matchesHalaqah =
          Boolean(itemHalaqah) &&
          (!activeUser.halaqah ||
            itemHalaqah === activeUser.halaqah ||
            itemHalaqah === 'Semua Halaqah' ||
            itemHalaqah === 'Semua');

        if (isDeptHX) {
          // Dept HX can monitor all notifications, but deduplicate batch broadcasts/reminders
          const dedupKey =
            item.batchId ||
            `${item.type}|${item.title}|${item.message}|${(item.createdAt || '').slice(0, 16)}`;
          if (seenBroadcastKeys.has(dedupKey)) return false;
          seenBroadcastKeys.add(dedupKey);
          return true;
        }

        if (isUstadz) {
          // Ustadz sees global broadcasts, notifications targeted to them, or notifications in their halaqah / sent by them
          const relevantToUstadz =
            item.isGlobal === true ||
            matchesUserId ||
            matchesUserName ||
            matchesHalaqah ||
            item.senderName === activeUser.name ||
            (!item.targetUserId && !item.recipientName && !itemHalaqah);

          if (!relevantToUstadz) return false;

          const dedupKey =
            item.batchId ||
            `${item.type}|${item.title}|${item.message}|${(item.createdAt || '').slice(0, 16)}`;
          if (seenBroadcastKeys.has(dedupKey)) return false;
          seenBroadcastKeys.add(dedupKey);
          return true;
        }

        // Member (Karyawan):
        // 1. Directly targeted to this member
        if (matchesUserId || matchesUserName) {
          const dedupKey =
            item.batchId ||
            `${item.type}|${item.title}|${item.message}|${(item.createdAt || '').slice(0, 16)}`;
          if (seenBroadcastKeys.has(dedupKey)) return false;
          seenBroadcastKeys.add(dedupKey);
          return true;
        }
        // 2. If targeted to another specific user, hide
        if (item.targetUserId || item.recipientName) {
          return false;
        }
        // 3. Global or Halaqah-level notification
        if (item.isGlobal === true || matchesHalaqah || !itemHalaqah) {
          const dedupKey =
            item.batchId ||
            `${item.type}|${item.title}|${item.message}|${(item.createdAt || '').slice(0, 16)}`;
          if (seenBroadcastKeys.has(dedupKey)) return false;
          seenBroadcastKeys.add(dedupKey);
          return true;
        }

        return false;
      })
      .map((item) => ({
        ...item,
        read: Boolean(item.read) || readIds.includes(item.id),
      }));
  }, [mergedNotifications, activeUser, readIds, dismissedIds]);

  const unreadCount = useMemo(
    () => userNotifications.filter((n) => !n.read).length,
    [userNotifications]
  );

  // Report live unread count to parent (App -> Header)
  useEffect(() => {
    onUnreadCountChange?.(unreadCount);
  }, [unreadCount, onUnreadCountChange]);

  const persistReadIds = (nextReadIds: string[]) => {
    setReadIds(nextReadIds);
    try {
      localStorage.setItem(readStorageKey, JSON.stringify(nextReadIds));
    } catch {}
  };

  const persistDismissedIds = (nextDismissedIds: string[]) => {
    setDismissedIds(nextDismissedIds);
    try {
      localStorage.setItem(dismissedStorageKey, JSON.stringify(nextDismissedIds));
    } catch {}
  };

  const handleMarkOneRead = async (notifId: string) => {
    if (!readIds.includes(notifId)) {
      persistReadIds([...readIds, notifId]);
    }
    await markNotificationAsReadInStore(notifId);
  };

  const handleMarkAllRead = async () => {
    const allIds = Array.from(
      new Set([...readIds, ...userNotifications.map((n) => n.id)])
    );
    persistReadIds(allIds);

    const updatedLocal = localNotifs.map((n) => ({ ...n, read: true }));
    setLocalNotifs(updatedLocal);
    saveLocalNotifications(updatedLocal);

    for (const item of userNotifications) {
      if (!item.read) {
        markNotificationAsReadInStore(item.id);
      }
    }
  };

  const handleDeleteOne = async (e: React.MouseEvent, notifId: string) => {
    e.stopPropagation();
    if (!dismissedIds.includes(notifId)) {
      persistDismissedIds([...dismissedIds, notifId]);
    }
    await deleteNotificationFromStore(notifId);
  };

  const handleClearRead = async () => {
    const readNotifIds = userNotifications.filter((n) => n.read).map((n) => n.id);
    if (readNotifIds.length === 0) return;

    const nextDismissed = Array.from(new Set([...dismissedIds, ...readNotifIds]));
    persistDismissedIds(nextDismissed);

    for (const id of readNotifIds) {
      deleteNotificationFromStore(id);
    }
  };

  const displayedNotifications = useMemo(() => {
    if (filterTab === 'unread') {
      return userNotifications.filter((n) => !n.read);
    }
    return userNotifications;
  }, [userNotifications, filterTab]);

  if (!isOpen) return null;

  const getIconConfig = (type: string) => {
    switch (type) {
      case 'worship':
        return {
          icon: 'mosque',
          bg: 'bg-[#c1ecd4]/60 text-[#00452c]',
          badge: 'Ibadah Halaqah',
        };
      case 'assignment':
        return {
          icon: 'auto_stories',
          bg: 'bg-[#fed488]/50 text-[#775a19]',
          badge: 'Setoran & Tilawah',
        };
      case 'reminder':
        return {
          icon: 'notifications_active',
          bg: 'bg-rose-100 text-rose-700',
          badge: 'Pengingat Ustadz/ah',
        };
      case 'broadcast':
        return {
          icon: 'campaign',
          bg: 'bg-blue-100 text-blue-700',
          badge: 'Maklumat Resmi',
        };
      case 'appreciation':
        return {
          icon: 'workspace_premium',
          bg: 'bg-amber-100 text-amber-800',
          badge: 'Apresiasi Ustadz/ah',
        };
      default:
        return {
          icon: 'local_fire_department',
          bg: 'bg-[#fed488]/40 text-[#775a19]',
          badge: 'Pemberitahuan',
        };
    }
  };

  return (
    <div
      className="fixed inset-0 z-[60] bg-[#141b2b]/55 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 transition-opacity animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-[#ffffff] rounded-3xl p-4 sm:p-5 shadow-2xl border border-[#1b4332]/10 flex flex-col max-h-[85vh] overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#e9edff]">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-2xl bg-[#012d1d] flex items-center justify-center text-[#92f7c3] shrink-0 shadow-xs">
              <span className="material-symbols-outlined text-[19px]">notifications</span>
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <h3 className="font-bold text-[#141b2b] text-sm sm:text-base leading-tight truncate">
                  Pemberitahuan &amp; Pengingat
                </h3>
                {unreadCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-[#fed488] text-[#775a19] text-[10px] font-extrabold shrink-0">
                    {unreadCount} Baru
                  </span>
                )}
              </div>
              <p className="text-[11px] text-[#414844] truncate mt-0.5">
                {activeUser
                  ? `${activeUser.name} • ${activeUser.halaqah || 'JejakTaqwa'}`
                  : 'Notifikasi langsung & tugas halaqah'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[#f1f3ff] hover:bg-[#e9edff] flex items-center justify-center text-[#414844] transition-colors cursor-pointer shrink-0"
            title="Tutup Notifikasi"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center justify-between gap-2 pt-2.5 pb-2 border-b border-[#f1f3ff]">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setFilterTab('all')}
              className={`px-3 py-1 rounded-full text-xs font-bold transition-colors cursor-pointer ${
                filterTab === 'all'
                  ? 'bg-[#012d1d] text-white shadow-2xs'
                  : 'bg-[#f1f3ff] text-[#414844] hover:bg-[#e9edff]'
              }`}
            >
              Semua ({userNotifications.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterTab('unread')}
              className={`px-3 py-1 rounded-full text-xs font-bold transition-colors cursor-pointer ${
                filterTab === 'unread'
                  ? 'bg-[#012d1d] text-white shadow-2xs'
                  : 'bg-[#f1f3ff] text-[#414844] hover:bg-[#e9edff]'
              }`}
            >
              Belum Dibaca ({unreadCount})
            </button>
          </div>

          {userNotifications.some((n) => n.read) && (
            <button
              type="button"
              onClick={handleClearRead}
              className="text-[11px] font-semibold text-[#717973] hover:text-rose-600 transition-colors cursor-pointer"
            >
              Hapus yang Dibaca
            </button>
          )}
        </div>

        {/* Notifications List */}
        <div className="overflow-y-auto divide-y divide-[#f1f3ff] py-1.5 flex-1 pr-0.5">
          {displayedNotifications.length === 0 ? (
            <div className="py-10 px-4 text-center space-y-2">
              <div className="w-12 h-12 rounded-full bg-[#f1f3ff] text-[#717973] flex items-center justify-center mx-auto">
                <span className="material-symbols-outlined text-[24px]">
                  notifications_off
                </span>
              </div>
              <p className="text-xs font-bold text-[#141b2b]">
                {filterTab === 'unread'
                  ? 'Semua pemberitahuan sudah dibaca'
                  : 'Belum ada pemberitahuan atau pengingat'}
              </p>
              <p className="text-[11px] text-[#717973] max-w-xs mx-auto leading-relaxed">
                Maklumat dari Ustadz/ah pembimbing, pengingat mutaba&apos;ah ibadah, dan tugas setoran tilawah akan muncul secara otomatis di sini.
              </p>
            </div>
          ) : (
            displayedNotifications.map((item: any) => {
              const cfg = getIconConfig(item.type);
              const relativeTime = formatRelativeNotifTime(item.createdAt, item.time);

              return (
                <div
                  key={item.id}
                  onClick={() => handleMarkOneRead(item.id)}
                  className={`py-3 px-2.5 flex gap-3 items-start transition-all rounded-2xl cursor-pointer group ${
                    !item.read
                      ? 'bg-[#f1f3ff]/65 hover:bg-[#f1f3ff] border-l-4 border-l-[#012d1d]'
                      : 'hover:bg-[#f9f9ff] opacity-90'
                  }`}
                >
                  <div
                    className={`w-9 h-9 rounded-xl ${cfg.bg} flex items-center justify-center shrink-0 mt-0.5 shadow-2xs`}
                  >
                    <span className="material-symbols-outlined text-[18px]">
                      {cfg.icon}
                    </span>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[9px] font-extrabold uppercase tracking-wider px-1.5 py-0.2 rounded bg-white/80 text-[#012d1d] border border-[#1b4332]/10">
                            {cfg.badge}
                          </span>
                          {!item.read && (
                            <span className="w-2 h-2 rounded-full bg-[#00452c] shrink-0" />
                          )}
                        </div>
                        <h4
                          className={`text-xs sm:text-sm text-[#141b2b] mt-0.5 leading-snug ${
                            !item.read ? 'font-bold' : 'font-semibold'
                          }`}
                        >
                          {item.title}
                        </h4>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <span className="text-[10px] text-[#717973] whitespace-nowrap">
                          {relativeTime}
                        </span>
                        <button
                          type="button"
                          onClick={(e) => handleDeleteOne(e, item.id)}
                          title="Hapus pemberitahuan ini"
                          className="w-6 h-6 rounded-full hover:bg-rose-100 text-[#717973] hover:text-rose-700 flex items-center justify-center transition-colors opacity-70 group-hover:opacity-100 cursor-pointer"
                        >
                          <span className="material-symbols-outlined text-[14px]">
                            close
                          </span>
                        </button>
                      </div>
                    </div>

                    <p className="text-xs text-[#414844] mt-1 leading-relaxed break-words">
                      {item.message}
                    </p>

                    <div className="flex items-center justify-between gap-2 mt-2 flex-wrap">
                      {item.senderName ? (
                        <span className="text-[10px] font-bold text-[#1b4332] bg-[#c1ecd4]/40 px-2 py-0.5 rounded-full">
                          Dari: {item.senderName}
                        </span>
                      ) : (
                        <span />
                      )}

                      {item.type === 'assignment' && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMarkOneRead(item.id);
                            onClose();
                            onAction?.('open-recitation');
                          }}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#012d1d] hover:bg-[#1b4332] text-white text-[11px] font-bold transition-colors cursor-pointer shadow-2xs"
                        >
                          <span>Buka Ujian Tilawah</span>
                          <span className="material-symbols-outlined text-[13px]">
                            arrow_forward
                          </span>
                        </button>
                      )}

                      {(item.type === 'worship' || item.type === 'reminder') &&
                        (!activeUser || activeUser.role === 'member') && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleMarkOneRead(item.id);
                              onClose();
                              onAction?.('open-worship');
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#c1ecd4] hover:bg-[#a6e3c1] text-[#002114] text-[11px] font-bold transition-colors cursor-pointer"
                          >
                            <span>Lihat Amalan Ibadah</span>
                            <span className="material-symbols-outlined text-[13px]">
                              arrow_forward
                            </span>
                          </button>
                        )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-[#e9edff] flex justify-between items-center gap-2">
          <span className="text-[11px] font-medium text-[#717973]">
            {unreadCount > 0
              ? `${unreadCount} pemberitahuan belum dibaca`
              : 'Semua pemberitahuan telah dibaca ✓'}
          </span>
          <button
            type="button"
            disabled={unreadCount === 0}
            onClick={handleMarkAllRead}
            className={`px-3.5 py-2 rounded-full text-xs font-bold transition-colors ${
              unreadCount > 0
                ? 'bg-[#012d1d] hover:bg-[#1b4332] text-white cursor-pointer shadow-xs'
                : 'bg-[#f1f3ff] text-[#717973] cursor-not-allowed'
            }`}
          >
            Tandai Semua Dibaca
          </button>
        </div>
      </div>
    </div>
  );
};
