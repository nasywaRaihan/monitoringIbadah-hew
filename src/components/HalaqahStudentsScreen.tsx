import React, { useState } from 'react';
import { ActiveUser, HalaqahAttendanceSession } from '../types';
import { downloadPerColumnCSV } from '../services/csvExport';
import { pushNotification } from '../services/notificationService';
import { PremiumInitialAvatar } from './PremiumInitialAvatar';
import { getUstadzTitle, formatSupervisorDisplayName } from '../services/ustadzTitle';

interface HalaqahStudentsScreenProps {
  activeUser?: ActiveUser;
  registeredUsers: ActiveUser[];
  attendanceSessions?: HalaqahAttendanceSession[];
  onShowToast: (msg: string) => void;
  onDeleteStudent?: (studentId: string) => void;
}

interface StudentPerformanceRecord {
  id: string;
  name: string;
  avatar: string;
  halaqah: string;
  halaqahCode: string;
  xp: number;
  streak: number;
  masjidAttendance: string;
  masjidPercent: number;
  tajweedScore: number;
  lastSurah: string;
  status: 'Mumtaz' | 'Disiplin' | 'Perlu Bimbingan';
  completedDailyTasks: number;
  totalDailyTasks: number;
  recentNotes?: string;
  parentContact?: string;
}

const DEFAULT_HALAQAH_STUDENTS: StudentPerformanceRecord[] = [];

export const HalaqahStudentsScreen: React.FC<HalaqahStudentsScreenProps> = ({
  activeUser,
  registeredUsers,
  attendanceSessions,
  onShowToast,
  onDeleteStudent
}) => {
  const currentHalaqah = activeUser?.halaqah || 'Halaqah Peserta';
  const halaqahCode = activeUser?.halaqahCode || 'HL-1001';
  const supervisorName = formatSupervisorDisplayName(activeUser?.name, activeUser?.gender);
  const ustadzRoleLabel = getUstadzTitle(activeUser);

  // Merge registered members if any match current halaqah
  const [students, setStudents] = useState<StudentPerformanceRecord[]>(() => {
    try {
      const saved = localStorage.getItem('noorworship_halaqah_students_prod_v1');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {}
    return DEFAULT_HALAQAH_STUDENTS;
  });

  const [deletedStudentIds, setDeletedStudentIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('noorworship_deleted_student_ids_prod_v1');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn(e);
    }
    return [];
  });

  const [deletingStudentTarget, setDeletingStudentTarget] = useState<StudentPerformanceRecord | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'Mumtaz' | 'Disiplin' | 'Perlu Bimbingan'>('all');
  const [selectedStudent, setSelectedStudent] = useState<StudentPerformanceRecord | null>(null);
  const [adviceNote, setAdviceNote] = useState('');

  const handleDeleteStudentRecord = (student: StudentPerformanceRecord) => {
    setDeletingStudentTarget(student);
  };

  const confirmDeleteStudentRecord = () => {
    if (!deletingStudentTarget) return;
    const student = deletingStudentTarget;
    setStudents((prev) => {
      const updated = prev.filter((s) => s.id !== student.id && s.name !== student.name);
      try {
        localStorage.setItem('noorworship_halaqah_students_prod_v1', JSON.stringify(updated));
      } catch {}
      return updated;
    });
    setDeletedStudentIds((prev) => {
      const updated = [...prev, student.id, student.name];
      try {
        localStorage.setItem('noorworship_deleted_student_ids_prod_v1', JSON.stringify(updated));
      } catch {}
      return updated;
    });
    if (onDeleteStudent) {
      onDeleteStudent(student.id);
    }
    setSelectedStudent(null);
    setDeletingStudentTarget(null);
    onShowToast(`Data Karyawan "${student.name}" berhasil dihapus.`);
  };

  // Helper to compute real halaqah attendance for a student from attendanceSessions
  const computeStudentHalaqahAttendance = React.useCallback(
    (studentId: string, studentName: string, studentHalaqah: string) => {
      if (!attendanceSessions || attendanceSessions.length === 0) {
        return { label: '0/0 Pertemuan', percent: 0 };
      }
      const normHalaqah = (studentHalaqah || currentHalaqah).toLowerCase();
      const normName = (studentName || '').toLowerCase();

      const matchingSessions = attendanceSessions.filter((session) => {
        const sessionHalaqah = (session.halaqahName || '').toLowerCase();
        const isSameHalaqah = sessionHalaqah === normHalaqah;
        const hasStudent = (session.members || []).some(
          (m) => m.userId === studentId || (m.userName || '').toLowerCase() === normName
        );
        return isSameHalaqah || hasStudent;
      });

      const total = matchingSessions.length;
      if (total === 0) {
        return { label: '0/0 Pertemuan', percent: 0 };
      }

      const hadirCount = matchingSessions.filter((session) => {
        const memberRecord = (session.members || []).find(
          (m) => m.userId === studentId || (m.userName || '').toLowerCase() === normName
        );
        return memberRecord?.status === 'hadir';
      }).length;

      const percent = Math.round((hadirCount / total) * 100);
      return {
        label: `${hadirCount}/${total} Hadir`,
        percent
      };
    },
    [attendanceSessions, currentHalaqah]
  );

  // Merge dynamically registered users matching current halaqah (strictly members only, excluding Ustadz/ah)
  const effectiveStudents = React.useMemo(() => {
    const map = new Map<string, StudentPerformanceRecord>();

    const nonMemberIds = new Set<string>();
    const nonMemberNames = new Set<string>();
    if (activeUser?.id) nonMemberIds.add(activeUser.id);
    if (activeUser?.name) nonMemberNames.add(activeUser.name.trim().toLowerCase());

    (registeredUsers || []).forEach((u) => {
      if (u.role && u.role !== 'member') {
        nonMemberIds.add(u.id);
        nonMemberNames.add((u.name || '').trim().toLowerCase());
      }
    });

    const isNonMemberRecord = (id?: string, name?: string, role?: string) => {
      if (role && role !== 'member') return true;
      if (id && (nonMemberIds.has(id) || id.startsWith('ustadz-') || id.startsWith('user-ustadz-'))) {
        return true;
      }
      const cleanName = (name || '').trim();
      if (!cleanName) return true;
      if (nonMemberNames.has(cleanName.toLowerCase())) return true;
      if (/^(ustadz\/ah|ustadzah|ustadz|ust\.?)\s+/i.test(cleanName)) return true;
      return false;
    };

    // 1. Add stored/default students with real attendance synced (only if member of this halaqah)
    students.forEach((st) => {
      if (isNonMemberRecord(st.id, st.name)) return;
      if (
        activeUser?.role === 'admin' &&
        st.halaqah &&
        currentHalaqah &&
        st.halaqah.trim().toLowerCase() !== currentHalaqah.trim().toLowerCase()
      ) {
        return;
      }
      const att = computeStudentHalaqahAttendance(st.id, st.name, st.halaqah);
      map.set(st.id, {
        ...st,
        masjidAttendance: att.label,
        masjidPercent: att.percent
      });
    });

    // 2. Add registered users from Dept HX (strictly role === 'member')
    if (registeredUsers && registeredUsers.length > 0) {
      registeredUsers.forEach((u) => {
        if (isNonMemberRecord(u.id, u.name, u.role)) return;
        const uHalaqah = u.halaqah || 'Halaqah Peserta';
        const isMatch =
          u.role === 'member' &&
          (uHalaqah === currentHalaqah ||
            currentHalaqah === 'Dept HX Pusat' ||
            activeUser?.role === 'dept-hx' ||
            activeUser?.role === 'hq-admin');

        if (isMatch) {
          const existing = map.get(u.id);
          const att = computeStudentHalaqahAttendance(u.id, u.name, uHalaqah);
          map.set(u.id, {
            id: u.id,
            name: u.name,
            avatar: u.avatar || existing?.avatar || '',
            halaqah: uHalaqah,
            halaqahCode: u.halaqahCode || existing?.halaqahCode || halaqahCode,
            xp: u.totalXp ?? existing?.xp ?? 0,
            streak: u.streakDays ?? existing?.streak ?? 0,
            masjidAttendance: att.label,
            masjidPercent: att.percent,
            tajweedScore: existing?.tajweedScore ?? 0,
            lastSurah: existing?.lastSurah || '-',
            status: existing?.status || ((u.totalXp || 0) >= 500 ? 'Mumtaz' : 'Disiplin'),
            completedDailyTasks: existing?.completedDailyTasks ?? 0,
            totalDailyTasks: existing?.totalDailyTasks ?? 0,
            recentNotes: existing?.recentNotes || `Karyawan resmi ${uHalaqah} terdaftar via Dept HX.`,
            parentContact: u.phone || existing?.parentContact || '-'
          });
        }
      });
    }

    return Array.from(map.values()).filter(
      (s) => !deletedStudentIds.includes(s.id) && !deletedStudentIds.includes(s.name)
    );
  }, [
    students,
    registeredUsers,
    currentHalaqah,
    halaqahCode,
    activeUser?.id,
    activeUser?.name,
    activeUser?.role,
    deletedStudentIds,
    computeStudentHalaqahAttendance
  ]);

  const filteredStudents = effectiveStudents.filter((s) => {
    const matchesSearch =
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.lastSurah.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || s.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleOpenDetail = (student: StudentPerformanceRecord) => {
    setSelectedStudent(student);
    setAdviceNote(student.recentNotes || '');
  };

  const handleSaveAdvice = () => {
    if (!selectedStudent) return;
    const note = adviceNote.trim();
    setStudents((prev) =>
      prev.map((s) =>
        s.id === selectedStudent.id ? { ...s, recentNotes: note } : s
      )
    );
    try {
      const updated = students.map((s) =>
        s.id === selectedStudent.id ? { ...s, recentNotes: note } : s
      );
      localStorage.setItem('noorworship_halaqah_students_prod_v1', JSON.stringify(updated));
    } catch {}
    if (note) {
      pushNotification({
        targetUserId: selectedStudent.id,
        recipientName: selectedStudent.name,
        targetHalaqah: selectedStudent.halaqah,
        senderName: supervisorName,
        title: `Catatan Bimbingan ${ustadzRoleLabel}`,
        message: note,
        type: 'reminder',
      });
    }
    onShowToast(`Catatan bimbingan untuk ${selectedStudent.name} berhasil disimpan & dikirim ke notifikasi!`);
    setSelectedStudent(null);
  };

  const handleExportExcel = () => {
    const headers = [
      'No',
      'ID Karyawan',
      'Nama Karyawan',
      'Halaqah',
      'Kode Halaqah',
      'Ustadz/ah Pembimbing',
      'Status Mutabaah',
      'Total XP',
      'Streak Hari',
      'Presensi Shalat Masjid',
      'Persen Presensi',
      'Skor Tajwid Ujian',
      'Surah Terakhir',
      'Kontak Darurat',
      'Catatan Ustadz/ah'
    ];

    const rows = effectiveStudents.map((s, idx) => [
      idx + 1,
      s.id,
      s.name,
      s.halaqah,
      s.halaqahCode,
      supervisorName,
      s.status,
      s.xp,
      s.streak,
      s.masjidAttendance,
      `${s.masjidPercent}%`,
      s.tajweedScore,
      s.lastSurah,
      s.parentContact || '-',
      s.recentNotes || ''
    ]);

    const dateStr = new Date().toISOString().slice(0, 10);
    const filename = `Rekap_Karyawan_${currentHalaqah.replace(/\s+/g, '_')}_${dateStr}`;
    downloadPerColumnCSV(filename, headers, rows);
    onShowToast(`File Excel rekap karyawan ${currentHalaqah} berhasil diunduh (per kolom rapi)!`);
  };

  const avgAttendance = effectiveStudents.length > 0
    ? Math.round(
        effectiveStudents.reduce((acc, s) => acc + s.masjidPercent, 0) / effectiveStudents.length
      )
    : 0;
  const mumtazCount = effectiveStudents.filter((s) => s.status === 'Mumtaz').length;
  const activeSelectedStudent = selectedStudent
    ? effectiveStudents.find((s) => s.id === selectedStudent.id) || selectedStudent
    : null;

  return (
    <div className="flex flex-col w-full px-4 md:px-6 py-3 space-y-4 max-w-4xl mx-auto pb-28">
      {/* Halaqah Header Card */}
      <div className="relative overflow-hidden rounded-2xl bg-[#012d1d] text-white p-3.5 sm:p-5 shadow-md">
        <div className="absolute -right-10 -top-10 w-44 h-44 rounded-full bg-[#00452c]/40 blur-2xl pointer-events-none" />
        <div className="absolute -left-10 -bottom-10 w-36 h-36 rounded-full bg-[#fed488]/20 blur-xl pointer-events-none" />

        <div className="relative z-10 flex flex-col gap-2.5 sm:gap-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
              <span className="inline-flex items-center justify-center w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-white/15 text-[#ffdea5] shrink-0">
                <span className="material-symbols-outlined text-[16px] sm:text-[18px]">groups</span>
              </span>
              <span className="text-[11px] sm:text-xs uppercase tracking-wider text-[#86af99] font-bold truncate">
                Direktori Karyawan Peserta
              </span>
            </div>
            <span className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-full bg-white/10 text-white text-[10px] sm:text-xs font-semibold backdrop-blur-md shrink-0 whitespace-nowrap">
              <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-[#92f7c3] animate-pulse shrink-0" />
              Kode: {halaqahCode}
            </span>
          </div>

          <div>
            <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight">
              {currentHalaqah}
            </h2>
            <p className="text-[11px] sm:text-xs text-[#86af99] mt-0.5 leading-snug">
              {ustadzRoleLabel} Pembimbing: <strong className="text-white">{supervisorName}</strong> • {effectiveStudents.length} Karyawan Peserta Aktif
            </p>
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-3 gap-1.5 sm:gap-2 pt-1">
            <div className="flex flex-col justify-between p-2 sm:p-3 rounded-xl bg-white/10 backdrop-blur-sm min-w-0 overflow-hidden select-none">
              <span className="text-[10px] sm:text-[11px] text-[#86af99] font-medium leading-tight">Karyawan Mumtaz</span>
              <div className="flex items-baseline flex-wrap gap-x-1 gap-y-0 mt-1 sm:mt-0.5">
                <span className="text-base sm:text-lg font-bold text-[#ffdea5] tabular-nums leading-none">{mumtazCount}</span>
                <span className="text-[10px] sm:text-xs text-[#ffdea5]/80 leading-tight">/{effectiveStudents.length}</span>
              </div>
            </div>

            <div className="flex flex-col justify-between p-2 sm:p-3 rounded-xl bg-white/10 backdrop-blur-sm min-w-0 overflow-hidden select-none">
              <span className="text-[10px] sm:text-[11px] text-[#86af99] font-medium leading-tight">Presensi Jamaah</span>
              <div className="flex items-baseline flex-wrap gap-x-1 gap-y-0 mt-1 sm:mt-0.5">
                <span className="text-base sm:text-lg font-bold text-white tabular-nums leading-none">{avgAttendance}%</span>
                <span className="text-[10px] sm:text-xs text-[#92f7c3] font-semibold leading-tight">Tepat Waktu</span>
              </div>
            </div>

            <div className="flex flex-col justify-between p-2 sm:p-3 rounded-xl bg-white/10 backdrop-blur-sm min-w-0 overflow-hidden select-none">
              <span className="text-[10px] sm:text-[11px] text-[#86af99] font-medium leading-tight">Penilaian Tilawah</span>
              <div className="flex items-center flex-wrap gap-x-1 gap-y-0 mt-1 sm:mt-0.5">
                <span className="inline-flex items-center gap-1 text-xs sm:text-sm font-bold text-[#ffdea5] leading-none">
                  <span className="material-symbols-outlined text-[14px]">lock</span>
                  <span>Dikunci</span>
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Action Bar: Search, Filters & Export */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
        <div className="relative flex-1">
          <span className="material-symbols-outlined text-[18px] text-[#717973] absolute left-3 top-1/2 -translate-y-1/2">
            search
          </span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari karyawan berdasarkan nama atau surah..."
            className="w-full pl-9 pr-3 py-2 rounded-xl bg-white border border-[#1b4332]/10 text-xs text-[#141b2b] placeholder:text-[#717973] focus:outline-none focus:border-[#012d1d] shadow-2xs"
          />
        </div>

        <button
          onClick={handleExportExcel}
          className="px-3.5 py-2 rounded-xl bg-[#012d1d] hover:bg-[#1b4332] text-white text-xs font-bold transition-all shadow-sm active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
        >
          <span className="material-symbols-outlined text-[16px]">file_download</span>
          <span>Unduh Rekap Excel</span>
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
        <button
          onClick={() => setStatusFilter('all')}
          className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
            statusFilter === 'all'
              ? 'bg-[#012d1d] text-white shadow-2xs'
              : 'bg-[#f1f3ff] text-[#414844] hover:bg-[#e9edff]'
          }`}
        >
          Semua Karyawan ({effectiveStudents.length})
        </button>
        <button
          onClick={() => setStatusFilter('Mumtaz')}
          className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
            statusFilter === 'Mumtaz'
              ? 'bg-[#012d1d] text-white shadow-2xs'
              : 'bg-[#f1f3ff] text-[#414844] hover:bg-[#e9edff]'
          }`}
        >
          🌟 Mumtaz ({effectiveStudents.filter((s) => s.status === 'Mumtaz').length})
        </button>
        <button
          onClick={() => setStatusFilter('Disiplin')}
          className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
            statusFilter === 'Disiplin'
              ? 'bg-[#012d1d] text-white shadow-2xs'
              : 'bg-[#f1f3ff] text-[#414844] hover:bg-[#e9edff]'
          }`}
        >
          ✅ Disiplin ({effectiveStudents.filter((s) => s.status === 'Disiplin').length})
        </button>
        <button
          onClick={() => setStatusFilter('Perlu Bimbingan')}
          className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
            statusFilter === 'Perlu Bimbingan'
              ? 'bg-[#ba1a1a] text-white shadow-2xs'
              : 'bg-[#ffdad6]/60 text-[#ba1a1a] hover:bg-[#ffdad6]'
          }`}
        >
          ⚠️ Perlu Bimbingan ({effectiveStudents.filter((s) => s.status === 'Perlu Bimbingan').length})
        </button>
      </div>

      {/* Students List Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {filteredStudents.map((student) => {
          const isMumtaz = student.status === 'Mumtaz';
          const isNeedsAttention = student.status === 'Perlu Bimbingan';

          return (
            <div
              key={student.id}
              onClick={() => handleOpenDetail(student)}
              className="p-4 rounded-2xl bg-white border border-[#1b4332]/8 hover:border-[#012d1d]/30 shadow-sm flex flex-col justify-between gap-3 hover:shadow-md transition-all cursor-pointer"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <PremiumInitialAvatar
                    name={student.name}
                    className="w-12 h-12 rounded-full shrink-0 border border-[#1b4332]/10 shadow-2xs"
                  />
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <h4 className="text-sm font-bold text-[#141b2b] truncate">
                        {student.name}
                      </h4>
                      <span
                        className={`px-2 py-0.2 rounded-full text-[10px] font-bold ${
                          isMumtaz
                            ? 'bg-[#c1ecd4] text-[#002114]'
                            : isNeedsAttention
                            ? 'bg-[#ffdad6] text-[#93000a]'
                            : 'bg-[#fed488]/50 text-[#775a19]'
                        }`}
                      >
                        {student.status}
                      </span>
                    </div>
                    <span className="text-[11px] text-[#717973] block mt-0.5">
                      {student.halaqah} • ID: {student.id.replace('user-', '')}
                    </span>
                  </div>
                </div>

                <div className="flex flex-col items-end shrink-0">
                  <span className="text-xs font-bold text-[#012d1d] bg-[#e9edff] px-2 py-0.5 rounded-full">
                    +{student.xp} XP
                  </span>
                  <span className="text-[10px] text-[#775a19] font-semibold mt-1 flex items-center gap-0.5">
                    🔥 {student.streak} hari
                  </span>
                </div>
              </div>


              <div className="flex items-center justify-between text-xs pt-1 border-t border-[#f1f3ff]">
                <div className="min-w-0 pr-2">
                  <span className="text-[11px] text-[#717973] inline-flex items-center gap-1 truncate">
                    <span className="material-symbols-outlined text-[13px]">lock</span>
                    <span>Tilawah Dikunci</span>
                  </span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteStudentRecord(student);
                    }}
                    className="p-1.5 rounded-full bg-red-50 hover:bg-red-100 text-red-600 transition-colors cursor-pointer"
                    title={`Hapus Karyawan ${student.name}`}
                  >
                    <span className="material-symbols-outlined text-[15px]">delete</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleOpenDetail(student)}
                    className="px-3 py-1.5 rounded-full bg-[#f1f3ff] hover:bg-[#e4e7ff] text-[#012d1d] font-bold text-xs flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[14px]">rate_review</span>
                    <span>Bimbingan</span>
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {filteredStudents.length === 0 && (
        <div className="p-8 text-center bg-white rounded-2xl border border-[#1b4332]/5 space-y-2">
          <span className="material-symbols-outlined text-[36px] text-[#717973]">
            person_search
          </span>
          <p className="text-sm font-bold text-[#141b2b]">Karyawan Tidak Ditemukan</p>
          <p className="text-xs text-[#717973]">
            Tidak ada karyawan yang cocok dengan kata kunci &quot;{searchQuery}&quot; pada filter ini.
          </p>
        </div>
      )}

      {/* Student Detail & Guidance Modal */}
      {selectedStudent && (
        <div className="fixed inset-0 z-[60] bg-[#141b2b]/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-2xl space-y-4 max-h-[85vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start justify-between pb-3 border-b border-[#f1f3ff]">
              <div className="flex items-center gap-3">
                <PremiumInitialAvatar
                  name={selectedStudent.name}
                  className="w-12 h-12 rounded-full border border-[#1b4332]/10"
                />
                <div>
                  <h3 className="font-bold text-sm text-[#141b2b]">
                    {selectedStudent.name}
                  </h3>
                  <p className="text-xs text-[#717973]">
                    {selectedStudent.halaqah} • Status: <strong className="text-[#012d1d]">{selectedStudent.status}</strong>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedStudent(null)}
                className="w-8 h-8 rounded-full bg-[#f1f3ff] flex items-center justify-center text-[#414844] cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            {/* Performance Snapshot */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-[#141b2b] block">
                Rangkuman Amalan &amp; Kepatuhan
              </span>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2.5 rounded-xl bg-[#f1f3ff]">
                  <span className="text-[10px] text-[#717973] block">Kehadiran Halaqah</span>
                  <span className="font-bold text-sm text-[#141b2b]">
                    {activeSelectedStudent?.masjidAttendance || selectedStudent.masjidAttendance}
                  </span>
                  <div className="w-full bg-[#c1c8c2] h-1.5 rounded-full mt-1.5 overflow-hidden">
                    <div
                      className="bg-[#00452c] h-full rounded-full transition-all duration-300"
                      style={{ width: `${activeSelectedStudent?.masjidPercent ?? selectedStudent.masjidPercent}%` }}
                    />
                  </div>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 flex flex-col justify-between">
                  <span className="text-[10px] text-[#717973] block">Skor Ujian Tilawah</span>
                  <span className="inline-flex items-center gap-1 font-bold text-xs text-slate-600 mt-1">
                    <span className="material-symbols-outlined text-[15px]">lock</span>
                    <span>Dikunci Sementara</span>
                  </span>
                </div>
              </div>
            </div>



            {/* Catatan Bimbingan / Nasihat Ustadz/ah */}
            <div>
              <label className="text-xs font-bold text-[#141b2b] mb-1.5 block">
                Catatan Bimbingan &amp; Arahan {ustadzRoleLabel}
              </label>
              <textarea
                rows={3}
                value={adviceNote}
                onChange={(e) => setAdviceNote(e.target.value)}
                placeholder="Tuliskan nasihat atau arahan evaluasi tajwid / shalat karyawan..."
                className="w-full p-3 rounded-xl bg-[#f1f3ff] text-xs text-[#141b2b] placeholder:text-[#717973] border border-transparent focus:border-[#012d1d] focus:outline-none"
              />
              <span className="text-[10px] text-[#717973] mt-1 block">
                Catatan ini akan tersimpan pada mutaba&apos;ah rekap karyawan halaqah.
              </span>
            </div>

            <div className="flex items-center gap-2 pt-2 border-t border-[#f1f3ff]">
              <button
                type="button"
                onClick={() => handleDeleteStudentRecord(selectedStudent)}
                className="px-3 py-2.5 rounded-full bg-red-50 hover:bg-red-100 text-red-600 font-bold text-xs flex items-center justify-center gap-1 border border-red-200 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[15px]">delete</span>
                <span>Hapus</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedStudent(null)}
                className="flex-1 py-2.5 rounded-full bg-[#f1f3ff] text-xs font-bold text-[#414844] cursor-pointer hover:bg-[#e4e7ff]"
              >
                Tutup
              </button>
              <button
                type="button"
                onClick={handleSaveAdvice}
                className="flex-1 py-2.5 rounded-full bg-[#012d1d] hover:bg-[#1b4332] text-white text-xs font-bold cursor-pointer shadow-sm"
              >
                Simpan Catatan
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
                Data karyawan akan dihapus dari halaqah.
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
                onClick={confirmDeleteStudentRecord}
                className="flex-1 py-2.5 rounded-full bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition-all shadow-md active:scale-95 cursor-pointer flex items-center justify-center gap-1"
              >
                <span className="material-symbols-outlined text-[16px]">delete</span>
                <span>Ya, Hapus</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
