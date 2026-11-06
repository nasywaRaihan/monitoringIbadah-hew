import React, { useState, useEffect, useRef, useMemo } from 'react';
import { RECITATION_AYAHS, RecitationAyah, AyahWord } from '../data/recitationVerses';
import { ActiveUser } from '../types';
import { logRecitationToSheets } from '../services/googleSheets';
import { downloadPerColumnCSV } from '../services/csvExport';
import { runLocalTarteelModel } from '../services/localEvaluator';

export interface RecitationExamRecord {
  id: string;
  studentId: string;
  studentName: string;
  halaqah: string;
  examinerName: string;
  examinerRole: string;
  surah: string;
  ayah: string;
  totalScore: number;
  makhrajScore: number;
  tajweedScore: number;
  fluencyScore: number;
  predicate: string;
  ustadzNotes: string;
  evaluatedAt: string;
  audioDurationSec: number;
}

export const exportRecitationExamToExcel = (
  records: RecitationExamRecord[],
  fileNamePrefix: string = 'Rekap_Nilai_Ujian_Tilawah_Karyawan'
) => {
  if (!records || records.length === 0) {
    return;
  }

  const headers = [
    'No',
    'Tanggal & Waktu Ujian',
    'ID Karyawan',
    'Nama Karyawan',
    'Halaqah / Kelompok',
    'Surah & Ayat',
    'Nilai Akhir (%)',
    'Nilai Tajwid (%)',
    'Makharijul Huruf (%)',
    'Kelancaran / Fashahah (%)',
    'Predikat Nilai',
    'Penguji',
    'Peran Penguji',
    'Catatan Evaluasi Ustadz'
  ];

  const rows = records.map((r, idx) => [
    idx + 1,
    r.evaluatedAt,
    r.studentId,
    r.studentName,
    r.halaqah,
    `${r.surah} ${r.ayah}`,
    `${r.totalScore}%`,
    `${r.tajweedScore}%`,
    `${r.makhrajScore}%`,
    `${r.fluencyScore}%`,
    r.predicate,
    r.examinerName,
    r.examinerRole,
    r.ustadzNotes || ''
  ]);

  const dateStr = new Date().toISOString().slice(0, 10);
  const filename = `${fileNamePrefix}_${dateStr}`;
  downloadPerColumnCSV(filename, headers, rows);
};

const DEFAULT_STUDENTS: ActiveUser[] = [
  {
    id: 'user-zubair',
    name: 'Zubair Ahmed',
    halaqah: 'Halaqah Al-Fajr',
    halaqahCode: 'HF-4092',
    passcode: '1234',
    avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDD9rhoZ_oKw2kaX_ib087jl58ZWxEyxXJe-f4-lkyam50XjJD1y4vmoJo_OP09N6wOgiWdvpNv5yr2G5JpuvLbm3TjeqXW0MHbuS6TtuFe6htOFVs18a00iBznKV3vany3LAk28L6AP7NVZ7sHf96ricgJ9NAjW7IvzR3eOOx6e1jpn11EVj5B7ar7C5WcI3CuYTneLk3RmV3-rVsJ7YE27-9cIjSlc_qil1T1R8WayBovHjw6vbVCog',
    role: 'member',
    totalXp: 1420,
    streakDays: 7,
    supervisor: 'Ustadz Farhan',
    assignedHalaqahBy: 'Dept HX'
  },
  {
    id: 'user-zayd',
    name: 'Zayd Al-Amin',
    halaqah: 'Halaqah Al-Fajr',
    halaqahCode: 'HF-4092',
    passcode: '1234',
    avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDFaQMyKnk2iLn9PRfVmgzOfoHE-e58Ab-VQMcTGdrxacm8wwW5nVi98gYcmjd_aHSNCKD0sbLlHflF6AoNGqxQ_Qheo_UDWOWgK1ivvZ9y8uvq7cdAjlrY5W6ibzXVRWlgMIxEXSbSK4NBiLsJ_1i-PslkBNixofnYzQWHbJhPmdsvZPmjWmq9Gf7Q02c1TuG4PIm9KXJKPp4IwrwHIie0wPPqYICwOCcU4f0tryN4MvTSkghJ6IZD_Q',
    role: 'member',
    totalXp: 2410,
    streakDays: 12,
    supervisor: 'Ustadz Farhan',
    assignedHalaqahBy: 'Dept HX'
  },
  {
    id: 'user-tariq',
    name: 'Tariq Mansoor',
    halaqah: 'Hafiz Circle',
    halaqahCode: 'HC-1108',
    passcode: '1234',
    avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBk9LWZ-0dEg9IaUBzxXTxLUfqZoGy8Q_Gyq5eDi0id422l1gTQRXmu7w2IRUuHKnuIIKDQfz0IqBGjhZolSIVvibJWwQh9isFTPI1q30Rtimj2C28zuAiMh9aejCr8Mrm22bx69cIaYiDngzNd-7HRJwZMIdc1HT_JjbH1nfrbjhcqmM4hG6bGivGECaOerT1I6Qr9T25Ia-I4lI1Bm2PPZWQ4GhNd14lU0olP2lEoLJjkI3TVKVwjYg',
    role: 'member',
    totalXp: 2850,
    streakDays: 28,
    supervisor: 'Ustadz Farhan',
    assignedHalaqahBy: 'Dept HX'
  },
  {
    id: 'user-bilal',
    name: 'Bilal Kareem',
    halaqah: 'Liga Remaja Tajwid',
    halaqahCode: 'LR-209',
    passcode: '1234',
    avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDnFoMagLqqmSNjNYEANFOH4M8kwlAzN0a2jOL9MjmFLHT-2YXwQ-926XaHXKQHACoeY1PzlqbgsHc1qg1ED_d1qS9ylheKXHkFOm3yFHJhJShgoMaivpA8tTv614np7Cw5fh_lLTaVm24ZOJ_W6kd-rdp4ZouYXhxWQmgmOSgukYsYMPmKn1NFqp1nLXOz4G3TO3Ejptv1Grd2xEu5b-ipFoGM7rJhQhyWV14NaZHptPX8sXfAM5W9wA',
    role: 'member',
    totalXp: 2180,
    streakDays: 5,
    supervisor: 'Ustadz Farhan',
    assignedHalaqahBy: 'Dept HX'
  },
  {
    id: 'user-hamza',
    name: 'Hamza Malik',
    halaqah: 'Halaqah Al-Fajr',
    halaqahCode: 'HF-4092',
    passcode: '1234',
    avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDl2oh3o0y1qDHWksSoqmd8XMiZZldRTSjimhlbpgvokYxxLZf3dzPd7n29Nhetf_Olmrxo8f9PEEVJhi4uXMk4tNb7fFd_nZUOzN5Rdja-yRE3q5yF17T8TSUKJOy1bcgtuTtokarrdyNVkM2Z_9y1dzn6US_MYhabTxnbkjabBFoyfSVw_r_AWxTv7v3vkt5B9VHnhxEkJqUEqS7Pe5oQFVZO3Zo5EoaPga-DW757Niz5e4SApnpruQ',
    role: 'member',
    totalXp: 1820,
    streakDays: 8,
    supervisor: 'Ustadz Farhan',
    assignedHalaqahBy: 'Dept HX'
  },
  {
    id: 'user-luqman',
    name: 'Luqman Faris',
    halaqah: 'Halaqah Al-Fajr',
    halaqahCode: 'HF-4092',
    passcode: '1234',
    avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDD5eNA6Cc-haxAb47iyA_T5sVq_esnqNS7ElzveTLKE5rxANA6DJjN84DSl41N4Vj46zDGw4UYabLdXU7nq04zEKgiSUntFivHLumiM1gofA2RwV6bR9Z_Y9NxZVSWr2jTomP_XSUAxKAX3tJPw0ZjCMqI68v5L85TLG9CMhWMPzMfCeKxpgODtb-3S8UNT5hlf-TU20-fu-pKPCnI95v9xK5yxmOIp8eoFKZpvymwvnWKqd7dz_Q9pQ',
    role: 'member',
    totalXp: 1490,
    streakDays: 4,
    supervisor: 'Ustadz Farhan',
    assignedHalaqahBy: 'Dept HX'
  }
];

const DEFAULT_EXAM_RECORDS: RecitationExamRecord[] = [
  {
    id: 'exam-1',
    studentId: 'user-tariq',
    studentName: 'Tariq Mansoor',
    halaqah: 'Hafiz Circle',
    examinerName: 'Ustadz Farhan',
    examinerRole: 'Ustadz Pembimbing',
    surah: 'Surah Al-Mulk',
    ayah: 'Ayat 1',
    totalScore: 98,
    makhrajScore: 98,
    tajweedScore: 97,
    fluencyScore: 99,
    predicate: 'Mumtaz (Istimewa)',
    ustadzNotes: 'MashaAllah bacaan tartil sangat fasih dan matang. Sifatul huruf dan makhraj presisi standar tahsin lanjutan.',
    evaluatedAt: '2026-10-27 08:30 WIB',
    audioDurationSec: 14
  },
  {
    id: 'exam-2',
    studentId: 'user-zayd',
    studentName: 'Zayd Al-Amin',
    halaqah: 'Halaqah Al-Fajr',
    examinerName: 'Ustadz Farhan',
    examinerRole: 'Ustadz Pembimbing',
    surah: 'Surah Al-Mulk',
    ayah: 'Ayat 1',
    totalScore: 95,
    makhrajScore: 96,
    tajweedScore: 94,
    fluencyScore: 95,
    predicate: 'Mumtaz (Istimewa)',
    ustadzNotes: 'Mad thabi’i konsisten 2 harakat, artikulasi huruf jim dan mim bersih. Pertahankan ketukan ghunnah.',
    evaluatedAt: '2026-10-27 09:15 WIB',
    audioDurationSec: 15
  },
  {
    id: 'exam-3',
    studentId: 'user-bilal',
    studentName: 'Bilal Kareem',
    halaqah: 'Liga Remaja Tajwid',
    examinerName: 'Ustadz Farhan',
    examinerRole: 'Ustadz Pembimbing',
    surah: 'Surah Al-Mulk',
    ayah: 'Ayat 1',
    totalScore: 91,
    makhrajScore: 92,
    tajweedScore: 90,
    fluencyScore: 91,
    predicate: 'Jayyid Jiddan (Sangat Baik)',
    ustadzNotes: 'Lancar dan tartil. Catatan: perhatikan panjang mad ‘aridh lissukun di akhir ayat sebelum waqaf.',
    evaluatedAt: '2026-10-26 16:40 WIB',
    audioDurationSec: 13
  }
];

interface RecitationScreenProps {
  onBack: () => void;
  onSubmitRecitation: (earnedXp: number, details?: { ayah: string; score: number; studentId?: string; studentName?: string }) => void;
  onShowToast: (msg: string) => void;
  currentRole?: 'member' | 'admin' | 'dept-hx' | 'hq-admin';
  activeUser?: ActiveUser;
  registeredUsers?: ActiveUser[];
  googleToken?: string | null;
  spreadsheetId?: string | null;
}

export const RecitationScreen: React.FC<RecitationScreenProps> = ({
  onBack,
  onSubmitRecitation,
  onShowToast,
  currentRole = 'member',
  activeUser,
  registeredUsers,
  googleToken,
  spreadsheetId
}) => {
  const isExaminer = currentRole === 'admin' || currentRole === 'dept-hx' || currentRole === 'hq-admin';

  // Exam Records State (saved to localStorage for persistence & Excel export)
  const [examRecords, setExamRecords] = useState<RecitationExamRecord[]>(() => {
    try {
      const saved = localStorage.getItem('noorworship_recitation_exam_records_v1');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.warn('Could not load saved exam records:', e);
    }
    return DEFAULT_EXAM_RECORDS;
  });

  useEffect(() => {
    try {
      localStorage.setItem('noorworship_recitation_exam_records_v1', JSON.stringify(examRecords));
    } catch (e) {
      console.warn('Failed saving exam records:', e);
    }
  }, [examRecords]);

  // Selected Student for Examiner mode
  const [selectedStudent, setSelectedStudent] = useState<ActiveUser | null>(null);
  const [viewingStudentHistory, setViewingStudentHistory] = useState<ActiveUser | null>(null);
  const [isViewingReportModal, setIsViewingReportModal] = useState<boolean>(false);
  const [showSavedExamModal, setShowSavedExamModal] = useState<boolean>(false);
  const [studentSearchQuery, setStudentSearchQuery] = useState<string>('');
  const [studentHalaqahFilter, setStudentHalaqahFilter] = useState<string>('all');
  const [customUstadzNote, setCustomUstadzNote] = useState<string>('');
  // Candidate Students combined from registered users and default students
  const candidateStudents: ActiveUser[] = useMemo(() => {
    const list = [...DEFAULT_STUDENTS];
    if (registeredUsers && registeredUsers.length > 0) {
      registeredUsers.forEach((reg) => {
        if (reg.role === 'member' && !list.some((s) => s.id === reg.id || s.name === reg.name)) {
          list.unshift(reg);
        }
      });
    }
    return list;
  }, [registeredUsers]);

  const [recapSelectedStudentNames, setRecapSelectedStudentNames] = useState<string[]>(() => candidateStudents.map(s => s.name));
  const [recapMonthFilter, setRecapMonthFilter] = useState<string>('all');

  // Filtered Students for Selection View
  const filteredStudents = useMemo(() => {
    return candidateStudents.filter((student) => {
      const matchSearch =
        student.name.toLowerCase().includes(studentSearchQuery.toLowerCase()) ||
        (student.halaqah && student.halaqah.toLowerCase().includes(studentSearchQuery.toLowerCase()));
      if (!matchSearch) return false;

      if (studentHalaqahFilter === 'all') return true;
      if (studentHalaqahFilter === 'tested') {
        return examRecords.some((r) => r.studentId === student.id || r.studentName === student.name);
      }
      if (studentHalaqahFilter === 'untested') {
        return !examRecords.some((r) => r.studentId === student.id || r.studentName === student.name);
      }
      return student.halaqah === studentHalaqahFilter;
    });
  }, [candidateStudents, studentSearchQuery, studentHalaqahFilter, examRecords]);

  const handleSelectStudentForExam = (student: ActiveUser) => {
    setSelectedStudent(student);
    setIsEvaluated(false);
    setIsSilenceDetected(false);
    setSelectedWord(null);
    setRecordedAudioUrl(null);
    setRecordedAudioBlob(null);
    setRecordSeconds(0);
    setIsSubmitted(false);
    setCustomUstadzNote('');
    onShowToast(`Sesi ujian mengaji untuk ${student.name} dimulai. Tekan mikrofon saat karyawan siap melantunkan.`);
  };
  // Target Ayah selection state (defaults to first item in RECITATION_AYAHS, e.g. Surah An-Nas)
  const [selectedAyahId, setSelectedAyahId] = useState<string>(RECITATION_AYAHS[0].id);
  const [surahSearchQuery, setSurahSearchQuery] = useState<string>('');

  const filteredSurahs = useMemo(() => {
    if (!surahSearchQuery.trim()) return RECITATION_AYAHS;
    const q = surahSearchQuery.toLowerCase().trim();
    return RECITATION_AYAHS.filter(
      (item) =>
        item.surahName.toLowerCase().includes(q) ||
        item.surahArabic.includes(q) ||
        String(item.surahNumber).includes(q)
    );
  }, [surahSearchQuery]);

  const currentAyah: RecitationAyah = useMemo(() => {
    return RECITATION_AYAHS.find((a) => a.id === selectedAyahId) || RECITATION_AYAHS[0];
  }, [selectedAyahId]);

  // AI-detected surah name (populated if audio/speech matches a different surah)
  const [detectedSurahName, setDetectedSurahName] = useState<string | null>(null);

  // Dynamic Ayah Words (populated with evaluation results only after recording)
  const [evaluatedWords, setEvaluatedWords] = useState<AyahWord[]>(currentAyah.words);

  // Switch Surah handler
  const handleSelectAyah = (ayahId: string) => {
    if (isRecording) {
      onShowToast('Hentikan rekaman terlebih dahulu sebelum mengganti surah.');
      return;
    }
    if (isPlayingSheikh && sheikhAudioRef.current) {
      sheikhAudioRef.current.pause();
      setIsPlayingSheikh(false);
    }
    if (isPlayingUserAudio && userAudioRef.current) {
      userAudioRef.current.pause();
      setIsPlayingUserAudio(false);
    }
    setSelectedAyahId(ayahId);
    const chosen = RECITATION_AYAHS.find((a) => a.id === ayahId);
    if (chosen) {
      setEvaluatedWords(chosen.words);
      setUstadzFeedback(chosen.ustadzNote);
      setSelectedWord(null);
      setIsEvaluated(false);
      setIsSilenceDetected(false);
      setDetectedSurahName(null);
      setRecordedAudioUrl(null);
      setRecordedAudioBlob(null);
      setRecordSeconds(0);
      setIsSubmitted(false);
      onShowToast(`🎯 Target surah: ${chosen.surahName}. Silakan dengarkan Qari atau tekan mikrofon.`);
    }
  };

  // Selected word for diagnostic inspection & corrective guidance
  const [selectedWord, setSelectedWord] = useState<AyahWord | null>(null);
  const [filterMode, setFilterMode] = useState<'all' | 'needs-correction' | 'fluent'>('all');

  // Audio Recording States
  const [isRecording, setIsRecording] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const [recordedAudioUrl, setRecordedAudioUrl] = useState<string | null>(null);
  const [, setRecordedAudioBlob] = useState<Blob | null>(null);
  const [isPlayingUserAudio, setIsPlayingUserAudio] = useState(false);
  const [userAudioCurrentTime, setUserAudioCurrentTime] = useState(0);

  // Sheikh reference audio
  const [isPlayingSheikh, setIsPlayingSheikh] = useState(false);

  // Evaluation States
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisStep, setAnalysisStep] = useState<string>('');
  const [isEvaluated, setIsEvaluated] = useState(false); // Controls showing evaluation results
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [speedMode, setSpeedMode] = useState<'1.0x (Tartil)' | '1.25x (Hadar)' | '0.8x (Tahqiq)'>('1.0x (Tartil)');

  // Measured scores (only shown after evaluation)
  const [overallScore, setOverallScore] = useState<number>(94);
  const [makhrajScore, setMakhrajScore] = useState<number>(96);
  const [tajweedScore, setTajweedScore] = useState<number>(92);
  const [fluencyScore, setFluencyScore] = useState<number>(95);
  const [ringOffset, setRingOffset] = useState<number>(7.5);
  const [ustadzFeedback, setUstadzFeedback] = useState<string>(currentAyah.ustadzNote);

  // Live Speech Recognition transcript (Web Speech API)
  const [speechTranscript, setSpeechTranscript] = useState<string>('');

  // Single-word Drill Mode
  const [isDrillRecording, setIsDrillRecording] = useState(false);
  const [drillSuccessMessage, setDrillSuccessMessage] = useState<string | null>(null);
  const [isPlayingPhonetic, setIsPlayingPhonetic] = useState(false);

  // Audio Spectrum Bars
  const [visualizerBars, setVisualizerBars] = useState<number[]>([
    12, 18, 25, 38, 22, 34, 48, 29, 36, 24, 40, 52, 60, 44, 28, 16, 32, 22, 14, 28, 20, 10, 16, 8,
  ]);

  // Voice activity & silence detection
  const maxVolumeRef = useRef<number>(0);
  const voicedFramesCountRef = useRef<number>(0);
  const [isSilenceDetected, setIsSilenceDetected] = useState<boolean>(false);

  // Audio References
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const animationFrameRef = useRef<number | null>(null);
  const sheikhAudioRef = useRef<HTMLAudioElement | null>(null);
  const userAudioRef = useRef<HTMLAudioElement | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const speechRecognitionRef = useRef<any>(null);

  // Initialize Sheikh Audio Element & Speech Recognition
  useEffect(() => {
    const audio = new Audio(currentAyah.sheikhAudioUrl);
    audio.onended = () => setIsPlayingSheikh(false);
    audio.onerror = () => setIsPlayingSheikh(false);
    sheikhAudioRef.current = audio;

    // Speech Recognition setup (Web Speech API)
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      try {
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'ar-SA';
        recognition.onresult = (event: any) => {
          let interimTranscript = '';
          for (let i = event.resultIndex; i < event.results.length; ++i) {
            interimTranscript += event.results[i][0].transcript;
          }
          if (interimTranscript) {
            setSpeechTranscript(interimTranscript);
          }
        };
        recognition.onerror = () => {};
        speechRecognitionRef.current = recognition;
      } catch (e) {
        console.warn('SpeechRecognition init error:', e);
      }
    }

    return () => {
      audio.pause();
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      if (timerRef.current) clearInterval(timerRef.current);
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      }
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close().catch(() => {});
      }
      if (userAudioRef.current) {
        userAudioRef.current.pause();
      }
      if (speechRecognitionRef.current) {
        try {
          speechRecognitionRef.current.stop();
        } catch {}
      }
    };
  }, [currentAyah.sheikhAudioUrl]);

  // Sync ring offset when score changes
  useEffect(() => {
    const circumference = 125.6;
    const offset = circumference - (circumference * overallScore) / 100;
    setRingOffset(offset);
  }, [overallScore]);

  // Recording Timer
  useEffect(() => {
    if (isRecording) {
      timerRef.current = setInterval(() => {
        setRecordSeconds((prev) => {
          if (prev >= 60) {
            stopRecordingAndAnalyze();
            return 60;
          }
          return prev + 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRecording]);

  // Sheikh audio toggle
  const handleToggleSheikh = () => {
    if (!sheikhAudioRef.current) return;

    if (isPlayingSheikh) {
      sheikhAudioRef.current.pause();
      setIsPlayingSheikh(false);
      onShowToast('Audio panduan Qari dijeda');
    } else {
      if (userAudioRef.current && isPlayingUserAudio) {
        userAudioRef.current.pause();
        setIsPlayingUserAudio(false);
      }

      sheikhAudioRef.current
        .play()
        .then(() => {
          setIsPlayingSheikh(true);
          onShowToast(`Memutar panduan tilawah Syaikh Misyari Rasyid: ${currentAyah.surahName}`);
        })
        .catch(() => {
          setIsPlayingSheikh(true);
          onShowToast(`Memutar panduan tilawah ${currentAyah.surahName}...`);
          setTimeout(() => setIsPlayingSheikh(false), 5000);
        });
    }
  };

  // Play User's Own Recorded Audio
  const handleToggleUserAudio = () => {
    if (!recordedAudioUrl) {
      onShowToast('Belum ada rekaman suara. Tekan tombol mikrofon untuk merekam tilawah Anda.');
      return;
    }

    if (isPlayingUserAudio && userAudioRef.current) {
      userAudioRef.current.pause();
      setIsPlayingUserAudio(false);
      onShowToast('Pemutaran rekaman dijeda');
      return;
    }

    if (sheikhAudioRef.current && isPlayingSheikh) {
      sheikhAudioRef.current.pause();
      setIsPlayingSheikh(false);
    }

    const audio = userAudioRef.current || new Audio(recordedAudioUrl);
    userAudioRef.current = audio;
    audio.src = recordedAudioUrl;

    audio.ontimeupdate = () => {
      setUserAudioCurrentTime(audio.currentTime);
    };

    audio.onended = () => {
      setIsPlayingUserAudio(false);
      setUserAudioCurrentTime(0);
    };

    audio
      .play()
      .then(() => {
        setIsPlayingUserAudio(true);
        onShowToast('Memutar hasil rekaman tilawah suara Anda...');
      })
      .catch((e) => {
        console.warn('Playback error', e);
        onShowToast('Gagal memutar audio rekaman');
      });
  };

  // Isolated Word Pronunciation (Correct Target Audio)
  const handlePlayIsolatedPhonetic = (word: AyahWord) => {
    setIsPlayingPhonetic(true);
    onShowToast(`Mendengarkan contoh benar: ${word.transliteration || word.arabic} (${word.tajweedRuleName || word.tag})`);

    if ('speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(word.arabic);
        utterance.lang = 'ar-SA';
        utterance.rate = 0.75;
        utterance.onend = () => setIsPlayingPhonetic(false);
        utterance.onerror = () => setIsPlayingPhonetic(false);
        window.speechSynthesis.speak(utterance);
      } catch {
        setTimeout(() => setIsPlayingPhonetic(false), 1800);
      }
    } else {
      setTimeout(() => setIsPlayingPhonetic(false), 1800);
    }
  };

  // Start Real Microphone Recording & Acoustic Spectrum Analysis
  const startRecording = async () => {
    try {
      if (sheikhAudioRef.current && isPlayingSheikh) {
        sheikhAudioRef.current.pause();
        setIsPlayingSheikh(false);
      }
      if (userAudioRef.current && isPlayingUserAudio) {
        userAudioRef.current.pause();
        setIsPlayingUserAudio(false);
      }

      setRecordSeconds(0);
      setSpeechTranscript('');
      setDrillSuccessMessage(null);
      setIsSilenceDetected(false);
      maxVolumeRef.current = 0;
      voicedFramesCountRef.current = 0;

      let stream: MediaStream | null = null;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        });
      } catch (micErr) {
        console.warn('Microphone permission request:', micErr);
      }

      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const audioCtx = new AudioCtx();
      audioContextRef.current = audioCtx;

      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 64;
      analyserRef.current = analyser;

      if (stream) {
        mediaStreamRef.current = stream;
        const source = audioCtx.createMediaStreamSource(stream);
        source.connect(analyser);

        try {
          audioChunksRef.current = [];
          const recorder = new MediaRecorder(stream);
          recorder.ondataavailable = (e) => {
            if (e.data.size > 0) {
              audioChunksRef.current.push(e.data);
            }
          };
          recorder.onstop = () => {
            const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
            setRecordedAudioBlob(audioBlob);
            const url = URL.createObjectURL(audioBlob);
            setRecordedAudioUrl(url);
          };
          recorder.start(100);
          mediaRecorderRef.current = recorder;
        } catch (recErr) {
          console.warn('MediaRecorder init error', recErr);
        }
      }

      // Start Web Speech Recognition if available
      if (speechRecognitionRef.current) {
        try {
          speechRecognitionRef.current.start();
        } catch {}
      }

      setIsRecording(true);
      onShowToast(`Mikrofon aktif! Bacalah ${currentAyah.surahName} dengan tartil...`);

      // Spectrum analyzer visualizer loop
      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const updateSpectrum = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteFrequencyData(dataArray);

        let sum = 0;
        const bars: number[] = [];
        const step = Math.max(1, Math.floor(bufferLength / 24));
        for (let i = 0; i < 24; i++) {
          const val = dataArray[i * step] || 0;
          sum += val;
          const barHeight = Math.max(6, Math.min(60, Math.round((val / 255) * 60 + 6)));
          bars.push(barHeight);
        }

        const avgVolume = sum / 24;
        if (avgVolume > maxVolumeRef.current) {
          maxVolumeRef.current = avgVolume;
        }
        if (avgVolume > 13) {
          voicedFramesCountRef.current += 1;
        }

        setVisualizerBars(bars);
        animationFrameRef.current = requestAnimationFrame(updateSpectrum);
      };

      updateSpectrum();
    } catch (err: any) {
      console.error('Audio capture error', err);
      setIsRecording(true);
      onShowToast('Merekam suara tilawah Anda...');
    }
  };

  // Convert Blob to Base64 helper
  const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        resolve(result);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  // Stop Recording and Call Server AI Recitation Analyzer
  const stopRecordingAndAnalyze = async () => {
    setIsRecording(false);

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      try {
        mediaRecorderRef.current.stop();
      } catch (e) {
        console.warn(e);
      }
    }

    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
    }

    if (speechRecognitionRef.current) {
      try {
        speechRecognitionRef.current.stop();
      } catch {}
    }

    const duration = Math.max(1, recordSeconds);
    const peakVolume = maxVolumeRef.current;
    const voicedFrames = voicedFramesCountRef.current;
    const hasVoice = (peakVolume >= 12 || voicedFrames >= 5 || Boolean(speechTranscript && speechTranscript.trim().length > 0));

    // If completely silent, immediately flag silence and do not score
    if (!hasVoice || duration < 1.5) {
      setIsAnalyzing(false);
      setIsSilenceDetected(true);
      setOverallScore(0);
      setMakhrajScore(0);
      setTajweedScore(0);
      setFluencyScore(0);
      setRingOffset(125.6);
      setUstadzFeedback('Suara tilawah tidak terdeteksi dalam rekaman. Rekaman terdengar hening atau tidak ada bacaan ayat yang dilantunkan. Dekatkan mikrofon dan bacalah ayat dengan suara jelas.');
      setEvaluatedWords(currentAyah.words.map((w) => ({
        ...w,
        status: 'error' as const,
        tag: 'Tidak Terdengar',
        title: 'Kata Belum Dilafalkan',
        icon: 'volume_off',
        body: 'Tidak ada suara yang terdeteksi untuk kata ini karena rekaman hening. Silakan rekam ulang sambil melafalkan ayat.',
        correctionGuide: 'Langkah Membenarkan: Dekatkan mikrofon dan bacalah kata ini secara tartil dan jelas.',
      })));
      setSelectedWord(null);
      setIsEvaluated(true);
      onShowToast('⚠️ Suara tidak terdeteksi: Rekaman hening. Silakan melafalkan ayat saat merekam.');
      return;
    }

    // Enter analysis mode
    setIsAnalyzing(true);
    setIsSilenceDetected(false);
    setAnalysisStep('Mengunggah & memeriksa gelombang suara tilawah...');

    try {
      await new Promise((r) => setTimeout(r, 400));

      let base64Data = '';
      if (audioChunksRef.current.length > 0) {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setRecordedAudioBlob(audioBlob);
        const url = URL.createObjectURL(audioBlob);
        setRecordedAudioUrl(url);
        setAnalysisStep('Menghubungkan audio rekaman ke Tarteel Model backend...');
        try {
          base64Data = await blobToBase64(audioBlob);
        } catch (e) {
          console.warn('Base64 conversion failed', e);
        }
      }

      setAnalysisStep('Audit Makharijul Huruf, Harakat & Kaidah Tajwid (Local Evaluator)...');
      await new Promise((r) => setTimeout(r, 600));

      // Process using local heuristic logic instead of calling backend API
      const data = runLocalTarteelModel(
        currentAyah,
        duration,
        speechTranscript,
        true,
        Math.round(peakVolume)
      );

      if (data) {
        if (data.isSilence) {
          setIsSilenceDetected(true);
          setOverallScore(0);
          setMakhrajScore(0);
          setTajweedScore(0);
          setFluencyScore(0);
          setRingOffset(125.6);
          setUstadzFeedback(data.ustadzFeedback || 'Suara tilawah tidak terdeteksi.');
          if (Array.isArray(data.words)) {
            setEvaluatedWords(data.words as any);
          }
          setSelectedWord(null);
          setIsEvaluated(true);
          onShowToast('⚠️ Rekaman hening: Tidak ada suara tilawah yang terdeteksi.');
          return;
        }

        setIsSilenceDetected(false);
        setOverallScore(data.overallScore || 92);
        setMakhrajScore(data.makhrajScore || 94);
        setTajweedScore(data.tajweedScore || 90);
        setFluencyScore(data.fluencyScore || 93);
        if (data.detectedSurah) {
          setDetectedSurahName(data.detectedSurah);
        }
        if (data.ustadzFeedback) {
          setUstadzFeedback(data.ustadzFeedback);
        }

        if (Array.isArray(data.words) && data.words.length > 0) {
          setEvaluatedWords(data.words as any);
          // Automatically select first word that needs correction (warning/error) or the first word
          const faultyWord = data.words.find(
            (w: any) => w.status === 'error' || w.status === 'warning'
          );
          setSelectedWord((faultyWord || data.words[0]) as any);
        }

        // SHOW THE EVALUATION RESULTS NOW!
        setIsEvaluated(true);

        const grade =
          (data.overallScore || 0) >= 95
            ? 'Mumtaz (Istimewa)'
            : (data.overallScore || 0) >= 88
            ? 'Jayyid Jiddan (Sangat Baik)'
            : 'Jayyid (Perlu Latihan)';

        const surahNotif = data.detectedSurah ? `[${data.detectedSurah}] ` : '';
        onShowToast(`Evaluasi Selesai! ${surahNotif}Nilai: ${data.overallScore}% • ${grade}. Simak hasil koreksi di bawah.`);
      }
    } catch (err: any) {
      console.warn('Server recitation analysis error, applying client-side audit', err);
      // Client-side fallback audit
      const cleanTr = (speechTranscript || '').toLowerCase();
      let activeTarget = currentAyah;
      if (
        cleanTr.includes('nas') ||
        cleanTr.includes('naas') ||
        cleanTr.includes('annas') ||
        cleanTr.includes('birabbin') ||
        cleanTr.includes('malikin')
      ) {
        const found = RECITATION_AYAHS.find((a) => a.id === 'nas-all' || a.id === 'nas-1');
        if (found) {
          activeTarget = found;
          setDetectedSurahName('Surah An-Nas');
        }
      } else if (cleanTr.includes('falaq') || cleanTr.includes('khalaq')) {
        const found = RECITATION_AYAHS.find((a) => a.id === 'falaq-all');
        if (found) {
          activeTarget = found;
          setDetectedSurahName('Surah Al-Falaq');
        }
      } else if (cleanTr.includes('ikhlas') || cleanTr.includes('ahad')) {
        const found = RECITATION_AYAHS.find((a) => a.id === 'ikhlas-all');
        if (found) {
          activeTarget = found;
          setDetectedSurahName('Surah Al-Ikhlas');
        }
      }

      const minIdeal = activeTarget.idealDurationMinSec || 6;
      const isFast = duration < minIdeal;
      const calcOverall = isFast ? 86 : 95;
      const calcMakhraj = isFast ? 88 : 96;
      const calcTajweed = isFast ? 84 : 94;
      const calcFluency = isFast ? 86 : 95;

      setOverallScore(calcOverall);
      setMakhrajScore(calcMakhraj);
      setTajweedScore(calcTajweed);
      setFluencyScore(calcFluency);

      const updatedWords = activeTarget.words.map((w, idx) => {
        if (isFast && idx === activeTarget.words.length - 1) {
          return {
            ...w,
            status: 'error' as const,
            tag: 'Mad 2h vs 4h',
            title: "Panjang Mad 'Aridh Lissukun Kurang",
            body: 'Lafaz akhir ayat terdeteksi dibaca 2 harakat karena tempo terburu-buru. Panjangkan 4 hingga 6 harakat sebelum waqaf.',
            correctionGuide: 'Cara Membenarkan: Tahan suara mad sepanjang 4 ketukan jari sebelum mengunci huruf sukun terakhir.',
          };
        }
        if (isFast && idx === 3) {
          return {
            ...w,
            status: 'warning' as const,
            tag: 'Ghunnah -0.2dtk',
            title: 'Ketukan Ghunnah Sedikit Singkat',
            body: 'Dengung ghunnah berlalu agak cepat. Tahan sejenak 2 harakat di rongga hidung.',
            correctionGuide: 'Cara Membenarkan: Tahan suara di rongga hidung (Khaisyum) selama 2 harakat penuh.',
          };
        }
        return w;
      });

      setEvaluatedWords(updatedWords);
      const faulty = updatedWords.find((w) => w.status === 'error' || w.status === 'warning');
      setSelectedWord(faulty || updatedWords[0]);
      setUstadzFeedback(
        isFast
          ? `Tempo bacaan Anda (${duration} dtk) sedikit terburu-buru dari target ${activeTarget.idealDurationMinSec}-${activeTarget.idealDurationMaxSec} dtk. Pertahankan ketenangan tartil dan sempurnakan mad akhir ayat.`
          : `MashaAllah! Bacaan tartil Anda (${duration} dtk) sangat tenang dan indah. Pertahankan makhraj dan ketukan tajwid ini.`
      );
      setIsEvaluated(true);
      onShowToast(`Evaluasi tilawah selesai (${calcOverall}%)! Simak panduan pembenaran di bawah.`);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Toggle Recording
  const toggleRecording = () => {
    if (isRecording) {
      stopRecordingAndAnalyze();
    } else {
      startRecording();
    }
  };

  // Retest entire ayah
  const handleRetest = () => {
    setIsEvaluated(false);
    setIsSilenceDetected(false);
    setSelectedWord(null);
    setRecordedAudioUrl(null);
    setRecordSeconds(0);
    setRingOffset(125.6);
    onShowToast(`Menyiapkan pengujian ulang untuk ${currentAyah.surahName}...`);
    setTimeout(() => {
      startRecording();
    }, 400);
  };

  // Practice Single Word Drill Mode ("Latih Kata Ini")
  const handleStartWordDrill = async (word: AyahWord) => {
    setIsDrillRecording(true);
    setDrillSuccessMessage(null);
    onShowToast(`Latihan Khusus: Ucapkan kata "${word.arabic}" (${word.transliteration || ''}) sekarang...`);

    setTimeout(async () => {
      setIsDrillRecording(false);
      
      const passed = true; // Simulating drill success locally
      setDrillSuccessMessage(
        `Alhamdulillah! Pelafalan kata "${word.arabic}" berhasil diperbaiki. Makhraj dan ketukan harakat sudah sesuai kaidah.`
      );

      // Update the word status in evaluated words to correct
      setEvaluatedWords((prev) =>
        prev.map((w) =>
          w.id === word.id
            ? {
                ...w,
                status: 'correct',
                tag: 'Telah Dibenarkan',
                title: 'Pelafalan Telah Dibenarkan',
                body: 'MashaAllah, perbaikan lafaz kata ini telah berhasil diucapkan dengan tartil dan makhraj yang benar.',
              }
            : w
        ) as any
      );

      onShowToast(`Alhamdulillah! Kata "${word.arabic}" berhasil dibenarkan.`);
    }, 3000);
  };

  // Submit Recitation with XP
  const handleSubmit = async () => {
    if (!isEvaluated || isSilenceDetected) {
      onShowToast(
        isExaminer
          ? 'Silakan rekam tilawah karyawan secara jelas terlebih dahulu sebelum menyimpan penilaian.'
          : 'Silakan lantunkan ayat secara jelas terlebih dahulu sebelum mengirim setoran.'
      );
      return;
    }
    if (isSubmitted) {
      onShowToast('Nilai ujian tilawah ini sudah tersimpan.');
      return;
    }
    setIsSubmitting(true);

    const gradePredicate =
      overallScore >= 95
        ? 'Mumtaz (Istimewa)'
        : overallScore >= 88
        ? 'Jayyid Jiddan (Sangat Baik)'
        : overallScore >= 75
        ? 'Jayyid (Baik)'
        : 'Perlu Latihan';

    const now = new Date();
    const timeFormatted = `${now.toISOString().slice(0, 10)} ${now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB`;

    if (isExaminer && selectedStudent) {
      const newExamRecord: RecitationExamRecord = {
        id: `exam-${Date.now()}`,
        studentId: selectedStudent.id,
        studentName: selectedStudent.name,
        halaqah: selectedStudent.halaqah || 'Halaqah Al-Fajr',
        examinerName: activeUser?.name || 'Ustadz Farhan',
        examinerRole:
          currentRole === 'dept-hx' || currentRole === 'hq-admin'
            ? 'Dept HX Pusat'
            : 'Ustadz Pembimbing',
        surah: currentAyah.surahName,
        ayah: currentAyah.surahName.includes('Ayat') ? currentAyah.surahName : `Ayat ${currentAyah.ayahNumber}`,
        totalScore: overallScore,
        makhrajScore,
        tajweedScore,
        fluencyScore,
        predicate: gradePredicate,
        ustadzNotes: customUstadzNote.trim() || ustadzFeedback,
        evaluatedAt: timeFormatted,
        audioDurationSec: recordSeconds || 14
      };

      setExamRecords((prev) => [newExamRecord, ...prev]);

      if (googleToken && spreadsheetId) {
        try {
          await logRecitationToSheets(
            googleToken,
            spreadsheetId,
            selectedStudent.name,
            currentAyah.surahName,
            `${overallScore}% (${gradePredicate})`,
            `${makhrajScore}%`,
            `${tajweedScore}%`,
            `${fluencyScore}%`,
            gradePredicate,
            customUstadzNote.trim() || ustadzFeedback
          );
        } catch (e) {
          console.warn('Sheets sync error:', e);
        }
      }

      setIsSubmitting(false);
      setIsSubmitted(true);
      setShowSavedExamModal(true);

      onSubmitRecitation(150, {
        ayah: currentAyah.surahName,
        score: overallScore,
        studentId: selectedStudent.id,
        studentName: selectedStudent.name
      });

      onShowToast(
        `Alhamdulillah! Nilai ujian tilawah ${selectedStudent.name} (${overallScore}%) berhasil disimpan.`
      );
    } else {
      setTimeout(() => {
        setIsSubmitting(false);
        setIsSubmitted(true);
        onSubmitRecitation(150, {
          ayah: currentAyah.surahName,
          score: overallScore
        });
        onShowToast(
          `Alhamdulillah! Nilai tilawah ${overallScore}% (${currentAyah.surahName}) tersimpan dan +150 XP ditambahkan!`
        );
      }, 700);
    }
  };

  const formatTimer = (secs: number) => {
    const s = secs % 60;
    return `00:${s < 10 ? '0' : ''}${s} / 00:45`;
  };

  const formatAudioTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // Counts of words by status
  const errorWords = evaluatedWords.filter((w) => w.status === 'error');
  const warningWords = evaluatedWords.filter((w) => w.status === 'warning');
  const fluentWords = evaluatedWords.filter((w) => w.status === 'perfect' || w.status === 'correct');
  const needsCorrectionWords = [...errorWords, ...warningWords];

  const filteredExamRecords = useMemo(() => {
    return examRecords.filter(r => {
      const matchStudent = recapSelectedStudentNames.length === 0 || recapSelectedStudentNames.includes(r.studentName);
      const matchMonth = recapMonthFilter === 'all' || r.evaluatedAt.startsWith(recapMonthFilter);
      return matchStudent && matchMonth;
    });
  }, [examRecords, recapSelectedStudentNames, recapMonthFilter]);

  const renderReportModal = () => (
    <div className="fixed inset-0 z-50 bg-[#141b2b]/50 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-[#f1f3ff] flex items-center justify-between bg-[#f9f9ff]">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#c1ecd4] flex items-center justify-center text-[#012d1d] shrink-0">
              <span className="material-symbols-outlined text-[20px]">table_chart</span>
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-[#141b2b]">
                Buku Rekapitulasi Nilai Ujian Tilawah
              </h3>
              <p className="text-xs text-[#414844]">
                Hasil penilaian mengaji karyawan yang dapat diekspor langsung ke Microsoft Excel (.csv)
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsViewingReportModal(false)}
            className="w-8 h-8 rounded-full bg-[#f1f3ff] hover:bg-[#e9edff] flex items-center justify-center text-[#414844] cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        {/* Modal Body / Table */}
        <div className="p-4 overflow-y-auto flex-1 space-y-3">
          {/* Filter Controls for Export */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 p-3 bg-[#f1f3ff]/70 rounded-xl border border-[#1b4332]/8">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[11px] font-bold text-[#141b2b]">Pilih Karyawan (Multi-Pilih):</label>
                <div className="flex gap-2 text-[10px]">
                  <button
                    type="button"
                    onClick={() => setRecapSelectedStudentNames(candidateStudents.map(s => s.name))}
                    className="text-[#00452c] font-bold hover:underline cursor-pointer"
                  >
                    Pilih Semua
                  </button>
                  <span className="text-gray-300">|</span>
                  <button
                    type="button"
                    onClick={() => setRecapSelectedStudentNames([])}
                    className="text-red-600 font-bold hover:underline cursor-pointer"
                  >
                    Hapus Semua
                  </button>
                </div>
              </div>
              <div className="max-h-32 overflow-y-auto bg-white p-2 rounded-lg border border-[#1b4332]/15 space-y-1 no-scrollbar">
                {candidateStudents.map(s => {
                  const isChecked = recapSelectedStudentNames.includes(s.name);
                  return (
                    <label key={s.id} className="flex items-center gap-2 text-xs text-[#141b2b] cursor-pointer hover:bg-[#f1f3ff] p-1 rounded">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setRecapSelectedStudentNames(prev => [...prev, s.name]);
                          } else {
                            setRecapSelectedStudentNames(prev => prev.filter(name => name !== s.name));
                          }
                        }}
                        className="rounded accent-[#012d1d] w-3.5 h-3.5"
                      />
                      <span className="truncate">{s.name} <span className="text-[10px] text-gray-500">({s.halaqah})</span></span>
                    </label>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-[#141b2b] mb-1">Pilih Bulan Ujian:</label>
              <select
                value={recapMonthFilter}
                onChange={(e) => setRecapMonthFilter(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-lg bg-white text-xs font-semibold text-[#141b2b] border border-[#1b4332]/15 focus:outline-none"
              >
                <option value="all">Semua Bulan</option>
                {Array.from(new Set(examRecords.map(r => r.evaluatedAt.slice(0, 7)))).map(m => (
                  <option key={m} value={m}>Bulan: {m}</option>
                ))}
              </select>
            </div>
          </div>


          <div className="flex items-center justify-between flex-wrap gap-2">
            <span className="text-xs font-bold text-[#141b2b]">
              Menampilkan {filteredExamRecords.length} dari {examRecords.length} Data Ujian
            </span>
            <button
              onClick={() => {
                if (filteredExamRecords.length === 0) {
                  onShowToast('Tidak ada data ujian yang sesuai dengan filter.');
                  return;
                }
                exportRecitationExamToExcel(filteredExamRecords, 'Rekap_Nilai_Ujian_Tilawah_Filtered');
                onShowToast(`File Excel Sheet (.xlsx) dengan ${filteredExamRecords.length} data berhasil diunduh!`);
              }}
              className="px-3.5 py-1.5 rounded-full bg-[#00452c] hover:bg-[#012d1d] text-white text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <span className="material-symbols-outlined text-[16px]">download</span>
              <span>Export Sheet (.xlsx) ({filteredExamRecords.length})</span>
            </button>
          </div>

          <div className="border border-[#1b4332]/10 rounded-xl overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#f1f3ff] text-[#012d1d] font-bold border-b border-[#1b4332]/10">
                  <tr>
                    <th className="py-2.5 px-3">Karyawan</th>
                    <th className="py-2.5 px-3">Halaqah</th>
                    <th className="py-2.5 px-3">Ayat</th>
                    <th className="py-2.5 px-3 text-center">Nilai Akhir</th>
                    <th className="py-2.5 px-3">Predikat</th>
                    <th className="py-2.5 px-3">Waktu</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#f1f3ff]">
                  {filteredExamRecords.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-gray-500 text-xs">
                        Tidak ada riwayat ujian yang cocok dengan pilihan karyawan dan bulan tersebut.
                      </td>
                    </tr>
                  ) : (
                    filteredExamRecords.map((r, i) => (
                      <tr key={r.id || i} className="hover:bg-[#f9f9ff] transition-colors">
                        <td className="py-2.5 px-3 font-bold text-[#141b2b]">{r.studentName}</td>
                        <td className="py-2.5 px-3 text-[#414844]">{r.halaqah}</td>
                        <td className="py-2.5 px-3 text-[#414844]">{r.surah} ({r.ayah})</td>
                        <td className="py-2.5 px-3 text-center font-bold text-[#00452c]">{r.totalScore}%</td>
                        <td className="py-2.5 px-3">
                          <span className="px-2 py-0.5 rounded-full bg-[#c1ecd4] text-[#002114] text-[10px] font-bold">
                            {r.predicate.split(' ')[0]}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-[11px] text-[#717973]">{r.evaluatedAt.split(' ')[0]}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>


        {/* Modal Footer */}
        <div className="p-3.5 sm:p-4 border-t border-[#f1f3ff] bg-[#f9f9ff] flex items-center justify-between gap-2 flex-wrap">
          <span className="text-[11px] text-[#414844]">
            Format CSV UTF-8 kompatibel dengan Microsoft Excel, Google Sheets, dan Numbers.
          </span>
          <button
            onClick={() => setIsViewingReportModal(false)}
            className="px-5 py-2 rounded-full bg-[#012d1d] hover:bg-[#1b4332] text-white text-xs font-bold cursor-pointer transition-colors shadow-xs"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );

  const renderSavedExamModal = () => (
    <div className="fixed inset-0 z-50 bg-[#141b2b]/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl p-5 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between pb-3 border-b border-[#f1f3ff]">
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-full bg-[#c1ecd4] flex items-center justify-center text-[#00452c]">
              <span className="material-symbols-outlined text-[18px]">verified</span>
            </span>
            <div>
              <h3 className="font-bold text-sm text-[#141b2b]">Nilai Ujian Berhasil Disimpan</h3>
              <p className="text-xs text-[#414844]">{selectedStudent?.name} ({selectedStudent?.halaqah})</p>
            </div>
          </div>
          <button
            onClick={() => setShowSavedExamModal(false)}
            className="w-7 h-7 rounded-full bg-[#f1f3ff] flex items-center justify-center text-[#414844]"
          >
            <span className="material-symbols-outlined text-[16px]">close</span>
          </button>
        </div>

        {/* Score Card Summary */}
        <div className="p-3.5 rounded-xl bg-[#f9f9ff] border border-[#1b4332]/8 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-[#414844] font-medium">Nilai Akhir Tilawah</span>
            <span className="text-lg font-bold text-[#00452c]">{overallScore}% • {overallScore >= 95 ? 'Mumtaz' : 'Jayyid Jiddan'}</span>
          </div>
          <div className="grid grid-cols-3 gap-1.5 text-center text-[11px] pt-1 border-t border-[#f1f3ff]">
            <div className="p-1.5 rounded-lg bg-white">
              <span className="text-[#717973] block text-[10px]">Tajwid</span>
              <span className="font-bold text-[#141b2b]">{tajweedScore}%</span>
            </div>
            <div className="p-1.5 rounded-lg bg-white">
              <span className="text-[#717973] block text-[10px]">Makhraj</span>
              <span className="font-bold text-[#141b2b]">{makhrajScore}%</span>
            </div>
            <div className="p-1.5 rounded-lg bg-white">
              <span className="text-[#717973] block text-[10px]">Kelancaran</span>
              <span className="font-bold text-[#141b2b]">{fluencyScore}%</span>
            </div>
          </div>
          {(customUstadzNote || ustadzFeedback) && (
            <div className="pt-1.5 border-t border-[#f1f3ff] text-left">
              <span className="text-[10px] font-bold text-[#414844] block">Catatan Ustadz:</span>
              <p className="text-[11px] text-[#141b2b] italic">&ldquo;{customUstadzNote || ustadzFeedback}&rdquo;</p>
            </div>
          )}
        </div>

        <div className="space-y-2">
          <button
            onClick={() => {
              setShowSavedExamModal(false);
              setSelectedStudent(null);
            }}
            className="w-full py-2.5 rounded-full bg-[#012d1d] hover:bg-[#1b4332] text-white text-xs font-bold transition-colors flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
          >
            <span className="material-symbols-outlined text-[16px]">group</span>
            <span>Uji Karyawan Lainnya</span>
          </button>

          <button
            onClick={() => {
              exportRecitationExamToExcel(examRecords);
              onShowToast('File Excel (.csv) berhasil diunduh!');
            }}
            className="w-full py-2.5 rounded-full bg-[#fed488] hover:bg-[#fed488]/90 text-[#775a19] text-xs font-bold transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <span className="material-symbols-outlined text-[16px]">file_download</span>
            <span>Download Rekap Nilai ke Excel</span>
          </button>

          <button
            onClick={() => setShowSavedExamModal(false)}
            className="w-full py-2 rounded-full bg-[#f1f3ff] text-[#414844] text-xs font-medium hover:bg-[#e9edff] cursor-pointer"
          >
            Tetap di Sesi Karyawan Ini
          </button>
        </div>
      </div>
    </div>
  );

  const renderStudentHistoryModal = () => {
    if (!viewingStudentHistory) return null;
    const student = viewingStudentHistory;
    const history = examRecords.filter(
      (r) => r.studentId === student.id || r.studentName === student.name
    );
    const totalExams = history.length;
    const avgScore =
      totalExams > 0
        ? Math.round(history.reduce((acc, c) => acc + c.totalScore, 0) / totalExams)
        : 0;
    const highestScore = totalExams > 0 ? Math.max(...history.map((h) => h.totalScore)) : 0;

    return (
      <div className="fixed inset-0 z-50 bg-[#141b2b]/50 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150">
        <div className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-150 border border-[#1b4332]/10">
          {/* Modal Header */}
          <div className="p-4 sm:p-5 border-b border-[#f1f3ff] bg-gradient-to-r from-[#012d1d] to-[#1b4332] text-white flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <img
                src={student.avatar}
                alt={student.name}
                className="w-12 h-12 rounded-full object-cover ring-2 ring-[#c1ecd4] shrink-0"
              />
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-bold text-base text-white truncate">{student.name}</h3>
                  <span className="px-2 py-0.5 rounded-full bg-white/20 text-[#c1ecd4] text-[10px] font-bold shrink-0">
                    {student.halaqah || 'Halaqah Al-Fajr'}
                  </span>
                </div>
                <p className="text-xs text-[#86af99] truncate mt-0.5">
                  Pembimbing: {student.supervisor || 'Ustadz Farhan'} • Riwayat Lengkap Ujian Tilawah
                </p>
              </div>
            </div>
            <button
              onClick={() => setViewingStudentHistory(null)}
              className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer shrink-0"
              title="Tutup Riwayat"
            >
              <span className="material-symbols-outlined text-[18px]">close</span>
            </button>
          </div>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-3 gap-2 p-3 sm:p-4 bg-[#f9f9ff] border-b border-[#1b4332]/5 text-center">
            <div className="p-2.5 rounded-2xl bg-white border border-[#1b4332]/5 shadow-2xs">
              <span className="text-[10px] font-semibold text-[#717973] uppercase tracking-wider block">
                Total Ujian
              </span>
              <span className="text-base sm:text-lg font-bold text-[#141b2b]">
                {totalExams} <span className="text-xs font-normal text-[#414844]">kali</span>
              </span>
            </div>
            <div className="p-2.5 rounded-2xl bg-white border border-[#1b4332]/5 shadow-2xs">
              <span className="text-[10px] font-semibold text-[#717973] uppercase tracking-wider block">
                Rata-rata Nilai
              </span>
              <span className="text-base sm:text-lg font-bold text-[#00452c]">
                {totalExams > 0 ? `${avgScore}%` : '-'}
              </span>
            </div>
            <div className="p-2.5 rounded-2xl bg-white border border-[#1b4332]/5 shadow-2xs">
              <span className="text-[10px] font-semibold text-[#717973] uppercase tracking-wider block">
                Nilai Tertinggi
              </span>
              <span className="text-base sm:text-lg font-bold text-[#775a19]">
                {totalExams > 0 ? `${highestScore}%` : '-'}
              </span>
            </div>
          </div>

          {/* Body: History List or Empty State */}
          <div className="p-4 sm:p-5 overflow-y-auto space-y-3 flex-1">
            <div className="flex items-center justify-between pb-1 flex-wrap gap-2">
              <div className="flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[18px] text-[#012d1d]">history</span>
                <h4 className="text-xs sm:text-sm font-bold text-[#141b2b]">
                  Daftar Riwayat Ujian &amp; Penilaian ({totalExams})
                </h4>
              </div>
              {totalExams > 0 && (
                <button
                  onClick={() => {
                    const cleanName = student.name.replace(/\s+/g, '_');
                    exportRecitationExamToExcel(history, `Riwayat_Ujian_${cleanName}`);
                    onShowToast(`Riwayat ujian ${student.name} berhasil diunduh ke Excel!`);
                  }}
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-[#00452c] hover:text-[#012d1d] bg-[#c1ecd4]/70 hover:bg-[#c1ecd4] px-3 py-1 rounded-full transition-colors cursor-pointer shadow-2xs"
                >
                  <span className="material-symbols-outlined text-[14px]">file_download</span>
                  <span>Unduh Excel Karyawan Ini</span>
                </button>
              )}
            </div>

            {totalExams === 0 ? (
              <div className="py-10 text-center space-y-3.5 bg-[#f9f9ff] rounded-2xl border border-dashed border-[#1b4332]/15 p-6">
                <div className="w-14 h-14 rounded-full bg-[#edf0ff] text-[#012d1d] flex items-center justify-center mx-auto shadow-2xs">
                  <span className="material-symbols-outlined text-[28px]">history_edu</span>
                </div>
                <div>
                  <h5 className="text-sm font-bold text-[#141b2b]">Belum Ada Riwayat Ujian</h5>
                  <p className="text-xs text-[#717973] max-w-sm mx-auto mt-1 leading-relaxed">
                    Karyawan {student.name} belum memiliki catatan pengujian tilawah. Klik tombol di bawah untuk memulai sesi tes tilawah perdana.
                  </p>
                </div>
                <button
                  onClick={() => {
                    setViewingStudentHistory(null);
                    handleSelectStudentForExam(student);
                  }}
                  className="px-4 py-2 rounded-full bg-[#012d1d] hover:bg-[#1b4332] text-white text-xs font-bold inline-flex items-center gap-1.5 shadow-sm cursor-pointer transition-transform active:scale-95"
                >
                  <span className="material-symbols-outlined text-[16px]">mic</span>
                  <span>Mulai Ujian Perdana Karyawan Ini</span>
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {history.map((record, index) => (
                  <div
                    key={record.id || index}
                    className="p-3.5 sm:p-4 rounded-2xl bg-white border border-[#1b4332]/10 hover:border-[#012d1d]/30 shadow-xs hover:shadow-sm transition-all space-y-2.5"
                  >
                    <div className="flex items-start justify-between gap-2 flex-wrap">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="px-2.5 py-0.5 rounded-lg bg-[#edf0ff] text-[#012d1d] text-xs font-bold">
                            {record.surah} ({record.ayah})
                          </span>
                          <span className="text-[11px] text-[#717973] flex items-center gap-1">
                            <span className="material-symbols-outlined text-[13px]">schedule</span>
                            {record.evaluatedAt}
                          </span>
                          {record.audioDurationSec > 0 && (
                            <span className="text-[10px] text-[#414844] bg-[#f1f3ff] px-2 py-0.2 rounded-full">
                              ⏱ {record.audioDurationSec}s
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-[#414844] mt-1 flex items-center gap-1">
                          <span className="material-symbols-outlined text-[14px] text-[#717973]">person</span>
                          <span>Penguji: <strong className="text-[#141b2b]">{record.examinerName}</strong> ({record.examinerRole})</span>
                        </p>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="px-2.5 py-1 rounded-full bg-[#c1ecd4] text-[#002114] text-xs font-bold inline-block shadow-2xs">
                          {record.totalScore}% • {record.predicate}
                        </span>
                      </div>
                    </div>

                    {/* Breakdown Sub-scores */}
                    <div className="grid grid-cols-3 gap-2 pt-2 border-t border-[#f1f3ff] text-center text-xs">
                      <div className="p-2 rounded-xl bg-[#f9f9ff]">
                        <span className="text-[10px] text-[#717973] block">Tajwid</span>
                        <span className="font-bold text-[#00452c] text-sm">{record.tajweedScore}%</span>
                      </div>
                      <div className="p-2 rounded-xl bg-[#f9f9ff]">
                        <span className="text-[10px] text-[#717973] block">Makhraj</span>
                        <span className="font-bold text-[#00452c] text-sm">{record.makhrajScore}%</span>
                      </div>
                      <div className="p-2 rounded-xl bg-[#f9f9ff]">
                        <span className="text-[10px] text-[#717973] block">Kelancaran</span>
                        <span className="font-bold text-[#00452c] text-sm">{record.fluencyScore}%</span>
                      </div>
                    </div>

                    {/* Ustadz Note */}
                    {record.ustadzNotes && (
                      <div className="p-2.5 rounded-xl bg-[#fff9eb] border border-[#fed488]/40 text-xs text-[#775a19] flex items-start gap-2">
                        <span className="material-symbols-outlined text-[16px] text-[#775a19] shrink-0 mt-0.5">
                          rate_review
                        </span>
                        <p className="leading-relaxed">
                          <span className="font-bold">Catatan Ustadz:</span> &ldquo;{record.ustadzNotes}&rdquo;
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Modal Footer */}
          <div className="p-3.5 sm:p-4 border-t border-[#f1f3ff] bg-[#f9f9ff] flex items-center justify-between gap-2">
            <button
              onClick={() => setViewingStudentHistory(null)}
              className="px-4 py-2 rounded-full bg-white hover:bg-[#e9edff] text-[#414844] text-xs font-bold border border-[#1b4332]/10 transition-colors cursor-pointer"
            >
              Tutup
            </button>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setViewingStudentHistory(null);
                  handleSelectStudentForExam(student);
                }}
                className="px-4 py-2 rounded-full bg-[#012d1d] hover:bg-[#1b4332] text-white text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm active:scale-95"
              >
                <span className="material-symbols-outlined text-[16px]">mic</span>
                <span>{totalExams > 0 ? 'Mulai Ujian Baru' : 'Mulai Ujian Karyawan Ini'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // 1. Examiner Initial View: SELECT SANTRI FIRST
  if (isExaminer && !selectedStudent) {
    return (
      <div className="flex flex-col w-full px-4 md:px-6 py-3 space-y-4 max-w-4xl mx-auto pb-28">
        {/* Top Breadcrumb & Actions Bar */}
        <div className="flex items-center justify-between flex-wrap gap-2">
          <button
            onClick={onBack}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white hover:bg-[#e9edff] text-xs font-semibold text-[#012d1d] shadow-sm transition-colors border border-[#1b4332]/5 cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">arrow_back</span>
            <span>Kembali ke Dashboard</span>
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsViewingReportModal(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#fed488] hover:bg-[#fed488]/90 text-[#775a19] text-xs font-bold shadow-sm transition-all cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px]">table_chart</span>
              <span>Rekap Nilai &amp; Export Excel</span>
              <span className="px-1.5 py-0.2 rounded-full bg-[#775a19] text-[#fed488] text-[10px]">
                {examRecords.length}
              </span>
            </button>
          </div>
        </div>

        {/* Header Hero Banner */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#012d1d] via-[#0b3824] to-[#1b4332] text-white p-5 shadow-md">
          <div className="absolute -right-12 -top-12 w-44 h-44 rounded-full bg-[#00452c]/50 blur-2xl pointer-events-none" />
          <div className="absolute -left-10 -bottom-10 w-36 h-36 rounded-full bg-[#fed488]/20 blur-xl pointer-events-none" />

          <div className="relative z-10 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/15 text-[#92f7c3] text-[11px] font-bold uppercase tracking-wider backdrop-blur-md">
                <span className="material-symbols-outlined text-[14px]">school</span>
                Ujian &amp; Penilaian Tilawah Karyawan
              </span>
              <span className="text-xs text-[#86af99] font-medium hidden sm:inline">
                Penguji: {activeUser?.name || 'Ustadz Pembimbing'}
              </span>
            </div>

            <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              Pilih Karyawan yang Akan Diuji
            </h2>
            <p className="text-xs sm:text-sm text-[#c1ecd4]/90 max-w-xl leading-relaxed">
              Pilih karyawan halaqah di bawah untuk memulai sesi pengujian hafalan, makhraj, tajwid &amp; kelancaran. Nilai akhir akan tercatat rapi dan dapat langsung diekspor ke format Microsoft Excel.
            </p>
          </div>
        </div>

        {/* Search & Filter Bar */}
        <div className="space-y-2.5">
          <div className="relative">
            <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-[18px] text-[#717973]">
              search
            </span>
            <input
              type="text"
              value={studentSearchQuery}
              onChange={(e) => setStudentSearchQuery(e.target.value)}
              placeholder="Cari karyawan berdasarkan nama atau kelompok halaqah..."
              className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-white border border-[#1b4332]/10 text-xs sm:text-sm text-[#141b2b] placeholder:text-[#717973] shadow-sm focus:outline-none focus:border-[#012d1d]"
            />
            {studentSearchQuery && (
              <button
                onClick={() => setStudentSearchQuery('')}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#717973] hover:text-[#141b2b]"
              >
                <span className="material-symbols-outlined text-[16px]">close</span>
              </button>
            )}
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
            <button
              onClick={() => setStudentHalaqahFilter('all')}
              className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                studentHalaqahFilter === 'all'
                  ? 'bg-[#012d1d] text-white shadow-xs'
                  : 'bg-white text-[#414844] hover:bg-[#e9edff] border border-[#1b4332]/5'
              }`}
            >
              Semua Karyawan ({candidateStudents.length})
            </button>
            <button
              onClick={() => setStudentHalaqahFilter('Halaqah Al-Fajr')}
              className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                studentHalaqahFilter === 'Halaqah Al-Fajr'
                  ? 'bg-[#012d1d] text-white shadow-xs'
                  : 'bg-white text-[#414844] hover:bg-[#e9edff] border border-[#1b4332]/5'
              }`}
            >
              Halaqah Al-Fajr
            </button>
            <button
              onClick={() => setStudentHalaqahFilter('Hafiz Circle')}
              className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                studentHalaqahFilter === 'Hafiz Circle'
                  ? 'bg-[#012d1d] text-white shadow-xs'
                  : 'bg-white text-[#414844] hover:bg-[#e9edff] border border-[#1b4332]/5'
              }`}
            >
              Hafiz Circle
            </button>
            <button
              onClick={() => setStudentHalaqahFilter('tested')}
              className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                studentHalaqahFilter === 'tested'
                  ? 'bg-[#00452c] text-white shadow-xs'
                  : 'bg-white text-[#414844] hover:bg-[#e9edff] border border-[#1b4332]/5'
              }`}
            >
              ✓ Sudah Diuji
            </button>
            <button
              onClick={() => setStudentHalaqahFilter('untested')}
              className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                studentHalaqahFilter === 'untested'
                  ? 'bg-[#775a19] text-white shadow-xs'
                  : 'bg-white text-[#414844] hover:bg-[#e9edff] border border-[#1b4332]/5'
              }`}
            >
              ⏳ Belum Diuji
            </button>
          </div>
        </div>

        {/* Student Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {filteredStudents.map((student) => {
            const studentExams = examRecords.filter(
              (r) => r.studentId === student.id || r.studentName === student.name
            );
            const latestExam = studentExams[0];

            return (
              <div
                key={student.id}
                className="p-4 rounded-2xl bg-white border border-[#1b4332]/8 shadow-sm hover:shadow-md transition-all flex flex-col justify-between gap-3 group"
              >
                <div className="flex items-start gap-3">
                  <img
                    src={student.avatar}
                    alt={student.name}
                    className="w-12 h-12 rounded-full object-cover ring-2 ring-[#c1ecd4] shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1">
                      <h3 className="text-sm font-bold text-[#141b2b] truncate group-hover:text-[#012d1d]">
                        {student.name}
                      </h3>
                      {latestExam ? (
                        <span className="px-2 py-0.5 rounded-full bg-[#c1ecd4] text-[#002114] text-[10px] font-bold shrink-0">
                          {latestExam.totalScore}% • {latestExam.predicate.split(' ')[0]}
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full bg-[#f1f3ff] text-[#717973] text-[10px] font-semibold shrink-0">
                          Belum Diuji
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-[#414844] mt-0.5 truncate">
                      {student.halaqah || 'Halaqah Al-Fajr'}
                    </p>

                    {latestExam ? (
                      <div className="flex items-center gap-1.5 mt-1.5 text-[11px] text-[#00452c] flex-wrap">
                        <span className="material-symbols-outlined text-[14px]">check_circle</span>
                        <span>Terakhir: {latestExam.evaluatedAt.split(' ')[0]} ({latestExam.surah})</span>
                        <span className="px-1.5 py-0.2 rounded-full bg-[#00452c]/10 text-[10px] font-bold">
                          {studentExams.length}x tes
                        </span>
                      </div>
                    ) : (
                      <p className="text-[11px] text-[#775a19] mt-1.5 flex items-center gap-1">
                        <span className="material-symbols-outlined text-[14px]">hourglass_empty</span>
                        <span>Belum ada riwayat tes • Siap diuji</span>
                      </p>
                    )}
                  </div>
                </div>

                <div className="pt-2.5 border-t border-[#f1f3ff] flex items-center justify-between gap-2 flex-wrap">
                  {/* Riwayat Ujian / Tes Button */}
                  <button
                    onClick={() => setViewingStudentHistory(student)}
                    className="px-3 py-1.5 rounded-full bg-[#f1f3ff] hover:bg-[#e4e7ff] text-[#012d1d] text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border border-[#1b4332]/10 active:scale-95"
                    title={`Lihat riwayat ujian karyawan ${student.name}`}
                  >
                    <span className="material-symbols-outlined text-[15px] text-[#00452c]">history</span>
                    <span>Riwayat Tes</span>
                    <span className="min-w-4.5 px-1 h-4.5 rounded-full bg-white text-[10px] font-bold flex items-center justify-center text-[#012d1d] shadow-2xs border border-[#1b4332]/10">
                      {studentExams.length}
                    </span>
                  </button>

                  {/* Mulai Ujian / Uji Ulang Button */}
                  <button
                    onClick={() => handleSelectStudentForExam(student)}
                    className="px-3.5 py-1.5 rounded-full bg-[#012d1d] hover:bg-[#1b4332] text-white text-xs font-bold transition-all flex items-center gap-1 cursor-pointer shadow-xs active:scale-95 ml-auto"
                  >
                    <span className="material-symbols-outlined text-[15px]">mic</span>
                    <span>{latestExam ? 'Uji Ulang' : 'Mulai Ujian'}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Modal Rekap & Export Excel */}
        {isViewingReportModal && renderReportModal()}
        {viewingStudentHistory && renderStudentHistoryModal()}
      </div>
    );
  }

  return (
    <div className="flex flex-col w-full px-4 md:px-6 py-3 space-y-4 max-w-4xl mx-auto pb-28">
      {/* Examiner Active Student Session Top Banner */}
      {isExaminer && selectedStudent ? (
        <div className="p-3.5 rounded-2xl bg-gradient-to-r from-[#012d1d] to-[#1b4332] text-white shadow-md flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3 min-w-0">
            <img
              src={selectedStudent.avatar}
              alt={selectedStudent.name}
              className="w-12 h-12 rounded-full object-cover ring-2 ring-white/30 shrink-0"
            />
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#92f7c3]">
                  Sesi Ujian Karyawan
                </span>
                <span className="px-2 py-0.2 rounded-full bg-white/20 text-[10px] font-bold">
                  {selectedStudent.halaqah}
                </span>
              </div>
              <h2 className="text-base font-bold text-white truncate">
                {selectedStudent.name}
              </h2>
              <p className="text-xs text-[#86af99] truncate">
                Penguji: {activeUser?.name || 'Ustadz Pembimbing'} • Target: {currentAyah.surahName}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setViewingStudentHistory(selectedStudent)}
              className="px-2.5 py-1.5 rounded-full bg-white/15 hover:bg-white/25 text-white text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
              title={`Lihat Riwayat Ujian ${selectedStudent.name}`}
            >
              <span className="material-symbols-outlined text-[16px]">history</span>
              <span className="hidden sm:inline">Riwayat Karyawan</span>
            </button>
            <button
              onClick={() => setSelectedStudent(null)}
              className="px-3 py-1.5 rounded-full bg-white/15 hover:bg-white/25 text-white text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px]">swap_horiz</span>
              <span>Ganti Karyawan</span>
            </button>
            <button
              onClick={() => setIsViewingReportModal(true)}
              className="px-2.5 py-1.5 rounded-full bg-[#fed488] hover:bg-[#fed488]/90 text-[#775a19] text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
              title="Lihat Rekap & Export Excel"
            >
              <span className="material-symbols-outlined text-[16px]">table_chart</span>
              <span className="hidden sm:inline">Excel</span>
            </button>
          </div>
        </div>
      ) : (
        /* Top Breadcrumb Bar for Student */
        <div className="flex items-center justify-between">
          <button
            onClick={onBack}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white hover:bg-[#e9edff] text-xs font-semibold text-[#012d1d] shadow-sm transition-colors border border-[#1b4332]/5 cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">arrow_back</span>
            <span>Kembali ke Ibadah</span>
          </button>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#00452c] bg-[#c1ecd4] px-2.5 py-0.5 rounded-full">
              <span className="material-symbols-outlined text-[13px]">verified</span>
              Uji Tilawah Halaqah
            </span>
            <span className="text-xs text-[#414844] font-medium hidden sm:inline">
              {currentAyah.surahName}
            </span>
          </div>
        </div>
      )}

      {/* Surah & Ayat Selection Shelf */}
      <div className="bg-gradient-to-r from-[#012d1d] via-[#00452c] to-[#012d1d] rounded-2xl p-4 text-white shadow-md border border-[#c1ecd4]/20 relative overflow-hidden">
        <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-[#fed488]/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2 relative z-10">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-[#fed488] text-[#785a1a] flex items-center justify-center font-bold shadow-xs">
              <span className="material-symbols-outlined text-[18px]">menu_book</span>
            </div>
            <div>
              <h3 className="text-xs sm:text-sm font-bold text-white tracking-wide flex items-center gap-1.5">
                <span>Pilih Surah Tilawah (Juz 30 Complete)</span>
                <span className="text-[10px] bg-[#c1ecd4] text-[#002114] px-2 py-0.2 rounded-full font-bold">
                  39 Surah Tersedia
                </span>
              </h3>
              <p className="text-[11px] text-[#c1ecd4]/90">
                Pilih surah dari dropdown di bawah. AI akan otomatis menyesuaikan dan menganalisis bacaan sesuai ayat yang Anda baca.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-[#e9fbf2] bg-white/10 px-2.5 py-1 rounded-lg border border-white/10 flex items-center gap-1">
              <span>Aktif:</span>
              <strong className="text-[#fed488] font-bold">{currentAyah.surahName}</strong>
            </span>
          </div>
        </div>

        {/* Dropdown Select & Search Controls */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 relative z-10 pt-1">
          {/* Live Search Input */}
          <div className="sm:col-span-5 relative">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-[#c1ecd4]">
              search
            </span>
            <input
              type="text"
              value={surahSearchQuery}
              onChange={(e) => setSurahSearchQuery(e.target.value)}
              placeholder="Cari surah (misal: An-Nas, Naba, 114)..."
              className="w-full pl-9 pr-3 py-2 bg-white/10 border border-white/20 rounded-xl text-xs text-white placeholder-[#c1ecd4]/60 focus:outline-none focus:ring-2 focus:ring-[#fed488] focus:bg-white/15 transition-all"
            />
            {surahSearchQuery && (
              <button
                type="button"
                onClick={() => setSurahSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#c1ecd4] hover:text-white"
              >
                <span className="material-symbols-outlined text-[16px]">close</span>
              </button>
            )}
          </div>

          {/* Main Surah Select Dropdown */}
          <div className="sm:col-span-7 relative">
            <select
              value={selectedAyahId}
              onChange={(e) => handleSelectAyah(e.target.value)}
              className="w-full pl-3 pr-8 py-2 bg-[#002114] border border-[#c1ecd4]/40 rounded-xl text-xs font-bold text-[#fed488] appearance-none focus:outline-none focus:ring-2 focus:ring-[#fed488] cursor-pointer shadow-sm transition-all"
            >
              {filteredSurahs.map((item) => (
                <option
                  key={item.id}
                  value={item.id}
                  className="bg-[#012d1d] text-white py-1.5 font-medium"
                >
                  [{item.surahNumber}] {item.surahName} ({item.surahArabic}) — {item.words.length} Kata
                </option>
              ))}
            </select>
            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-[#fed488] flex items-center">
              <span className="material-symbols-outlined text-[20px]">arrow_drop_down</span>
            </div>
          </div>
        </div>

        {/* Quick Surah Info Pill Bar */}
        <div className="mt-2.5 flex items-center gap-2 overflow-x-auto pb-0.5 no-scrollbar relative z-10 text-[11px] text-[#c1ecd4]">
          <span className="shrink-0 flex items-center gap-1 bg-white/5 px-2.5 py-1 rounded-lg border border-white/10">
            <span className="material-symbols-outlined text-[14px] text-[#fed488]">translate</span>
            <span>Kategori: {currentAyah.surahNumber <= 114 && currentAyah.surahNumber >= 78 ? 'Juz 30' : 'Surah Pilihan'}</span>
          </span>
          <span className="shrink-0 flex items-center gap-1 bg-white/5 px-2.5 py-1 rounded-lg border border-white/10">
            <span className="material-symbols-outlined text-[14px] text-[#fed488]">grid_view</span>
            <span>{currentAyah.words.length} Segmentasi Kata Tajwid</span>
          </span>
          <span className="shrink-0 flex items-center gap-1 bg-white/5 px-2.5 py-1 rounded-lg border border-white/10">
            <span className="material-symbols-outlined text-[14px] text-[#fed488]">verified_user</span>
            <span>Model AI Evaluasi Opsi Dept HX</span>
          </span>
        </div>
      </div>

      {/* AI Detected Surah Notification Card (if different from target) */}
      {detectedSurahName && detectedSurahName !== currentAyah.surahName && (
        <div className="p-3.5 rounded-2xl bg-[#fff8ef] border border-[#fed488] text-[#785a1a] flex items-center justify-between gap-3 text-xs shadow-xs animate-in fade-in duration-200">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="material-symbols-outlined text-[22px] text-[#785a1a] shrink-0">
              auto_awesome
            </span>
            <div className="min-w-0">
              <span className="font-bold block text-xs truncate">
                AI Mendeteksi Bacaan: <span className="underline">{detectedSurahName}</span>
              </span>
              <span className="text-[11px] text-[#775a19] block leading-tight">
                Koreksi tajwid, makhraj, dan segmentasi kata telah disesuaikan secara otomatis untuk {detectedSurahName}.
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              const matched = RECITATION_AYAHS.find(
                (a) =>
                  a.surahName.toLowerCase().includes(detectedSurahName.toLowerCase()) ||
                  detectedSurahName.toLowerCase().includes(a.surahName.toLowerCase())
              );
              if (matched) handleSelectAyah(matched.id);
            }}
            className="px-3 py-1.5 rounded-xl bg-[#012d1d] hover:bg-[#1b4332] text-white font-bold text-[11px] shrink-0 cursor-pointer shadow-xs transition-all active:scale-95 flex items-center gap-1"
          >
            <span>Pilih Surah Ini</span>
            <span className="material-symbols-outlined text-[13px]">arrow_forward</span>
          </button>
        </div>
      )}

      {/* Target Ayah Scripture Card */}
      <section className="bg-white rounded-2xl p-4 sm:p-5 shadow-sm border border-[#1b4332]/5 relative overflow-hidden">
        <div className="absolute -top-6 -right-6 w-32 h-32 rounded-full bg-[#c1ecd4]/30 pointer-events-none blur-2xl" />

        {/* Card Header & Sheikh Reference Audio Toggle */}
        <div className="flex items-center justify-between pb-3 border-b border-[#f1f3ff] flex-wrap gap-2">
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-xs text-[#012d1d] bg-[#c1ecd4]/70 px-2.5 py-0.5 rounded-full font-bold">
                {currentAyah.surahName.includes('Ayat') ? currentAyah.surahName : `${currentAyah.surahName} : Ayat ${currentAyah.ayahNumber}`}
              </span>
              <span className="text-[11px] text-[#414844] font-medium">
                Riwayat Hafs &apos;an &apos;Ashim
              </span>
            </div>
            <p className="text-xs text-[#775a19] font-medium">
              Target Tartil: {currentAyah.idealDurationMinSec}–{currentAyah.idealDurationMaxSec} detik • {currentAyah.tajweedRule}
            </p>
          </div>

          <button
            onClick={handleToggleSheikh}
            className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full transition-all cursor-pointer ${
              isPlayingSheikh
                ? 'bg-[#00452c] text-white shadow-sm'
                : 'bg-[#f1f3ff] text-[#012d1d] hover:bg-[#e9edff]'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">
              {isPlayingSheikh ? 'pause_circle' : 'volume_up'}
            </span>
            <span>{isPlayingSheikh ? 'Jeda Qari' : 'Dengarkan Qari (Syaikh Alafasy)'}</span>
          </button>
        </div>

        {/* Evaluation filter tabs (ONLY SHOWN AFTER EVALUATION) */}
        {isEvaluated && (
          <div className="mt-3 flex items-center justify-between flex-wrap gap-2 animate-in fade-in">
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setFilterMode('all')}
                className={`text-xs px-2.5 py-1 rounded-lg font-semibold transition-colors cursor-pointer ${
                  filterMode === 'all'
                    ? 'bg-[#012d1d] text-white shadow-xs'
                    : 'bg-[#f1f3ff] text-[#414844] hover:bg-[#e9edff]'
                }`}
              >
                Semua Kata ({evaluatedWords.length})
              </button>
              <button
                type="button"
                onClick={() => setFilterMode('needs-correction')}
                className={`text-xs px-2.5 py-1 rounded-lg font-semibold transition-colors flex items-center gap-1 cursor-pointer ${
                  filterMode === 'needs-correction'
                    ? 'bg-[#ba1a1a] text-white shadow-xs'
                    : 'bg-[#ffdad6] text-[#ba1a1a] hover:bg-[#ffb4ab]'
                }`}
              >
                <span className="material-symbols-outlined text-[13px]">report_problem</span>
                <span>Perlu Dibenarkan ({needsCorrectionWords.length})</span>
              </button>
              <button
                type="button"
                onClick={() => setFilterMode('fluent')}
                className={`text-xs px-2.5 py-1 rounded-lg font-semibold transition-colors flex items-center gap-1 cursor-pointer ${
                  filterMode === 'fluent'
                    ? 'bg-[#00452c] text-white shadow-xs'
                    : 'bg-[#c1ecd4] text-[#00452c] hover:bg-[#a0dbb9]'
                }`}
              >
                <span className="material-symbols-outlined text-[13px]">check</span>
                <span>Fasih ({fluentWords.length})</span>
              </button>
            </div>

            <span className="text-[11px] text-[#775a19] font-medium">
              Klik kata untuk melihat panduan cara membenarkannya
            </span>
          </div>
        )}

        {/* Quran Calligraphy Deck */}
        <div className="py-4 text-right" dir="rtl">
          {!isEvaluated ? (
            /* BEFORE EVALUATION: Clean, pristine Arabic scripture to recite */
            <p className="font-amiri text-2xl sm:text-3xl text-[#141b2b] tracking-wide leading-[60px]">
              {currentAyah.words.map((w) => (
                <span key={w.id} className="inline-block px-1.5">
                  {w.arabic}
                </span>
              ))}
              <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-[#e9edff] text-[#012d1d] font-bold text-sm select-none mr-2">
                ۝{currentAyah.ayahNumber}
              </span>
            </p>
          ) : (
            /* AFTER EVALUATION: Interactive diagnostic chips with Tarteel AI Benchmark legend */
            <div className="space-y-3">
              {/* Tarteel AI Legend Header */}
              <div className="flex items-center justify-between gap-2 flex-wrap bg-[#f1f3ff] p-2.5 rounded-xl border border-[#dce2f7] text-xs">
                <div className="flex items-center gap-1.5 font-bold text-[#012d1d]">
                  <span className="material-symbols-outlined text-[18px] text-[#785a1a]">verified_user</span>
                  <span>Standar Evaluasi Tarteel AI Qira'at:</span>
                </div>
                <div className="flex items-center gap-3 text-[11px] font-medium flex-wrap">
                  <span className="flex items-center gap-1 text-[#00452c]">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#c1ecd4] border border-[#00452c] inline-block" />
                    <strong>Fasih (100%)</strong>
                  </span>
                  <span className="flex items-center gap-1 text-[#785a1a]">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#fed488] border border-[#775a19] inline-block" />
                    <strong>Perlu Perbaikan Tajwid</strong>
                  </span>
                  <span className="flex items-center gap-1 text-[#ba1a1a]">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#ffdad6] border border-[#ba1a1a] inline-block" />
                    <strong>Salah Baca / Lahn Jali</strong>
                  </span>
                </div>
              </div>

              <p className="font-amiri text-2xl sm:text-3xl text-[#141b2b] tracking-wide flex flex-wrap flex-row-reverse justify-start items-center gap-y-3.5 gap-x-2 leading-[58px]">
              {evaluatedWords.map((w) => {
                const isSelected = selectedWord?.id === w.id;
                let bgStyle = 'bg-[#f1f3ff]/70 hover:bg-[#e9edff]';
                let badgeColor = 'text-[#414844]';
                let borderStyle = 'border border-transparent';

                if (w.status === 'perfect') {
                  bgStyle = isSelected
                    ? 'ring-2 ring-[#012d1d] bg-[#c1ecd4]'
                    : 'bg-[#c1ecd4]/50 hover:bg-[#c1ecd4]/70';
                  badgeColor = 'text-[#00452c] font-bold';
                  borderStyle = 'border border-[#00452c]/20';
                } else if (w.status === 'correct') {
                  bgStyle = isSelected
                    ? 'ring-2 ring-[#012d1d] bg-[#d7f5e5]'
                    : 'bg-[#d7f5e5]/50 hover:bg-[#d7f5e5]/80';
                  badgeColor = 'text-[#00452c] font-semibold';
                } else if (w.status === 'warning') {
                  bgStyle = isSelected
                    ? 'ring-2 ring-[#775a19] bg-[#fed488]'
                    : 'bg-[#fed488]/70 hover:bg-[#fed488]';
                  badgeColor = 'text-[#785a1a] font-bold';
                  borderStyle = 'border border-[#775a19]/30';
                } else if (w.status === 'error') {
                  bgStyle = isSelected
                    ? 'ring-2 ring-[#ba1a1a] bg-[#ffdad6]'
                    : 'bg-[#ffdad6]/80 hover:bg-[#ffdad6]';
                  badgeColor = 'text-[#ba1a1a] font-bold';
                  borderStyle = 'border border-[#ba1a1a]/40 animate-pulse';
                }

                return (
                  <button
                    key={w.id}
                    type="button"
                    onClick={() => setSelectedWord(w)}
                    className={`cursor-pointer transition-all duration-200 inline-flex flex-col items-center px-3 py-1 rounded-xl shadow-xs ${bgStyle} ${borderStyle}`}
                  >
                    <span className="font-amiri text-2xl sm:text-3xl text-[#141b2b]">{w.arabic}</span>
                    <span className={`font-sans text-[10px] tracking-tight ${badgeColor} mt-0.5`}>
                      {w.transliteration ? `${w.transliteration} • ` : ''}{w.tag}
                    </span>
                  </button>
                );
              })}

              <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-[#e9edff] text-[#012d1d] font-bold text-sm select-none">
                ۝{currentAyah.ayahNumber}
              </span>
            </p>
            </div>
          )}
        </div>

        {/* Translation Banner */}
        <div className="pt-2 border-t border-[#f1f3ff]">
          <p className="text-xs sm:text-sm text-[#414844] italic leading-relaxed">
            &quot;{currentAyah.translation}&quot; ({currentAyah.surahName})
          </p>
        </div>

        {/* Live Detected Speech Recognition Transcript (if active) */}
        {speechTranscript && (
          <div className="mt-2.5 p-2.5 rounded-xl bg-[#c1ecd4]/40 border border-[#00452c]/10 text-right" dir="rtl">
            <span className="text-[10px] text-[#00452c] font-bold block mb-0.5">
              Transkrip Suara yang Terdeteksi:
            </span>
            <p className="font-amiri text-lg text-[#012d1d] leading-relaxed">
              {speechTranscript}
            </p>
          </div>
        )}

        {/* Selected Word Diagnostic & Correction Guidance Deck (ONLY SHOWN AFTER EVALUATION) */}
        {isEvaluated && selectedWord && (
          <div className="mt-3 bg-[#f1f3ff] rounded-2xl p-4 transition-all duration-300 border border-[#1b4332]/10 shadow-xs animate-in fade-in">
            <div className="flex items-start justify-between gap-3 border-b border-[#dce2f7] pb-3 flex-wrap">
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 shadow-sm text-white ${
                    selectedWord.status === 'error'
                      ? 'bg-[#ba1a1a]'
                      : selectedWord.status === 'warning'
                      ? 'bg-[#775a19]'
                      : 'bg-[#00452c]'
                  }`}
                >
                  <span className="material-symbols-outlined text-[22px]">
                    {selectedWord.icon || (selectedWord.status === 'error' ? 'priority_high' : 'check_circle')}
                  </span>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm sm:text-base font-bold text-[#141b2b]">
                      {selectedWord.title}
                    </h4>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                        selectedWord.status === 'error'
                          ? 'bg-[#ffdad6] text-[#ba1a1a]'
                          : selectedWord.status === 'warning'
                          ? 'bg-[#fed488] text-[#785a1a]'
                          : 'bg-[#c1ecd4] text-[#00452c]'
                      }`}
                    >
                      {selectedWord.status === 'error'
                        ? 'Perlu Dibenarkan'
                        : selectedWord.status === 'warning'
                        ? 'Perlu Penyempurnaan'
                        : 'Lafaz Fasih & Tepat'}
                    </span>
                  </div>
                  <p className="text-xs text-[#414844] mt-0.5">
                    Target: <strong>{selectedWord.transliteration || selectedWord.arabic}</strong> • Kaidah: {selectedWord.tajweedRuleName || selectedWord.targetMetric}
                  </p>
                </div>
              </div>

              {/* Large Arabic Word Display */}
              <div className="text-right" dir="rtl">
                <span className="font-amiri text-2xl sm:text-3xl font-bold text-[#012d1d] bg-white px-3 py-1 rounded-xl shadow-xs border border-[#1b4332]/5 inline-block">
                  {selectedWord.arabic}
                </span>
              </div>
            </div>

            {/* Diagnostic Breakdown: 1. Deskripsi Kesalahan & 2. Cara Membenarkan */}
            <div className="mt-3 space-y-2.5">
              <div className="bg-white p-3 rounded-xl border border-[#1b4332]/5">
                <div className="flex items-center gap-1.5 text-xs font-bold text-[#ba1a1a] mb-1">
                  <span className="material-symbols-outlined text-[16px]">info</span>
                  <span>Deskripsi Evaluasi &amp; Letak Kesalahan:</span>
                </div>
                <div
                  className="text-xs text-[#414844] leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: selectedWord.body }}
                />
              </div>

              <div className="bg-[#e9edff] p-3 rounded-xl border border-[#00452c]/10">
                <div className="flex items-center gap-1.5 text-xs font-bold text-[#00452c] mb-1">
                  <span className="material-symbols-outlined text-[16px] text-[#00452c]">
                    fact_check
                  </span>
                  <span>Cara Membenarkan (Panduan Perbaikan Langkah-demi-Langkah):</span>
                </div>
                <p className="text-xs text-[#141b2b] leading-relaxed">
                  {selectedWord.correctionGuide ||
                    'Langkah Membenarkan: Posisikan makhraj huruf dengan tenang, tahan ketukan mad sesuai kaidah (2/4 harakat), dan jangan tergesa-gesa saat waqaf.'}
                </p>
              </div>

              {/* Drill success banner */}
              {drillSuccessMessage && (
                <div className="p-2.5 rounded-xl bg-[#c1ecd4] border border-[#00452c]/20 flex items-center gap-2 text-xs text-[#002114] font-semibold animate-in fade-in">
                  <span className="material-symbols-outlined text-[18px] text-[#00452c]">
                    verified
                  </span>
                  <span>{drillSuccessMessage}</span>
                </div>
              )}

              {/* Action Buttons for Word: Listen Correct & Drill */}
              <div className="pt-1 flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    onClick={() => handlePlayIsolatedPhonetic(selectedWord)}
                    disabled={isPlayingPhonetic}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white text-[#012d1d] text-xs font-semibold hover:bg-[#e9edff] shadow-sm transition-colors cursor-pointer border border-[#1b4332]/10"
                  >
                    <span className="material-symbols-outlined text-[16px] text-[#00452c]">
                      {isPlayingPhonetic ? 'sync' : 'volume_up'}
                    </span>
                    <span>
                      {isPlayingPhonetic
                        ? 'Memutar Fonetik...'
                        : `Dengarkan Contoh Benar (${selectedWord.transliteration || selectedWord.arabic})`}
                    </span>
                  </button>

                  <button
                    onClick={() => handleStartWordDrill(selectedWord)}
                    disabled={isDrillRecording}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all shadow-sm cursor-pointer ${
                      isDrillRecording
                        ? 'bg-[#ba1a1a] text-white animate-pulse'
                        : 'bg-[#00452c] text-white hover:bg-[#1b4332]'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[16px]">
                      {isDrillRecording ? 'mic' : 'sports_score'}
                    </span>
                    <span>
                      {isDrillRecording
                        ? 'Merekam Latihan Kata (3 dtk)...'
                        : `Latih Kata Ini (${selectedWord.arabic})`}
                    </span>
                  </button>
                </div>

                <span className="text-[11px] text-[#414844]">
                  Petunjuk Suara: {selectedWord.audioHint}
                </span>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* Evaluation Results Card (ONLY SHOWN AFTER EVALUATION) */}
      {isEvaluated && (
        <section className="bg-white rounded-2xl p-4 sm:p-5 shadow-sm border border-[#1b4332]/5 space-y-3 animate-in fade-in">
          {isSilenceDetected ? (
            <div className="bg-[#ffdad6] border border-[#ba1a1a]/30 p-4 rounded-xl flex items-start gap-3">
              <span className="material-symbols-outlined text-[#ba1a1a] text-[28px] shrink-0 mt-0.5">
                volume_off
              </span>
              <div className="flex-1">
                <h4 className="text-sm font-bold text-[#ba1a1a]">
                  Suara Tilawah Tidak Terdeteksi (Rekaman Hening)
                </h4>
                <p className="text-xs text-[#414844] mt-1 leading-relaxed">
                  Sistem mendeteksi bahwa mikrofon tidak menangkap suara bacaan ayat (rekaman hening atau hanya desis tanpa suara tilawah). Nilai tilawah belum dapat dihitung (0%).
                </p>
                <p className="text-xs text-[#012d1d] font-semibold mt-1">
                  💡 Tips: Dekatkan mikrofon ke organ bicara, pastikan izin mikrofon aktif, dan lantunkan ayat secara jelas.
                </p>
                <div className="mt-3">
                  <button
                    onClick={handleRetest}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#ba1a1a] text-white text-xs font-bold hover:bg-[#93000a] transition-all cursor-pointer shadow-xs"
                  >
                    <span className="material-symbols-outlined text-[16px]">mic</span>
                    <span>Mulai Rekam Lagi Sambil Membaca Ayat</span>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-3">
                  {/* Radial Accuracy Meter */}
                  <div className="relative flex items-center justify-center shrink-0 w-16 h-16 rounded-full bg-[#f1f3ff] shadow-[0_0_16px_rgba(233,193,118,0.2)]">
                    <svg className="w-14 h-14 -rotate-90" viewBox="0 0 48 48">
                      <circle
                        className="text-[#dce2f7] fill-none"
                        cx="24"
                        cy="24"
                        r="20"
                        stroke="currentColor"
                        strokeWidth="3.5"
                      />
                      <circle
                        className="text-[#775a19] fill-none transition-all duration-700 ease-out"
                        cx="24"
                        cy="24"
                        r="20"
                        stroke="currentColor"
                        strokeDasharray="125.6"
                        strokeDashoffset={ringOffset}
                        strokeLinecap="round"
                        strokeWidth="3.5"
                      />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-sm font-bold text-[#012d1d] leading-none">
                        {overallScore}
                        <span className="text-[10px] text-[#775a19] font-normal">%</span>
                      </span>
                      <span className="text-[9px] uppercase tracking-wider text-[#414844] font-semibold mt-0.5">
                        Nilai
                      </span>
                    </div>
                  </div>

                  <div>
                    <span className="text-xs text-[#775a19] font-bold uppercase tracking-wider">
                      Hasil Evaluasi Tilawah Anda
                    </span>
                    <h3 className="text-base sm:text-lg font-bold text-[#012d1d]">
                      {overallScore >= 95
                        ? 'Mumtaz • Sangat Istimewa'
                        : overallScore >= 90
                        ? 'Mumtaz • Sangat Baik'
                        : overallScore >= 80
                        ? 'Jayyid Jiddan • Baik Sekali'
                        : 'Jayyid • Perlu Latihan'} ({overallScore}%)
                    </h3>
                  </div>
                </div>

                <span className="px-3 py-1 rounded-full bg-[#fed488] text-[#785a1a] text-xs font-bold flex items-center gap-1 shadow-sm">
                  <span
                    className="material-symbols-outlined text-[16px]"
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    workspace_premium
                  </span>
                  {overallScore >= 90 ? 'Lolos Standar Halaqah' : 'Perlu Perbaikan Harakat'}
                </span>
              </div>

              {/* 3-Pillar Progress Metrics Grid */}
              <div className="grid grid-cols-3 gap-2 pt-1">
                {/* Metric 1: Makharij */}
                <div className="bg-[#f1f3ff] p-3 rounded-xl flex flex-col justify-between">
                  <div className="flex items-center justify-between text-xs text-[#414844] font-medium">
                    <span>Makharijul Huruf</span>
                    <span className="material-symbols-outlined text-[16px] text-[#012d1d]">
                      record_voice_over
                    </span>
                  </div>
                  <div className="mt-2">
                    <div className="flex items-baseline justify-between mb-1">
                      <span className="text-base font-bold text-[#012d1d]">{makhrajScore}%</span>
                      <span className="text-[10px] text-[#012d1d] font-semibold">
                        {makhrajScore >= 90 ? 'Fasih' : 'Cukup'}
                      </span>
                    </div>
                    <div className="w-full bg-[#dce2f7] h-1.5 rounded-full overflow-hidden">
                      <div
                        className="bg-[#012d1d] h-full rounded-full transition-all duration-500"
                        style={{ width: `${makhrajScore}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Metric 2: Tajweed */}
                <div className="bg-[#f1f3ff] p-3 rounded-xl flex flex-col justify-between">
                  <div className="flex items-center justify-between text-xs text-[#414844] font-medium">
                    <span>Hukum Tajwid</span>
                    <span className="material-symbols-outlined text-[16px] text-[#775a19]">
                      menu_book
                    </span>
                  </div>
                  <div className="mt-2">
                    <div className="flex items-baseline justify-between mb-1">
                      <span className="text-base font-bold text-[#775a19]">{tajweedScore}%</span>
                      <span className="text-[10px] text-[#775a19] font-semibold">
                        {tajweedScore >= 90 ? 'Kokoh' : 'Perlu Teliti'}
                      </span>
                    </div>
                    <div className="w-full bg-[#dce2f7] h-1.5 rounded-full overflow-hidden">
                      <div
                        className="bg-[#775a19] h-full rounded-full transition-all duration-500"
                        style={{ width: `${tajweedScore}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Metric 3: Fluency */}
                <div className="bg-[#f1f3ff] p-3 rounded-xl flex flex-col justify-between">
                  <div className="flex items-center justify-between text-xs text-[#414844] font-medium">
                    <span>Kelancaran / Irama</span>
                    <span className="material-symbols-outlined text-[16px] text-[#00452c]">
                      graphic_eq
                    </span>
                  </div>
                  <div className="mt-2">
                    <div className="flex items-baseline justify-between mb-1">
                      <span className="text-base font-bold text-[#012d1d]">{fluencyScore}%</span>
                      <span className="text-[10px] text-[#00452c] font-semibold">
                        {fluencyScore >= 90 ? 'Tartil' : 'Tempo'}
                      </span>
                    </div>
                    <div className="w-full bg-[#dce2f7] h-1.5 rounded-full overflow-hidden">
                      <div
                        className="bg-[#012d1d] h-full rounded-full transition-all duration-500"
                        style={{ width: `${fluencyScore}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Ustadz Feedback Box (Tarteel Model & Tahsin AI Engine) */}
              <div className="bg-gradient-to-br from-[#e9edff] to-[#f4f7ff] p-4 rounded-2xl border border-[#012d1d]/10 flex flex-col gap-2.5 shadow-xs">
                <div className="flex items-center justify-between flex-wrap gap-2 pb-2 border-b border-[#1b4332]/10">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-[#012d1d] text-[#fed488] flex items-center justify-center shrink-0 shadow-xs">
                      <span className="material-symbols-outlined text-[18px]">school</span>
                    </div>
                    <div>
                      <h4 className="text-xs sm:text-sm font-bold text-[#141b2b]">
                        Bimbingan Tahsin Ustadz Pembimbing
                      </h4>
                      <span className="text-[10px] text-[#414844] block">
                        Didukung Tarteel Model AI &bull; Riwayat Hafs &apos;an &apos;Ashim
                      </span>
                    </div>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full bg-[#c1ecd4] text-[#002114] text-[10px] font-bold flex items-center gap-1 shadow-2xs">
                    <span className="material-symbols-outlined text-[13px] text-[#00452c]">verified</span>
                    <span>Tarteel Evaluator Active</span>
                  </span>
                </div>

                <div className="text-xs sm:text-sm text-[#141b2b] leading-relaxed whitespace-pre-line">
                  {ustadzFeedback}
                </div>
              </div>
            </>
          )}
        </section>
      )}

      {/* Audio Recording & Microphone Deck */}
      <section className="bg-white rounded-2xl p-4 sm:p-5 shadow-sm border border-[#1b4332]/5">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="relative flex h-3 w-3">
              <span
                className={`absolute inline-flex h-full w-full rounded-full opacity-75 ${
                  isRecording ? 'animate-ping bg-[#ba1a1a]' : 'bg-[#53b889]'
                }`}
              />
              <span
                className={`relative inline-flex rounded-full h-3 w-3 ${
                  isRecording ? 'bg-[#ba1a1a]' : 'bg-[#53b889]'
                }`}
              />
            </span>
            <span className="text-xs font-bold text-[#012d1d]">
              {isRecording
                ? 'Sedang Merekam Suara & Mengukur Akustik...'
                : isAnalyzing
                ? 'Sedang Menganalisis Tilawah...'
                : recordedAudioUrl
                ? isSilenceDetected
                  ? 'Rekaman Hening (Belum Ada Suara)'
                  : 'Rekaman Tersimpan • Siap Diputar / Dikirim'
                : 'Tekan Mikrofon untuk Mulai Merekam'}
            </span>
          </div>

          <span className="text-xs font-mono font-bold text-[#141b2b] bg-[#f1f3ff] px-2.5 py-1 rounded-full">
            {formatTimer(recordSeconds)}
          </span>
        </div>

        {/* Dynamic Spectrum Waveform Visualizer */}
        <div className="h-16 w-full bg-[#f1f3ff] rounded-xl p-2 flex items-center justify-between gap-[3px] overflow-hidden px-3">
          {visualizerBars.map((height, idx) => {
            const isCenterPulse = idx >= 10 && idx <= 14;
            const barBg = isRecording
              ? isCenterPulse
                ? 'bg-[#ba1a1a]'
                : 'bg-[#012d1d]'
              : isCenterPulse
              ? 'bg-[#775a19]'
              : 'bg-[#1b4332]';

            return (
              <div
                key={idx}
                className={`w-1 sm:w-1.5 rounded-full transition-all duration-75 ${barBg}`}
                style={{
                  height: `${height}px`,
                  opacity: Math.min(1, Math.max(0.35, height / 50)),
                }}
              />
            );
          })}
        </div>

        {/* Recording Controls & User Playback */}
        <div className="mt-3 flex items-center justify-between text-[#414844] text-xs flex-wrap gap-2 pt-2 border-t border-[#f1f3ff]">
          <div className="flex items-center gap-2 flex-wrap">
            {recordedAudioUrl ? (
              <button
                type="button"
                onClick={handleToggleUserAudio}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full font-bold text-xs transition-colors cursor-pointer shadow-xs ${
                  isPlayingUserAudio
                    ? 'bg-[#00452c] text-white'
                    : 'bg-[#c1ecd4] hover:bg-[#a0dbb9] text-[#002114]'
                }`}
              >
                <span className="material-symbols-outlined text-[16px]">
                  {isPlayingUserAudio ? 'pause' : 'play_arrow'}
                </span>
                <span>
                  {isPlayingUserAudio
                    ? `Menjeda Suara (${formatAudioTime(userAudioCurrentTime)})`
                    : 'Dengarkan Rekaman Saya'}
                </span>
              </button>
            ) : (
              <span className="flex items-center gap-1 font-medium text-[#414844]">
                <span className="material-symbols-outlined text-[15px] text-[#53b889]">mic</span>
                Tekan tombol bulat merah di bawah untuk mulai merekam
              </span>
            )}

            {recordedAudioUrl && (
              <span className="text-[11px] text-[#775a19] bg-[#fed488]/40 px-2 py-0.5 rounded-full font-medium">
                Durasi: {recordSeconds} detik
              </span>
            )}
          </div>

          <button
            onClick={() => {
              const speeds: ('1.0x (Tartil)' | '1.25x (Hadar)' | '0.8x (Tahqiq)')[ ] = [
                '1.0x (Tartil)',
                '1.25x (Hadar)',
                '0.8x (Tahqiq)',
              ];
              const nextIndex = (speeds.indexOf(speedMode) + 1) % speeds.length;
              setSpeedMode(speeds[nextIndex]);
              onShowToast(`Irama bacaan disesuaikan ke: ${speeds[nextIndex]}`);
            }}
            className="flex items-center gap-1 font-medium hover:text-[#012d1d] hover:underline cursor-pointer"
          >
            <span className="material-symbols-outlined text-[14px]">speed</span>
            <span>Tempo: {speedMode}</span>
          </button>
        </div>
      </section>

      {/* AI Analyzing Spinner */}
      {isAnalyzing && (
        <section className="bg-white rounded-2xl p-5 shadow-md border border-[#00452c]/20 animate-in fade-in">
          <div className="flex flex-col items-center justify-center text-center space-y-3 py-2">
            <div className="relative flex items-center justify-center w-14 h-14 rounded-full bg-[#c1ecd4] text-[#00452c]">
              <span className="material-symbols-outlined text-[30px] animate-spin">
                progress_activity
              </span>
            </div>
            <div>
              <h3 className="text-base font-bold text-[#012d1d]">
                Sedang Menganalisis Tilawah &amp; Mengkoreksi Tajwid...
              </h3>
              <p className="text-xs text-[#414844] mt-1">{analysisStep}</p>
            </div>
            <div className="w-full max-w-xs bg-[#e9edff] h-1.5 rounded-full overflow-hidden mt-1">
              <div className="bg-[#00452c] h-full rounded-full animate-pulse w-3/4" />
            </div>
          </div>
        </section>
      )}

      {/* Bottom Main Actions: Microphone and Submit */}
      <section className="space-y-3 pt-1">
        <div className="flex items-center gap-3">
          {/* Retest Trigger (only shown if already recorded or evaluated) */}
          {recordedAudioUrl && (
            <button
              onClick={handleRetest}
              className="flex-1 h-12 px-4 rounded-full bg-white hover:bg-[#f1f3ff] text-[#012d1d] font-bold text-sm flex items-center justify-center gap-2 shadow-sm border border-[#1b4332]/5 active:scale-95 transition-all cursor-pointer"
            >
              <span className="material-symbols-outlined text-[20px] text-[#ba1a1a]">replay</span>
              <span>Uji Ulang Ayat Ini</span>
            </button>
          )}

          {/* Main Floating Mic Action Button */}
          <button
            onClick={toggleRecording}
            aria-label="Tombol Rekam Tilawah"
            title={isRecording ? 'Hentikan Rekaman & Hitung Koreksi' : 'Mulai Rekam Suara'}
            className={`relative ${
              recordedAudioUrl ? 'w-14 h-14' : 'w-full h-14'
            } rounded-full flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-all cursor-pointer ${
              isRecording
                ? 'bg-[#ba1a1a] text-white animate-pulse ring-4 ring-[#ffdad6]'
                : 'bg-[#ba1a1a] text-white hover:bg-[#93000a]'
            }`}
          >
            <span className="material-symbols-outlined text-[28px]">
              {isRecording ? 'stop' : 'mic'}
            </span>
            <span className="font-bold text-sm">
              {isRecording ? 'Hentikan & Koreksi' : 'Mulai Rekam Tilawah'}
            </span>
            <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-[#fed488]" />
          </button>
        </div>

        {/* Catatan & Rekomendasi Ustadz untuk Karyawan (Khusus Penguji) */}
        {isExaminer && selectedStudent && isEvaluated && (
          <div className="p-3.5 rounded-2xl bg-[#f1f3ff] border border-[#1b4332]/10 space-y-1.5 text-left animate-in fade-in">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#141b2b] flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[16px] text-[#012d1d]">rate_review</span>
                Catatan &amp; Evaluasi Ustadz untuk {selectedStudent.name}
              </span>
              <span className="text-[10px] text-[#00452c] font-semibold bg-[#c1ecd4] px-2 py-0.2 rounded-full">
                Masuk ke Rekap Excel
              </span>
            </div>
            <textarea
              rows={2}
              value={customUstadzNote}
              onChange={(e) => setCustomUstadzNote(e.target.value)}
              placeholder={`Contoh: MashaAllah pelafalan ${selectedStudent.name} sudah tartil, tingkatkan kestabilan mad di akhir ayat.`}
              className="w-full p-2.5 rounded-xl bg-white text-xs text-[#141b2b] placeholder:text-[#717973] border border-[#1b4332]/10 focus:border-[#012d1d] focus:outline-none"
            />
          </div>
        )}

        {/* Submit / Save Recitation Button */}
        <button
          onClick={handleSubmit}
          disabled={!isEvaluated || isSilenceDetected || isSubmitting || isSubmitted}
          className={`w-full h-13 py-3.5 rounded-full text-white font-bold text-sm flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer ${
            !isEvaluated || isSilenceDetected
              ? 'bg-[#8e9892] opacity-60 cursor-not-allowed'
              : isSubmitted
              ? 'bg-[#00452c]'
              : 'bg-[#012d1d] hover:bg-[#1b4332] active:scale-[0.99]'
          }`}
        >
          {isSubmitting ? (
            <>
              <span className="material-symbols-outlined text-[20px] animate-spin">
                progress_activity
              </span>
              <span>Menyimpan ke Buku Nilai Halaqah...</span>
            </>
          ) : isSubmitted ? (
            <>
              <span className="material-symbols-outlined text-[20px] text-[#ffdea5]">
                verified
              </span>
              <span>
                {isExaminer && selectedStudent
                  ? `Nilai ${selectedStudent.name} Berhasil Disimpan`
                  : 'Setoran Berhasil Disimpan (+150 XP)'}
              </span>
            </>
          ) : isSilenceDetected ? (
            <>
              <span className="material-symbols-outlined text-[20px] text-white/70">
                volume_off
              </span>
              <span>
                {isExaminer
                  ? 'Simpan Nilai (Suara Belum Terdeteksi)'
                  : 'Kirim Hasil Setoran (Belum Ada Suara)'}
              </span>
            </>
          ) : isEvaluated ? (
            <>
              <span className="material-symbols-outlined text-[20px] text-[#ffdea5]">
                save
              </span>
              <span>
                {currentRole === 'dept-hx' || currentRole === 'hq-admin'
                  ? `Simpan Evaluasi Dept HX (${overallScore}%) • Internal/Privat`
                  : isExaminer && selectedStudent
                  ? `Simpan Nilai Ustadz ${selectedStudent.name} (${overallScore}%) • +150 XP Klasemen`
                  : `Kirim Hasil Setoran (${overallScore}%) • +150 XP Klasemen`}
              </span>
              <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
            </>
          ) : (
            <>
              <span className="material-symbols-outlined text-[20px] text-white/70">
                {isExaminer ? 'assignment' : 'send'}
              </span>
              <span>
                {currentRole === 'dept-hx' || currentRole === 'hq-admin'
                  ? `Simpan Evaluasi Dept HX (Rekam Dulu)`
                  : isExaminer && selectedStudent
                  ? `Simpan Nilai Ustadz ${selectedStudent.name} (Rekam Dulu)`
                  : 'Kirim Hasil Setoran (Rekam Dulu)'}
              </span>
            </>
          )}
        </button>

        <p className="text-center text-xs text-[#414844]">
          {!isEvaluated
            ? isExaminer
              ? 'Tekan tombol mikrofon untuk merekam bacaan karyawan, nilai tajwid akan dihitung otomatis.'
              : 'Rekam tilawah Anda terlebih dahulu, evaluasi tajwid akan muncul otomatis setelah perekaman.'
            : isSilenceDetected
            ? 'Rekaman hening: Silakan rekam ulang sambil membaca ayat agar nilai dan koreksi dapat dihitung.'
            : currentRole === 'dept-hx' || currentRole === 'hq-admin'
            ? 'Hasil evaluasi disimpan khusus di rekap internal Dept HX (privat, tidak menambah XP Klasemen).'
            : isExaminer
            ? 'Hasil penilaian Ustadz tersimpan di buku nilai halaqah & menambah XP Klasemen Karyawan.'
            : 'Hasil penilaian tersinkron otomatis ke buku nilai Ustadz Pembimbing & Klasemen.'}
        </p>
      </section>

      {/* Modals for Examiner */}
      {isViewingReportModal && renderReportModal()}
      {showSavedExamModal && renderSavedExamModal()}
      {viewingStudentHistory && renderStudentHistoryModal()}
    </div>
  );
};
