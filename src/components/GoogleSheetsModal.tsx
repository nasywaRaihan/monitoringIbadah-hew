import React, { useState, useRef } from 'react';
import { User } from 'firebase/auth';
import { SpreadsheetInfo, syncRosterToSheets } from '../services/googleSheets';
import { ALL_RECITERS_DIRECTORY } from '../data/mockData';
import {
  downloadImportTemplateSheet,
  parseReciterFile,
  ImportedReciterRecord
} from '../services/csvExport';

interface GoogleSheetsModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
  spreadsheet: SpreadsheetInfo | null;
  onConnectGoogle: () => Promise<void>;
  onDisconnectGoogle: () => Promise<void>;
  isConnecting: boolean;
  accessToken: string | null;
  onShowToast: (msg: string) => void;
  onImportReciters?: (
    records: ImportedReciterRecord[]
  ) => Promise<void> | void;
  onExportAll?: () => void;
}

export const GoogleSheetsModal: React.FC<GoogleSheetsModalProps> = ({
  isOpen,
  onClose,
  user,
  spreadsheet,
  onConnectGoogle,
  onDisconnectGoogle,
  isConnecting,
  accessToken,
  onShowToast,
  onImportReciters,
  onExportAll
}) => {
  const [activeTab, setActiveTab] = useState<'import' | 'cloud-sync'>('import');
  const [isSyncing, setIsSyncing] = useState(false);

  // Upload & parse states
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFileName, setSelectedFileName] = useState<string>('');
  const [parsedData, setParsedData] = useState<ImportedReciterRecord[]>([]);
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [isProcessingFile, setIsProcessingFile] = useState(false);
  const [isSubmittingImport, setIsSubmittingImport] = useState(false);

  if (!isOpen) return null;

  const handleDownloadTemplate = () => {
    downloadImportTemplateSheet();
    onShowToast('✅ Template Sheet (.xlsx) berhasil diunduh (terformat rapi per kolom A, B, C, D, E)');
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFileName(file.name);
    setIsProcessingFile(true);
    setParseErrors([]);
    setParsedData([]);

    try {
      const result = await parseReciterFile(file);
      if (result.errors.length > 0 && result.records.length === 0) {
        setParseErrors(result.errors);
      } else {
        setParsedData(result.records);
        if (result.errors.length > 0) {
          setParseErrors(result.errors);
        }
      }
    } catch (err: any) {
      setParseErrors([`Gagal membaca file spreadsheet: ${err.message || 'Format tidak valid'}`]);
    } finally {
      setIsProcessingFile(false);
    }
  };

  const handleExecuteImport = async () => {
    if (parsedData.length === 0) {
      onShowToast('Tidak ada data karyawan yang siap diimpor');
      return;
    }

    setIsSubmittingImport(true);
    try {
      if (onImportReciters) {
        await onImportReciters(parsedData);
      } else {
        // Fallback save to localStorage if prop not passed
        const existingRaw = localStorage.getItem('noorworship_registered_users_v1');
        const existing = existingRaw ? JSON.parse(existingRaw) : [];
        const newOnes = parsedData.map((item, idx) => ({
          id: `user-import-${Date.now()}-${idx}`,
          name: item.name,
          halaqah: item.halaqah,
          halaqahCode: `HL-${Math.floor(1000 + Math.random() * 9000)}`,
          passcode: item.passcode || '1234',
          phone: item.phone || '',
          avatar:
            'https://lh3.googleusercontent.com/aida-public/AB6AXuCPpztXYvKG0hnmCFJGCCU0xwy2MPvneIXXKJ1BW4Rtejtyzgr02Vo9Su5UxcVuZz3-GF8hPwRY0_1vZl5PVdpW10j8rqRMIipsU_h8mEvEcJShkcDH86v76LYWTlWzju8eCZDjvFPYoqOVoLWKjpOXfZWK3-4DbGikcXmtwS-5rGtyiOB3ejK_8RqWALFKRcTWhwJTWUpwoH36hhTTWYZyTPHbKBimBp0b-0er8SFXjKlDEMOCN2_0Qg',
          role: 'member',
          totalXp: 150,
          streakDays: 1,
          assignedHalaqahBy: 'Import Dept HX',
          hxAssignmentId: `HX-${Date.now().toString().slice(-4)}`,
          hxStatus: 'Resmi Dept HX',
          supervisor: item.supervisor || 'Ustadz Pembimbing'
        }));
        localStorage.setItem(
          'noorworship_registered_users_v1',
          JSON.stringify([...newOnes, ...existing])
        );
        window.dispatchEvent(new Event('noorworship_halaqah_updated'));
        onShowToast(`Alhamdulillah! Berhasil mengimpor ${parsedData.length} data karyawan.`);
      }

      // Reset state and close
      setParsedData([]);
      setSelectedFileName('');
      if (fileInputRef.current) fileInputRef.current.value = '';
      onClose();
    } catch (err: any) {
      console.error(err);
      onShowToast(`Gagal mengimpor data: ${err.message || 'Terjadi kesalahan'}`);
    } finally {
      setIsSubmittingImport(false);
    }
  };

  const handleManualFullSync = async () => {
    if (!accessToken || !spreadsheet) {
      onShowToast('Silakan hubungkan akun Google terlebih dahulu');
      return;
    }
    setIsSyncing(true);
    try {
      await syncRosterToSheets(accessToken, spreadsheet.id, ALL_RECITERS_DIRECTORY);
      onShowToast('Alhamdulillah! Seluruh roster karyawan berhasil disinkronkan ke Google Sheets.');
    } catch (err: any) {
      console.error(err);
      onShowToast(`Gagal sinkron: ${err.message}`);
    } finally {
      setIsSyncing(false);
    }
  };

  // Unique halaqahs found in parsed data
  const uniqueHalaqahs = Array.from(new Set(parsedData.map((d) => d.halaqah)));

  return (
    <div className="fixed inset-0 z-50 bg-[#141b2b]/55 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-white rounded-3xl p-5 sm:p-6 shadow-2xl border border-[#1b4332]/10 animate-in zoom-in-95 duration-200 my-auto max-h-[92vh] flex flex-col">
        {/* Close Button */}
        <button
          onClick={onClose}
          aria-label="Tutup modal"
          className="absolute top-4 right-4 w-9 h-9 rounded-full bg-[#f1f3ff] hover:bg-[#e9edff] text-[#414844] flex items-center justify-center transition-colors cursor-pointer z-10"
        >
          <span className="material-symbols-outlined text-[18px]">close</span>
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 pb-3 border-b border-[#f1f3ff] shrink-0">
          <div className="w-11 h-11 rounded-2xl bg-[#00452c]/10 text-[#00452c] flex items-center justify-center shrink-0 shadow-xs">
            <span className="material-symbols-outlined text-[26px]">table_chart</span>
          </div>
          <div className="pr-10">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-bold text-base text-[#141b2b]">
                Kelola Data Karyawan &amp; Halaqah (.xlsx)
              </h3>
              <span className="px-2 py-0.5 rounded-full bg-[#c1ecd4] text-[#002114] text-[10px] font-bold">
                Free Mode • Excel (.xlsx)
              </span>
            </div>
            <p className="text-xs text-[#414844] mt-0.5">
              Ekspor, unduh template, atau impor data karyawan dan kelompok halaqah tanpa biaya API
            </p>
          </div>
        </div>

        {/* Free Mode Badge Banner */}
        <div className="flex items-center gap-2.5 p-3 rounded-2xl bg-[#e9fbf2] border border-[#00452c]/20 text-[#002114] text-xs mt-3 mb-1 shrink-0">
          <span
            className="material-symbols-outlined text-[20px] text-[#00452c] shrink-0"
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            verified
          </span>
          <div className="flex-1">
            <span className="font-bold">Mode Bebas Biaya (Free) Aktif:</span> Pengolahan data spreadsheet (.xlsx) dilakukan 100% lokal di browser dan tersimpan di database <strong>Firebase Spark Plan</strong>. Tidak membutuhkan kuota API cloud berbayar.
          </div>
        </div>

        {/* Tab Selector */}
        <div className="flex items-center gap-1.5 p-1 bg-[#f1f3ff] rounded-2xl mt-1 mb-2 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('import')}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'import'
                ? 'bg-white text-[#012d1d] shadow-xs'
                : 'text-[#414844] hover:text-[#141b2b]'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">table_view</span>
            <span>Impor &amp; Ekspor Sheet (.xlsx) [Gratis]</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('cloud-sync')}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'cloud-sync'
                ? 'bg-white text-[#012d1d] shadow-xs'
                : 'text-[#414844] hover:text-[#141b2b]'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">cloud_sync</span>
            <span>Google Drive Sync (Opsional)</span>
            {user && accessToken && (
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
            )}
          </button>
        </div>

        {/* Tab Content */}
        <div className="py-2 overflow-y-auto flex-1 space-y-4 pr-0.5">
          {activeTab === 'import' ? (
            <div className="space-y-4">
              {/* Step 1, 2, and Export Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Step 1: Download Template */}
                <div className="p-4 rounded-2xl bg-[#f9f9ff] border border-[#1b4332]/10 flex flex-col justify-between space-y-3 shadow-2xs">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 text-xs font-bold text-[#00452c]">
                      <span className="w-6 h-6 rounded-full bg-[#00452c] text-white text-[11px] flex items-center justify-center font-bold">
                        1
                      </span>
                      <span>Unduh Template</span>
                    </div>
                    <p className="text-xs text-[#414844] leading-relaxed">
                      Format Sheet (.xlsx) per kolom A–E: No, Nama, Halaqah, Pembimbing, Passcode.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleDownloadTemplate}
                    className="w-full py-2.5 px-3 rounded-xl bg-white hover:bg-[#c1ecd4]/50 text-[#00452c] text-xs font-bold border border-[#00452c]/20 transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer active:scale-98"
                  >
                    <span className="material-symbols-outlined text-[17px]">download</span>
                    <span>Download Template</span>
                  </button>
                </div>

                {/* Step 2: Upload Data */}
                <div className="p-4 rounded-2xl bg-[#e9fbf2]/60 border border-[#00452c]/15 flex flex-col justify-between space-y-3 shadow-2xs">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 text-xs font-bold text-[#012d1d]">
                      <span className="w-6 h-6 rounded-full bg-[#012d1d] text-white text-[11px] flex items-center justify-center font-bold">
                        2
                      </span>
                      <span>Upload Data</span>
                    </div>
                    <p className="text-xs text-[#414844] leading-relaxed">
                      Unggah file template (.xlsx / .csv) yang telah diisi untuk langsung didaftarkan ke sistem.
                    </p>
                  </div>

                  <div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".xlsx, .xls, .csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel, text/csv"
                      onChange={handleFileChange}
                      className="hidden"
                      id="upload-csv-input"
                    />
                    <label
                      htmlFor="upload-csv-input"
                      className="w-full py-2.5 px-3 rounded-xl bg-[#012d1d] hover:bg-[#1b4332] text-white text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer active:scale-98 text-center"
                    >
                      <span className="material-symbols-outlined text-[17px] text-[#fed488]">
                        upload_file
                      </span>
                      <span>{selectedFileName ? 'Ganti File' : 'Pilih File .xlsx'}</span>
                    </label>
                  </div>
                </div>

                {/* Step 3: Export All Data */}
                <div className="p-4 rounded-2xl bg-[#f9f9ff] border border-[#1b4332]/10 flex flex-col justify-between space-y-3 shadow-2xs">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 text-xs font-bold text-[#775a19]">
                      <span className="w-6 h-6 rounded-full bg-[#775a19] text-white text-[11px] flex items-center justify-center font-bold">
                        3
                      </span>
                      <span>Ekspor Data Saat Ini</span>
                    </div>
                    <p className="text-xs text-[#414844] leading-relaxed">
                      Unduh salinan backup seluruh karyawan &amp; halaqah aktif ke spreadsheet (.xlsx) per kolom.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (onExportAll) {
                        onExportAll();
                      } else {
                        onShowToast('Mengekspor data karyawan...');
                      }
                    }}
                    className="w-full py-2.5 px-3 rounded-xl bg-white hover:bg-[#fed488]/40 text-[#775a19] text-xs font-bold border border-[#775a19]/30 transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer active:scale-98"
                  >
                    <span className="material-symbols-outlined text-[17px]">file_download</span>
                    <span>Ekspor Sheet (.xlsx)</span>
                  </button>
                </div>
              </div>

              {/* Status / Parsing Indicator */}
              {isProcessingFile && (
                <div className="p-4 rounded-2xl bg-[#f1f3ff] flex items-center justify-center gap-2 text-xs text-[#012d1d] font-semibold">
                  <span className="material-symbols-outlined text-[18px] animate-spin text-[#00452c]">
                    progress_activity
                  </span>
                  <span>Membaca dan memvalidasi file spreadsheet...</span>
                </div>
              )}

              {/* Parse Errors */}
              {parseErrors.length > 0 && (
                <div className="p-3.5 rounded-2xl bg-red-50 border border-red-200 text-xs text-red-800 space-y-1">
                  <div className="flex items-center gap-1.5 font-bold">
                    <span className="material-symbols-outlined text-[16px]">warning</span>
                    <span>Peringatan Format:</span>
                  </div>
                  <ul className="list-disc list-inside text-[11px] space-y-0.5 text-red-700">
                    {parseErrors.map((err, i) => (
                      <li key={i}>{err}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Data Preview Section */}
              {parsedData.length > 0 && (
                <div className="p-4 rounded-2xl bg-white border border-[#1b4332]/15 space-y-3 shadow-sm">
                  {/* Summary Bar */}
                  <div className="flex items-center justify-between flex-wrap gap-2 pb-2 border-b border-[#f1f3ff]">
                    <div>
                      <span className="text-xs font-bold text-[#141b2b] flex items-center gap-1">
                        <span className="material-symbols-outlined text-[16px] text-emerald-600">
                          task_alt
                        </span>
                        File Terpilih: <span className="font-mono text-[#012d1d]">{selectedFileName}</span>
                      </span>
                      <p className="text-[11px] text-[#717973]">
                        Data valid siap dimasukkan ke sistem Dept HX
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-bold">
                        👥 {parsedData.length} Karyawan
                      </span>
                      <span className="px-2.5 py-1 rounded-full bg-[#e9edff] text-[#012d1d] text-[11px] font-bold">
                        🕌 {uniqueHalaqahs.length} Halaqah
                      </span>
                    </div>
                  </div>

                  {/* Halaqah Tags */}
                  <div className="text-[11px] text-[#414844] space-y-1">
                    <span className="font-semibold text-[#141b2b]">Halaqah yang Terdeteksi:</span>
                    <div className="flex flex-wrap gap-1 mt-0.5">
                      {uniqueHalaqahs.map((grp, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-0.5 rounded-lg bg-[#f1f3ff] text-[#012d1d] font-medium border border-[#1b4332]/10"
                        >
                          {grp}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Table Preview */}
                  <div className="max-h-48 overflow-y-auto border border-[#1b4332]/10 rounded-xl overflow-hidden">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-[#f1f3ff] text-[#012d1d] font-bold sticky top-0">
                        <tr>
                          <th className="py-2 px-2.5">No</th>
                          <th className="py-2 px-2.5">Nama Karyawan</th>
                          <th className="py-2 px-2.5">Kelompok Halaqah</th>
                          <th className="py-2 px-2.5">Pembimbing</th>
                          <th className="py-2 px-2.5 text-center">Passcode</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#f1f3ff]">
                        {parsedData.slice(0, 15).map((row, idx) => (
                          <tr key={idx} className="hover:bg-[#f9f9ff]">
                            <td className="py-1.5 px-2.5 text-[#717973] font-mono">{idx + 1}</td>
                            <td className="py-1.5 px-2.5 font-bold text-[#141b2b]">{row.name}</td>
                            <td className="py-1.5 px-2.5 text-[#414844]">{row.halaqah}</td>
                            <td className="py-1.5 px-2.5 text-[#414844]">{row.supervisor}</td>
                            <td className="py-1.5 px-2.5 text-center font-mono font-bold text-[#012d1d]">
                              {row.passcode || '1234'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {parsedData.length > 15 && (
                    <p className="text-[11px] text-center text-[#717973] italic">
                      + Menampilkan 15 dari total {parsedData.length} baris data karyawan
                    </p>
                  )}

                  {/* Action Confirm */}
                  <div className="flex items-center gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setParsedData([]);
                        setSelectedFileName('');
                        if (fileInputRef.current) fileInputRef.current.value = '';
                      }}
                      className="px-4 py-2.5 rounded-xl bg-[#f1f3ff] hover:bg-[#e9edff] text-xs font-bold text-[#414844] cursor-pointer transition-colors"
                    >
                      Batal
                    </button>
                    <button
                      type="button"
                      onClick={handleExecuteImport}
                      disabled={isSubmittingImport}
                      className="flex-1 py-2.5 px-4 rounded-xl bg-[#00452c] hover:bg-[#012d1d] text-white text-xs font-bold flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer active:scale-98"
                    >
                      {isSubmittingImport ? (
                        <>
                          <span className="material-symbols-outlined text-[16px] animate-spin">
                            progress_activity
                          </span>
                          <span>Memproses Impor Data...</span>
                        </>
                      ) : (
                        <>
                          <span className="material-symbols-outlined text-[16px] text-[#fed488]">
                            how_to_reg
                          </span>
                          <span>Impor &amp; Daftarkan {parsedData.length} Karyawan ke Halaqah</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* Instructions Box */}
              <div className="p-3.5 rounded-2xl bg-[#f1f3ff]/70 border border-[#1b4332]/5 text-xs text-[#414844] space-y-1">
                <span className="font-bold text-[#141b2b] text-[11px] uppercase tracking-wider block">
                  💡 Panduan Format Spreadsheet Per Kolom:
                </span>
                <p className="leading-relaxed">
                  1. File template dibuat dalam format <strong>Sheet / Excel (.xlsx)</strong> asli, di mana <strong>Kolom A: No</strong>, <strong>Kolom B: Nama Karyawan</strong>, <strong>Kolom C: Kelompok Halaqah</strong>, <strong>Kolom D: Ustadz Pembimbing</strong>, dan <strong>Kolom E: Passcode Login</strong>. Data tidak akan menyatu dalam satu kolom.
                </p>
                <p className="leading-relaxed">
                  2. Jika nama halaqah pada data belum terdaftar, sistem akan <strong>otomatis membuat kelompok halaqah baru</strong> untuk karyawan tersebut.
                </p>
                <p className="leading-relaxed">
                  3. Karyawan yang telah diimpor dapat langsung login di aplikasi menggunakan nama dan passcode mereka (default: <strong>1234</strong>).
                </p>
              </div>
            </div>
          ) : (
            /* Cloud Sync Tab */
            <div className="space-y-4">
              {!user || !accessToken ? (
                /* Not Connected State */
                <div className="space-y-4">
                  {/* Information Banner */}
                  <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200/80 text-amber-900 text-xs space-y-1">
                    <div className="flex items-center gap-1.5 font-bold text-amber-800">
                      <span className="material-symbols-outlined text-[17px]">info</span>
                      <span>Fitur Opsional (Google Account Sync):</span>
                    </div>
                    <p className="text-[11px] text-amber-900/90 leading-relaxed">
                      Tab ini opsional jika Anda ingin auto-sync ke Google Drive. Untuk operasional <strong>100% Bebas Biaya (Free)</strong> tanpa verifikasi OAuth Google, Anda cukup memakai <strong>Tab 1 (Impor &amp; Ekspor Sheet .xlsx Lokal)</strong>.
                    </p>
                  </div>

                  <div className="p-4 rounded-2xl bg-[#f1f3ff] border border-[#1b4332]/5 space-y-2">
                    <div className="flex items-center gap-2 text-xs font-bold text-[#012d1d]">
                      <span className="material-symbols-outlined text-[18px] text-[#00452c]">
                        cloud_sync
                      </span>
                      Sinkronisasi Spreadsheet Google Drive
                    </div>
                    <p className="text-xs text-[#414844] leading-relaxed">
                      Hubungkan dengan akun Google Anda untuk mencatat seluruh presensi shalat berjamaah, nilai tes tilawah, dan mutaba&apos;ah ibadah harian secara otomatis ke Google Spreadsheet pribadi Anda.
                    </p>
                  </div>

                  {/* Official Google Sign-in Button */}
                  <button
                    type="button"
                    onClick={onConnectGoogle}
                    disabled={isConnecting}
                    className="w-full h-12 px-4 rounded-full border border-[#717973]/30 bg-white hover:bg-[#f9f9ff] text-[#141b2b] text-xs sm:text-sm font-semibold flex items-center justify-center gap-3 shadow-sm active:scale-[0.99] transition-all cursor-pointer"
                  >
                    {isConnecting ? (
                      <>
                        <span className="material-symbols-outlined text-[18px] animate-spin">
                          progress_activity
                        </span>
                        <span>Menghubungkan ke Google...</span>
                      </>
                    ) : (
                      <>
                        <svg className="w-5 h-5 shrink-0" viewBox="0 0 48 48">
                          <path
                            fill="#EA4335"
                            d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
                          />
                          <path
                            fill="#4285F4"
                            d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
                          />
                          <path
                            fill="#FBBC05"
                            d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
                          />
                          <path
                            fill="#34A853"
                            d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
                          />
                        </svg>
                        <span>Masuk dengan Google (Aktifkan Sheets)</span>
                      </>
                    )}
                  </button>
                </div>
              ) : (
                /* Connected State */
                <div className="space-y-4">
                  {/* Connected User Card */}
                  <div className="flex items-center justify-between p-3.5 rounded-2xl bg-[#f1f3ff]">
                    <div className="flex items-center gap-3 min-w-0">
                      {user.photoURL ? (
                        <img
                          src={user.photoURL}
                          alt={user.displayName || 'Google User'}
                          className="w-10 h-10 rounded-full object-cover shrink-0 ring-2 ring-[#c1ecd4]"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-[#012d1d] text-white flex items-center justify-center font-bold shrink-0">
                          {(user.displayName || user.email || 'G')[0].toUpperCase()}
                        </div>
                      )}
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-[#141b2b] truncate">
                          {user.displayName || 'Pengguna Google'}
                        </div>
                        <div className="text-[11px] text-[#414844] truncate">{user.email}</div>
                      </div>
                    </div>
                    <span className="px-2.5 py-0.5 rounded-full bg-[#c1ecd4] text-[#002114] text-[10px] font-bold flex items-center gap-1 shrink-0">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#00452c]" />
                      Terhubung
                    </span>
                  </div>

                  {/* Spreadsheet Target Card */}
                  {spreadsheet && (
                    <div className="p-4 rounded-2xl bg-[#e9edff]/50 border border-[#1b4332]/10 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-[#012d1d] flex items-center gap-1.5">
                          <span className="material-symbols-outlined text-[16px] text-[#00452c]">
                            description
                          </span>
                          Spreadsheet Aktif
                        </span>
                        <span className="text-[10px] text-[#775a19] font-semibold">Otomatis Update</span>
                      </div>
                      <div className="text-xs font-semibold text-[#141b2b] bg-white p-2.5 rounded-xl border border-[#1b4332]/5 truncate">
                        {spreadsheet.title}
                      </div>

                      {/* Direct Link to Google Sheets */}
                      <a
                        href={spreadsheet.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full py-2.5 px-3 rounded-xl bg-[#012d1d] hover:bg-[#1b4332] text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm transition-colors"
                      >
                        <span>Buka Spreadsheet di Google Drive</span>
                        <span className="material-symbols-outlined text-[15px]">open_in_new</span>
                      </a>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex gap-2 pt-2 border-t border-[#f1f3ff]">
                    <button
                      type="button"
                      onClick={onDisconnectGoogle}
                      className="flex-1 py-2.5 rounded-full bg-[#f1f3ff] hover:bg-[#ffdad6] text-[#ba1a1a] text-xs font-bold transition-colors cursor-pointer"
                    >
                      Putus Sambungan
                    </button>
                    <button
                      type="button"
                      onClick={handleManualFullSync}
                      disabled={isSyncing}
                      className="flex-1 py-2.5 rounded-full bg-[#00452c] hover:bg-[#012d1d] text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm transition-colors cursor-pointer"
                    >
                      <span
                        className={`material-symbols-outlined text-[16px] ${
                          isSyncing ? 'animate-spin' : ''
                        }`}
                      >
                        sync
                      </span>
                      <span>{isSyncing ? 'Menyinkronkan...' : 'Sinkronkan Roster'}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
