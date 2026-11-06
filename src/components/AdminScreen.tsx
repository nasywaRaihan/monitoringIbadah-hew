import React, { useState, useEffect, useMemo } from 'react';
import {
  collection,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  query,
  where
} from 'firebase/firestore';
import { db } from '../services/firebase';
import {
  DailyTask,
  ActiveUser,
  IbadahDirective,
  StudentTaskSubmission,
  HalaqahAttendanceSession
} from '../types';
import {
  DEFAULT_HALAQAH_ROSTER,
  DEFAULT_IBADAH_DIRECTIVES
} from '../data/mockData';
import { HalaqahAttendanceManager } from './HalaqahAttendanceManager';

interface AdminScreenProps {
  onShowToast: (msg: string) => void;
  onOpenSheets: () => void;
  isSheetsConnected: boolean;
  onOpenAuth: () => void;
  onAddHalaqahTask: (task: DailyTask) => void;
  activeUser: ActiveUser;
  registeredUsers: ActiveUser[];
  ibadahDirectives: IbadahDirective[];
  setIbadahDirectives: React.Dispatch<React.SetStateAction<IbadahDirective[]>>;
  attendanceSessions?: HalaqahAttendanceSession[];
  onSaveAttendanceSession?: (session: HalaqahAttendanceSession) => void;
  onDeleteAttendanceSession?: (sessionId: string) => void;
}

export default function AdminScreen({
  onShowToast,
  onOpenSheets,
  isSheetsConnected,
  onOpenAuth,
  onAddHalaqahTask,
  activeUser,
  registeredUsers,
  ibadahDirectives,
  setIbadahDirectives,
  attendanceSessions,
  onSaveAttendanceSession,
  onDeleteAttendanceSession
}: AdminScreenProps) {
  const [ibadahFilter, setIbadahFilter] = useState<'all' | 'yaumiyah' | 'usbu\'iyah'>('all');
  const [dashboardTab, setDashboardTab] = useState<'halaqah' | 'presensi' | 'students'>('halaqah');
  const [selectedHalaqahGroup, setSelectedHalaqahGroup] = useState<string | null>(null);
  const [selectedStudentDetail, setSelectedStudentDetail] = useState<any | null>(null);
  const [studentSearchQuery, setStudentSearchQuery] = useState('');

  const allStudentsList = useMemo(() => {
    const map = new Map<string, any>();
    DEFAULT_HALAQAH_ROSTER.forEach((s) => {
      map.set(s.id, {
        ...s,
        totalXp: 1420,
        streakDays: 7,
        tajweedAcc: 94,
        role: 'member',
        supervisor: 'Ustadz Farhan',
        phone: '081234567890'
      });
    });
    if (registeredUsers && registeredUsers.length > 0) {
      registeredUsers.forEach((u) => {
        map.set(u.id, {
          id: u.id,
          name: u.name,
          avatar: u.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
          halaqah: u.halaqah || 'Halaqah Al-Fajr',
          totalXp: u.totalXp || 1200,
          streakDays: u.streakDays || 5,
          tajweedAcc: 92,
          role: u.role || 'santri',
          supervisor: (u as any).supervisor || 'Ustadz Farhan',
          phone: (u as any).phone || '081298765432'
        });
      });
    }
    return Array.from(map.values());
  }, [registeredUsers]);

  const halaqahGroups = useMemo(() => {
    const groups: Record<string, any[]> = {};
    allStudentsList.forEach((st) => {
      const h = st.halaqah || 'Halaqah Al-Fajr';
      if (!groups[h]) groups[h] = [];
      groups[h].push(st);
    });
    return Object.entries(groups).map(([halaqahName, members]) => ({
      halaqahName,
      members,
      supervisor:
        halaqahName === 'Halaqah Al-Fajr'
          ? 'Ustadz Farhan'
          : halaqahName === 'Hafiz Circle'
          ? 'Tariq Mansoor'
          : 'Ustadz Pembimbing',
      avgTajweed: 93,
      compliance: 89
    }));
  }, [allStudentsList]);
  
  const [editingDirective, setEditingDirective] = useState<IbadahDirective | null>(null);
  const [taskToDelete, setTaskToDelete] = useState<{ id: string; title: string; category?: string; xp?: number } | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editTarget, setEditTarget] = useState('');
  const [editXp, setEditXp] = useState(100);
  const [editType, setEditType] = useState<'yaumiyah' | 'usbu\'iyah'>('yaumiyah');
  const [editStatus, setEditStatus] = useState<'Aktif' | 'Selesai'>('Aktif');
  const [editIsRecurring, setEditIsRecurring] = useState<boolean>(true);

  const [selectedTaskForSubmissions, setSelectedTaskForSubmissions] = useState<IbadahDirective | null>(null);
  const [drawerType, setDrawerType] = useState<'recitation' | 'ibadah_task' | null>(null);
  const [passingScore, setPassingScore] = useState(90);
  const [submissionFilter, setSubmissionFilter] = useState<'all' | 'completed' | 'pending'>('all');
  const [submissionSearch, setSubmissionSearch] = useState('');

  // Form State for New Ibadah Task
  const [newIbadahType, setNewIbadahType] = useState<'yaumiyah' | 'usbu\'iyah'>('yaumiyah');
  const [newIbadahTitle, setNewIbadahTitle] = useState('Shalat Fardhu 5 Waktu Berjamaah');
  const [newIbadahCategory, setNewIbadahCategory] = useState('Shalat Wajib');
  const [newIbadahTarget, setNewIbadahTarget] = useState('Wajib berjamaah di masjid tepat waktu');
  const [newIbadahXp, setNewIbadahXp] = useState(15);
  const [newIbadahIsRecurring, setNewIbadahIsRecurring] = useState<boolean>(true);

  // Form State for Setoran Ayat / Recitation Task
  const [recitationSurah, setRecitationSurah] = useState('Surah Al-Mulk (Tabarak)');
  const [recitationCustomSurah, setRecitationCustomSurah] = useState('');
  const [recitationStartVerse, setRecitationStartVerse] = useState(1);
  const [recitationEndVerse, setRecitationEndVerse] = useState(30);
  const [recitationPassingScore, setRecitationPassingScore] = useState(90);
  const [recitationXp, setRecitationXp] = useState(15);
  const [recitationType, setRecitationType] = useState<'yaumiyah' | 'usbu\'iyah'>("usbu'iyah");
  const [recitationIsRecurring, setRecitationIsRecurring] = useState<boolean>(true);

  // Broadcast State
  const [showBroadcastModal, setShowBroadcastModal] = useState(false);
  const [broadcastText, setBroadcastText] = useState('');

  const handleSendBroadcast = async () => {
    if (!broadcastText.trim()) {
      onShowToast('Mohon isi maklumat pengumuman');
      return;
    }

    const halaqahTarget = activeUser.halaqah || 'Halaqah Al-Fajr';
    // Filter members for this ustadz's halaqah
    const members = registeredUsers.filter(u => u.role === 'member' && u.halaqah === halaqahTarget);

    if (members.length === 0) {
      onShowToast(`Belum ada anggota terdaftar di ${halaqahTarget} untuk menerima maklumat.`);
      setShowBroadcastModal(false);
      return;
    }

    const now = new Date();
    const timestamp = now.toISOString();

    // Create notifications for each member
    for (const member of members) {
      const notifId = `notif-broadcast-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      const notificationItem = {
        id: notifId,
        targetUserId: member.id,
        recipientName: member.name,
        senderName: activeUser.name,
        title: `Maklumat ${halaqahTarget}`,
        message: broadcastText.trim(),
        time: 'Baru saja',
        read: false,
        type: 'broadcast',
        createdAt: timestamp
      };

      try {
        await setDoc(doc(db, 'notifications', notifId), notificationItem);
      } catch (e) {
        console.error('Error sending broadcast:', e);
      }
    }

    onShowToast(`📢 Maklumat berhasil disiarkan ke seluruh anggota ${halaqahTarget}!`);
    setBroadcastText('');
    setShowBroadcastModal(false);
  };

  const handleOpenEdit = (task: IbadahDirective) => {
    setEditingDirective(task);
    setEditTitle(task.title);
    setEditCategory(task.category);
    setEditTarget(task.target);
    setEditXp(task.xp);
    setEditType(task.type);
    setEditStatus(task.status);
    setEditIsRecurring(task.isRecurring ?? true);
  };

  const handleSaveEdit = async () => {
    if (!editingDirective) return;
    const title = editTitle.trim() || editingDirective.title;
    const target = editTarget.trim() || editingDirective.target;
    const isYaumiyah = editType === 'yaumiyah';

    // Strict 30 XP daily quota applies ONLY to Yaumiyah (Harian) tasks
    if (isYaumiyah) {
      if (editXp > 30) {
        onShowToast(
          'Peringatan: Kuota tugas Ustadz tipe Yaumiyah (Harian) maksimal 30 XP per hari. Untuk poin 50 XP, silakan gunakan tipe Usbu\'iyah (Mingguan).'
        );
        return;
      }

      const otherYaumiyahTasks = (ibadahDirectives || []).filter(
        (d) => d.id !== editingDirective.id && d.status === 'Aktif' && d.type === 'yaumiyah'
      );
      const otherYaumiyahXp = otherYaumiyahTasks.reduce((sum, d) => sum + (d.xp || 0), 0);

      if (otherYaumiyahXp + editXp > 30) {
        const remainingQuota = Math.max(0, 30 - otherYaumiyahXp);
        onShowToast(
          `Peringatan: Total tugas Yaumiyah (Harian) Ustadz jika diedit menjadi ${otherYaumiyahXp + editXp} XP akan melebihi kuota harian 30 XP/hari (Sisa kuota: ${remainingQuota} XP).`
        );
        return;
      }
    }

    const validityDays = isYaumiyah ? 1 : 7;
    const now = new Date();
    const expDate = new Date(now.getTime() + validityDays * 24 * 60 * 60 * 1000);
    
    try {
      await updateDoc(doc(db, 'ibadahDirectives', editingDirective.id), {
        title,
        category: editCategory,
        target,
        xp: editXp,
        type: editType,
        status: editStatus,
        isRecurring: editIsRecurring,
        validityDays,
        expiresAt: expDate.toISOString()
      });
      setEditingDirective(null);
      onShowToast(`Tugas ibadah "${title}" berhasil diperbarui di Firestore`);
    } catch (e) {
      console.error('Error updating directive:', e);
      onShowToast('Gagal memperbarui tugas di Firestore');
    }
  };

  const handleDeleteDirective = async (id: string, title: string) => {
    try {
      await deleteDoc(doc(db, 'ibadahDirectives', id));
      if (selectedTaskForSubmissions?.id === id) {
        setSelectedTaskForSubmissions(null);
      }
      onShowToast(`Tugas ibadah "${title}" telah dihapus dari Firestore`);
    } catch (e) {
      console.error('Error deleting directive:', e);
      onShowToast('Gagal menghapus tugas');
    }
  };

  // Toggle student task completion manually by Ustadz
  const handleToggleStudentTaskCompletion = async (taskId: string, studentId: string) => {
    const directive = ibadahDirectives.find(d => d.id === taskId);
    if (!directive) return;

    const currentSubs = directive.submissions || [];
    const targetSub = currentSubs.find((s) => s.studentId === studentId);
    const willBeCompleted = !targetSub?.isCompleted;

    const submissionRef = doc(db, `ibadahDirectives/${taskId}/submissions`, studentId);
    
    try {
      await setDoc(submissionRef, {
        studentId,
        studentName: targetSub?.studentName || 'Karyawan',
        studentAvatar: targetSub?.studentAvatar || '',
        halaqah: targetSub?.halaqah || activeUser.halaqah,
        isCompleted: willBeCompleted,
        completedAt: willBeCompleted
          ? `Hari ini ${new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB (Disahkan Ustadz)`
          : undefined,
        notes: willBeCompleted ? 'Terverifikasi langsung oleh Ustadz' : 'Belum setor mutaba\'ah'
      }, { merge: true });

      onShowToast(
        willBeCompleted
          ? `Status ${targetSub?.studentName || 'Karyawan'} ditandai Sudah Mengerjakan ✓`
          : `Status ${targetSub?.studentName || 'Karyawan'} diubah ke Belum Mengerjakan`
      );
    } catch (e) {
      console.error('Error updating student submission:', e);
      onShowToast('Gagal memperbarui status karyawan di Firestore');
    }
  };

  const handleRemindStudent = async (studentName: string, taskTitle: string, studentId?: string) => {
    const notifId = `notif-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const notificationItem = {
      id: notifId,
      targetUserId: studentId || '',
      recipientName: studentName,
      senderName: activeUser?.name || 'Ustadz Pembimbing',
      title: 'Pengingat Mutaba\'ah Ibadah',
      message: `Mohon segera menuntaskan tugas "${taskTitle}". Barakallahu fikum.`,
      time: 'Baru saja',
      read: false,
      type: 'reminder',
      createdAt: new Date().toISOString()
    };

    try {
      await setDoc(doc(db, 'notifications', notifId), notificationItem);
    } catch (e) {
      console.warn('Could not save notification to Firestore', e);
    }

    try {
      const existing = JSON.parse(localStorage.getItem('noorworship_notifications') || '[]');
      localStorage.setItem('noorworship_notifications', JSON.stringify([notificationItem, ...existing]));
    } catch (e) {
      console.warn('Could not save notification to localStorage', e);
    }

    onShowToast(`Notifikasi pengingat berhasil dikirim ke akun ${studentName}! 🔔`);
  };

  const handleRemindAllPending = async (task: IbadahDirective) => {
    const pending = (task.submissions || []).filter((s) => !s.isCompleted);
    if (pending.length === 0) {
      onShowToast('Alhamdulillah, seluruh karyawan sudah menyelesaikan tugas ini!');
      return;
    }

    const newNotifs: any[] = [];
    for (const sub of pending) {
      const notifId = `notif-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      const notificationItem = {
        id: notifId,
        targetUserId: sub.studentId || '',
        recipientName: sub.studentName,
        senderName: activeUser?.name || 'Ustadz Pembimbing',
        title: 'Pengingat Mutaba\'ah Ibadah',
        message: `Mohon segera menuntaskan tugas "${task.title}". Barakallahu fikum.`,
        time: 'Baru saja',
        read: false,
        type: 'reminder',
        createdAt: new Date().toISOString()
      };
      newNotifs.push(notificationItem);
      try {
        await setDoc(doc(db, 'notifications', notifId), notificationItem);
      } catch (e) {
        console.warn('Could not save notification to Firestore', e);
      }
    }

    try {
      const existing = JSON.parse(localStorage.getItem('noorworship_notifications') || '[]');
      localStorage.setItem('noorworship_notifications', JSON.stringify([...newNotifs, ...existing]));
    } catch (e) {
      console.warn('Could not save notifications to localStorage', e);
    }

    onShowToast(`Notifikasi pengingat serentak terkirim ke ${pending.length} akun karyawan yang belum mengerjakan! 🔔`);
  };

  const handleApplaudStudent = (studentName: string) => {
    onShowToast(`Apresiasi bintang terkirim ke ${studentName}! ⭐`);
  };

  const handleCopyWhatsAppBroadcast = (task: IbadahDirective) => {
    const submissions = task.submissions || [];
    const completed = submissions.filter((s) => s.isCompleted);
    const pending = submissions.filter((s) => !s.isCompleted);

    const text =
      `📋 *MUTABA'AH TUGAS IBADAH: ${task.title.toUpperCase()}*\n` +
      `🏷️ Tipe: ${task.type === 'yaumiyah' ? 'Yaumiyah (Harian)' : 'Usbu\'iyah (Mingguan)'} • Kategori: ${task.category}\n` +
      `🎯 Target: ${task.target}\n` +
      `🕌 Halaqah: ${activeUser?.halaqah || 'Halaqah Al-Fajr'} • Pembimbing: ${activeUser?.name || 'Ustadz Farhan'}\n` +
      `📊 Kepatuhan: ${completed.length}/${submissions.length} Karyawan (${task.compliancePercent}%)\n\n` +
      `✅ *SUDAH MENGERJAKAN (${completed.length} Karyawan):*\n` +
      (completed.length > 0
        ? completed
            .map((s, idx) => `${idx + 1}. ${s.studentName} (${s.completedAt || 'Tuntas'})`)
            .join('\n')
        : '- Belum ada karyawan yang tuntas -\n') +
      `\n\n❌ *BELUM / TIDAK MENGERJAKAN (${pending.length} Karyawan):*\n` +
      (pending.length > 0
        ? pending
            .map((s, idx) => `${idx + 1}. ${s.studentName}${s.notes ? ` [${s.notes}]` : ''}`)
            .join('\n')
        : '- MasyaAllah, seluruh karyawan sudah tuntas -\n') +
      `\n\n_Bagi karyawan yang belum, dimohon segera menyelesaikan dan melaporkan mutaba'ah ibadah. Barakallahu fikum._`;

    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
    }
    onShowToast(`Format rekap tugas WhatsApp berhasil disalin ke clipboard!`);
  };

  const handlePublishRecitationTask = async () => {
    const finalSurah =
      recitationSurah === 'custom'
        ? recitationCustomSurah.trim() || 'Surah Pilihan Ustadz'
        : recitationSurah;

    const title = `Setoran Tilawah & Tajwid: ${finalSurah} (Ayat ${recitationStartVerse}-${recitationEndVerse})`;
    const target = `Target kelulusan Tajwid AI minimal ${recitationPassingScore}% • ${finalSurah} Ayat ${recitationStartVerse}-${recitationEndVerse}`;
    const directiveId = `ibadah-recitation-${Date.now()}`;
    const halaqahTarget = activeUser?.halaqah || 'Halaqah Al-Fajr';

    const isYaumiyah = recitationType === 'yaumiyah';

    // Strict 30 XP daily quota applies ONLY to Yaumiyah (Harian) tasks
    if (isYaumiyah) {
      if (recitationXp > 30) {
        onShowToast(
          `Peringatan: Kuota tugas Ustadz tipe Yaumiyah (Harian) maksimal 30 XP per hari. Untuk poin 50 XP, silakan gunakan tipe Usbu'iyah (Mingguan).`
        );
        return;
      }

      const activeYaumiyahTasks = (ibadahDirectives || []).filter(
        (d) =>
          d.status === 'Aktif' &&
          d.type === 'yaumiyah' &&
          ((d as any).targetHalaqah === halaqahTarget ||
            (d as any).targetHalaqah === 'Semua Halaqah' ||
            (d as any).targetHalaqah === 'Semua')
      );

      const currentYaumiyahXp = activeYaumiyahTasks.reduce((sum, d) => sum + (d.xp || 0), 0);
      const remainingQuota = Math.max(0, 30 - currentYaumiyahXp);

      if (currentYaumiyahXp + recitationXp > 30) {
        onShowToast(
          `Peringatan: Total tugas Yaumiyah (Harian) Ustadz untuk ${halaqahTarget} hari ini sudah ${currentYaumiyahXp} XP. Penambahan ${recitationXp} XP melebihi kuota harian 30 XP (Sisa kuota: ${remainingQuota} XP).`
        );
        return;
      }
    }

    const validityDays = recitationType === 'yaumiyah' ? 1 : 7;
    const now = new Date();
    const expDate = new Date(now.getTime() + validityDays * 24 * 60 * 60 * 1000);

    const newDirective: any = {
      id: directiveId,
      type: recitationType,
      title,
      target,
      xp: recitationXp,
      compliancePercent: 0,
      status: 'Aktif',
      category: 'Tilawah & Hifdz',
      isRecitationTest: true,
      isRecurring: recitationIsRecurring,
      validityDays,
      expiresAt: expDate.toISOString(),
      surahName: finalSurah,
      startVerse: recitationStartVerse,
      endVerse: recitationEndVerse,
      passingScore: recitationPassingScore,
      targetHalaqah: halaqahTarget,
      createdBy: activeUser?.name || 'Ustadz Pembimbing',
      createdAt: now.toISOString()
    };

    try {
      await setDoc(doc(db, 'ibadahDirectives', directiveId), newDirective);

      const studentMap = new Map<string, any>();
      DEFAULT_HALAQAH_ROSTER.forEach((s) => {
        if (
          s.halaqah === halaqahTarget ||
          halaqahTarget === 'Semua Halaqah' ||
          halaqahTarget === 'Semua'
        ) {
          studentMap.set(s.id, s);
        }
      });
      if (registeredUsers && registeredUsers.length > 0) {
        registeredUsers.forEach((u) => {
          if (
            u.role === 'member' &&
            (u.halaqah === halaqahTarget ||
              halaqahTarget === 'Semua Halaqah' ||
              halaqahTarget === 'Semua')
          ) {
            studentMap.set(u.id, u);
          }
        });
      }

      for (const s of Array.from(studentMap.values())) {
        await setDoc(doc(db, `ibadahDirectives/${directiveId}/submissions`, s.id), {
          studentId: s.id,
          studentName: s.name,
          studentAvatar: s.avatar || '',
          halaqah: s.halaqah || halaqahTarget,
          isCompleted: false,
          notes: `Setoran ayat ${finalSurah} baru disiarkan ustadz`
        });
      }

      setDrawerType(null);
      onShowToast(
        `Tugas Setoran Ayat "${finalSurah}" (${recitationType === 'yaumiyah' ? 'Harian/1 Hari' : 'Mingguan/1 Pekan'} • ${recitationIsRecurring ? 'Berulang' : '1x'}) berhasil disiarkan ke karyawan ${halaqahTarget}!`
      );
    } catch (e) {
      console.error('Error publishing recitation task:', e);
      onShowToast('Gagal menyiarkan tugas setoran ke Firestore');
    }
  };

  const handlePublishIbadahTask = async () => {
    const title =
      newIbadahTitle.trim() ||
      (newIbadahType === 'yaumiyah' ? 'Target Yaumiyah' : 'Target Usbu\'iyah');
    const target =
      newIbadahTarget.trim() ||
      (newIbadahType === 'yaumiyah'
        ? 'Target harian halaqah'
        : 'Target mingguan halaqah');
    const directiveId = `ibadah-${Date.now()}`;
    const halaqahTarget = activeUser?.halaqah || 'Halaqah Al-Fajr';

    const isYaumiyah = newIbadahType === 'yaumiyah';

    // Strict 30 XP daily quota applies ONLY to Yaumiyah (Harian) tasks
    if (isYaumiyah) {
      if (newIbadahXp > 30) {
        onShowToast(
          `Peringatan: Kuota tugas Ustadz tipe Yaumiyah (Harian) maksimal 30 XP per hari. Untuk poin 50 XP, silakan gunakan tipe Usbu'iyah (Mingguan).`
        );
        return;
      }

      const activeYaumiyahTasks = (ibadahDirectives || []).filter(
        (d) =>
          d.status === 'Aktif' &&
          d.type === 'yaumiyah' &&
          ((d as any).targetHalaqah === halaqahTarget ||
            (d as any).targetHalaqah === 'Semua Halaqah' ||
            (d as any).targetHalaqah === 'Semua')
      );

      const currentYaumiyahXp = activeYaumiyahTasks.reduce((sum, d) => sum + (d.xp || 0), 0);
      const remainingQuota = Math.max(0, 30 - currentYaumiyahXp);

      if (currentYaumiyahXp + newIbadahXp > 30) {
        onShowToast(
          `Peringatan: Total tugas Yaumiyah (Harian) Ustadz untuk ${halaqahTarget} hari ini sudah ${currentYaumiyahXp} XP. Penambahan ${newIbadahXp} XP melebihi kuota harian 30 XP (Sisa kuota: ${remainingQuota} XP).`
        );
        return;
      }
    }

    const validityDays = newIbadahType === 'yaumiyah' ? 1 : 7;
    const now = new Date();
    const expDate = new Date(now.getTime() + validityDays * 24 * 60 * 60 * 1000);

    const newDirective: any = {
      id: directiveId,
      type: newIbadahType,
      title,
      target,
      xp: newIbadahXp,
      compliancePercent: 0,
      status: 'Aktif',
      category: newIbadahCategory,
      isRecurring: newIbadahIsRecurring,
      validityDays,
      expiresAt: expDate.toISOString(),
      targetHalaqah: halaqahTarget,
      createdBy: activeUser?.name || 'Ustadz Pembimbing',
      createdAt: now.toISOString()
    };

    try {
      await setDoc(doc(db, 'ibadahDirectives', directiveId), newDirective);

      const studentMap = new Map<string, any>();
      DEFAULT_HALAQAH_ROSTER.forEach((s) => {
        if (
          s.halaqah === halaqahTarget ||
          halaqahTarget === 'Semua Halaqah' ||
          halaqahTarget === 'Semua'
        ) {
          studentMap.set(s.id, s);
        }
      });
      if (registeredUsers && registeredUsers.length > 0) {
        registeredUsers.forEach((u) => {
          if (
            u.role === 'member' &&
            (u.halaqah === halaqahTarget ||
              halaqahTarget === 'Semua Halaqah' ||
              halaqahTarget === 'Semua')
          ) {
            studentMap.set(u.id, u);
          }
        });
      }

      for (const s of Array.from(studentMap.values())) {
        await setDoc(doc(db, `ibadahDirectives/${directiveId}/submissions`, s.id), {
          studentId: s.id,
          studentName: s.name,
          studentAvatar: s.avatar || '',
          halaqah: s.halaqah || halaqahTarget,
          isCompleted: false,
          notes: 'Tugas baru diterbitkan ustadz'
        });
      }

      setDrawerType(null);
      onShowToast(
        `Tugas ${newIbadahType === 'yaumiyah' ? 'Yaumiyah' : 'Usbu\'iyah'} "${title}" berhasil disiarkan ke karyawan ${halaqahTarget}!`
      );
    } catch (e) {
      console.error('Error publishing task:', e);
      onShowToast('Gagal menyiarkan tugas ke Firestore');
    }
  };


  const filteredIbadahDirectives = ibadahDirectives.filter((item) => {
    if (ibadahFilter === 'all') return true;
    return item.type === ibadahFilter;
  });

  return (
    <div className="flex flex-col w-full px-4 md:px-6 py-3 space-y-4 max-w-4xl mx-auto pb-28">
      {/* Top Stat Pulse Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-[#012d1d] text-white p-5 shadow-md">
        <div className="absolute -right-12 -top-12 w-44 h-44 rounded-full bg-[#00452c]/40 blur-2xl pointer-events-none" />
        <div className="absolute -left-10 -bottom-10 w-36 h-36 rounded-full bg-[#fed488]/20 blur-xl pointer-events-none" />

        <div className="relative z-10 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-white/15 text-[#ffdea5]">
                <span className="material-symbols-outlined text-[18px]">verified_user</span>
              </span>
              <span className="text-xs uppercase tracking-wider text-[#86af99] font-bold">
                Konsol Pengawas Ustadz
              </span>
            </div>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-white text-xs font-semibold backdrop-blur-md">
              <span className="w-2 h-2 rounded-full bg-[#92f7c3] animate-pulse" />
              Sinkronisasi Langsung
            </span>
          </div>

          <div className="flex flex-col">
            <h2 className="text-xl font-bold text-white tracking-tight">
              Halaqah Al-Fajr • Panel Ustadz
            </h2>
            <p className="text-xs text-[#86af99] mt-0.5">
              Pemantauan mutaba'ah ibadah yaumiyah/usbu'iyah &amp; diagnostik tajwid karyawan
            </p>
          </div>

          {/* Metric Trio Grid */}
          <div className="grid grid-cols-3 gap-2 pt-1">
            <div className="flex flex-col p-3 rounded-xl bg-white/10 backdrop-blur-sm">
              <span className="text-[11px] text-[#86af99] font-medium">Karyawan Aktif</span>
              <div className="flex items-baseline gap-1 mt-0.5">
                <span className="text-lg font-bold text-white">38</span>
                <span className="text-xs text-[#92f7c3] font-semibold">Aktif</span>
              </div>
            </div>

            <div className="flex flex-col p-3 rounded-xl bg-white/10 backdrop-blur-sm">
              <span className="text-[11px] text-[#86af99] font-medium">Binaan Resmi</span>
              <div className="flex items-baseline gap-1 mt-0.5">
                <span className="text-lg font-bold text-white">18</span>
                <span className="text-xs text-[#92f7c3] font-semibold">Grup</span>
              </div>
            </div>

            <div className="flex flex-col p-3 rounded-xl bg-white/10 backdrop-blur-sm">
              <span className="text-[11px] text-[#86af99] font-medium">Mutaba'ah Ibadah</span>
              <div className="flex items-baseline gap-1 mt-0.5">
                <span className="text-lg font-bold text-white">88%</span>
                <span className="text-xs text-[#92f7c3] font-semibold">Tuntas</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tab Switcher Konsol Ustadz */}
      <div className="flex items-center gap-1.5 p-1 bg-white rounded-2xl shadow-sm border border-[#1b4332]/10 flex-wrap">
        <button
          onClick={() => setDashboardTab('halaqah')}
          className={`flex-1 min-w-[120px] py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            dashboardTab === 'halaqah'
              ? 'bg-[#012d1d] text-white shadow-sm'
              : 'text-[#414844] hover:bg-[#f1f3ff]'
          }`}
        >
          <span className="material-symbols-outlined text-[16px]">checklist_rtl</span>
          <span>Tugas &amp; Mutaba'ah</span>
        </button>

        <button
          onClick={() => setDashboardTab('presensi')}
          className={`flex-1 min-w-[140px] py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            dashboardTab === 'presensi'
              ? 'bg-[#012d1d] text-white shadow-sm'
              : 'text-[#414844] hover:bg-[#f1f3ff]'
          }`}
        >
          <span className="material-symbols-outlined text-[16px] text-[#92f7c3]">how_to_reg</span>
          <span>Presensi Halaqah</span>
          <span className={`px-1.5 py-0.2 rounded-full text-[9px] font-bold ${
            dashboardTab === 'presensi' ? 'bg-[#92f7c3] text-[#002114]' : 'bg-[#c1ecd4] text-[#002114]'
          }`}>
            Sinkron HX
          </span>
        </button>

        <button
          onClick={() => setDashboardTab('students')}
          className={`flex-1 min-w-[120px] py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            dashboardTab === 'students'
              ? 'bg-[#012d1d] text-white shadow-sm'
              : 'text-[#414844] hover:bg-[#f1f3ff]'
          }`}
        >
          <span className="material-symbols-outlined text-[16px]">groups</span>
          <span>Data Binaan ({allStudentsList.filter(s => s.role === 'member' && (!activeUser.halaqah || s.halaqah === activeUser.halaqah)).length})</span>
        </button>
      </div>

      {/* TAB 1: PRESENSI HALAQAH & USTADZ */}
      {dashboardTab === 'presensi' && (
        <HalaqahAttendanceManager
          activeUser={activeUser}
          registeredUsers={registeredUsers}
          attendanceSessions={attendanceSessions || []}
          onSaveSession={(session) => {
            if (onSaveAttendanceSession) {
              onSaveAttendanceSession(session);
            }
          }}
          onDeleteSession={onDeleteAttendanceSession}
          onShowToast={onShowToast}
        />
      )}

      {/* TAB 2: DATA BINAAN */}
      {dashboardTab === 'students' && (
        <div className="space-y-3.5">
          <div className="p-4 rounded-2xl bg-white shadow-sm border border-[#1b4332]/10 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-[#f1f3ff]">
              <div>
                <h3 className="text-sm font-bold text-[#141b2b]">
                  Daftar Karyawan Binaan {activeUser.halaqah || 'Halaqah Al-Fajr'}
                </h3>
                <p className="text-xs text-[#414844]">
                  Total {allStudentsList.filter(s => !activeUser.halaqah || s.halaqah === activeUser.halaqah).length} karyawan resmi di bawah bimbingan Anda
                </p>
              </div>
              <div className="relative w-full sm:w-60">
                <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-[16px] text-[#717973]">
                  search
                </span>
                <input
                  type="text"
                  value={studentSearchQuery}
                  onChange={(e) => setStudentSearchQuery(e.target.value)}
                  placeholder="Cari nama karyawan..."
                  className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-[#f1f3ff] text-xs font-medium text-[#141b2b] placeholder-[#717973] border border-transparent focus:border-[#012d1d] focus:bg-white focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {allStudentsList
                .filter(s => (!activeUser.halaqah || s.halaqah === activeUser.halaqah) && (!studentSearchQuery.trim() || s.name.toLowerCase().includes(studentSearchQuery.toLowerCase())))
                .map((member) => (
                  <div
                    key={member.id}
                    onClick={() => setSelectedStudentDetail(member)}
                    className="p-3.5 rounded-2xl bg-[#f9f9ff] hover:bg-emerald-50/40 border border-[#1b4332]/10 transition-all cursor-pointer flex items-center justify-between gap-3 group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <img
                        src={member.avatar}
                        alt={member.name}
                        className="w-10 h-10 rounded-full object-cover ring-2 ring-white shadow-xs shrink-0"
                      />
                      <div className="min-w-0">
                        <h4 className="text-xs sm:text-sm font-bold text-[#141b2b] truncate group-hover:text-[#012d1d]">
                          {member.name}
                        </h4>
                        <p className="text-[11px] text-[#414844] mt-0.5">
                          Streak: <span className="font-semibold text-emerald-700">{member.streakDays || 5} hari</span> • XP: <span className="font-semibold text-[#012d1d]">{member.totalXp} XP</span>
                        </p>
                      </div>
                    </div>
                    <span className="text-xs font-bold text-[#012d1d] group-hover:underline flex items-center gap-0.5 shrink-0">
                      <span>Detail</span>
                      <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                    </span>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: TUGAS & MUTABA'AH (Default) */}
      {dashboardTab === 'halaqah' && (
        <>
          {/* Rapid Directives */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-[#141b2b]">Instruksi Cepat Ustadz</span>
              <button
                onClick={() => onShowToast(`${ibadahDirectives.length} tugas ibadah halaqah sedang aktif`)}
                className="text-xs text-[#012d1d] font-semibold hover:underline cursor-pointer"
              >
                Kelola Tugas
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {/* Action 1: Tugas Ibadah Usbu'iyah / Yaumiyah */}
              <button
                onClick={() => setDrawerType('ibadah_task')}
                className="group text-left flex flex-row items-center gap-3 p-3 rounded-2xl bg-white shadow-sm border border-[#1b4332]/5 hover:shadow-md transition-all active:scale-[0.98] cursor-pointer"
              >
                <div className="w-9 h-9 rounded-xl bg-[#c1ecd4] flex items-center justify-center text-[#012d1d] group-hover:bg-[#012d1d] group-hover:text-white transition-colors shrink-0">
                  <span className="material-symbols-outlined text-[18px]">checklist_rtl</span>
                </div>
                <div className="min-w-0">
                  <span className="text-xs font-bold text-[#141b2b] block leading-tight">
                    Tugas Usbu'iyah / Yaumiyah
                  </span>
                  <span className="text-[10px] text-[#414844] mt-0.5 block truncate">
                    Target harian &amp; mingguan
                  </span>
                </div>
                <span className="ml-auto w-5 h-5 rounded-full bg-[#f1f3ff] flex items-center justify-center text-[#414844]">
                  <span className="material-symbols-outlined text-[14px]">add</span>
                </span>
              </button>

              {/* Action 2: Recitation Assignment */}
              <button
                onClick={() => setDrawerType('recitation')}
                className="group text-left flex flex-row items-center gap-3 p-3 rounded-2xl bg-white shadow-sm border border-[#1b4332]/5 hover:shadow-md transition-all active:scale-[0.98] cursor-pointer"
              >
                <div className="w-9 h-9 rounded-xl bg-[#fed488]/40 flex items-center justify-center text-[#775a19] group-hover:bg-[#775a19] group-hover:text-white transition-colors shrink-0">
                  <span className="material-symbols-outlined text-[18px]">assignment_add</span>
                </div>
                <div className="min-w-0">
                  <span className="text-xs font-bold text-[#141b2b] block leading-tight">
                    Tugaskan Setoran Ayat
                  </span>
                  <span className="text-[10px] text-[#414844] mt-0.5 block truncate">
                    Surah, ayat &amp; batas nilai
                  </span>
                </div>
                <span className="ml-auto w-5 h-5 rounded-full bg-[#f1f3ff] flex items-center justify-center text-[#414844]">
                  <span className="material-symbols-outlined text-[14px]">add</span>
                </span>
              </button>

              {/* Action 3: Broadcast Announcement */}
              <button
                onClick={() => setShowBroadcastModal(true)}
                className="group text-left flex flex-row items-center gap-3 p-3 rounded-2xl bg-white shadow-sm border border-[#1b4332]/5 hover:shadow-md transition-all active:scale-[0.98] cursor-pointer"
              >
                <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center text-blue-700 group-hover:bg-blue-700 group-hover:text-white transition-colors shrink-0">
                  <span className="material-symbols-outlined text-[18px]">campaign</span>
                </div>
                <div className="min-w-0">
                  <span className="text-xs font-bold text-[#141b2b] block leading-tight">
                    Siarkan Maklumat
                  </span>
                  <span className="text-[10px] text-[#414844] mt-0.5 block truncate">
                    Kirim pesan ke {activeUser.halaqah || 'Halaqah'}
                  </span>
                </div>
                <span className="ml-auto w-5 h-5 rounded-full bg-[#f1f3ff] flex items-center justify-center text-[#414844]">
                  <span className="material-symbols-outlined text-[14px]">send</span>
                </span>
              </button>
            </div>
          </div>


      {/* Halaqah Members Modal */}
      {selectedHalaqahGroup && (() => {
        const groupObj = halaqahGroups.find(g => g.halaqahName === selectedHalaqahGroup);
        if (!groupObj) return null;
        return (
          <div className="fixed inset-0 z-50 bg-[#141b2b]/55 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
            <div className="w-full max-w-lg bg-white rounded-3xl p-5 shadow-2xl flex flex-col max-h-[85vh] overflow-hidden border border-[#1b4332]/10">
              <div className="flex items-center justify-between pb-3 border-b border-[#f1f3ff]">
                <div>
                  <span className="px-2 py-0.5 rounded-full bg-[#c1ecd4] text-[#002114] text-[10px] font-bold">
                    Anggota Halaqah
                  </span>
                  <h3 className="text-base font-bold text-[#141b2b] mt-0.5">
                    {groupObj.halaqahName}
                  </h3>
                  <p className="text-xs text-[#414844]">
                    Pembimbing: {groupObj.supervisor} • {groupObj.members.length} Karyawan
                  </p>
                </div>
                <button
                  onClick={() => setSelectedHalaqahGroup(null)}
                  className="w-8 h-8 rounded-full bg-[#f1f3ff] flex items-center justify-center text-[#414844] hover:bg-[#e4e7ff] transition-colors cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[18px]">close</span>
                </button>
              </div>

              <div className="flex-1 overflow-y-auto py-2 space-y-2 pr-1">
                {groupObj.members.map((member: any) => (
                  <div
                    key={member.id}
                    onClick={() => {
                      setSelectedHalaqahGroup(null);
                      setSelectedStudentDetail(member);
                    }}
                    className="p-3 rounded-2xl bg-[#f9f9ff] hover:bg-emerald-50/30 border border-[#1b4332]/10 transition-all cursor-pointer flex items-center justify-between gap-3 group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <img
                        src={member.avatar}
                        alt={member.name}
                        className="w-10 h-10 rounded-full object-cover ring-2 ring-white shadow-xs"
                      />
                      <div className="min-w-0">
                        <h4 className="text-xs sm:text-sm font-bold text-[#141b2b] truncate group-hover:text-[#012d1d]">
                          {member.name}
                        </h4>
                        <p className="text-[11px] text-[#414844] mt-0.5">
                          Streak: <span className="font-semibold text-emerald-700">{member.streakDays || 5} hari</span> • XP: <span className="font-semibold text-[#012d1d]">{member.totalXp} XP</span>
                        </p>
                      </div>
                    </div>
                    <span className="text-xs font-bold text-[#012d1d] group-hover:underline flex items-center gap-0.5">
                      <span>Detail</span>
                      <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                    </span>
                  </div>
                ))}
              </div>

              <div className="pt-3 border-t border-[#f1f3ff] flex justify-end">
                <button
                  onClick={() => setSelectedHalaqahGroup(null)}
                  className="px-5 py-2.5 rounded-full bg-[#012d1d] text-white text-xs font-bold shadow-xs hover:bg-[#1b4332] cursor-pointer"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Student Detail Modal */}
      {selectedStudentDetail && (
        <div className="fixed inset-0 z-50 bg-[#141b2b]/55 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-white rounded-3xl p-5 sm:p-6 shadow-2xl flex flex-col space-y-4 border border-[#1b4332]/10">
            <div className="flex items-center justify-between pb-3 border-b border-[#f1f3ff]">
              <div>
                <span className="px-2 py-0.5 rounded-full bg-[#c1ecd4] text-[#002114] text-[10px] font-bold">
                  Profil &amp; Rekam Jejak Karyawan
                </span>
                <h3 className="text-base font-bold text-[#141b2b] mt-0.5">
                  Detail Karyawan
                </h3>
              </div>
              <button
                onClick={() => setSelectedStudentDetail(null)}
                className="w-8 h-8 rounded-full bg-[#f1f3ff] flex items-center justify-center text-[#414844] hover:bg-[#e4e7ff] transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <div className="flex flex-col items-center text-center p-4 rounded-2xl bg-[#f9f9ff] border border-[#1b4332]/8 space-y-2">
              <img
                src={selectedStudentDetail.avatar}
                alt={selectedStudentDetail.name}
                className="w-20 h-20 rounded-full object-cover ring-4 ring-white shadow-md"
              />
              <div>
                <h4 className="text-base font-bold text-[#141b2b]">
                  {selectedStudentDetail.name}
                </h4>
                <p className="text-xs text-[#414844] mt-0.5">
                  {selectedStudentDetail.halaqah} • Pembimbing: <span className="font-semibold text-[#141b2b]">{selectedStudentDetail.supervisor || 'Ustadz Farhan'}</span>
                </p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-center">
                <span className="text-[10px] font-semibold text-emerald-800 uppercase block">Total XP</span>
                <span className="text-base font-extrabold text-emerald-950">{selectedStudentDetail.totalXp || 1200}</span>
              </div>
              <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200 text-center">
                <span className="text-[10px] font-semibold text-amber-800 uppercase block">Streak</span>
                <span className="text-base font-extrabold text-amber-950">{selectedStudentDetail.streakDays || 7} Hari</span>
              </div>
              <div className="p-3 rounded-2xl bg-indigo-50 border border-indigo-200 text-center">
                <span className="text-[10px] font-semibold text-indigo-800 uppercase block">Tajwid</span>
                <span className="text-base font-extrabold text-indigo-950">{selectedStudentDetail.tajweedAcc || 94}%</span>
              </div>
            </div>

            <div className="space-y-1.5 text-xs text-[#414844] bg-[#f1f3ff] p-3 rounded-xl">
              <div className="flex justify-between">
                <span>Status Keanggotaan:</span>
                <strong className="text-[#141b2b]">Resmi Binaan Halaqah</strong>
              </div>
            </div>

            <div className="pt-2 border-t border-[#f1f3ff] flex justify-end">
              <button
                onClick={() => setSelectedStudentDetail(null)}
                className="w-full py-3 rounded-full bg-[#012d1d] hover:bg-[#1b4332] text-white text-xs font-bold transition-all shadow-xs cursor-pointer text-center"
              >
                Tutup Detail
              </button>
            </div>
          </div>
        </div>
      )}







      {/* Active Ibadah Usbu'iyah & Yaumiyah Directives */}
      <div className="p-4 rounded-2xl bg-white shadow-sm border border-[#1b4332]/8 space-y-3.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-[#f1f3ff]">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#c1ecd4] flex items-center justify-center text-[#012d1d] shrink-0">
              <span className="material-symbols-outlined text-[20px]">checklist_rtl</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-[#141b2b]">
                  Tugas Ibadah Usbu'iyah &amp; Yaumiyah
                </span>
                <span className="px-2 py-0.5 rounded-full bg-[#e9edff] text-[#012d1d] text-[10px] font-bold">
                  {ibadahDirectives.length} Target
                </span>
              </div>
              <span className="text-[11px] text-[#414844]">
                Target mutaba'ah amalan harian &amp; mingguan Halaqah Al-Fajr
              </span>
            </div>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
          <button
            onClick={() => setIbadahFilter('all')}
            className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
              ibadahFilter === 'all'
                ? 'bg-[#012d1d] text-white shadow-xs'
                : 'bg-[#f1f3ff] text-[#414844] hover:bg-[#e9edff]'
            }`}
          >
            Semua ({ibadahDirectives.length})
          </button>
          <button
            onClick={() => setIbadahFilter('yaumiyah')}
            className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
              ibadahFilter === 'yaumiyah'
                ? 'bg-[#012d1d] text-white shadow-xs'
                : 'bg-[#f1f3ff] text-[#414844] hover:bg-[#e9edff]'
            }`}
          >
            ☀️ Yaumiyah (Harian)
          </button>
          <button
            onClick={() => setIbadahFilter("usbu'iyah")}
            className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
              ibadahFilter === "usbu'iyah"
                ? 'bg-[#012d1d] text-white shadow-xs'
                : 'bg-[#f1f3ff] text-[#414844] hover:bg-[#e9edff]'
            }`}
          >
            🌙 Usbu'iyah (Mingguan)
          </button>
        </div>

        {/* Directives Cards List */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
          {filteredIbadahDirectives.map((task) => {
            const isWeekly = task.type === "usbu'iyah";
            const submissions = task.submissions || [];
            const completedList = submissions.filter((s) => s.isCompleted);
            const pendingList = submissions.filter((s) => !s.isCompleted);
            const completedCount = completedList.length;
            const pendingCount = pendingList.length;
            const totalRoster = submissions.length || 6;

            return (
              <div
                key={task.id}
                className="p-3.5 rounded-2xl bg-[#f9f9ff] border border-[#1b4332]/8 flex flex-col justify-between gap-3 hover:border-[#1b4332]/25 hover:shadow-xs transition-all"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          isWeekly
                            ? 'bg-[#fed488]/50 text-[#775a19]'
                            : 'bg-[#c1ecd4] text-[#002114]'
                        }`}
                      >
                        {isWeekly ? "1 Pekan (Usbu'iyah)" : '1 Hari (Yaumiyah)'}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          task.isRecurring !== false
                            ? 'bg-[#c1ecd4]/50 text-[#012d1d]'
                            : 'bg-amber-100 text-amber-900 border border-amber-300'
                        }`}
                      >
                        {task.isRecurring !== false ? 'Berulang' : '1x Selesai'}
                      </span>
                      <span className="text-[10px] text-[#717973] font-medium">
                        • {task.category}
                      </span>
                      <span
                        className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${
                          task.status === 'Aktif'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-slate-200 text-slate-700'
                        }`}
                      >
                        {task.status}
                      </span>
                    </div>
                    <h4 className="text-xs sm:text-sm font-bold text-[#141b2b] mt-1 leading-snug">
                      {task.title}
                    </h4>
                    <p className="text-[11px] text-[#414844] mt-0.5 leading-tight">
                      {task.target}
                    </p>
                  </div>

                  <div className="flex flex-col items-end gap-1.5 shrink-0">
                    <span className="px-2 py-0.5 rounded-full bg-[#e9edff] text-[#012d1d] text-[11px] font-bold">
                      +{task.xp} XP
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleOpenEdit(task)}
                        title="Edit Tugas Ibadah"
                        className="w-7 h-7 rounded-lg bg-white hover:bg-[#e9edff] text-[#012d1d] border border-[#1b4332]/10 flex items-center justify-center transition-colors cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-[15px]">edit</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setTaskToDelete({ id: task.id, title: task.title, category: task.category, xp: task.xp })}
                        title="Hapus Tugas Ibadah"
                        className="w-7 h-7 rounded-lg bg-white hover:bg-[#ffdad6] text-[#ba1a1a] border border-[#ba1a1a]/20 flex items-center justify-center transition-colors cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-[15px]">delete</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Compliance Progress Bar */}
                <div className="pt-1 border-t border-[#f1f3ff]">
                  <div className="flex items-center justify-between text-[11px] mb-1">
                    <span className="text-[#414844] font-medium">Tingkat Kepatuhan</span>
                    <span className="font-bold text-[#012d1d]">
                      {task.compliancePercent}% ({completedCount}/{totalRoster} Karyawan Tuntas)
                    </span>
                  </div>
                  <div className="h-1.5 w-full bg-[#e9edff] rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        task.compliancePercent >= 80 ? 'bg-[#1b4332]' : 'bg-[#e59b15]'
                      }`}
                      style={{ width: `${task.compliancePercent}%` }}
                    />
                  </div>
                </div>

                {/* Information on Who Completed vs Who Has Not */}
                <div className="bg-white/85 rounded-xl p-2.5 border border-[#1b4332]/8 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <div className="flex -space-x-1.5 overflow-hidden py-0.5 shrink-0">
                      {completedList.slice(0, 4).map((st) => (
                        <img
                          key={st.studentId}
                          src={st.studentAvatar}
                          alt={st.studentName}
                          title={`${st.studentName} (Sudah: ${st.completedAt || 'Selesai'})`}
                          className="inline-block h-6 w-6 rounded-full ring-2 ring-emerald-500 object-cover"
                        />
                      ))}
                    </div>

                    {pendingCount > 0 ? (
                      <span className="text-[10px] text-rose-700 font-semibold truncate bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200/60">
                        ⚠️ {pendingList.map((s) => s.studentName.split(' ')[0]).join(', ')} belum
                      </span>
                    ) : (
                      <span className="text-[10px] text-emerald-700 font-semibold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200/60">
                        ✨ Semua Tuntas
                      </span>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setSelectedTaskForSubmissions(task);
                      setSubmissionFilter('all');
                      setSubmissionSearch('');
                    }}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#012d1d] hover:bg-[#1b4332] text-white text-[11px] font-bold transition-all shadow-xs shrink-0 cursor-pointer active:scale-95"
                  >
                    <span className="material-symbols-outlined text-[14px]">group</span>
                    <span>Rincian Karyawan</span>
                    <span className="material-symbols-outlined text-[13px]">arrow_forward</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
        </>
      )}

      {/* Directives Modal / Slide Tray */}
      {drawerType && (
        <div className="fixed inset-0 z-50 bg-[#141b2b]/40 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="w-full max-w-lg bg-white rounded-t-3xl sm:rounded-2xl p-5 shadow-2xl flex flex-col max-h-[85vh] overflow-y-auto animate-in slide-in-from-bottom duration-200">
            <div className="w-10 h-1 bg-[#dce2f7] rounded-full mx-auto mb-3 sm:hidden" />
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-[#f1f3ff]">
              <div>
                <h3 className="text-base font-bold text-[#141b2b]">
                  {drawerType === 'recitation'
                    ? 'Tugaskan Setoran Tilawah Baru'
                    : 'Tugaskan Ibadah Usbu\'iyah / Yaumiyah'}
                </h3>
                <p className="text-xs text-[#414844]">
                  {drawerType === 'recitation'
                    ? 'Pilih surat, rentang ayat, dan batas minimal kelulusan tajwid'
                    : 'Tetapkan target amalan harian (yaumiyah) atau mingguan (usbu\'iyah) karyawan'}
                </p>
              </div>
              <button
                onClick={() => setDrawerType(null)}
                className="w-8 h-8 rounded-full bg-[#f1f3ff] flex items-center justify-center text-[#414844] cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            {drawerType === 'recitation' ? (
              <div className="flex flex-col gap-3.5">
                {/* Tipe Target (Harian / Mingguan) & Masa Berlaku */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold text-[#141b2b]">
                      Tipe Jadwal &amp; Masa Berlaku
                    </label>
                    <span className="text-[10px] font-bold text-[#012d1d] bg-[#c1ecd4]/60 px-2 py-0.5 rounded-full">
                      Masa Berlaku: {recitationType === 'yaumiyah' ? '1 Hari (24 Jam)' : '1 Pekan (7 Hari)'}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setRecitationType('yaumiyah')}
                      className={`p-2.5 rounded-xl text-left border transition-all cursor-pointer ${
                        recitationType === 'yaumiyah'
                          ? 'bg-[#c1ecd4]/50 border-[#012d1d] text-[#012d1d]'
                          : 'bg-[#f1f3ff] border-transparent text-[#414844] hover:bg-[#e9edff]'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 font-bold text-xs">
                        <span className="material-symbols-outlined text-[16px]">wb_sunny</span>
                        <span>Yaumiyah (1 Hari)</span>
                      </div>
                      <span className="text-[10px] text-[#414844] block mt-0.5">
                        Masa berlaku 24 jam sehari
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setRecitationType("usbu'iyah")}
                      className={`p-2.5 rounded-xl text-left border transition-all cursor-pointer ${
                        recitationType === "usbu'iyah"
                          ? 'bg-[#fed488]/50 border-[#775a19] text-[#775a19]'
                          : 'bg-[#f1f3ff] border-transparent text-[#414844] hover:bg-[#e9edff]'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 font-bold text-xs">
                        <span className="material-symbols-outlined text-[16px]">bedtime</span>
                        <span>Usbu'iyah (1 Pekan)</span>
                      </div>
                      <span className="text-[10px] text-[#414844] block mt-0.5">
                        Masa berlaku 7 hari (1 pekan)
                      </span>
                    </button>
                  </div>
                </div>

                {/* Pilihan Pengulangan Tugas */}
                <div>
                  <label className="text-xs font-bold text-[#141b2b] mb-1.5 block">
                    Pengulangan Tugas
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setRecitationIsRecurring(true)}
                      className={`p-2.5 rounded-xl text-left border transition-all cursor-pointer ${
                        recitationIsRecurring
                          ? 'bg-[#c1ecd4]/50 border-[#012d1d] text-[#012d1d] shadow-2xs'
                          : 'bg-[#f1f3ff] border-transparent text-[#414844] hover:bg-[#e9edff]'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 font-bold text-xs">
                        <span className="material-symbols-outlined text-[16px]">sync</span>
                        <span>Berulang Otomatis</span>
                      </div>
                      <span className="text-[10px] text-[#414844] block mt-0.5">
                        Tugas terus aktif diulang tiap {recitationType === 'yaumiyah' ? 'hari' : 'pekan'}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setRecitationIsRecurring(false)}
                      className={`p-2.5 rounded-xl text-left border transition-all cursor-pointer ${
                        !recitationIsRecurring
                          ? 'bg-[#fed488]/50 border-[#775a19] text-[#775a19] shadow-2xs'
                          : 'bg-[#f1f3ff] border-transparent text-[#414844] hover:bg-[#e9edff]'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 font-bold text-xs">
                        <span className="material-symbols-outlined text-[16px]">event_busy</span>
                        <span>Tidak Berulang (1x)</span>
                      </div>
                      <span className="text-[10px] text-[#414844] block mt-0.5">
                        Hanya 1x selesai selama {recitationType === 'yaumiyah' ? '1 hari' : '1 pekan'}
                      </span>
                    </button>
                  </div>
                </div>

                {/* Dropdown Surah */}
                <div>
                  <label className="text-xs font-bold text-[#141b2b] mb-1 block">
                    Pilihan Surah Setoran
                  </label>
                  <select
                    value={recitationSurah}
                    onChange={(e) => setRecitationSurah(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-[#f1f3ff] text-xs font-semibold text-[#141b2b] border border-transparent focus:border-[#012d1d] focus:outline-none"
                  >
                    <option value="Surah Al-Mulk (Tabarak)">Surah Al-Mulk (Tabarak) - Juz 29</option>
                    <option value="Surah Al-Kahfi">Surah Al-Kahfi - Juz 15</option>
                    <option value="Surah Ya-Sin">Surah Ya-Sin - Juz 22-23</option>
                    <option value="Surah Ar-Rahman">Surah Ar-Rahman - Juz 27</option>
                    <option value="Surah Al-Waqi’ah">Surah Al-Waqi’ah - Juz 27</option>
                    <option value="Surah An-Naba’">Surah An-Naba’ - Juz 30</option>
                    <option value="Surah Al-Fatihah">Surah Al-Fatihah - Juz 1</option>
                    <option value="Surah Al-Baqarah">Surah Al-Baqarah - Juz 1-3</option>
                    <option value="Surah Al-Imran">Surah Al-Imran - Juz 3-4</option>
                    <option value="Surah An-Nisa’">Surah An-Nisa’ - Juz 4-6</option>
                    <option value="Surah Al-Sajdah">Surah Al-Sajdah - Juz 21</option>
                    <option value="Surah Al-Insan">Surah Al-Insan - Juz 29</option>
                    <option value="Surah Al-A’la">Surah Al-A’la - Juz 30</option>
                    <option value="Surah Al-Fajr">Surah Al-Fajr - Juz 30</option>
                    <option value="custom">✍️ Ketik Surah / Juz Lainnya...</option>
                  </select>
                </div>

                {recitationSurah === 'custom' && (
                  <div>
                    <label className="text-xs font-bold text-[#141b2b] mb-1 block">
                      Nama Surah / Juz Kustom
                    </label>
                    <input
                      type="text"
                      value={recitationCustomSurah}
                      onChange={(e) => setRecitationCustomSurah(e.target.value)}
                      placeholder="Contoh: Surah Ad-Dhuha atau Juz 30"
                      className="w-full px-3 py-2 rounded-xl bg-[#f1f3ff] text-xs font-semibold text-[#141b2b] border border-transparent focus:border-[#012d1d] focus:bg-white focus:outline-none"
                    />
                  </div>
                )}

                {/* Range Ayat & XP */}
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="text-xs font-bold text-[#141b2b] mb-1 block">
                      Mulai Ayat
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={286}
                      value={recitationStartVerse}
                      onChange={(e) => setRecitationStartVerse(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-xl bg-[#f1f3ff] text-xs font-semibold text-[#141b2b]"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-[#141b2b] mb-1 block">
                      Sampai Ayat
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={286}
                      value={recitationEndVerse}
                      onChange={(e) => setRecitationEndVerse(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-xl bg-[#f1f3ff] text-xs font-semibold text-[#141b2b]"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-[#141b2b] mb-1 block">
                      Poin XP
                    </label>
                    <select
                      value={recitationXp}
                      onChange={(e) => setRecitationXp(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-xl bg-[#f1f3ff] text-xs font-semibold text-[#141b2b]"
                    >
                      <option value={5}>5 XP</option>
                      <option value={10}>10 XP</option>
                      <option value={15}>15 XP (Standar)</option>
                      <option value={20}>20 XP</option>
                      <option value={25}>25 XP</option>
                      <option value={30}>30 XP (Tinggi)</option>
                      <option value={50}>50 XP (Istimewa)</option>
                    </select>
                  </div>
                </div>

                {/* Target Halaqah Otomatis */}
                <div className="p-3 rounded-xl bg-[#c1ecd4]/20 border border-[#c1ecd4] flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 text-[#012d1d]">
                    <span className="material-symbols-outlined text-[18px]">group</span>
                    <span className="font-semibold">Target Penerima:</span>
                  </div>
                  <span className="font-bold text-[#012d1d]">
                    Seluruh Karyawan {activeUser?.halaqah || 'Halaqah Al-Fajr'}
                  </span>
                </div>

                {/* Batas Nilai Kelulusan Tajwid */}
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-xs font-bold text-[#141b2b]">
                      Batas Minimal Kelulusan Tajwid AI
                    </label>
                    <span className="text-xs font-bold text-[#012d1d]">{recitationPassingScore}%</span>
                  </div>
                  <input
                    type="range"
                    min="80"
                    max="98"
                    value={recitationPassingScore}
                    onChange={(e) => setRecitationPassingScore(Number(e.target.value))}
                    className="w-full accent-[#012d1d]"
                  />
                </div>

                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    onClick={() => setDrawerType(null)}
                    className="flex-1 py-3 rounded-full bg-[#f1f3ff] text-[#414844] text-xs font-bold cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="button"
                    onClick={handlePublishRecitationTask}
                    className="flex-1 py-3 rounded-full bg-[#012d1d] text-white text-xs font-bold shadow-md hover:bg-[#1b4332] cursor-pointer"
                  >
                    Siarkan Tugas Setoran
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-3.5">
                {/* Mode Selector: Yaumiyah vs Usbu'iyah & Masa Berlaku */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold text-[#141b2b]">
                      Tipe Target Ibadah &amp; Masa Berlaku
                    </label>
                    <span className="text-[10px] font-bold text-[#012d1d] bg-[#c1ecd4]/60 px-2 py-0.5 rounded-full">
                      Masa Berlaku: {newIbadahType === 'yaumiyah' ? '1 Hari (24 Jam)' : '1 Pekan (7 Hari)'}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setNewIbadahType('yaumiyah');
                        setNewIbadahTitle('Shalat Fardhu 5 Waktu Berjamaah');
                        setNewIbadahCategory('Shalat Wajib');
                        setNewIbadahTarget('Wajib berjamaah di masjid utama tepat waktu');
                        setNewIbadahXp(100);
                      }}
                      className={`p-2.5 rounded-xl text-left border transition-all cursor-pointer ${
                        newIbadahType === 'yaumiyah'
                          ? 'bg-[#c1ecd4]/50 border-[#012d1d] text-[#012d1d]'
                          : 'bg-[#f1f3ff] border-transparent text-[#414844] hover:bg-[#e9edff]'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 font-bold text-xs">
                        <span className="material-symbols-outlined text-[16px]">wb_sunny</span>
                        <span>Yaumiyah (1 Hari)</span>
                      </div>
                      <span className="text-[10px] text-[#414844] block mt-0.5">
                        Masa berlaku 24 jam sehari
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setNewIbadahType("usbu'iyah");
                        setNewIbadahTitle('Qiyamul Lail / Shalat Tahajjud');
                        setNewIbadahCategory('Shalat Sunnah');
                        setNewIbadahTarget('Minimal 3 malam per pekan (min 8 rakaat + witir)');
                        setNewIbadahXp(150);
                      }}
                      className={`p-2.5 rounded-xl text-left border transition-all cursor-pointer ${
                        newIbadahType === "usbu'iyah"
                          ? 'bg-[#fed488]/50 border-[#775a19] text-[#775a19]'
                          : 'bg-[#f1f3ff] border-transparent text-[#414844] hover:bg-[#e9edff]'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 font-bold text-xs">
                        <span className="material-symbols-outlined text-[16px]">bedtime</span>
                        <span>Usbu'iyah (1 Pekan)</span>
                      </div>
                      <span className="text-[10px] text-[#414844] block mt-0.5">
                        Masa berlaku 7 hari (1 pekan)
                      </span>
                    </button>
                  </div>
                </div>

                {/* Pilihan Pengulangan Tugas */}
                <div>
                  <label className="text-xs font-bold text-[#141b2b] mb-1.5 block">
                    Pengulangan Tugas
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setNewIbadahIsRecurring(true)}
                      className={`p-2.5 rounded-xl text-left border transition-all cursor-pointer ${
                        newIbadahIsRecurring
                          ? 'bg-[#c1ecd4]/50 border-[#012d1d] text-[#012d1d] shadow-2xs'
                          : 'bg-[#f1f3ff] border-transparent text-[#414844] hover:bg-[#e9edff]'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 font-bold text-xs">
                        <span className="material-symbols-outlined text-[16px]">sync</span>
                        <span>Berulang Otomatis</span>
                      </div>
                      <span className="text-[10px] text-[#414844] block mt-0.5">
                        Tugas terus aktif berulang tiap {newIbadahType === 'yaumiyah' ? 'hari' : 'pekan'}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewIbadahIsRecurring(false)}
                      className={`p-2.5 rounded-xl text-left border transition-all cursor-pointer ${
                        !newIbadahIsRecurring
                          ? 'bg-[#fed488]/50 border-[#775a19] text-[#775a19] shadow-2xs'
                          : 'bg-[#f1f3ff] border-transparent text-[#414844] hover:bg-[#e9edff]'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 font-bold text-xs">
                        <span className="material-symbols-outlined text-[16px]">event_busy</span>
                        <span>Tidak Berulang (1x)</span>
                      </div>
                      <span className="text-[10px] text-[#414844] block mt-0.5">
                        Hanya 1x selesai selama {newIbadahType === 'yaumiyah' ? '1 hari' : '1 pekan'}
                      </span>
                    </button>
                  </div>
                </div>

                {/* Preset Amalan Cepat */}
                <div>
                  <label className="text-xs font-bold text-[#141b2b] mb-1.5 block">
                    Pilihan Preset Amalan Cepat
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {newIbadahType === 'yaumiyah' ? (
                      <>
                        <button
                          type="button"
                          onClick={() => {
                            setNewIbadahTitle('Shalat Fardhu 5 Waktu Berjamaah');
                            setNewIbadahCategory('Shalat Wajib');
                            setNewIbadahTarget('Wajib berjamaah di masjid utama tepat waktu');
                            setNewIbadahXp(100);
                          }}
                          className="px-2.5 py-1 rounded-full text-[11px] font-medium bg-[#f1f3ff] hover:bg-[#c1ecd4] text-[#141b2b] transition-colors cursor-pointer"
                        >
                          🕌 Shalat 5 Waktu di Masjid
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setNewIbadahTitle("Dzikir Pagi & Petang Al-Ma'tsurat");
                            setNewIbadahCategory('Dzikir & Doa');
                            setNewIbadahTarget('Ba’da Subuh & Ba’da Ashar secara tartil');
                            setNewIbadahXp(50);
                          }}
                          className="px-2.5 py-1 rounded-full text-[11px] font-medium bg-[#f1f3ff] hover:bg-[#c1ecd4] text-[#141b2b] transition-colors cursor-pointer"
                        >
                          📿 Dzikir Al-Ma'tsurat
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setNewIbadahTitle('Tilawah Al-Qur’an (One Day One Juz)');
                            setNewIbadahCategory('Al-Qur’an');
                            setNewIbadahTarget('Target tuntas 1 Juz per hari');
                            setNewIbadahXp(120);
                          }}
                          className="px-2.5 py-1 rounded-full text-[11px] font-medium bg-[#f1f3ff] hover:bg-[#c1ecd4] text-[#141b2b] transition-colors cursor-pointer"
                        >
                          📖 Tilawah 1 Juz
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setNewIbadahTitle('Shalat Sunnah Rawatib 12 Rakaat');
                            setNewIbadahCategory('Shalat Sunnah');
                            setNewIbadahTarget('Qabliyah & Ba’diyah shalat fardhu');
                            setNewIbadahXp(80);
                          }}
                          className="px-2.5 py-1 rounded-full text-[11px] font-medium bg-[#f1f3ff] hover:bg-[#c1ecd4] text-[#141b2b] transition-colors cursor-pointer"
                        >
                          ✨ Rawatib 12 Rakaat
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setNewIbadahTitle('Shalat Dhuha Minimal 4 Rakaat');
                            setNewIbadahCategory('Shalat Sunnah');
                            setNewIbadahTarget('Pukul 08:00 - 10:30 WIB');
                            setNewIbadahXp(60);
                          }}
                          className="px-2.5 py-1 rounded-full text-[11px] font-medium bg-[#f1f3ff] hover:bg-[#c1ecd4] text-[#141b2b] transition-colors cursor-pointer"
                        >
                          ☀️ Shalat Dhuha
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => {
                            setNewIbadahTitle('Qiyamul Lail / Shalat Tahajjud');
                            setNewIbadahCategory('Shalat Sunnah');
                            setNewIbadahTarget('Minimal 3 malam per pekan (8 rakaat + witir)');
                            setNewIbadahXp(150);
                          }}
                          className="px-2.5 py-1 rounded-full text-[11px] font-medium bg-[#f1f3ff] hover:bg-[#fed488]/40 text-[#141b2b] transition-colors cursor-pointer"
                        >
                          🌌 Qiyamul Lail 3x/pekan
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setNewIbadahTitle('Puasa Sunnah Senin & Kamis');
                            setNewIbadahCategory('Shaum Sunnah');
                            setNewIbadahTarget('Puasa sunnah Senin atau Kamis sepekan');
                            setNewIbadahXp(150);
                          }}
                          className="px-2.5 py-1 rounded-full text-[11px] font-medium bg-[#f1f3ff] hover:bg-[#fed488]/40 text-[#141b2b] transition-colors cursor-pointer"
                        >
                          🌿 Puasa Senin & Kamis
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setNewIbadahTitle('Membaca Surah Al-Kahfi');
                            setNewIbadahCategory('Al-Qur’an');
                            setNewIbadahTarget('Malam Jumat atau hari Jumat sebelum Maghrib');
                            setNewIbadahXp(100);
                          }}
                          className="px-2.5 py-1 rounded-full text-[11px] font-medium bg-[#f1f3ff] hover:bg-[#fed488]/40 text-[#141b2b] transition-colors cursor-pointer"
                        >
                          📖 Surah Al-Kahfi (Jumat)
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setNewIbadahTitle('Infaq & Sedekah Subuh Pekanan');
                            setNewIbadahCategory('Infaq & Sedekah');
                            setNewIbadahTarget('Kotak infaq masjid / karyawan dhuafa');
                            setNewIbadahXp(80);
                          }}
                          className="px-2.5 py-1 rounded-full text-[11px] font-medium bg-[#f1f3ff] hover:bg-[#fed488]/40 text-[#141b2b] transition-colors cursor-pointer"
                        >
                          🪙 Sedekah Subuh
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Form Fields */}
                <div>
                  <label className="text-xs font-bold text-[#141b2b] mb-1 block">
                    Nama Amalan / Tugas Ibadah
                  </label>
                  <input
                    type="text"
                    value={newIbadahTitle}
                    onChange={(e) => setNewIbadahTitle(e.target.value)}
                    placeholder="Contoh: Shalat Berjamaah di Masjid"
                    className="w-full px-3 py-2.5 rounded-xl bg-[#f1f3ff] text-xs font-semibold text-[#141b2b] border border-transparent focus:border-[#012d1d] focus:bg-white focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs font-bold text-[#141b2b] mb-1 block">
                      Kategori
                    </label>
                    <select
                      value={newIbadahCategory}
                      onChange={(e) => setNewIbadahCategory(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl bg-[#f1f3ff] text-xs font-semibold text-[#141b2b] border border-transparent focus:border-[#012d1d] focus:outline-none"
                    >
                      <option value="Shalat Wajib">Shalat Wajib</option>
                      <option value="Shalat Sunnah">Shalat Sunnah</option>
                      <option value="Al-Qur’an">Al-Qur’an &amp; Tilawah</option>
                      <option value="Dzikir &amp; Doa">Dzikir &amp; Doa</option>
                      <option value="Shaum Sunnah">Shaum Sunnah</option>
                      <option value="Infaq &amp; Sedekah">Infaq &amp; Sedekah</option>
                      <option value="Lain-lain">Lain-lain</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-[#141b2b] mb-1 block">
                      Poin Reward XP
                    </label>
                    <select
                      value={newIbadahXp}
                      onChange={(e) => setNewIbadahXp(Number(e.target.value))}
                      className="w-full px-3 py-2.5 rounded-xl bg-[#f1f3ff] text-xs font-semibold text-[#141b2b] border border-transparent focus:border-[#012d1d] focus:outline-none"
                    >
                      <option value={5}>5 XP</option>
                      <option value={10}>10 XP</option>
                      <option value={15}>15 XP (Standar)</option>
                      <option value={20}>20 XP</option>
                      <option value={25}>25 XP</option>
                      <option value={30}>30 XP (Tinggi)</option>
                      <option value={50}>50 XP (Istimewa)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-[#141b2b] mb-1 block">
                    Target &amp; Petunjuk Teknis Ustadz
                  </label>
                  <input
                    type="text"
                    value={newIbadahTarget}
                    onChange={(e) => setNewIbadahTarget(e.target.value)}
                    placeholder="Contoh: Wajib berjamaah di masjid utama tepat waktu"
                    className="w-full px-3 py-2.5 rounded-xl bg-[#f1f3ff] text-xs font-semibold text-[#141b2b] border border-transparent focus:border-[#012d1d] focus:bg-white focus:outline-none"
                  />
                </div>

                {/* Target Halaqah Otomatis */}
                <div className="p-3 rounded-xl bg-[#c1ecd4]/20 border border-[#c1ecd4] flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 text-[#012d1d]">
                    <span className="material-symbols-outlined text-[18px]">group</span>
                    <span className="font-semibold">Target Penerima:</span>
                  </div>
                  <span className="font-bold text-[#012d1d]">
                    Seluruh Karyawan {activeUser?.halaqah || 'Halaqah Al-Fajr'}
                  </span>
                </div>

                <div className="mt-2 flex gap-2">
                  <button
                    type="button"
                    onClick={() => setDrawerType(null)}
                    className="flex-1 py-3 rounded-full bg-[#f1f3ff] text-[#414844] text-xs font-bold cursor-pointer hover:bg-[#e9edff]"
                  >
                    Batal
                  </button>
                  <button
                    type="button"
                    onClick={handlePublishIbadahTask}
                    className="flex-1 py-3 rounded-full bg-[#012d1d] text-white text-xs font-bold shadow-md hover:bg-[#1b4332] cursor-pointer"
                  >
                    Siarkan Tugas Ibadah
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Edit Directive Modal */}
      {editingDirective && (
        <div className="fixed inset-0 z-50 bg-[#141b2b]/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-2xl space-y-3.5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-2 border-b border-[#f1f3ff]">
              <div>
                <h3 className="font-bold text-sm text-[#141b2b]">
                  Edit Tugas Ibadah
                </h3>
                <p className="text-xs text-[#414844]">
                  Perbarui rincian amalan yaumiyah atau usbu'iyah karyawan
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingDirective(null)}
                className="w-8 h-8 rounded-full bg-[#f1f3ff] flex items-center justify-center text-[#414844] cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-[#141b2b]">
                    Tipe Target &amp; Masa Berlaku
                  </label>
                  <span className="text-[10px] font-bold text-[#012d1d] bg-[#c1ecd4]/60 px-2 py-0.5 rounded-full">
                    Masa Berlaku: {editType === 'yaumiyah' ? '1 Hari (24 Jam)' : '1 Pekan (7 Hari)'}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setEditType('yaumiyah')}
                    className={`py-2 px-3 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${
                      editType === 'yaumiyah'
                        ? 'bg-[#c1ecd4]/50 border-[#012d1d] text-[#012d1d]'
                        : 'bg-[#f1f3ff] border-transparent text-[#414844]'
                    }`}
                  >
                    ☀️ Yaumiyah (1 Hari)
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditType("usbu'iyah")}
                    className={`py-2 px-3 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${
                      editType === "usbu'iyah"
                        ? 'bg-[#fed488]/50 border-[#775a19] text-[#775a19]'
                        : 'bg-[#f1f3ff] border-transparent text-[#414844]'
                    }`}
                  >
                    🌙 Usbu'iyah (1 Pekan)
                  </button>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-[#141b2b] mb-1 block">
                  Pengulangan Tugas
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setEditIsRecurring(true)}
                    className={`py-2 px-2.5 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${
                      editIsRecurring
                        ? 'bg-[#c1ecd4]/50 border-[#012d1d] text-[#012d1d]'
                        : 'bg-[#f1f3ff] border-transparent text-[#414844]'
                    }`}
                  >
                    <div className="flex items-center gap-1 justify-center">
                      <span className="material-symbols-outlined text-[15px]">sync</span>
                      <span>Berulang</span>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditIsRecurring(false)}
                    className={`py-2 px-2.5 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${
                      !editIsRecurring
                        ? 'bg-[#fed488]/50 border-[#775a19] text-[#775a19]'
                        : 'bg-[#f1f3ff] border-transparent text-[#414844]'
                    }`}
                  >
                    <div className="flex items-center gap-1 justify-center">
                      <span className="material-symbols-outlined text-[15px]">event_busy</span>
                      <span>1x Selesai</span>
                    </div>
                  </button>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-[#141b2b] mb-1 block">
                  Nama Amalan / Tugas Ibadah
                </label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#f1f3ff] text-xs font-semibold text-[#141b2b] border border-transparent focus:border-[#012d1d] focus:bg-white focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-bold text-[#141b2b] mb-1 block">
                    Kategori
                  </label>
                  <select
                    value={editCategory}
                    onChange={(e) => setEditCategory(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#f1f3ff] text-xs font-semibold text-[#141b2b] border border-transparent focus:border-[#012d1d] focus:outline-none"
                  >
                    <option value="Shalat Wajib">Shalat Wajib</option>
                    <option value="Shalat Sunnah">Shalat Sunnah</option>
                    <option value="Al-Qur’an">Al-Qur’an &amp; Tilawah</option>
                    <option value="Dzikir &amp; Doa">Dzikir &amp; Doa</option>
                    <option value="Shaum Sunnah">Shaum Sunnah</option>
                    <option value="Infaq &amp; Sedekah">Infaq &amp; Sedekah</option>
                    <option value="Lain-lain">Lain-lain</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-[#141b2b] mb-1 block">
                    Poin XP
                  </label>
                  <select
                    value={editXp}
                    onChange={(e) => setEditXp(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-[#f1f3ff] text-xs font-semibold text-[#141b2b] border border-transparent focus:border-[#012d1d] focus:outline-none"
                  >
                    <option value={5}>5 XP</option>
                    <option value={10}>10 XP</option>
                    <option value={15}>15 XP (Standar)</option>
                    <option value={20}>20 XP</option>
                    <option value={25}>25 XP</option>
                    <option value={30}>30 XP (Tinggi)</option>
                    <option value={50}>50 XP (Istimewa)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-[#141b2b] mb-1 block">
                  Target &amp; Petunjuk Ustadz
                </label>
                <input
                  type="text"
                  value={editTarget}
                  onChange={(e) => setEditTarget(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#f1f3ff] text-xs font-semibold text-[#141b2b] border border-transparent focus:border-[#012d1d] focus:bg-white focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-[#141b2b] mb-1 block">
                  Status
                </label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value as 'Aktif' | 'Selesai')}
                  className="w-full px-3 py-2 rounded-xl bg-[#f1f3ff] text-xs font-semibold text-[#141b2b] border border-transparent focus:border-[#012d1d] focus:outline-none"
                >
                  <option value="Aktif">Aktif</option>
                  <option value="Selesai">Selesai</option>
                </select>
              </div>
            </div>

            <div className="flex gap-2 pt-2 border-t border-[#f1f3ff]">
              <button
                type="button"
                onClick={() => setEditingDirective(null)}
                className="flex-1 py-2.5 rounded-full bg-[#f1f3ff] text-xs font-bold text-[#414844] hover:bg-[#e9edff] cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleSaveEdit}
                className="flex-1 py-2.5 rounded-full bg-[#012d1d] hover:bg-[#1b4332] text-white text-xs font-bold cursor-pointer shadow-sm"
              >
                Simpan Perubahan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Comprehensive Student Submissions Modal (Siapa Saja yang Sudah & Belum Mengerjakan) */}
      {selectedTaskForSubmissions && (() => {
        const currentTask = selectedTaskForSubmissions;
        const submissions = currentTask.submissions || [];
        const completedList = submissions.filter((s) => s.isCompleted);
        const pendingList = submissions.filter((s) => !s.isCompleted);
        const isWeekly = currentTask.type === "usbu'iyah";

        // Filter by tab & search query
        const visibleSubmissions = submissions.filter((sub) => {
          if (submissionFilter === 'completed' && !sub.isCompleted) return false;
          if (submissionFilter === 'pending' && sub.isCompleted) return false;
          if (submissionSearch.trim()) {
            return sub.studentName.toLowerCase().includes(submissionSearch.toLowerCase().trim());
          }
          return true;
        });

        return (
          <div className="fixed inset-0 z-50 bg-[#141b2b]/50 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-150">
            <div className="w-full max-w-xl bg-white rounded-3xl p-5 sm:p-6 shadow-2xl flex flex-col max-h-[90vh] overflow-hidden border border-[#1b4332]/10">
              {/* Header */}
              <div className="flex items-start justify-between gap-3 pb-3 border-b border-[#f1f3ff]">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 flex-wrap mb-1">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        isWeekly
                          ? 'bg-[#fed488]/50 text-[#775a19]'
                          : 'bg-[#c1ecd4] text-[#002114]'
                      }`}
                    >
                      {isWeekly ? "Tugas Usbu'iyah (Mingguan)" : 'Tugas Yaumiyah (Harian)'}
                    </span>
                    <span className="text-[10px] text-[#717973] font-medium">
                      • {currentTask.category}
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-[#e9edff] text-[#012d1d] text-[10px] font-bold">
                      +{currentTask.xp} XP
                    </span>
                  </div>
                  <h3 className="text-base sm:text-lg font-bold text-[#141b2b] leading-tight">
                    {currentTask.title}
                  </h3>
                  <p className="text-xs text-[#414844] mt-0.5 leading-snug">
                    🎯 Target: {currentTask.target}
                  </p>
                </div>

                <button
                  onClick={() => setSelectedTaskForSubmissions(null)}
                  className="w-8 h-8 rounded-full bg-[#f1f3ff] hover:bg-[#e4e7ff] flex items-center justify-center text-[#414844] transition-colors cursor-pointer shrink-0"
                >
                  <span className="material-symbols-outlined text-[18px]">close</span>
                </button>
              </div>


              {/* Search & Filter Tabs */}
              <div className="space-y-2 pb-2">
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3 top-2.5 text-[18px] text-[#717973]">
                    search
                  </span>
                  <input
                    type="text"
                    value={submissionSearch}
                    onChange={(e) => setSubmissionSearch(e.target.value)}
                    placeholder="Cari nama karyawan di tugas ini..."
                    className="w-full pl-9 pr-3 py-2 rounded-xl bg-[#f1f3ff] text-xs font-medium text-[#141b2b] placeholder-[#717973] border border-transparent focus:border-[#012d1d] focus:bg-white focus:outline-none transition-all"
                  />
                  {submissionSearch && (
                    <button
                      onClick={() => setSubmissionSearch('')}
                      className="absolute right-2.5 top-2.5 text-[#717973] hover:text-[#141b2b]"
                    >
                      <span className="material-symbols-outlined text-[16px]">cancel</span>
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                  <button
                    onClick={() => setSubmissionFilter('all')}
                    className={`px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap transition-colors cursor-pointer ${
                      submissionFilter === 'all'
                        ? 'bg-[#012d1d] text-white shadow-xs'
                        : 'bg-[#f1f3ff] text-[#414844] hover:bg-[#e9edff]'
                    }`}
                  >
                    Semua Karyawan ({submissions.length})
                  </button>
                  <button
                    onClick={() => setSubmissionFilter('completed')}
                    className={`px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap transition-colors cursor-pointer ${
                      submissionFilter === 'completed'
                        ? 'bg-emerald-700 text-white shadow-xs'
                        : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200'
                    }`}
                  >
                    ✓ Sudah Mengerjakan ({completedList.length})
                  </button>
                  <button
                    onClick={() => setSubmissionFilter('pending')}
                    className={`px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap transition-colors cursor-pointer ${
                      submissionFilter === 'pending'
                        ? 'bg-rose-700 text-white shadow-xs'
                        : 'bg-rose-50 text-rose-800 hover:bg-rose-100 border border-rose-200'
                    }`}
                  >
                    ✗ Belum Mengerjakan ({pendingList.length})
                  </button>
                </div>
              </div>

              {/* Submissions List */}
              <div className="flex-1 overflow-y-auto pr-1 space-y-2 py-1 max-h-[46vh]">
                {visibleSubmissions.length === 0 ? (
                  <div className="p-8 text-center bg-[#f9f9ff] rounded-2xl border border-dashed border-[#1b4332]/10 space-y-2">
                    <span className="material-symbols-outlined text-[36px] text-[#717973]">
                      person_search
                    </span>
                    <p className="text-xs font-bold text-[#141b2b]">
                      Tidak ada karyawan yang sesuai kriteria filter
                    </p>
                    <p className="text-[11px] text-[#717973]">
                      Coba ganti filter tab atau kata kunci pencarian nama karyawan.
                    </p>
                  </div>
                ) : (
                  visibleSubmissions.map((sub) => {
                    const isDone = sub.isCompleted;
                    return (
                      <div
                        key={sub.studentId}
                        className={`p-3 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 ${
                          isDone
                            ? 'bg-white hover:bg-emerald-50/20 border-emerald-200/80 shadow-xs'
                            : 'bg-rose-50/25 hover:bg-rose-50/50 border-rose-200/70'
                        }`}
                      >
                        {/* Student Info */}
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="relative shrink-0">
                            <img
                              src={sub.studentAvatar}
                              alt={sub.studentName}
                              className="w-10 h-10 rounded-full object-cover ring-2 ring-white shadow-xs"
                            />
                            <span
                              className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-white flex items-center justify-center text-[8px] text-white ${
                                isDone ? 'bg-emerald-600' : 'bg-rose-500'
                              }`}
                            >
                              <span className="material-symbols-outlined text-[9px]">
                                {isDone ? 'check' : 'close'}
                              </span>
                            </span>
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <h4 className="text-xs sm:text-sm font-bold text-[#141b2b] truncate">
                                {sub.studentName}
                              </h4>
                              <span
                                className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wider ${
                                  isDone
                                    ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                                    : 'bg-rose-100 text-rose-900 border border-rose-300'
                                }`}
                              >
                                {isDone ? 'Sudah Mengerjakan' : 'Belum Mengerjakan'}
                              </span>
                            </div>

                            <p className="text-[11px] text-[#414844] mt-0.5 flex items-center gap-1 flex-wrap">
                              {isDone ? (
                                <>
                                  <span className="font-semibold text-emerald-800">
                                    ⏰ {sub.completedAt || 'Tuntas'}
                                  </span>
                                  {sub.notes && (
                                    <span className="text-[#717973] truncate">
                                      • {sub.notes}
                                    </span>
                                  )}
                                </>
                              ) : (
                                <span className="font-medium text-rose-700">
                                  ⚠️ {sub.notes || 'Belum ada laporan mutaba\'ah hari ini'}
                                </span>
                              )}
                            </p>
                          </div>
                        </div>

                        {/* Interactive Actions for Ustadz */}
                        <div className="flex items-center gap-1.5 self-end sm:self-center shrink-0">
                          {isDone ? (
                            <button
                              type="button"
                              onClick={() => handleApplaudStudent(sub.studentName)}
                              title="Beri Apresiasi Bintang"
                              className="px-2.5 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 text-[11px] font-bold border border-amber-200 flex items-center gap-1 transition-all cursor-pointer active:scale-95"
                            >
                              <span className="material-symbols-outlined text-[14px] text-amber-600">
                                star
                              </span>
                              <span>Apresiasi</span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleRemindStudent(sub.studentName, currentTask.title, sub.studentId)}
                              title="Kirim notifikasi peringatan mutaba'ah"
                              className="px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-800 text-[11px] font-bold border border-rose-200 flex items-center gap-1.5 transition-all cursor-pointer active:scale-95"
                            >
                              <span className="material-symbols-outlined text-[14px] text-rose-600">
                                notifications_active
                              </span>
                              <span>Ingatkan</span>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Modal Footer Controls */}
              <div className="pt-3 border-t border-[#f1f3ff] flex items-center justify-end gap-2">
                {pendingList.length > 0 && (
                  <button
                    type="button"
                    onClick={() => handleRemindAllPending(currentTask)}
                    className="px-4 py-2.5 rounded-full bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center justify-center gap-1.5 active:scale-95"
                  >
                    <span className="material-symbols-outlined text-[16px]">notification_important</span>
                    <span>Ingatkan Semua yang Belum ({pendingList.length})</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setSelectedTaskForSubmissions(null)}
                  className="px-5 py-2.5 rounded-full bg-[#012d1d] hover:bg-[#1b4332] text-white text-xs font-bold transition-all shadow-xs cursor-pointer text-center"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Modal Konfirmasi Hapus Tugas Ibadah Ustadz */}
      {taskToDelete && (
        <div className="fixed inset-0 z-50 bg-[#141b2b]/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in zoom-in-95 duration-150">
          <div className="bg-white rounded-3xl max-w-md w-full p-5 sm:p-6 shadow-2xl space-y-4 border border-[#1b4332]/10">
            <div className="flex items-center gap-3 pb-3 border-b border-[#f1f3ff]">
              <div className="w-10 h-10 rounded-2xl bg-rose-100 text-rose-800 flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-[22px]">warning</span>
              </div>
              <div>
                <h3 className="font-bold text-base text-[#141b2b]">
                  Konfirmasi Hapus Tugas Ibadah
                </h3>
                <p className="text-xs text-[#414844]">
                  Tindakan ini memerlukan kepastian ustadz pembimbing
                </p>
              </div>
            </div>

            <p className="text-xs text-[#141b2b] leading-relaxed">
              Apakah Anda yakin ingin menghapus amalan/tugas berikut dari daftar mutaba&apos;ah karyawan halaqah?
            </p>

            <div className="p-3.5 rounded-2xl bg-[#f9f9ff] border border-[#1b4332]/10 space-y-1">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-900 text-[10px] font-bold">
                  Akan Dihapus
                </span>
                {taskToDelete.category && (
                  <span className="text-[10px] text-[#717973] font-medium">
                    • {taskToDelete.category}
                  </span>
                )}
                {taskToDelete.xp !== undefined && (
                  <span className="px-2 py-0.5 rounded-full bg-[#e9edff] text-[#012d1d] text-[10px] font-bold">
                    +{taskToDelete.xp} XP
                  </span>
                )}
              </div>
              <h4 className="text-sm font-bold text-[#141b2b] mt-1">
                {taskToDelete.title}
              </h4>
            </div>

            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-[11px] text-amber-900 flex items-start gap-2">
              <span className="material-symbols-outlined text-[16px] text-amber-700 shrink-0 mt-0.5">
                info
              </span>
              <span>
                Tugas yang dihapus tidak dapat dikembalikan dan akan otomatis terhapus dari lembar mutaba&apos;ah karyawan.
              </span>
            </div>

            <div className="flex gap-2 pt-2 border-t border-[#f1f3ff]">
              <button
                type="button"
                onClick={() => setTaskToDelete(null)}
                className="flex-1 py-2.5 rounded-xl bg-[#f1f3ff] hover:bg-[#e4e7ff] text-[#414844] font-bold text-xs cursor-pointer transition-colors"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => {
                  handleDeleteDirective(taskToDelete.id, taskToDelete.title);
                  setTaskToDelete(null);
                }}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs shadow-md cursor-pointer transition-all active:scale-95 flex items-center justify-center gap-1.5"
              >
                <span className="material-symbols-outlined text-[16px]">delete</span>
                <span>Ya, Hapus Tugas</span>
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Broadcast Announcement Modal */}
      {showBroadcastModal && (
        <div className="fixed inset-0 z-50 bg-[#141b2b]/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl space-y-3 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-2 border-b border-[#f1f3ff]">
              <div>
                <h3 className="font-bold text-base text-[#141b2b]">Maklumat Halaqah</h3>
                <p className="text-xs text-[#414844]">Siarkan informasi khusus ke anggota bimbingan Anda</p>
              </div>
              <button
                onClick={() => setShowBroadcastModal(false)}
                className="w-8 h-8 rounded-full bg-[#f1f3ff] flex items-center justify-center text-[#414844] cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <div className="p-3 rounded-xl bg-blue-50 border border-blue-100 text-[11px] text-blue-800 leading-relaxed">
              <span className="font-bold block mb-0.5">Info:</span>
              Pesan ini akan terkirim sebagai notifikasi real-time di layar seluruh anggota <strong>{activeUser.halaqah || 'Halaqah Al-Fajr'}</strong>.
            </div>

            <div>
              <label className="text-xs font-bold text-[#141b2b] mb-1 block">Isi Pesan Maklumat</label>
              <textarea
                rows={3}
                value={broadcastText}
                onChange={(e) => setBroadcastText(e.target.value)}
                placeholder="Contoh: Assalamu'alaikum. Diingatkan besok pagi ada agenda evaluasi Tajwid Surah Al-Mulk. Mohon bersiap."
                className="w-full p-3 rounded-xl bg-[#f1f3ff] text-xs text-[#141b2b] border border-transparent focus:bg-white focus:border-[#012d1d] focus:outline-none transition-all"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setShowBroadcastModal(false)}
                className="flex-1 py-2.5 rounded-xl bg-[#f1f3ff] text-xs font-bold text-[#414844] cursor-pointer"
              >
                Batal
              </button>
              <button
                onClick={handleSendBroadcast}
                className="flex-1 py-2.5 rounded-xl bg-[#012d1d] hover:bg-[#1b4332] text-white text-xs font-bold shadow-md cursor-pointer transition-all flex items-center justify-center gap-1.5"
              >
                <span className="material-symbols-outlined text-[16px]">campaign</span>
                <span>Siarkan</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
