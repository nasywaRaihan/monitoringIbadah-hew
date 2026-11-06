import { ReciterProfile } from '../types';

export const SPREADSHEET_TITLE = 'NoorWorship - Database & Rekap Halaqah';

export interface SpreadsheetInfo {
  id: string;
  url: string;
  title: string;
}

/**
 * Find or automatically create a Google Spreadsheet with structured tables
 */
export async function findOrCreateSpreadsheet(
  accessToken: string
): Promise<SpreadsheetInfo> {
  // 1. Search for existing spreadsheet in Drive
  const searchUrl = `https://www.googleapis.com/drive/v3/files?q=name='${encodeURIComponent(
    SPREADSHEET_TITLE
  )}' and mimeType='application/vnd.google-apps.spreadsheet' and trashed=false&fields=files(id,name,webViewLink)`;

  const searchRes = await fetch(searchUrl, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });

  if (searchRes.ok) {
    const data = await searchRes.json();
    if (data.files && data.files.length > 0) {
      const file = data.files[0];
      return {
        id: file.id,
        url: file.webViewLink || `https://docs.google.com/spreadsheets/d/${file.id}`,
        title: file.name
      };
    }
  }

  // 2. Create new spreadsheet if none exists
  const createUrl = 'https://sheets.googleapis.com/v4/spreadsheets';
  const newSpreadsheetBody = {
    properties: {
      title: SPREADSHEET_TITLE
    },
    sheets: [
      {
        properties: {
          title: 'DailyWorshipLogs',
          gridProperties: { rowCount: 100, columnCount: 10 }
        }
      },
      {
        properties: {
          title: 'RecitationAssessments',
          gridProperties: { rowCount: 100, columnCount: 12 }
        }
      },

      {
        properties: {
          title: 'RecitersRoster',
          gridProperties: { rowCount: 100, columnCount: 10 }
        }
      }
    ]
  };

  const createRes = await fetch(createUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(newSpreadsheetBody)
  });

  if (!createRes.ok) {
    const errText = await createRes.text();
    throw new Error(`Gagal membuat Google Spreadsheet: ${errText}`);
  }

  const createdData = await createRes.json();
  const spreadsheetId = createdData.spreadsheetId;

  // Initialize header rows
  await initializeSheetHeaders(accessToken, spreadsheetId);

  return {
    id: spreadsheetId,
    url: createdData.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${spreadsheetId}`,
    title: SPREADSHEET_TITLE
  };
}

/**
 * Initialize headers in the newly created sheets
 */
async function initializeSheetHeaders(accessToken: string, spreadsheetId: string) {
  const headerData = [
    {
      range: 'DailyWorshipLogs!A1:G1',
      values: [
        [
          'Waktu Catat',
          'Tanggal',
          'Nama Karyawan/User',
          'Aktivitas Ibadah',
          'Kategori / Target',
          'XP Didapat',
          'Status Presensi'
        ]
      ]
    },
    {
      range: 'RecitationAssessments!A1:I1',
      values: [
        [
          'Waktu Ujian',
          'Nama Reciter',
          'Surah & Ayat',
          'Akurasi Keseluruhan',
          'Skor Makharij',
          'Skor Tajwid',
          'Skor Kelancaran (Fluency)',
          'Tingkat Evaluasi',
          'Catatan/Tip Ustadz'
        ]
      ]
    },
    {
      range: 'RecitersRoster!A1:H1',
      values: [
        [
          'ID Karyawan',
          'Nama Lengkap',
          'Kelompok Halaqah',
          'Pembimbing / Ustadz',
          'Akurasi Tajwid (%)',
          'Streak (Hari)',
          'Total XP',
          'Status Kelayakan'
        ]
      ]
    }
  ];

  await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        valueInputOption: 'USER_ENTERED',
        data: headerData
      })
    }
  );
}

/**
 * Append a row of data to a specific sheet
 */
export async function appendRow(
  accessToken: string,
  spreadsheetId: string,
  sheetName: string,
  rowValues: (string | number)[]
) {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${sheetName}!A1:append?valueInputOption=USER_ENTERED`;

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      values: [rowValues]
    })
  });

  if (!res.ok) {
    const err = await res.text();
    console.error(`Gagal append ke ${sheetName}:`, err);
    throw new Error(`Gagal menyimpan ke Google Sheets: ${err}`);
  }

  return await res.json();
}

/**
 * Log daily worship task completion to Google Sheets
 */
export async function logDailyTaskToSheets(
  accessToken: string,
  spreadsheetId: string,
  taskTitle: string,
  category: string,
  xp: number,
  userName = 'Zubair Ahmed'
) {
  const now = new Date();
  const timeStr = now.toLocaleTimeString('id-ID');
  const dateStr = now.toLocaleDateString('id-ID');

  return appendRow(accessToken, spreadsheetId, 'DailyWorshipLogs', [
    timeStr,
    dateStr,
    userName,
    taskTitle,
    category,
    xp,
    'Selesai (Verified)'
  ]);
}

/**
 * Log recitation test assessment to Google Sheets
 */
export async function logRecitationToSheets(
  accessToken: string,
  spreadsheetId: string,
  reciterName: string,
  surah: string,
  accuracy: string,
  makharij: string,
  tajweed: string,
  fluency: string,
  grade: string,
  ustadhTip: string
) {
  const now = new Date();
  const timeStr = `${now.toLocaleDateString('id-ID')} ${now.toLocaleTimeString('id-ID')}`;

  return appendRow(accessToken, spreadsheetId, 'RecitationAssessments', [
    timeStr,
    reciterName,
    surah,
    accuracy,
    makharij,
    tajweed,
    fluency,
    grade,
    ustadhTip
  ]);
}

/**
 * Sync entire roster of reciters to Google Sheets
 */
export async function syncRosterToSheets(
  accessToken: string,
  spreadsheetId: string,
  roster: ReciterProfile[]
) {
  const values = roster.map((r) => [
    r.id,
    r.name,
    r.group,
    r.supervisor,
    `${r.tajweedAcc}%`,
    r.streakDays,
    r.totalXp,
    r.status
  ]);

  // Overwrite existing roster data from row 2 onwards
  const updateUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/RecitersRoster!A2:H${
    roster.length + 1
  }?valueInputOption=USER_ENTERED`;

  const res = await fetch(updateUrl, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ values })
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Gagal sync roster ke Google Sheets: ${err}`);
  }

  return await res.json();
}
