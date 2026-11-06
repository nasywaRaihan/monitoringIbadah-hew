import React, { useState, useEffect } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../services/firebase';
import { NOTIFICATIONS_LIST } from '../data/mockData';
import { ActiveUser } from '../types';

interface NotificationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAction?: (type: string) => void;
  activeUser?: ActiveUser;
}

export const NotificationsModal: React.FC<NotificationsModalProps> = ({
  isOpen,
  onClose,
  onAction,
  activeUser
}) => {
  const [notifications, setNotifications] = useState<any[]>(() => {
    try {
      const saved = localStorage.getItem('noorworship_notifications');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.warn(e);
    }
    return NOTIFICATIONS_LIST;
  });

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'notifications'), (snapshot) => {
      const firestoreNotifs: any[] = [];
      snapshot.forEach((docSnap) => {
        firestoreNotifs.push({ id: docSnap.id, ...docSnap.data() });
      });
      if (firestoreNotifs.length > 0) {
        setNotifications((prev) => {
          const map = new Map();
          NOTIFICATIONS_LIST.forEach((n) => map.set(n.id, n));
          prev.forEach((n) => map.set(n.id, n));
          firestoreNotifs.forEach((n) => map.set(n.id, n));
          return Array.from(map.values()).sort((a: any, b: any) => 
            new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
          );
        });
      }
    });
    return () => unsub();
  }, []);

  const userNotifications = notifications.filter((item) => {
    if (!activeUser) return true;
    if (activeUser.role === 'admin' || activeUser.role === 'dept-hx' || activeUser.role === 'hq-admin') {
      return true;
    }
    if (item.targetUserId && item.targetUserId !== activeUser.id) return false;
    if (item.recipientName && item.recipientName !== activeUser.name && item.targetUserId && item.targetUserId !== activeUser.id) return false;
    return true;
  });

  const handleMarkAllRead = () => {
    const updated = notifications.map((n) => ({ ...n, read: true }));
    setNotifications(updated);
    try {
      localStorage.setItem('noorworship_notifications', JSON.stringify(updated));
    } catch (e) {
      console.warn(e);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-[#141b2b]/40 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 transition-opacity">
      <div className="w-full max-w-md bg-[#ffffff] rounded-t-3xl sm:rounded-2xl p-5 shadow-2xl flex flex-col max-h-[85vh] overflow-hidden animate-in slide-in-from-bottom duration-200">
        <div className="w-10 h-1 bg-[#dce2f7] rounded-full mx-auto mb-3 sm:hidden" />
        
        <div className="flex items-center justify-between pb-3 border-b border-[#e9edff]">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-[#1b4332]/10 flex items-center justify-center text-[#012d1d]">
              <span className="material-symbols-outlined text-[18px]">notifications</span>
            </div>
            <div>
              <h3 className="font-bold text-[#141b2b] text-base leading-tight">
                Pemberitahuan &amp; Pengingat
              </h3>
              <p className="text-xs text-[#414844]">
                {activeUser ? `Akun: ${activeUser.name}` : 'Notifikasi langsung &amp; tugas halaqah'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[#f1f3ff] hover:bg-[#e9edff] flex items-center justify-center text-[#414844] transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        <div className="overflow-y-auto divide-y divide-[#f1f3ff] py-2">
          {userNotifications.length === 0 ? (
            <div className="py-8 text-center text-xs text-[#717973]">
              Belum ada pemberitahuan atau pengingat baru untuk Anda.
            </div>
          ) : (
            userNotifications.map((item) => (
              <div
                key={item.id}
                className={`py-3.5 px-2 flex gap-3 items-start transition-colors rounded-xl hover:bg-[#f9f9ff] ${
                  !item.read ? 'bg-[#f1f3ff]/55 border-l-4 border-l-[#012d1d]' : ''
                }`}
              >
                <div className="w-9 h-9 rounded-full bg-[#fed488]/40 text-[#775a19] flex items-center justify-center shrink-0 mt-0.5">
                  <span className="material-symbols-outlined text-[18px]">
                    {item.type === 'worship'
                      ? 'mosque'
                      : item.type === 'assignment'
                      ? 'auto_stories'
                      : item.type === 'reminder'
                      ? 'notifications_active'
                      : 'local_fire_department'}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <h4 className="text-sm font-semibold text-[#141b2b] truncate">
                      {item.title}
                    </h4>
                    <span className="text-[11px] text-[#717973] shrink-0">{item.time}</span>
                  </div>
                  <p className="text-xs text-[#414844] mt-0.5 leading-relaxed">
                    {item.message}
                  </p>
                  {item.senderName && (
                    <p className="text-[10px] font-bold text-[#1b4332] mt-1">
                      Dari: {item.senderName}
                    </p>
                  )}
                  {item.type === 'assignment' && (
                    <button
                      onClick={() => {
                        onClose();
                        onAction?.('open-recitation');
                      }}
                      className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-[#012d1d] hover:underline cursor-pointer"
                    >
                      <span>Buka Ujian Tilawah</span>
                      <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        <div className="pt-3 border-t border-[#e9edff] flex justify-between items-center">
          <span className="text-[11px] text-[#717973]">
            {userNotifications.filter(n => !n.read).length} belum dibaca
          </span>
          <button
            onClick={handleMarkAllRead}
            className="px-4 py-2 rounded-full bg-[#f1f3ff] hover:bg-[#e9edff] text-xs font-semibold text-[#012d1d] transition-colors cursor-pointer"
          >
            Tandai semua sudah dibaca
          </button>
        </div>
      </div>
    </div>
  );
};
