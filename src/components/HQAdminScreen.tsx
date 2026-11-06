import React, { useState, useMemo, useEffect } from 'react';
import { ALL_RECITERS_DIRECTORY, DEFAULT_HALAQAH_ROSTER, DEFAULT_ATTENDANCE_SESSIONS } from '../data/mockData';
import {
  ReciterProfile,
  ActiveUser,
  IbadahDirective,
  HalaqahAttendanceSession,
  MemberAttendance,
  AttendanceStatus,
  UstadzAttendanceStatus
} from '../types';

import { downloadPerColumnCSV } from '../services/csvExport';
import {
  StandardAmalanHX,
  DEFAULT_STANDARD_AMALAN_HX,
  getStoredStandardAmalan,
  saveStoredStandardAmalan
} from '../services/amalanPaten';
import {
  setDoc,
  doc
} from 'firebase/firestore';
import { db } from '../services/firebase';

export interface HalaqahDetail {
  id: string;
  name: string;
  code: string;
  supervisor: string;
  schedule: string;
  location: string;
  dept?: string;
}

export const DEFAULT_BASE_HALAQAHS: HalaqahDetail[] = [
  { id: 'h-fajr', name: 'Halaqah Al-Fajr', code: 'HF-4092', supervisor: 'Ustadz Farhan', schedule: 'Senin - Jumat 05:30 WIB', location: 'Masjid Al-Ikhlas', dept: 'Dept HX' },
  { id: 'h-hafiz', name: 'Hafiz Circle', code: 'HC-1108', supervisor: 'Ustadz Tariq Mansoor', schedule: 'Selasa & Kamis 16:30 WIB', location: 'Mushola PT HEW', dept: 'Dept Produksi' },
  { id: 'h-youth', name: 'Youth Tajweed', code: 'YT-7721', supervisor: 'Ustadzah Sarah', schedule: 'Rabu & Sabtu 19:30 WIB', location: 'Masjid Jami', dept: 'Dept Logistik' },
  { id: 'h-madinah', name: 'Madinah Memorization Circle', code: 'MC-9901', supervisor: 'Ustadz Mansoor', schedule: 'Ahad 08:00 WIB', location: 'Masjid Al-Ikhlas', dept: 'Dept HRD' },
  { id: 'h-noor', name: 'Noor Al-Huda Tajweed Circle', code: 'NH-3382', supervisor: 'Ustadz Zulkifli', schedule: 'Jumat 12:45 WIB', location: 'Mushola Karyawan', dept: 'Dept Finance' }
];

interface HQAdminScreenProps {
  onShowToast: (msg: string) => void;
  onOpenSheets?: () => void;
  isSheetsConnected?: boolean;
  registeredUsers?: ActiveUser[];
  onOpenRegister?: () => void;
  onLockDeptHX?: () => void;
  onRegisterSantri?: (newUser: {
    name: string;
    halaqah: string;
    halaqahCode: string;
    passcode: string;
    phone?: string;
    role: 'member' | 'admin';
  }) => void;
  onDeleteSantri?: (studentId: string) => void;
  onUpdateUserHalaqah?: (studentId: string, newHalaqah: string, newHalaqahCode?: string) => void;
  onRenameHalaqahForAll?: (oldName: string, newName: string, newCode?: string) => void;
  ibadahDirectives?: IbadahDirective[];
  attendanceSessions?: HalaqahAttendanceSession[];
  onSaveAttendanceSession?: (session: HalaqahAttendanceSession) => void;
  onDeleteAttendanceSession?: (sessionId: string) => void;
}

export const HQAdminScreen: React.FC<HQAdminScreenProps> = ({
  onShowToast,
  onOpenSheets,
  isSheetsConnected,
  registeredUsers,
  onOpenRegister,
  onLockDeptHX,
  onRegisterSantri,
  onDeleteSantri,
  onUpdateUserHalaqah,
  onRenameHalaqahForAll,
  ibadahDirectives,
  attendanceSessions,
  onSaveAttendanceSession,
  onDeleteAttendanceSession
}) => {
  const [reciters, setReciters] = useState<ReciterProfile[]>(ALL_RECITERS_DIRECTORY);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGroup, setSelectedGroup] = useState<string>('Semua Kelompok');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [isMultiSelect, setIsMultiSelect] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showBroadcastModal, setShowBroadcastModal] = useState(false);
  const [newReciterName, setNewReciterName] = useState('');
  const [newReciterGroup, setNewReciterGroup] = useState('Halaqah Al-Fajr');
  const [newReciterPasscode, setNewReciterPasscode] = useState('1234');
  const [newReciterPhone, setNewReciterPhone] = useState('');
  const [newReciterTarget, setNewReciterTarget] = useState('Surah Al-Mulk (Ayat 1-10)');

  // Daftar Halaqah Baru Modal States
  const [showAddHalaqahModal, setShowAddHalaqahModal] = useState<boolean>(false);
  const [newHalaqahName, setNewHalaqahName] = useState<string>('');
  const [newHalaqahCode, setNewHalaqahCode] = useState<string>('');
  const [newHalaqahSupervisor, setNewHalaqahSupervisor] = useState<string>('');
  const [newHalaqahSchedule, setNewHalaqahSchedule] = useState<string>('');
  const [newHalaqahLocation, setNewHalaqahLocation] = useState<string>('Masjid Al-Ikhlas');
  const [newHalaqahDept, setNewHalaqahDept] = useState<string>('Dept HX');

  // Unified Halaqah List (Includes Base + Custom + Edits)
  const [halaqahList, setHalaqahList] = useState<HalaqahDetail[]>(() => {
    try {
      const saved = localStorage.getItem('noorworship_unified_halaqahs_v2');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
      const savedOld = localStorage.getItem('noorworship_saved_halaqahs_v1');
      if (savedOld) {
        const parsedOld = JSON.parse(savedOld);
        if (Array.isArray(parsedOld) && parsedOld.length > 0) {
          return [...DEFAULT_BASE_HALAQAHS, ...parsedOld];
        }
      }
    } catch (e) {
      console.warn(e);
    }
    return DEFAULT_BASE_HALAQAHS;
  });

  useEffect(() => {
    try {
      localStorage.setItem('noorworship_unified_halaqahs_v2', JSON.stringify(halaqahList));
    } catch (e) {
      console.warn(e);
    }
  }, [halaqahList]);

  useEffect(() => {
    const handleUpdate = () => {
      try {
        const saved = localStorage.getItem('noorworship_unified_halaqahs_v2');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setHalaqahList(parsed);
          }
        }
      } catch (e) {
        console.warn(e);
      }
    };
    window.addEventListener('noorworship_halaqah_updated', handleUpdate);
    return () => window.removeEventListener('noorworship_halaqah_updated', handleUpdate);
  }, []);

  // Persistent deleted tracking so items stay deleted even on reload
  const [deletedHalaqahNames, setDeletedHalaqahNames] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('noorworship_deleted_halaqah_names_v1');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn(e);
    }
    return [];
  });

  useEffect(() => {
    try {
      localStorage.setItem('noorworship_deleted_halaqah_names_v1', JSON.stringify(deletedHalaqahNames));
    } catch (e) {
      console.warn(e);
    }
  }, [deletedHalaqahNames]);

  const [deletedStudentIds, setDeletedStudentIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('noorworship_deleted_student_ids_v1');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn(e);
    }
    return [];
  });

  useEffect(() => {
    try {
      localStorage.setItem('noorworship_deleted_student_ids_v1', JSON.stringify(deletedStudentIds));
    } catch (e) {
      console.warn(e);
    }
  }, [deletedStudentIds]);

  // Persistent User Halaqah Overrides (for moving or unassigning members)
  const [userHalaqahOverrides, setUserHalaqahOverrides] = useState<Record<string, string>>(() => {
    try {
      const saved = localStorage.getItem('noorworship_user_halaqah_overrides_v1');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn(e);
    }
    return {};
  });

  useEffect(() => {
    try {
      localStorage.setItem('noorworship_user_halaqah_overrides_v1', JSON.stringify(userHalaqahOverrides));
    } catch (e) {
      console.warn(e);
    }
  }, [userHalaqahOverrides]);

  // Active presets filtered by deleted list
  const allHalaqahPresets = useMemo(() => {
    return halaqahList.filter(h => !deletedHalaqahNames.includes(h.name));
  }, [halaqahList, deletedHalaqahNames]);

  // Modal target state for deletion confirmation dialogs
  const [deletingHalaqahTarget, setDeletingHalaqahTarget] = useState<string | null>(null);
  const [deletingStudentTarget, setDeletingStudentTarget] = useState<{ id: string; name: string } | null>(null);

  // State for Halaqah Management Modal
  const [selectedHalaqahGroup, setSelectedHalaqahGroup] = useState<string | null>(null);
  const [halaqahActiveTab, setHalaqahActiveTab] = useState<'members' | 'add' | 'edit' | 'broadcast'>('members');
  const [memberSearchInsideHalaqah, setMemberSearchInsideHalaqah] = useState('');
  const [addExistingSearchQuery, setAddExistingSearchQuery] = useState('');

  // Quick Register inside Halaqah Management Modal
  const [quickAddName, setQuickAddName] = useState('');
  const [quickAddPhone, setQuickAddPhone] = useState('');
  const [quickAddPasscode, setQuickAddPasscode] = useState('1234');
  const [quickAddTarget, setQuickAddTarget] = useState('Surah Al-Mulk (Ayat 1-10)');

  // Edit Halaqah Form State
  const [editHalaqahName, setEditHalaqahName] = useState('');
  const [editHalaqahCode, setEditHalaqahCode] = useState('');
  const [editHalaqahSupervisor, setEditHalaqahSupervisor] = useState('');
  const [editHalaqahSchedule, setEditHalaqahSchedule] = useState('');
  const [editHalaqahLocation, setEditHalaqahLocation] = useState('');
  const [editHalaqahDept, setEditHalaqahDept] = useState('');

  // Remove Member & Transfer Member states
  const [removingMemberTarget, setRemovingMemberTarget] = useState<{ id: string; name: string; halaqahName: string } | null>(null);
  const [transferringMemberTarget, setTransferringMemberTarget] = useState<{ student: any; targetHalaqah: string } | null>(null);
  const [broadcastHalaqahText, setBroadcastHalaqahText] = useState('');

  const handleOpenHalaqahModal = (groupName: string) => {
    const preset = allHalaqahPresets.find(p => p.name === groupName);
    setSelectedHalaqahGroup(groupName);
    setHalaqahActiveTab('members');
    setEditHalaqahName(preset?.name || groupName);
    setEditHalaqahCode(preset?.code || 'HX-001');
    setEditHalaqahSupervisor(preset?.supervisor || 'Ustadz Pembimbing');
    setEditHalaqahSchedule(preset?.schedule || 'Jadwal Reguler Dept HX');
    setEditHalaqahLocation(preset?.location || 'Masjid Al-Ikhlas');
    setEditHalaqahDept(preset?.dept || 'Dept HX');
    setMemberSearchInsideHalaqah('');
    setAddExistingSearchQuery('');
    setBroadcastHalaqahText('');
  };

  // Global Broadcast State (HQ)
  const [globalBroadcastText, setGlobalBroadcastText] = useState('');

  const handleGlobalBroadcast = async () => {
    const text = globalBroadcastText.trim();
    if (!text) {
      onShowToast('Mohon isi maklumat pengumuman');
      return;
    }

    const now = new Date();
    const timestamp = now.toISOString();

    // Send to ALL users
    for (const user of (registeredUsers || [])) {
      const notifId = `notif-global-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      const notificationItem = {
        id: notifId,
        targetUserId: user.id,
        recipientName: user.name,
        senderName: 'Dept HX Pusat',
        title: 'Maklumat Pusat Dept HX',
        message: text,
        time: 'Baru saja',
        read: false,
        type: 'broadcast',
        createdAt: timestamp
      };

      try {
        await setDoc(doc(db, 'notifications', notifId), notificationItem);
      } catch (e) {
        console.error('Error sending global broadcast:', e);
      }
    }

    onShowToast(`📢 Maklumat berhasil disiarkan ke seluruh ustadz & karyawan (${registeredUsers?.length || 0} pengguna)!`);
    setGlobalBroadcastText('');
    setShowBroadcastModal(false);
  };

  const handleBroadcastToHalaqah = async (groupName: string) => {
    const text = broadcastHalaqahText.trim();
    if (!text) {
      onShowToast('Mohon tuliskan pesan maklumat');
      return;
    }

    const now = new Date();
    const timestamp = now.toISOString();
    
    // Find members of this halaqah
    const targetUsers = (registeredUsers || []).filter(u => u.halaqah === groupName);

    for (const user of targetUsers) {
      const notifId = `notif-targeted-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      const notificationItem = {
        id: notifId,
        targetUserId: user.id,
        recipientName: user.name,
        senderName: 'Direktorat Dept HX',
        title: `Maklumat Khusus: ${groupName}`,
        message: text,
        time: 'Baru saja',
        read: false,
        type: 'broadcast',
        createdAt: timestamp
      };

      try {
        await setDoc(doc(db, 'notifications', notifId), notificationItem);
      } catch (e) {
        console.error('Error sending targeted broadcast:', e);
      }
    }

    setBroadcastHalaqahText('');
    onShowToast(`📢 Maklumat berhasil disiarkan khusus kepada seluruh anggota ${groupName}!`);
  };

  const handleSaveNewHalaqah = () => {
    const nameTrimmed = newHalaqahName.trim();
    if (!nameTrimmed) {
      onShowToast('Mohon masukkan nama halaqah baru');
      return;
    }

    const codeFinal = newHalaqahCode.trim() || `HX-${Math.floor(1000 + Math.random() * 9000)}`;
    const supervisorFinal = newHalaqahSupervisor.trim() || 'Ustadz Pembimbing (Dept HX)';

    const newHalaqahItem: HalaqahDetail = {
      id: `halaqah-${Date.now()}`,
      name: nameTrimmed,
      code: codeFinal,
      supervisor: supervisorFinal,
      schedule: newHalaqahSchedule.trim() || 'Ba’da Subuh (05:30 WIB)',
      location: newHalaqahLocation.trim() || 'Masjid Al-Ikhlas',
      dept: newHalaqahDept.trim() || 'Dept HX'
    };

    setHalaqahList((prev) => [newHalaqahItem, ...prev]);
    setShowAddHalaqahModal(false);
    setNewHalaqahName('');
    setNewHalaqahCode('');
    setNewHalaqahSupervisor('');
    setNewHalaqahSchedule('');
    setNewHalaqahLocation('Masjid Al-Ikhlas');
    setNewHalaqahDept('Dept HX');

    onShowToast(`🎉 Halaqah Baru "${nameTrimmed}" (Kode: ${codeFinal}) resmi didaftarkan oleh Dept HX!`);
  };

  const handleDeleteHalaqah = (halaqahName: string) => {
    setDeletingHalaqahTarget(halaqahName);
  };

  const confirmDeleteHalaqah = () => {
    if (!deletingHalaqahTarget) return;
    const name = deletingHalaqahTarget;
    setHalaqahList((prev) => prev.filter((h) => h.name !== name));
    setDeletedHalaqahNames((prev) => [...prev, name]);
    if (selectedHalaqahGroup === name) {
      setSelectedHalaqahGroup(null);
    }
    setDeletingHalaqahTarget(null);
    onShowToast(`Halaqah "${name}" berhasil dihapus oleh Dept HX.`);
  };

  const handleDeleteStudent = (student: { id: string; name: string }) => {
    setDeletingStudentTarget(student);
  };

  const confirmDeleteStudent = () => {
    if (!deletingStudentTarget) return;
    const student = deletingStudentTarget;
    setReciters((prev) => prev.filter((r) => r.id !== student.id && r.name !== student.name));
    setDeletedStudentIds((prev) => [...prev, student.id, student.name]);
    if (onDeleteSantri) {
      onDeleteSantri(student.id);
    }
    setSelectedStudentDetail(null);
    setDeletingStudentTarget(null);
    onShowToast(`Data Karyawan "${student.name}" berhasil dihapus dari sistem.`);
  };

  const handleAddExistingStudentToHalaqah = (student: any, halaqahName: string, halaqahCode?: string) => {
    const currentHalaqah = userHalaqahOverrides[student.id] !== undefined ? userHalaqahOverrides[student.id] : student.halaqah;
    if (currentHalaqah && currentHalaqah !== 'Tanpa Halaqah' && currentHalaqah !== 'Belum Ada Halaqah' && currentHalaqah !== halaqahName) {
      onShowToast(`❌ Aturan: Karyawan "${student.name}" sudah terdaftar di "${currentHalaqah}". Satu karyawan tidak bisa masuk ke 2 halaqah sekaligus! Silakan gunakan tombol Pindah untuk memindahkan halaqah.`);
      return;
    }

    setUserHalaqahOverrides((prev) => ({
      ...prev,
      [student.id]: halaqahName
    }));
    setReciters((prev) =>
      prev.map((r) => (r.id === student.id || r.name === student.name ? { ...r, group: halaqahName } : r))
    );
    if (onUpdateUserHalaqah) {
      onUpdateUserHalaqah(student.id, halaqahName, halaqahCode);
    }
    onShowToast(`🎉 ${student.name} berhasil dimasukkan ke "${halaqahName}"!`);
  };

  const handleQuickRegisterToHalaqah = (targetHalaqah: string, targetCode: string, supervisorName: string) => {
    const trimmed = quickAddName.trim();
    if (!trimmed) {
      onShowToast('Mohon masukkan nama karyawan');
      return;
    }

    const existingMember = allRecitersList.find(
      (r: any) => r.name.toLowerCase() === trimmed.toLowerCase() && r.group && r.group !== 'Tanpa Halaqah' && r.group !== 'Belum Ada Halaqah'
    );
    if (existingMember) {
      onShowToast(`❌ Aturan: Karyawan "${trimmed}" sudah terdaftar di halaqah "${existingMember.group}". Satu karyawan tidak bisa masuk ke 2 halaqah sekaligus!`);
      return;
    }

    const passcode = quickAddPasscode.trim() || '1234';

    if (onRegisterSantri) {
      onRegisterSantri({
        name: trimmed,
        halaqah: targetHalaqah,
        halaqahCode: targetCode,
        passcode,
        role: 'member'
      });
    }

    const newEntry: ReciterProfile = {
      id: `reciter-${Date.now()}`,
      name: trimmed,
      group: targetHalaqah,
      supervisor: supervisorName,
      avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCPpztXYvKG0hnmCFJGCCU0xwy2MPvneIXXKJ1BW4Rtejtyzgr02Vo9Su5UxcVuZz3-GF8hPwRY0_1vZl5PVdpW10j8rqRMIipsU_h8mEvEcJShkcDH86v76LYWTlWzju8eCZDjvFPYoqOVoLWKjpOXfZWK3-4DbGikcXmtwS-5rGtyiOB3ejK_8RqWALFKRcTWhwJTWUpwoH36hhTTWYZyTPHbKBimBp0b-0er8SFXjKlDEMOCN2_0Qg',
      status: 'Mumtaz',
      tajweedAcc: 95.0,
      streakDays: 1,
      totalXp: '150',
      currentActivity: `Anggota ${targetHalaqah}`,
      lastActive: 'Baru didaftarkan'
    };

    setReciters((prev) => [newEntry, ...prev]);
    setQuickAddName('');
    setHalaqahActiveTab('members');
    onShowToast(`🎉 Karyawan ${trimmed} berhasil didaftarkan langsung ke "${targetHalaqah}"!`);
  };

  const confirmRemoveMember = () => {
    if (!removingMemberTarget) return;
    const { id, name, halaqahName } = removingMemberTarget;
    setUserHalaqahOverrides((prev) => ({
      ...prev,
      [id]: 'Tanpa Halaqah'
    }));
    setReciters((prev) =>
      prev.map((r) => (r.id === id || r.name === name ? { ...r, group: 'Tanpa Halaqah' } : r))
    );
    if (onUpdateUserHalaqah) {
      onUpdateUserHalaqah(id, 'Tanpa Halaqah');
    }
    setRemovingMemberTarget(null);
    onShowToast(`Karyawan "${name}" telah dikeluarkan dari "${halaqahName}".`);
  };

  const confirmTransferMember = () => {
    if (!transferringMemberTarget || !transferringMemberTarget.targetHalaqah) return;
    const { student, targetHalaqah } = transferringMemberTarget;
    const targetPreset = allHalaqahPresets.find(p => p.name === targetHalaqah);
    setUserHalaqahOverrides((prev) => ({
      ...prev,
      [student.id]: targetHalaqah
    }));
    setReciters((prev) =>
      prev.map((r) => (r.id === student.id || r.name === student.name ? { ...r, group: targetHalaqah } : r))
    );
    if (onUpdateUserHalaqah) {
      onUpdateUserHalaqah(student.id, targetHalaqah, targetPreset?.code);
    }
    setTransferringMemberTarget(null);
    onShowToast(`Karyawan "${student.name}" berhasil dipindahkan ke "${targetHalaqah}"!`);
  };

  const handleSaveEditHalaqah = (originalName: string) => {
    const nameTrimmed = editHalaqahName.trim();
    if (!nameTrimmed) {
      onShowToast('Nama halaqah tidak boleh kosong');
      return;
    }
    const codeTrimmed = editHalaqahCode.trim() || `HX-${Math.floor(1000 + Math.random() * 9000)}`;
    const supervisorTrimmed = editHalaqahSupervisor.trim() || 'Ustadz Pembimbing';
    const scheduleTrimmed = editHalaqahSchedule.trim() || 'Jadwal Reguler Dept HX';
    const locationTrimmed = editHalaqahLocation.trim() || 'Masjid Al-Ikhlas';
    const deptTrimmed = editHalaqahDept.trim() || 'Dept HX';

    setHalaqahList((prev) =>
      prev.map((h) => {
        if (h.name === originalName) {
          return {
            ...h,
            name: nameTrimmed,
            code: codeTrimmed,
            supervisor: supervisorTrimmed,
            schedule: scheduleTrimmed,
            location: locationTrimmed,
            dept: deptTrimmed
          };
        }
        return h;
      })
    );

    // If the halaqah name changed, update all members and references
    if (nameTrimmed !== originalName) {
      setUserHalaqahOverrides((prev) => {
        const next = { ...prev };
        Object.keys(next).forEach((k) => {
          if (next[k] === originalName) {
            next[k] = nameTrimmed;
          }
        });
        return next;
      });

      setReciters((prev) =>
        prev.map((r) => (r.group === originalName ? { ...r, group: nameTrimmed } : r))
      );

      if (onRenameHalaqahForAll) {
        onRenameHalaqahForAll(originalName, nameTrimmed, codeTrimmed);
      }

      setSelectedHalaqahGroup(nameTrimmed);
    }

    setHalaqahActiveTab('members');
    onShowToast(`✅ Informasi Halaqah "${nameTrimmed}" berhasil diperbarui!`);
  };

  const handleExportHalaqahCSV = (group: any) => {
    const headers = ['No', 'ID Karyawan', 'Nama Karyawan', 'Halaqah', 'Ustadz Pembimbing', 'Streak Hari', 'Total XP', 'Akurasi Tajwid'];
    const rows = group.members.map((m: any, idx: number) => [
      idx + 1,
      m.id,
      m.name,
      group.halaqahName,
      group.supervisor,
      `${m.streakDays || 5} hari`,
      m.totalXp || 1200,
      `${m.tajweedAcc || 94}%`
    ]);
    const filename = `Daftar_Anggota_${group.halaqahName.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}`;
    downloadPerColumnCSV(filename, headers, rows);
    onShowToast(`File CSV anggota ${group.halaqahName} berhasil diunduh (terformat rapi per kolom)`);
  };

  // Dashboard browsing states (Lihat Halaqah, List Karyawan, Rekap Presensi, Kelola Amalan Paten, Pantau Tugas Ustadz)
  const [deptHxTab, setDeptHxTab] = useState<'halaqah' | 'students' | 'presensi' | 'amalan-paten' | 'tugas-ustadz'>('halaqah');
  const [selectedStudentDetail, setSelectedStudentDetail] = useState<any | null>(null);

  // Rekap Presensi Dept HX states
  const activeAttendanceSessions = useMemo(() => {
    return attendanceSessions && attendanceSessions.length > 0 ? attendanceSessions : DEFAULT_ATTENDANCE_SESSIONS;
  }, [attendanceSessions]);

  const [attendanceHalaqahFilter, setAttendanceHalaqahFilter] = useState<string>('all');
  const [attendanceStatusFilter, setAttendanceStatusFilter] = useState<string>('all');
  const [attendanceMonthFilter, setAttendanceMonthFilter] = useState<string>('all');
  const [attendanceSearchQuery, setAttendanceSearchQuery] = useState<string>('');
  const [selectedAttendanceSessionDetail, setSelectedAttendanceSessionDetail] = useState<HalaqahAttendanceSession | null>(null);

  // Delete Session State
  const [sessionToDelete, setSessionToDelete] = useState<HalaqahAttendanceSession | null>(null);

  const filteredAttendanceSessions = useMemo(() => {
    return activeAttendanceSessions.filter((s) => {
      const matchHalaqah =
        attendanceHalaqahFilter === 'all' || s.halaqahName === attendanceHalaqahFilter;
      const matchStatus =
        attendanceStatusFilter === 'all' || s.ustadzStatus === attendanceStatusFilter;
      const matchMonth =
        attendanceMonthFilter === 'all' || (s.date && s.date.split('-')[1] === attendanceMonthFilter);

      const q = attendanceSearchQuery.toLowerCase().trim();
      const matchSearch =
        !q ||
        s.sessionTitle.toLowerCase().includes(q) ||
        s.halaqahName.toLowerCase().includes(q) ||
        s.ustadzName.toLowerCase().includes(q) ||
        (s.ustadzNotes && s.ustadzNotes.toLowerCase().includes(q)) ||
        (s.location && s.location.toLowerCase().includes(q));
      return matchHalaqah && matchStatus && matchMonth && matchSearch;
    });
  }, [activeAttendanceSessions, attendanceHalaqahFilter, attendanceStatusFilter, attendanceSearchQuery]);

  const halaqahsWithNoSessions = useMemo(() => {
    const last7Days = new Date();
    last7Days.setDate(last7Days.getDate() - 7);
    
    return allHalaqahPresets.filter(h => {
      const hasRecentSession = activeAttendanceSessions.some(s => 
        s.halaqahName === h.name && new Date(s.date).getTime() >= last7Days.getTime()
      );
      return !hasRecentSession;
    });
  }, [allHalaqahPresets, activeAttendanceSessions]);

  const handleExportAllAttendanceCSV = () => {
    const headers = [
      'No',
      'Tanggal Sesi',
      'Waktu',
      'Nama Halaqah',
      'Kode Halaqah',
      'Ustadz Pembimbing',
      'Status Kehadiran Ustadz',
      'Materi / Catatan Ustadz',
      'Nama Karyawan',
      'Status Karyawan',
      'Catatan Karyawan',
      'Poin XP'
    ];

    const rows: (string | number)[][] = [];
    let counter = 1;

    filteredAttendanceSessions.forEach((session) => {
      if (session.members && session.members.length > 0) {
        session.members.forEach((member) => {
          rows.push([
            counter++,
            session.date,
            session.timeStr,
            session.halaqahName,
            session.halaqahCode || '-',
            session.ustadzName,
            session.ustadzStatus === 'hadir' ? 'Hadir Membina' : session.ustadzStatus === 'pengganti' ? 'Ustadz Pengganti' : session.ustadzStatus,
            session.ustadzNotes || '-',
            member.userName,
            member.status.toUpperCase(),
            member.notes || '-',
            member.status === 'hadir' ? (member.xpAwarded || 15) : 0
          ]);
        });
      } else {
        rows.push([
          counter++,
          session.date,
          session.timeStr,
          session.halaqahName,
          session.halaqahCode || '-',
          session.ustadzName,
          session.ustadzStatus,
          session.ustadzNotes || '-',
          '-',
          '-',
          '-',
          0
        ]);
      }
    });

    const filename = `NoorWorship_Rekap_Presensi_DeptHX_${new Date().toISOString().slice(0, 10)}`;
    downloadPerColumnCSV(filename, headers, rows);
    onShowToast('File Excel Rekap Presensi (.xlsx) berhasil diunduh (terformat rapi per kolom A-L)');
  };

  const handleExportSingleSessionCSV = (session: HalaqahAttendanceSession) => {
    const headers = ['No', 'ID Karyawan', 'Nama Karyawan', 'Status Kehadiran', 'Catatan Anggota', 'Poin XP'];
    const rows = session.members.map((m, idx) => [
      idx + 1,
      m.userId,
      m.userName,
      m.status.toUpperCase(),
      m.notes || '-',
      m.status === 'hadir' ? (m.xpAwarded || 15) : 0
    ]);
    const filename = `Presensi_${session.halaqahName.replace(/\s+/g, '_')}_${session.date}`;
    downloadPerColumnCSV(filename, headers, rows);
    onShowToast(`File Excel presensi sesi "${session.sessionTitle}" berhasil diunduh`);
  };

  // Amalan Paten Dept HX states
  const [standardAmalanList, setStandardAmalanList] = useState<StandardAmalanHX[]>(getStoredStandardAmalan);
  const [editingPaten, setEditingPaten] = useState<StandardAmalanHX | null>(null);
  const [showAddPatenModal, setShowAddPatenModal] = useState<boolean>(false);
  const [patenSearch, setPatenSearch] = useState<string>('');
  const [ustadzTaskSearch, setUstadzTaskSearch] = useState<string>('');
  const [ustadzTaskHalaqahFilter, setUstadzTaskHalaqahFilter] = useState<string>('all');

  // Form states for Paten Amalan Editor
  const [formPatenTitle, setFormPatenTitle] = useState('');
  const [formPatenCategory, setFormPatenCategory] = useState('Shalat Wajib');
  const [formPatenBaseXp, setFormPatenBaseXp] = useState(15);
  const [formPatenHasJamaah, setFormPatenHasJamaah] = useState(false);
  const [formPatenJamaahBonus, setFormPatenJamaahBonus] = useState(5);
  const [formPatenTimeWindow, setFormPatenTimeWindow] = useState('');
  const [formPatenNote, setFormPatenNote] = useState('');
  const [formPatenPenalty, setFormPatenPenalty] = useState(5);
  const [formPatenActive, setFormPatenActive] = useState(true);

  // Open Edit Modal for Paten Amalan
  const handleOpenEditPaten = (item: StandardAmalanHX) => {
    setEditingPaten(item);
    setFormPatenTitle(item.title);
    setFormPatenCategory(item.category);
    setFormPatenBaseXp(item.baseXp);
    setFormPatenHasJamaah(item.hasJamaahOption || false);
    setFormPatenJamaahBonus(item.jamaahBonusXp || 5);
    setFormPatenTimeWindow(item.timeWindowDescription || '');
    setFormPatenNote(item.note || '');
    setFormPatenPenalty(item.penaltyLateXp || 5);
    setFormPatenActive(item.isActive);
  };

  const handleSaveEditPaten = () => {
    if (!editingPaten) return;
    const titleTrim = formPatenTitle.trim() || editingPaten.title;
    const updated = standardAmalanList.map((item) => {
      if (item.id === editingPaten.id) {
        return {
          ...item,
          title: titleTrim,
          category: formPatenCategory,
          baseXp: formPatenBaseXp,
          hasJamaahOption: formPatenHasJamaah,
          jamaahBonusXp: formPatenHasJamaah ? formPatenJamaahBonus : 0,
          timeWindowDescription: formPatenTimeWindow,
          note: formPatenNote,
          penaltyLateXp: formPatenPenalty,
          isActive: formPatenActive
        };
      }
      return item;
    });

    setStandardAmalanList(updated);
    saveStoredStandardAmalan(updated);
    setEditingPaten(null);
    onShowToast(`Amalan Pasti "${titleTrim}" berhasil diperbarui oleh Dept HX!`);
  };

  const handleTogglePatenActive = (id: string) => {
    const updated = standardAmalanList.map((item) => {
      if (item.id === id) {
        return { ...item, isActive: !item.isActive };
      }
      return item;
    });
    setStandardAmalanList(updated);
    saveStoredStandardAmalan(updated);
    const target = updated.find((i) => i.id === id);
    onShowToast(
      `Amalan "${target?.title}" sekarang ${target?.isActive ? 'Aktif (Muncul setiap hari)' : 'Dinonaktifkan'}.`
    );
  };

  const handleResetPatenToDefault = () => {
    setStandardAmalanList(DEFAULT_STANDARD_AMALAN_HX);
    saveStoredStandardAmalan(DEFAULT_STANDARD_AMALAN_HX);
    onShowToast('Daftar Amalan Pasti berhasil dikembalikan ke 11 standar baku awal.');
  };

  const handleSaveNewPaten = () => {
    const titleTrim = formPatenTitle.trim();
    if (!titleTrim) {
      onShowToast('Nama amalan pasti tidak boleh kosong');
      return;
    }

    const newItem: StandardAmalanHX = {
      id: `paten-custom-${Date.now()}`,
      title: titleTrim,
      category: formPatenCategory,
      baseXp: formPatenBaseXp,
      hasJamaahOption: formPatenHasJamaah,
      jamaahBonusXp: formPatenHasJamaah ? formPatenJamaahBonus : 0,
      timeWindowDescription: formPatenTimeWindow || 'Sepanjang Hari',
      note: formPatenNote || 'Amalan pasti resmi dari Dept HX',
      penaltyLateXp: formPatenPenalty,
      isActive: true,
      recurrence: 'daily',
      order: standardAmalanList.length + 1
    };

    const updated = [...standardAmalanList, newItem];
    setStandardAmalanList(updated);
    saveStoredStandardAmalan(updated);
    setShowAddPatenModal(false);
    setFormPatenTitle('');
    setFormPatenNote('');
    onShowToast(`Amalan Pasti "${titleTrim}" berhasil ditambahkan dan akan tampil setiap hari!`);
  };

  const allStudentsList = useMemo(() => {
    const map = new Map();
    DEFAULT_HALAQAH_ROSTER.forEach(s => {
      if (!deletedStudentIds.includes(s.id) && !deletedStudentIds.includes(s.name)) {
        const assignedHalaqah = userHalaqahOverrides[s.id] !== undefined ? userHalaqahOverrides[s.id] : s.halaqah;
        map.set(s.id, {
          ...s,
          halaqah: assignedHalaqah,
          totalXp: 1420,
          streakDays: 7,
          tajweedAcc: 94,
          role: 'member',
          supervisor: 'Ustadz Farhan',
          phone: '081234567890'
        });
      }
    });
    if (registeredUsers) {
      registeredUsers.forEach(u => {
        if (!deletedStudentIds.includes(u.id) && !deletedStudentIds.includes(u.name)) {
          const assignedHalaqah = userHalaqahOverrides[u.id] !== undefined ? userHalaqahOverrides[u.id] : (u.halaqah || 'Halaqah Al-Fajr');
          map.set(u.id, {
            id: u.id,
            name: u.name,
            avatar: u.avatar,
            halaqah: assignedHalaqah,
            totalXp: u.totalXp || 1200,
            streakDays: u.streakDays || 5,
            tajweedAcc: 92,
            role: u.role,
            supervisor: u.supervisor || 'Ustadz Farhan',
            phone: u.phone || '081298765432'
          });
        }
      });
    }
    return Array.from(map.values());
  }, [registeredUsers, deletedStudentIds, userHalaqahOverrides]);



  const halaqahGroups = useMemo(() => {
    const groups: Record<string, any[]> = {};
    
    // Pre-populate with all presets so empty new halaqahs are also visible
    allHalaqahPresets.forEach(preset => {
      if (!groups[preset.name]) groups[preset.name] = [];
    });

    allStudentsList.forEach((st: any) => {
      const h = st.halaqah || 'Halaqah Al-Fajr';
      if (!groups[h]) groups[h] = [];
      groups[h].push(st);
    });

    return Object.entries(groups).map(([halaqahName, members]) => {
      const matchedPreset = allHalaqahPresets.find(p => p.name === halaqahName);
      return {
        halaqahName,
        members,
        code: matchedPreset?.code || 'HX-001',
        supervisor: matchedPreset?.supervisor || (halaqahName === 'Halaqah Al-Fajr' ? 'Ustadz Farhan' : halaqahName === 'Hafiz Circle' ? 'Tariq Mansoor' : 'Ustadz Pembimbing'),
        schedule: matchedPreset?.schedule || 'Jadwal Reguler Dept HX',
        location: matchedPreset?.location || 'Masjid Al-Ikhlas',
        avgTajweed: 93,
        compliance: 89
      };
    });
  }, [allStudentsList, allHalaqahPresets]);



  const halaqahPresets = [
    { name: 'Halaqah Al-Fajr', code: 'HF-4092', supervisor: 'Ustadz Farhan' },
    { name: 'Hafiz Circle', code: 'HC-1108', supervisor: 'Ustadz Tariq Mansoor' },
    { name: 'Youth Tajweed', code: 'YT-7721', supervisor: 'Ustadzah Sarah' },
    { name: 'Madinah Memorization Circle', code: 'MC-9901', supervisor: 'Ustadz Mansoor' },
    { name: 'Noor Al-Huda Tajweed Circle', code: 'NH-3382', supervisor: 'Ustadz Zulkifli' }
  ];

  const allRecitersList = useMemo(() => {
    const existingNames = new Set(reciters.map((r) => r.name.toLowerCase()));
    const fromRegistered: ReciterProfile[] = (registeredUsers || [])
      .filter((u) => !existingNames.has(u.name.toLowerCase()) && !deletedStudentIds.includes(u.id) && !deletedStudentIds.includes(u.name))
      .map((u) => {
        const assignedHalaqah = userHalaqahOverrides[u.id] !== undefined ? userHalaqahOverrides[u.id] : (u.halaqah || 'Tanpa Halaqah');
        return {
          id: u.id,
          name: u.name,
          group: assignedHalaqah,
          supervisor: u.role === 'admin' ? 'Ustadz Pembimbing' : 'Ustadz Farhan',
          avatar: u.avatar,
          status: (u.totalXp > 1500 ? 'Mumtaz' : 'Jayyid Jiddan') as any,
          tajweedAcc: 95.0,
          streakDays: u.streakDays,
          totalXp: u.totalXp.toLocaleString(),
          currentActivity: `Aktif di ${assignedHalaqah} (Kode: ${u.halaqahCode || 'HF-4092'})`,
          lastActive: 'Aktif hari ini'
        };
      });

    const mappedReciters = reciters.map((r) => {
      const assignedGroup = userHalaqahOverrides[r.id] !== undefined ? userHalaqahOverrides[r.id] : r.group;
      return {
        ...r,
        group: assignedGroup
      };
    });

    return [...fromRegistered, ...mappedReciters].filter(r => !deletedStudentIds.includes(r.id) && !deletedStudentIds.includes(r.name));
  }, [registeredUsers, reciters, deletedStudentIds, userHalaqahOverrides]);

  const groups = [
    { label: 'Semua Kelompok', count: '1.248' },
    { label: 'Halaqah Al-Fajr', count: '38' },
    { label: 'Hafiz Circle', count: '24' },
    { label: 'Youth Tajweed', count: '42' },
    { label: 'Masjid Al-Ikhlas', count: '115' }
  ];

  const filteredReciters = useMemo(() => {
    return allRecitersList.filter((item) => {
      // Group filter
      if (selectedGroup !== 'Semua Kelompok') {
        if (!item.group.toLowerCase().includes(selectedGroup.toLowerCase())) {
          return false;
        }
      }
      // Status filter
      if (selectedStatus === 'flagged' && !item.isFlagged) {
        return false;
      }
      if (selectedStatus === 'mumtaz' && item.status !== 'Mumtaz' && item.status !== 'Top 1%') {
        return false;
      }
      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          item.name.toLowerCase().includes(q) ||
          item.group.toLowerCase().includes(q) ||
          item.supervisor.toLowerCase().includes(q) ||
          item.currentActivity.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [allRecitersList, selectedGroup, selectedStatus, searchQuery]);

  const handleExportCSV = () => {
    const headers = [
      'No',
      'Nama Karyawan',
      'Kelompok Halaqah',
      'Ustadz Pembimbing',
      'Akurasi Tajwid',
      'Streak Hari',
      'Total XP',
      'Status'
    ];
    const rows = filteredReciters.map((r, idx) => [
      idx + 1,
      r.name,
      r.group,
      r.supervisor,
      `${r.tajweedAcc}%`,
      `${r.streakDays} hari`,
      r.totalXp,
      r.status
    ]);
    const filename = `NoorWorship_Rekap_Karyawan_${new Date().toISOString().slice(0, 10)}`;
    downloadPerColumnCSV(filename, headers, rows);
    onShowToast('File Excel Sheet (.xlsx) berhasil diunduh (terformat rapi per kolom A, B, C...)');
  };

  const handleAddReciter = () => {
    if (!newReciterName.trim()) {
      onShowToast('Mohon masukkan nama karyawan');
      return;
    }

    const selectedPreset =
      allHalaqahPresets.find((h) => h.name === newReciterGroup) || allHalaqahPresets[0];
    const finalPasscode = newReciterPasscode.trim() || '1234';

    // 1. Register to shared system state so karyawan can log in from the login screen immediately
    if (onRegisterSantri) {
      onRegisterSantri({
        name: newReciterName.trim(),
        halaqah: newReciterGroup,
        halaqahCode: selectedPreset.code,
        passcode: finalPasscode,
        phone: newReciterPhone.trim(),
        role: 'member'
      });
    }

    // 2. Add to local reciters directory
    const newEntry: ReciterProfile = {
      id: `reciter-${Date.now()}`,
      name: newReciterName.trim(),
      group: newReciterGroup,
      supervisor: selectedPreset.supervisor,
      avatar:
        'https://lh3.googleusercontent.com/aida-public/AB6AXuCPpztXYvKG0hnmCFJGCCU0xwy2MPvneIXXKJ1BW4Rtejtyzgr02Vo9Su5UxcVuZz3-GF8hPwRY0_1vZl5PVdpW10j8rqRMIipsU_h8mEvEcJShkcDH86v76LYWTlWzju8eCZDjvFPYoqOVoLWKjpOXfZWK3-4DbGikcXmtwS-5rGtyiOB3ejK_8RqWALFKRcTWhwJTWUpwoH36hhTTWYZyTPHbKBimBp0b-0er8SFXjKlDEMOCN2_0Qg',
      status: 'Mumtaz',
      tajweedAcc: 95.0,
      streakDays: 1,
      totalXp: '150',
      currentActivity: `Terdaftar di ${newReciterGroup}`,
      lastActive: 'Baru saja didaftarkan'
    };

    setReciters([newEntry, ...reciters]);
    setShowAddModal(false);
    setNewReciterName('');
    setNewReciterPhone('');
    onShowToast(
      `Karyawan ${newEntry.name} resmi didaftarkan Dept HX ke ${newReciterGroup}! Status akun langsung aktif.`
    );
  };

  const handleLoadMore = () => {
    onShowToast('Berhasil memuat 20 catatan karyawan berikutnya');
  };

  const toggleSelectReciter = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter((item) => item !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  return (
    <div className="flex flex-col w-full px-4 md:px-6 py-3 space-y-4 max-w-4xl mx-auto pb-28">
      {/* Super Admin Dept HX Header & Live Sync */}
      <section className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#1b4332] text-white text-xs font-bold shadow-sm">
            <span
              className="material-symbols-outlined text-[15px] text-[#92f7c3]"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              admin_panel_settings
            </span>
            Pusat Kendali Dept HX
          </span>
          <span className="px-2.5 py-0.5 rounded-full bg-[#fed488]/40 text-[#775a19] text-xs font-bold">
            18 Halaqah Aktif
          </span>
        </div>
        <div className="flex items-center gap-2">

          <div className="flex items-center gap-1.5 text-xs text-[#414844] font-medium">
            <span className="w-2 h-2 rounded-full bg-[#00452c] animate-pulse" />
            Sinkronisasi Langsung
          </div>
        </div>
      </section>

      {/* KPI Metric Bento Grid */}
      <section className="grid grid-cols-2 gap-2.5">
        {/* Total Users */}
        <div className="bg-white p-3.5 rounded-2xl shadow-sm border border-[#1b4332]/5 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-[#414844] font-medium">Total Karyawan Terdaftar</span>
            <span className="w-7 h-7 rounded-xl bg-[#e9edff] flex items-center justify-center text-[#012d1d]">
              <span className="material-symbols-outlined text-[16px]">groups</span>
            </span>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-bold text-[#012d1d] leading-none">1.248</span>
            <span className="text-xs text-[#00452c] font-bold">+32 pekan ini</span>
          </div>
          <span className="text-[11px] text-[#414844] mt-1 truncate">Di 18 Lingkaran Halaqah</span>
        </div>

        {/* Active Today */}
        <div className="bg-white p-3.5 rounded-2xl shadow-sm border border-[#1b4332]/5 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-[#414844] font-medium">Karyawan Aktif Hari Ini</span>
            <span className="w-7 h-7 rounded-xl bg-[#c1ecd4]/60 flex items-center justify-center text-[#1b4332]">
              <span className="material-symbols-outlined text-[16px]">electric_bolt</span>
            </span>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-bold text-[#012d1d] leading-none">892</span>
            <span className="text-xs text-[#414844] font-semibold">71.5%</span>
          </div>
          <span className="text-[11px] text-[#414844] mt-1 truncate">
            Setoran tilawah Subuh tercatat
          </span>
        </div>




      </section>

      {/* Governance & Quick Actions Bar */}
      <section className="flex items-center gap-2 flex-wrap">
        <button
          onClick={() => setShowAddModal(true)}
          className="flex-1 min-w-[130px] h-11 px-4 bg-[#012d1d] hover:bg-[#1b4332] text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-md active:scale-[0.98] transition-all cursor-pointer"
        >
          <span className="material-symbols-outlined text-[18px]">person_add</span>
          <span>Daftar Karyawan Baru</span>
        </button>

        {onOpenSheets && (
          <button
            onClick={onOpenSheets}
            className="h-11 px-3.5 bg-white hover:bg-[#e9fbf2] text-[#00452c] rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm border border-[#00452c]/20 transition-colors cursor-pointer"
            title="Kelola Data via Spreadsheet Excel (.xlsx) lokal tanpa biaya API"
          >
            <span className="material-symbols-outlined text-[18px] text-[#00452c]">
              table_chart
            </span>
            <span>Kelola Sheet (.xlsx)</span>
            <span className="px-1.5 py-0.2 rounded-full bg-[#c1ecd4] text-[#002114] text-[9px] font-bold">
              Free
            </span>
          </button>
        )}



        <button
          onClick={() => setShowBroadcastModal(true)}
          aria-label="Kirim maklumat ke semua Halaqah"
          className="h-11 w-11 bg-white hover:bg-[#f1f3ff] text-[#012d1d] rounded-xl flex items-center justify-center shadow-sm border border-[#1b4332]/5 transition-colors shrink-0 cursor-pointer"
        >
          <span className="material-symbols-outlined text-[20px]">campaign</span>
        </button>
      </section>

      {/* Dept HX View Mode Selector */}
      <div className="flex items-center gap-1.5 p-1 bg-white rounded-2xl shadow-sm border border-[#1b4332]/15 flex-wrap">
        <button
          onClick={() => { setDeptHxTab('halaqah'); setSelectedHalaqahGroup(null); }}
          className={`flex-1 min-w-[110px] py-2 px-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            deptHxTab === 'halaqah'
              ? 'bg-[#012d1d] text-white shadow-sm'
              : 'text-[#414844] hover:bg-[#f1f3ff]'
          }`}
        >
          <span className="material-symbols-outlined text-[16px]">groups</span>
          <span>Lihat Halaqah</span>
        </button>
        <button
          onClick={() => { setDeptHxTab('students'); setSelectedHalaqahGroup(null); }}
          className={`flex-1 min-w-[110px] py-2 px-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            deptHxTab === 'students'
              ? 'bg-[#012d1d] text-white shadow-sm'
              : 'text-[#414844] hover:bg-[#f1f3ff]'
          }`}
        >
          <span className="material-symbols-outlined text-[16px]">badge</span>
          <span>List Karyawan</span>
        </button>
        <button
          onClick={() => { setDeptHxTab('amalan-paten'); setSelectedHalaqahGroup(null); }}
          className={`flex-1 min-w-[140px] py-2 px-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            deptHxTab === 'amalan-paten'
              ? 'bg-[#012d1d] text-white shadow-sm'
              : 'text-[#414844] hover:bg-[#f1f3ff]'
          }`}
        >
          <span className="material-symbols-outlined text-[16px] text-[#fed488]">checklist_rtl</span>
          <span>Amalan Pasti </span>
          <span className="px-1.5 py-0.2 rounded-full bg-[#fed488] text-[#261900] text-[9px] font-bold">
            11 
          </span>
        </button>
        <button
          onClick={() => { setDeptHxTab('presensi'); setSelectedHalaqahGroup(null); }}
          className={`flex-1 min-w-[130px] py-2 px-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            deptHxTab === 'presensi'
              ? 'bg-[#012d1d] text-white shadow-sm'
              : 'text-[#414844] hover:bg-[#f1f3ff]'
          }`}
        >
          <span className="material-symbols-outlined text-[16px] text-[#92f7c3]">how_to_reg</span>
          <span>Rekap Presensi</span>
          {activeAttendanceSessions.length > 0 && (
            <span className="px-1.5 py-0.2 rounded-full bg-[#c1ecd4] text-[#002114] text-[9px] font-bold">
              {activeAttendanceSessions.length}
            </span>
          )}
        </button>
        <button
          onClick={() => { setDeptHxTab('tugas-ustadz'); setSelectedHalaqahGroup(null); }}
          className={`flex-1 min-w-[140px] py-2 px-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            deptHxTab === 'tugas-ustadz'
              ? 'bg-[#012d1d] text-white shadow-sm'
              : 'text-[#414844] hover:bg-[#f1f3ff]'
          }`}
        >
          <span className="material-symbols-outlined text-[16px]">assignment_turned_in</span>
          <span>Tugas Ustadz</span>
          {ibadahDirectives && ibadahDirectives.length > 0 && (
            <span className="px-1.5 py-0.2 rounded-full bg-[#c1ecd4] text-[#002114] text-[9px] font-bold">
              {ibadahDirectives.length}
            </span>
          )}
        </button>
      </div>

      {deptHxTab === 'halaqah' && (
        <div className="space-y-3.5">
          <div className="p-4 rounded-2xl bg-white shadow-sm border border-[#1b4332]/10 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-[#f1f3ff] flex-wrap gap-2">
              <div>
                <h3 className="text-sm font-bold text-[#141b2b]">Direktori Halaqah Binaan Dept HX</h3>
                <p className="text-xs text-[#414844]">Klik salah satu halaqah untuk melihat daftar anggota karyawan</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowAddHalaqahModal(true)}
                  className="px-3.5 py-1.5 rounded-full bg-[#012d1d] hover:bg-[#1b4332] text-white text-xs font-bold shadow-xs transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
                >
                  <span className="material-symbols-outlined text-[16px] text-[#fed488]">add_circle</span>
                  <span>Daftar Halaqah Baru</span>
                </button>
                <span className="px-2.5 py-1 rounded-full bg-[#e9edff] text-[#012d1d] text-xs font-bold">
                  {halaqahGroups.length} Halaqah Aktif
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {halaqahGroups.map((group) => (
                <div
                  key={group.halaqahName}
                  onClick={() => handleOpenHalaqahModal(group.halaqahName)}
                  className="p-4 rounded-2xl bg-[#f9f9ff] hover:bg-emerald-50/30 border border-[#1b4332]/10 hover:border-[#1b4332]/30 shadow-xs transition-all cursor-pointer flex flex-col justify-between gap-3 group"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="px-2 py-0.5 rounded-full bg-[#c1ecd4] text-[#002114] text-[10px] font-bold">
                          Halaqah Resmi
                        </span>
                      </div>
                      <h4 className="text-base font-bold text-[#141b2b] mt-1 group-hover:text-[#012d1d] transition-colors">
                        {group.halaqahName}
                      </h4>
                      <p className="text-xs text-[#414844] mt-0.5">
                        Pembimbing: <span className="font-semibold text-[#141b2b]">{group.supervisor}</span>
                      </p>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-[#012d1d] text-white flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform">
                      <span className="material-symbols-outlined text-[20px]">groups</span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-[#f1f3ff] flex items-center justify-between text-xs">
                    <span className="text-[#414844] font-medium">
                      👥 <strong className="text-[#141b2b]">{group.members.length}</strong> Karyawan Anggota
                    </span>
                    <span className="text-[#012d1d] font-bold flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                      <span className="material-symbols-outlined text-[15px]">settings</span>
                      <span>Kelola Halaqah</span>
                      <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {deptHxTab === 'students' && (
        <div className="space-y-3">
          {/* Search Bar */}
          <div className="relative w-full">
            <span className="absolute inset-y-0 left-3.5 flex items-center pointer-events-none text-[#717973]">
              <span className="material-symbols-outlined text-[20px]">search</span>
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari nama karyawan, ustadz, atau nama halaqah..."
              className="w-full h-11 pl-10 pr-10 bg-white rounded-xl text-xs sm:text-sm text-[#141b2b] placeholder:text-[#717973] border border-[#1b4332]/5 focus:outline-none focus:ring-1 focus:ring-[#012d1d] shadow-sm"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute inset-y-0 right-3 flex items-center text-[#717973] hover:text-[#141b2b] cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">clear</span>
              </button>
            )}
          </div>

          {/* Halaqah Filter Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 -mx-4 px-4">
            {groups.map((grp) => {
              const isSelected = selectedGroup === grp.label;
              return (
                <button
                  key={grp.label}
                  onClick={() => setSelectedGroup(grp.label)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold shrink-0 shadow-sm flex items-center gap-1 transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-[#012d1d] text-white'
                      : 'bg-white text-[#414844] hover:text-[#012d1d] border border-[#1b4332]/5'
                  }`}
                >
                  <span>{grp.label}</span>
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                      isSelected ? 'bg-white/20' : 'bg-[#e9edff]'
                    }`}
                  >
                    {grp.count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Status Filters */}
          <div className="flex items-center justify-between text-xs pt-1">
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
              <button
                onClick={() => setSelectedStatus('all')}
                className={`px-2.5 py-1 rounded-lg font-semibold transition-colors cursor-pointer ${
                  selectedStatus === 'all'
                    ? 'bg-[#dce2f7] text-[#012d1d]'
                    : 'text-[#414844] hover:bg-[#e9edff]'
                }`}
              >
                Semua ({filteredReciters.length})
              </button>
              <button
                onClick={() => setSelectedStatus('flagged')}
                className={`px-2.5 py-1 rounded-lg font-semibold transition-colors cursor-pointer ${
                  selectedStatus === 'flagged'
                    ? 'bg-[#ffdad6] text-[#93000a]'
                    : 'text-[#414844] hover:bg-[#e9edff]'
                }`}
              >
                Perlu Bimbingan (1)
              </button>
              <button
                onClick={() => setSelectedStatus('mumtaz')}
                className={`px-2.5 py-1 rounded-lg font-semibold transition-colors cursor-pointer ${
                  selectedStatus === 'mumtaz'
                    ? 'bg-[#c1ecd4] text-[#002114]'
                    : 'text-[#414844] hover:bg-[#e9edff]'
                }`}
              >
                Mumtaz (3)
              </button>
            </div>
          </div>

          {/* Reciters Directory List */}
          <section className="space-y-3">
            <div className="flex flex-col gap-2.5">
          {filteredReciters.map((item) => {
            const isSelected = selectedIds.includes(item.id);
            return (
              <div
                key={item.id}
                className={`p-4 rounded-2xl bg-white shadow-sm border transition-all ${
                  item.isFlagged
                    ? 'border-[#ba1a1a]/30'
                    : isSelected
                    ? 'border-[#012d1d] ring-1 ring-[#012d1d]'
                    : 'border-[#1b4332]/5'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    {isMultiSelect && (
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelectReciter(item.id)}
                        className="rounded accent-[#012d1d] cursor-pointer"
                      />
                    )}
                    <img
                      className="w-11 h-11 rounded-full object-cover shrink-0 shadow-sm"
                      alt={item.name}
                      src={item.avatar}
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-sm font-bold text-[#141b2b] truncate">
                          {item.name}
                        </span>
                        <span className="px-2 py-0.2 rounded-full bg-[#f1f3ff] text-[#414844] text-[10px] font-semibold">
                          {item.group}
                        </span>
                        {item.status === 'Mumtaz' ? (
                          <span className="px-1.5 py-0.2 rounded-full bg-[#c1ecd4] text-[#002114] text-[9px] font-bold">
                            Mumtaz
                          </span>
                        ) : item.status === 'Top 1%' ? (
                          <span className="px-1.5 py-0.2 rounded-full bg-[#fed488] text-[#785a1a] text-[9px] font-bold">
                            Top 1%
                          </span>
                        ) : item.isFlagged ? (
                          <span className="px-1.5 py-0.2 rounded-full bg-[#ffdad6] text-[#93000a] text-[9px] font-bold">
                            Perlu Bimbingan
                          </span>
                        ) : null}
                      </div>
                      <span className="text-xs text-[#414844] block mt-0.5 truncate">
                        {item.currentActivity}
                      </span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-sm font-bold text-[#012d1d]">{item.totalXp} XP</span>
                    <span className="text-[10px] text-[#717973] block">{item.lastActive}</span>
                  </div>
                </div>

                {/* Sub-bar with Tajweed & Streak stats */}
                <div className="mt-3 pt-2 border-t border-[#f1f3ff] flex items-center justify-between text-xs text-[#414844] flex-wrap gap-2">
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1 font-semibold text-[#00452c]">
                      <span className="material-symbols-outlined text-[14px]">auto_stories</span>
                      {item.tajweedAcc}% Tajwid
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-[14px] text-[#ba1a1a]">
                        local_fire_department
                      </span>
                      {item.streakDays} hari
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteStudent(item);
                      }}
                      className="px-2.5 py-1 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 text-xs font-bold transition-colors cursor-pointer flex items-center gap-1 shrink-0"
                      title={`Hapus Karyawan ${item.name}`}
                    >
                      <span className="material-symbols-outlined text-[14px]">delete</span>
                      <span>Hapus</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedStudentDetail(item)}
                      className="px-3 py-1 rounded-lg bg-[#e9edff] hover:bg-[#012d1d] hover:text-white text-[#012d1d] text-xs font-bold transition-colors flex items-center gap-1 shrink-0 cursor-pointer"
                    >
                      <span>Detail</span>
                      <span className="material-symbols-outlined text-[14px]">chevron_right</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Roster Governance Drawer */}
      <section className="flex flex-col items-center justify-center gap-2 py-3 bg-[#f1f3ff]/60 rounded-2xl p-4 border border-[#1b4332]/5">
        <div className="flex items-center gap-2 text-xs text-[#414844]">
          <span className="w-1.5 h-1.5 rounded-full bg-[#1b4332]/40" />
          <span>Menampilkan {filteredReciters.length} dari 1.248 karyawan terdaftar</span>
          <span className="w-1.5 h-1.5 rounded-full bg-[#1b4332]/40" />
        </div>

        <button
          onClick={handleLoadMore}
          className="w-full max-w-xs h-11 rounded-xl bg-white text-[#012d1d] text-xs font-bold flex items-center justify-center gap-2 shadow-sm border border-[#1b4332]/5 hover:bg-[#e9edff] transition-colors cursor-pointer"
        >
          <span className="material-symbols-outlined text-[18px]">expand_more</span>
          <span>Muat 20 Karyawan Berikutnya</span>
        </button>

        <div className="flex items-center justify-between w-full pt-2 px-1 text-xs text-[#414844]">
          <div className="flex items-center gap-1">
            <span className="material-symbols-outlined text-[15px] text-[#00452c]">
              verified_user
            </span>
            <span>Data Karyawan Terenkripsi</span>
          </div>
          <button
            onClick={() => {
              setIsMultiSelect(!isMultiSelect);
              onShowToast(isMultiSelect ? 'Mode multi-pilih nonaktif' : 'Mode multi-pilih aktif');
            }}
            className="text-[#012d1d] font-bold hover:underline cursor-pointer"
          >
            {isMultiSelect ? 'Keluar Multi-Pilih' : 'Mode Pilih Massal'}
          </button>
        </div>
      </section>
      </div>)}

      {/* Tab: Kelola Amalan Ibadah Paten Dept HX */}
      {deptHxTab === 'amalan-paten' && (
        <div className="space-y-4">
          {/* Top Explanatory Banner */}
          <div className="p-4 sm:p-5 rounded-3xl bg-[#012d1d] text-white shadow-md relative overflow-hidden">
            <div className="absolute -right-8 -top-8 w-36 h-36 rounded-full bg-[#00452c]/50 blur-xl pointer-events-none" />
            <div className="relative z-10 flex flex-col gap-2.5">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-[#92f7c3] text-xs font-bold backdrop-blur-md">
                  <span className="material-symbols-outlined text-[15px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                    verified
                  </span>
                  Otoritas Dept HX • Berlaku Seluruh Karyawan
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setFormPatenTitle('');
                      setFormPatenCategory('Shalat Wajib');
                      setFormPatenBaseXp(15);
                      setFormPatenHasJamaah(false);
                      setFormPatenJamaahBonus(5);
                      setFormPatenTimeWindow('Sepanjang Hari');
                      setFormPatenNote('');
                      setFormPatenPenalty(5);
                      setShowAddPatenModal(true);
                    }}
                    className="px-3.5 py-1.5 rounded-full bg-[#fed488] hover:bg-[#ffdea5] text-[#261900] text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm cursor-pointer active:scale-95"
                  >
                    <span className="material-symbols-outlined text-[16px]">add_circle</span>
                    <span>Tambah Amalan</span>
                  </button>
                  <button
                    onClick={handleResetPatenToDefault}
                    className="px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white text-xs font-semibold transition-all flex items-center gap-1 cursor-pointer"
                    title="Kembalikan ke susunan 11 amalan standar"
                  >
                    <span className="material-symbols-outlined text-[15px]">restart_alt</span>
                    <span>Reset 11 Amalan</span>
                  </button>
                </div>
              </div>

              <div>
                <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
                  Kelola Amalan Ibadah Pasti &amp; Amalan
                </h3>
                <p className="text-xs text-[#86af99] mt-0.5 leading-relaxed max-w-2xl">
                  Amalan-amalan ini selalu muncul otomatis setiap hari di layar karyawan tanpa perlu di-upload ulang. Pengisian shalat 5 waktu terikat waktu adzan, tersedia opsi jamaah (+5 XP), pemotongan -5 XP jika terlambat dalam hari yang sama, dan deteksi otomatis puasa sunnah.
                </p>
              </div>

              <div className="flex items-center gap-3 pt-1 text-xs text-[#fed488] font-semibold flex-wrap">
                <span className="flex items-center gap-1">
                  <span className="material-symbols-outlined text-[16px]">alarm</span>
                  Kalkulasi Waktu Sholat Otomatis
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <span className="material-symbols-outlined text-[16px]">groups</span>
                  Opsi Berjamaah (+5 XP)
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <span className="material-symbols-outlined text-[16px]">lock</span>
                  Permanen Setelah Dicentang
                </span>
              </div>
            </div>
          </div>

          {/* Search Amalan Paten */}
          <div className="relative">
            <span className="material-symbols-outlined absolute left-3 top-2.5 text-[18px] text-[#717973]">
              search
            </span>
            <input
              type="text"
              value={patenSearch}
              onChange={(e) => setPatenSearch(e.target.value)}
              placeholder="Cari amalan pasti (contoh: Dzuhur, Dhuha, Puasa, Olahraga)..."
              className="w-full pl-9 pr-3 py-2.5 rounded-2xl bg-white text-xs font-medium text-[#141b2b] placeholder-[#717973] border border-[#1b4332]/10 focus:border-[#012d1d] focus:outline-none shadow-xs transition-all"
            />
          </div>

          {/* Grid of Amalan Paten */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {standardAmalanList
              .filter((item) =>
                patenSearch.trim()
                  ? item.title.toLowerCase().includes(patenSearch.toLowerCase()) ||
                    item.category.toLowerCase().includes(patenSearch.toLowerCase())
                  : true
              )
              .map((item, idx) => (
                <div
                  key={item.id}
                  className={`p-4 rounded-2xl border transition-all flex flex-col justify-between gap-3 shadow-xs ${
                    item.isActive
                      ? 'bg-white border-[#1b4332]/10'
                      : 'bg-[#f1f3ff]/60 border-dashed border-[#717973]/30 opacity-70'
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-[#012d1d] text-white text-[11px] font-bold flex items-center justify-center shrink-0">
                          {idx + 1}
                        </span>
                        <div>
                          <h4 className="font-bold text-sm text-[#141b2b] leading-tight">
                            {item.title}
                          </h4>
                          <span className="text-[11px] text-[#717973] font-medium">
                            {item.category}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="px-2 py-0.5 rounded-full bg-[#c1ecd4] text-[#002114] text-xs font-bold">
                          +{item.baseXp} XP
                        </span>
                        {item.hasJamaahOption && (
                          <span className="px-2 py-0.5 rounded-full bg-[#fed488] text-[#261900] text-[10px] font-bold" title="Bonus jika berjamaah">
                            Jamaah +{item.jamaahBonusXp || 5} XP
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Window info */}
                    <div className="p-2.5 rounded-xl bg-[#f9f9ff] border border-[#1b4332]/5 text-[11px] text-[#414844] space-y-1">
                      <div className="flex items-center gap-1 font-semibold text-[#012d1d]">
                        <span className="material-symbols-outlined text-[14px]">schedule</span>
                        <span>Batas Waktu: {item.timeWindowDescription}</span>
                      </div>
                      {item.penaltyLateXp ? (
                        <p className="text-[10px] text-amber-800">
                          ⚠️ Terlambat dalam hari yang sama dikenakan pemotongan -{item.penaltyLateXp} XP.
                        </p>
                      ) : null}
                      {item.note && (
                        <p className="text-[10px] text-[#717973] italic">
                          Catatan: {item.note}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Actions Tray */}
                  <div className="flex items-center justify-between pt-2 border-t border-[#f1f3ff] text-xs">
                    <button
                      type="button"
                      onClick={() => handleTogglePatenActive(item.id)}
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full font-bold text-[11px] transition-colors cursor-pointer ${
                        item.isActive
                          ? 'bg-[#c1ecd4] text-[#002114] hover:bg-[#a6dfbe]'
                          : 'bg-[#dce2f7] text-[#414844] hover:bg-[#c9d3f5]'
                      }`}
                    >
                      <span className="material-symbols-outlined text-[13px]">
                        {item.isActive ? 'check_circle' : 'do_not_disturb_on'}
                      </span>
                      <span>{item.isActive ? 'Aktif (Tampil Tiap Hari)' : 'Nonaktif'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleOpenEditPaten(item)}
                      className="inline-flex items-center gap-1 px-3 py-1 rounded-xl bg-[#f1f3ff] hover:bg-[#e4e7ff] text-[#012d1d] font-bold transition-colors cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[14px]">edit</span>
                      <span>Edit Aturan</span>
                    </button>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Tab: Pantau Tugas Halaqah Ustadz */}
      {deptHxTab === 'tugas-ustadz' && (
        <div className="space-y-4">
          {/* Header Banner */}
          <div className="p-4 sm:p-5 rounded-3xl bg-white border border-[#1b4332]/10 shadow-sm space-y-2">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-2xl bg-[#fed488]/30 text-[#775a19] flex items-center justify-center font-bold">
                  <span className="material-symbols-outlined text-[24px]">assignment_turned_in</span>
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#141b2b]">
                    Monitoring Tugas Khusus Halaqah Ustadz
                  </h3>
                  <p className="text-xs text-[#414844]">
                    Memantau kepatuhan tugas ibadah tambahan yang diterbitkan para ustadz pembimbing.
                  </p>
                </div>
              </div>
              <span className="px-3 py-1 rounded-full bg-[#e9fbf2] text-[#00452c] text-xs font-bold border border-[#00452c]/20">
                Batas Adil: Maks. 30 XP / Hari
              </span>
            </div>
          </div>

          {/* Search & Halaqah Filter */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <div className="sm:col-span-2 relative">
              <span className="material-symbols-outlined absolute left-3 top-2.5 text-[18px] text-[#717973]">
                search
              </span>
              <input
                type="text"
                value={ustadzTaskSearch}
                onChange={(e) => setUstadzTaskSearch(e.target.value)}
                placeholder="Cari tugas ustadz (judul, materi, nama ustadz)..."
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-white text-xs font-medium text-[#141b2b] placeholder-[#717973] border border-[#1b4332]/10 focus:border-[#012d1d] focus:outline-none shadow-xs"
              />
            </div>
            <div>
              <select
                value={ustadzTaskHalaqahFilter}
                onChange={(e) => setUstadzTaskHalaqahFilter(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-white text-xs font-medium text-[#141b2b] border border-[#1b4332]/10 focus:border-[#012d1d] focus:outline-none shadow-xs cursor-pointer"
              >
                <option value="all">Semua Halaqah</option>
                {allHalaqahPresets.map((h) => (
                  <option key={h.name} value={h.name}>
                    {h.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Task Directives List */}
          {(() => {
            const list = (ibadahDirectives || []).filter((d) => {
              const target = (d as any).targetHalaqah || 'Semua Halaqah';
              const matchFilter =
                ustadzTaskHalaqahFilter === 'all' ||
                target === ustadzTaskHalaqahFilter ||
                target === 'Semua Halaqah' ||
                target === 'Semua';
              const matchSearch = ustadzTaskSearch.trim()
                ? d.title.toLowerCase().includes(ustadzTaskSearch.toLowerCase()) ||
                  d.target.toLowerCase().includes(ustadzTaskSearch.toLowerCase()) ||
                  ((d as any).createdBy || '').toLowerCase().includes(ustadzTaskSearch.toLowerCase())
                : true;
              return matchFilter && matchSearch;
            });

            if (list.length === 0) {
              return (
                <div className="p-8 rounded-3xl bg-white border border-[#1b4332]/10 text-center space-y-2">
                  <div className="w-12 h-12 rounded-full bg-[#f1f3ff] text-[#717973] flex items-center justify-center mx-auto">
                    <span className="material-symbols-outlined text-[24px]">inbox</span>
                  </div>
                  <h4 className="font-bold text-sm text-[#141b2b]">Belum Ada Tugas Tambahan</h4>
                  <p className="text-xs text-[#717973] max-w-sm mx-auto">
                    Para ustadz belum menerbitkan tugas khusus untuk kriteria pencarian ini. Tugas harian karyawan saat ini mengacu pada 11 Amalan Pasti Dept HX.
                  </p>
                </div>
              );
            }

            return (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {list.map((dir) => {
                  const targetHalaqah = (dir as any).targetHalaqah || 'Semua Halaqah';
                  const createdBy = (dir as any).createdBy || 'Ustadz Pembimbing';
                  const isRecitation = (dir as any).isRecitationTest;
                  const isExceeding = dir.xp > 30;

                  return (
                    <div
                      key={dir.id}
                      className="p-4 rounded-2xl bg-white border border-[#1b4332]/10 shadow-xs flex flex-col justify-between gap-3"
                    >
                      <div className="space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="px-2 py-0.5 rounded-full bg-[#c1ecd4] text-[#002114] text-[10px] font-bold">
                                {targetHalaqah}
                              </span>
                              <span className="px-2 py-0.5 rounded-full bg-[#f1f3ff] text-[#414844] text-[10px] font-semibold">
                                {dir.type === 'yaumiyah' ? 'Yaumiyah (1 Hari)' : 'Usbu\'iyah (1 Pekan)'}
                              </span>
                              {dir.isRecurring !== false && (
                                <span className="px-1.5 py-0.2 rounded-full bg-[#fed488]/40 text-[#775a19] text-[9px] font-bold">
                                  Berulang
                                </span>
                              )}
                            </div>
                            <h4 className="font-bold text-sm text-[#141b2b] mt-1">
                              {dir.title}
                            </h4>
                            <p className="text-xs text-[#414844]">{dir.target}</p>
                          </div>

                          <div className="text-right shrink-0">
                            <span
                              className={`px-2.5 py-1 rounded-full text-xs font-extrabold ${
                                isExceeding
                                  ? 'bg-red-100 text-red-800'
                                  : 'bg-[#012d1d] text-white'
                              }`}
                            >
                              +{dir.xp} XP
                            </span>
                            {isExceeding && (
                              <span className="block text-[9px] text-red-600 font-bold mt-0.5">
                                Melebihi 30 XP
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Supervisor info */}
                        <div className="flex items-center justify-between p-2 rounded-xl bg-[#f9f9ff] text-[11px] text-[#414844]">
                          <span className="flex items-center gap-1">
                            <span className="material-symbols-outlined text-[14px] text-[#00452c]">
                              person
                            </span>
                            Diterbitkan: <strong>{createdBy}</strong>
                          </span>
                          <span className="text-[10px] font-semibold text-[#00452c]">
                            Kepatuhan: {dir.compliancePercent}%
                          </span>
                        </div>
                      </div>

                      <div className="w-full bg-[#f1f3ff] h-1.5 rounded-full overflow-hidden">
                        <div
                          className="bg-[#00452c] h-full rounded-full transition-all"
                          style={{ width: `${Math.min(100, dir.compliancePercent)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 5: REKAP PRESENSI HALAQAH & USTADZ (DEPT HX VIEW)    */}
      {/* ======================================================== */}
      {deptHxTab === 'presensi' && (
        <div className="space-y-4">
          {/* Header Banner & Summary */}
          <div className="p-4 sm:p-5 rounded-3xl bg-white border border-[#1b4332]/10 shadow-sm space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-[#012d1d] text-[#fed488] flex items-center justify-center font-bold shadow-sm shrink-0">
                  <span className="material-symbols-outlined text-[24px]">how_to_reg</span>
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-base font-bold text-[#141b2b]">
                      Monitoring &amp; Rekapitulasi Presensi Halaqah
                    </h3>
                    <span className="px-2 py-0.5 rounded-full bg-[#c1ecd4] text-[#002114] text-[10px] font-bold">
                      Real-time Sinkron HX
                    </span>
                  </div>
                  <p className="text-xs text-[#414844] mt-0.5">
                    Data kehadiran Ustadz pembimbing &amp; seluruh karyawan binaan tersinkronisasi otomatis dari lapangan.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleExportAllAttendanceCSV}
                className="px-4 py-2.5 rounded-xl bg-[#012d1d] hover:bg-[#1b4332] text-white text-xs font-bold transition-all shadow-md active:scale-95 flex items-center justify-center gap-2 shrink-0 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[16px]">download</span>
                <span>Unduh Rekap Presensi (.xlsx)</span>
              </button>
            </div>

            {/* 4 Metric Cards Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2 border-t border-[#f1f3ff]">
              <div className="p-3 rounded-2xl bg-[#f9f9ff] border border-[#1b4332]/5">
                <span className="text-[10px] font-semibold text-[#717973] uppercase tracking-wider block">
                  Total Sesi Tercatat
                </span>
                <div className="flex items-baseline gap-1 mt-1">
                  <span className="text-xl font-bold text-[#012d1d]">
                    {activeAttendanceSessions.length}
                  </span>
                  <span className="text-xs text-[#414844] font-medium">Sesi</span>
                </div>
                <span className="text-[10px] text-[#00452c] font-semibold mt-0.5 block">
                  Tersimpan di Cloud
                </span>
              </div>

              <div className="p-3 rounded-2xl bg-[#f9f9ff] border border-[#1b4332]/5">
                <span className="text-[10px] font-semibold text-[#717973] uppercase tracking-wider block">
                  Kehadiran Ustadz
                </span>
                <div className="flex items-baseline gap-1 mt-1">
                  <span className="text-xl font-bold text-emerald-700">
                    {(() => {
                      if (activeAttendanceSessions.length === 0) return '100%';
                      const present = activeAttendanceSessions.filter(
                        (s) => s.ustadzStatus === 'hadir' || s.ustadzStatus === 'pengganti'
                      ).length;
                      return `${Math.round((present / activeAttendanceSessions.length) * 100)}%`;
                    })()}
                  </span>
                  <span className="text-xs text-emerald-600 font-semibold">Tepat</span>
                </div>
                <span className="text-[10px] text-[#414844] mt-0.5 block">
                  Membina / Badal
                </span>
              </div>

              <div className="p-3 rounded-2xl bg-[#f9f9ff] border border-[#1b4332]/5">
                <span className="text-[10px] font-semibold text-[#717973] uppercase tracking-wider block">
                  Rata-rata Karyawan
                </span>
                <div className="flex items-baseline gap-1 mt-1">
                  <span className="text-xl font-bold text-[#012d1d]">
                    {(() => {
                      if (activeAttendanceSessions.length === 0) return '0%';
                      const avg = Math.round(
                        activeAttendanceSessions.reduce((acc, s) => acc + (s.attendanceRate || 0), 0) /
                          activeAttendanceSessions.length
                      );
                      return `${avg}%`;
                    })()}
                  </span>
                  <span className="text-xs text-[#00452c] font-semibold">Kehadiran</span>
                </div>
                <span className="text-[10px] text-[#414844] mt-0.5 block">
                  Karyawan Binaan
                </span>
              </div>

              <div className="p-3 rounded-2xl bg-emerald-50/50 border border-emerald-200/60">
                <span className="text-[10px] font-semibold text-emerald-800 uppercase tracking-wider block">
                  Status Sinkron
                </span>
                <div className="flex items-center gap-1.5 mt-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                  <span className="text-xs font-bold text-emerald-900">Aktif &amp; Terhubung</span>
                </div>
                <span className="text-[10px] text-emerald-700 font-medium mt-0.5 block">
                  Firestore Cloud DB
                </span>
              </div>
            </div>
          </div>

          {/* Filters Bar: Halaqah, Status Ustadz, Waktu, Search */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-2.5 text-[18px] text-[#717973]">
                search
              </span>
              <input
                type="text"
                value={attendanceSearchQuery}
                onChange={(e) => setAttendanceSearchQuery(e.target.value)}
                placeholder="Cari sesi, ustadz..."
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-white text-xs font-medium text-[#141b2b] placeholder-[#717973] border border-[#1b4332]/10 focus:border-[#012d1d] focus:outline-none shadow-xs"
              />
            </div>

            <div>
              <select
                value={attendanceHalaqahFilter}
                onChange={(e) => setAttendanceHalaqahFilter(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-white text-xs font-medium text-[#141b2b] border border-[#1b4332]/10 focus:border-[#012d1d] focus:outline-none shadow-xs cursor-pointer"
              >
                <option value="all">Semua Halaqah</option>
                {allHalaqahPresets.map((h) => (
                  <option key={h.name} value={h.name}>
                    {h.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <select
                value={attendanceMonthFilter}
                onChange={(e) => setAttendanceMonthFilter(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-white text-xs font-medium text-[#141b2b] border border-[#1b4332]/10 focus:border-[#012d1d] focus:outline-none shadow-xs cursor-pointer"
              >
                <option value="all">Semua Bulan</option>
                <option value="01">Januari</option>
                <option value="02">Februari</option>
                <option value="03">Maret</option>
                <option value="04">April</option>
                <option value="05">Mei</option>
                <option value="06">Juni</option>
                <option value="07">Juli</option>
                <option value="08">Agustus</option>
                <option value="09">September</option>
                <option value="10">Oktober</option>
                <option value="11">November</option>
                <option value="12">Desember</option>
              </select>
            </div>

            <div>
              <select
                value={attendanceStatusFilter}
                onChange={(e) => setAttendanceStatusFilter(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-white text-xs font-medium text-[#141b2b] border border-[#1b4332]/10 focus:border-[#012d1d] focus:outline-none shadow-xs cursor-pointer"
              >
                <option value="all">Semua Status</option>
                <option value="hadir">Hadir Membina</option>
                <option value="pengganti">Ustadz Pengganti</option>
                <option value="izin">Ustadz Izin</option>
                <option value="sakit">Ustadz Sakit</option>
              </select>
            </div>
          </div>

          {/* Analysis: Halaqah with no sessions this week */}
          {halaqahsWithNoSessions.length > 0 && attendanceHalaqahFilter === 'all' && attendanceSearchQuery === '' && (
            <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 space-y-2">
              <div className="flex items-center gap-2 text-rose-800">
                <span className="material-symbols-outlined text-[20px]">warning</span>
                <h4 className="font-bold text-sm">Monitoring Pekan Ini: {halaqahsWithNoSessions.length} Halaqah Belum Berjalan</h4>
              </div>
              <p className="text-xs text-rose-700">
                Halaqah-halaqah berikut belum mencatatkan sesi presensi dalam 7 hari terakhir:
              </p>
              <div className="flex flex-wrap gap-2 pt-1">
                {halaqahsWithNoSessions.map(h => (
                  <span key={h.id} className="px-2 py-0.5 rounded-full bg-white text-rose-800 text-[10px] font-bold border border-rose-100 shadow-xs">
                    {h.name}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Sessions List & Analysis */}
          <div className="space-y-4">
            {filteredAttendanceSessions.length === 0 ? (
              <div className="p-8 rounded-3xl bg-white border border-[#1b4332]/10 text-center space-y-2">
                <div className="w-12 h-12 rounded-full bg-[#f1f3ff] text-[#717973] flex items-center justify-center mx-auto">
                  <span className="material-symbols-outlined text-[24px]">event_busy</span>
                </div>
                <h4 className="font-bold text-sm text-[#141b2b]">Tidak Ditemukan Sesi Presensi</h4>
                <p className="text-xs text-[#717973] max-w-sm mx-auto">
                  Belum ada sesi presensi yang cocok dengan filter atau kata kunci yang dipilih. Setiap sesi yang diisi Ustadz akan otomatis tampil di sini secara real-time.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {filteredAttendanceSessions.map((session) => {
                  const izinCount = session.members.filter((m) => m.status === 'izin').length;
                  const sakitCount = session.members.filter((m) => m.status === 'sakit').length;
                  const alpaCount = session.members.filter((m) => m.status === 'alpa').length;

                  return (
                    <div
                      key={session.id}
                      className="p-4 rounded-2xl bg-white border border-[#1b4332]/10 shadow-xs hover:shadow-md transition-all flex flex-col justify-between gap-3 group"
                    >
                      <div className="space-y-3">
                        {/* Header card */}
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="px-2 py-0.5 rounded-full bg-[#c1ecd4] text-[#002114] text-[10px] font-bold">
                                {session.halaqahName}
                              </span>
                              {session.halaqahCode && (
                                <span className="px-1.5 py-0.2 rounded-full bg-[#f1f3ff] text-[#414844] text-[9px] font-bold">
                                  {session.halaqahCode}
                                </span>
                              )}
                              <span className="px-2 py-0.5 rounded-full bg-[#e9edff] text-[#012d1d] text-[10px] font-semibold">
                                {session.date} • {session.timeStr}
                              </span>
                            </div>
                            <h4 className="font-bold text-sm text-[#141b2b] mt-1.5 line-clamp-1 group-hover:text-[#012d1d] transition-colors">
                              {session.sessionTitle}
                            </h4>
                            <p className="text-[11px] text-[#717973] flex items-center gap-1 mt-0.5">
                              <span className="material-symbols-outlined text-[13px]">location_on</span>
                              <span>{session.location}</span>
                            </p>
                          </div>

                          <div className="text-right shrink-0">
                            <span
                              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold ${
                                session.attendanceRate >= 80
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : session.attendanceRate >= 60
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-rose-100 text-rose-800'
                              }`}
                            >
                              <span className="material-symbols-outlined text-[14px]">groups</span>
                              <span>{session.attendanceRate}% Hadir</span>
                            </span>
                            <span className="text-[10px] text-[#717973] block mt-0.5 font-medium">
                              {session.presentCount}/{session.totalMembers} Karyawan
                            </span>
                          </div>
                        </div>

                        {/* Ustadz Presensi Strip */}
                        <div className="p-2.5 rounded-xl bg-[#f9f9ff] border border-[#1b4332]/5 space-y-1.5 text-xs">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 min-w-0">
                              {session.ustadzAvatar ? (
                                <img
                                  src={session.ustadzAvatar}
                                  alt={session.ustadzName}
                                  className="w-7 h-7 rounded-full object-cover ring-1 ring-white shrink-0"
                                />
                              ) : (
                                <div className="w-7 h-7 rounded-full bg-[#012d1d] text-[#fed488] flex items-center justify-center font-bold text-[11px] shrink-0">
                                  {session.ustadzName[0]}
                                </div>
                              )}
                              <div className="min-w-0">
                                <span className="text-[10px] text-[#717973] block leading-tight">
                                  Ustadz Pembimbing
                                </span>
                                <strong className="text-xs text-[#141b2b] truncate block">
                                  {session.ustadzName}
                                </strong>
                              </div>
                            </div>

                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${
                                session.ustadzStatus === 'hadir'
                                  ? 'bg-[#c1ecd4] text-[#002114]'
                                  : session.ustadzStatus === 'pengganti'
                                  ? 'bg-blue-100 text-blue-800'
                                  : session.ustadzStatus === 'izin'
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-rose-100 text-rose-800'
                              }`}
                            >
                              {session.ustadzStatus === 'hadir'
                                ? '✓ Hadir Membina'
                                : session.ustadzStatus === 'pengganti'
                                ? 'Ustadz Pengganti'
                                : session.ustadzStatus === 'izin'
                                ? 'Izin Dinas'
                                : 'Sakit'}
                            </span>
                          </div>

                          {session.ustadzStatus === 'pengganti' && session.ustadzPenggantiName && (
                            <div className="px-2.5 py-1.5 rounded-lg bg-blue-50 border border-blue-100 text-[10px] space-y-0.5">
                              <span className="text-blue-800 font-bold block uppercase">Nama Pengganti:</span>
                              <span className="text-blue-950 font-semibold block">{session.ustadzPenggantiName}</span>
                              {session.ustadzPenggantiKeterangan && (
                                <span className="text-blue-700 block italic leading-tight mt-0.5">Ket: {session.ustadzPenggantiKeterangan}</span>
                              )}
                            </div>
                          )}

                          {session.ustadzNotes && (
                            <p className="text-[11px] text-[#414844] italic border-t border-[#f1f3ff] pt-1 leading-snug line-clamp-2">
                              &ldquo;{session.ustadzNotes}&rdquo;
                            </p>
                          )}
                        </div>

                        {/* Breakdown pills */}
                        <div className="flex items-center gap-2 text-[10px] font-bold flex-wrap">
                          <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200/60">
                            {session.presentCount} Hadir
                          </span>
                          {izinCount > 0 && (
                            <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200/60">
                              {izinCount} Izin
                            </span>
                          )}
                          {sakitCount > 0 && (
                            <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-800 border border-blue-200/60">
                              {sakitCount} Sakit
                            </span>
                          )}
                          {alpaCount > 0 && (
                            <span className="px-2 py-0.5 rounded-md bg-rose-50 text-rose-800 border border-rose-200/60">
                              {alpaCount} Alpa
                            </span>
                          )}
                        </div>

                        {/* Progress Bar */}
                        <div className="w-full bg-[#f1f3ff] h-1.5 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${
                              session.attendanceRate >= 80
                                ? 'bg-emerald-600'
                                : session.attendanceRate >= 60
                                ? 'bg-amber-500'
                                : 'bg-rose-500'
                            }`}
                            style={{ width: `${session.attendanceRate}%` }}
                          />
                        </div>
                      </div>

                      {/* Card Action Buttons */}
                      <div className="pt-2 border-t border-[#f1f3ff] flex items-center justify-between gap-2">
                        <button
                          type="button"
                          onClick={() => setSelectedAttendanceSessionDetail(session)}
                          className="flex-1 py-2 px-3 rounded-xl bg-[#012d1d] hover:bg-[#1b4332] text-white text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
                        >
                          <span className="material-symbols-outlined text-[16px]">visibility</span>
                          <span>Buka Lembar Presensi Lengkap</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setSessionToDelete(session)}
                          title="Hapus sesi presensi ini"
                          className="w-8 h-8 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 flex items-center justify-center transition-colors cursor-pointer shrink-0"
                        >
                          <span className="material-symbols-outlined text-[18px]">delete</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleExportSingleSessionCSV(session)}
                          title="Unduh presensi sesi ini (.xlsx)"
                          className="w-8 h-8 rounded-xl bg-[#f1f3ff] hover:bg-[#e4e7ff] text-[#012d1d] flex items-center justify-center transition-colors cursor-pointer shrink-0"
                        >
                          <span className="material-symbols-outlined text-[18px]">download</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal: Edit Aturan Amalan Paten */}
      {editingPaten && (
        <div className="fixed inset-0 z-50 bg-[#141b2b]/50 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-md w-full p-5 sm:p-6 shadow-2xl space-y-4 border border-[#1b4332]/10 my-auto animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-[#f1f3ff]">
              <div>
                <span className="px-2 py-0.5 rounded-full bg-[#fed488]/40 text-[#775a19] text-[10px] font-bold uppercase tracking-wider">
                  Dept HX Editor
                </span>
                <h3 className="font-bold text-base text-[#141b2b] mt-0.5">
                  Edit Aturan Amalan
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingPaten(null)}
                className="w-8 h-8 rounded-full bg-[#f1f3ff] hover:bg-[#e4e7ff] text-[#414844] flex items-center justify-center cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-[#414844] block mb-1">Nama Amalan:</label>
                <input
                  type="text"
                  value={formPatenTitle}
                  onChange={(e) => setFormPatenTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-[#1b4332]/15 bg-[#f9f9ff] focus:bg-white focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="font-bold text-[#414844] block mb-1">Kategori:</label>
                  <select
                    value={formPatenCategory}
                    onChange={(e) => setFormPatenCategory(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-[#1b4332]/15 bg-[#f9f9ff] focus:bg-white focus:outline-none cursor-pointer"
                  >
                    <option value="Shalat Wajib">Shalat Wajib</option>
                    <option value="Shalat Sunnah">Shalat Sunnah</option>
                    <option value="Dzikir & Doa">Dzikir & Doa</option>
                    <option value="Shaum Sunnah">Shaum Sunnah</option>
                    <option value="Kesehatan & Rihlah">Kesehatan & Rihlah</option>
                  </select>
                </div>
                <div>
                  <label className="font-bold text-[#414844] block mb-1">Poin Dasar (XP):</label>
                  <input
                    type="number"
                    value={formPatenBaseXp}
                    onChange={(e) => setFormPatenBaseXp(parseInt(e.target.value) || 0)}
                    min={1}
                    max={100}
                    className="w-full px-3 py-2 rounded-xl border border-[#1b4332]/15 bg-[#f9f9ff] focus:bg-white focus:outline-none"
                  />
                </div>
              </div>

              {/* Jamaah Toggle */}
              <div className="p-3 rounded-xl bg-[#f9f9ff] border border-[#1b4332]/10 space-y-2">
                <label className="flex items-center gap-2 cursor-pointer font-bold text-[#012d1d]">
                  <input
                    type="checkbox"
                    checked={formPatenHasJamaah}
                    onChange={(e) => setFormPatenHasJamaah(e.target.checked)}
                    className="rounded text-[#00452c] focus:ring-0 w-4 h-4 cursor-pointer"
                  />
                  <span>Sediakan Opsi Shalat Berjamaah</span>
                </label>
                {formPatenHasJamaah && (
                  <div className="flex items-center gap-2 text-[11px] pt-1">
                    <span className="text-[#414844]">Bonus Berjamaah:</span>
                    <input
                      type="number"
                      value={formPatenJamaahBonus}
                      onChange={(e) => setFormPatenJamaahBonus(parseInt(e.target.value) || 0)}
                      className="w-16 px-2 py-1 rounded-lg border border-[#1b4332]/20 bg-white text-center font-bold"
                    />
                    <span className="font-bold text-[#00452c]">XP (Total: {formPatenBaseXp + formPatenJamaahBonus} XP)</span>
                  </div>
                )}
              </div>

              <div>
                <label className="font-bold text-[#414844] block mb-1">Keterangan Batas Waktu:</label>
                <input
                  type="text"
                  value={formPatenTimeWindow}
                  onChange={(e) => setFormPatenTimeWindow(e.target.value)}
                  placeholder="Misal: Waktu Dzuhur s/d sebelum Adzan Ashar"
                  className="w-full px-3 py-2 rounded-xl border border-[#1b4332]/15 bg-[#f9f9ff] focus:bg-white focus:outline-none"
                />
              </div>

              <div>
                <label className="font-bold text-[#414844] block mb-1">Sanksi Terlambat (-XP):</label>
                <input
                  type="number"
                  value={formPatenPenalty}
                  onChange={(e) => setFormPatenPenalty(parseInt(e.target.value) || 0)}
                  min={0}
                  max={20}
                  className="w-full px-3 py-2 rounded-xl border border-[#1b4332]/15 bg-[#f9f9ff] focus:bg-white focus:outline-none"
                />
                <span className="text-[10px] text-[#717973] mt-0.5 block">
                  Dipotong dari perolehan jika karyawan mengisi amalan di luar rentang waktu namun masih dalam hari yang sama.
                </span>
              </div>

              <div>
                <label className="font-bold text-[#414844] block mb-1">Catatan Pedoman:</label>
                <textarea
                  value={formPatenNote}
                  onChange={(e) => setFormPatenNote(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 rounded-xl border border-[#1b4332]/15 bg-[#f9f9ff] focus:bg-white focus:outline-none"
                />
              </div>

              <label className="flex items-center gap-2 cursor-pointer font-bold text-[#012d1d] pt-1">
                <input
                  type="checkbox"
                  checked={formPatenActive}
                  onChange={(e) => setFormPatenActive(e.target.checked)}
                  className="rounded text-[#00452c] focus:ring-0 w-4 h-4 cursor-pointer"
                />
                <span>Aktif &amp; Selalu Ditampilkan Setiap Hari</span>
              </label>
            </div>

            <div className="flex items-center gap-2 pt-2 border-t border-[#f1f3ff]">
              <button
                type="button"
                onClick={() => setEditingPaten(null)}
                className="px-4 py-2.5 rounded-xl bg-[#f1f3ff] text-xs font-bold text-[#414844] hover:bg-[#e4e7ff] transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleSaveEditPaten}
                className="flex-1 py-2.5 px-4 rounded-xl bg-[#012d1d] hover:bg-[#1b4332] text-white text-xs font-bold shadow-md transition-all cursor-pointer"
              >
                Simpan Perubahan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Tambah Amalan Paten Baru */}
      {showAddPatenModal && (
        <div className="fixed inset-0 z-50 bg-[#141b2b]/50 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-md w-full p-5 sm:p-6 shadow-2xl space-y-4 border border-[#1b4332]/10 my-auto animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-[#f1f3ff]">
              <div>
                <span className="px-2 py-0.5 rounded-full bg-[#fed488]/40 text-[#775a19] text-[10px] font-bold uppercase tracking-wider">
                  Dept HX Otoritas
                </span>
                <h3 className="font-bold text-base text-[#141b2b] mt-0.5">
                  Tambah Amalan Baru
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAddPatenModal(false)}
                className="w-8 h-8 rounded-full bg-[#f1f3ff] hover:bg-[#e4e7ff] text-[#414844] flex items-center justify-center cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-[#414844] block mb-1">Nama Amalan:</label>
                <input
                  type="text"
                  value={formPatenTitle}
                  onChange={(e) => setFormPatenTitle(e.target.value)}
                  placeholder="Misal: Membaca Surat Al-Kahfi, Sedekah Subuh..."
                  className="w-full px-3 py-2 rounded-xl border border-[#1b4332]/15 bg-[#f9f9ff] focus:bg-white focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="font-bold text-[#414844] block mb-1">Kategori:</label>
                  <select
                    value={formPatenCategory}
                    onChange={(e) => setFormPatenCategory(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-[#1b4332]/15 bg-[#f9f9ff] focus:bg-white focus:outline-none cursor-pointer"
                  >
                    <option value="Shalat Wajib">Shalat Wajib</option>
                    <option value="Shalat Sunnah">Shalat Sunnah</option>
                    <option value="Dzikir & Doa">Dzikir & Doa</option>
                    <option value="Shaum Sunnah">Shaum Sunnah</option>
                    <option value="Kesehatan & Rihlah">Kesehatan & Rihlah</option>
                    <option value="Tazkiyatun Nafs">Tazkiyatun Nafs</option>
                    <option value="Lain-lain">Lain-lain</option>
                  </select>
                </div>
                <div>
                  <label className="font-bold text-[#414844] block mb-1">Poin Dasar (XP):</label>
                  <input
                    type="number"
                    value={formPatenBaseXp}
                    onChange={(e) => setFormPatenBaseXp(parseInt(e.target.value) || 0)}
                    min={1}
                    max={100}
                    className="w-full px-3 py-2 rounded-xl border border-[#1b4332]/15 bg-[#f9f9ff] focus:bg-white focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-[#414844] block mb-1">Keterangan Batas Waktu:</label>
                <input
                  type="text"
                  value={formPatenTimeWindow}
                  onChange={(e) => setFormPatenTimeWindow(e.target.value)}
                  placeholder="Misal: Pagi hari sebelum mulai bekerja, atau sepanjang hari"
                  className="w-full px-3 py-2 rounded-xl border border-[#1b4332]/15 bg-[#f9f9ff] focus:bg-white focus:outline-none"
                />
              </div>

              <div>
                <label className="font-bold text-[#414844] block mb-1">Catatan / Petunjuk:</label>
                <textarea
                  value={formPatenNote}
                  onChange={(e) => setFormPatenNote(e.target.value)}
                  rows={2}
                  placeholder="Petunjuk pelaksanaan amalan untuk karyawan..."
                  className="w-full px-3 py-2 rounded-xl border border-[#1b4332]/15 bg-[#f9f9ff] focus:bg-white focus:outline-none"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2 border-t border-[#f1f3ff]">
              <button
                type="button"
                onClick={() => setShowAddPatenModal(false)}
                className="px-4 py-2.5 rounded-xl bg-[#f1f3ff] text-xs font-bold text-[#414844] hover:bg-[#e4e7ff] transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleSaveNewPaten}
                className="flex-1 py-2.5 px-4 rounded-xl bg-[#012d1d] hover:bg-[#1b4332] text-white text-xs font-bold shadow-md transition-all cursor-pointer"
              >
                Tetapkan Amalan Paten
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Reciter Modal — Pendaftaran Resmi Dept HX */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-[#141b2b]/50 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-md w-full p-5 sm:p-6 shadow-2xl space-y-4 border border-[#1b4332]/10 my-auto animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-[#f1f3ff]">
              <div>
                <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[#fed488]/40 text-[#785a1a] text-[10px] font-bold uppercase tracking-wider mb-1">
                  <span className="material-symbols-outlined text-[12px]">verified</span>
                  <span>Registrasi Resmi Dept HX</span>
                </div>
                <h3 className="font-bold text-base text-[#012d1d]">
                  Pendaftaran Karyawan Baru
                </h3>
                <p className="text-xs text-[#414844]">
                  Tetapkan halaqah binaan dan terbitkan akses masuk karyawan
                </p>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="w-8 h-8 rounded-full bg-[#f1f3ff] hover:bg-[#e9edff] flex items-center justify-center text-[#414844] cursor-pointer transition-colors"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            {/* Directive Notice */}
            <div className="p-3 rounded-2xl bg-[#c1ecd4]/40 border border-[#00452c]/20 text-xs text-[#002114] leading-relaxed">
              <span className="font-bold block mb-0.5">Skenario Masuk Otomatis:</span>
              Begitu karyawan ini disimpan, ia langsung dapat login di halaman utama menggunakan namanya, dan statusnya <strong>otomatis langsung aktif di halaqah yang Anda tetapkan di bawah ini</strong>.
            </div>

            {/* Form Fields */}
            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-[#141b2b] mb-1 block">
                  Nama Lengkap Karyawan <span className="text-[#ba1a1a]">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={newReciterName}
                  onChange={(e) => setNewReciterName(e.target.value)}
                  placeholder="Contoh: Muhammad Reyhan Pratama"
                  className="w-full px-3 py-2.5 rounded-xl bg-[#f1f3ff] text-xs font-semibold text-[#141b2b] border border-transparent focus:bg-white focus:border-[#012d1d] focus:outline-none transition-all"
                />
              </div>

              {/* Halaqah Preset Selection */}
              <div>
                <label className="text-xs font-bold text-[#141b2b] mb-1 block">
                  Penetapan Halaqah Dept HX <span className="text-[#ba1a1a]">*</span>
                </label>
                <select
                  value={newReciterGroup}
                  onChange={(e) => setNewReciterGroup(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-[#f1f3ff] text-xs font-semibold text-[#141b2b] focus:bg-white focus:outline-none"
                >
                  {halaqahPresets.map((h) => (
                    <option key={h.code} value={h.name}>
                      {h.name} ({h.code}) — {h.supervisor}
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-[#00452c] font-semibold mt-1">
                  ✓ Kode Penugasan:{' '}
                  {halaqahPresets.find((h) => h.name === newReciterGroup)?.code || 'HF-4092'} • Pembimbing:{' '}
                  {halaqahPresets.find((h) => h.name === newReciterGroup)?.supervisor || 'Ustadz Farhan'}
                </p>
              </div>

              {/* Passcode Login */}
              <div>
                <label className="text-xs font-bold text-[#141b2b] mb-1 block">
                  Passcode Login Karyawan
                </label>
                <input
                  type="text"
                  value={newReciterPasscode}
                  onChange={(e) => setNewReciterPasscode(e.target.value)}
                  placeholder="Default: 1234"
                  className="w-full px-3 py-2 rounded-xl bg-[#f1f3ff] text-xs font-semibold text-[#141b2b] focus:bg-white focus:outline-none"
                />
                <span className="text-[10px] text-[#717973] block mt-0.5">Bawaan: 1234</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 pt-2 border-t border-[#f1f3ff]">
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="flex-1 py-3 rounded-2xl bg-[#f1f3ff] hover:bg-[#e9edff] text-xs font-bold text-[#414844] cursor-pointer transition-colors"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleAddReciter}
                className="flex-2 py-3 rounded-2xl bg-[#012d1d] hover:bg-[#1b4332] active:scale-[0.99] text-white text-xs font-bold shadow-md cursor-pointer transition-all flex items-center justify-center gap-1.5"
              >
                <span className="material-symbols-outlined text-[17px] text-[#fed488]">verified</span>
                <span>Daftarkan &amp; Tetapkan Halaqah</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Broadcast Alert Modal */}
      {showBroadcastModal && (
        <div className="fixed inset-0 z-50 bg-[#141b2b]/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-[#f1f3ff]">
              <div>
                <h3 className="font-bold text-base text-[#141b2b]">Maklumat Pengumuman</h3>
                <p className="text-xs text-[#414844]">Kirim notifikasi ke seluruh 18 lingkaran halaqah</p>
              </div>
              <button
                onClick={() => setShowBroadcastModal(false)}
                className="w-8 h-8 rounded-full bg-[#f1f3ff] flex items-center justify-center text-[#414844] cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <div>
              <label className="text-xs font-bold text-[#141b2b] mb-1 block">Isi Pesan Maklumat</label>
              <textarea
                rows={3}
                value={globalBroadcastText}
                onChange={(e) => setGlobalBroadcastText(e.target.value)}
                placeholder="Contoh: Assalamu'alaikum. Diingatkan seluruh ustadz & karyawan besok pagi ada agenda tabligh akbar pusat."
                className="w-full p-3 rounded-xl bg-[#f1f3ff] text-xs text-[#141b2b] border border-transparent focus:bg-white focus:border-[#012d1d] focus:outline-none transition-all"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setShowBroadcastModal(false)}
                className="flex-1 py-2.5 rounded-xl bg-[#f1f3ff] text-xs font-bold text-[#414844] cursor-pointer transition-colors"
              >
                Batal
              </button>
              <button
                onClick={handleGlobalBroadcast}
                className="flex-1 py-2.5 rounded-xl bg-[#012d1d] hover:bg-[#1b4332] text-white text-xs font-bold shadow-md cursor-pointer transition-all flex items-center justify-center gap-1.5"
              >
                <span className="material-symbols-outlined text-[16px]">campaign</span>
                <span>Siarkan ke Semua</span>
              </button>
            </div>
          </div>
        </div>
      )}



      {/* Modal Manajemen & Kelola Halaqah Binaan Dept HX */}
      {selectedHalaqahGroup && (() => {
        const groupObj = halaqahGroups.find(g => g.halaqahName === selectedHalaqahGroup);
        if (!groupObj) return null;

        const displayMembers = groupObj.members.filter((m: any) => {
          if (!memberSearchInsideHalaqah.trim()) return true;
          const q = memberSearchInsideHalaqah.toLowerCase();
          return m.name.toLowerCase().includes(q) || (m.phone && m.phone.includes(q));
        });

        const existingCandidates = allStudentsList.filter((s: any) => {
          if (s.halaqah === groupObj.halaqahName) return false;
          if (!addExistingSearchQuery.trim()) return true;
          const q = addExistingSearchQuery.toLowerCase();
          return s.name.toLowerCase().includes(q) || (s.halaqah && s.halaqah.toLowerCase().includes(q));
        });

        return (
          <div className="fixed inset-0 z-50 bg-[#141b2b]/65 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150 overflow-y-auto">
            <div className="w-full max-w-2xl bg-white rounded-3xl p-5 sm:p-6 shadow-2xl flex flex-col max-h-[92vh] overflow-hidden border border-[#1b4332]/15 my-auto">
              
              {/* Header Kelola Halaqah */}
              <div className="pb-3 border-b border-[#f1f3ff] space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="px-2.5 py-0.5 rounded-full bg-[#c1ecd4] text-[#002114] text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                        <span className="material-symbols-outlined text-[13px]">admin_panel_settings</span>
                        <span>Pusat Kendali Halaqah Dept HX</span>
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-[#e9edff] text-[#012d1d] text-[10px] font-mono font-bold">
                        {groupObj.code}
                      </span>
                    </div>
                    <h3 className="text-xl font-extrabold text-[#141b2b] mt-1 flex items-center gap-2">
                      <span>{groupObj.halaqahName}</span>
                    </h3>
                  </div>
                  <button
                    onClick={() => setSelectedHalaqahGroup(null)}
                    className="w-9 h-9 rounded-full bg-[#f1f3ff] flex items-center justify-center text-[#414844] hover:bg-[#e4e7ff] transition-colors cursor-pointer shrink-0"
                    title="Tutup Panel"
                  >
                    <span className="material-symbols-outlined text-[20px]">close</span>
                  </button>
                </div>

                {/* Info Bar / Chips */}
                <div className="flex items-center gap-2 text-xs text-[#414844] flex-wrap bg-[#f9f9ff] p-2.5 rounded-xl border border-[#1b4332]/10">
                  <span className="flex items-center gap-1">
                    <span className="material-symbols-outlined text-[15px] text-[#012d1d]">person</span>
                    <span>Pembimbing: <strong className="text-[#141b2b]">{groupObj.supervisor}</strong></span>
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <span className="material-symbols-outlined text-[15px] text-[#775a19]">schedule</span>
                    <span>{groupObj.schedule}</span>
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <span className="material-symbols-outlined text-[15px] text-[#00452c]">mosque</span>
                    <span>{groupObj.location}</span>
                  </span>
                  <span>•</span>
                  <span className="px-2 py-0.5 rounded-full bg-[#fed488]/40 text-[#775a19] text-[10px] font-bold">
                    👥 {groupObj.members.length} Anggota
                  </span>
                </div>

                {/* Sub-navigation Menu Tabs */}
                <div className="flex items-center gap-1.5 pt-1 overflow-x-auto no-scrollbar">
                  <button
                    type="button"
                    onClick={() => setHalaqahActiveTab('members')}
                    className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
                      halaqahActiveTab === 'members'
                        ? 'bg-[#012d1d] text-white shadow-sm'
                        : 'bg-[#f1f3ff] text-[#414844] hover:bg-[#e4e7ff]'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[16px]">groups</span>
                    <span>Daftar Anggota ({groupObj.members.length})</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setHalaqahActiveTab('add')}
                    className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
                      halaqahActiveTab === 'add'
                        ? 'bg-[#012d1d] text-white shadow-sm'
                        : 'bg-[#f1f3ff] text-[#414844] hover:bg-[#e4e7ff]'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[16px]">person_add</span>
                    <span>Tambah Anggota</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setHalaqahActiveTab('edit');
                      const preset = allHalaqahPresets.find(p => p.name === groupObj.halaqahName);
                      setEditHalaqahName(preset?.name || groupObj.halaqahName);
                      setEditHalaqahCode(preset?.code || groupObj.code);
                      setEditHalaqahSupervisor(preset?.supervisor || groupObj.supervisor);
                      setEditHalaqahSchedule(preset?.schedule || groupObj.schedule);
                      setEditHalaqahLocation(preset?.location || groupObj.location);
                      setEditHalaqahDept(preset?.dept || 'Dept HX');
                    }}
                    className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
                      halaqahActiveTab === 'edit'
                        ? 'bg-[#012d1d] text-white shadow-sm'
                        : 'bg-[#f1f3ff] text-[#414844] hover:bg-[#e4e7ff]'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[16px]">edit</span>
                    <span>Edit Info Halaqah</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setHalaqahActiveTab('broadcast')}
                    className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
                      halaqahActiveTab === 'broadcast'
                        ? 'bg-[#012d1d] text-white shadow-sm'
                        : 'bg-[#f1f3ff] text-[#414844] hover:bg-[#e4e7ff]'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[16px]">campaign</span>
                    <span>Siaran &amp; Maklumat</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDeleteHalaqah(groupObj.halaqahName)}
                    className="py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shrink-0 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200/70 shadow-2xs active:scale-95"
                    title={`Hapus Halaqah ${groupObj.halaqahName}`}
                  >
                    <span className="material-symbols-outlined text-[16px]">delete</span>
                    <span>Hapus Halaqah</span>
                  </button>
                </div>
              </div>

              {/* Tab 1: Daftar Anggota */}
              {halaqahActiveTab === 'members' && (
                <div className="flex-1 flex flex-col min-h-0 py-3 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="relative flex-1">
                      <span className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-[#717973]">
                        <span className="material-symbols-outlined text-[18px]">search</span>
                      </span>
                      <input
                        type="text"
                        value={memberSearchInsideHalaqah}
                        onChange={(e) => setMemberSearchInsideHalaqah(e.target.value)}
                        placeholder="Cari nama karyawan dalam halaqah ini..."
                        className="w-full pl-9 pr-3 py-2 rounded-xl bg-[#f9f9ff] border border-[#1b4332]/10 text-xs text-[#141b2b] placeholder-[#717973] focus:outline-none focus:ring-1 focus:ring-[#012d1d]"
                      />
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleExportHalaqahCSV(groupObj)}
                        className="px-3 py-2 rounded-xl bg-white hover:bg-[#f1f3ff] text-[#012d1d] text-xs font-bold border border-[#1b4332]/10 transition-colors flex items-center gap-1 cursor-pointer shadow-2xs"
                        title="Ekspor CSV Anggota"
                      >
                        <span className="material-symbols-outlined text-[16px]">download</span>
                        <span className="hidden sm:inline">CSV</span>
                      </button>
                    </div>
                  </div>

                  {/* Members List */}
                  <div className="flex-1 overflow-y-auto space-y-2 pr-1 scrollbar-thin">
                    {displayMembers.length === 0 ? (
                      <div className="p-8 text-center bg-[#f9f9ff] rounded-2xl border border-dashed border-[#1b4332]/20 space-y-2">
                        <span className="material-symbols-outlined text-[36px] text-[#717973]">group_off</span>
                        <p className="text-sm font-bold text-[#141b2b]">Belum Ada Anggota di Halaqah Ini</p>
                        <p className="text-xs text-[#717973] max-w-sm mx-auto">
                          Kelompok halaqah ini belum memiliki karyawan terdaftar. Silakan gunakan tab menu &quot;Tambah Anggota&quot; di atas untuk mendaftarkan atau memindahkan anggota ke halaqah ini.
                        </p>
                      </div>
                    ) : (
                      displayMembers.map((member: any) => (
                        <div
                          key={member.id}
                          className="p-3 rounded-2xl bg-[#f9f9ff] hover:bg-emerald-50/20 border border-[#1b4332]/10 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-2.5"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <img
                              src={member.avatar}
                              alt={member.name}
                              className="w-11 h-11 rounded-full object-cover ring-2 ring-white shadow-xs shrink-0"
                            />
                            <div className="min-w-0">
                              <h4 className="text-xs sm:text-sm font-bold text-[#141b2b] truncate">
                                {member.name}
                              </h4>
                              <div className="flex items-center gap-1.5 flex-wrap mt-0.5 text-[10px]">
                                <span className="px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 font-bold">
                                  🔥 {member.streakDays || 5} hari
                                </span>
                                <span className="px-1.5 py-0.2 rounded bg-[#e9edff] text-[#012d1d] font-bold">
                                  {member.totalXp} XP
                                </span>
                                <span className="px-1.5 py-0.2 rounded bg-amber-100 text-amber-900 font-bold">
                                  {member.tajweedAcc || 94}% Tajwid
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Member Actions */}
                          <div className="flex items-center gap-1.5 self-end sm:self-center shrink-0">
                            {/* Detail Profile Button */}
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedStudentDetail(member);
                              }}
                              className="px-2.5 py-1.5 rounded-xl bg-white hover:bg-[#e9edff] text-[#012d1d] text-xs font-semibold border border-[#1b4332]/10 transition-colors flex items-center gap-1 cursor-pointer"
                              title="Lihat Profil Santri"
                            >
                              <span className="material-symbols-outlined text-[14px]">visibility</span>
                              <span className="hidden sm:inline">Detail</span>
                            </button>

                            {/* Pindahkan Halaqah Button */}
                            <button
                              type="button"
                              onClick={() => {
                                const otherHalaqahs = allHalaqahPresets.filter(h => h.name !== groupObj.halaqahName);
                                setTransferringMemberTarget({
                                  student: member,
                                  targetHalaqah: otherHalaqahs[0]?.name || ''
                                });
                              }}
                              className="px-2.5 py-1.5 rounded-xl bg-[#e9edff] hover:bg-[#d5dcfa] text-[#012d1d] text-xs font-semibold transition-colors flex items-center gap-1 cursor-pointer"
                              title="Pindahkan ke Halaqah Lain"
                            >
                              <span className="material-symbols-outlined text-[14px]">swap_horiz</span>
                              <span>Pindah</span>
                            </button>

                            {/* Keluarkan dari Halaqah Button (Kurangi Anggota) */}
                            <button
                              type="button"
                              onClick={() => {
                                setRemovingMemberTarget({
                                  id: member.id,
                                  name: member.name,
                                  halaqahName: groupObj.halaqahName
                                });
                              }}
                              className="px-2.5 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 text-xs font-bold transition-colors flex items-center gap-1 cursor-pointer border border-amber-200"
                              title="Keluarkan Karyawan dari Halaqah Ini"
                            >
                              <span className="material-symbols-outlined text-[14px]">person_remove</span>
                              <span>Keluarkan</span>
                            </button>

                            {/* Hapus Karyawan Permanen */}
                            <button
                              type="button"
                              onClick={() => {
                                handleDeleteStudent(member);
                              }}
                              className="p-1.5 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 transition-colors cursor-pointer"
                              title="Hapus Karyawan Permanen dari Sistem"
                            >
                              <span className="material-symbols-outlined text-[16px]">delete</span>
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* Tab 2: Tambah Anggota */}
              {halaqahActiveTab === 'add' && (
                <div className="flex-1 overflow-y-auto py-3 space-y-4 pr-1 scrollbar-thin">
                  {/* Opsi 1: Masukkan Karyawan yang Sudah Terdaftar */}
                  <div className="p-4 rounded-2xl bg-[#f9f9ff] border border-[#1b4332]/10 space-y-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-[#c1ecd4] text-[#002114] flex items-center justify-center font-bold">
                        <span className="material-symbols-outlined text-[18px]">group_add</span>
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-[#141b2b]">
                          Pilih dari Karyawan yang Sudah Terdaftar
                        </h4>
                        <p className="text-[11px] text-[#414844]">
                          Pindahkan atau masukkan karyawan yang terdaftar di halaqah lain atau belum ada kelompok
                        </p>
                      </div>
                    </div>

                    <div className="relative">
                      <span className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-[#717973]">
                        <span className="material-symbols-outlined text-[17px]">search</span>
                      </span>
                      <input
                        type="text"
                        value={addExistingSearchQuery}
                        onChange={(e) => setAddExistingSearchQuery(e.target.value)}
                        placeholder="Cari karyawan berdasarkan nama atau halaqah saat ini..."
                        className="w-full pl-9 pr-3 py-2 rounded-xl bg-white border border-[#1b4332]/10 text-xs text-[#141b2b] placeholder-[#717973] focus:outline-none focus:ring-1 focus:ring-[#012d1d]"
                      />
                    </div>

                    <div className="max-h-44 overflow-y-auto space-y-1.5 scrollbar-thin pr-1">
                      {existingCandidates.length === 0 ? (
                        <p className="text-center text-xs text-[#717973] py-4">
                          Semua karyawan sudah tergabung dalam halaqah ini atau tidak ditemukan.
                        </p>
                      ) : (
                        existingCandidates.map((cand: any) => {
                          const currentH = cand.halaqah || 'Tanpa Halaqah';
                          const hasHalaqah = currentH !== 'Tanpa Halaqah' && currentH !== 'Belum Ada Halaqah' && currentH !== groupObj.halaqahName;

                          return (
                            <div
                              key={cand.id}
                              className="p-2.5 rounded-xl bg-white border border-[#1b4332]/5 flex items-center justify-between gap-2 shadow-2xs"
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <img
                                  src={cand.avatar}
                                  alt={cand.name}
                                  className="w-8 h-8 rounded-full object-cover shrink-0"
                                />
                                <div className="min-w-0">
                                  <span className="text-xs font-bold text-[#141b2b] truncate block">
                                    {cand.name}
                                  </span>
                                  <span className="text-[10px] text-[#717973] truncate block">
                                    Halaqah saat ini: <strong className="text-[#012d1d]">{currentH}</strong>
                                  </span>
                                </div>
                              </div>

                              {hasHalaqah ? (
                                <button
                                  type="button"
                                  onClick={() => handleAddExistingStudentToHalaqah(cand, groupObj.halaqahName, groupObj.code)}
                                  className="px-2.5 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200 text-[10px] font-bold transition-all shadow-2xs flex items-center gap-1 cursor-pointer shrink-0"
                                  title={`Karyawan sudah terdaftar di ${currentH}. Klik untuk info pemindahan.`}
                                >
                                  <span className="material-symbols-outlined text-[13px]">lock</span>
                                  <span>Sudah Ada Halaqah</span>
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => handleAddExistingStudentToHalaqah(cand, groupObj.halaqahName, groupObj.code)}
                                  className="px-3 py-1.5 rounded-full bg-[#012d1d] hover:bg-[#1b4332] text-white text-[11px] font-bold transition-all shadow-xs flex items-center gap-1 cursor-pointer shrink-0 active:scale-95"
                                >
                                  <span className="material-symbols-outlined text-[14px] text-[#fed488]">add</span>
                                  <span>Masukkan</span>
                                </button>
                              )}
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>

                  {/* Opsi 2: Daftarkan Karyawan Baru Langsung */}
                  <div className="p-4 rounded-2xl bg-white border border-[#1b4332]/15 shadow-xs space-y-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-[#fed488] text-[#775a19] flex items-center justify-center font-bold">
                        <span className="material-symbols-outlined text-[18px]">person_add_alt</span>
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-[#141b2b]">
                          Daftarkan Karyawan Baru Langsung ke Halaqah Ini
                        </h4>
                        <p className="text-[11px] text-[#414844]">
                          Terbitkan akun baru dan langsung tetapkan menjadi anggota <strong className="text-[#012d1d]">{groupObj.halaqahName}</strong>
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <div>
                        <label className="block text-[11px] font-bold text-[#141b2b] mb-1">
                          Nama Lengkap Karyawan <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={quickAddName}
                          onChange={(e) => setQuickAddName(e.target.value)}
                          placeholder="Contoh: Muhammad Rayhan"
                          className="w-full px-3 py-2 rounded-xl bg-[#f9f9ff] border border-[#1b4332]/15 text-xs text-[#141b2b] focus:outline-none focus:ring-1 focus:ring-[#012d1d]"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-[#141b2b] mb-1">
                          Passcode Akses Masuk
                        </label>
                        <input
                          type="text"
                          value={quickAddPasscode}
                          onChange={(e) => setQuickAddPasscode(e.target.value)}
                          placeholder="Default: 1234"
                          className="w-full px-3 py-2 rounded-xl bg-[#f9f9ff] border border-[#1b4332]/15 text-xs font-mono font-bold text-[#012d1d] focus:outline-none focus:ring-1 focus:ring-[#012d1d]"
                        />
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleQuickRegisterToHalaqah(groupObj.halaqahName, groupObj.code, groupObj.supervisor)}
                      className="w-full py-2.5 rounded-xl bg-[#012d1d] hover:bg-[#1b4332] text-white text-xs font-bold transition-all shadow-md active:scale-95 cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <span className="material-symbols-outlined text-[16px] text-[#fed488]">verified</span>
                      <span>Daftarkan &amp; Masukkan ke {groupObj.halaqahName}</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Tab 3: Edit Info Halaqah */}
              {halaqahActiveTab === 'edit' && (
                <div className="flex-1 overflow-y-auto py-3 space-y-3.5 pr-1 scrollbar-thin">
                  <div className="p-3 rounded-2xl bg-[#e9fbf2] border border-[#92f7c3]/60 flex items-start gap-2 text-xs text-[#00452c]">
                    <span className="material-symbols-outlined text-[18px] shrink-0 text-[#00452c]">edit_note</span>
                    <p className="text-[11px] leading-relaxed">
                      Anda dapat mengubah nama kelompok halaqah, kode, ustadz pembimbing, jadwal pertemuan, lokasi masjid, dan departemen naungan. Perubahan nama akan otomatis diperbarui pada seluruh data anggota halaqah ini.
                    </p>
                  </div>

                  <div className="space-y-3 text-xs text-[#141b2b]">
                    {/* Nama Halaqah */}
                    <div>
                      <label className="block font-bold mb-1">
                        Nama Kelompok Halaqah <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={editHalaqahName}
                        onChange={(e) => setEditHalaqahName(e.target.value)}
                        placeholder="Contoh: Halaqah Al-Fajr"
                        className="w-full px-3.5 py-2.5 bg-[#f9f9ff] border border-[#1b4332]/15 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#012d1d]"
                      />
                    </div>

                    {/* Kode Halaqah & Auto Code */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="font-bold">Kode Unik Halaqah</label>
                          <button
                            type="button"
                            onClick={() => setEditHalaqahCode(`HX-${Math.floor(1000 + Math.random() * 9000)}`)}
                            className="text-[10px] text-[#00452c] font-bold hover:underline cursor-pointer"
                          >
                            ⚡ Auto Code
                          </button>
                        </div>
                        <input
                          type="text"
                          value={editHalaqahCode}
                          onChange={(e) => setEditHalaqahCode(e.target.value)}
                          placeholder="Contoh: HF-4092"
                          className="w-full px-3.5 py-2.5 bg-[#f9f9ff] border border-[#1b4332]/15 rounded-xl text-xs font-bold text-[#012d1d] uppercase focus:outline-none focus:ring-2 focus:ring-[#012d1d]"
                        />
                      </div>

                      <div>
                        <label className="block font-bold mb-1">
                          Ustadz Pembimbing / Supervisor
                        </label>
                        <input
                          type="text"
                          value={editHalaqahSupervisor}
                          onChange={(e) => setEditHalaqahSupervisor(e.target.value)}
                          placeholder="Contoh: Ustadz Farhan"
                          className="w-full px-3.5 py-2.5 bg-[#f9f9ff] border border-[#1b4332]/15 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#012d1d]"
                        />
                      </div>
                    </div>

                    {/* Jadwal & Lokasi */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block font-bold mb-1">Jadwal Pertemuan</label>
                        <input
                          type="text"
                          value={editHalaqahSchedule}
                          onChange={(e) => setEditHalaqahSchedule(e.target.value)}
                          placeholder="Contoh: Senin - Jumat 05:30 WIB"
                          className="w-full px-3.5 py-2.5 bg-[#f9f9ff] border border-[#1b4332]/15 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#012d1d]"
                        />
                      </div>

                      <div>
                        <label className="block font-bold mb-1">Lokasi / Titik Masjid</label>
                        <input
                          type="text"
                          value={editHalaqahLocation}
                          onChange={(e) => setEditHalaqahLocation(e.target.value)}
                          placeholder="Contoh: Masjid Al-Ikhlas"
                          className="w-full px-3.5 py-2.5 bg-[#f9f9ff] border border-[#1b4332]/15 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#012d1d]"
                        />
                      </div>
                    </div>

                    {/* Divisi / Departemen */}
                    <div>
                      <label className="block font-bold mb-1">Divisi / Departemen Naungan</label>
                      <input
                        type="text"
                        value={editHalaqahDept}
                        onChange={(e) => setEditHalaqahDept(e.target.value)}
                        placeholder="Contoh: Dept HX / Dept Produksi"
                        className="w-full px-3.5 py-2.5 bg-[#f9f9ff] border border-[#1b4332]/15 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#012d1d]"
                      />
                    </div>
                  </div>

                  <div className="pt-3 border-t border-[#f1f3ff] flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setHalaqahActiveTab('members')}
                      className="px-4 py-2 rounded-full bg-[#f1f3ff] hover:bg-[#e4e7ff] text-[#414844] text-xs font-bold transition-colors cursor-pointer"
                    >
                      Batal
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSaveEditHalaqah(groupObj.halaqahName)}
                      className="px-5 py-2 rounded-full bg-[#012d1d] hover:bg-[#1b4332] text-white text-xs font-bold transition-all shadow-md active:scale-95 cursor-pointer flex items-center gap-1.5"
                    >
                      <span className="material-symbols-outlined text-[16px] text-[#fed488]">save</span>
                      <span>Simpan Perubahan Info</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Tab 4: Siaran & Maklumat */}
              {halaqahActiveTab === 'broadcast' && (
                <div className="flex-1 overflow-y-auto py-3 space-y-3.5 pr-1 scrollbar-thin">
                  <div className="p-3.5 rounded-2xl bg-[#e9edff] border border-[#1b4332]/10 space-y-1 text-xs">
                    <span className="font-bold text-[#012d1d] flex items-center gap-1">
                      <span className="material-symbols-outlined text-[16px]">campaign</span>
                      <span>Siaran Khusus Anggota {groupObj.halaqahName}</span>
                    </span>
                    <p className="text-[11px] text-[#414844]">
                      Maklumat ini hanya akan disampaikan kepada {groupObj.members.length} karyawan yang terdaftar di {groupObj.halaqahName}.
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#141b2b] mb-1">
                      Isi Pesan Maklumat
                    </label>
                    <textarea
                      rows={4}
                      value={broadcastHalaqahText}
                      onChange={(e) => setBroadcastHalaqahText(e.target.value)}
                      placeholder={`Assalamu'alaikum anggota ${groupObj.halaqahName}. Diingatkan agenda setoran tilawah besok ba'da Subuh di ${groupObj.location}...`}
                      className="w-full p-3 rounded-2xl bg-[#f9f9ff] border border-[#1b4332]/15 text-xs text-[#141b2b] placeholder-[#717973] focus:outline-none focus:ring-2 focus:ring-[#012d1d]"
                    />
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#f1f3ff]">
                    <button
                      type="button"
                      onClick={() => handleBroadcastToHalaqah(groupObj.halaqahName)}
                      className="px-5 py-2.5 rounded-full bg-[#012d1d] hover:bg-[#1b4332] text-white text-xs font-bold transition-all shadow-md active:scale-95 cursor-pointer flex items-center gap-1.5"
                    >
                      <span className="material-symbols-outlined text-[16px] text-[#fed488]">send</span>
                      <span>Siarkan Maklumat</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Modal Footer */}
              <div className="pt-3 border-t border-[#f1f3ff] flex items-center justify-end text-xs text-[#717973]">
                <button
                  type="button"
                  onClick={() => setSelectedHalaqahGroup(null)}
                  className="px-5 py-2 rounded-full bg-[#012d1d] text-white text-xs font-bold shadow-xs hover:bg-[#1b4332] cursor-pointer"
                >
                  Tutup Panel Kelola
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

            <div className="pt-2 border-t border-[#f1f3ff] flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleDeleteStudent(selectedStudentDetail)}
                className="flex-1 py-2.5 rounded-full bg-red-50 hover:bg-red-100 text-red-600 text-xs font-bold transition-all border border-red-200 cursor-pointer flex items-center justify-center gap-1.5"
              >
                <span className="material-symbols-outlined text-[16px]">delete</span>
                <span>Hapus Karyawan</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedStudentDetail(null)}
                className="flex-1 py-2.5 rounded-full bg-[#012d1d] hover:bg-[#1b4332] text-white text-xs font-bold transition-all shadow-xs cursor-pointer text-center"
              >
                Tutup Detail
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Daftar Halaqah Baru */}
      {showAddHalaqahModal && (
        <div className="fixed inset-0 z-50 bg-[#141b2b]/55 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-lg bg-white rounded-3xl p-5 sm:p-6 shadow-2xl flex flex-col space-y-4 border border-[#1b4332]/10 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-[#f1f3ff]">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-[#012d1d] text-[#fed488] flex items-center justify-center font-bold shadow-xs">
                  <span className="material-symbols-outlined text-[20px]">group_add</span>
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#141b2b]">
                    Daftar Halaqah Baru
                  </h3>
                  <p className="text-xs text-[#414844]">
                    Registrasi kelompok halaqah binaan resmi Dept HX
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowAddHalaqahModal(false)}
                className="w-8 h-8 rounded-full bg-[#f1f3ff] flex items-center justify-center text-[#414844] hover:bg-[#e4e7ff] transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <div className="space-y-3.5 text-xs text-[#141b2b]">
              {/* Nama Halaqah */}
              <div>
                <label className="block text-xs font-bold text-[#141b2b] mb-1">
                  Nama Kelompok Halaqah <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newHalaqahName}
                  onChange={(e) => setNewHalaqahName(e.target.value)}
                  placeholder="Contoh: Halaqah Al-Barakah Dept Finance"
                  className="w-full px-3.5 py-2.5 bg-[#f9f9ff] border border-[#1b4332]/15 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#012d1d] focus:bg-white transition-all"
                />
              </div>

              {/* Kode Halaqah & Auto Generate */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-[#141b2b]">
                      Kode Unik Halaqah
                    </label>
                    <button
                      type="button"
                      onClick={() => setNewHalaqahCode(`HX-${Math.floor(1000 + Math.random() * 9000)}`)}
                      className="text-[10px] text-[#00452c] font-bold hover:underline cursor-pointer"
                    >
                      ⚡ Auto Code
                    </button>
                  </div>
                  <input
                    type="text"
                    value={newHalaqahCode}
                    onChange={(e) => setNewHalaqahCode(e.target.value)}
                    placeholder="Contoh: HB-5012"
                    className="w-full px-3.5 py-2.5 bg-[#f9f9ff] border border-[#1b4332]/15 rounded-xl text-xs font-bold text-[#012d1d] uppercase focus:outline-none focus:ring-2 focus:ring-[#012d1d] transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#141b2b] mb-1">
                    Ustadz Pembimbing / Supervisor
                  </label>
                  <input
                    type="text"
                    value={newHalaqahSupervisor}
                    onChange={(e) => setNewHalaqahSupervisor(e.target.value)}
                    placeholder="Contoh: Ustadz Ahmad Dahlan"
                    className="w-full px-3.5 py-2.5 bg-[#f9f9ff] border border-[#1b4332]/15 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#012d1d] transition-all"
                  />
                </div>
              </div>

              {/* Jadwal & Lokasi */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#141b2b] mb-1">
                    Jadwal Pertemuan
                  </label>
                  <input
                    type="text"
                    value={newHalaqahSchedule}
                    onChange={(e) => setNewHalaqahSchedule(e.target.value)}
                    placeholder="Contoh: Selasa & Kamis 05:30 WIB"
                    className="w-full px-3.5 py-2.5 bg-[#f9f9ff] border border-[#1b4332]/15 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#012d1d] transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#141b2b] mb-1">
                    Lokasi / Titik Masjid
                  </label>
                  <input
                    type="text"
                    value={newHalaqahLocation}
                    onChange={(e) => setNewHalaqahLocation(e.target.value)}
                    placeholder="Contoh: Masjid Al-Ikhlas"
                    className="w-full px-3.5 py-2.5 bg-[#f9f9ff] border border-[#1b4332]/15 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#012d1d] transition-all"
                  />
                </div>
              </div>

              {/* Divisi / Departemen */}
              <div>
                <label className="block text-xs font-bold text-[#141b2b] mb-1">
                  Divisi / Departemen Naungan
                </label>
                <input
                  type="text"
                  value={newHalaqahDept}
                  onChange={(e) => setNewHalaqahDept(e.target.value)}
                  placeholder="Contoh: Dept Finance & Accounting"
                  className="w-full px-3.5 py-2.5 bg-[#f9f9ff] border border-[#1b4332]/15 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#012d1d] transition-all"
                />
              </div>

              <div className="p-3 rounded-2xl bg-[#e9fbf2] border border-[#92f7c3]/60 flex items-start gap-2 text-xs text-[#00452c]">
                <span className="material-symbols-outlined text-[18px] shrink-0 text-[#00452c]">info</span>
                <p className="text-[11px] leading-relaxed">
                  Halaqah baru ini akan langsung terdaftar di direktori Dept HX dan dapat dipilih saat mendaftarkan Karyawan baru.
                </p>
              </div>
            </div>

            <div className="pt-3 border-t border-[#f1f3ff] flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowAddHalaqahModal(false)}
                className="px-4 py-2.5 rounded-full bg-[#f1f3ff] hover:bg-[#e4e7ff] text-[#414844] text-xs font-bold transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleSaveNewHalaqah}
                className="px-5 py-2.5 rounded-full bg-[#012d1d] hover:bg-[#1b4332] text-white text-xs font-bold transition-all shadow-md active:scale-95 cursor-pointer flex items-center gap-1.5"
              >
                <span className="material-symbols-outlined text-[16px] text-[#fed488]">check_circle</span>
                <span>Daftarkan Halaqah Baru</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Pop Up Konfirmasi Kurangi / Keluarkan Anggota dari Halaqah */}
      {removingMemberTarget && (
        <div className="fixed inset-0 z-60 bg-[#141b2b]/65 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in zoom-in-95 duration-150">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl space-y-4 border border-amber-200 text-center">
            <div className="w-14 h-14 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center mx-auto shadow-inner">
              <span className="material-symbols-outlined text-[30px]">person_remove</span>
            </div>
            <div>
              <h3 className="font-extrabold text-base text-[#141b2b]">Keluarkan dari Halaqah?</h3>
              <p className="text-xs text-[#414844] mt-1.5 leading-relaxed">
                Apakah Anda yakin ingin mengeluarkan <strong className="text-[#141b2b] font-bold">&quot;{removingMemberTarget.name}&quot;</strong> dari <strong className="text-[#012d1d] font-bold">&quot;{removingMemberTarget.halaqahName}&quot;</strong>?
              </p>
              <div className="mt-2.5 p-2.5 rounded-xl bg-amber-50 text-left text-[11px] text-amber-900 border border-amber-200/60">
                <span className="font-bold flex items-center gap-1 mb-0.5">
                  <span className="material-symbols-outlined text-[13px]">info</span>
                  Catatan Dept HX:
                </span>
                Karyawan ini tidak dihapus dari sistem, melainkan diubah statusnya menjadi <strong className="font-bold">&quot;Tanpa Halaqah&quot;</strong> dan siap dipindahkan ke kelompok lain.
              </div>
            </div>
            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => setRemovingMemberTarget(null)}
                className="flex-1 py-2.5 rounded-full bg-[#f1f3ff] hover:bg-[#e4e7ff] text-[#414844] text-xs font-bold transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={confirmRemoveMember}
                className="flex-1 py-2.5 rounded-full bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition-all shadow-md active:scale-95 cursor-pointer flex items-center justify-center gap-1"
              >
                <span className="material-symbols-outlined text-[16px]">check</span>
                <span>Ya, Keluarkan</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Pop Up Pindahkan Anggota ke Halaqah Lain */}
      {transferringMemberTarget && (
        <div className="fixed inset-0 z-60 bg-[#141b2b]/65 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in zoom-in-95 duration-150">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 border border-[#1b4332]/15">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-[#e9edff] text-[#012d1d] flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-[26px]">swap_horiz</span>
              </div>
              <div className="min-w-0">
                <h3 className="font-extrabold text-base text-[#141b2b]">Pindahkan Halaqah Karyawan</h3>
                <p className="text-xs text-[#414844] truncate">
                  Pindahkan <strong className="text-[#012d1d] font-bold">{transferringMemberTarget.student.name}</strong> ke halaqah lain
                </p>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-xl bg-[#f9f9ff] border border-[#1b4332]/10 space-y-1">
                <span className="text-[11px] text-[#717973]">Halaqah Saat Ini:</span>
                <p className="font-bold text-[#141b2b] flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[15px] text-[#00452c]">groups</span>
                  <span>{transferringMemberTarget.student.halaqah || selectedHalaqahGroup || 'Tanpa Halaqah'}</span>
                </p>
              </div>

              <div>
                <label className="block font-bold text-[#141b2b] mb-1.5">
                  Pilih Halaqah Tujuan Baru <span className="text-red-500">*</span>
                </label>
                <select
                  value={transferringMemberTarget.targetHalaqah}
                  onChange={(e) =>
                    setTransferringMemberTarget({
                      ...transferringMemberTarget,
                      targetHalaqah: e.target.value
                    })
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#f9f9ff] border border-[#1b4332]/15 text-xs font-bold text-[#012d1d] focus:outline-none focus:ring-2 focus:ring-[#012d1d]"
                >
                  {allHalaqahPresets
                    .filter((h) => h.name !== (transferringMemberTarget.student.halaqah || selectedHalaqahGroup))
                    .map((h) => (
                      <option key={h.id || h.name} value={h.name}>
                        {h.name} ({h.code}) — {h.supervisor}
                      </option>
                    ))}
                </select>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2 border-t border-[#f1f3ff]">
              <button
                type="button"
                onClick={() => setTransferringMemberTarget(null)}
                className="flex-1 py-2.5 rounded-full bg-[#f1f3ff] hover:bg-[#e4e7ff] text-[#414844] text-xs font-bold transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={confirmTransferMember}
                className="flex-1 py-2.5 rounded-full bg-[#012d1d] hover:bg-[#1b4332] text-white text-xs font-bold transition-all shadow-md active:scale-95 cursor-pointer flex items-center justify-center gap-1"
              >
                <span className="material-symbols-outlined text-[16px] text-[#fed488]">check</span>
                <span>Pindahkan Sekarang</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Pop Up Konfirmasi Hapus Halaqah */}
      {deletingHalaqahTarget && (
        <div className="fixed inset-0 z-60 bg-[#141b2b]/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in zoom-in-95 duration-150">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl space-y-4 border border-red-100 text-center">
            <div className="w-14 h-14 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto shadow-inner">
              <span className="material-symbols-outlined text-[30px]">warning</span>
            </div>
            <div>
              <h3 className="font-extrabold text-base text-[#141b2b]">Hapus Halaqah?</h3>
              <p className="text-xs text-[#414844] mt-1 leading-relaxed">
                Apakah Anda yakin ingin menghapus Halaqah <strong className="text-[#141b2b] font-bold">&quot;{deletingHalaqahTarget}&quot;</strong>?
                Halaqah ini akan dihapus dari direktori Dept HX.
              </p>
            </div>
            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeletingHalaqahTarget(null)}
                className="flex-1 py-2.5 rounded-full bg-[#f1f3ff] hover:bg-[#e4e7ff] text-[#414844] text-xs font-bold transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={confirmDeleteHalaqah}
                className="flex-1 py-2.5 rounded-full bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition-all shadow-md active:scale-95 cursor-pointer flex items-center justify-center gap-1"
              >
                <span className="material-symbols-outlined text-[16px]">delete</span>
                <span>Ya, Hapus</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Pop Up Konfirmasi Hapus Karyawan */}
      {deletingStudentTarget && (
        <div className="fixed inset-0 z-60 bg-[#141b2b]/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in zoom-in-95 duration-150">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl space-y-4 border border-red-100 text-center">
            <div className="w-14 h-14 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto shadow-inner">
              <span className="material-symbols-outlined text-[30px]">person_remove</span>
            </div>
            <div>
              <h3 className="font-extrabold text-base text-[#141b2b]">Hapus Data Karyawan?</h3>
              <p className="text-xs text-[#414844] mt-1 leading-relaxed">
                Apakah Anda yakin ingin menghapus data Karyawan <strong className="text-[#141b2b] font-bold">&quot;{deletingStudentTarget.name}&quot;</strong>?
                Data karyawan akan dihapus dari sistem.
              </p>
            </div>
            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeletingStudentTarget(null)}
                className="flex-1 py-2.5 rounded-full bg-[#f1f3ff] hover:bg-[#e4e7ff] text-[#414844] text-xs font-bold transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={confirmDeleteStudent}
                className="flex-1 py-2.5 rounded-full bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition-all shadow-md active:scale-95 cursor-pointer flex items-center justify-center gap-1"
              >
                <span className="material-symbols-outlined text-[16px]">delete</span>
                <span>Ya, Hapus</span>
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Modal: Lembar Presensi Lengkap Sesi (Dept HX) */}
      {selectedAttendanceSessionDetail && (
        <div className="fixed inset-0 z-50 bg-[#141b2b]/55 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-150">
          <div className="w-full max-w-2xl bg-white rounded-3xl p-5 sm:p-6 shadow-2xl flex flex-col max-h-[90vh] overflow-hidden border border-[#1b4332]/10 my-auto animate-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="flex items-start justify-between pb-3.5 border-b border-[#f1f3ff] gap-2">
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="px-2.5 py-0.5 rounded-full bg-[#c1ecd4] text-[#002114] text-[10px] font-bold">
                    {selectedAttendanceSessionDetail.halaqahName}
                  </span>
                  {selectedAttendanceSessionDetail.halaqahCode && (
                    <span className="px-1.5 py-0.2 rounded-full bg-[#f1f3ff] text-[#414844] text-[9px] font-bold">
                      {selectedAttendanceSessionDetail.halaqahCode}
                    </span>
                  )}
                  <span className="px-2 py-0.5 rounded-full bg-[#e9edff] text-[#012d1d] text-[10px] font-semibold">
                    {selectedAttendanceSessionDetail.date} • {selectedAttendanceSessionDetail.timeStr}
                  </span>
                </div>
                <h3 className="text-base sm:text-lg font-bold text-[#141b2b] mt-1.5 truncate">
                  {selectedAttendanceSessionDetail.sessionTitle}
                </h3>
                <p className="text-xs text-[#717973] flex items-center gap-1 mt-0.5">
                  <span className="material-symbols-outlined text-[14px]">location_on</span>
                  <span>{selectedAttendanceSessionDetail.location}</span>
                </p>
              </div>

              <button
                type="button"
                onClick={() => setSelectedAttendanceSessionDetail(null)}
                className="w-8 h-8 rounded-full bg-[#f1f3ff] hover:bg-[#e4e7ff] text-[#414844] flex items-center justify-center cursor-pointer transition-colors shrink-0"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto py-3 space-y-4 pr-1">
              {/* Presensi Ustadz */}
              <div className="p-3.5 rounded-2xl bg-[#f9f9ff] border border-[#1b4332]/10 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-[#717973] uppercase tracking-wider">
                    Presensi Ustadz Pembimbing
                  </span>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                      selectedAttendanceSessionDetail.ustadzStatus === 'hadir'
                        ? 'bg-[#c1ecd4] text-[#002114]'
                        : selectedAttendanceSessionDetail.ustadzStatus === 'pengganti'
                        ? 'bg-blue-100 text-blue-800'
                        : selectedAttendanceSessionDetail.ustadzStatus === 'izin'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-rose-100 text-rose-800'
                    }`}
                  >
                    {selectedAttendanceSessionDetail.ustadzStatus === 'hadir'
                      ? '✓ Hadir Membina'
                      : selectedAttendanceSessionDetail.ustadzStatus === 'pengganti'
                      ? 'Ustadz Pengganti (Badal)'
                      : selectedAttendanceSessionDetail.ustadzStatus === 'izin'
                      ? 'Izin'
                      : 'Sakit'}
                  </span>
                </div>

                <div className="flex items-center gap-2.5">
                  {selectedAttendanceSessionDetail.ustadzAvatar ? (
                    <img
                      src={selectedAttendanceSessionDetail.ustadzAvatar}
                      alt={selectedAttendanceSessionDetail.ustadzName}
                      className="w-9 h-9 rounded-full object-cover ring-2 ring-white shadow-xs"
                    />
                  ) : (
                    <div className="w-9 h-9 rounded-full bg-[#012d1d] text-[#fed488] flex items-center justify-center font-bold text-xs">
                      {selectedAttendanceSessionDetail.ustadzName[0]}
                    </div>
                  )}
                  <div>
                    <h4 className="text-xs sm:text-sm font-bold text-[#141b2b]">
                      {selectedAttendanceSessionDetail.ustadzName}
                    </h4>
                    <p className="text-[11px] text-[#717973]">
                      Pengampu Resmi {selectedAttendanceSessionDetail.halaqahName}
                    </p>
                  </div>
                </div>

                {selectedAttendanceSessionDetail.ustadzStatus === 'pengganti' && selectedAttendanceSessionDetail.ustadzPenggantiName && (
                  <div className="p-2.5 rounded-xl bg-blue-50 border border-blue-200/60 text-xs text-blue-900">
                    <span className="font-bold text-blue-800 block text-[10px] uppercase">Informasi Ustadz Pengganti:</span>
                    <div className="flex flex-col gap-0.5 mt-1">
                      <span>Nama: <strong>{selectedAttendanceSessionDetail.ustadzPenggantiName}</strong></span>
                      {selectedAttendanceSessionDetail.ustadzPenggantiKeterangan && (
                        <span>Keterangan: <span className="italic">{selectedAttendanceSessionDetail.ustadzPenggantiKeterangan}</span></span>
                      )}
                    </div>
                  </div>
                )}

                {selectedAttendanceSessionDetail.ustadzNotes && (
                  <div className="p-2.5 rounded-xl bg-white border border-[#1b4332]/5 text-xs text-[#141b2b] leading-relaxed">
                    <span className="font-bold text-[#012d1d] block text-[10px] uppercase">
                      Materi Pembahasan &amp; Catatan Sesi:
                    </span>
                    {selectedAttendanceSessionDetail.ustadzNotes}
                  </div>
                )}
              </div>

              {selectedAttendanceSessionDetail.ustadzStatus !== 'izin' && selectedAttendanceSessionDetail.ustadzStatus !== 'sakit' && (
                <>
                  {/* Attendance Breakdown Stat Strip */}
                  <div className="grid grid-cols-4 gap-2 text-center">
                    <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200/60">
                      <span className="text-[10px] font-bold text-emerald-800 uppercase block">Hadir</span>
                      <span className="text-base font-extrabold text-emerald-950">
                        {selectedAttendanceSessionDetail.presentCount}
                      </span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200/60">
                      <span className="text-[10px] font-bold text-amber-800 uppercase block">Izin</span>
                      <span className="text-base font-extrabold text-amber-950">
                        {selectedAttendanceSessionDetail.members.filter((m) => m.status === 'izin').length}
                      </span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-blue-50 border border-blue-200/60">
                      <span className="text-[10px] font-bold text-blue-800 uppercase block">Sakit</span>
                      <span className="text-base font-extrabold text-blue-950">
                        {selectedAttendanceSessionDetail.members.filter((m) => m.status === 'sakit').length}
                      </span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200/60">
                      <span className="text-[10px] font-bold text-rose-800 uppercase block">Alpa</span>
                      <span className="text-base font-extrabold text-rose-950">
                        {selectedAttendanceSessionDetail.members.filter((m) => m.status === 'alpa').length}
                      </span>
                    </div>
                  </div>

                  {/* Members Attendance Table */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-[#141b2b] uppercase tracking-wider">
                        Lembar Kehadiran Anggota ({selectedAttendanceSessionDetail.members.length} Karyawan)
                      </h4>
                      <span className="text-[11px] font-bold text-[#00452c]">
                        {selectedAttendanceSessionDetail.attendanceRate}% Kehadiran
                      </span>
                    </div>

                    <div className="space-y-1.5">
                      {selectedAttendanceSessionDetail.members.map((member, idx) => (
                        <div
                          key={member.userId || idx}
                          className="p-2.5 sm:p-3 rounded-xl bg-[#f9f9ff] hover:bg-emerald-50/30 border border-[#1b4332]/10 transition-all flex items-center justify-between gap-2.5"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span className="w-5 text-center text-xs font-bold text-[#717973] shrink-0">
                              {idx + 1}.
                            </span>
                            {member.userAvatar ? (
                              <img
                                src={member.userAvatar}
                                alt={member.userName}
                                className="w-8 h-8 rounded-full object-cover ring-1 ring-white shrink-0"
                              />
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-[#012d1d] text-[#fed488] flex items-center justify-center font-bold text-xs shrink-0">
                                {member.userName[0]}
                              </div>
                            )}
                            <div className="min-w-0">
                              <h5 className="text-xs sm:text-sm font-bold text-[#141b2b] truncate">
                                {member.userName}
                              </h5>
                              {member.notes ? (
                                <p className="text-[10px] text-[#414844] italic truncate">
                                  Catatan: {member.notes}
                                </p>
                              ) : (
                                <p className="text-[10px] text-[#717973]">
                                  Karyawan Binaan
                                </p>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            {member.status === 'hadir' && (
                              <span className="px-2 py-0.5 rounded-full bg-[#c1ecd4] text-[#002114] text-[10px] font-bold">
                                +15 XP
                              </span>
                            )}
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                                member.status === 'hadir'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : member.status === 'izin'
                                  ? 'bg-amber-100 text-amber-800'
                                  : member.status === 'sakit'
                                  ? 'bg-blue-100 text-blue-800'
                                  : 'bg-rose-100 text-rose-800'
                              }`}
                            >
                              {member.status === 'hadir'
                                ? 'Hadir'
                                : member.status === 'izin'
                                ? 'Izin'
                                : member.status === 'sakit'
                                ? 'Sakit'
                                : 'Alpa'}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Footer */}
            <div className="pt-3 border-t border-[#f1f3ff] flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => handleExportSingleSessionCSV(selectedAttendanceSessionDetail)}
                className="px-4 py-2.5 rounded-xl bg-[#f1f3ff] hover:bg-[#e4e7ff] text-[#012d1d] text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[16px]">download</span>
                <span>Unduh Sesi Ini (.xlsx)</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedAttendanceSessionDetail(null)}
                className="px-5 py-2.5 rounded-xl bg-[#012d1d] hover:bg-[#1b4332] text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Modal Konfirmasi Hapus Sesi Presensi (Dept HX) */}
      {sessionToDelete && (
        <div className="fixed inset-0 z-[60] bg-[#0c1322]/75 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl space-y-4 border border-rose-100 animate-in zoom-in-95 duration-200">
            <div className="flex flex-col items-center text-center space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center shadow-sm">
                <span className="material-symbols-outlined text-3xl">delete_forever</span>
              </div>
              <div>
                <h3 className="text-lg font-extrabold text-[#141b2b]">Hapus Sesi Presensi?</h3>
                <p className="text-xs text-[#717973] mt-1 leading-relaxed">
                  Konfirmasi penghapusan sesi <strong>&ldquo;{sessionToDelete.sessionTitle}&rdquo;</strong>. Tindakan ini akan menghapus data dari pusat database Dept HX.
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-[#f9f9ff] border border-gray-100 text-xs space-y-1.5">
              <div className="flex justify-between">
                <span className="text-[#717973]">Halaqah:</span>
                <span className="font-bold text-[#141b2b]">{sessionToDelete.halaqahName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#717973]">Ustadz:</span>
                <span className="font-bold text-[#141b2b]">{sessionToDelete.ustadzName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#717973]">Tanggal:</span>
                <span className="font-bold text-[#141b2b]">{sessionToDelete.date}</span>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setSessionToDelete(null)}
                className="flex-1 py-3 rounded-2xl bg-[#f1f3ff] hover:bg-[#e4e7ff] text-[#414844] text-xs font-bold transition-all cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => {
                  if (onDeleteAttendanceSession) onDeleteAttendanceSession(sessionToDelete.id);
                  setSessionToDelete(null);
                }}
                className="flex-1 py-3 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md transition-all active:scale-95 cursor-pointer"
              >
                Hapus Permanen
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
