import { RECITATION_AYAHS, RecitationAyah, AyahWord } from '../data/recitationVerses';

export interface DetailKataEvaluasi {
  kata_target: string;
  kata_terbaca: string;
  status: 'benar' | 'salah' | 'terlewat';
  catatan_kesalahan: string;
}

export interface QuranEvaluationJSON {
  skor_akurasi: number;
  status_kelulusan: 'Lulus' | 'Perlu Perbaikan';
  detail_kata: DetailKataEvaluasi[];
  ringkasan_saran: string;
}

/**
 * Normalizes Arabic text by removing light diacritics (harakat/tashkeel),
 * unifying Hamzah/Alif forms (أ, إ, آ, ٱ -> ا), Uthmani symbols, and punctuation
 * per Rule 2: "Abaikan perbedaan penulisan harakat ringan atau perbedaan gaya penulisan Hamzah/Alif
 * (seperti أ, إ, آ dengan ا) kecuali jika mengubah bunyi bacaan secara fatal."
 */
export function normalizeArabic(text: string): string {
  if (!text) return '';
  return (
    text
      // Convert Uthmani superscribed/dagger alif (ـٰ) into standard alif where standard Imla'i writes it, or strip light tashkeel
      .replace(/\u0670/g, 'ا')
      // Remove Arabic diacritics / tashkeel / harakat / Quranic pause marks
      .replace(/[\u064B-\u065F\u06D6-\u06ED\u08F0-\u08FF]/g, '')
      // Unify all forms of Alif & Hamzah on Alif (أ إ آ ٱ ٲ ٳ) -> ا
      .replace(/[أإآٱٲٳ]/g, 'ا')
      // Unify Hamzah on Waw/Ya variants for comparison tolerance where Imla'i differs
      .replace(/[ؤ]/g, 'و')
      .replace(/[ئ]/g, 'ي')
      // Unify Ta Marbuta (ة) -> ه
      .replace(/ة/g, 'ه')
      // Unify Alif Maqsura (ى) -> ي
      .replace(/ى/g, 'ي')
      // Remove tatweel / kashida & zero-width chars
      .replace(/[\u0640\u200B-\u200F\uFEFF]/g, '')
      // Remove punctuation, ayah numbers, & symbols
      .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()؟،۝٠-٩0-9"“”'’«»\[\]]/g, '')
      .replace(/\s+/g, ' ')
      .trim()
  );
}

/**
 * Further normalizes skeleton consonants (rasm) by collapsing duplicate consecutive Alifs
 * that arise when converting Uthmani dagger alif (e.g. الرَّحْمَٰنِ -> الرحمان vs الرحمن).
 */
export function normalizeArabicSkeleton(word: string): string {
  const base = normalizeArabic(word).replace(/\s+/g, '');
  if (!base) return '';
  return base
    .replace(/ا+/g, 'ا')
    .replace(/^ال/, 'ال')
    // Handle common Uthmani vs Imla'i alif differences (e.g. رحمان <-> رحمن, سموت <-> سماوات, اله <-> الاه)
    .replace(/ا/g, '');
}

/**
 * Computes Levenshtein edit distance between two Arabic strings
 */
function computeEditDistance(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost
      );
    }
  }
  return dp[m][n];
}

/**
 * Checks whether a target word and a transcribed word are the same word
 * under Rule 2 (ignoring light harakat and Hamzah/Alif/Uthmani orthographic style differences).
 */
export function isArabicWordMatch(targetWord: string, spokenWord: string): boolean {
  const normTarget = normalizeArabic(targetWord).replace(/\s+/g, '');
  const normSpoken = normalizeArabic(spokenWord).replace(/\s+/g, '');
  if (!normTarget || !normSpoken) return false;
  if (normTarget === normSpoken) return true;

  // Check if difference is purely Uthmani medial Alif (dagger alif vs Imla'i alif) while all other consonants match in exact order
  const skelTarget = normalizeArabicSkeleton(targetWord);
  const skelSpoken = normalizeArabicSkeleton(spokenWord);
  if (skelTarget.length >= 2 && skelTarget === skelSpoken) {
    return true;
  }

  return false;
}

/**
 * Generates a polite, specific Indonesian explanation of the difference between kata_target and kata_terbaca
 * per Rule 3: "Berikan analisis kesalahan yang spesifik (misalnya: tertukar huruf, harakat salah, kata terlewat, atau kelebihan kata)
 * dalam bahasa Indonesia yang santun, ringkas, dan mudah dipahami."
 */
export function analyzeWordMismatch(kataTarget: string, kataTerbaca: string): string {
  if (!kataTerbaca || kataTerbaca === '-') {
    return `Kata "${kataTarget}" terlewat (tidak terdengar dalam transkripsi). Mohon dilafalkan secara utuh dan tartil.`;
  }

  const normTarget = normalizeArabic(kataTarget).replace(/\s+/g, '');
  const normSpoken = normalizeArabic(kataTerbaca).replace(/\s+/g, '');
  const skelTarget = normalizeArabicSkeleton(kataTarget);
  const skelSpoken = normalizeArabicSkeleton(kataTerbaca);

  if (skelTarget && skelSpoken) {
    if (normSpoken.length < normTarget.length && normTarget.includes(normSpoken)) {
      return `Kurang huruf pada pelafalan "${kataTarget}" (terbaca "${kataTerbaca}"). Pastikan seluruh huruf dan mad diucapkan sempurna.`;
    }
    if (normSpoken.length > normTarget.length && normSpoken.includes(normTarget)) {
      return `Terdapat kelebihan huruf pada lafaz "${kataTarget}" (terbaca "${kataTerbaca}"). Perhatikan batas kata dan waqaf/washal.`;
    }

    // Check for single-letter substitution (tertukar huruf / makhraj berdekatan)
    if (skelTarget.length === skelSpoken.length) {
      const diffs: Array<{ expected: string; actual: string }> = [];
      for (let i = 0; i < skelTarget.length; i++) {
        if (skelTarget[i] !== skelSpoken[i]) {
          diffs.push({ expected: skelTarget[i], actual: skelSpoken[i] });
        }
      }
      if (diffs.length === 1) {
        return `Tertukar makhraj huruf "${diffs[0].expected}" menjadi "${diffs[0].actual}" pada lafaz "${kataTarget}" (terbaca "${kataTerbaca}").`;
      }
      if (diffs.length === 2) {
        return `Tertukar huruf pada kata "${kataTarget}" sehingga terdengar "${kataTerbaca}". Perjelas artikulasi makhraj hurufnya.`;
      }
    }

    const dist = computeEditDistance(skelTarget, skelSpoken);
    if (dist <= 2) {
      return `Lafaz "${kataTarget}" terdengar kurang tepat sebagai "${kataTerbaca}". Perbaiki makhraj huruf dan ketepatan harakatnya.`;
    }
  }

  return `Kata yang diucapkan ("${kataTerbaca}") tidak sesuai dengan lafaz ayat asli ("${kataTarget}"). Mohon perhatikan urutan kata pada mushaf.`;
}

/**
 * Evaluates a user's Qur'an recitation transcript against the original verse word-by-word sequentially
 * and returns the strict JSON structure requested:
 * {
 *   "skor_akurasi": 0..100,
 *   "status_kelulusan": "Lulus" | "Perlu Perbaikan", // Lulus jika skor >= 85
 *   "detail_kata": [
 *     {
 *       "kata_target": "...",
 *       "kata_terbaca": "...",
 *       "status": "benar" | "salah" | "terlewat",
 *       "catatan_kesalahan": "..."
 *     }
 *   ],
 *   "ringkasan_saran": "..."
 * }
 */
export function evaluateQuranRecitationJSON(params: {
  surahInfo: string;
  ayatAsli: string;
  hasilTranskripsiGroq: string;
  targetWordsList?: string[];
}): QuranEvaluationJSON {
  const { surahInfo, ayatAsli, hasilTranskripsiGroq, targetWordsList } = params;

  // Tokenize target words from targetWordsList or ayatAsli
  const rawTargetWords =
    targetWordsList && targetWordsList.length > 0
      ? targetWordsList.map((w) => w.trim()).filter(Boolean)
      : (ayatAsli || '')
          .replace(/[۝٠-٩0-9()\[\]]/g, ' ')
          .split(/\s+/)
          .map((w) => w.trim())
          .filter((w) => normalizeArabic(w).length > 0);

  // Tokenize spoken transcript words
  const spokenWords = (hasilTranskripsiGroq || '')
    .replace(/[۝٠-٩0-9()\[\].,،؟!]/g, ' ')
    .split(/\s+/)
    .map((w) => w.trim())
    .filter((w) => w.length > 0);

  if (rawTargetWords.length === 0) {
    return {
      skor_akurasi: 0,
      status_kelulusan: 'Perlu Perbaikan',
      detail_kata: [],
      ringkasan_saran: 'Teks ayat target belum tersedia untuk dievaluasi.'
    };
  }

  if (spokenWords.length === 0) {
    const emptyDetails: DetailKataEvaluasi[] = rawTargetWords.map((targetWord) => ({
      kata_target: targetWord,
      kata_terbaca: '-',
      status: 'terlewat',
      catatan_kesalahan: `Kata "${targetWord}" terlewat karena tidak ada suara/transkripsi yang terdeteksi.`
    }));
    return {
      skor_akurasi: 0,
      status_kelulusan: 'Perlu Perbaikan',
      detail_kata: emptyDetails,
      ringkasan_saran: `Belum ada bacaan ${surahInfo} yang terdengar pada transkripsi. Mohon dekatkan mikrofon dan lafalkan ayat dengan suara jelas serta tartil.`
    };
  }

  // Sequential alignment using Needleman-Wunsch / Dynamic Programming so skipped words ('terlewat')
  // and mispronounced words ('salah') are aligned accurately in order without auto-correcting errors.
  const N = rawTargetWords.length;
  const M = spokenWords.length;

  // Similarity helper between target[i] and spoken[j]
  const wordSimilarity = (tWord: string, sWord: string): number => {
    if (isArabicWordMatch(tWord, sWord)) return 1.0;
    const skelT = normalizeArabicSkeleton(tWord);
    const skelS = normalizeArabicSkeleton(sWord);
    if (!skelT || !skelS) return 0;
    const dist = computeEditDistance(skelT, skelS);
    const maxLen = Math.max(skelT.length, skelS.length);
    return Math.max(0, 1 - dist / maxLen);
  };

  // DP matrix for sequential alignment
  const dp: number[][] = Array.from({ length: N + 1 }, () => Array(M + 1).fill(0));
  const ptr: Array<Array<'match' | 'skip_target' | 'skip_spoken'>> = Array.from(
    { length: N + 1 },
    () => Array(M + 1).fill('skip_target')
  );

  const GAP_PENALTY = -0.45;
  for (let i = 1; i <= N; i++) {
    dp[i][0] = i * GAP_PENALTY;
    ptr[i][0] = 'skip_target';
  }
  for (let j = 1; j <= M; j++) {
    dp[0][j] = j * GAP_PENALTY;
    ptr[0][j] = 'skip_spoken';
  }

  for (let i = 1; i <= N; i++) {
    for (let j = 1; j <= M; j++) {
      const sim = wordSimilarity(rawTargetWords[i - 1], spokenWords[j - 1]);
      // Reward exact match (+1.2) or near phonetic attempt (+0.15 if sim >= 0.35), else penalty (-0.35)
      const pairScore = sim === 1.0 ? 1.2 : sim >= 0.35 ? 0.15 : -0.35;

      const scoreMatch = dp[i - 1][j - 1] + pairScore;
      const scoreSkipTarget = dp[i - 1][j] + GAP_PENALTY;
      const scoreSkipSpoken = dp[i][j - 1] + GAP_PENALTY;

      if (scoreMatch >= scoreSkipTarget && scoreMatch >= scoreSkipSpoken) {
        dp[i][j] = scoreMatch;
        ptr[i][j] = 'match';
      } else if (scoreSkipTarget >= scoreSkipSpoken) {
        dp[i][j] = scoreSkipTarget;
        ptr[i][j] = 'skip_target';
      } else {
        dp[i][j] = scoreSkipSpoken;
        ptr[i][j] = 'skip_spoken';
      }
    }
  }

  // Backtrack to build sequential alignment for each target word
  const alignedSpokenForTarget: Array<string | null> = Array(N).fill(null);
  const extraSpokenWords: string[] = [];

  let ci = N;
  let cj = M;
  while (ci > 0 || cj > 0) {
    if (ci > 0 && cj > 0 && ptr[ci][cj] === 'match') {
      alignedSpokenForTarget[ci - 1] = spokenWords[cj - 1];
      ci--;
      cj--;
    } else if (ci > 0 && (cj === 0 || ptr[ci][cj] === 'skip_target')) {
      alignedSpokenForTarget[ci - 1] = null;
      ci--;
    } else {
      extraSpokenWords.unshift(spokenWords[cj - 1]);
      cj--;
    }
  }

  const detailKata: DetailKataEvaluasi[] = [];
  let correctCount = 0;
  let wrongCount = 0;
  let skippedCount = 0;

  for (let idx = 0; idx < N; idx++) {
    const kataTarget = rawTargetWords[idx];
    const alignedSpoken = alignedSpokenForTarget[idx];

    if (!alignedSpoken) {
      skippedCount++;
      detailKata.push({
        kata_target: kataTarget,
        kata_terbaca: '-',
        status: 'terlewat',
        catatan_kesalahan: analyzeWordMismatch(kataTarget, '-')
      });
    } else if (isArabicWordMatch(kataTarget, alignedSpoken)) {
      correctCount++;
      detailKata.push({
        kata_target: kataTarget,
        kata_terbaca: alignedSpoken,
        status: 'benar',
        catatan_kesalahan: ''
      });
    } else {
      wrongCount++;
      detailKata.push({
        kata_target: kataTarget,
        kata_terbaca: alignedSpoken,
        status: 'salah',
        catatan_kesalahan: analyzeWordMismatch(kataTarget, alignedSpoken)
      });
    }
  }

  // Calculate skor_akurasi (0 to 100 based on percentage of correct words, with mild penalty if extra unrelated words were inserted)
  const rawAccuracy = Math.round((correctCount / N) * 100);
  const extraPenalty = Math.min(20, extraSpokenWords.length * 5);
  const skorAkurasi = Math.max(0, Math.min(100, rawAccuracy - extraPenalty));
  const statusKelulusan: 'Lulus' | 'Perlu Perbaikan' =
    skorAkurasi >= 85 ? 'Lulus' : 'Perlu Perbaikan';

  // Build concise, polite Indonesian summary advice (ringkasan_saran)
  let ringkasanSaran = '';
  if (skorAkurasi === 100) {
    ringkasanSaran = `Masya Allah, bacaan ${surahInfo} sudah sangat tepat dan seluruh kata (${N}/${N}) terlafalkan dengan benar. Pertahankan ketepatan makharijul huruf, konsistensi mad, dan kelancaran tartil Anda.`;
  } else if (statusKelulusan === 'Lulus') {
    const errorExamples = detailKata
      .filter((d) => d.status !== 'benar')
      .slice(0, 2)
      .map((d) => `"${d.kata_target}"`)
      .join(' dan ');
    ringkasanSaran = `Alhamdulillah bacaan ${surahInfo} telah memenuhi standar kelulusan (${skorAkurasi}%). Namun mohon perhatikan kembali pelafalan pada kata ${errorExamples} agar makhraj dan kelancarannya semakin sempurna.`;
  } else {
    const issuesSummary: string[] = [];
    if (wrongCount > 0) {
      const wrongList = detailKata
        .filter((d) => d.status === 'salah')
        .slice(0, 3)
        .map((d) => `"${d.kata_target}" (terbaca "${d.kata_terbaca}")`)
        .join(', ');
      issuesSummary.push(`${wrongCount} kata perlu perbaikan makhraj/huruf (${wrongList})`);
    }
    if (skippedCount > 0) {
      const skippedList = detailKata
        .filter((d) => d.status === 'terlewat')
        .slice(0, 3)
        .map((d) => `"${d.kata_target}"`)
        .join(', ');
      issuesSummary.push(`${skippedCount} kata terlewat (${skippedList})`);
    }
    if (extraSpokenWords.length > 0) {
      issuesSummary.push(`terdapat ${extraSpokenWords.length} kelebihan kata di luar teks ayat`);
    }
    ringkasanSaran = `Bacaan ${surahInfo} memerlukan perbaikan (${skorAkurasi}%): ditemukan ${issuesSummary.join(' serta ')}. Disarankan menyimak panduan audio Qari dan melatih kembali kata yang ditandai merah secara perlahan (tahqiq).`;
  }

  return {
    skor_akurasi: skorAkurasi,
    status_kelulusan: statusKelulusan,
    detail_kata: detailKata,
    ringkasan_saran: ringkasanSaran
  };
}

export type FeasibilityProfile = 'mumtaz' | 'hurried' | 'makhraj_fix';

export interface LocalEvaluationResult {
  isSilence: boolean;
  detectedSurah: string;
  overallScore: number;
  makhrajScore: number;
  tajweedScore: number;
  fluencyScore: number;
  transcribedArabic: string;
  ustadzFeedback: string;
  mistakes?: Array<{ word: string; rule: string; issue: string; tip: string }>;
  fluents?: string[];
  words: AyahWord[];
  simulatedDurationSec?: number;
  evaluationJson?: QuranEvaluationJSON;
}

/**
 * Zero-cost Feasibility Test Simulator
 */
export function simulateRecitationProfile(
  targetAyah: RecitationAyah,
  profile: FeasibilityProfile = 'mumtaz'
): LocalEvaluationResult {
  const minIdeal = targetAyah.idealDurationMinSec || 12;
  const maxIdeal = targetAyah.idealDurationMaxSec || 28;
  const targetWords = targetAyah.words.map((w) => w.arabic);

  if (profile === 'mumtaz') {
    const simulatedTranscript = targetWords.join(' ');
    return runLocalTarteelModel(
      targetAyah,
      Math.round((minIdeal + maxIdeal) / 2),
      simulatedTranscript,
      true,
      60
    );
  }

  if (profile === 'hurried') {
    // Drop the last word to simulate a skipped word
    const simulatedTranscript = targetWords.slice(0, Math.max(1, targetWords.length - 1)).join(' ');
    return runLocalTarteelModel(
      targetAyah,
      Math.max(4, Math.round(minIdeal * 0.7)),
      simulatedTranscript,
      true,
      55
    );
  }

  // Profile 'makhraj_fix': alter letters on first and third words
  const alteredWords = targetWords.map((w, idx) => {
    if (idx === 0 || idx === 2) {
      return w.replace(/[سشص]/g, 'ث').replace(/[قك]/g, 'خ').replace(/[حع]/g, 'ه');
    }
    return w;
  });
  return runLocalTarteelModel(targetAyah, minIdeal, alteredWords.join(' '), true, 55);
}

/**
 * Main Client-Side Audio & Transcript Recitation Evaluator
 * Uses strict sequential word-by-word comparison between Target Ayah and User Speech Transcript.
 */
export function runLocalTarteelModel(
  targetAyah: RecitationAyah,
  durationSec: number,
  transcript: string,
  voiceDetected: boolean = true,
  maxVoiceEnergy: number = 50
): LocalEvaluationResult {
  const rawTranscript = (transcript || '').trim();
  const effectiveAyah: RecitationAyah = targetAyah;
  const detectedSurah = targetAyah?.surahName || 'Surah An-Nas';

  // Silence Detection Check
  const isSilent =
    voiceDetected === false ||
    (maxVoiceEnergy < 12 && !rawTranscript) ||
    (durationSec < 1.5 && !rawTranscript);

  if (isSilent) {
    const emptyEval = evaluateQuranRecitationJSON({
      surahInfo: detectedSurah,
      ayatAsli: effectiveAyah.surahArabic,
      hasilTranskripsiGroq: '',
      targetWordsList: (effectiveAyah.words || []).map((w) => w.arabic)
    });

    return {
      isSilence: true,
      detectedSurah,
      overallScore: 0,
      makhrajScore: 0,
      tajweedScore: 0,
      fluencyScore: 0,
      transcribedArabic: '',
      ustadzFeedback: emptyEval.ringkasan_saran,
      evaluationJson: emptyEval,
      words: (effectiveAyah.words || []).map((w) => ({
        ...w,
        status: 'error' as const,
        tag: 'Terlewat (-)',
        title: 'Kata Terlewat / Belum Dilafalkan',
        icon: 'volume_off',
        body: `Kata "${w.arabic}" belum terdengar dalam transkripsi rekaman.`,
        correctionGuide:
          'Langkah Membenarkan: Dekatkan mikrofon dan lantunkan kata ini dengan tartil dan artikulasi yang jelas.',
        audioHint: 'Dengarkan contoh Qari lalu coba rekam kembali.',
        targetMetric: 'Status: Terlewat',
      })),
    };
  }

  // Perform strict word-by-word evaluation against the target ayah
  const targetWordsList = (effectiveAyah.words || []).map((w) => w.arabic);
  const evaluationJson = evaluateQuranRecitationJSON({
    surahInfo: detectedSurah,
    ayatAsli: effectiveAyah.surahArabic,
    hasilTranskripsiGroq: rawTranscript,
    targetWordsList
  });

  const overallScore = evaluationJson.skor_akurasi;
  const totalWords = Math.max(1, evaluationJson.detail_kata.length);
  const correctWordsCount = evaluationJson.detail_kata.filter((d) => d.status === 'benar').length;
  const wrongWordsCount = evaluationJson.detail_kata.filter((d) => d.status === 'salah').length;
  const skippedWordsCount = evaluationJson.detail_kata.filter((d) => d.status === 'terlewat').length;

  const makhrajScore = Math.max(
    0,
    Math.min(100, Math.round(((totalWords - wrongWordsCount - skippedWordsCount * 0.8) / totalWords) * 100))
  );
  const fluencyScore = Math.max(
    0,
    Math.min(100, Math.round(((totalWords - skippedWordsCount - wrongWordsCount * 0.5) / totalWords) * 100))
  );
  const tajweedScore = Math.max(
    0,
    Math.min(100, Math.round((overallScore + makhrajScore) / 2))
  );

  const mistakesList: Array<{ word: string; rule: string; issue: string; tip: string }> = [];
  const fluentsList: string[] = [];

  const words: AyahWord[] = (effectiveAyah.words || []).map((w, index) => {
    const detail = evaluationJson.detail_kata[index] || {
      kata_target: w.arabic,
      kata_terbaca: '-',
      status: 'terlewat' as const,
      catatan_kesalahan: `Kata "${w.arabic}" terlewat.`
    };

    if (detail.status === 'benar') {
      fluentsList.push(w.arabic);
      return {
        ...w,
        status: 'perfect',
        tag: `Benar (${detail.kata_terbaca})`,
        title: `Lafaz Benar & Sesuai (${w.transliteration || w.arabic})`,
        icon: 'check_circle',
        body: `Kata target <strong>"${detail.kata_target}"</strong> terbaca dengan benar sebagai <strong>"${detail.kata_terbaca}"</strong> sesuai kaidah makhraj dan harakat.`,
        correctionGuide: 'Alhamdulillah pelafalan kata ini sudah tepat. Pertahankan ketenangan tartilnya.',
        audioHint: w.audioHint || 'Lafaz sudah tepat sesuai mushaf.',
        targetMetric: 'Status: Benar'
      };
    }

    if (detail.status === 'terlewat') {
      mistakesList.push({
        word: w.arabic,
        rule: 'Kelengkapan Lafaz Ayat',
        issue: detail.catatan_kesalahan,
        tip: `Pastikan kata "${w.arabic}" (${w.transliteration || ''}) tidak terlewat saat membaca ayat.`
      });
      return {
        ...w,
        status: 'error',
        tag: 'Terlewat (-)',
        title: `Kata Terlewat: "${detail.kata_target}"`,
        icon: 'priority_high',
        body: `<strong>Terbaca:</strong> "-" (Terlewat). ${detail.catatan_kesalahan}`,
        correctionGuide: `Cara Membenarkan: Lafalkan kata "${w.arabic}" (${w.transliteration || ''}) dengan jelas dan jangan terburu-buru melewati kata ini.`,
        audioHint: w.audioHint || 'Dengarkan contoh pelafalan kata ini.',
        targetMetric: 'Status: Terlewat'
      };
    }

    // status === 'salah'
    mistakesList.push({
      word: w.arabic,
      rule: w.tajweedRuleName || 'Makharijul Huruf & Ketepatan Kata',
      issue: detail.catatan_kesalahan,
      tip: `Ucapkan "${w.arabic}" (${w.transliteration || ''}) secara perlahan sesuai titik makhrajnya.`
    });

    return {
      ...w,
      status: 'error',
      tag: `Salah (Terbaca: ${detail.kata_terbaca})`,
      title: `Koreksi Kata: "${detail.kata_target}"`,
      icon: 'priority_high',
      body: `<strong>Kata Target:</strong> "${detail.kata_target}" &bull; <strong>Terbaca:</strong> "${detail.kata_terbaca}".<br/>${detail.catatan_kesalahan}`,
      correctionGuide:
        w.correctionGuide ||
        `Cara Membenarkan: Perhatikan huruf pada lafaz "${w.arabic}" (${w.transliteration || ''}), jangan sampai tertukar atau kurang huruf.`,
      audioHint: w.audioHint || 'Dengarkan contoh Qari dan ulangi perlahan.',
      targetMetric: 'Status: Salah'
    };
  });

  const ustadzFeedback = `${evaluationJson.ringkasan_saran}\n\nStatus Kelulusan: ${evaluationJson.status_kelulusan} (Skor Akurasi: ${evaluationJson.skor_akurasi}% — ${correctWordsCount} benar, ${wrongWordsCount} salah, ${skippedWordsCount} terlewat dari ${totalWords} kata).`;

  return {
    isSilence: false,
    detectedSurah,
    overallScore,
    makhrajScore,
    tajweedScore,
    fluencyScore,
    transcribedArabic: rawTranscript,
    ustadzFeedback,
    mistakes: mistakesList,
    fluents: fluentsList,
    words,
    evaluationJson
  };
}
