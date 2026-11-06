import React, { useState, useMemo } from 'react';
import { ActiveUser, HalaqahAttendanceSession, MemberAttendance, AttendanceStatus, UstadzAttendanceStatus } from '../types';

interface HalaqahAttendanceManagerProps {
  activeUser: ActiveUser;
  registeredUsers: ActiveUser[];
  attendanceSessions: HalaqahAttendanceSession[];
  onSaveSession: (session: HalaqahAttendanceSession) => void;
  onDeleteSession?: (sessionId: string) => void;
  onShowToast: (msg: string) => void;
}

export const HalaqahAttendanceManager: React.FC<HalaqahAttendanceManagerProps> = ({
  activeUser,
  registeredUsers,
  attendanceSessions,
  onSaveSession,
  onDeleteSession,
  onShowToast
}) => {
  // Target Halaqah that this Ustadz leads (default to activeUser.halaqah)
  const targetHalaqah = activeUser.halaqah || 'Halaqah Al-Fajr';

  // Get members belonging to this halaqah
  const halaqahMembers = useMemo(() => {
    return registeredUsers.filter(
      (u) =>
        u.role === 'member' &&
        (u.halaqah === targetHalaqah || (!u.halaqah && targetHalaqah === 'Halaqah Al-Fajr'))
    );
  }, [registeredUsers, targetHalaqah]);

  // View state: 'create' for taking attendance, 'history' for past records
  const [activeSubTab, setActiveSubTab] = useState<'create' | 'history'>('create');

  // Form State: Sesi Presensi
  const todayStr = new Date().toISOString().split('T')[0];
  const [sessionDate, setSessionDate] = useState<string>(todayStr);
  const [sessionTime, setSessionTime] = useState<string>('05:30 WIB');
  const [sessionTitle, setSessionTitle] = useState<string>('Halaqah Ba\'da Subuh: Tahsin & Tajwid');
  const [sessionLocation, setSessionLocation] = useState<string>('Masjid Al-Ikhlas (Ruang Utama)');

  // Form State: Presensi Ustadz
  const [ustadzStatus, setUstadzStatus] = useState<UstadzAttendanceStatus>('hadir');
  const [ustadzNotes, setUstadzNotes] = useState<string>('Materi: Adab Penuntut Ilmu & Muraqabah Tartil Ayat');
  const [penggantiName, setPenggantiName] = useState<string>('');
  const [penggantiKeterangan, setPenggantiKeterangan] = useState<string>('');
  const [ustadzConfirmed, setUstadzConfirmed] = useState<boolean>(true);

  // Edit Mode State
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);

  // Delete Mode State
  const [sessionToDelete, setSessionToDelete] = useState<HalaqahAttendanceSession | null>(null);

  // Form State: Presensi Anggota (Map of userId -> MemberAttendance)
  const [memberRecords, setMemberRecords] = useState<Record<string, { status: AttendanceStatus; notes: string }>>(() => {
    const initial: Record<string, { status: AttendanceStatus; notes: string }> = {};
    halaqahMembers.forEach((m) => {
      initial[m.id] = { status: 'hadir', notes: '' };
    });
    return initial;
  });

  // Automation for Izin/Sakit
  React.useEffect(() => {
    if (ustadzStatus === 'izin' || ustadzStatus === 'sakit') {
      setUstadzNotes('-');
      setSessionTitle('Tidak Ada Halaqah');
      setSessionLocation('-');
      setSessionTime('-');
    } else {
      // Restore defaults if switching back from Izin/Sakit (optional, but good for UX)
      if (sessionTitle === 'Tidak Ada Halaqah') setSessionTitle('Halaqah Ba\'da Subuh: Tahsin & Tajwid');
      if (sessionLocation === '-') setSessionLocation('Masjid Al-Ikhlas (Ruang Utama)');
      if (sessionTime === '-') setSessionTime('05:30 WIB');
      if (ustadzNotes === '-') setUstadzNotes('Materi: Adab Penuntut Ilmu & Muraqabah Tartil Ayat');
    }

    if (ustadzStatus !== 'pengganti') {
      setPenggantiName('');
      setPenggantiKeterangan('');
    }
  }, [ustadzStatus]);

  // Re-sync members if new members are added to halaqah
  React.useEffect(() => {
    setMemberRecords((prev) => {
      const updated = { ...prev };
      halaqahMembers.forEach((m) => {
        if (!updated[m.id]) {
          updated[m.id] = { status: 'hadir', notes: '' };
        }
      });
      return updated;
    });
  }, [halaqahMembers]);

  // History filtering
  const [historySearch, setHistorySearch] = useState('');
  const [selectedHistorySession, setSelectedHistorySession] = useState<HalaqahAttendanceSession | null>(null);

  // Quick Action: Mark all members as present
  const handleMarkAll = (status: AttendanceStatus) => {
    setMemberRecords((prev) => {
      const updated = { ...prev };
      halaqahMembers.forEach((m) => {
        updated[m.id] = { ...updated[m.id], status };
      });
      return updated;
    });
    onShowToast(`Semua anggota halaqah ditandai "${status.toUpperCase()}"`);
  };

  // Edit Session Logic
  const handleEditSession = (session: HalaqahAttendanceSession) => {
    setEditingSessionId(session.id);
    setSessionDate(session.date);
    setSessionTime(session.timeStr);
    setSessionTitle(session.sessionTitle);
    setSessionLocation(session.location);
    setUstadzStatus(session.ustadzStatus);
    setUstadzNotes(session.ustadzNotes || '');
    setPenggantiName(session.ustadzPenggantiName || '');
    setPenggantiKeterangan(session.ustadzPenggantiKeterangan || '');
    
    // Populate member records
    const newRecords: Record<string, { status: AttendanceStatus; notes: string }> = {};
    session.members.forEach(m => {
      newRecords[m.userId] = { status: m.status, notes: m.notes || '' };
    });
    setMemberRecords(newRecords);
    
    setActiveSubTab('create');
    onShowToast(`Memuat sesi "${session.sessionTitle}" untuk diedit.`);
  };

  const handleCancelEdit = () => {
    setEditingSessionId(null);
    setSessionDate(todayStr);
    setSessionTime('05:30 WIB');
    setSessionTitle('Halaqah Ba\'da Subuh: Tahsin & Tajwid');
    setSessionLocation('Masjid Al-Ikhlas (Ruang Utama)');
    setUstadzStatus('hadir');
    setUstadzNotes('Materi: Adab Penuntut Ilmu & Muraqabah Tartil Ayat');
    setPenggantiName('');
    setPenggantiKeterangan('');
    
    // Reset member records
    const initial: Record<string, { status: AttendanceStatus; notes: string }> = {};
    halaqahMembers.forEach((m) => {
      initial[m.id] = { status: 'hadir', notes: '' };
    });
    setMemberRecords(initial);
    
    onShowToast('Edit dibatalkan.');
  };

  // Toggle single member status
  const handleMemberStatusChange = (userId: string, newStatus: AttendanceStatus) => {
    setMemberRecords((prev) => ({
      ...prev,
      [userId]: {
        ...(prev[userId] || { notes: '' }),
        status: newStatus
      }
    }));
  };

  // Update member note
  const handleMemberNoteChange = (userId: string, note: string) => {
    setMemberRecords((prev) => ({
      ...prev,
      [userId]: {
        ...(prev[userId] || { status: 'hadir' }),
        notes: note
      }
    }));
  };

  // Calculated Stats for Current Form
  const currentStats = useMemo(() => {
    let hadir = 0;
    let izin = 0;
    let sakit = 0;
    let alpa = 0;
    halaqahMembers.forEach((m) => {
      const rec = memberRecords[m.id];
      const st = rec?.status || 'hadir';
      if (st === 'hadir') hadir++;
      else if (st === 'izin') izin++;
      else if (st === 'sakit') sakit++;
      else if (st === 'alpa') alpa++;
    });
    const total = halaqahMembers.length || 1;
    const rate = Math.round((hadir / total) * 100);
    return { hadir, izin, sakit, alpa, total: halaqahMembers.length, rate };
  }, [halaqahMembers, memberRecords]);

  // Save Attendance Session
  const handleSubmitAttendance = (e: React.FormEvent) => {
    e.preventDefault();

    if (!sessionTitle.trim()) {
      onShowToast('Mohon masukkan judul / nama sesi halaqah');
      return;
    }

    const membersPayload: MemberAttendance[] = halaqahMembers.map((m) => {
      const rec = memberRecords[m.id] || { status: 'hadir', notes: '' };
      return {
        userId: m.id,
        userName: m.name,
        userAvatar: m.avatar || '',
        status: rec.status,
        notes: rec.notes.trim() || '',
        markedAt: `${new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB`,
        xpAwarded: rec.status === 'hadir' ? 15 : 0
      };
    });

    const newSession: HalaqahAttendanceSession = {
      id: editingSessionId || `att-${Date.now()}`,
      halaqahName: targetHalaqah || 'Tanpa Nama',
      halaqahCode: activeUser.halaqahCode || 'HF-4092',
      date: sessionDate || todayStr,
      timeStr: (ustadzStatus === 'izin' || ustadzStatus === 'sakit') ? '-' : (sessionTime || '-'),
      sessionTitle: (ustadzStatus === 'izin' || ustadzStatus === 'sakit') ? 'Tidak Ada Halaqah' : (sessionTitle.trim() || 'Halaqah Rutin'),
      location: (ustadzStatus === 'izin' || ustadzStatus === 'sakit') ? '-' : (sessionLocation.trim() || 'Masjid Al-Ikhlas'),
      ustadzId: activeUser.id,
      ustadzName: activeUser.name || 'Ustadz',
      ustadzAvatar: activeUser.avatar || '',
      ustadzStatus: ustadzStatus,
      ustadzNotes: (ustadzStatus === 'izin' || ustadzStatus === 'sakit') ? '-' : (ustadzNotes.trim() || ''),
      ustadzPenggantiName: ustadzStatus === 'pengganti' ? (penggantiName || '').trim() : '',
      ustadzPenggantiKeterangan: ustadzStatus === 'pengganti' ? (penggantiKeterangan || '').trim() : '',
      ustadzConfirmedAt: new Date().toISOString(),
      members: (ustadzStatus === 'izin' || ustadzStatus === 'sakit') ? [] : membersPayload,
      totalMembers: (ustadzStatus === 'izin' || ustadzStatus === 'sakit') ? 0 : (halaqahMembers.length || 0),
      presentCount: (ustadzStatus === 'izin' || ustadzStatus === 'sakit') ? 0 : (currentStats.hadir || 0),
      attendanceRate: (ustadzStatus === 'izin' || ustadzStatus === 'sakit') ? 0 : (currentStats.rate || 0),
      createdAt: new Date().toISOString(),
      syncedWithHX: true
    };

    onSaveSession(newSession);
    setEditingSessionId(null);
    setActiveSubTab('history');
  };

  // Filtered history sessions for this halaqah
  const halaqahHistory = useMemo(() => {
    return attendanceSessions
      .filter(
        (s) =>
          s.halaqahName === targetHalaqah ||
          activeUser.role === 'hq-admin' ||
          activeUser.role === 'dept-hx'
      )
      .filter(
        (s) =>
          !historySearch ||
          s.sessionTitle.toLowerCase().includes(historySearch.toLowerCase()) ||
          s.date.includes(historySearch) ||
          s.ustadzName.toLowerCase().includes(historySearch.toLowerCase())
      );
  }, [attendanceSessions, targetHalaqah, activeUser.role, historySearch]);

  return (
    <div className="space-y-4">
      {/* Top Halaqah Context Card */}
      <div className="p-4 rounded-3xl bg-gradient-to-br from-[#012d1d] via-[#1b4332] to-[#012d1d] text-white shadow-lg border border-[#c1ecd4]/20 relative overflow-hidden">
        <div className="absolute -right-10 -bottom-10 w-40 h-40 rounded-full bg-[#00452c]/50 blur-2xl pointer-events-none" />
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white/10 border border-[#92f7c3]/40 flex items-center justify-center text-[#92f7c3] shrink-0 shadow-inner">
              <span className="material-symbols-outlined text-[26px]">fact_check</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-full bg-[#c1ecd4] text-[#002114] text-[10px] font-extrabold uppercase tracking-wider">
                  Presensi Resmi Ustadz
                </span>
                <span className="inline-flex items-center gap-1 text-[11px] text-[#92f7c3] font-bold">
                  <span className="w-2 h-2 rounded-full bg-[#92f7c3] animate-ping" />
                  <span>Sinkron Dept HX ✓</span>
                </span>
              </div>
              <h2 className="text-lg sm:text-xl font-extrabold tracking-tight text-white mt-0.5">
                Presensi {targetHalaqah}
              </h2>
              <p className="text-xs text-[#86af99] mt-0.5">
                Ustadz Pembimbing: <strong>{activeUser.name}</strong> • Kode: <span className="font-mono text-[#fed488] font-bold">{activeUser.halaqahCode || 'HF-4092'}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveSubTab('create')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 shadow-xs ${
                activeSubTab === 'create'
                  ? 'bg-[#92f7c3] text-[#002114] font-extrabold'
                  : 'bg-white/15 text-white hover:bg-white/25'
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">edit_calendar</span>
              <span>Input Presensi</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveSubTab('history')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 shadow-xs ${
                activeSubTab === 'history'
                  ? 'bg-[#92f7c3] text-[#002114] font-extrabold'
                  : 'bg-white/15 text-white hover:bg-white/25'
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">history</span>
              <span>Riwayat ({halaqahHistory.length})</span>
            </button>
            {editingSessionId && (
              <button
                type="button"
                onClick={handleCancelEdit}
                className="px-3.5 py-2 rounded-xl text-xs font-bold bg-rose-500 text-white hover:bg-rose-600 transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <span className="material-symbols-outlined text-[16px]">close</span>
                <span>Batal Edit</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* SUB-TAB 1: INPUT PRESENSI BARU */}
      {activeSubTab === 'create' && (
        <form onSubmit={handleSubmitAttendance} className="space-y-4">
          {/* Section: Rincian Pertemuan & Waktu */}
          <div className="p-4 rounded-3xl bg-white shadow-sm border border-[#1b4332]/10 space-y-3.5">
            <div className="flex items-center justify-between pb-2 border-b border-[#f1f3ff]">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px] text-[#00452c]">event_available</span>
                <h3 className="font-bold text-sm text-[#141b2b]">1. Informasi Sesi Pertemuan Halaqah</h3>
              </div>
              <span className="text-[11px] text-[#717973] font-medium">Langkah 1 dari 2</span>
            </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block font-bold text-[#141b2b] mb-1">
                  Judul / Nama Sesi Pertemuan *
                </label>
                <input
                  type="text"
                  value={ustadzStatus === 'izin' || ustadzStatus === 'sakit' ? 'Tidak Ada Halaqah' : sessionTitle}
                  onChange={(e) => setSessionTitle(e.target.value)}
                  disabled={ustadzStatus === 'izin' || ustadzStatus === 'sakit'}
                  placeholder="Contoh: Pertemuan Halaqah Pekanan, Kajian Subuh, dll."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#f9f9ff] border border-[#1b4332]/15 text-xs text-[#141b2b] focus:outline-none focus:ring-2 focus:ring-[#00452c]/30 font-medium disabled:opacity-50 disabled:bg-gray-100"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-[#141b2b] mb-1">
                  Lokasi Pertemuan
                </label>
                <input
                  type="text"
                  value={ustadzStatus === 'izin' || ustadzStatus === 'sakit' ? '-' : sessionLocation}
                  onChange={(e) => setSessionLocation(e.target.value)}
                  disabled={ustadzStatus === 'izin' || ustadzStatus === 'sakit'}
                  placeholder="Contoh: Masjid Al-Ikhlas, Musholla Asrama, Online Zoom"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#f9f9ff] border border-[#1b4332]/15 text-xs text-[#141b2b] focus:outline-none focus:ring-2 focus:ring-[#00452c]/30 font-medium disabled:opacity-50 disabled:bg-gray-100"
                />
              </div>

              <div>
                <label className="block font-bold text-[#141b2b] mb-1">
                  Tanggal Presensi
                </label>
                <input
                  type="date"
                  value={sessionDate}
                  onChange={(e) => setSessionDate(e.target.value)}
                  disabled={ustadzStatus === 'izin' || ustadzStatus === 'sakit'}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#f9f9ff] border border-[#1b4332]/15 text-xs text-[#141b2b] focus:outline-none focus:ring-2 focus:ring-[#00452c]/30 font-medium disabled:opacity-50 disabled:bg-gray-100"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-[#141b2b] mb-1">
                  Waktu Pelaksanaan
                </label>
                <input
                  type="text"
                  value={ustadzStatus === 'izin' || ustadzStatus === 'sakit' ? '-' : sessionTime}
                  onChange={(e) => setSessionTime(e.target.value)}
                  disabled={ustadzStatus === 'izin' || ustadzStatus === 'sakit'}
                  placeholder="Contoh: 05:30 WIB, Ba'da Ashar"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#f9f9ff] border border-[#1b4332]/15 text-xs text-[#141b2b] focus:outline-none focus:ring-2 focus:ring-[#00452c]/30 font-medium disabled:opacity-50 disabled:bg-gray-100"
                />
              </div>
            </div>
          </div>

          {/* Section: Presensi Mandiri Ustadz Pembimbing */}
          <div className="p-4 rounded-3xl bg-white shadow-sm border border-[#1b4332]/10 space-y-3.5">
            <div className="flex items-center justify-between pb-2 border-b border-[#f1f3ff]">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px] text-[#785a1a]">shield_person</span>
                <h3 className="font-bold text-sm text-[#141b2b]">2. Presensi Ustadz Pembimbing ({activeUser.name})</h3>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-[#fed488]/30 text-[#785a1a] text-[10px] font-bold">
                Wajib Terisi
              </span>
            </div>

            <div className="p-3.5 rounded-2xl bg-[#f9f9ff] border border-[#1b4332]/10 space-y-3">
              <div className="flex items-center gap-3">
                <img
                  src={activeUser.avatar}
                  alt={activeUser.name}
                  className="w-11 h-11 rounded-full object-cover ring-2 ring-[#c1ecd4]"
                />
                <div className="min-w-0">
                  <span className="font-bold text-sm text-[#141b2b] block truncate">
                    {activeUser.name}
                  </span>
                  <span className="text-xs text-[#717973] block truncate">
                    Ustadz Pembimbing Resmi • {targetHalaqah}
                  </span>
                </div>
              </div>

              {/* Status Radio Buttons for Ustadz */}
              <div>
                <label className="block text-xs font-bold text-[#141b2b] mb-1.5">
                  Status Kehadiran Ustadz Pembimbing:
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { val: 'hadir' as const, label: '✓ Hadir Membina', color: 'bg-[#e9fbf2] text-[#00452c] border-[#92f7c3]' },
                    { val: 'izin' as const, label: '✉ Izin Dinas', color: 'bg-blue-50 text-blue-900 border-blue-200' },
                    { val: 'sakit' as const, label: '🏥 Sakit', color: 'bg-amber-50 text-amber-900 border-amber-200' },
                    { val: 'pengganti' as const, label: '👤 Ustadz Pengganti', color: 'bg-purple-50 text-purple-900 border-purple-200' }
                  ].map((opt) => (
                    <button
                      key={opt.val}
                      type="button"
                      onClick={() => setUstadzStatus(opt.val)}
                      className={`py-2 px-2.5 rounded-xl text-xs font-bold border transition-all text-center cursor-pointer ${
                        ustadzStatus === opt.val
                          ? `${opt.color} ring-2 ring-[#00452c]/30 shadow-xs font-extrabold`
                          : 'bg-white text-[#414844] border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Topic / Materi Halaqah */}
              <div>
                <label className="block text-xs font-bold text-[#141b2b] mb-1">
                  Materi / Topik Pembinaan yang Disampaikan:
                </label>
                <input
                  type="text"
                  value={ustadzStatus === 'izin' || ustadzStatus === 'sakit' ? '-' : ustadzNotes}
                  onChange={(e) => setUstadzNotes(e.target.value)}
                  placeholder="Contoh: Makharijul huruf Surah Al-Mulk ayat 1-10 & Adab Shalat Berjamaah"
                  disabled={ustadzStatus === 'izin' || ustadzStatus === 'sakit'}
                  className="w-full px-3.5 py-2 rounded-xl bg-white border border-[#1b4332]/15 text-xs text-[#141b2b] focus:outline-none focus:ring-2 focus:ring-[#00452c]/30 font-medium disabled:opacity-50 disabled:bg-gray-100"
                />
              </div>

              {/* Tambahan Fields jika Ustadz Pengganti */}
              {ustadzStatus === 'pengganti' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-[#f1f3ff]">
                  <div>
                    <label className="block text-xs font-bold text-[#141b2b] mb-1">Nama Pengganti:</label>
                    <input
                      type="text"
                      value={penggantiName}
                      onChange={(e) => setPenggantiName(e.target.value)}
                      placeholder="Nama ustadz pengganti..."
                      className="w-full px-3.5 py-2 rounded-xl bg-white border border-[#1b4332]/15 text-xs text-[#141b2b] focus:outline-none focus:ring-2 focus:ring-[#00452c]/30 font-medium"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#141b2b] mb-1">Keterangan:</label>
                    <input
                      type="text"
                      value={penggantiKeterangan}
                      onChange={(e) => setPenggantiKeterangan(e.target.value)}
                      placeholder="Alasan penggantian..."
                      className="w-full px-3.5 py-2 rounded-xl bg-white border border-[#1b4332]/15 text-xs text-[#141b2b] focus:outline-none focus:ring-2 focus:ring-[#00452c]/30 font-medium"
                    />
                  </div>
                </div>
              )}

              <div className="flex items-center gap-2 pt-1 text-[11px] text-[#00452c]">
                <input
                  type="checkbox"
                  id="confirmUstadz"
                  checked={ustadzConfirmed}
                  onChange={(e) => setUstadzConfirmed(e.target.checked)}
                  className="rounded text-[#00452c] focus:ring-[#00452c] h-4 w-4 cursor-pointer"
                />
                <label htmlFor="confirmUstadz" className="cursor-pointer font-semibold">
                  Saya menyatakan dengan sebenar-benarnya data presensi halaqah ini siap disinkronkan ke Dept HX.
                </label>
              </div>
            </div>
          </div>

          {/* Section: Presensi Anggota Karyawan */}
          {ustadzStatus !== 'izin' && ustadzStatus !== 'sakit' && (
            <div className="p-4 rounded-3xl bg-white shadow-sm border border-[#1b4332]/10 space-y-3.5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-[#f1f3ff]">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[18px] text-[#00452c]">groups</span>
                    <h3 className="font-bold text-sm text-[#141b2b]">
                      3. Presensi Anggota Halaqah ({halaqahMembers.length} Karyawan)
                    </h3>
                  </div>
                  <p className="text-xs text-[#717973] mt-0.5">
                    Tandai kehadiran setiap anggota. Anggota hadir otomatis mendapatkan reward <strong>+15 XP</strong>.
                  </p>
                </div>

                {/* Quick Actions & Live Stats */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="px-2.5 py-1 rounded-full bg-[#c1ecd4] text-[#002114] text-xs font-extrabold">
                    {currentStats.hadir}/{currentStats.total} Hadir ({currentStats.rate}%)
                  </span>
                  <button
                    type="button"
                    onClick={() => handleMarkAll('hadir')}
                    className="px-2.5 py-1 rounded-xl bg-[#e9fbf2] hover:bg-[#d5f7e6] text-[#00452c] text-xs font-bold border border-[#92f7c3] cursor-pointer transition-colors"
                  >
                    ✓ Hadir Semua
                  </button>
                </div>
              </div>

              {/* Member List */}
              {halaqahMembers.length === 0 ? (
                <div className="text-center py-8 text-xs text-[#717973] bg-[#f9f9ff] rounded-2xl border border-dashed border-[#1b4332]/15">
                  <span className="material-symbols-outlined text-3xl text-gray-400 mb-1">person_search</span>
                  <p className="font-semibold">Belum ada karyawan yang terdaftar di {targetHalaqah}</p>
                  <p className="text-[11px] text-gray-500 mt-0.5">Anggota dapat ditambahkan melalui menu Manajemen Halaqah Dept HX.</p>
                </div>
              ) : (
                <div className="space-y-2.5 max-h-[420px] overflow-y-auto pr-1">
                  {halaqahMembers.map((member, idx) => {
                    const record = memberRecords[member.id] || { status: 'hadir', notes: '' };
                    return (
                      <div
                        key={member.id}
                        className={`p-3 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                          record.status === 'hadir'
                            ? 'bg-[#f9fbf9] border-[#92f7c3]/60'
                            : record.status === 'alpa'
                            ? 'bg-rose-50/40 border-rose-200'
                            : 'bg-[#f9f9ff] border-gray-200'
                        }`}
                      >
                        {/* Member Info */}
                        <div className="flex items-center gap-3 min-w-0">
                          <span className="text-xs font-mono font-bold text-[#717973] w-5 text-center">
                            {idx + 1}.
                          </span>
                          <img
                            src={member.avatar}
                            alt={member.name}
                            className="w-10 h-10 rounded-full object-cover shrink-0 ring-1 ring-gray-200"
                          />
                          <div className="min-w-0">
                            <span className="font-bold text-xs sm:text-sm text-[#141b2b] truncate block">
                              {member.name}
                            </span>
                            <span className="text-[11px] text-[#717973] block truncate">
                              {member.totalXp} XP • Streak: {member.streakDays} hari
                            </span>
                          </div>
                        </div>

                        {/* Status Buttons & Notes */}
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 shrink-0">
                          <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-gray-200 shadow-2xs">
                            {(
                              [
                                { key: 'hadir' as const, label: 'Hadir', badge: 'H', activeCls: 'bg-[#00452c] text-white shadow-xs' },
                                { key: 'izin' as const, label: 'Izin', badge: 'I', activeCls: 'bg-blue-600 text-white shadow-xs' },
                                { key: 'sakit' as const, label: 'Sakit', badge: 'S', activeCls: 'bg-amber-600 text-white shadow-xs' },
                                { key: 'alpa' as const, label: 'Alpa', badge: 'A', activeCls: 'bg-rose-600 text-white shadow-xs' }
                              ] as const
                            ).map((btn) => (
                              <button
                                key={btn.key}
                                type="button"
                                onClick={() => handleMemberStatusChange(member.id, btn.key)}
                                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                  record.status === btn.key
                                    ? btn.activeCls
                                    : 'text-[#414844] hover:bg-gray-100'
                                }`}
                                title={btn.label}
                              >
                                {btn.label}
                              </button>
                            ))}
                          </div>

                          {/* Optional Member Note */}
                          <input
                            type="text"
                            value={record.notes}
                            onChange={(e) => handleMemberNoteChange(member.id, e.target.value)}
                            placeholder="Catatan..."
                            className="px-2.5 py-1 text-xs rounded-xl bg-white border border-gray-200 focus:outline-none focus:ring-1 focus:ring-[#00452c] w-full sm:w-36"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Submit Action Tray */}
          <div className="p-4 rounded-3xl bg-white shadow-sm border border-[#1b4332]/10 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs text-[#414844]">
              <span className="material-symbols-outlined text-[20px] text-[#00452c]">sync</span>
              <span>
                Data presensi akan langsung dikirim dan disinkronkan ke <strong>Direktorat Dept HX</strong> secara otomatis.
              </span>
            </div>

            <button
              type="submit"
              disabled={!ustadzConfirmed}
              className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-gradient-to-r from-[#012d1d] to-[#1b4332] text-white font-extrabold text-xs sm:text-sm shadow-md hover:brightness-110 active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-[18px] text-[#92f7c3]">{editingSessionId ? 'save' : 'send'}</span>
              <span>{editingSessionId ? 'Simpan Perubahan' : 'Simpan Presensi'}</span>
            </button>
          </div>
        </form>
      )}

      {/* SUB-TAB 2: RIWAYAT SESI PRESENSI */}
      {activeSubTab === 'history' && (
        <div className="space-y-3.5">
          {/* Search bar & quick filter */}
          <div className="flex items-center justify-between gap-2 p-3 rounded-2xl bg-white shadow-sm border border-[#1b4332]/10 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <span className="material-symbols-outlined absolute left-3 top-2.5 text-[18px] text-[#717973]">
                search
              </span>
              <input
                type="text"
                value={historySearch}
                onChange={(e) => setHistorySearch(e.target.value)}
                placeholder="Cari sesi presensi, tanggal, topik materi..."
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-[#f9f9ff] border border-[#1b4332]/15 text-xs text-[#141b2b] placeholder-[#717973]/70 focus:outline-none focus:ring-2 focus:ring-[#00452c]/30"
              />
            </div>
            <span className="text-xs font-bold text-[#00452c] px-3 py-1.5 rounded-xl bg-[#e9fbf2] border border-[#92f7c3]/60">
              {halaqahHistory.length} Sesi Tercatat
            </span>
          </div>

          {/* Session Cards */}
          {halaqahHistory.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-3xl border border-[#1b4332]/10 p-6 space-y-2">
              <span className="material-symbols-outlined text-4xl text-[#717973]">event_busy</span>
              <h4 className="font-bold text-sm text-[#141b2b]">Belum ada riwayat sesi presensi</h4>
              <p className="text-xs text-[#717973] max-w-sm mx-auto">
                Sesi presensi yang diisi oleh Ustadz akan tersimpan di sini dan langsung sinkron ke akun Dept HX.
              </p>
              <button
                type="button"
                onClick={() => setActiveSubTab('create')}
                className="mt-2 px-4 py-2 rounded-xl bg-[#012d1d] text-white text-xs font-bold shadow-xs cursor-pointer"
              >
                + Mulai Input Presensi Sekarang
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {halaqahHistory.map((session) => (
                <div
                  key={session.id}
                  className="p-4 rounded-3xl bg-white shadow-sm border border-[#1b4332]/10 hover:shadow-md transition-all space-y-3"
                >
                  {/* Header Row */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-[#f1f3ff]">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="px-2 py-0.5 rounded-full bg-[#c1ecd4] text-[#002114] text-[10px] font-extrabold uppercase">
                          {session.halaqahName}
                        </span>
                        <span className="text-xs text-[#717973] font-medium">
                          📅 {session.date} • ⏰ {session.timeStr}
                        </span>
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[#00452c] bg-[#e9fbf2] px-2 py-0.5 rounded-full border border-[#92f7c3]/50">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#00452c]" />
                          Tersinkron HX
                        </span>
                      </div>
                      <h4 className="font-bold text-sm sm:text-base text-[#141b2b] mt-1">
                        {session.sessionTitle}
                      </h4>
                      <p className="text-xs text-[#717973]">
                        📍 {session.location}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <div className="text-right">
                        <span className="text-base font-extrabold text-[#00452c] block">
                          {session.presentCount}/{session.totalMembers} Hadir
                        </span>
                        <span className="text-[11px] font-bold text-[#717973]">
                          Tingkat: {session.attendanceRate}%
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleEditSession(session)}
                          className="p-2 rounded-xl bg-amber-50 text-amber-700 hover:bg-amber-100 font-bold text-xs cursor-pointer transition-colors"
                          title="Edit Sesi Ini"
                        >
                          <span className="material-symbols-outlined text-[18px]">edit</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setSessionToDelete(session)}
                          className="p-2 rounded-xl bg-rose-50 text-rose-700 hover:bg-rose-100 font-bold text-xs cursor-pointer transition-colors"
                          title="Hapus Sesi Ini"
                        >
                          <span className="material-symbols-outlined text-[18px]">delete</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setSelectedHistorySession(session)}
                          className="p-2 rounded-xl bg-[#f1f3ff] hover:bg-[#e4e7fa] text-[#00452c] font-bold text-xs cursor-pointer transition-colors"
                          title="Lihat Daftar Hadir Lengkap"
                        >
                          <span className="material-symbols-outlined text-[18px]">visibility</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Ustadz Attendance Subcard */}
                  <div className="p-3 rounded-2xl bg-[#f9f9ff] border border-[#1b4332]/5 flex items-start gap-3">
                    <img
                      src={session.ustadzAvatar || activeUser.avatar}
                      alt={session.ustadzName}
                      className="w-9 h-9 rounded-full object-cover shrink-0 ring-1 ring-emerald-300"
                    />
                    <div className="min-w-0 flex-1 text-xs">
                      <div className="flex items-center gap-2 flex-wrap">
                        <strong className="text-[#141b2b]">{session.ustadzName}</strong>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                            session.ustadzStatus === 'hadir'
                              ? 'bg-[#c1ecd4] text-[#002114]'
                              : session.ustadzStatus === 'izin'
                              ? 'bg-blue-100 text-blue-900'
                              : 'bg-amber-100 text-amber-900'
                          }`}
                        >
                          Ustadz {session.ustadzStatus}
                        </span>
                      </div>
                      {session.ustadzNotes && (
                        <p className="text-[#414844] text-[11px] mt-1 line-clamp-2">
                          📖 <strong>Materi:</strong> {session.ustadzNotes}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Modal Detail Lembar Presensi Lengkap */}
      {selectedHistorySession && (
        <div className="fixed inset-0 z-50 bg-[#0c1322]/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-xl w-full p-5 shadow-2xl text-[#141b2b] space-y-4 my-auto relative border border-[#c1ecd4]">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-[#f1f3ff]">
              <div>
                <span className="px-2.5 py-0.5 rounded-full bg-[#c1ecd4] text-[#002114] text-[10px] font-extrabold uppercase">
                  Lembar Presensi • {selectedHistorySession.halaqahName}
                </span>
                <h3 className="font-extrabold text-base text-[#141b2b] mt-1">
                  {selectedHistorySession.sessionTitle}
                </h3>
                <p className="text-xs text-[#717973]">
                  📅 {selectedHistorySession.date} • ⏰ {selectedHistorySession.timeStr} • 📍 {selectedHistorySession.location}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setSelectedHistorySession(null)}
                className="w-8 h-8 rounded-full bg-[#f1f3ff] hover:bg-[#e4e7fa] flex items-center justify-center text-[#414844] cursor-pointer transition-colors"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            {/* Ustadz Info */}
            <div className="p-3 rounded-2xl bg-[#e9fbf2] border border-[#92f7c3]/60 flex items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2.5">
                <img
                  src={selectedHistorySession.ustadzAvatar || activeUser.avatar}
                  alt={selectedHistorySession.ustadzName}
                  className="w-10 h-10 rounded-full object-cover ring-2 ring-white"
                />
                <div>
                  <span className="text-[10px] text-[#717973] uppercase font-bold block">Ustadz Pembimbing:</span>
                  <strong className="text-sm text-[#00452c]">{selectedHistorySession.ustadzName}</strong>
                  <span className="text-[11px] text-[#414844] block">
                    {selectedHistorySession.ustadzNotes || 'Membina halaqah'}
                  </span>
                </div>
              </div>
              <span
                className={`px-2.5 py-1 rounded-full text-xs font-extrabold uppercase ${
                  selectedHistorySession.ustadzStatus === 'hadir'
                    ? 'bg-[#00452c] text-[#92f7c3]'
                    : 'bg-amber-200 text-amber-900'
                }`}
              >
                {selectedHistorySession.ustadzStatus}
              </span>
            </div>

            {/* Members Roster Table */}
            <div>
              <div className="flex items-center justify-between pb-2">
                <h4 className="font-bold text-xs text-[#141b2b]">
                  Daftar Kehadiran Anggota ({selectedHistorySession.members.length} Karyawan)
                </h4>
                <span className="text-xs font-bold text-[#00452c]">
                  {selectedHistorySession.presentCount}/{selectedHistorySession.totalMembers} Hadir ({selectedHistorySession.attendanceRate}%)
                </span>
              </div>

              <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
                {selectedHistorySession.members.map((m, idx) => (
                  <div
                    key={m.userId || idx}
                    className="p-2.5 rounded-xl bg-[#f9f9ff] border border-gray-100 flex items-center justify-between gap-2 text-xs"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="font-mono text-[#717973] text-[11px] w-4 text-center">
                        {idx + 1}.
                      </span>
                      {m.userAvatar && (
                        <img
                          src={m.userAvatar}
                          alt={m.userName}
                          className="w-7 h-7 rounded-full object-cover shrink-0"
                        />
                      )}
                      <div className="min-w-0">
                        <span className="font-bold text-[#141b2b] block truncate">{m.userName}</span>
                        {m.notes && <span className="text-[10px] text-[#717973] block truncate">{m.notes}</span>}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                          m.status === 'hadir'
                            ? 'bg-[#c1ecd4] text-[#002114]'
                            : m.status === 'izin'
                            ? 'bg-blue-100 text-blue-900'
                            : m.status === 'sakit'
                            ? 'bg-amber-100 text-amber-900'
                            : 'bg-rose-100 text-rose-900'
                        }`}
                      >
                        {m.status}
                      </span>
                      {m.status === 'hadir' && (
                        <span className="text-[10px] font-bold text-[#00452c]">+15 XP</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Modal Actions */}
            <div className="pt-2 border-t border-[#f1f3ff] flex items-center justify-between">
              <span className="text-[11px] text-[#00452c] font-semibold flex items-center gap-1">
                <span className="material-symbols-outlined text-[16px]">check_circle</span>
                Tersinkronisasi dengan Konsol Dept HX
              </span>
              <button
                type="button"
                onClick={() => setSelectedHistorySession(null)}
                className="py-2 px-4 rounded-xl bg-[#012d1d] hover:bg-[#1b4332] text-white text-xs font-bold transition-all cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Modal Konfirmasi Hapus Sesi Presensi */}
      {sessionToDelete && (
        <div className="fixed inset-0 z-[60] bg-[#0c1322]/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl space-y-4 border border-rose-100 animate-in zoom-in-95 duration-200">
            <div className="flex flex-col items-center text-center space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center">
                <span className="material-symbols-outlined text-3xl">delete_forever</span>
              </div>
              <div>
                <h3 className="text-lg font-extrabold text-[#141b2b]">Hapus Sesi Presensi?</h3>
                <p className="text-xs text-[#717973] mt-1 leading-relaxed">
                  Apakah Anda yakin ingin menghapus riwayat sesi <strong>&ldquo;{sessionToDelete.sessionTitle}&rdquo;</strong>? Data yang dihapus tidak dapat dipulihkan.
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-[#f9f9ff] border border-gray-100 text-xs">
              <div className="flex justify-between mb-1">
                <span className="text-[#717973]">Tanggal:</span>
                <span className="font-bold text-[#141b2b]">{sessionToDelete.date}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#717973]">Halaqah:</span>
                <span className="font-bold text-[#141b2b]">{sessionToDelete.halaqahName}</span>
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
                  if (onDeleteSession) onDeleteSession(sessionToDelete.id);
                  setSessionToDelete(null);
                }}
                className="flex-1 py-3 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md transition-all active:scale-95 cursor-pointer"
              >
                Ya, Hapus Sesi
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
