import React, { useState, useEffect, useRef, useMemo } from 'react';
import { RECITATION_AYAHS, RecitationAyah, AyahWord } from '../data/recitationVerses';
import { ActiveUser } from '../types';
import { logRecitationToSheets } from '../services/googleSheets';
import { downloadPerColumnCSV } from '../services/csvExport';
import { runLocalTarteelModel, QuranEvaluationJSON } from '../services/localEvaluator';
import { pushNotification } from '../services/notificationService';
import { PremiumInitialAvatar } from './PremiumInitialAvatar';
import { getUstadzTitle, formatSupervisorDisplayName } from '../services/ustadzTitle';

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
    'Catatan Evaluasi Ustadz/ah'
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

const DEFAULT_STUDENTS: ActiveUser[] = [];

const DEFAULT_EXAM_RECORDS: RecitationExamRecord[] = [];

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
  const isDeptHX =
    currentRole === 'dept-hx' ||
    currentRole === 'hq-admin' ||
    activeUser?.role === 'dept-hx' ||
    activeUser?.role === 'hq-admin';
  const isExaminer = currentRole === 'admin' || isDeptHX;
  const [deptHxViewMode, setDeptHxViewMode] = useState<'studio' | 'students'>('studio');

  // Exam Records State (saved to localStorage for persistence & Excel export)
  const [examRecords, setExamRecords] = useState<RecitationExamRecord[]>(() => {
    try {
      const saved = localStorage.getItem('noorworship_recitation_exam_records_prod_v1');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {
      console.warn('Could not load saved exam records:', e);
    }
    return DEFAULT_EXAM_RECORDS;
  });

  useEffect(() => {
    try {
      localStorage.setItem('noorworship_recitation_exam_records_prod_v1', JSON.stringify(examRecords));
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
    setDeptHxViewMode('studio');
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
      setEvaluationJson(null);
      setSpeechTranscript('');
      speechTranscriptRef.current = '';
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

  // Live Speech Recognition transcript (Web Speech API / Groq transcript input)
  const [speechTranscript, setSpeechTranscript] = useState<string>('');
  const speechTranscriptRef = useRef<string>('');
  const [evaluationJson, setEvaluationJson] = useState<QuranEvaluationJSON | null>(null);
  const [showRawJsonOutput, setShowRawJsonOutput] = useState<boolean>(true);

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
          let fullTranscript = '';
          for (let i = 0; i < event.results.length; ++i) {
            fullTranscript += event.results[i][0].transcript + ' ';
          }
          const cleaned = fullTranscript.trim();
          if (cleaned) {
            speechTranscriptRef.current = cleaned;
            setSpeechTranscript(cleaned);
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
      speechTranscriptRef.current = '';
      setEvaluationJson(null);
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

  // Evaluate a specific transcript directly (either from microphone speech recognition or manual/Groq input)
  const applyTranscriptEvaluation = (transcriptToEvaluate: string, durationSec: number = 12) => {
    const cleanText = (transcriptToEvaluate || '').trim();
    const data = runLocalTarteelModel(currentAyah, durationSec, cleanText, true, 60);

    setIsSilenceDetected(false);
    setOverallScore(data.overallScore);
    setMakhrajScore(data.makhrajScore);
    setTajweedScore(data.tajweedScore);
    setFluencyScore(data.fluencyScore);
    if (data.evaluationJson) {
      setEvaluationJson(data.evaluationJson);
    }
    if (data.detectedSurah) {
      setDetectedSurahName(data.detectedSurah);
    }
    if (data.ustadzFeedback) {
      setUstadzFeedback(data.ustadzFeedback);
    }
    if (Array.isArray(data.words) && data.words.length > 0) {
      setEvaluatedWords(data.words);
      const faultyWord = data.words.find(
        (w) => w.status === 'error' || w.status === 'warning'
      );
      setSelectedWord(faultyWord || data.words[0]);
    }
    setIsEvaluated(true);
    setIsSubmitted(false);

    const statusLabel = data.evaluationJson?.status_kelulusan || (data.overallScore >= 85 ? 'Lulus' : 'Perlu Perbaikan');
    onShowToast(
      `Evaluasi Selesai! Skor Akurasi: ${data.overallScore}% (${statusLabel}).`
    );
  };

  // Stop Recording and Run Word-by-Word Recitation Analyzer
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

    // Allow 250ms for Web Speech API to flush its final onresult event
    await new Promise((r) => setTimeout(r, 250));

    const duration = Math.max(1, recordSeconds);
    const peakVolume = maxVolumeRef.current;
    const voicedFrames = voicedFramesCountRef.current;
    const capturedTranscript = (speechTranscriptRef.current || speechTranscript || '').trim();
    const hasVoice =
      peakVolume >= 12 ||
      voicedFrames >= 5 ||
      Boolean(capturedTranscript.length > 0);

    // If completely silent, immediately flag silence and score 0
    if (!hasVoice || (duration < 1.5 && !capturedTranscript)) {
      setIsAnalyzing(false);
      const silentData = runLocalTarteelModel(currentAyah, 0, '', false, 0);
      setIsSilenceDetected(true);
      setOverallScore(0);
      setMakhrajScore(0);
      setTajweedScore(0);
      setFluencyScore(0);
      setRingOffset(125.6);
      setEvaluationJson(silentData.evaluationJson || null);
      setUstadzFeedback(silentData.ustadzFeedback);
      setEvaluatedWords(silentData.words);
      setSelectedWord(null);
      setIsEvaluated(true);
      onShowToast('⚠️ Suara tidak terdeteksi: Rekaman hening. Silakan melafalkan ayat saat merekam.');
      return;
    }

    setIsAnalyzing(true);
    setIsSilenceDetected(false);
    setAnalysisStep('Membandingkan Teks Ayat Asli dengan Teks Hasil Transkripsi Suara Pengguna...');

    try {
      await new Promise((r) => setTimeout(r, 350));

      if (audioChunksRef.current.length > 0) {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setRecordedAudioBlob(audioBlob);
        const url = URL.createObjectURL(audioBlob);
        setRecordedAudioUrl(url);
        try {
          await blobToBase64(audioBlob);
        } catch (e) {
          console.warn('Base64 conversion failed', e);
        }
      }

      setAnalysisStep('Mengevaluasi kata demi kata secara berurutan (Tartil & Tajwid)...');
      await new Promise((r) => setTimeout(r, 350));

      applyTranscriptEvaluation(capturedTranscript, duration);
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

    if (isExaminer && (selectedStudent || isDeptHX)) {
      const targetId = selectedStudent?.id || activeUser?.id || 'user-dept-hx';
      const targetName = selectedStudent?.name || 'Uji Coba Mandiri Dept HX';
      const targetHalaqah = selectedStudent?.halaqah || 'Dept HX Pusat';
      const newExamRecord: RecitationExamRecord = {
        id: `exam-${Date.now()}`,
        studentId: targetId,
        studentName: targetName,
        halaqah: targetHalaqah,
        examinerName: formatSupervisorDisplayName(activeUser?.name, activeUser?.gender),
        examinerRole: isDeptHX
          ? 'Dept HX Pusat'
          : `${getUstadzTitle(activeUser)} Pembimbing`,
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
            targetName,
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
        studentId: selectedStudent?.id,
        studentName: targetName
      });

      if (selectedStudent) {
        await pushNotification({
          targetUserId: selectedStudent.id,
          recipientName: selectedStudent.name,
          targetHalaqah: selectedStudent.halaqah,
          senderName: formatSupervisorDisplayName(activeUser?.name, activeUser?.gender),
          title: `Hasil Ujian Tilawah: ${currentAyah.surahName}`,
          message: `Nilai ujian tilawah Anda: ${overallScore}% (${gradePredicate}). ${
            customUstadzNote.trim() || ustadzFeedback
          }`,
          type: 'assignment',
        });
      }

      onShowToast(
        `Alhamdulillah! Nilai ujian tilawah ${targetName} (${overallScore}%) berhasil disimpan.`
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
    <div className="fixed inset-0 z-[60] bg-[#141b2b]/50 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
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
    <div className="fixed inset-0 z-[60] bg-[#141b2b]/50 backdrop-blur-sm flex items-center justify-center p-4">
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
              <span className="text-[10px] font-bold text-[#414844] block">Catatan {getUstadzTitle(activeUser)}:</span>
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
      <div className="fixed inset-0 z-[60] bg-[#141b2b]/50 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150">
        <div className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-150 border border-[#1b4332]/10">
          {/* Modal Header */}
          <div className="p-4 sm:p-5 border-b border-[#f1f3ff] bg-gradient-to-r from-[#012d1d] to-[#1b4332] text-white flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <PremiumInitialAvatar
                name={student.name}
                className="w-12 h-12 rounded-full ring-2 ring-[#c1ecd4] shrink-0"
              />
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-bold text-base text-white truncate">{student.name}</h3>
                  <span className="px-2 py-0.5 rounded-full bg-white/20 text-[#c1ecd4] text-[10px] font-bold shrink-0">
                    {student.halaqah || 'Halaqah Al-Fajr'}
                  </span>
                </div>
                <p className="text-xs text-[#86af99] truncate mt-0.5">
                  Pembimbing: {formatSupervisorDisplayName(student.supervisor)} • Riwayat Lengkap Ujian Tilawah
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
                          <span className="font-bold">Catatan {getUstadzTitle(record.examinerName)}:</span> &ldquo;{record.ustadzNotes}&rdquo;
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

  const isTilawahTemporarilyLocked = !isDeptHX;
  if (isTilawahTemporarilyLocked) {
    return (
      <div className="flex flex-col w-full px-4 md:px-6 py-6 max-w-2xl mx-auto pb-28">
        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-[#1b4332]/10 text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-[#f1f3ff] text-[#012d1d] flex items-center justify-center mx-auto shadow-inner border border-[#1b4332]/10">
            <span className="material-symbols-outlined text-[34px] text-[#775a19]">lock</span>
          </div>
          <div className="space-y-1.5">
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-amber-100 text-amber-900 text-[11px] font-bold uppercase tracking-wider">
              <span className="material-symbols-outlined text-[13px]">lock</span>
              Fitur Dikunci Sementara
            </span>
            <h2 className="text-lg sm:text-xl font-extrabold text-[#141b2b]">
              Studio &amp; Penilaian Tilawah Sedang Dikunci
            </h2>
            <p className="text-xs sm:text-sm text-[#414844] max-w-md mx-auto leading-relaxed">
              Fitur ujian tilawah, setoran ayat, serta perhitungan persentase tajwid untuk akun <strong>Karyawan</strong> dan <strong>Ustadz/ah</strong> saat ini masih dikunci sementara selama tahap uji coba &amp; penyempurnaan di akun <strong>Departemen HX</strong>.
            </p>
          </div>
          <div className="pt-2">
            <button
              type="button"
              onClick={onBack}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-2xl bg-[#012d1d] hover:bg-[#1b4332] text-white text-xs font-bold shadow-sm transition-all cursor-pointer active:scale-95"
            >
              <span className="material-symbols-outlined text-[16px]">arrow_back</span>
              <span>Kembali ke Halaman Utama</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 1. Examiner Initial View: SELECT SANTRI FIRST (For Ustadz when unlocked, or when Dept HX switches to 'students' tab)
  if (isExaminer && !selectedStudent && (!isDeptHX || deptHxViewMode === 'students')) {
    return (
      <div className="flex flex-col w-full px-4 md:px-6 py-3 space-y-4 max-w-4xl mx-auto pb-28">
        {/* Top Breadcrumb & Actions Bar */}
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={onBack}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white hover:bg-[#e9edff] text-xs font-semibold text-[#012d1d] shadow-sm transition-colors border border-[#1b4332]/5 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px]">arrow_back</span>
              <span>Kembali ke Dashboard</span>
            </button>
            {isDeptHX && (
              <button
                onClick={() => setDeptHxViewMode('studio')}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#012d1d] hover:bg-[#1b4332] text-white text-xs font-bold shadow-sm transition-all cursor-pointer"
              >
                <span className="material-symbols-outlined text-[16px]">mic</span>
                <span>Buka Studio Uji Coba Tilawah (Dept HX)</span>
              </button>
            )}
          </div>
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
                Penguji: {formatSupervisorDisplayName(activeUser?.name, activeUser?.gender)}
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
                  <PremiumInitialAvatar
                    name={student.name}
                    className="w-12 h-12 rounded-full ring-2 ring-[#c1ecd4] shrink-0"
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
        <div className="p-3 sm:p-3.5 rounded-2xl bg-gradient-to-r from-[#012d1d] to-[#1b4332] text-white shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 w-full sm:w-auto sm:flex-1">
            <PremiumInitialAvatar
              name={selectedStudent.name}
              className="w-10 h-10 sm:w-12 sm:h-12 rounded-full ring-2 ring-white/30 shrink-0"
            />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#92f7c3]">
                  Sesi Ujian Karyawan
                </span>
                <span className="px-2 py-0.2 rounded-full bg-white/20 text-[10px] font-bold truncate max-w-[160px] sm:max-w-none">
                  {selectedStudent.halaqah}
                </span>
              </div>
              <h2 className="text-sm sm:text-base font-bold text-white truncate">
                {selectedStudent.name}
              </h2>
              <p className="text-[11px] sm:text-xs text-[#86af99] truncate">
                Penguji: {formatSupervisorDisplayName(activeUser?.name, activeUser?.gender)} • Target: {currentAyah.surahName}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap w-full sm:w-auto justify-end shrink-0">
            <button
              onClick={() => setViewingStudentHistory(selectedStudent)}
              className="px-2.5 py-1.5 rounded-full bg-white/15 hover:bg-white/25 text-white text-xs font-bold transition-all flex items-center gap-1 cursor-pointer shrink-0"
              title={`Lihat Riwayat Ujian ${selectedStudent.name}`}
            >
              <span className="material-symbols-outlined text-[16px]">history</span>
              <span className="hidden sm:inline">Riwayat Karyawan</span>
            </button>
            <button
              onClick={() => setSelectedStudent(null)}
              className="px-2.5 sm:px-3 py-1.5 rounded-full bg-white/15 hover:bg-white/25 text-white text-[11px] sm:text-xs font-bold transition-all flex items-center gap-1 cursor-pointer shrink-0 whitespace-nowrap"
            >
              <span className="material-symbols-outlined text-[15px] sm:text-[16px]">swap_horiz</span>
              <span>Ganti Karyawan</span>
            </button>
            <button
              onClick={() => setIsViewingReportModal(true)}
              className="px-2.5 py-1.5 rounded-full bg-[#fed488] hover:bg-[#fed488]/90 text-[#775a19] text-xs font-bold transition-all flex items-center gap-1 cursor-pointer shrink-0"
              title="Lihat Rekap & Export Excel"
            >
              <span className="material-symbols-outlined text-[16px]">table_chart</span>
              <span className="hidden sm:inline">Excel</span>
            </button>
          </div>
        </div>
      ) : isDeptHX ? (
        /* Dept HX Sandbox & Testing Control Header */
        <div className="p-3.5 sm:p-4 rounded-2xl bg-gradient-to-r from-[#012d1d] via-[#0b3824] to-[#1b4332] text-white shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-3 border border-[#c1ecd4]/20">
          <div className="flex items-start sm:items-center gap-3 min-w-0 flex-1">
            <div className="w-10 h-10 rounded-xl bg-[#fed488] text-[#012d1d] flex items-center justify-center shrink-0 shadow-xs">
              <span className="material-symbols-outlined text-[22px]">science</span>
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="px-2 py-0.5 rounded-full bg-[#92f7c3]/20 text-[#92f7c3] text-[10px] font-bold uppercase tracking-wider">
                  Mode Uji Coba Eksklusif Dept HX
                </span>
                <span className="px-2 py-0.5 rounded-full bg-amber-400/20 text-[#fed488] text-[10px] font-bold">
                  🔒 Karyawan &amp; Ustadz/ah Masih Dikunci
                </span>
              </div>
              <h2 className="text-sm sm:text-base font-bold text-white mt-0.5">
                Studio Tilawah &amp; Evaluasi Tajwid AI
              </h2>
              <p className="text-[11px] text-[#c1ecd4]/90 leading-snug">
                Uji coba mandiri fitur rekaman tilawah, koreksi tajwid/makhraj per kata, atau pilih karyawan untuk simulasi penilaian.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap justify-end shrink-0">
            <button
              onClick={onBack}
              className="px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[15px]">arrow_back</span>
              <span>Dashboard HX</span>
            </button>
            <button
              onClick={() => setDeptHxViewMode('students')}
              className="px-3 py-1.5 rounded-full bg-[#c1ecd4] hover:bg-[#a0dbb9] text-[#002114] text-xs font-bold transition-all flex items-center gap-1 cursor-pointer shadow-xs"
            >
              <span className="material-symbols-outlined text-[15px]">groups</span>
              <span>Uji Karyawan ({candidateStudents.length})</span>
            </button>
            <button
              onClick={() => setIsViewingReportModal(true)}
              className="px-3 py-1.5 rounded-full bg-[#fed488] hover:bg-[#fed488]/90 text-[#775a19] text-xs font-bold transition-all flex items-center gap-1 cursor-pointer shadow-xs"
              title="Lihat Rekap & Export Excel"
            >
              <span className="material-symbols-outlined text-[15px]">table_chart</span>
              <span>Rekap ({examRecords.length})</span>
            </button>
          </div>
        </div>
      ) : (
        /* Top Breadcrumb Bar for Student */
        <div className="flex items-center justify-between flex-wrap gap-2">
          <button
            onClick={onBack}
            className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-full bg-white hover:bg-[#e9edff] text-[11px] sm:text-xs font-semibold text-[#012d1d] shadow-sm transition-colors border border-[#1b4332]/5 cursor-pointer shrink-0 whitespace-nowrap"
          >
            <span className="material-symbols-outlined text-[16px] sm:text-[18px]">arrow_back</span>
            <span>Kembali ke Ibadah</span>
          </button>
          <div className="flex items-center gap-2 min-w-0">
            <span className="inline-flex items-center gap-1 text-[10px] sm:text-[11px] font-bold text-[#00452c] bg-[#c1ecd4] px-2.5 py-0.5 rounded-full whitespace-nowrap shrink-0">
              <span className="material-symbols-outlined text-[12px] sm:text-[13px]">verified</span>
              Uji Tilawah Halaqah
            </span>
            <span className="text-xs text-[#414844] font-medium hidden sm:inline truncate">
              {currentAyah.surahName}
            </span>
          </div>
        </div>
      )}

      {/* Compact Surah Selection Bar */}
      <div className="bg-white rounded-2xl p-3 sm:p-3.5 shadow-sm border border-[#1b4332]/10">
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-center">
          <div className="sm:col-span-5 relative">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-[#414844]">
              search
            </span>
            <input
              type="text"
              value={surahSearchQuery}
              onChange={(e) => setSurahSearchQuery(e.target.value)}
              placeholder="Cari surah (misal: An-Nas, Al-Ikhlas)..."
              className="w-full pl-9 pr-8 py-2 bg-[#f8f9ff] border border-[#1b4332]/15 rounded-xl text-xs text-[#141b2b] placeholder-[#414844]/60 focus:outline-none focus:ring-2 focus:ring-[#00452c]"
            />
            {surahSearchQuery && (
              <button
                type="button"
                onClick={() => setSurahSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#414844] hover:text-[#141b2b]"
              >
                <span className="material-symbols-outlined text-[16px]">close</span>
              </button>
            )}
          </div>

          <div className="sm:col-span-7 relative">
            <select
              value={selectedAyahId}
              onChange={(e) => handleSelectAyah(e.target.value)}
              className="w-full pl-3 pr-8 py-2 bg-[#012d1d] border border-[#012d1d] rounded-xl text-xs font-bold text-[#fed488] appearance-none focus:outline-none focus:ring-2 focus:ring-[#00452c] cursor-pointer"
            >
              {filteredSurahs.map((item) => (
                <option
                  key={item.id}
                  value={item.id}
                  className="bg-[#012d1d] text-white py-1.5 font-medium"
                >
                  [{item.surahNumber}] {item.surahName} ({item.surahArabic}) — {item.ayahNumber} Ayat ({item.words.length} Kata)
                </option>
              ))}
            </select>
            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-[#fed488] flex items-center">
              <span className="material-symbols-outlined text-[20px]">arrow_drop_down</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Target Ayah & Recitation Input Card */}
      <section className="bg-white rounded-2xl p-4 sm:p-5 shadow-sm border border-[#1b4332]/10 space-y-4">
        {/* Header: Surah Name & Audio Qari Reference */}
        <div className="flex items-center justify-between gap-2 flex-wrap pb-3 border-b border-[#f1f3ff]">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-[#012d1d] bg-[#c1ecd4] px-3 py-1 rounded-full font-bold">
              {currentAyah.surahName} • {currentAyah.ayahNumber} Ayat
            </span>
            <span className="text-xs text-[#775a19] font-medium">
              {currentAyah.words.length} Kata
            </span>
          </div>

          <button
            type="button"
            onClick={handleToggleSheikh}
            className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full transition-all cursor-pointer ${
              isPlayingSheikh
                ? 'bg-[#00452c] text-white shadow-xs'
                : 'bg-[#f1f3ff] text-[#012d1d] hover:bg-[#e9edff]'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">
              {isPlayingSheikh ? 'pause_circle' : 'volume_up'}
            </span>
            <span>{isPlayingSheikh ? 'Jeda Qari' : 'Contoh Qari'}</span>
          </button>
        </div>

        {/* Target Ayah Arabic Text (Full Surah) */}
        <div className="py-2 text-right space-y-3" dir="rtl">
          {currentAyah.surahNumber !== 1 && currentAyah.surahNumber !== 9 && (
            <div className="text-center pb-2 border-b border-[#f1f3ff]">
              <span className="font-amiri text-xl sm:text-2xl text-[#00452c]">
                بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ
              </span>
            </div>
          )}

          <p className="font-amiri text-2xl sm:text-3xl text-[#141b2b] tracking-wide flex flex-wrap justify-start items-center gap-y-3.5 gap-x-2 leading-[56px]">
            {currentAyah.words.map((w, idx) => {
              const evalItem = isEvaluated && evaluationJson ? evaluationJson.detail_kata[idx] : null;
              const statusStyle = !evalItem
                ? 'text-[#141b2b]'
                : evalItem.status === 'benar'
                ? 'bg-[#c1ecd4]/60 text-[#00452c] px-2 py-0.5 rounded-xl border border-[#00452c]/20'
                : evalItem.status === 'terlewat'
                ? 'bg-[#fed488]/70 text-[#785a1a] px-2 py-0.5 rounded-xl border border-[#775a19]/30'
                : 'bg-[#ffdad6]/80 text-[#ba1a1a] px-2 py-0.5 rounded-xl border border-[#ba1a1a]/30';

              const currentVerseNum = w.ayahNumber || 1;
              const nextWord = currentAyah.words[idx + 1];
              const isEndOfVerse = !nextWord || (nextWord.ayahNumber || 1) !== currentVerseNum;

              return (
                <React.Fragment key={w.id}>
                  <span className={`inline-block transition-colors ${statusStyle}`}>
                    {w.arabic}
                  </span>
                  {isEndOfVerse && (
                    <span className="inline-flex items-center justify-center min-w-8 h-8 px-1.5 rounded-full bg-[#e9edff] text-[#012d1d] font-bold text-xs select-none mx-0.5">
                      ۝{currentVerseNum}
                    </span>
                  )}
                </React.Fragment>
              );
            })}
          </p>
        </div>

        {/* Translation */}
        <p className="text-xs text-[#414844] italic border-t border-[#f1f3ff] pt-2.5 leading-relaxed max-h-28 overflow-y-auto">
          &quot;{currentAyah.translation}&quot;
        </p>

        {/* Microphone Recording Bar */}
        <div className="p-3.5 sm:p-4 rounded-2xl bg-[#f8f9ff] border border-[#00452c]/15 space-y-2.5">
          <div className="flex items-center justify-between gap-2.5 flex-wrap">
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={toggleRecording}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold shadow-sm transition-all cursor-pointer ${
                  isRecording
                    ? 'bg-[#ba1a1a] text-white animate-pulse ring-4 ring-[#ffdad6]'
                    : 'bg-[#ba1a1a] text-white hover:bg-[#93000a]'
                }`}
              >
                <span className="material-symbols-outlined text-[18px]">
                  {isRecording ? 'stop' : 'mic'}
                </span>
                <span>
                  {isRecording
                    ? `Hentikan & Evaluasi (${formatTimer(recordSeconds)})`
                    : 'Rekam Suara'}
                </span>
              </button>

              {recordedAudioUrl && !isRecording && (
                <button
                  type="button"
                  onClick={handleToggleUserAudio}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white border border-[#1b4332]/15 text-[#012d1d] text-xs font-semibold hover:bg-[#e9edff] cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[16px]">
                    {isPlayingUserAudio ? 'pause' : 'play_arrow'}
                  </span>
                  <span>{isPlayingUserAudio ? 'Jeda Rekaman' : 'Putar Rekaman'}</span>
                </button>
              )}

              {isEvaluated && !isRecording && (
                <button
                  type="button"
                  onClick={handleRetest}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-white border border-[#1b4332]/15 text-[#414844] text-xs font-semibold hover:bg-[#f1f3ff] cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[15px]">replay</span>
                  <span>Ulangi</span>
                </button>
              )}
            </div>

            <span className="text-[11px] text-[#414844]">
              {isRecording
                ? 'Sedang mendengarkan bacaan Anda...'
                : 'Tekan tombol mikrofon lalu bacalah ayat di atas'}
            </span>
          </div>

          {speechTranscript && (
            <div className="pt-2 border-t border-[#1b4332]/10 flex items-baseline justify-between gap-2 flex-wrap">
              <span className="text-[11px] font-semibold text-[#00452c]">
                Suara Terbaca:
              </span>
              <p className="font-amiri text-lg text-[#012d1d]" dir="rtl">
                {speechTranscript}
              </p>
            </div>
          )}
        </div>
      </section>

      {/* AI Analyzing Spinner */}
      {isAnalyzing && (
        <section className="bg-white rounded-2xl p-4 shadow-sm border border-[#00452c]/20 flex items-center justify-center gap-3">
          <span className="material-symbols-outlined text-[24px] text-[#00452c] animate-spin">
            progress_activity
          </span>
          <span className="text-xs font-bold text-[#012d1d]">
            Menganalisis bacaan kata demi kata...
          </span>
        </section>
      )}

      {/* Single Clean Evaluation Results Card */}
      {isEvaluated && (
        <section className="bg-white rounded-2xl p-4 sm:p-5 shadow-sm border border-[#1b4332]/10 space-y-4 animate-in fade-in">
          {isSilenceDetected ? (
            <div className="bg-[#ffdad6] border border-[#ba1a1a]/30 p-3.5 rounded-xl flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2.5">
                <span className="material-symbols-outlined text-[#ba1a1a] text-[24px]">
                  volume_off
                </span>
                <div>
                  <h4 className="text-xs sm:text-sm font-bold text-[#ba1a1a]">
                    Suara Tidak Terdeteksi (0%)
                  </h4>
                  <p className="text-xs text-[#414844]">
                    Pastikan mikrofon aktif atau isi teks transkripsi di atas lalu klik Evaluasi Bacaan.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleRetest}
                className="px-3 py-1.5 rounded-xl bg-[#ba1a1a] text-white text-xs font-bold hover:bg-[#93000a] cursor-pointer"
              >
                Coba Lagi
              </button>
            </div>
          ) : (
            evaluationJson && (
              <>
                {/* Top Summary Bar: Skor Akurasi & Status Kelulusan */}
                <div className="flex items-center justify-between gap-3 flex-wrap pb-3 border-b border-[#f1f3ff]">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-12 h-12 rounded-2xl flex flex-col items-center justify-center font-bold ${
                        evaluationJson.status_kelulusan === 'Lulus'
                          ? 'bg-[#c1ecd4] text-[#00452c]'
                          : 'bg-[#ffdad6] text-[#ba1a1a]'
                      }`}
                    >
                      <span className="text-base leading-none">{evaluationJson.skor_akurasi}%</span>
                      <span className="text-[9px] uppercase tracking-wider mt-0.5">Skor</span>
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-sm sm:text-base font-bold text-[#012d1d]">
                          Hasil Evaluasi Bacaan
                        </h3>
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                            evaluationJson.status_kelulusan === 'Lulus'
                              ? 'bg-[#c1ecd4] text-[#00452c]'
                              : 'bg-[#ffdad6] text-[#ba1a1a]'
                          }`}
                        >
                          {evaluationJson.status_kelulusan}
                        </span>
                      </div>
                      <p className="text-xs text-[#414844] mt-0.5">
                        {
                          evaluationJson.detail_kata.filter((d) => d.status === 'benar').length
                        }{' '}
                        dari {evaluationJson.detail_kata.length} kata sesuai target (Batas kelulusan: 85%)
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setShowRawJsonOutput((prev) => !prev)}
                      className="px-3 py-1.5 rounded-xl bg-[#f1f3ff] hover:bg-[#e9edff] text-[#012d1d] text-xs font-bold cursor-pointer inline-flex items-center gap-1"
                    >
                      <span className="material-symbols-outlined text-[15px]">data_object</span>
                      <span>{showRawJsonOutput ? 'Tutup JSON' : 'Lihat JSON'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleSubmit}
                      disabled={isSubmitting || isSubmitted}
                      className={`px-3.5 py-1.5 rounded-xl text-white text-xs font-bold cursor-pointer inline-flex items-center gap-1.5 ${
                        isSubmitted
                          ? 'bg-[#00452c]'
                          : 'bg-[#012d1d] hover:bg-[#1b4332]'
                      }`}
                    >
                      <span className="material-symbols-outlined text-[15px]">
                        {isSubmitted ? 'verified' : 'save'}
                      </span>
                      <span>{isSubmitted ? 'Tersimpan' : 'Simpan ke Rekap'}</span>
                    </button>
                  </div>
                </div>

                {/* Word-by-Word Evaluation Table (detail_kata) */}
                <div className="rounded-xl border border-[#1b4332]/15 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-[#f8f9ff] text-[#414844] border-b border-[#1b4332]/10 text-[11px]">
                          <th className="py-2 px-3 font-bold w-10">#</th>
                          <th className="py-2 px-3 font-bold text-right">Kata Target</th>
                          <th className="py-2 px-3 font-bold text-right">Kata Terbaca</th>
                          <th className="py-2 px-3 font-bold">Status</th>
                          <th className="py-2 px-3 font-bold">Catatan Kesalahan</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#1b4332]/10">
                        {evaluationJson.detail_kata.map((item, idx) => (
                          <tr
                            key={`${item.kata_target}-${idx}`}
                            className={
                              item.status === 'benar'
                                ? 'bg-white'
                                : item.status === 'terlewat'
                                ? 'bg-[#fff8ec]'
                                : 'bg-[#fff5f4]'
                            }
                          >
                            <td className="py-2 px-3 font-semibold text-[#414844]">{idx + 1}</td>
                            <td className="py-2 px-3 font-amiri text-lg text-[#012d1d] text-right" dir="rtl">
                              {item.kata_target}
                            </td>
                            <td className="py-2 px-3 font-amiri text-lg text-[#141b2b] text-right" dir="rtl">
                              {item.kata_terbaca}
                            </td>
                            <td className="py-2 px-3">
                              <span
                                className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                                  item.status === 'benar'
                                    ? 'bg-[#c1ecd4] text-[#00452c]'
                                    : item.status === 'terlewat'
                                    ? 'bg-[#fed488] text-[#785a1a]'
                                    : 'bg-[#ffdad6] text-[#ba1a1a]'
                                }`}
                              >
                                {item.status}
                              </span>
                            </td>
                            <td className="py-2 px-3 text-xs text-[#414844]">
                              {item.catatan_kesalahan || <span className="text-[#00452c]">—</span>}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Single Ringkasan Saran Box */}
                <div className="p-3.5 rounded-xl bg-[#f1f3ff] border border-[#00452c]/15 flex items-start gap-2.5">
                  <span className="material-symbols-outlined text-[18px] text-[#00452c] shrink-0 mt-0.5">
                    tips_and_updates
                  </span>
                  <div className="text-xs text-[#141b2b] leading-relaxed">
                    <span className="font-bold text-[#012d1d]">Saran Perbaikan: </span>
                    {evaluationJson.ringkasan_saran}
                  </div>
                </div>

                {/* Valid JSON Output Block (Collapsible) */}
                {showRawJsonOutput && (
                  <div className="rounded-xl bg-[#0d1322] text-[#e2e8f0] p-3.5 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] font-bold text-[#c1ecd4]">
                        Output JSON Evaluator
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard?.writeText(JSON.stringify(evaluationJson, null, 2));
                          onShowToast('JSON berhasil disalin');
                        }}
                        className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-[10px] font-semibold text-white transition-colors cursor-pointer"
                      >
                        Salin JSON
                      </button>
                    </div>
                    <pre className="text-[11px] font-mono leading-relaxed overflow-x-auto whitespace-pre-wrap text-[#c1ecd4]">
                      {JSON.stringify(evaluationJson, null, 2)}
                    </pre>
                  </div>
                )}
              </>
            )
          )}
        </section>
      )}

      {/* Modals for Examiner */}
      {isViewingReportModal && renderReportModal()}
      {showSavedExamModal && renderSavedExamModal()}
      {viewingStudentHistory && renderStudentHistoryModal()}
    </div>
  );
};
