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
  saveStoredStandardAmalan,
  isFiveDailyFardhuPrayer
} from '../services/amalanPaten';
import {
  setDoc,
  doc
} from 'firebase/firestore';
import { db } from '../services/firebase';
import { PremiumInitialAvatar } from './PremiumInitialAvatar';
import { pushNotification } from '../services/notificationService';
import {
  formatDirectiveRemainingTime,
  isDirectiveCurrentlyActive,
  isDirectiveExpired
} from '../services/directiveLifecycle';
import { SecuritySettingsModal } from './SecuritySettingsModal';
import { getUstadzPinsMap, addSecurityAuditLog } from '../services/securityService';
import { getUstadzTitle, formatSupervisorDisplayName } from '../services/ustadzTitle';

export interface HalaqahDetail {
  id: string;
  name: string;
  code: string;
  supervisor: string;
  schedule: string;
  location: string;
  dept?: string;
}

export const DEFAULT_BASE_HALAQAHS: HalaqahDetail[] = [];

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
    gender?: 'L' | 'P';
  }) => void;
  onDeleteSantri?: (studentId: string) => void;
  onUpdateUserHalaqah?: (studentId: string, newHalaqah: string, newHalaqahCode?: string) => void;
  onRenameHalaqahForAll?: (oldName: string, newName: string, newCode?: string) => void;
  ibadahDirectives?: IbadahDirective[];
  attendanceSessions?: HalaqahAttendanceSession[];
  onSaveAttendanceSession?: (session: HalaqahAttendanceSession) => void;
  onDeleteAttendanceSession?: (sessionId: string) => void;
  onUpdateUserPasscode?: (
    userId: string,
    newPasscode: string,
    role?: 'member' | 'admin' | 'dept-hx',
    halaqahName?: string
  ) => void;
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
  onDeleteAttendanceSession,
  onUpdateUserPasscode
}) => {
  const [reciters, setReciters] = useState<ReciterProfile[]>(ALL_RECITERS_DIRECTORY);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGroup, setSelectedGroup] = useState<string>('Semua Kelompok');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [isMultiSelect, setIsMultiSelect] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showBroadcastModal, setShowBroadcastModal] = useState(false);
  const [showSecurityModal, setShowSecurityModal] = useState(false);
  const [newReciterName, setNewReciterName] = useState('');
  const [newReciterGroup, setNewReciterGroup] = useState('');
  const [newReciterSupervisor, setNewReciterSupervisor] = useState('');
  const [newReciterRole, setNewReciterRole] = useState<'member' | 'admin'>('member');
  const [newReciterGender, setNewReciterGender] = useState<'L' | 'P'>('L');
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

  // Unified Halaqah List (Production storage)
  const [halaqahList, setHalaqahList] = useState<HalaqahDetail[]>(() => {
    try {
      const saved = localStorage.getItem('noorworship_unified_halaqahs_prod_v1');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {
      console.warn(e);
    }
    return DEFAULT_BASE_HALAQAHS;
  });

  useEffect(() => {
    try {
      localStorage.setItem('noorworship_unified_halaqahs_prod_v1', JSON.stringify(halaqahList));
    } catch (e) {
      console.warn(e);
    }
  }, [halaqahList]);

  useEffect(() => {
    const handleUpdate = () => {
      try {
        const saved = localStorage.getItem('noorworship_unified_halaqahs_prod_v1');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) {
            setHalaqahList(parsed);
          }
        }
        const savedDelH = localStorage.getItem('noorworship_deleted_halaqah_names_prod_v1');
        if (savedDelH) {
          const parsedDelH = JSON.parse(savedDelH);
          if (Array.isArray(parsedDelH)) setDeletedHalaqahNames(parsedDelH);
        }
        const savedDelS = localStorage.getItem('noorworship_deleted_student_ids_prod_v1');
        if (savedDelS) {
          const parsedDelS = JSON.parse(savedDelS);
          if (Array.isArray(parsedDelS)) setDeletedStudentIds(parsedDelS);
        }
        const savedOverrides = localStorage.getItem('noorworship_user_halaqah_overrides_prod_v1');
        if (savedOverrides) {
          const parsedOverrides = JSON.parse(savedOverrides);
          if (parsedOverrides && typeof parsedOverrides === 'object') {
            setUserHalaqahOverrides(parsedOverrides);
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
      const saved = localStorage.getItem('noorworship_deleted_halaqah_names_prod_v1');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn(e);
    }
    return [];
  });

  useEffect(() => {
    try {
      localStorage.setItem('noorworship_deleted_halaqah_names_prod_v1', JSON.stringify(deletedHalaqahNames));
    } catch (e) {
      console.warn(e);
    }
  }, [deletedHalaqahNames]);

  const [deletedStudentIds, setDeletedStudentIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('noorworship_deleted_student_ids_prod_v1');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn(e);
    }
    return [];
  });

  useEffect(() => {
    try {
      localStorage.setItem('noorworship_deleted_student_ids_prod_v1', JSON.stringify(deletedStudentIds));
    } catch (e) {
      console.warn(e);
    }
  }, [deletedStudentIds]);

  // Persistent User Halaqah Overrides (for moving or unassigning members)
  const [userHalaqahOverrides, setUserHalaqahOverrides] = useState<Record<string, string>>(() => {
    try {
      const saved = localStorage.getItem('noorworship_user_halaqah_overrides_prod_v1');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn(e);
    }
    return {};
  });

  useEffect(() => {
    try {
      localStorage.setItem('noorworship_user_halaqah_overrides_prod_v1', JSON.stringify(userHalaqahOverrides));
    } catch (e) {
      console.warn(e);
    }
  }, [userHalaqahOverrides]);

  // Self-heal: if a halaqah is present in halaqahList (e.g. newly imported or created),
  // automatically remove it from deletedHalaqahNames and clear stale 'Tanpa Halaqah' overrides
  useEffect(() => {
    if (!halaqahList || halaqahList.length === 0) return;
    const activeLowerNames = new Set(
      halaqahList
        .filter((h) => h && h.name)
        .map((h) => h.name.trim().toLowerCase())
    );

    setDeletedHalaqahNames((prev) => {
      if (!prev.some((d) => activeLowerNames.has(d.trim().toLowerCase()))) return prev;
      const cleaned = prev.filter((d) => !activeLowerNames.has(d.trim().toLowerCase()));
      try {
        localStorage.setItem('noorworship_deleted_halaqah_names_prod_v1', JSON.stringify(cleaned));
      } catch {}
      return cleaned;
    });

    if (registeredUsers && registeredUsers.length > 0) {
      setUserHalaqahOverrides((prev) => {
        let changed = false;
        const next = { ...prev };
        registeredUsers.forEach((u) => {
          if (
            u.halaqah &&
            activeLowerNames.has(u.halaqah.trim().toLowerCase()) &&
            next[u.id] === 'Tanpa Halaqah'
          ) {
            delete next[u.id];
            changed = true;
          }
        });
        if (changed) {
          try {
            localStorage.setItem('noorworship_user_halaqah_overrides_prod_v1', JSON.stringify(next));
          } catch {}
          return next;
        }
        return prev;
      });
    }
  }, [halaqahList, registeredUsers]);

  const isHalaqahDeleted = (name?: string) => {
    if (!name) return false;
    const clean = name.trim().toLowerCase();
    // If the halaqah currently exists in halaqahList, it is active (not deleted)
    if (halaqahList.some((h) => h?.name && h.name.trim().toLowerCase() === clean)) {
      return false;
    }
    return deletedHalaqahNames.some((d) => d.trim().toLowerCase() === clean);
  };

  // Active presets filtered by deleted list and deduplicated by name with guaranteed id
  const allHalaqahPresets = useMemo(() => {
    const seen = new Set<string>();
    const result: typeof halaqahList = [];
    halaqahList.forEach((h, idx) => {
      if (!h?.name || isHalaqahDeleted(h.name)) return;
      const key = h.name.trim().toLowerCase();
      if (seen.has(key)) return;
      seen.add(key);
      result.push({
        ...h,
        id: h.id || `halaqah-${idx}-${key}`
      });
    });
    return result;
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
    setEditHalaqahSupervisor(preset?.supervisor || 'Ustadz/ah Pembimbing');
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

    const batchId = `global-broadcast-${Date.now()}`;

    // Always push a global notification so every user (even newly logged in) sees it
    await pushNotification({
      isGlobal: true,
      senderName: 'Dept HX Pusat',
      title: 'Maklumat Pusat Dept HX',
      message: text,
      type: 'broadcast',
      batchId,
    });

    // Also push individual notifications to registered users
    for (const user of registeredUsers || []) {
      await pushNotification({
        targetUserId: user.id,
        recipientName: user.name,
        isGlobal: true,
        senderName: 'Dept HX Pusat',
        title: 'Maklumat Pusat Dept HX',
        message: text,
        type: 'broadcast',
        batchId,
      });
    }

    onShowToast(
      `📢 Maklumat berhasil disiarkan ke seluruh ustadz/ah & karyawan (${registeredUsers?.length || 1} pengguna)!`
    );
    setGlobalBroadcastText('');
    setShowBroadcastModal(false);
  };

  const handleBroadcastToHalaqah = async (groupName: string) => {
    const text = broadcastHalaqahText.trim();
    if (!text) {
      onShowToast('Mohon tuliskan pesan maklumat');
      return;
    }

    const batchId = `halaqah-broadcast-${Date.now()}`;

    // Push a halaqah-wide notification
    await pushNotification({
      targetHalaqah: groupName,
      senderName: 'Departemen HX (Human Experience)',
      title: `Maklumat Khusus: ${groupName}`,
      message: text,
      type: 'broadcast',
      batchId,
    });

    // Find members of this halaqah
    const targetUsers = (registeredUsers || []).filter((u) => u.halaqah === groupName);

    for (const user of targetUsers) {
      await pushNotification({
        targetUserId: user.id,
        recipientName: user.name,
        targetHalaqah: groupName,
        senderName: 'Departemen HX (Human Experience)',
        title: `Maklumat Khusus: ${groupName}`,
        message: text,
        type: 'broadcast',
        batchId,
      });
    }

    setBroadcastHalaqahText('');
    onShowToast(`📢 Maklumat berhasil disiarkan khusus kepada seluruh anggota ${groupName}!`);
  };

  const normalizePersonNameKey = (name?: string, role?: string): string => {
    const raw = (name || '').trim().replace(/\s+/g, ' ').toLowerCase();
    if (!raw) return '';
    if (role === 'admin') {
      const stripped = raw.replace(/^(ustadz\/ah|ustadzah|ustadz|ust\.?)\s+/i, '').trim();
      return stripped || raw;
    }
    return raw;
  };

  const handleSaveNewHalaqah = () => {
    const nameTrimmed = newHalaqahName.trim().replace(/\s+/g, ' ');
    if (!nameTrimmed) {
      onShowToast('Mohon masukkan nama halaqah baru');
      return;
    }

    const duplicateHalaqah = allHalaqahPresets.find(
      (h) => h.name.trim().replace(/\s+/g, ' ').toLowerCase() === nameTrimmed.toLowerCase()
    );
    if (duplicateHalaqah) {
      onShowToast(
        `❌ Halaqah "${duplicateHalaqah.name}" sudah terdaftar! Nama halaqah yang sama tidak dapat diinput dua kali.`
      );
      return;
    }

    const codeFinal = newHalaqahCode.trim() || `HX-${Math.floor(1000 + Math.random() * 9000)}`;
    const supervisorFinal = newHalaqahSupervisor.trim() || 'Ustadz/ah Pembimbing (Dept HX)';

    const newHalaqahItem: HalaqahDetail = {
      id: `halaqah-${Date.now()}`,
      name: nameTrimmed,
      code: codeFinal,
      supervisor: supervisorFinal,
      schedule: newHalaqahSchedule.trim() || 'Ba’da Subuh (05:30 WIB)',
      location: newHalaqahLocation.trim() || 'Masjid Al-Ikhlas',
      dept: newHalaqahDept.trim() || 'Dept HX'
    };

    // If this halaqah name was previously deleted, remove it from deletedHalaqahNames
    setDeletedHalaqahNames((prev) =>
      prev.filter((d) => d.trim().toLowerCase() !== nameTrimmed.toLowerCase())
    );
    setHalaqahList((prev) => [
      newHalaqahItem,
      ...prev.filter((h) => h.name.trim().toLowerCase() !== nameTrimmed.toLowerCase())
    ]);
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
    const name = deletingHalaqahTarget.trim();
    const targetLower = name.toLowerCase();

    // 1. Remove from halaqahList & persist immediately
    setHalaqahList((prev) => {
      const updated = prev.filter((h) => h.name.trim().toLowerCase() !== targetLower);
      try {
        localStorage.setItem('noorworship_unified_halaqahs_prod_v1', JSON.stringify(updated));
      } catch {}
      return updated;
    });

    // 2. Track in deletedHalaqahNames & persist immediately
    setDeletedHalaqahNames((prev) => {
      const next = prev.some((d) => d.trim().toLowerCase() === targetLower) ? prev : [...prev, name];
      try {
        localStorage.setItem('noorworship_deleted_halaqah_names_prod_v1', JSON.stringify(next));
      } catch {}
      return next;
    });

    // 3. Move any member or ustadz in this halaqah to 'Tanpa Halaqah' so it isn't recreated
    setUserHalaqahOverrides((prev) => {
      const next = { ...prev };
      Object.keys(next).forEach((uid) => {
        if (next[uid] && next[uid].trim().toLowerCase() === targetLower) {
          next[uid] = 'Tanpa Halaqah';
        }
      });
      if (registeredUsers) {
        registeredUsers.forEach((u) => {
          if (u.halaqah && u.halaqah.trim().toLowerCase() === targetLower) {
            next[u.id] = 'Tanpa Halaqah';
          }
        });
      }
      return next;
    });

    setReciters((prev) =>
      prev.map((r) =>
        r.group && r.group.trim().toLowerCase() === targetLower
          ? { ...r, group: 'Tanpa Halaqah' }
          : r
      )
    );

    // 4. Update registeredUsers & Firestore in App.tsx
    if (onRenameHalaqahForAll) {
      onRenameHalaqahForAll(name, 'Tanpa Halaqah', '-');
    }

    // 5. Remove custom Ustadz PIN entry for this halaqah if present
    try {
      const pinsMap = getUstadzPinsMap();
      Object.keys(pinsMap).forEach((k) => {
        if (k.trim().toLowerCase() === targetLower) {
          delete pinsMap[k];
        }
      });
      localStorage.setItem('noorworship_ustadz_pins_prod_v1', JSON.stringify(pinsMap));
    } catch {}

    window.dispatchEvent(new Event('noorworship_halaqah_updated'));

    if (selectedHalaqahGroup && selectedHalaqahGroup.trim().toLowerCase() === targetLower) {
      setSelectedHalaqahGroup(null);
    }
    if (selectedGroup && selectedGroup.trim().toLowerCase() === targetLower) {
      setSelectedGroup('Semua Kelompok');
    }
    setDeletingHalaqahTarget(null);
    onShowToast(`Halaqah "${name}" berhasil dihapus oleh Departemen HX (Human Experience).`);
  };

  const handleDeleteStudent = (student: { id: string; name: string }) => {
    setDeletingStudentTarget(student);
  };

  const confirmDeleteStudent = () => {
    if (!deletingStudentTarget) return;
    const student = deletingStudentTarget;
    setReciters((prev) => prev.filter((r) => r.id !== student.id && r.name !== student.name));
    setDeletedStudentIds((prev) => [...prev, student.id]);
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
    const trimmed = quickAddName.trim().replace(/\s+/g, ' ');
    if (!trimmed) {
      onShowToast('Mohon masukkan nama karyawan');
      return;
    }

    const normalizedTarget = normalizePersonNameKey(trimmed, 'member');
    const existingPerson = allStudentsList.find(
      (s: any) => normalizePersonNameKey(s.name, s.role) === normalizedTarget
    ) || allRecitersList.find(
      (r: any) => normalizePersonNameKey(r.name, 'member') === normalizedTarget
    );

    if (existingPerson) {
      const currentGroup = existingPerson.halaqah || existingPerson.group || 'Tanpa Halaqah';
      if (currentGroup && currentGroup !== 'Tanpa Halaqah' && currentGroup !== 'Belum Ada Halaqah') {
        onShowToast(
          `❌ Nama "${existingPerson.name}" sudah terdaftar di "${currentGroup}". Nama yang sama tidak dapat diinput dua kali!`
        );
        return;
      }
      // If the employee already exists in 'Tanpa Halaqah', assign them instead of creating a duplicate
      handleAddExistingStudentToHalaqah(existingPerson, targetHalaqah, targetCode);
      setQuickAddName('');
      setHalaqahActiveTab('members');
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
    } else {
      const newEntry: ReciterProfile = {
        id: `reciter-${Date.now()}`,
        name: trimmed,
        group: targetHalaqah,
        supervisor: supervisorName,
        avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCPpztXYvKG0hnmCFJGCCU0xwy2MPvneIXXKJ1BW4Rtejtyzgr02Vo9Su5UxcVuZz3-GF8hPwRY0_1vZl5PVdpW10j8rqRMIipsU_h8mEvEcJShkcDH86v76LYWTlWzju8eCZDjvFPYoqOVoLWKjpOXfZWK3-4DbGikcXmtwS-5rGtyiOB3ejK_8RqWALFKRcTWhwJTWUpwoH36hhTTWYZyTPHbKBimBp0b-0er8SFXjKlDEMOCN2_0Qg',
        status: 'Jayyid Jiddan',
        tajweedAcc: 0,
        streakDays: 0,
        totalXp: '0',
        currentActivity: `Anggota ${targetHalaqah}`,
        lastActive: 'Baru didaftarkan'
      };
      setReciters((prev) => [newEntry, ...prev]);
    }

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
    const supervisorTrimmed = editHalaqahSupervisor.trim() || 'Ustadz/ah Pembimbing';
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
    const headers = ['No', 'ID Karyawan', 'Nama Karyawan', 'Halaqah', 'Ustadz/ah Pembimbing', 'Streak Hari', 'Total XP', 'Akurasi Tajwid'];
    const rows = group.members.map((m: any, idx: number) => [
      idx + 1,
      m.id,
      m.name,
      group.halaqahName,
      group.supervisor,
      `${m.streakDays ?? 0} hari`,
      m.totalXp ?? 0,
      `${m.tajweedAcc ?? 0}%`
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
  const [selectedDirectiveDetail, setSelectedDirectiveDetail] = useState<IbadahDirective | null>(null);

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
      'Ustadz/ah Pembimbing',
      'Status Kehadiran Ustadz/ah',
      'Materi / Catatan Ustadz/ah',
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
            session.ustadzStatus === 'hadir' ? 'Hadir Membina' : session.ustadzStatus === 'pengganti' ? `${getUstadzTitle(session.ustadzPenggantiName)} Pengganti` : session.ustadzStatus,
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

    const filename = `JejakTaqwa_Rekap_Presensi_DeptHX_${new Date().toISOString().slice(0, 10)}`;
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
  const [formPatenPenalty, setFormPatenPenalty] = useState(25);
  const [formPatenActive, setFormPatenActive] = useState(true);

  // Open Edit Modal for Paten Amalan
  const handleOpenEditPaten = (item: StandardAmalanHX) => {
    const isFardhu5 = isFiveDailyFardhuPrayer(item);
    setEditingPaten(item);
    setFormPatenTitle(item.title);
    setFormPatenCategory(item.category);
    setFormPatenBaseXp(item.baseXp);
    setFormPatenHasJamaah(isFardhu5);
    setFormPatenJamaahBonus(isFardhu5 ? (item.jamaahBonusXp || 5) : 0);
    setFormPatenTimeWindow(item.timeWindowDescription || '');
    setFormPatenNote(item.note || '');
    setFormPatenPenalty(item.penaltyLateXp || 25);
    setFormPatenActive(item.isActive);
  };

  const handleSaveEditPaten = () => {
    if (!editingPaten) return;
    const titleTrim = formPatenTitle.trim() || editingPaten.title;
    const isFardhu5 = isFiveDailyFardhuPrayer({ ...editingPaten, title: titleTrim });
    const updated = standardAmalanList.map((item) => {
      if (item.id === editingPaten.id) {
        return {
          ...item,
          title: titleTrim,
          category: formPatenCategory,
          baseXp: formPatenBaseXp,
          hasJamaahOption: isFardhu5,
          jamaahBonusXp: isFardhu5 ? formPatenJamaahBonus : undefined,
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

    const isFardhu5 = isFiveDailyFardhuPrayer({ title: titleTrim });
    const newItem: StandardAmalanHX = {
      id: `paten-custom-${Date.now()}`,
      title: titleTrim,
      category: formPatenCategory,
      baseXp: formPatenBaseXp,
      hasJamaahOption: isFardhu5,
      jamaahBonusXp: isFardhu5 ? formPatenJamaahBonus : undefined,
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
    const byNameRole = new Map<string, any>();
    if (registeredUsers) {
      registeredUsers.forEach((u) => {
        if (u.role === 'dept-hx' || u.role === 'hq-admin') return;
        if (!deletedStudentIds.includes(u.id)) {
          const rawHalaqah =
            userHalaqahOverrides[u.id] !== undefined
              ? userHalaqahOverrides[u.id]
              : u.halaqah || 'Tanpa Halaqah';
          const assignedHalaqah = isHalaqahDeleted(rawHalaqah) ? 'Tanpa Halaqah' : rawHalaqah;
          const candidate = {
            id: u.id,
            name: u.name,
            avatar: u.avatar,
            halaqah: assignedHalaqah,
            totalXp: u.totalXp || 0,
            streakDays: u.streakDays || 0,
            tajweedAcc: 0,
            role: u.role,
            supervisor: formatSupervisorDisplayName(u.supervisor),
            phone: u.phone || ''
          };
          const key = `${u.role}:${normalizePersonNameKey(u.name, u.role)}`;
          const existing = byNameRole.get(key);
          if (!existing) {
            byNameRole.set(key, candidate);
          } else {
            // Prefer the record assigned to an active halaqah over 'Tanpa Halaqah'
            const existingHasHalaqah =
              existing.halaqah &&
              existing.halaqah !== 'Tanpa Halaqah' &&
              existing.halaqah !== 'Belum Ada Halaqah';
            const candidateHasHalaqah =
              candidate.halaqah &&
              candidate.halaqah !== 'Tanpa Halaqah' &&
              candidate.halaqah !== 'Belum Ada Halaqah';
            if (candidateHasHalaqah && !existingHasHalaqah) {
              byNameRole.set(key, candidate);
            }
          }
        }
      });
    }
    return Array.from(byNameRole.values());
  }, [registeredUsers, deletedStudentIds, userHalaqahOverrides, deletedHalaqahNames, halaqahList]);

  const halaqahGroups = useMemo(() => {
    const groupsMap: Record<string, any[]> = {};

    // Pre-populate with all presets so empty new halaqahs are also visible
    allHalaqahPresets.forEach((preset) => {
      if (!groupsMap[preset.name]) groupsMap[preset.name] = [];
    });

    allStudentsList.forEach((st: any) => {
      const h = st.halaqah;
      if (
        !h ||
        h === 'Dept HX Pusat' ||
        h === 'Tanpa Halaqah' ||
        h === 'Belum Ada Halaqah' ||
        isHalaqahDeleted(h)
      ) {
        return;
      }
      if (!groupsMap[h]) groupsMap[h] = [];
      if (st.role === 'member') {
        groupsMap[h].push(st);
      }
    });

    return Object.entries(groupsMap).map(([halaqahName, members]) => {
      const matchedPreset = allHalaqahPresets.find((p) => p.name === halaqahName);
      const ustadzInGroup = allStudentsList.find(
        (st: any) => st.role === 'admin' && st.halaqah === halaqahName
      );
      return {
        halaqahName,
        members,
        code: matchedPreset?.code || 'HX-001',
        supervisor: formatSupervisorDisplayName(
          matchedPreset?.supervisor ||
          ustadzInGroup?.name ||
          members[0]?.supervisor ||
          'Ustadz/ah Pembimbing'
        ),
        schedule: matchedPreset?.schedule || 'Jadwal Reguler Dept HX',
        location: matchedPreset?.location || 'Masjid Al-Ikhlas',
        avgTajweed: 0,
        compliance: 0
      };
    });
  }, [allStudentsList, allHalaqahPresets, deletedHalaqahNames]);

  const allRecitersList = useMemo(() => {
    // Build directly from allStudentsList so "List Karyawan" is 100% synchronized with "Kelompok Halaqah"
    const fromStudents: ReciterProfile[] = allStudentsList.map((st: any) => {
      const assignedHalaqah = st.halaqah || 'Tanpa Halaqah';
      const matchedPreset = allHalaqahPresets.find(
        (p) => p.name.trim().toLowerCase() === assignedHalaqah.trim().toLowerCase()
      );
      const code = matchedPreset?.code || 'HX-001';
      return {
        id: st.id,
        name: st.name,
        group: assignedHalaqah,
        supervisor:
          st.role === 'admin'
            ? `${getUstadzTitle(st)} Pembimbing`
            : formatSupervisorDisplayName(matchedPreset?.supervisor || st.supervisor),
        avatar: st.avatar,
        status: ((st.totalXp || 0) >= 500 ? 'Mumtaz' : 'Jayyid Jiddan') as any,
        tajweedAcc: st.tajweedAcc || 0,
        streakDays: st.streakDays || 0,
        totalXp: (st.totalXp || 0).toLocaleString(),
        currentActivity:
          st.role === 'admin'
            ? `${getUstadzTitle(st)} Pembimbing ${assignedHalaqah} (${code})`
            : `Anggota ${assignedHalaqah} (Kode: ${code})`,
        lastActive: 'Terdaftar'
      };
    });

    const existingNames = new Set(fromStudents.map((r) => r.name.trim().toLowerCase()));
    const existingIds = new Set(fromStudents.map((r) => r.id));

    const extraFromReciters = reciters
      .filter(
        (r) =>
          r.id &&
          !existingIds.has(r.id) &&
          !existingNames.has(r.name.trim().toLowerCase()) &&
          !deletedStudentIds.includes(r.id)
      )
      .map((r) => {
        const rawGroup =
          userHalaqahOverrides[r.id] !== undefined ? userHalaqahOverrides[r.id] : r.group;
        const assignedGroup = isHalaqahDeleted(rawGroup) ? 'Tanpa Halaqah' : rawGroup;
        return {
          ...r,
          group: assignedGroup
        };
      });

    return [...fromStudents, ...extraFromReciters];
  }, [allStudentsList, allHalaqahPresets, reciters, deletedStudentIds, userHalaqahOverrides, deletedHalaqahNames, halaqahList]);

  const groups = useMemo(() => {
    const base = [{ label: 'Semua Kelompok', count: String(allRecitersList.length) }];
    halaqahGroups.forEach((g) => {
      const countInReciters = allRecitersList.filter(
        (r) => r.group.trim().toLowerCase() === g.halaqahName.trim().toLowerCase()
      ).length;
      base.push({
        label: g.halaqahName,
        count: String(countInReciters)
      });
    });
    const unassignedCount = allRecitersList.filter(
      (r) => !r.group || r.group === 'Tanpa Halaqah' || r.group === 'Belum Ada Halaqah'
    ).length;
    if (unassignedCount > 0) {
      base.push({
        label: 'Tanpa Halaqah',
        count: String(unassignedCount)
      });
    }
    return base;
  }, [allRecitersList, halaqahGroups]);

  // Automatically reset selectedGroup to 'Semua Kelompok' if the selected filter chip no longer exists
  useEffect(() => {
    if (
      selectedGroup !== 'Semua Kelompok' &&
      !groups.some((g) => g.label.toLowerCase() === selectedGroup.toLowerCase())
    ) {
      setSelectedGroup('Semua Kelompok');
    }
  }, [groups, selectedGroup]);

  const filteredReciters = useMemo(() => {
    const hasActiveGroupFilter =
      selectedGroup !== 'Semua Kelompok' &&
      selectedGroup !== 'Semua Halaqah' &&
      groups.some((g) => g.label.toLowerCase() === selectedGroup.toLowerCase());

    return allRecitersList.filter((item) => {
      // Group filter
      if (hasActiveGroupFilter) {
        if (item.group.trim().toLowerCase() !== selectedGroup.trim().toLowerCase()) {
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
  }, [allRecitersList, selectedGroup, selectedStatus, searchQuery, groups]);

  const handleExportCSV = () => {
    const headers = [
      'No',
      'Nama Karyawan',
      'Kelompok Halaqah',
      'Ustadz/ah Pembimbing',
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
    const filename = `JejakTaqwa_Rekap_Karyawan_${new Date().toISOString().slice(0, 10)}`;
    downloadPerColumnCSV(filename, headers, rows);
    onShowToast('File Excel Sheet (.xlsx) berhasil diunduh (terformat rapi per kolom A, B, C...)');
  };

  const handleAddReciter = () => {
    const cleanInputName = newReciterName.trim().replace(/\s+/g, ' ');
    if (!cleanInputName) {
      onShowToast('Mohon masukkan nama lengkap');
      return;
    }

    const groupName = (newReciterGroup || allHalaqahPresets[0]?.name || '').trim().replace(/\s+/g, ' ');
    if (!groupName) {
      onShowToast('Mohon pilih atau ketik nama Kelompok Halaqah terlebih dahulu');
      return;
    }

    let selectedPreset = allHalaqahPresets.find(
      (h) => h.name.toLowerCase() === groupName.toLowerCase()
    );

    const finalReciterName =
      newReciterRole === 'admin'
        ? formatSupervisorDisplayName(cleanInputName, newReciterGender)
        : cleanInputName;

    // Prevent duplicate name registration
    const targetPersonKey = normalizePersonNameKey(finalReciterName, newReciterRole);
    const duplicateUser = allStudentsList.find(
      (st: any) =>
        st.role === newReciterRole &&
        normalizePersonNameKey(st.name, st.role) === targetPersonKey
    );

    if (duplicateUser) {
      const hasActiveGroup =
        duplicateUser.halaqah &&
        duplicateUser.halaqah !== 'Tanpa Halaqah' &&
        duplicateUser.halaqah !== 'Belum Ada Halaqah';
      if (hasActiveGroup) {
        onShowToast(
          `❌ Nama "${duplicateUser.name}" sudah terdaftar di "${duplicateUser.halaqah}". Nama yang sama tidak dapat diinput dua kali!`
        );
        return;
      }
    }

    if (!selectedPreset) {
      const autoCode = `HX-${Math.floor(1000 + Math.random() * 9000)}`;
      const supName =
        newReciterRole === 'admin'
          ? finalReciterName
          : newReciterSupervisor.trim() || 'Ustadz/ah Pembimbing';
      const createdHalaqah: HalaqahDetail = {
        id: `halaqah-${Date.now()}`,
        name: groupName,
        code: autoCode,
        supervisor: supName,
        schedule: 'Ba’da Subuh (05:30 WIB)',
        location: 'Masjid Al-Ikhlas',
        dept: 'Dept HX'
      };
      setDeletedHalaqahNames((prev) =>
        prev.filter((d) => d.trim().toLowerCase() !== groupName.toLowerCase())
      );
      setHalaqahList((prev) => [
        createdHalaqah,
        ...prev.filter((h) => h.name.trim().toLowerCase() !== groupName.toLowerCase())
      ]);
      selectedPreset = createdHalaqah;
    }

    const finalPasscode = newReciterPasscode.trim() || '1234';

    if (newReciterRole === 'admin') {
      try {
        const pinsMap = getUstadzPinsMap();
        pinsMap[selectedPreset.name] = finalPasscode;
        localStorage.setItem('noorworship_ustadz_pins_prod_v1', JSON.stringify(pinsMap));
        addSecurityAuditLog(
          'Departemen HX (Human Experience)',
          `Menetapkan PIN Supervisor ${getUstadzTitle(finalReciterName, newReciterGender)} Baru (${finalReciterName})`,
          selectedPreset.name
        );
      } catch {}
    }

    if (onRegisterSantri) {
      onRegisterSantri({
        name: finalReciterName,
        halaqah: selectedPreset.name,
        halaqahCode: selectedPreset.code,
        passcode: finalPasscode,
        phone: newReciterPhone.trim(),
        role: newReciterRole,
        gender: newReciterRole === 'admin' ? newReciterGender : undefined
      });
    }

    setShowAddModal(false);
    setNewReciterName('');
    setNewReciterPhone('');
    onShowToast(
      `${newReciterRole === 'admin' ? `${getUstadzTitle(finalReciterName, newReciterGender)} Pembimbing` : 'Karyawan'} "${finalReciterName}" resmi didaftarkan ke ${selectedPreset.name}!`
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
      <section className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center flex-wrap gap-1.5 sm:gap-2 min-w-0">
          <span className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-full bg-[#1b4332] text-white text-[11px] sm:text-xs font-bold shadow-sm whitespace-nowrap">
            <span
              className="material-symbols-outlined text-[14px] sm:text-[15px] text-[#92f7c3] shrink-0"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              admin_panel_settings
            </span>
            Pusat Kendali Dept HX
          </span>
          <div className="flex items-center gap-1.5 text-[11px] sm:text-xs text-[#414844] font-medium whitespace-nowrap">
            <span className="w-2 h-2 rounded-full bg-[#00452c] animate-pulse shrink-0" />
            Sinkronisasi Langsung
          </div>
        </div>
      </section>

      {/* KPI Metric Bento Grid */}
      <section className="grid grid-cols-2 gap-2 sm:gap-2.5">
        {/* Total Users */}
        <div className="bg-white p-3 sm:p-3.5 rounded-2xl shadow-sm border border-[#1b4332]/5 flex flex-col justify-between min-w-0 overflow-hidden select-none">
          <div className="flex items-start sm:items-center justify-between gap-1.5 mb-1.5 sm:mb-1">
            <span className="text-[11px] sm:text-xs text-[#414844] font-medium leading-tight min-w-0">
              Total Karyawan Terdaftar
            </span>
            <span className="w-6 h-6 sm:w-7 sm:h-7 rounded-xl bg-[#e9edff] flex items-center justify-center text-[#012d1d] shrink-0">
              <span className="material-symbols-outlined text-[15px] sm:text-[16px]">groups</span>
            </span>
          </div>
          <div className="flex items-baseline flex-wrap gap-x-1.5 gap-y-0.5">
            <span className="text-xl sm:text-2xl font-bold text-[#012d1d] leading-none tabular-nums">
              {allStudentsList.filter((s: any) => s.role === 'member').length}
            </span>
            <span className="text-[11px] sm:text-xs text-[#00452c] font-bold whitespace-nowrap">
              Karyawan Resmi
            </span>
          </div>
          <div className="flex items-center justify-between gap-1 mt-1">
            <span className="text-[10px] sm:text-[11px] text-[#414844] truncate">
              Di {halaqahGroups.length} Lingkaran Halaqah
            </span>
          </div>
        </div>

        {/* Active Today / Ustadz Count */}
        <div className="bg-white p-3 sm:p-3.5 rounded-2xl shadow-sm border border-[#1b4332]/5 flex flex-col justify-between min-w-0 overflow-hidden select-none">
          <div className="flex items-start sm:items-center justify-between gap-1.5 mb-1.5 sm:mb-1">
            <span className="text-[11px] sm:text-xs text-[#414844] font-medium leading-tight min-w-0">
              Halaqah &amp; Pembimbing
            </span>
            <span className="w-6 h-6 sm:w-7 sm:h-7 rounded-xl bg-[#c1ecd4]/60 flex items-center justify-center text-[#1b4332] shrink-0">
              <span className="material-symbols-outlined text-[15px] sm:text-[16px]">shield_person</span>
            </span>
          </div>
          <div className="flex items-baseline flex-wrap gap-x-1.5 gap-y-0.5">
            <span className="text-xl sm:text-2xl font-bold text-[#012d1d] leading-none tabular-nums">
              {halaqahGroups.length}
            </span>
            <span className="text-[11px] sm:text-xs text-[#414844] font-semibold whitespace-nowrap">
              Kelompok Aktif
            </span>
          </div>
          <div className="flex items-center justify-between gap-1 mt-1">
            <span className="text-[10px] sm:text-[11px] text-[#414844] truncate">
              {activeAttendanceSessions.length} sesi presensi tercatat
            </span>
          </div>
        </div>
      </section>

      {/* Governance & Quick Actions Bar */}
      <section className="flex flex-col sm:flex-row sm:items-center gap-2 w-full">
        <button
          onClick={() => {
            if (!newReciterGroup && allHalaqahPresets.length > 0) {
              setNewReciterGroup(allHalaqahPresets[0].name);
            }
            setShowAddModal(true);
          }}
          className="w-full sm:flex-1 h-11 px-4 bg-[#012d1d] hover:bg-[#1b4332] text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-md active:scale-[0.98] transition-all cursor-pointer whitespace-nowrap"
        >
          <span className="material-symbols-outlined text-[18px] shrink-0">person_add</span>
          <span className="truncate">Daftar Karyawan / Ustadz/ah</span>
        </button>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          {onOpenSheets && (
            <button
              onClick={onOpenSheets}
              className="flex-1 sm:flex-initial min-w-0 h-11 px-3.5 bg-white hover:bg-[#e9fbf2] text-[#00452c] rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm border border-[#00452c]/20 transition-colors cursor-pointer whitespace-nowrap"
              title="Kelola Data via Spreadsheet Excel (.xlsx) lokal tanpa biaya API"
            >
              <span className="material-symbols-outlined text-[18px] text-[#00452c] shrink-0">
                table_chart
              </span>
              <span className="truncate">Kelola Sheet (.xlsx)</span>
              <span className="px-1.5 py-0.2 rounded-full bg-[#c1ecd4] text-[#002114] text-[9px] font-bold shrink-0">
                Free
              </span>
            </button>
          )}

          <button
            onClick={() => setShowSecurityModal(true)}
            title="Brankas Keamanan: Atur & Ganti Password Dept HX, PIN Ustadz/ah & Karyawan"
            className="flex-1 sm:flex-initial min-w-0 h-11 px-3.5 bg-white hover:bg-[#fff8ef] text-[#775a19] rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm border border-[#fed488] transition-colors cursor-pointer whitespace-nowrap"
          >
            <span className="material-symbols-outlined text-[18px] text-[#775a19] shrink-0">
              shield_lock
            </span>
            <span className="truncate">Kelola PIN &amp; Password</span>
          </button>

          <button
            onClick={() => setShowBroadcastModal(true)}
            aria-label="Kirim maklumat ke semua Halaqah"
            title="Siaran / Kirim Maklumat"
            className="h-11 w-11 bg-white hover:bg-[#f1f3ff] text-[#012d1d] rounded-xl flex items-center justify-center shadow-sm border border-[#1b4332]/5 transition-colors shrink-0 cursor-pointer"
          >
            <span className="material-symbols-outlined text-[20px]">campaign</span>
          </button>
        </div>
      </section>

      {/* Dept HX View Mode Selector */}
      <div className="flex items-center gap-1.5 p-1 bg-white rounded-2xl shadow-xs border border-[#1b4332]/10 overflow-x-auto no-scrollbar scroll-smooth">
        <button
          onClick={() => { setDeptHxTab('halaqah'); setSelectedHalaqahGroup(null); }}
          className={`shrink-0 md:flex-1 py-2 px-3 sm:px-3.5 rounded-xl text-[11px] sm:text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer min-h-[44px] active:scale-95 whitespace-nowrap ${
            deptHxTab === 'halaqah'
              ? 'bg-[#012d1d] text-white shadow-xs'
              : 'text-[#414844] hover:bg-[#f1f3ff]'
          }`}
        >
          <span className="material-symbols-outlined text-[18px]">groups</span>
          <span>Lihat Halaqah</span>
        </button>
        <button
          onClick={() => { setDeptHxTab('students'); setSelectedHalaqahGroup(null); }}
          className={`shrink-0 md:flex-1 py-2 px-3 sm:px-3.5 rounded-xl text-[11px] sm:text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer min-h-[44px] active:scale-95 whitespace-nowrap ${
            deptHxTab === 'students'
              ? 'bg-[#012d1d] text-white shadow-xs'
              : 'text-[#414844] hover:bg-[#f1f3ff]'
          }`}
        >
          <span className="material-symbols-outlined text-[18px]">badge</span>
          <span>List Karyawan</span>
        </button>
        <button
          onClick={() => { setDeptHxTab('amalan-paten'); setSelectedHalaqahGroup(null); }}
          className={`shrink-0 md:flex-1 py-2 px-3 sm:px-3.5 rounded-xl text-[11px] sm:text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer min-h-[44px] active:scale-95 whitespace-nowrap ${
            deptHxTab === 'amalan-paten'
              ? 'bg-[#012d1d] text-white shadow-xs'
              : 'text-[#414844] hover:bg-[#f1f3ff]'
          }`}
        >
          <span className="material-symbols-outlined text-[18px] text-[#fed488]">checklist_rtl</span>
          <span>Amalan Pasti</span>
          <span className="px-1.5 py-0.2 rounded-full bg-[#fed488] text-[#261900] text-[9px] font-bold">
            11
          </span>
        </button>
        <button
          onClick={() => { setDeptHxTab('presensi'); setSelectedHalaqahGroup(null); }}
          className={`shrink-0 md:flex-1 py-2 px-3 sm:px-3.5 rounded-xl text-[11px] sm:text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer min-h-[44px] active:scale-95 whitespace-nowrap ${
            deptHxTab === 'presensi'
              ? 'bg-[#012d1d] text-white shadow-xs'
              : 'text-[#414844] hover:bg-[#f1f3ff]'
          }`}
        >
          <span className="material-symbols-outlined text-[18px] text-[#92f7c3]">how_to_reg</span>
          <span>Rekap Presensi</span>
          {activeAttendanceSessions.length > 0 && (
            <span className="px-1.5 py-0.2 rounded-full bg-[#c1ecd4] text-[#002114] text-[9px] font-bold">
              {activeAttendanceSessions.length}
            </span>
          )}
        </button>
        <button
          onClick={() => { setDeptHxTab('tugas-ustadz'); setSelectedHalaqahGroup(null); }}
          className={`shrink-0 md:flex-1 py-2 px-3 sm:px-3.5 rounded-xl text-[11px] sm:text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer min-h-[44px] active:scale-95 whitespace-nowrap ${
            deptHxTab === 'tugas-ustadz'
              ? 'bg-[#012d1d] text-white shadow-xs'
              : 'text-[#414844] hover:bg-[#f1f3ff]'
          }`}
        >
          <span className="material-symbols-outlined text-[18px]">assignment_turned_in</span>
          <span>Tugas Ustadz/ah</span>
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

            {halaqahGroups.length === 0 ? (
              <div className="p-8 rounded-2xl bg-[#f9f9ff] border border-dashed border-[#1b4332]/20 text-center space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-[#e9edff] text-[#012d1d] flex items-center justify-center mx-auto">
                  <span className="material-symbols-outlined text-[26px]">group_add</span>
                </div>
                <div>
                  <h4 className="text-sm font-bold text-[#141b2b]">Belum Ada Lingkaran Halaqah Terdaftar</h4>
                  <p className="text-xs text-[#414844] max-w-md mx-auto mt-1">
                    Data uji coba telah dibersihkan. Silakan klik tombol <strong>&ldquo;Daftar Halaqah Baru&rdquo;</strong> untuk membuat kelompok halaqah resmi, atau gunakan tombol <strong>&ldquo;Kelola Sheet (.xlsx)&rdquo;</strong> di atas untuk mengimpor data karyawan &amp; halaqah sekaligus dari file Excel.
                  </p>
                </div>
                <div className="flex items-center justify-center gap-2 pt-1 flex-wrap">
                  <button
                    onClick={() => setShowAddHalaqahModal(true)}
                    className="px-4 py-2.5 rounded-xl bg-[#012d1d] hover:bg-[#1b4332] text-white text-xs font-bold shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[16px] text-[#fed488]">add_circle</span>
                    <span>Daftar Halaqah Baru</span>
                  </button>
                  {onOpenSheets && (
                    <button
                      onClick={onOpenSheets}
                      className="px-4 py-2.5 rounded-xl bg-white hover:bg-[#e9fbf2] text-[#00452c] border border-[#00452c]/25 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[16px]">upload_file</span>
                      <span>Import Excel (.xlsx)</span>
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {halaqahGroups.map((group, idx) => (
                  <div
                    key={`${group.halaqahName}-${idx}`}
                    onClick={() => handleOpenHalaqahModal(group.halaqahName)}
                    className="p-4 rounded-2xl bg-[#f9f9ff] hover:bg-emerald-50/30 border border-[#1b4332]/10 hover:border-[#1b4332]/30 shadow-xs transition-all cursor-pointer flex flex-col justify-between gap-3 group"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="px-2 py-0.5 rounded-full bg-[#c1ecd4] text-[#002114] text-[10px] font-bold">
                            Halaqah Resmi
                          </span>
                          <span className="px-2 py-0.5 rounded-full bg-[#e9edff] text-[#012d1d] text-[10px] font-mono font-bold">
                            {group.code}
                          </span>
                        </div>
                        <h4 className="text-base font-bold text-[#141b2b] mt-1 group-hover:text-[#012d1d] transition-colors">
                          {group.halaqahName}
                        </h4>
                        <p className="text-xs text-[#414844] mt-0.5">
                          Pembimbing: <span className="font-semibold text-[#141b2b]">{group.supervisor}</span>
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteHalaqah(group.halaqahName);
                          }}
                          title={`Hapus Halaqah ${group.halaqahName}`}
                          className="w-9 h-9 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 border border-red-200/70 flex items-center justify-center shadow-2xs active:scale-95 transition-all cursor-pointer"
                        >
                          <span className="material-symbols-outlined text-[18px]">delete</span>
                        </button>
                        <div className="w-10 h-10 rounded-xl bg-[#012d1d] text-white flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform">
                          <span className="material-symbols-outlined text-[20px]">groups</span>
                        </div>
                      </div>
                    </div>

                    <div className="pt-2.5 border-t border-[#f1f3ff] flex items-center justify-between gap-2 flex-wrap text-[11px] sm:text-xs">
                      <span className="text-[#414844] font-medium inline-flex items-center gap-1 min-w-0 truncate">
                        <span>👥</span>
                        <strong className="text-[#141b2b] tabular-nums">{group.members.length}</strong>
                        <span className="truncate">Karyawan Anggota</span>
                      </span>
                      <span className="text-[#012d1d] font-bold inline-flex items-center gap-1 shrink-0 whitespace-nowrap ml-auto group-hover:translate-x-0.5 sm:group-hover:translate-x-1 transition-transform">
                        <span className="material-symbols-outlined text-[14px] sm:text-[15px] shrink-0">settings</span>
                        <span>Kelola Halaqah</span>
                        <span className="material-symbols-outlined text-[15px] sm:text-[16px] shrink-0">arrow_forward</span>
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
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
              placeholder="Cari nama karyawan, ustadz/ah, atau nama halaqah..."
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
            {groups.map((grp, idx) => {
              const isSelected = selectedGroup === grp.label;
              return (
                <button
                  key={`${grp.label}-${idx}`}
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
                onClick={() => setSelectedStatus('mumtaz')}
                className={`px-2.5 py-1 rounded-lg font-semibold transition-colors cursor-pointer ${
                  selectedStatus === 'mumtaz'
                    ? 'bg-[#c1ecd4] text-[#002114]'
                    : 'text-[#414844] hover:bg-[#e9edff]'
                }`}
              >
                Mumtaz ({allRecitersList.filter((r) => r.status === 'Mumtaz').length})
              </button>
            </div>
          </div>

          {/* Reciters Directory List */}
          <section className="space-y-3">
            {filteredReciters.length === 0 ? (
              <div className="p-8 rounded-2xl bg-white border border-dashed border-[#1b4332]/20 text-center space-y-2.5">
                <span className="material-symbols-outlined text-[32px] text-[#717973]">person_add</span>
                <p className="text-sm font-bold text-[#141b2b]">Belum Ada Karyawan Terdaftar</p>
                <p className="text-xs text-[#414844] max-w-sm mx-auto">
                  Silakan klik tombol <strong>&ldquo;Daftar Karyawan / Ustadz/ah&rdquo;</strong> di atas atau impor data sekaligus melalui <strong>&ldquo;Kelola Sheet (.xlsx)&rdquo;</strong>.
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-2.5">
                {filteredReciters.map((item, idx) => {
                  const isSelected = selectedIds.includes(item.id);
                  return (
                    <div
                      key={`${item.id}-${idx}`}
                      onClick={() => {
                        if (isMultiSelect) {
                          toggleSelectReciter(item.id);
                        } else {
                          setSelectedStudentDetail(item);
                        }
                      }}
                      className={`p-4 rounded-2xl bg-white shadow-sm border transition-all cursor-pointer hover:shadow-md hover:border-[#012d1d]/25 ${
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
                              onClick={(e) => e.stopPropagation()}
                              onChange={() => toggleSelectReciter(item.id)}
                              className="rounded accent-[#012d1d] cursor-pointer"
                            />
                          )}
                          <PremiumInitialAvatar
                            name={item.name}
                            className="w-11 h-11 rounded-full shrink-0 shadow-sm"
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
                          <span className="flex items-center gap-1 font-semibold text-[#717973]">
                            <span className="material-symbols-outlined text-[14px]">lock</span>
                            Tilawah Dikunci
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
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedStudentDetail(item);
                            }}
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
            )}
          </section>

          {/* Roster Governance Drawer */}
          <section className="flex flex-col items-center justify-center gap-2 py-3 bg-[#f1f3ff]/60 rounded-2xl p-4 border border-[#1b4332]/5">
            <div className="flex items-center gap-2 text-xs text-[#414844]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#1b4332]/40" />
              <span>Menampilkan {filteredReciters.length} dari {allRecitersList.length} pengguna terdaftar</span>
              <span className="w-1.5 h-1.5 rounded-full bg-[#1b4332]/40" />
            </div>

            <div className="flex items-center justify-between w-full pt-1 px-1 text-xs text-[#414844]">
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
        </div>
      )}

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
                  Amalan-amalan ini selalu muncul otomatis setiap hari di layar karyawan tanpa perlu di-upload ulang. Pengisian shalat 5 waktu terikat waktu adzan, tersedia opsi jamaah (+5 XP), penyesuaian nilai 75% dari poin asli (potongan 25%) jika terlambat mengisi di luar rentang waktu, dan deteksi otomatis puasa sunnah.
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
                  key={`${item.id}-${idx}`}
                  onClick={() => handleOpenEditPaten(item)}
                  className={`p-4 rounded-2xl border transition-all flex flex-col justify-between gap-3 shadow-xs cursor-pointer hover:shadow-md hover:border-[#012d1d]/30 ${
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
                          ⚠️ Terlambat mengisi di luar rentang waktu mendapatkan <strong>75% dari poin asli</strong> ({Math.round(item.baseXp * 0.75 * 100) / 100} XP dari {item.baseXp} XP).
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
                      onClick={(e) => {
                        e.stopPropagation();
                        handleTogglePatenActive(item.id);
                      }}
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
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenEditPaten(item);
                      }}
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
                    Monitoring Tugas Khusus Halaqah Ustadz/ah
                  </h3>
                  <p className="text-xs text-[#414844]">
                    Memantau kepatuhan tugas ibadah tambahan yang diterbitkan para ustadz/ah pembimbing.
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
                placeholder="Cari tugas ustadz/ah (judul, materi, nama ustadz/ah)..."
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
                {allHalaqahPresets.map((h, idx) => (
                  <option key={`${h.id || h.name}-${idx}`} value={h.name}>
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
                    Para ustadz/ah belum menerbitkan tugas khusus untuk kriteria pencarian ini. Tugas harian karyawan saat ini mengacu pada 11 Amalan Pasti Dept HX.
                  </p>
                </div>
              );
            }

            return (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {list.map((dir, idx) => {
                  const targetHalaqah = (dir as any).targetHalaqah || 'Semua Halaqah';
                  const createdBy = formatSupervisorDisplayName((dir as any).createdBy);
                  const isRecitation = (dir as any).isRecitationTest;
                  const isExceeding = dir.xp > 30;
                  const isEffectivelyActive = isDirectiveCurrentlyActive(dir);
                  const isExpired = isDirectiveExpired(dir);
                  const isRecurringTask = dir.isRecurring === true;
                  const remainingLabel = formatDirectiveRemainingTime(dir);

                  return (
                    <div
                      key={`${dir.id}-${idx}`}
                      onClick={() => setSelectedDirectiveDetail(dir)}
                      className={`p-4 rounded-2xl border shadow-xs flex flex-col justify-between gap-3 transition-all cursor-pointer group hover:shadow-md ${
                        isEffectivelyActive
                          ? 'bg-white border-[#1b4332]/10 hover:border-[#012d1d]/30'
                          : 'bg-[#f8f9fc]/80 border-slate-200 opacity-85 hover:opacity-100'
                      }`}
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
                              <span
                                className={`px-1.5 py-0.2 rounded-full text-[9px] font-bold ${
                                  isRecurringTask
                                    ? 'bg-[#c1ecd4]/60 text-[#012d1d]'
                                    : 'bg-[#fed488]/40 text-[#775a19]'
                                }`}
                              >
                                {isRecurringTask ? 'Berulang Otomatis' : 'Otomatis Nonaktif'}
                              </span>
                              <span
                                className={`px-1.5 py-0.2 rounded-full text-[9px] font-bold ${
                                  isEffectivelyActive
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : 'bg-slate-200 text-slate-700'
                                }`}
                              >
                                {isEffectivelyActive
                                  ? `Aktif • ${remainingLabel}`
                                  : dir.autoDeactivated || (!isRecurringTask && isExpired)
                                  ? 'Nonaktif (Kedaluwarsa)'
                                  : 'Nonaktif'}
                              </span>
                            </div>
                            <h4 className="font-bold text-sm text-[#141b2b] mt-1 group-hover:text-[#012d1d] transition-colors">
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

                      <div className="space-y-2">
                        <div className="w-full bg-[#f1f3ff] h-1.5 rounded-full overflow-hidden">
                          <div
                            className="bg-[#00452c] h-full rounded-full transition-all"
                            style={{ width: `${Math.min(100, dir.compliancePercent)}%` }}
                          />
                        </div>
                        <div className="flex items-center justify-between pt-1.5 border-t border-[#f1f3ff] text-xs">
                          <span className="text-[11px] text-[#717973] font-medium">
                            {isRecitation ? '📖 Tugas Setoran Tilawah' : '🕌 Tugas Mutaba\'ah Halaqah'}
                          </span>
                          <span className="inline-flex items-center gap-1 text-[#012d1d] font-bold text-[11px] group-hover:underline">
                            <span>Lihat Detail</span>
                            <span className="material-symbols-outlined text-[14px]">chevron_right</span>
                          </span>
                        </div>
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
                    Data kehadiran Ustadz/ah pembimbing &amp; seluruh karyawan binaan tersinkronisasi otomatis dari lapangan.
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
              <div
                onClick={() => {
                  setAttendanceStatusFilter('all');
                  setAttendanceHalaqahFilter('all');
                  setAttendanceMonthFilter('all');
                  setAttendanceSearchQuery('');
                  onShowToast('Menampilkan seluruh sesi presensi yang tercatat');
                }}
                className="p-3 rounded-2xl bg-[#f9f9ff] hover:bg-[#e9edff]/70 border border-[#1b4332]/5 hover:border-[#012d1d]/25 transition-all cursor-pointer active:scale-[0.98]"
              >
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
                  Tersimpan di Cloud →
                </span>
              </div>

              <div
                onClick={() => {
                  setAttendanceStatusFilter(attendanceStatusFilter === 'hadir' ? 'all' : 'hadir');
                  onShowToast(
                    attendanceStatusFilter === 'hadir'
                      ? 'Menampilkan semua status kehadiran ustadz/ah'
                      : 'Memfilter sesi dengan Ustadz/ah Hadir Membina'
                  );
                }}
                className="p-3 rounded-2xl bg-[#f9f9ff] hover:bg-emerald-50/70 border border-[#1b4332]/5 hover:border-emerald-500/30 transition-all cursor-pointer active:scale-[0.98]"
              >
                <span className="text-[10px] font-semibold text-[#717973] uppercase tracking-wider block">
                  Kehadiran Ustadz/ah
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
                  Filter Hadir Membina →
                </span>
              </div>

              <div
                onClick={() => {
                  if (filteredAttendanceSessions.length > 0) {
                    setSelectedAttendanceSessionDetail(filteredAttendanceSessions[0]);
                  } else {
                    onShowToast('Belum ada sesi presensi untuk ditampilkan rinciannya');
                  }
                }}
                className="p-3 rounded-2xl bg-[#f9f9ff] hover:bg-[#e9edff]/70 border border-[#1b4332]/5 hover:border-[#012d1d]/25 transition-all cursor-pointer active:scale-[0.98]"
              >
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
                  Buka Sesi Terbaru →
                </span>
              </div>

              <div
                onClick={() => handleExportAllAttendanceCSV()}
                className="p-3 rounded-2xl bg-emerald-50/50 hover:bg-emerald-100/60 border border-emerald-200/60 transition-all cursor-pointer active:scale-[0.98]"
              >
                <span className="text-[10px] font-semibold text-emerald-800 uppercase tracking-wider block">
                  Status Sinkron
                </span>
                <div className="flex items-center gap-1.5 mt-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                  <span className="text-xs font-bold text-emerald-900">Aktif &amp; Terhubung</span>
                </div>
                <span className="text-[10px] text-emerald-700 font-medium mt-0.5 block">
                  Unduh Rekap Cloud →
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
                placeholder="Cari sesi, ustadz/ah..."
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
                {allHalaqahPresets.map((h, idx) => (
                  <option key={`${h.id || h.name}-${idx}`} value={h.name}>
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
                <option value="pengganti">Ustadz/ah Pengganti</option>
                <option value="izin">Ustadz/ah Izin</option>
                <option value="sakit">Ustadz/ah Sakit</option>
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
                {halaqahsWithNoSessions.map((h, idx) => (
                  <button
                    key={`${h.id || h.name}-${idx}`}
                    type="button"
                    onClick={() => handleOpenHalaqahModal(h.name)}
                    className="px-2.5 py-1 rounded-full bg-white hover:bg-rose-100 text-rose-800 text-[10px] font-bold border border-rose-200 shadow-xs transition-colors cursor-pointer inline-flex items-center gap-1"
                  >
                    <span>{h.name}</span>
                    <span className="material-symbols-outlined text-[12px]">open_in_new</span>
                  </button>
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
                  Belum ada sesi presensi yang cocok dengan filter atau kata kunci yang dipilih. Setiap sesi yang diisi Ustadz/ah akan otomatis tampil di sini secara real-time.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {filteredAttendanceSessions.map((session, idx) => {
                  const izinCount = session.members.filter((m) => m.status === 'izin').length;
                  const sakitCount = session.members.filter((m) => m.status === 'sakit').length;
                  const alpaCount = session.members.filter((m) => m.status === 'alpa').length;

                  return (
                    <div
                      key={`${session.id}-${idx}`}
                      onClick={() => setSelectedAttendanceSessionDetail(session)}
                      className="p-4 rounded-2xl bg-white border border-[#1b4332]/10 hover:border-[#012d1d]/30 shadow-xs hover:shadow-md transition-all flex flex-col justify-between gap-3 group cursor-pointer"
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
                              <PremiumInitialAvatar
                                name={session.ustadzName}
                                role="admin"
                                className="w-7 h-7 rounded-full ring-1 ring-white shrink-0"
                              />
                              <div className="min-w-0">
                                <span className="text-[10px] text-[#717973] block leading-tight">
                                  {getUstadzTitle(session.ustadzName)} Pembimbing
                                </span>
                                <strong className="text-xs text-[#141b2b] truncate block">
                                  {formatSupervisorDisplayName(session.ustadzName)}
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
                                ? `${getUstadzTitle(session.ustadzPenggantiName)} Pengganti`
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
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedAttendanceSessionDetail(session);
                          }}
                          className="flex-1 py-2 px-3 rounded-xl bg-[#012d1d] hover:bg-[#1b4332] text-white text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
                        >
                          <span className="material-symbols-outlined text-[16px]">visibility</span>
                          <span>Buka Lembar Presensi Lengkap</span>
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSessionToDelete(session);
                          }}
                          title="Hapus sesi presensi ini"
                          className="w-8 h-8 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 flex items-center justify-center transition-colors cursor-pointer shrink-0"
                        >
                          <span className="material-symbols-outlined text-[18px]">delete</span>
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleExportSingleSessionCSV(session);
                          }}
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
        <div className="fixed inset-0 z-[60] bg-[#141b2b]/50 backdrop-blur-sm flex items-center justify-center p-2.5 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl sm:rounded-3xl max-w-md w-full p-4 sm:p-6 shadow-2xl space-y-3.5 sm:space-y-4 border border-[#1b4332]/10 my-auto max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200">
            <div className="flex items-start sm:items-center justify-between gap-2 pb-3 border-b border-[#f1f3ff]">
              <div className="min-w-0 flex-1">
                <span className="px-2 py-0.5 rounded-full bg-[#fed488]/40 text-[#775a19] text-[10px] font-bold uppercase tracking-wider inline-block">
                  Dept HX Editor
                </span>
                <h3 className="font-bold text-sm sm:text-base text-[#141b2b] mt-0.5 truncate">
                  Edit Aturan Amalan
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingPaten(null)}
                className="w-8 h-8 rounded-full bg-[#f1f3ff] hover:bg-[#e4e7ff] text-[#414844] flex items-center justify-center cursor-pointer shrink-0"
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

              {/* Jamaah Info / Toggle (Strictly for 5 Fardhu Prayers) */}
              {isFiveDailyFardhuPrayer(editingPaten || { title: formPatenTitle }) ? (
                <div className="p-3 rounded-xl bg-[#f9f9ff] border border-[#1b4332]/10 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[#012d1d] flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[16px] text-[#00452c]">mosque</span>
                      Opsi Shalat Berjamaah / Munfarid (Khusus Sholat 5 Waktu)
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-[#c1ecd4] text-[#002114] text-[10px] font-bold">
                      Aktif
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-[11px] pt-1">
                    <span className="text-[#414844]">Bonus Berjamaah:</span>
                    <input
                      type="number"
                      value={formPatenJamaahBonus}
                      onChange={(e) => setFormPatenJamaahBonus(parseInt(e.target.value) || 0)}
                      className="w-16 px-2 py-1 rounded-lg border border-[#1b4332]/20 bg-white text-center font-bold"
                    />
                    <span className="font-bold text-[#00452c]">XP (Total Berjamaah: {formPatenBaseXp + formPatenJamaahBonus} XP)</span>
                  </div>
                </div>
              ) : (
                <div className="p-2.5 rounded-xl bg-[#f1f3ff] border border-[#1b4332]/10 text-[11px] text-[#414844] flex items-center gap-2">
                  <span className="material-symbols-outlined text-[16px] text-[#00452c] shrink-0">info</span>
                  <span>
                    Amalan selain Sholat 5 Waktu (Subuh, Dzuhur, Ashar, Maghrib, Isya&apos;) <strong>tidak memiliki</strong> pilihan Berjamaah / Munfarid.
                  </span>
                </div>
              )}

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

              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200/80 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-amber-950 text-xs">Aturan Keterlambatan Pengisian:</span>
                  <span className="px-2 py-0.5 rounded-full bg-amber-200/80 text-amber-950 font-extrabold text-[10px]">
                    75% dari Poin Asli
                  </span>
                </div>
                <span className="text-[11px] text-amber-900 block leading-snug">
                  Jika diisi terlambat di luar rentang waktu, karyawan memperoleh <strong>75% dari poin asli</strong> (contoh: poin asli <strong>{formPatenBaseXp} XP</strong> menjadi <strong>{Math.round(formPatenBaseXp * 0.75 * 100) / 100} XP</strong>).
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
        <div className="fixed inset-0 z-[60] bg-[#141b2b]/50 backdrop-blur-sm flex items-center justify-center p-2.5 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl sm:rounded-3xl max-w-md w-full p-4 sm:p-6 shadow-2xl space-y-3.5 sm:space-y-4 border border-[#1b4332]/10 my-auto max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200">
            <div className="flex items-start sm:items-center justify-between gap-2 pb-3 border-b border-[#f1f3ff]">
              <div className="min-w-0 flex-1">
                <span className="px-2 py-0.5 rounded-full bg-[#fed488]/40 text-[#775a19] text-[10px] font-bold uppercase tracking-wider inline-block">
                  Dept HX Otoritas
                </span>
                <h3 className="font-bold text-sm sm:text-base text-[#141b2b] mt-0.5 truncate">
                  Tambah Amalan Baru
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAddPatenModal(false)}
                className="w-8 h-8 rounded-full bg-[#f1f3ff] hover:bg-[#e4e7ff] text-[#414844] flex items-center justify-center cursor-pointer shrink-0"
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
        <div className="fixed inset-0 z-[60] bg-[#141b2b]/50 backdrop-blur-sm flex items-center justify-center p-2.5 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl sm:rounded-3xl max-w-md w-full p-4 sm:p-6 shadow-2xl space-y-3.5 sm:space-y-4 border border-[#1b4332]/10 my-auto max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex items-start justify-between gap-2 pb-3 border-b border-[#f1f3ff]">
              <div className="min-w-0 flex-1">
                <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[#fed488]/40 text-[#785a1a] text-[10px] font-bold uppercase tracking-wider mb-1">
                  <span className="material-symbols-outlined text-[12px] shrink-0">verified</span>
                  <span>Registrasi Resmi Dept HX</span>
                </div>
                <h3 className="font-bold text-sm sm:text-base text-[#012d1d] leading-snug">
                  Pendaftaran Karyawan / Ustadz/ah Baru
                </h3>
                <p className="text-[11px] sm:text-xs text-[#414844] leading-snug mt-0.5">
                  Tetapkan halaqah binaan dan terbitkan akses masuk resmi
                </p>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="w-8 h-8 rounded-full bg-[#f1f3ff] hover:bg-[#e9edff] flex items-center justify-center text-[#414844] cursor-pointer transition-colors shrink-0"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            {/* Form Fields */}
            <div className="space-y-3">
              {/* Role Selection */}
              <div>
                <label className="text-xs font-bold text-[#141b2b] mb-1.5 block">
                  Peran Pengguna <span className="text-[#ba1a1a]">*</span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setNewReciterRole('member')}
                    className={`py-2.5 px-3 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                      newReciterRole === 'member'
                        ? 'bg-[#012d1d] text-white border-[#012d1d] shadow-xs'
                        : 'bg-[#f1f3ff] text-[#414844] border-transparent hover:bg-[#e9edff]'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[16px]">person</span>
                    <span>Karyawan</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewReciterRole('admin')}
                    className={`py-2.5 px-3 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                      newReciterRole === 'admin'
                        ? 'bg-[#012d1d] text-white border-[#012d1d] shadow-xs'
                        : 'bg-[#f1f3ff] text-[#414844] border-transparent hover:bg-[#e9edff]'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[16px]">shield_person</span>
                    <span>Ustadz/ah Pembimbing</span>
                  </button>
                </div>
              </div>

              {newReciterRole === 'admin' && (
                <div>
                  <label className="text-xs font-bold text-[#141b2b] mb-1.5 block">
                    Jenis Kelamin Pembimbing <span className="text-[#ba1a1a]">*</span>
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setNewReciterGender('L')}
                      className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                        newReciterGender === 'L'
                          ? 'bg-[#00452c] text-white border-[#00452c] shadow-xs'
                          : 'bg-[#f1f3ff] text-[#414844] border-transparent hover:bg-[#e9edff]'
                      }`}
                    >
                      <span className="material-symbols-outlined text-[15px]">man</span>
                      <span>Laki-laki (Ustadz)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewReciterGender('P')}
                      className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                        newReciterGender === 'P'
                          ? 'bg-[#00452c] text-white border-[#00452c] shadow-xs'
                          : 'bg-[#f1f3ff] text-[#414844] border-transparent hover:bg-[#e9edff]'
                      }`}
                    >
                      <span className="material-symbols-outlined text-[15px]">woman</span>
                      <span>Perempuan (Ustadzah)</span>
                    </button>
                  </div>
                </div>
              )}

              <div>
                <label className="text-xs font-bold text-[#141b2b] mb-1 block">
                  {newReciterRole === 'admin' ? `Nama Lengkap ${newReciterGender === 'P' ? 'Ustadzah' : 'Ustadz'}` : 'Nama Lengkap Karyawan'}{' '}
                  <span className="text-[#ba1a1a]">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={newReciterName}
                  onChange={(e) => setNewReciterName(e.target.value)}
                  placeholder={
                    newReciterRole === 'admin'
                      ? newReciterGender === 'P'
                        ? 'Contoh: Ustadzah Aisyah Rahma'
                        : 'Contoh: Ustadz Ahmad Fauzi'
                      : 'Contoh: Muhammad Reyhan Pratama'
                  }
                  className="w-full px-3 py-2.5 rounded-xl bg-[#f1f3ff] text-xs font-semibold text-[#141b2b] border border-transparent focus:bg-white focus:border-[#012d1d] focus:outline-none transition-all"
                />
              </div>

              {/* Halaqah Preset Selection or Direct Input */}
              <div>
                <label className="text-xs font-bold text-[#141b2b] mb-1 block">
                  Kelompok Halaqah <span className="text-[#ba1a1a]">*</span>
                </label>
                {allHalaqahPresets.length > 0 ? (
                  <>
                    <select
                      value={newReciterGroup}
                      onChange={(e) => setNewReciterGroup(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl bg-[#f1f3ff] text-xs font-semibold text-[#141b2b] focus:bg-white focus:outline-none"
                    >
                      {allHalaqahPresets.map((h, idx) => (
                        <option key={`${h.id || h.name}-${idx}`} value={h.name}>
                          {h.name} ({h.code}) — {h.supervisor}
                        </option>
                      ))}
                    </select>
                    <p className="text-[10px] text-[#00452c] font-semibold mt-1">
                      ✓ Kode Penugasan:{' '}
                      {allHalaqahPresets.find((h) => h.name === newReciterGroup)?.code || 'HX-001'} • Pembimbing:{' '}
                      {formatSupervisorDisplayName(allHalaqahPresets.find((h) => h.name === newReciterGroup)?.supervisor)}
                    </p>
                  </>
                ) : (
                  <div className="space-y-2">
                    <input
                      type="text"
                      value={newReciterGroup}
                      onChange={(e) => setNewReciterGroup(e.target.value)}
                      placeholder="Ketik nama kelompok halaqah (misal: Halaqah Al-Fajr)"
                      className="w-full px-3 py-2.5 rounded-xl bg-[#f1f3ff] text-xs font-semibold text-[#141b2b] border border-transparent focus:bg-white focus:border-[#012d1d] focus:outline-none"
                    />
                    {newReciterRole === 'member' && (
                      <input
                        type="text"
                        value={newReciterSupervisor}
                        onChange={(e) => setNewReciterSupervisor(e.target.value)}
                        placeholder="Nama Ustadz/ah Pembimbing halaqah ini (opsional)"
                        className="w-full px-3 py-2.5 rounded-xl bg-[#f1f3ff] text-xs font-semibold text-[#141b2b] border border-transparent focus:bg-white focus:border-[#012d1d] focus:outline-none"
                      />
                    )}
                    <p className="text-[10px] text-[#785a1a]">
                      💡 Halaqah baru akan otomatis dibuat beserta kode uniknya.
                    </p>
                  </div>
                )}
              </div>

              {/* Passcode Login */}
              <div>
                <label className="text-xs font-bold text-[#141b2b] mb-1 block">
                  Passcode / PIN Login
                </label>
                <input
                  type="text"
                  value={newReciterPasscode}
                  onChange={(e) => setNewReciterPasscode(e.target.value)}
                  placeholder="Default: 1234"
                  className="w-full px-3 py-2 rounded-xl bg-[#f1f3ff] text-xs font-semibold text-[#141b2b] focus:bg-white focus:outline-none"
                />
                <span className="text-[10px] text-[#717973] block mt-0.5">
                  PIN yang digunakan saat login di halaman depan (bawaan: 1234)
                </span>
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
                <span>Simpan &amp; Daftarkan</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Broadcast Alert Modal */}
      {showBroadcastModal && (
        <div className="fixed inset-0 z-[60] bg-[#141b2b]/50 backdrop-blur-sm flex items-center justify-center p-4">
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
                placeholder="Contoh: Assalamu'alaikum. Diingatkan seluruh ustadz/ah & karyawan besok pagi ada agenda tabligh akbar pusat."
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
          <div className="fixed inset-0 z-[60] bg-[#141b2b]/65 backdrop-blur-sm flex items-center justify-center p-2.5 sm:p-4 animate-in fade-in duration-150 overflow-y-auto">
            <div className="w-full max-w-2xl bg-white rounded-2xl sm:rounded-3xl p-3.5 sm:p-6 shadow-2xl flex flex-col max-h-[92vh] overflow-hidden border border-[#1b4332]/15 my-auto">
              
              {/* Header Kelola Halaqah */}
              <div className="pb-2.5 sm:pb-3 border-b border-[#f1f3ff] space-y-2">
                <div className="flex items-start justify-between gap-2 sm:gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="px-2 sm:px-2.5 py-0.5 rounded-full bg-[#c1ecd4] text-[#002114] text-[9.5px] sm:text-[10px] font-bold uppercase tracking-wider inline-flex items-center gap-1 whitespace-nowrap">
                        <span className="material-symbols-outlined text-[12px] sm:text-[13px] shrink-0">admin_panel_settings</span>
                        <span>Pusat Kendali Halaqah Dept HX</span>
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-[#e9edff] text-[#012d1d] text-[10px] font-mono font-bold whitespace-nowrap">
                        {groupObj.code}
                      </span>
                    </div>
                    <h3 className="text-base sm:text-xl font-extrabold text-[#141b2b] mt-1 leading-snug break-words">
                      {groupObj.halaqahName}
                    </h3>
                  </div>
                  <button
                    onClick={() => setSelectedHalaqahGroup(null)}
                    className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-[#f1f3ff] flex items-center justify-center text-[#414844] hover:bg-[#e4e7ff] transition-colors cursor-pointer shrink-0"
                    title="Tutup Panel"
                  >
                    <span className="material-symbols-outlined text-[18px] sm:text-[20px]">close</span>
                  </button>
                </div>

                {/* Info Bar / Chips */}
                <div className="flex items-center gap-x-2.5 gap-y-1 text-[11px] sm:text-xs text-[#414844] flex-wrap bg-[#f9f9ff] p-2 sm:p-2.5 rounded-xl border border-[#1b4332]/10">
                  <span className="inline-flex items-center gap-1 min-w-0">
                    <span className="material-symbols-outlined text-[14px] sm:text-[15px] text-[#012d1d] shrink-0">person</span>
                    <span className="truncate">Pembimbing: <strong className="text-[#141b2b]">{groupObj.supervisor}</strong></span>
                  </span>
                  <span className="hidden sm:inline text-[#717973]/50">•</span>
                  <span className="inline-flex items-center gap-1 min-w-0">
                    <span className="material-symbols-outlined text-[14px] sm:text-[15px] text-[#775a19] shrink-0">schedule</span>
                    <span className="truncate">{groupObj.schedule}</span>
                  </span>
                  <span className="hidden sm:inline text-[#717973]/50">•</span>
                  <span className="inline-flex items-center gap-1 min-w-0">
                    <span className="material-symbols-outlined text-[14px] sm:text-[15px] text-[#00452c] shrink-0">mosque</span>
                    <span className="truncate">{groupObj.location}</span>
                  </span>
                  <span className="hidden sm:inline text-[#717973]/50">•</span>
                  <span className="px-2 py-0.5 rounded-full bg-[#fed488]/40 text-[#775a19] text-[10px] font-bold whitespace-nowrap">
                    👥 {groupObj.members.length} Anggota
                  </span>
                </div>

                {/* Sub-navigation Menu Tabs */}
                <div className="flex items-center gap-1.5 pt-0.5 overflow-x-auto no-scrollbar">
                  <button
                    type="button"
                    onClick={() => setHalaqahActiveTab('members')}
                    className={`py-1.5 sm:py-2 px-2.5 sm:px-3 rounded-xl text-[11px] sm:text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shrink-0 whitespace-nowrap ${
                      halaqahActiveTab === 'members'
                        ? 'bg-[#012d1d] text-white shadow-sm'
                        : 'bg-[#f1f3ff] text-[#414844] hover:bg-[#e4e7ff]'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[15px] sm:text-[16px]">groups</span>
                    <span>Daftar Anggota ({groupObj.members.length})</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setHalaqahActiveTab('add')}
                    className={`py-1.5 sm:py-2 px-2.5 sm:px-3 rounded-xl text-[11px] sm:text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shrink-0 whitespace-nowrap ${
                      halaqahActiveTab === 'add'
                        ? 'bg-[#012d1d] text-white shadow-sm'
                        : 'bg-[#f1f3ff] text-[#414844] hover:bg-[#e4e7ff]'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[15px] sm:text-[16px]">person_add</span>
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
                    className={`py-1.5 sm:py-2 px-2.5 sm:px-3 rounded-xl text-[11px] sm:text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shrink-0 whitespace-nowrap ${
                      halaqahActiveTab === 'edit'
                        ? 'bg-[#012d1d] text-white shadow-sm'
                        : 'bg-[#f1f3ff] text-[#414844] hover:bg-[#e4e7ff]'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[15px] sm:text-[16px]">edit</span>
                    <span>Edit Info Halaqah</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setHalaqahActiveTab('broadcast')}
                    className={`py-1.5 sm:py-2 px-2.5 sm:px-3 rounded-xl text-[11px] sm:text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shrink-0 whitespace-nowrap ${
                      halaqahActiveTab === 'broadcast'
                        ? 'bg-[#012d1d] text-white shadow-sm'
                        : 'bg-[#f1f3ff] text-[#414844] hover:bg-[#e4e7ff]'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[15px] sm:text-[16px]">campaign</span>
                    <span>Siaran &amp; Maklumat</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDeleteHalaqah(groupObj.halaqahName)}
                    className="py-1.5 sm:py-2 px-2.5 sm:px-3 rounded-xl text-[11px] sm:text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shrink-0 whitespace-nowrap bg-red-50 hover:bg-red-100 text-red-600 border border-red-200/70 shadow-2xs active:scale-95"
                    title={`Hapus Halaqah ${groupObj.halaqahName}`}
                  >
                    <span className="material-symbols-outlined text-[15px] sm:text-[16px]">delete</span>
                    <span>Hapus Halaqah</span>
                  </button>
                </div>
              </div>

              {/* Tab 1: Daftar Anggota */}
              {halaqahActiveTab === 'members' && (
                <div className="flex-1 flex flex-col min-h-0 py-2.5 sm:py-3 space-y-2.5 sm:space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="relative flex-1 min-w-0">
                      <span className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-[#717973]">
                        <span className="material-symbols-outlined text-[17px] sm:text-[18px]">search</span>
                      </span>
                      <input
                        type="text"
                        value={memberSearchInsideHalaqah}
                        onChange={(e) => setMemberSearchInsideHalaqah(e.target.value)}
                        placeholder="Cari nama karyawan dalam halaqah..."
                        className="w-full pl-9 pr-3 py-2 rounded-xl bg-[#f9f9ff] border border-[#1b4332]/10 text-xs text-[#141b2b] placeholder-[#717973] focus:outline-none focus:ring-1 focus:ring-[#012d1d]"
                      />
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleExportHalaqahCSV(groupObj)}
                        className="px-2.5 sm:px-3 py-2 rounded-xl bg-white hover:bg-[#f1f3ff] text-[#012d1d] text-xs font-bold border border-[#1b4332]/10 transition-colors flex items-center gap-1 cursor-pointer shadow-2xs"
                        title="Ekspor CSV Anggota"
                      >
                        <span className="material-symbols-outlined text-[16px]">download</span>
                        <span className="hidden sm:inline">CSV</span>
                      </button>
                    </div>
                  </div>

                  {/* Members List */}
                  <div className="flex-1 overflow-y-auto space-y-2 scrollbar-thin">
                    {displayMembers.length === 0 ? (
                      <div className="p-6 sm:p-8 text-center bg-[#f9f9ff] rounded-2xl border border-dashed border-[#1b4332]/20 space-y-2">
                        <span className="material-symbols-outlined text-[32px] sm:text-[36px] text-[#717973]">group_off</span>
                        <p className="text-sm font-bold text-[#141b2b]">Belum Ada Anggota di Halaqah Ini</p>
                        <p className="text-xs text-[#717973] max-w-sm mx-auto">
                          Kelompok halaqah ini belum memiliki karyawan terdaftar. Silakan gunakan tab menu &quot;Tambah Anggota&quot; di atas untuk mendaftarkan atau memindahkan anggota ke halaqah ini.
                        </p>
                      </div>
                    ) : (
                      displayMembers.map((member: any, idx: number) => (
                        <div
                          key={`${member.id || member.name}-${idx}`}
                          onClick={() => setSelectedStudentDetail(member)}
                          className="p-2.5 sm:p-3 rounded-2xl bg-[#f9f9ff] hover:bg-emerald-50/30 border border-[#1b4332]/10 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-2.5 overflow-hidden cursor-pointer"
                        >
                          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
                            <PremiumInitialAvatar
                              name={member.name}
                              className="w-10 h-10 sm:w-11 sm:h-11 rounded-full ring-2 ring-white shadow-xs shrink-0"
                            />
                            <div className="min-w-0 flex-1">
                              <h4 className="text-xs sm:text-sm font-bold text-[#141b2b] truncate">
                                {member.name}
                              </h4>
                              <div className="flex items-center gap-1.5 flex-wrap mt-0.5 text-[10px]">
                                <span className="px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 font-bold whitespace-nowrap">
                                  🔥 {member.streakDays ?? 0} hari
                                </span>
                                <span className="px-1.5 py-0.2 rounded bg-[#e9edff] text-[#012d1d] font-bold whitespace-nowrap">
                                  {member.totalXp ?? 0} XP
                                </span>
                                <span className="px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 font-bold whitespace-nowrap inline-flex items-center gap-0.5">
                                  <span className="material-symbols-outlined text-[11px]">lock</span>
                                  Tilawah Dikunci
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Member Actions */}
                          <div
                            onClick={(e) => e.stopPropagation()}
                            className="flex items-center justify-between sm:justify-end gap-1 sm:gap-1.5 w-full sm:w-auto max-w-full shrink-0 flex-nowrap pt-2 sm:pt-0 border-t border-[#f1f3ff] sm:border-t-0"
                          >
                            {/* Detail Profile Button */}
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedStudentDetail(member);
                              }}
                              className="h-7 sm:h-8 flex-auto sm:flex-initial min-w-0 px-1.5 sm:px-2.5 rounded-xl bg-white hover:bg-[#e9edff] text-[#012d1d] text-[10px] sm:text-xs font-semibold border border-[#1b4332]/10 transition-colors inline-flex items-center justify-center gap-0.5 sm:gap-1 cursor-pointer whitespace-nowrap"
                              title="Lihat Profil Santri"
                            >
                              <span className="material-symbols-outlined text-[13px] sm:text-[14px] shrink-0">visibility</span>
                              <span>Detail</span>
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
                              className="h-7 sm:h-8 flex-auto sm:flex-initial min-w-0 px-1.5 sm:px-2.5 rounded-xl bg-[#e9edff] hover:bg-[#d5dcfa] text-[#012d1d] text-[10px] sm:text-xs font-semibold transition-colors inline-flex items-center justify-center gap-0.5 sm:gap-1 cursor-pointer whitespace-nowrap"
                              title="Pindahkan ke Halaqah Lain"
                            >
                              <span className="material-symbols-outlined text-[13px] sm:text-[14px] shrink-0">swap_horiz</span>
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
                              className="h-7 sm:h-8 flex-auto sm:flex-initial min-w-0 px-1.5 sm:px-2.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 text-[10px] sm:text-xs font-bold transition-colors inline-flex items-center justify-center gap-0.5 sm:gap-1 cursor-pointer border border-amber-200 whitespace-nowrap"
                              title="Keluarkan Karyawan dari Halaqah Ini"
                            >
                              <span className="material-symbols-outlined text-[13px] sm:text-[14px] shrink-0">person_remove</span>
                              <span>Keluarkan</span>
                            </button>

                            {/* Hapus Karyawan Permanen */}
                            <button
                              type="button"
                              onClick={() => {
                                handleDeleteStudent(member);
                              }}
                              className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 transition-colors inline-flex items-center justify-center cursor-pointer shrink-0"
                              title="Hapus Karyawan Permanen dari Sistem"
                            >
                              <span className="material-symbols-outlined text-[15px] sm:text-[16px]">delete</span>
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
                        existingCandidates.map((cand: any, idx: number) => {
                          const currentH = cand.halaqah || 'Tanpa Halaqah';
                          const hasHalaqah = currentH !== 'Tanpa Halaqah' && currentH !== 'Belum Ada Halaqah' && currentH !== groupObj.halaqahName;

                          return (
                            <div
                              key={`${cand.id || cand.name}-${idx}`}
                              className="p-2.5 rounded-xl bg-white border border-[#1b4332]/5 flex items-center justify-between flex-wrap sm:flex-nowrap gap-2 shadow-2xs"
                            >
                              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                <PremiumInitialAvatar
                                  name={cand.name}
                                  className="w-8 h-8 rounded-full shrink-0"
                                />
                                <div className="min-w-0 flex-1">
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
                                  className="px-2.5 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200 text-[10px] font-bold transition-all shadow-2xs flex items-center gap-1 cursor-pointer shrink-0 whitespace-nowrap ml-auto"
                                  title={`Karyawan sudah terdaftar di ${currentH}. Klik untuk info pemindahan.`}
                                >
                                  <span className="material-symbols-outlined text-[13px]">lock</span>
                                  <span>Sudah Ada Halaqah</span>
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => handleAddExistingStudentToHalaqah(cand, groupObj.halaqahName, groupObj.code)}
                                  className="px-3 py-1.5 rounded-full bg-[#012d1d] hover:bg-[#1b4332] text-white text-[11px] font-bold transition-all shadow-xs flex items-center gap-1 cursor-pointer shrink-0 whitespace-nowrap ml-auto active:scale-95"
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
                      Anda dapat mengubah nama kelompok halaqah, kode, ustadz/ah pembimbing, jadwal pertemuan, lokasi masjid, dan departemen naungan. Perubahan nama akan otomatis diperbarui pada seluruh data anggota halaqah ini.
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
                          Ustadz/ah Pembimbing / Supervisor
                        </label>
                        <input
                          type="text"
                          value={editHalaqahSupervisor}
                          onChange={(e) => setEditHalaqahSupervisor(e.target.value)}
                          placeholder="Contoh: Ustadz Farhan / Ustadzah Aisyah"
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
        <div className="fixed inset-0 z-[60] bg-[#141b2b]/55 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
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
              <PremiumInitialAvatar
                name={selectedStudentDetail.name}
                className="w-20 h-20 rounded-full ring-4 ring-white shadow-md"
              />
              <div>
                <h4 className="text-base font-bold text-[#141b2b]">
                  {selectedStudentDetail.name}
                </h4>
                <p className="text-xs text-[#414844] mt-0.5">
                  {selectedStudentDetail.halaqah} • Pembimbing: <span className="font-semibold text-[#141b2b]">{formatSupervisorDisplayName(selectedStudentDetail.supervisor)}</span>
                </p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-center">
                <span className="text-[10px] font-semibold text-emerald-800 uppercase block">Total XP</span>
                <span className="text-base font-extrabold text-emerald-950">{selectedStudentDetail.totalXp ?? 0}</span>
              </div>
              <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200 text-center">
                <span className="text-[10px] font-semibold text-amber-800 uppercase block">Streak</span>
                <span className="text-base font-extrabold text-amber-950">{selectedStudentDetail.streakDays ?? 0} Hari</span>
              </div>
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 text-center">
                <span className="text-[10px] font-semibold text-slate-600 uppercase block">Tilawah</span>
                <span className="text-xs font-bold text-slate-600 inline-flex items-center justify-center gap-0.5 mt-1">
                  <span className="material-symbols-outlined text-[14px]">lock</span>
                  <span>Dikunci</span>
                </span>
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
        <div className="fixed inset-0 z-[60] bg-[#141b2b]/55 backdrop-blur-sm flex items-center justify-center p-2.5 sm:p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-lg bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-2xl flex flex-col space-y-3.5 sm:space-y-4 border border-[#1b4332]/10 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start sm:items-center justify-between gap-2 pb-3 border-b border-[#f1f3ff]">
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <div className="w-9 h-9 rounded-xl bg-[#012d1d] text-[#fed488] flex items-center justify-center font-bold shadow-xs shrink-0">
                  <span className="material-symbols-outlined text-[20px]">group_add</span>
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm sm:text-base font-bold text-[#141b2b] truncate">
                    Daftar Halaqah Baru
                  </h3>
                  <p className="text-[11px] sm:text-xs text-[#414844] truncate">
                    Registrasi kelompok halaqah binaan resmi Dept HX
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowAddHalaqahModal(false)}
                className="w-8 h-8 rounded-full bg-[#f1f3ff] flex items-center justify-center text-[#414844] hover:bg-[#e4e7ff] transition-colors cursor-pointer shrink-0"
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
                    Ustadz/ah Pembimbing / Supervisor
                  </label>
                  <input
                    type="text"
                    value={newHalaqahSupervisor}
                    onChange={(e) => setNewHalaqahSupervisor(e.target.value)}
                    placeholder="Contoh: Ustadz Ahmad Dahlan / Ustadzah Fatimah"
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
        <div className="fixed inset-0 z-[70] bg-[#141b2b]/65 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in zoom-in-95 duration-150">
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
                className="px-4 sm:flex-1 min-h-[40px] py-2.5 rounded-full bg-[#f1f3ff] hover:bg-[#e4e7ff] text-[#414844] text-xs font-bold transition-colors cursor-pointer whitespace-nowrap inline-flex items-center justify-center shrink-0"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={confirmRemoveMember}
                className="flex-1 min-h-[40px] px-3.5 py-2.5 rounded-full bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition-all shadow-md active:scale-95 cursor-pointer inline-flex items-center justify-center gap-1.5 whitespace-nowrap"
              >
                <span className="material-symbols-outlined text-[16px] shrink-0">check</span>
                <span>Ya, Keluarkan</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Pop Up Pindahkan Anggota ke Halaqah Lain */}
      {transferringMemberTarget && (
        <div className="fixed inset-0 z-[70] bg-[#141b2b]/65 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in zoom-in-95 duration-150">
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
                    .map((h, idx) => (
                      <option key={`${h.id || h.name}-${idx}`} value={h.name}>
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
                className="px-5 sm:flex-1 min-h-[40px] py-2.5 rounded-full bg-[#f1f3ff] hover:bg-[#e4e7ff] text-[#414844] text-xs font-bold transition-colors cursor-pointer whitespace-nowrap inline-flex items-center justify-center shrink-0"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={confirmTransferMember}
                className="flex-1 min-h-[40px] px-3.5 py-2.5 rounded-full bg-[#012d1d] hover:bg-[#1b4332] text-white text-[11px] sm:text-xs font-bold transition-all shadow-md active:scale-95 cursor-pointer inline-flex items-center justify-center gap-1.5 whitespace-nowrap"
              >
                <span className="material-symbols-outlined text-[15px] sm:text-[16px] text-[#fed488] shrink-0">check</span>
                <span>Pindahkan Sekarang</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Pop Up Konfirmasi Hapus Halaqah */}
      {deletingHalaqahTarget && (
        <div className="fixed inset-0 z-[70] bg-[#141b2b]/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in zoom-in-95 duration-150">
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
                className="flex-1 min-h-[40px] px-3.5 py-2.5 rounded-full bg-[#f1f3ff] hover:bg-[#e4e7ff] text-[#414844] text-xs font-bold transition-colors cursor-pointer whitespace-nowrap inline-flex items-center justify-center"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={confirmDeleteHalaqah}
                className="flex-1 min-h-[40px] px-3.5 py-2.5 rounded-full bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition-all shadow-md active:scale-95 cursor-pointer inline-flex items-center justify-center gap-1.5 whitespace-nowrap"
              >
                <span className="material-symbols-outlined text-[16px] shrink-0">delete</span>
                <span>Ya, Hapus</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Pop Up Konfirmasi Hapus Karyawan */}
      {deletingStudentTarget && (
        <div className="fixed inset-0 z-[70] bg-[#141b2b]/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in zoom-in-95 duration-150">
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
                className="flex-1 min-h-[40px] px-3.5 py-2.5 rounded-full bg-[#f1f3ff] hover:bg-[#e4e7ff] text-[#414844] text-xs font-bold transition-colors cursor-pointer whitespace-nowrap inline-flex items-center justify-center"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={confirmDeleteStudent}
                className="flex-1 min-h-[40px] px-3.5 py-2.5 rounded-full bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition-all shadow-md active:scale-95 cursor-pointer inline-flex items-center justify-center gap-1.5 whitespace-nowrap"
              >
                <span className="material-symbols-outlined text-[16px] shrink-0">delete</span>
                <span>Ya, Hapus</span>
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Modal: Lembar Presensi Lengkap Sesi (Dept HX) */}
      {selectedAttendanceSessionDetail && (
        <div className="fixed inset-0 z-[60] bg-[#141b2b]/55 backdrop-blur-sm flex items-center justify-center p-2.5 sm:p-4 overflow-y-auto animate-in fade-in duration-150">
          <div className="w-full max-w-2xl bg-white rounded-2xl sm:rounded-3xl p-3.5 sm:p-6 shadow-2xl flex flex-col max-h-[90vh] overflow-hidden border border-[#1b4332]/10 my-auto animate-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="flex items-start justify-between pb-3 border-b border-[#f1f3ff] gap-2">
              <div className="min-w-0 flex-1">
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
                <h3 className="text-sm sm:text-lg font-bold text-[#141b2b] mt-1.5 break-words">
                  {selectedAttendanceSessionDetail.sessionTitle}
                </h3>
                <p className="text-[11px] sm:text-xs text-[#717973] flex items-center gap-1 mt-0.5">
                  <span className="material-symbols-outlined text-[14px] shrink-0">location_on</span>
                  <span className="truncate">{selectedAttendanceSessionDetail.location}</span>
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
            <div className="flex-1 overflow-y-auto py-3 space-y-3.5 sm:space-y-4 pr-0.5 sm:pr-1">
              {/* Presensi Ustadz/ah */}
              <div className="p-3 sm:p-3.5 rounded-2xl bg-[#f9f9ff] border border-[#1b4332]/10 space-y-2">
                <div className="flex items-center justify-between flex-wrap gap-1.5">
                  <span className="text-[10px] font-bold text-[#717973] uppercase tracking-wider">
                    Presensi {getUstadzTitle(selectedAttendanceSessionDetail.ustadzName)} Pembimbing
                  </span>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${
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
                      ? `${getUstadzTitle(selectedAttendanceSessionDetail.ustadzPenggantiName)} Pengganti (Badal)`
                      : selectedAttendanceSessionDetail.ustadzStatus === 'izin'
                      ? 'Izin'
                      : 'Sakit'}
                  </span>
                </div>

                <div className="flex items-center gap-2.5 min-w-0">
                  <PremiumInitialAvatar
                    name={selectedAttendanceSessionDetail.ustadzName}
                    role="admin"
                    className="w-9 h-9 rounded-full ring-2 ring-white shadow-xs shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <h4 className="text-xs sm:text-sm font-bold text-[#141b2b] truncate">
                      {formatSupervisorDisplayName(selectedAttendanceSessionDetail.ustadzName)}
                    </h4>
                    <p className="text-[11px] text-[#717973] truncate">
                      Pengampu Resmi {selectedAttendanceSessionDetail.halaqahName}
                    </p>
                  </div>
                </div>

                {selectedAttendanceSessionDetail.ustadzStatus === 'pengganti' && selectedAttendanceSessionDetail.ustadzPenggantiName && (
                  <div className="p-2.5 rounded-xl bg-blue-50 border border-blue-200/60 text-xs text-blue-900">
                    <span className="font-bold text-blue-800 block text-[10px] uppercase">Informasi {getUstadzTitle(selectedAttendanceSessionDetail.ustadzPenggantiName)} Pengganti:</span>
                    <div className="flex flex-col gap-0.5 mt-1">
                      <span>Nama: <strong>{formatSupervisorDisplayName(selectedAttendanceSessionDetail.ustadzPenggantiName)}</strong></span>
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
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                    <div className="p-2 sm:p-2.5 rounded-xl bg-emerald-50 border border-emerald-200/60">
                      <span className="text-[10px] font-bold text-emerald-800 uppercase block">Hadir</span>
                      <span className="text-base font-extrabold text-emerald-950 tabular-nums">
                        {selectedAttendanceSessionDetail.presentCount}
                      </span>
                    </div>
                    <div className="p-2 sm:p-2.5 rounded-xl bg-amber-50 border border-amber-200/60">
                      <span className="text-[10px] font-bold text-amber-800 uppercase block">Izin</span>
                      <span className="text-base font-extrabold text-amber-950 tabular-nums">
                        {selectedAttendanceSessionDetail.members.filter((m) => m.status === 'izin').length}
                      </span>
                    </div>
                    <div className="p-2 sm:p-2.5 rounded-xl bg-blue-50 border border-blue-200/60">
                      <span className="text-[10px] font-bold text-blue-800 uppercase block">Sakit</span>
                      <span className="text-base font-extrabold text-blue-950 tabular-nums">
                        {selectedAttendanceSessionDetail.members.filter((m) => m.status === 'sakit').length}
                      </span>
                    </div>
                    <div className="p-2 sm:p-2.5 rounded-xl bg-rose-50 border border-rose-200/60">
                      <span className="text-[10px] font-bold text-rose-800 uppercase block">Alpa</span>
                      <span className="text-base font-extrabold text-rose-950 tabular-nums">
                        {selectedAttendanceSessionDetail.members.filter((m) => m.status === 'alpa').length}
                      </span>
                    </div>
                  </div>

                  {/* Members Attendance Table */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between flex-wrap gap-1.5">
                      <h4 className="text-[11px] sm:text-xs font-bold text-[#141b2b] uppercase tracking-wider">
                        Lembar Kehadiran Anggota ({selectedAttendanceSessionDetail.members.length} Karyawan)
                      </h4>
                      <span className="text-[11px] font-bold text-[#00452c]">
                        {selectedAttendanceSessionDetail.attendanceRate}% Kehadiran
                      </span>
                    </div>

                    <div className="space-y-1.5">
                      {selectedAttendanceSessionDetail.members.map((member, idx) => (
                        <div
                          key={`${member.userId || member.userName}-${idx}`}
                          className="p-2.5 sm:p-3 rounded-xl bg-[#f9f9ff] hover:bg-emerald-50/30 border border-[#1b4332]/10 transition-all flex items-center justify-between gap-2"
                        >
                          <div className="flex items-center gap-2 sm:gap-2.5 min-w-0 flex-1">
                            <span className="w-5 text-center text-xs font-bold text-[#717973] shrink-0">
                              {idx + 1}.
                            </span>
                            <PremiumInitialAvatar
                              name={member.userName}
                              className="w-8 h-8 rounded-full ring-1 ring-white shrink-0"
                            />
                            <div className="min-w-0 flex-1">
                              <h5 className="text-xs sm:text-sm font-bold text-[#141b2b] truncate">
                                {member.userName}
                              </h5>
                              {member.notes ? (
                                <p className="text-[10px] text-[#414844] italic truncate">
                                  Catatan: {member.notes}
                                </p>
                              ) : (
                                <p className="text-[10px] text-[#717973] truncate">
                                  Karyawan Binaan
                                </p>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                            {member.status === 'hadir' && (
                              <span className="px-2 py-0.5 rounded-full bg-[#c1ecd4] text-[#002114] text-[10px] font-bold whitespace-nowrap">
                                +15 XP
                              </span>
                            )}
                            <span
                              className={`px-2 sm:px-2.5 py-0.5 rounded-full text-[10px] font-bold whitespace-nowrap ${
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
            <div className="pt-3 border-t border-[#f1f3ff] flex items-center justify-between flex-wrap gap-2">
              <button
                type="button"
                onClick={() => handleExportSingleSessionCSV(selectedAttendanceSessionDetail)}
                className="px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl bg-[#f1f3ff] hover:bg-[#e4e7ff] text-[#012d1d] text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[16px]">download</span>
                <span>Unduh Sesi Ini (.xlsx)</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedAttendanceSessionDetail(null)}
                className="px-5 py-2 sm:py-2.5 rounded-xl bg-[#012d1d] hover:bg-[#1b4332] text-white text-xs font-bold transition-all shadow-xs cursor-pointer ml-auto"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Detail Tugas Ustadz/ah (Dept HX Monitoring) */}
      {selectedDirectiveDetail && (() => {
        const targetHalaqah = (selectedDirectiveDetail as any).targetHalaqah || 'Semua Halaqah';
        const createdBy = formatSupervisorDisplayName((selectedDirectiveDetail as any).createdBy);
        const isEffectivelyActive = isDirectiveCurrentlyActive(selectedDirectiveDetail);
        const remainingLabel = formatDirectiveRemainingTime(selectedDirectiveDetail);
        const targetMembers = allStudentsList.filter(
          (s: any) =>
            s.role === 'member' &&
            (targetHalaqah === 'Semua Halaqah' || targetHalaqah === 'Semua' || s.halaqah === targetHalaqah)
        );
        const submissions = (selectedDirectiveDetail as any).submissions || [];

        return (
          <div
            onClick={() => setSelectedDirectiveDetail(null)}
            className="fixed inset-0 z-[65] bg-[#141b2b]/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-150"
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-lg bg-white rounded-3xl p-4 sm:p-6 shadow-2xl border border-[#1b4332]/15 space-y-4 my-auto max-h-[88vh] overflow-y-auto animate-in zoom-in-95 duration-150"
            >
              <div className="flex items-start justify-between gap-2 pb-3 border-b border-[#f1f3ff]">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="px-2.5 py-0.5 rounded-full bg-[#c1ecd4] text-[#002114] text-[10px] font-bold">
                      {targetHalaqah}
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-[#f1f3ff] text-[#414844] text-[10px] font-semibold">
                      {selectedDirectiveDetail.type === 'yaumiyah' ? 'Yaumiyah (1 Hari)' : "Usbu'iyah (1 Pekan)"}
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-[#012d1d] text-white text-[10px] font-bold">
                      +{selectedDirectiveDetail.xp} XP
                    </span>
                  </div>
                  <h3 className="text-base font-extrabold text-[#141b2b] mt-1.5 leading-snug">
                    {selectedDirectiveDetail.title}
                  </h3>
                  <p className="text-xs text-[#414844] mt-0.5">
                    {selectedDirectiveDetail.target}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedDirectiveDetail(null)}
                  className="w-8 h-8 rounded-full bg-[#f1f3ff] hover:bg-[#e4e7ff] text-[#414844] flex items-center justify-center cursor-pointer shrink-0"
                >
                  <span className="material-symbols-outlined text-[18px]">close</span>
                </button>
              </div>

              {/* Info Box */}
              <div className="p-3.5 rounded-2xl bg-[#f9f9ff] border border-[#1b4332]/10 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-[#717973]">{getUstadzTitle(createdBy)} Penerbit:</span>
                  <strong className="text-[#141b2b]">{createdBy}</strong>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#717973]">Kategori Tugas:</span>
                  <strong className="text-[#012d1d]">{selectedDirectiveDetail.category}</strong>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#717973]">Status Masa Berlaku:</span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      isEffectivelyActive ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-700'
                    }`}
                  >
                    {isEffectivelyActive ? `Aktif • ${remainingLabel}` : 'Nonaktif / Selesai'}
                  </span>
                </div>
                <div className="pt-1 border-t border-[#f1f3ff]">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[#717973]">Tingkat Kepatuhan Halaqah:</span>
                    <strong className="text-[#00452c]">{selectedDirectiveDetail.compliancePercent}%</strong>
                  </div>
                  <div className="w-full bg-[#e9edff] h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-[#00452c] h-full rounded-full transition-all"
                      style={{ width: `${Math.min(100, selectedDirectiveDetail.compliancePercent)}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Target Karyawan List */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#141b2b]">
                    Daftar Karyawan Sasaran ({targetMembers.length} Anggota)
                  </span>
                  {targetHalaqah !== 'Semua Halaqah' && targetHalaqah !== 'Semua' && (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedDirectiveDetail(null);
                        handleOpenHalaqahModal(targetHalaqah);
                      }}
                      className="text-[11px] font-bold text-[#012d1d] hover:underline cursor-pointer"
                    >
                      Buka Halaqah →
                    </button>
                  )}
                </div>

                {targetMembers.length === 0 ? (
                  <div className="p-4 rounded-2xl bg-[#f9f9ff] border border-dashed border-[#1b4332]/15 text-center text-xs text-[#717973]">
                    Belum ada karyawan terdaftar pada kelompok {targetHalaqah}.
                  </div>
                ) : (
                  <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                    {targetMembers.map((member: any, idx: number) => {
                      const sub = submissions.find((s: any) => s.studentId === member.id || s.studentName === member.name);
                      const isDone = sub?.isCompleted;
                      return (
                        <div
                          key={`${member.id || member.name}-${idx}`}
                          onClick={() => {
                            setSelectedDirectiveDetail(null);
                            setSelectedStudentDetail(member);
                          }}
                          className="p-2.5 rounded-xl bg-[#f9f9ff] hover:bg-emerald-50/40 border border-[#1b4332]/8 flex items-center justify-between gap-2 cursor-pointer transition-all"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <PremiumInitialAvatar
                              name={member.name}
                              className="w-8 h-8 rounded-full shrink-0"
                            />
                            <div className="min-w-0">
                              <span className="text-xs font-bold text-[#141b2b] block truncate">
                                {member.name}
                              </span>
                              <span className="text-[10px] text-[#717973] block truncate">
                                {member.halaqah} • {member.totalXp} XP
                              </span>
                            </div>
                          </div>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${
                              isDone
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-amber-50 text-amber-800 border border-amber-200/60'
                            }`}
                          >
                            {isDone ? '✓ Tuntas' : 'Dalam Proses'}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="pt-2 border-t border-[#f1f3ff] flex justify-end">
                <button
                  type="button"
                  onClick={() => setSelectedDirectiveDetail(null)}
                  className="w-full py-2.5 rounded-2xl bg-[#012d1d] hover:bg-[#1b4332] text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
                >
                  Tutup Detail Tugas
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Modal Konfirmasi Hapus Sesi Presensi (Dept HX) */}
      {sessionToDelete && (
        <div className="fixed inset-0 z-[70] bg-[#0c1322]/75 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
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
                <span className="text-[#717973]">{getUstadzTitle(sessionToDelete.ustadzName)}:</span>
                <span className="font-bold text-[#141b2b]">{formatSupervisorDisplayName(sessionToDelete.ustadzName)}</span>
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

      <SecuritySettingsModal
        isOpen={showSecurityModal}
        onClose={() => setShowSecurityModal(false)}
        registeredUsers={registeredUsers || []}
        halaqahList={allHalaqahPresets}
        onUpdateUserPasscode={(userId, newPasscode, role, halaqahName) => {
          if (onUpdateUserPasscode) {
            onUpdateUserPasscode(userId, newPasscode, role, halaqahName);
          }
        }}
        onShowToast={onShowToast}
      />
    </div>
  );
};
