import {
  DailyTask,
  CommunityChallenge,
  RecitationWordDiagnostic,
  LeaderboardUser,
  ReciterProfile,
  IbadahDirective,
  HalaqahAttendanceSession
} from '../types';

export const DEFAULT_HALAQAH_ROSTER: { id: string; name: string; avatar: string; halaqah: string }[] = [];

export const DEFAULT_IBADAH_DIRECTIVES: IbadahDirective[] = [];

export const BRAND_ASSETS = {
  logo: '/assets/aistudio/logo_jejak.png',
  currentUserAvatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCPpztXYvKG0hnmCFJGCCU0xwy2MPvneIXXKJ1BW4Rtejtyzgr02Vo9Su5UxcVuZz3-GF8hPwRY0_1vZl5PVdpW10j8rqRMIipsU_h8mEvEcJShkcDH86v76LYWTlWzju8eCZDjvFPYoqOVoLWKjpOXfZWK3-4DbGikcXmtwS-5rGtyiOB3ejK_8RqWALFKRcTWhwJTWUpwoH36hhTTWYZyTPHbKBimBp0b-0er8SFXjKlDEMOCN2_0Qg',
  ustadhFarhan: 'https://lh3.googleusercontent.com/aida-public/AB6AXuByNNGi_lD7Io3zG-zuX1aVUKDmzjOoc5-OcbzMeGp_VokoCj0ecHRfr2rPFeoV-YkFob6LvNNTHtptfMgKsKgthT1j38bvvTncB9crVDK12gZ75nLsO6m-Bu-El2MGndKztg11ZOCqNWZizJ9bXROCHpppamkoNS1TKKo2NsFPVYqbfcBOWFHTiykrTC70Ubm-xxgZwE9emuyiY1s3kbTQOIuH8ryqG7XWp6Ni31JxpRbEz8d69w6Pmw',
  quranManuscript: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDAXnw7zflPvZUDQqfMIJdcaYfff83cp-W8A4fYXZQQNc8JV_VNG1dNLkcZRlknG1Vt6mMx3Rb3kEZTtVOAHrYuCD11dRmpd26S0oR3qvdcmunCRs0xnOhcA5M2hnzo3fdwRUbwbvzynohK84u1XRdcWcfI6cyE9gJc4qL9XRhnf7ulUqpiYau99-Lhrg7AaqAfOS7pL2vNuBv69dQvIXv0T_n030pdcIXXQZRuZsIscE8YE7P09mKEYg',
  mapPerimeter: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBGGmdRBDdedP1N5cXJ6GatCZ2Q0V7tmfs2APQfmBUYRikDSSXcR2nOSVYldisZGkbnuMaTcIzzIFtbXtQ3X7JIgYnZyLEHBv_4q4IKmnGcmLzjH9K_EpZbFRX7_m1KnhuaaRLlJZcVfJ8KrirajMQT-i67_uEA7yyRwhseDqDL_1KLwxYFg4S3bXZ_NH4YOoAdLsYAUxlzLxhWnR2tJS8RdEC5T1AzSSA5_EaQI6ytmgnH5t_TVuGlag'
};

export const INITIAL_DAILY_TASKS: DailyTask[] = [];

export const COMMUNITY_CHALLENGES: CommunityChallenge[] = [];

export const WORD_DIAGNOSTICS: Record<string, RecitationWordDiagnostic> = {
  word1: {
    key: 'word1',
    word: 'تَبَارَكَ',
    status: 'perfect',
    tag: '98% • Sempurna',
    title: 'Pengucapan Makhraj Sempurna',
    icon: 'check_circle',
    body: 'Keluarnya huruf dari pangkal lidah (Taa, Baa, Raa tebal / Tafkhim). Kecocokan akustik AI mencapai 98% standar tartil.',
    audioHint: 'Artikulasi makhraj dan harakat sangat presisi. Pertahankan tempo ini.',
    targetMetric: 'Makharij 98%'
  },
  word2: {
    key: 'word2',
    word: 'ٱلَّذِي',
    status: 'correct',
    tag: 'Tepat & Fasih',
    title: 'Mad Thabi’i & Makhraj Dzal Halus',
    icon: 'check_circle',
    body: 'Panjang Mad Thabi’i tepat 2 harakat dengan sentuhan lembut ujung lidah pada gigi seri atas untuk huruf Dzal.',
    audioHint: 'Panjang harakat dan mad sudah benar.',
    targetMetric: 'Tajwid 95%'
  },
  word3: {
    key: 'word3',
    word: 'بِيَدِهِ',
    status: 'correct',
    tag: 'Akurat',
    title: 'Sifat Hams pada Huruf Haa',
    icon: 'check_circle',
    body: 'Aliran nafas halus (Hams) pada huruf Haa dada terdengar alami tanpa tekanan berlebihan.',
    audioHint: 'Hams terdengar jelas dan proporsional.',
    targetMetric: 'Kelancaran 94%'
  },
  word4: {
    key: 'word4',
    word: 'ٱلْمُلْكُ',
    status: 'warning',
    tag: 'Ghunnah -0.2dtk',
    title: 'Koreksi Ketukan Dengung Ghunnah',
    icon: 'schedule',
    body: 'Durasi Lam Sakinah (Izhar Qamariyah) sedikit terlalu cepat 0.2 detik sebelum beralih ke huruf Kaaf.',
    audioHint: 'Tahan aliran suara Lam sejenak agar pelafalan lebih tenang.',
    targetMetric: 'Durasi Ghunnah'
  },
  word5: {
    key: 'word5',
    word: 'وَهُوَ',
    status: 'correct',
    tag: 'Tepat',
    title: 'Pembulatan Bibir Huruf Wawu',
    icon: 'check_circle',
    body: 'Pembulatan kedua bibir (Infitah & Dhommah) pada Wawu dan Haa terbaca fasih dan menyatu.',
    audioHint: 'Peralihan harakat sangat mulus.',
    targetMetric: 'Kelancaran 96%'
  },
  word6: {
    key: 'word6',
    word: 'عَلَىٰ',
    status: 'correct',
    tag: 'Akurat',
    title: 'Panjang Alif Maqshurah',
    icon: 'check_circle',
    body: 'Makhraj huruf ‘Ain di tenggorokan tengah jelas, diiringi mad 2 harakat sempurna pada Alif Maqshurah.',
    audioHint: 'Ketepatan nada dan makhraj sangat baik.',
    targetMetric: 'Tajwid 96%'
  },
  word7: {
    key: 'word7',
    word: 'كُلِّ',
    status: 'correct',
    tag: 'Tepat',
    title: 'Penekanan Tasydid Proporsional',
    icon: 'check_circle',
    body: 'Penekanan syaddah pada huruf Lam tegas tanpa memutus aliran nafas secara kasar.',
    audioHint: 'Tekanan tasydid mantap.',
    targetMetric: 'Makharij 95%'
  },
  word8: {
    key: 'word8',
    word: 'شَيْءٍ',
    status: 'correct',
    tag: 'Ikhfa Bagus',
    title: 'Presisi Ikhfa Haqiqi Sebelum Qaf',
    icon: 'check_circle',
    body: 'Tanwin sebelum huruf Qaf tersamarkan di pangkal tenggorokan dengan dengung tebal (Tafkhim) 92%.',
    audioHint: 'Penyamaran dengung sangat rapi.',
    targetMetric: 'Ikhfa 92%'
  },
  word9: {
    key: 'word9',
    word: 'قَدِيرٌ',
    status: 'error',
    tag: 'Mad 2h vs 4h',
    title: "Panjang Mad 'Aridh Lissukun Kurang",
    icon: 'priority_high',
    body: 'Terdeteksi panjang bacaan hanya <strong class="text-[#ba1a1a] font-semibold">2 Harakat</strong>. Untuk tingkatan halaqah Anda saat waqaf akhir ayat, sempurnakan menjadi <strong class="text-[#00452c] font-semibold">4 hingga 6 Harakat</strong> sebelum berhenti.',
    audioHint: 'Tahan pemanjangan huruf Ya hingga 4 ketukan jari sebelum mengunci huruf Ra.',
    targetMetric: "Mad 'Aridh Lissukun"
  }
};

export const HALAQAH_LEADERBOARD: LeaderboardUser[] = [];

export const GLOBAL_LEADERBOARD: LeaderboardUser[] = [];

export const ALL_RECITERS_DIRECTORY: ReciterProfile[] = [];

export const ADMIN_LIVE_FEED: any[] = [];

export const NOTIFICATIONS_LIST: {
  id: string;
  title: string;
  message: string;
  time: string;
  read: boolean;
  type: string;
}[] = [];

export const DEFAULT_ATTENDANCE_SESSIONS: HalaqahAttendanceSession[] = [];
