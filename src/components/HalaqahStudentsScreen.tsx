import React, { useState } from 'react';
import { ActiveUser } from '../types';
import { downloadPerColumnCSV } from '../services/csvExport';

interface HalaqahStudentsScreenProps {
  activeUser?: ActiveUser;
  registeredUsers: ActiveUser[];
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

const DEFAULT_HALAQAH_STUDENTS: StudentPerformanceRecord[] = [
  {
    id: 'user-zubair',
    name: 'Zubair Ahmed',
    avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDD9rhoZ_oKw2kaX_ib087jl58ZWxEyxXJe-f4-lkyam50XjJD1y4vmoJo_OP09N6wOgiWdvpNv5yr2G5JpuvLbm3TjeqXW0MHbuS6TtuFe6htOFVs18a00iBznKV3vany3LAk28L6AP7NVZ7sHf96ricgJ9NAjW7IvzR3eOOx6e1jpn11EVj5B7ar7C5WcI3CuYTneLk3RmV3-rVsJ7YE27-9cIjSlc_qil1T1R8WayBovHjw6vbVCog',
    halaqah: 'Halaqah Al-Fajr',
    halaqahCode: 'HF-4092',
    xp: 1420,
    streak: 7,
    masjidAttendance: '19/20 Hadir',
    masjidPercent: 95,
    tajweedScore: 94,
    lastSurah: 'Al-Mulk (Ayat 1–10)',
    status: 'Mumtaz',
    completedDailyTasks: 5,
    totalDailyTasks: 6,
    recentNotes: 'Makhraj huruf jim dan shad sudah sangat mantap. Tingkatkan konsistensi rawatib zhuhur.',
    parentContact: '+62 812-3344-5566'
  },
  {
    id: 'user-zayd',
    name: 'Zayd Al-Amin',
    avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDFaQMyKnk2iLn9PRfVmgzOfoHE-e58Ab-VQMcTGdrxacm8wwW5nVi98gYcmjd_aHSNCKD0sbLlHflF6AoNGqxQ_Qheo_UDWOWgK1ivvZ9y8uvq7cdAjlrY5W6ibzXVRWlgMIxEXSbSK4NBiLsJ_1i-PslkBNixofnYzQWHbJhPmdsvZPmjWmq9Gf7Q02c1TuG4PIm9KXJKPp4IwrwHIie0wPPqYICwOCcU4f0tryN4MvTSkghJ6IZD_Q',
    halaqah: 'Halaqah Al-Fajr',
    halaqahCode: 'HF-4092',
    xp: 2410,
    streak: 12,
    masjidAttendance: '20/20 Hadir',
    masjidPercent: 100,
    tajweedScore: 96,
    lastSurah: 'Al-Mulk (Ayat 11–20)',
    status: 'Mumtaz',
    completedDailyTasks: 6,
    totalDailyTasks: 6,
    recentNotes: 'Tartil sempurna dengan tempo tilawah tenang. Rekomendasi naik ke juz berikutnya.',
    parentContact: '+62 813-8899-7700'
  },
  {
    id: 'user-hamza',
    name: 'Hamza Malik',
    avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuB2YNn3chwgvghi6bKAIGsEzSZIzx99nw2u8pS2HThk7F2THKw9y_ZhJ73dPHqsFS5__dExkPODyFeOt9GlkDytTjgroH4QSsM-9u4UY7NyIckRf-mt5ODfKBkVhZrAJAMEE_ch6sgUPNZPoQiwyPK8UrO9txsSCxA5ef_AS0q7wtGhzwvUAqX63PHPh3ZYRGVzAEi4MbythULEXgVF332iusFnFVQWQj-P7H_7YG-MLqFDxNZDHqiXgA',
    halaqah: 'Halaqah Al-Fajr',
    halaqahCode: 'HF-4092',
    xp: 1150,
    streak: 5,
    masjidAttendance: '15/20 Hadir',
    masjidPercent: 75,
    tajweedScore: 78,
    lastSurah: 'Surah Yasin (Ayat 1–15)',
    status: 'Perlu Bimbingan',
    completedDailyTasks: 3,
    totalDailyTasks: 6,
    recentNotes: 'Perlu latihan qalqalah kubra di akhir ayat 14 dan menjaga shalat subuh tepat waktu.',
    parentContact: '+62 821-4455-6677'
  },
  {
    id: 'user-omar',
    name: 'Omar Farooq',
    avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuC4PTvyt7-_5JmT_ZnOQdWxtCuYIdE--3_gxAqVzj0NOc7N6_bqcvR21UCMvLTCzQdSoO3QZCtryytN_R4zYIe6ouKr5cB3cssSdChFRePHKZSDaaXn_S08wLQV7Ax_gzj8D0vcg7rup-E9Mk7skIWgMoRtxrosUMDFBDS8RdcWpECxK8hYWjqTigBKC8yPkVSNQ_WhGKTJSLp1f9CZkzeWwWQhOjjjSz-kX7pqCPtyJkxmXIvjT6NrGg',
    halaqah: 'Halaqah Al-Fajr',
    halaqahCode: 'HF-4092',
    xp: 1890,
    streak: 15,
    masjidAttendance: '18/20 Hadir',
    masjidPercent: 90,
    tajweedScore: 91,
    lastSurah: 'Al-Waqi’ah (Ayat 1–30)',
    status: 'Disiplin',
    completedDailyTasks: 5,
    totalDailyTasks: 6,
    recentNotes: 'Disiplin dzikir pagi petang sangat baik. Perhatikan dengung ikhfa haqiqi.',
    parentContact: '+62 856-1122-3344'
  },
  {
    id: 'user-bilal',
    name: 'Bilal Ar-Rasyid',
    avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAwgfRenieAlLRgHUPBwuuS-VTNTWIvwIb8DzHtL_B5CLE3pAvEuRHzWp-wAjL3DfFpwMDNIdV7pJVzgLweGWHQiDvVtrlBkgNA3Qc5hwsd94xQeucsbYmxOcjLbapMBO3loC4DIM60u4t4xLR_dRLbM7l-107koAC54gjokfg5zXjyvGelfNRPldGZAwEIK_jsLYyImLvfKchPKQQSD1lZuSfL5CLgdvxbPEVheGbvjpOSflgx7GT8Cw',
    halaqah: 'Halaqah Al-Fajr',
    halaqahCode: 'HF-4092',
    xp: 1680,
    streak: 8,
    masjidAttendance: '17/20 Hadir',
    masjidPercent: 85,
    tajweedScore: 89,
    lastSurah: 'Al-Mulk (Ayat 1–15)',
    status: 'Disiplin',
    completedDailyTasks: 4,
    totalDailyTasks: 6,
    recentNotes: 'Tilawah harian one day one juz berjalan tertib. Pertahankan hafalan juz 29.',
    parentContact: '+62 811-9988-7766'
  },
  {
    id: 'user-faris',
    name: 'Faris Al-Banjari',
    avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDD5eNA6Cc-haxAb47iyA_T5sVq_esnqNS7ElzveTLKE5rxANA6DJjN84DSl41N4Vj46zDGw4UYabLdXU7nq04zEKgiSUntFivHLumiM1gofA2RwV6bR9Z_Y9NxZVSWr2jTomP_XSUAxKAX3tJPw0ZjCMqI68v5L85TLG9CMhWMPzMfCeKxpgODtb-3S8UNT5hlf-TU20-fu-pKPCnI95v9xK5yxmOIp8eoFKZpvymwvnWKqd7dz_Q9pQ',
    halaqah: 'Halaqah Al-Fajr',
    halaqahCode: 'HF-4092',
    xp: 1350,
    streak: 6,
    masjidAttendance: '16/20 Hadir',
    masjidPercent: 80,
    tajweedScore: 88,
    lastSurah: 'Ar-Rahman (Ayat 1–25)',
    status: 'Disiplin',
    completedDailyTasks: 4,
    totalDailyTasks: 6,
    recentNotes: 'Suara tartil lantang dan jelas. Perhatikan panjang mad wajib muttashil.',
    parentContact: '+62 878-3322-1100'
  }
];

export const HalaqahStudentsScreen: React.FC<HalaqahStudentsScreenProps> = ({
  activeUser,
  registeredUsers,
  onShowToast,
  onDeleteStudent
}) => {
  const currentHalaqah = activeUser?.halaqah || 'Halaqah Al-Fajr';
  const halaqahCode = activeUser?.halaqahCode || 'HF-4092';
  const supervisorName = activeUser?.name || 'Ustadz Farhan';

  // Merge registered members if any match current halaqah
  const [students, setStudents] = useState<StudentPerformanceRecord[]>(() => {
    try {
      const saved = localStorage.getItem('noorworship_halaqah_students_v1');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return DEFAULT_HALAQAH_STUDENTS;
  });

  const [deletedStudentIds, setDeletedStudentIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('noorworship_deleted_student_ids_v1');
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
        localStorage.setItem('noorworship_halaqah_students_v1', JSON.stringify(updated));
      } catch {}
      return updated;
    });
    setDeletedStudentIds((prev) => {
      const updated = [...prev, student.id, student.name];
      try {
        localStorage.setItem('noorworship_deleted_student_ids_v1', JSON.stringify(updated));
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

  // Merge dynamically registered users matching current halaqah
  const effectiveStudents = React.useMemo(() => {
    const map = new Map<string, StudentPerformanceRecord>();

    // 1. Add stored/default students
    students.forEach((st) => {
      map.set(st.id, st);
    });

    // 2. Add registered users from Dept HX
    if (registeredUsers && registeredUsers.length > 0) {
      registeredUsers.forEach((u) => {
        const uHalaqah = u.halaqah || 'Halaqah Al-Fajr';
        const isMatch =
          u.role === 'member' &&
          (uHalaqah === currentHalaqah ||
            currentHalaqah === 'Dept HX Pusat' ||
            activeUser?.role === 'dept-hx' ||
            activeUser?.role === 'hq-admin');

        if (isMatch && !map.has(u.id)) {
          map.set(u.id, {
            id: u.id,
            name: u.name,
            avatar: u.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
            halaqah: uHalaqah,
            halaqahCode: u.halaqahCode || halaqahCode,
            xp: u.totalXp || 150,
            streak: u.streakDays || 1,
            masjidAttendance: '20/20 Hadir',
            masjidPercent: 100,
            tajweedScore: 92,
            lastSurah: 'Surah Al-Mulk (Ayat 1-10)',
            status: 'Mumtaz',
            completedDailyTasks: 4,
            totalDailyTasks: 6,
            recentNotes: `Karyawan resmi ${uHalaqah} terdaftar via Dept HX.`,
            parentContact: u.phone || '+62 812-3456-7890'
          });
        }
      });
    }

    return Array.from(map.values());
  }, [students, registeredUsers, currentHalaqah, halaqahCode, activeUser?.role]);

  const filteredStudents = effectiveStudents.filter((s) => {
    if (deletedStudentIds.includes(s.id) || deletedStudentIds.includes(s.name)) return false;
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
      localStorage.setItem('noorworship_halaqah_students_v1', JSON.stringify(updated));
    } catch {}
    onShowToast(`Catatan bimbingan untuk ${selectedStudent.name} berhasil disimpan!`);
    setSelectedStudent(null);
  };

  const handleExportExcel = () => {
    const headers = [
      'No',
      'ID Karyawan',
      'Nama Karyawan',
      'Halaqah',
      'Kode Halaqah',
      'Ustadz Pembimbing',
      'Status Mutabaah',
      'Total XP',
      'Streak Hari',
      'Presensi Shalat Masjid',
      'Persen Presensi',
      'Skor Tajwid Ujian',
      'Surah Terakhir',
      'Kontak Darurat',
      'Catatan Ustadz'
    ];

    const rows = students.map((s, idx) => [
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

  const avgAttendance = Math.round(
    students.reduce((acc, s) => acc + s.masjidPercent, 0) / (students.length || 1)
  );
  const avgTajweed = (
    students.reduce((acc, s) => acc + s.tajweedScore, 0) / (students.length || 1)
  ).toFixed(1);
  const mumtazCount = students.filter((s) => s.status === 'Mumtaz').length;

  return (
    <div className="flex flex-col w-full px-4 md:px-6 py-3 space-y-4 max-w-4xl mx-auto pb-28">
      {/* Halaqah Header Card */}
      <div className="relative overflow-hidden rounded-2xl bg-[#012d1d] text-white p-5 shadow-md">
        <div className="absolute -right-10 -top-10 w-44 h-44 rounded-full bg-[#00452c]/40 blur-2xl pointer-events-none" />
        <div className="absolute -left-10 -bottom-10 w-36 h-36 rounded-full bg-[#fed488]/20 blur-xl pointer-events-none" />

        <div className="relative z-10 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-white/15 text-[#ffdea5]">
                <span className="material-symbols-outlined text-[18px]">groups</span>
              </span>
              <span className="text-xs uppercase tracking-wider text-[#86af99] font-bold">
                Direktori Karyawan Binaan
              </span>
            </div>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-white text-xs font-semibold backdrop-blur-md">
              <span className="w-2 h-2 rounded-full bg-[#92f7c3] animate-pulse" />
              Kode: {halaqahCode}
            </span>
          </div>

          <div>
            <h2 className="text-xl font-bold text-white tracking-tight">
              {currentHalaqah}
            </h2>
            <p className="text-xs text-[#86af99] mt-0.5">
              Ustadz Pembimbing: <strong className="text-white">{supervisorName}</strong> • {students.length} Karyawan Binaan Aktif
            </p>
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-3 gap-2 pt-1">
            <div className="flex flex-col p-3 rounded-xl bg-white/10 backdrop-blur-sm">
              <span className="text-[11px] text-[#86af99] font-medium">Karyawan Mumtaz</span>
              <div className="flex items-baseline gap-1 mt-0.5">
                <span className="text-lg font-bold text-[#ffdea5]">{mumtazCount}</span>
                <span className="text-xs text-[#ffdea5]/80">/{students.length}</span>
              </div>
            </div>

            <div className="flex flex-col p-3 rounded-xl bg-white/10 backdrop-blur-sm">
              <span className="text-[11px] text-[#86af99] font-medium">Presensi Jamaah</span>
              <div className="flex items-baseline gap-1 mt-0.5">
                <span className="text-lg font-bold text-white">{avgAttendance}%</span>
                <span className="text-xs text-[#92f7c3] font-semibold">Tepat Waktu</span>
              </div>
            </div>

            <div className="flex flex-col p-3 rounded-xl bg-white/10 backdrop-blur-sm">
              <span className="text-[11px] text-[#86af99] font-medium">Rata-rata Tajwid</span>
              <div className="flex items-baseline gap-1 mt-0.5">
                <span className="text-lg font-bold text-white">{avgTajweed}%</span>
                <span className="material-symbols-outlined text-[13px] text-[#92f7c3]">
                  verified
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
          Semua Karyawan ({students.length})
        </button>
        <button
          onClick={() => setStatusFilter('Mumtaz')}
          className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
            statusFilter === 'Mumtaz'
              ? 'bg-[#012d1d] text-white shadow-2xs'
              : 'bg-[#f1f3ff] text-[#414844] hover:bg-[#e9edff]'
          }`}
        >
          🌟 Mumtaz ({students.filter((s) => s.status === 'Mumtaz').length})
        </button>
        <button
          onClick={() => setStatusFilter('Disiplin')}
          className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
            statusFilter === 'Disiplin'
              ? 'bg-[#012d1d] text-white shadow-2xs'
              : 'bg-[#f1f3ff] text-[#414844] hover:bg-[#e9edff]'
          }`}
        >
          ✅ Disiplin ({students.filter((s) => s.status === 'Disiplin').length})
        </button>
        <button
          onClick={() => setStatusFilter('Perlu Bimbingan')}
          className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
            statusFilter === 'Perlu Bimbingan'
              ? 'bg-[#ba1a1a] text-white shadow-2xs'
              : 'bg-[#ffdad6]/60 text-[#ba1a1a] hover:bg-[#ffdad6]'
          }`}
        >
          ⚠️ Perlu Bimbingan ({students.filter((s) => s.status === 'Perlu Bimbingan').length})
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
              className="p-4 rounded-2xl bg-white border border-[#1b4332]/8 shadow-sm flex flex-col justify-between gap-3 hover:shadow-md transition-all"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <img
                    src={student.avatar}
                    alt={student.name}
                    className="w-12 h-12 rounded-full object-cover shrink-0 border border-[#1b4332]/10 shadow-2xs"
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
                  <span className="text-[11px] text-[#414844] block truncate">
                    📖 Terakhir: <strong>{student.lastSurah}</strong>
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
        <div className="fixed inset-0 z-50 bg-[#141b2b]/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-2xl space-y-4 max-h-[85vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start justify-between pb-3 border-b border-[#f1f3ff]">
              <div className="flex items-center gap-3">
                <img
                  src={selectedStudent.avatar}
                  alt={selectedStudent.name}
                  className="w-12 h-12 rounded-full object-cover border border-[#1b4332]/10"
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
                  <span className="text-[10px] text-[#717973] block">Presensi Berjamaah</span>
                  <span className="font-bold text-sm text-[#141b2b]">
                    {selectedStudent.masjidAttendance}
                  </span>
                  <div className="w-full bg-[#c1c8c2] h-1.5 rounded-full mt-1.5 overflow-hidden">
                    <div
                      className="bg-[#00452c] h-full rounded-full"
                      style={{ width: `${selectedStudent.masjidPercent}%` }}
                    />
                  </div>
                </div>

                <div className="p-2.5 rounded-xl bg-[#f1f3ff]">
                  <span className="text-[10px] text-[#717973] block">Skor Ujian Tilawah</span>
                  <span className="font-bold text-sm text-[#141b2b]">
                    {selectedStudent.tajweedScore}%
                  </span>
                  <div className="w-full bg-[#c1c8c2] h-1.5 rounded-full mt-1.5 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        selectedStudent.tajweedScore >= 90 ? 'bg-[#00452c]' : 'bg-[#e59b15]'
                      }`}
                      style={{ width: `${selectedStudent.tajweedScore}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>



            {/* Catatan Bimbingan / Nasihat Ustadz */}
            <div>
              <label className="text-xs font-bold text-[#141b2b] mb-1.5 block">
                Catatan Bimbingan &amp; Arahan Ustadz
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
        <div className="fixed inset-0 z-50 bg-[#141b2b]/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in zoom-in-95 duration-150">
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
