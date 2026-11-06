import * as XLSX from 'xlsx';

/**
 * Utility for exporting and parsing Spreadsheet workbooks (.xlsx / Excel / Google Sheets)
 * Guarantees native per-column layout:
 * Column A: No
 * Column B: Nama Karyawan
 * Column C: Kelompok Halaqah
 * Column D: Ustadz Pembimbing
 * Column E: Passcode Login
 * Zero quotation marks or merged comma strings!
 */

export interface ImportedReciterRecord {
  name: string;
  halaqah: string;
  supervisor?: string;
  passcode?: string;
  phone?: string;
}

/**
 * Downloads a genuine Excel spreadsheet (.xlsx) where each cell is placed natively
 * into its own column (Column A, Column B, Column C, etc.).
 */
export const downloadExcelSheet = (
  filename: string,
  headers: string[],
  rows: (string | number | undefined | null)[][],
  sheetName: string = 'Data'
) => {
  const finalFilename = filename.toLowerCase().endsWith('.xlsx')
    ? filename
    : `${filename.replace(/\.csv$/i, '')}.xlsx`;

  // Create 2D array: row 0 is headers, subsequent rows are cell values
  const aoaData: any[][] = [
    headers,
    ...rows.map((row) =>
      row.map((cell) => {
        if (cell === null || cell === undefined) return '';
        // If string wrapped in accidental quotes, strip them cleanly
        if (typeof cell === 'string') {
          return cell.replace(/^"(.*)"$/, '$1').trim();
        }
        return cell;
      })
    )
  ];

  const ws = XLSX.utils.aoa_to_sheet(aoaData);

  // Auto-calculate column widths
  const colWidths = headers.map((h, colIdx) => {
    let maxLen = String(h).length;
    rows.forEach((r) => {
      const valStr = String(r[colIdx] ?? '');
      if (valStr.length > maxLen) maxLen = valStr.length;
    });
    return { wch: Math.min(Math.max(maxLen + 4, 12), 45) };
  });
  ws['!cols'] = colWidths;

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName.slice(0, 31));

  // Trigger browser download of genuine .xlsx file
  XLSX.writeFile(wb, finalFilename);
};

/**
 * Backwards-compatible alias: redirects to downloadExcelSheet (.xlsx)
 * so all existing export buttons generate native per-column Excel sheets.
 */
export const downloadPerColumnCSV = (
  filename: string,
  headers: string[],
  rows: (string | number | undefined | null)[][],
  sheetName: string = 'Data'
) => {
  downloadExcelSheet(filename, headers, rows, sheetName);
};

/**
 * Downloads ready-to-use template Excel Sheet (.xlsx) for employee & halaqah imports.
 * Column A: No
 * Column B: Nama Karyawan
 * Column C: Kelompok Halaqah
 * Column D: Ustadz Pembimbing
 * Column E: Passcode Login
 */
export const downloadImportTemplateSheet = () => {
  const headers = ['No', 'Nama Karyawan', 'Kelompok Halaqah', 'Ustadz Pembimbing', 'Passcode Login'];
  const sampleRows = [
    [1, 'Ahmad Fauzi', 'Halaqah Al-Fajr', 'Ustadz Farhan', '1234'],
    [2, 'Rizky Ramadhan', 'Hafiz Circle', 'Ustadz Tariq Mansoor', '1234'],
    [3, 'Irfan Maulana', 'Youth Tajweed', 'Ustadzah Sarah', '1234'],
    [4, 'Danang Prasetyo', 'Halaqah Ar-Rayyan', 'Ustadz Zulkifli', '1234'],
    [5, 'Fikri Hakim', 'Madinah Memorization Circle', 'Ustadz Mansoor', '1234']
  ];

  downloadExcelSheet(
    'Template_Import_Karyawan_dan_Halaqah.xlsx',
    headers,
    sampleRows,
    'Template Karyawan'
  );
};

// Also keep downloadImportTemplateCSV alias pointing to the clean sheet template
export const downloadImportTemplateCSV = () => {
  downloadImportTemplateSheet();
};

/**
 * Parses any uploaded spreadsheet file (.xlsx, .xls, .csv, .tsv) into structured reciter records.
 */
export const parseReciterFile = async (
  file: File
): Promise<{ records: ImportedReciterRecord[]; errors: string[] }> => {
  const errors: string[] = [];

  try {
    const arrayBuffer = await file.arrayBuffer();
    const wb = XLSX.read(arrayBuffer, { type: 'array' });

    if (!wb.SheetNames || wb.SheetNames.length === 0) {
      return { records: [], errors: ['File spreadsheet tidak memiliki lembar kerja (sheet).'] };
    }

    const firstSheetName = wb.SheetNames[0];
    const ws = wb.Sheets[firstSheetName];
    const rawRows = XLSX.utils.sheet_to_json<any[]>(ws, { header: 1 });

    if (!rawRows || rawRows.length === 0) {
      return { records: [], errors: ['Lembar kerja (sheet) kosong atau tidak memiliki data.'] };
    }

    // Find header row (first non-empty row)
    let headerRowIdx = -1;
    for (let i = 0; i < rawRows.length; i++) {
      const row = rawRows[i];
      if (Array.isArray(row) && row.some((cell) => cell !== undefined && cell !== null && String(cell).trim() !== '')) {
        headerRowIdx = i;
        break;
      }
    }

    if (headerRowIdx === -1) {
      return { records: [], errors: ['Tidak dapat menemukan baris judul/header di dalam file.'] };
    }

    const headerCells = (rawRows[headerRowIdx] as any[]).map((h) =>
      String(h ?? '')
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '')
    );

    let nameIdx = -1;
    let halaqahIdx = -1;
    let supervisorIdx = -1;
    let passcodeIdx = -1;
    let phoneIdx = -1;

    headerCells.forEach((header, idx) => {
      if (
        header.includes('nama') ||
        header.includes('name') ||
        header.includes('santri') ||
        header.includes('karyawan')
      ) {
        if (nameIdx === -1) nameIdx = idx;
      } else if (
        header.includes('halaqah') ||
        header.includes('kelompok') ||
        header.includes('halaqoh') ||
        header.includes('group')
      ) {
        if (halaqahIdx === -1) halaqahIdx = idx;
      } else if (
        header.includes('pembimbing') ||
        header.includes('ustadz') ||
        header.includes('supervisor') ||
        header.includes('guru')
      ) {
        if (supervisorIdx === -1) supervisorIdx = idx;
      } else if (
        header.includes('passcode') ||
        header.includes('pin') ||
        header.includes('password') ||
        header.includes('sandi')
      ) {
        if (passcodeIdx === -1) passcodeIdx = idx;
      } else if (
        header.includes('phone') ||
        header.includes('telp') ||
        header.includes('hp') ||
        header.includes('wa') ||
        header.includes('kontak')
      ) {
        if (phoneIdx === -1) phoneIdx = idx;
      }
    });

    // Fallbacks if header naming varies
    if (nameIdx === -1) {
      if (headerCells.length > 1 && (headerCells[0] === 'no' || headerCells[0] === 'id')) {
        nameIdx = 1;
        halaqahIdx = headerCells.length > 2 ? 2 : -1;
        supervisorIdx = headerCells.length > 3 ? 3 : -1;
        passcodeIdx = headerCells.length > 4 ? 4 : -1;
      } else {
        nameIdx = 0;
        halaqahIdx = headerCells.length > 1 ? 1 : -1;
        supervisorIdx = headerCells.length > 2 ? 2 : -1;
        passcodeIdx = headerCells.length > 3 ? 3 : -1;
      }
    }

    const records: ImportedReciterRecord[] = [];

    for (let i = headerRowIdx + 1; i < rawRows.length; i++) {
      const row = rawRows[i];
      if (!Array.isArray(row) || row.length === 0) continue;

      const rawName = row[nameIdx];
      if (rawName === undefined || rawName === null) continue;
      const cleanName = String(rawName).trim();
      if (!cleanName || cleanName.toLowerCase() === 'nama' || cleanName.toLowerCase() === 'nama karyawan') {
        continue;
      }

      const rawHalaqah = halaqahIdx !== -1 ? row[halaqahIdx] : null;
      const cleanHalaqah = rawHalaqah ? String(rawHalaqah).trim() : 'Halaqah Al-Fajr';

      const rawSupervisor = supervisorIdx !== -1 ? row[supervisorIdx] : null;
      const cleanSupervisor = rawSupervisor ? String(rawSupervisor).trim() : 'Ustadz Pembimbing';

      const rawPasscode = passcodeIdx !== -1 ? row[passcodeIdx] : null;
      const cleanPasscode = rawPasscode ? String(rawPasscode).trim() : '1234';

      const rawPhone = phoneIdx !== -1 ? row[phoneIdx] : null;
      const cleanPhone = rawPhone ? String(rawPhone).trim() : '';

      records.push({
        name: cleanName,
        halaqah: cleanHalaqah || 'Halaqah Al-Fajr',
        supervisor: cleanSupervisor || 'Ustadz Pembimbing',
        passcode: cleanPasscode || '1234',
        phone: cleanPhone
      });
    }

    if (records.length === 0) {
      errors.push('Tidak ditemukan baris data karyawan yang valid di dalam file spreadsheet.');
    }

    return { records, errors };
  } catch (err: any) {
    return { records: [], errors: [`Gagal memproses spreadsheet: ${err.message || 'Format tidak valid'}`] };
  }
};

/**
 * Text-based CSV parser fallback (for raw text input if needed).
 */
export const parseReciterCSV = (rawText: string): { records: ImportedReciterRecord[]; errors: string[] } => {
  try {
    const wb = XLSX.read(rawText, { type: 'string' });
    const firstSheetName = wb.SheetNames[0];
    const ws = wb.Sheets[firstSheetName];
    const rawRows = XLSX.utils.sheet_to_json<any[]>(ws, { header: 1 });
    if (!rawRows || rawRows.length < 2) {
      return { records: [], errors: ['Data tidak memuat baris yang cukup.'] };
    }
    // Convert first row to headers and rest to data
    const headerCells = (rawRows[0] as any[]).map((h) => String(h ?? '').toLowerCase());
    const nameIdx = headerCells.findIndex((h) => h.includes('nama') || h.includes('santri') || h.includes('name'));
    const halaqahIdx = headerCells.findIndex((h) => h.includes('halaqah') || h.includes('kelompok'));
    const supervisorIdx = headerCells.findIndex((h) => h.includes('pembimbing') || h.includes('ustadz'));
    const passcodeIdx = headerCells.findIndex((h) => h.includes('passcode') || h.includes('pin'));

    const records: ImportedReciterRecord[] = [];
    for (let i = 1; i < rawRows.length; i++) {
      const row = rawRows[i];
      if (!Array.isArray(row)) continue;
      const name = String(row[nameIdx >= 0 ? nameIdx : 1] || '').trim();
      if (!name) continue;
      records.push({
        name,
        halaqah: String(row[halaqahIdx >= 0 ? halaqahIdx : 2] || 'Halaqah Al-Fajr').trim(),
        supervisor: String(row[supervisorIdx >= 0 ? supervisorIdx : 3] || 'Ustadz Pembimbing').trim(),
        passcode: String(row[passcodeIdx >= 0 ? passcodeIdx : 4] || '1234').trim()
      });
    }
    return { records, errors: [] };
  } catch (err: any) {
    return { records: [], errors: [err.message] };
  }
};
