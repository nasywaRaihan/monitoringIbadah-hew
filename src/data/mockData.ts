import {
  DailyTask,
  CommunityChallenge,
  RecitationWordDiagnostic,
  LeaderboardUser,
  ReciterProfile,
  IbadahDirective,
  StudentTaskSubmission,
  HalaqahAttendanceSession
} from '../types';

export const DEFAULT_HALAQAH_ROSTER: { id: string; name: string; avatar: string; halaqah: string }[] = [
  {
    id: 'user-zubair',
    name: 'Zubair Ahmed',
    avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDD9rhoZ_oKw2kaX_ib087jl58ZWxEyxXJe-f4-lkyam50XjJD1y4vmoJo_OP09N6wOgiWdvpNv5yr2G5JpuvLbm3TjeqXW0MHbuS6TtuFe6htOFVs18a00iBznKV3vany3LAk28L6AP7NVZ7sHf96ricgJ9NAjW7IvzR3eOOx6e1jpn11EVj5B7ar7C5WcI3CuYTneLk3RmV3-rVsJ7YE27-9cIjSlc_qil1T1R8WayBovHjw6vbVCog',
    halaqah: 'Halaqah Al-Fajr'
  },
  {
    id: 'user-zayd',
    name: 'Zayd Al-Amin',
    avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDFaQMyKnk2iLn9PRfVmgzOfoHE-e58Ab-VQMcTGdrxacm8wwW5nVi98gYcmjd_aHSNCKD0sbLlHflF6AoNGqxQ_Qheo_UDWOWgK1ivvZ9y8uvq7cdAjlrY5W6ibzXVRWlgMIxEXSbSK4NBiLsJ_1i-PslkBNixofnYzQWHbJhPmdsvZPmjWmq9Gf7Q02c1TuG4PIm9KXJKPp4IwrwHIie0wPPqYICwOCcU4f0tryN4MvTSkghJ6IZD_Q',
    halaqah: 'Halaqah Al-Fajr'
  },
  {
    id: 'user-hamza',
    name: 'Hamza Malik',
    avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDl2oh3o0y1qDHWksSoqmd8XMiZZldRTSjimhlbpgvokYxxLZf3dzPd7n29Nhetf_Olmrxo8f9PEEVJhi4uXMk4tNb7fFd_nZUOzN5Rdja-yRE3q5yF17T8TSUKJOy1bcgtuTtokarrdyNVkM2Z_9y1dzn6US_MYhabTxnbkjabBFoyfSVw_r_AWxTv7v3vkt5B9VHnhxEkJqUEqS7Pe5oQFVZO3Zo5EoaPga-DW757Niz5e4SApnpruQ',
    halaqah: 'Halaqah Al-Fajr'
  },
  {
    id: 'user-omar',
    name: 'Omar Farooq',
    avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCcAVJVBIvR2fyyLBXyaSgjvE4RI9klor1q9f3YpkDkf2KeXbl0hrWztnFRiSWcSfLTnrQkd_41qxbM1C2uyRrsHq1ir_TL4Gh-GFly3YVQqNRB7HTPQHdPaGBv7x6KCgmQhOU0q3Ae2XU0SM9lprCvHiTSyzcvD7stWgUUtTmZyRx0-ZN_QclVfCoBLY3-e8BaNX2o3RmqVh4WpflwNhtXqvDNzEuTqnRmlfSalk2ZwuxkhPfQqwygGA',
    halaqah: 'Halaqah Al-Fajr'
  },
  {
    id: 'user-bilal',
    name: 'Bilal Ar-Rasyid',
    avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCk7Ng2NYqB-E8a77cnkx5RcXAWy5V_quwhyswZscObx00whBdBV1MJfpsPuKOTMOME1dPKfDRZnGMeT6yR5PXCxFcrBhSwSHLT6ZdbBCEZFFfIHvBdsYxd4PPcQ17SZfTiyVT6qz06ZZsB6Msxk1vN_TxPOW1Tfm_DPsI00lTcglSJX2xH6uSo3GgmQAaQ12g-D5DM4h6v6mtFc-oHZWc1RLZSFmEDoSkXjH-5JwI3TRzX03Zl0UNJWg',
    halaqah: 'Halaqah Al-Fajr'
  },
  {
    id: 'user-faris',
    name: 'Faris Al-Banjari',
    avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDD5eNA6Cc-haxAb47iyA_T5sVq_esnqNS7ElzveTLKE5rxANA6DJjN84DSl41N4Vj46zDGw4UYabLdXU7nq04zEKgiSUntFivHLumiM1gofA2RwV6bR9Z_Y9NxZVSWr2jTomP_XSUAxKAX3tJPw0ZjCMqI68v5L85TLG9CMhWMPzMfCeKxpgODtb-3S8UNT5hlf-TU20-fu-pKPCnI95v9xK5yxmOIp8eoFKZpvymwvnWKqd7dz_Q9pQ',
    halaqah: 'Halaqah Al-Fajr'
  }
];

export const DEFAULT_IBADAH_DIRECTIVES: IbadahDirective[] = [
  {
    id: 'ibadah-1',
    type: 'yaumiyah',
    title: 'Shalat Fardhu 5 Waktu Berjamaah',
    target: 'Wajib di Masjid Utama / Musholla',
    xp: 100,
    compliancePercent: 83,
    status: 'Aktif',
    category: 'Shalat Wajib',
    submissions: [
      {
        studentId: 'user-zubair',
        studentName: 'Zubair Ahmed',
        studentAvatar: DEFAULT_HALAQAH_ROSTER[0].avatar,
        halaqah: 'Halaqah Al-Fajr',
        isCompleted: true,
        completedAt: 'Subuh 04:52 WIB (Presensi Sah)',
        notes: 'Shaf pertama berjamaah'
      },
      {
        studentId: 'user-zayd',
        studentName: 'Zayd Al-Amin',
        studentAvatar: DEFAULT_HALAQAH_ROSTER[1].avatar,
        halaqah: 'Halaqah Al-Fajr',
        isCompleted: true,
        completedAt: 'Subuh 04:50 WIB (Presensi Sah)',
        notes: 'Tepat waktu & muadzin cadangan'
      },
      {
        studentId: 'user-omar',
        studentName: 'Omar Farooq',
        studentAvatar: DEFAULT_HALAQAH_ROSTER[3].avatar,
        halaqah: 'Halaqah Al-Fajr',
        isCompleted: true,
        completedAt: 'Subuh 04:55 WIB (Presensi Sah)',
        notes: 'Berjamaah tepat waktu'
      },
      {
        studentId: 'user-bilal',
        studentName: 'Bilal Ar-Rasyid',
        studentAvatar: DEFAULT_HALAQAH_ROSTER[4].avatar,
        halaqah: 'Halaqah Al-Fajr',
        isCompleted: true,
        completedAt: 'Subuh 04:58 WIB (Musholla Asrama)',
        notes: 'Berjamaah di musholla asrama'
      },
      {
        studentId: 'user-faris',
        studentName: 'Faris Al-Banjari',
        studentAvatar: DEFAULT_HALAQAH_ROSTER[5].avatar,
        halaqah: 'Halaqah Al-Fajr',
        isCompleted: true,
        completedAt: 'Subuh 05:00 WIB (Presensi Sah)',
        notes: 'Berjamaah tepat waktu'
      },
      {
        studentId: 'user-hamza',
        studentName: 'Hamza Malik',
        studentAvatar: DEFAULT_HALAQAH_ROSTER[2].avatar,
        halaqah: 'Halaqah Al-Fajr',
        isCompleted: false,
        notes: 'Belum lapor mutaba\'ah Subuh'
      }
    ]
  }
];


export const BRAND_ASSETS = {
  logo: 'https://lh3.googleusercontent.com/aida/AEtjO1UConMQyHWMW8sCCyxUucC2vWnG9-YL2u0OJZwf-th1M6RMbDpQbBWvbT8DVsiUBWUkHquhGzQvso0n6wI4yIrn-e-XCz77Lpsl89cbteos9eqH5e6rYNWU3SgLZi_FIhBLFtj-gIw2pQXzim1jl9im4iqNmcmvJu21nl_edZRtiCSznrt4aycFHBPuEA8k5CPyIxzEcKw8RXF_7FVIYiJ15cCTAkzWKH1bD1Akdq6_ASVEU4CB5v0nRM4',
  currentUserAvatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCPpztXYvKG0hnmCFJGCCU0xwy2MPvneIXXKJ1BW4Rtejtyzgr02Vo9Su5UxcVuZz3-GF8hPwRY0_1vZl5PVdpW10j8rqRMIipsU_h8mEvEcJShkcDH86v76LYWTlWzju8eCZDjvFPYoqOVoLWKjpOXfZWK3-4DbGikcXmtwS-5rGtyiOB3ejK_8RqWALFKRcTWhwJTWUpwoH36hhTTWYZyTPHbKBimBp0b-0er8SFXjKlDEMOCN2_0Qg',
  ustadhFarhan: 'https://lh3.googleusercontent.com/aida-public/AB6AXuByNNGi_lD7Io3zG-zuX1aVUKDmzjOoc5-OcbzMeGp_VokoCj0ecHRfr2rPFeoV-YkFob6LvNNTHtptfMgKsKgthT1j38bvvTncB9crVDK12gZ75nLsO6m-Bu-El2MGndKztg11ZOCqNWZizJ9bXROCHpppamkoNS1TKKo2NsFPVYqbfcBOWFHTiykrTC70Ubm-xxgZwE9emuyiY1s3kbTQOIuH8ryqG7XWp6Ni31JxpRbEz8d69w6Pmw',
  quranManuscript: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDAXnw7zflPvZUDQqfMIJdcaYfff83cp-W8A4fYXZQQNc8JV_VNG1dNLkcZRlknG1Vt6mMx3Rb3kEZTtVOAHrYuCD11dRmpd26S0oR3qvdcmunCRs0xnOhcA5M2hnzo3fdwRUbwbvzynohK84u1XRdcWcfI6cyE9gJc4qL9XRhnf7ulUqpiYau99-Lhrg7AaqAfOS7pL2vNuBv69dQvIXv0T_n030pdcIXXQZRuZsIscE8YE7P09mKEYg',
  mapPerimeter: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBGGmdRBDdedP1N5cXJ6GatCZ2Q0V7tmfs2APQfmBUYRikDSSXcR2nOSVYldisZGkbnuMaTcIzzIFtbXtQ3X7JIgYnZyLEHBv_4q4IKmnGcmLzjH9K_EpZbFRX7_m1KnhuaaRLlJZcVfJ8KrirajMQT-i67_uEA7yyRwhseDqDL_1KLwxYFg4S3bXZ_NH4YOoAdLsYAUxlzLxhWnR2tJS8RdEC5T1AzSSA5_EaQI6ytmgnH5t_TVuGlag'
};

export const INITIAL_DAILY_TASKS: DailyTask[] = [
  {
    id: 'task-1',
    title: 'Shalat Subuh Berjamaah',
    category: 'Presensi Shalat Berjamaah',
    xp: 100,
    completed: true,
    isVerified: true
  },
  {
    id: 'task-2',
    title: "Dzikir Pagi Al-Ma'tsurat",
    category: 'Amalan Pribadi Rutin',
    xp: 30,
    completed: true,
    prayerId: 'dzikir-pagi'
  },
  {
    id: 'task-3',
    title: 'Ujian Tilawah Surah Al-Mulk',
    category: 'Ayat 1-10 • Uji Tajwid & Setoran Hifdz',
    xp: 120,
    completed: false,
    isAssigned: true,
    verses: '1-10'
  }
];

export const COMMUNITY_CHALLENGES: CommunityChallenge[] = [
  {
    id: 'chal-2',
    title: 'Tantangan Qiyamul Lail / Tahajjud',
    author: 'Kolektif Halaqah Al-Fajr',
    authorAvatar: '',
    progressPercent: 57,
    subtitle: '4 malam berturut-turut terselesaikan 🔥',
    actionText: 'Catat Kehadiran'
  }
];

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

export const HALAQAH_LEADERBOARD: LeaderboardUser[] = [
  {
    rank: 1,
    name: 'Tariq Mansoor',
    xp: 2850,
    tajweedAcc: 98,
    streak: 28,
    avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBk9LWZ-0dEg9IaUBzxXTxLUfqZoGy8Q_Gyq5eDi0id422l1gTQRXmu7w2IRUuHKnuIIKDQfz0IqBGjhZolSIVvibJWwQh9isFTPI1q30Rtimj2C28zuAiMh9aejCr8Mrm22bx69cIaYiDngzNd-7HRJwZMIdc1HT_JjbH1nfrbjhcqmM4hG6bGivGECaOerT1I6Qr9T25Ia-I4lI1Bm2PPZWQ4GhNd14lU0olP2lEoLJjkI3TVKVwjYg',
    roleOrCircle: 'Lingkaran Hafiz',
    badge: 'Mumtaz'
  },
  {
    rank: 2,
    name: 'Zayd Al-Amin',
    xp: 2410,
    tajweedAcc: 96,
    streak: 12,
    avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDFaQMyKnk2iLn9PRfVmgzOfoHE-e58Ab-VQMcTGdrxacm8wwW5nVi98gYcmjd_aHSNCKD0sbLlHflF6AoNGqxQ_Qheo_UDWOWgK1ivvZ9y8uvq7cdAjlrY5W6ibzXVRWlgMIxEXSbSK4NBiLsJ_1i-PslkBNixofnYzQWHbJhPmdsvZPmjWmq9Gf7Q02c1TuG4PIm9KXJKPp4IwrwHIie0wPPqYICwOCcU4f0tryN4MvTSkghJ6IZD_Q',
    roleOrCircle: 'Halaqah Al-Fajr',
    badge: 'Jayyid Jiddan'
  },
  {
    rank: 3,
    name: 'Bilal Kareem',
    xp: 2180,
    tajweedAcc: 93,
    streak: 5,
    avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDnFoMagLqqmSNjNYEANFOH4M8kwlAzN0a2jOL9MjmFLHT-2YXwQ-926XaHXKQHACoeY1PzlqbgsHc1qg1ED_d1qS9ylheKXHkFOm3yFHJhJShgoMaivpA8tTv614np7Cw5fh_lLTaVm24ZOJ_W6kd-rdp4ZouYXhxWQmgmOSgukYsYMPmKn1NFqp1nLXOz4G3TO3Ejptv1Grd2xEu5b-ipFoGM7rJhQhyWV14NaZHptPX8sXfAM5W9wA',
    roleOrCircle: 'Liga Remaja Tajwid',
    badge: 'Terverifikasi'
  },
  {
    rank: 4,
    name: 'Zubair Ahmed',
    xp: 1940,
    tajweedAcc: 94,
    streak: 7,
    avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDD9rhoZ_oKw2kaX_ib087jl58ZWxEyxXJe-f4-lkyam50XjJD1y4vmoJo_OP09N6wOgiWdvpNv5yr2G5JpuvLbm3TjeqXW0MHbuS6TtuFe6htOFVs18a00iBznKV3vany3LAk28L6AP7NVZ7sHf96ricgJ9NAjW7IvzR3eOOx6e1jpn11EVj5B7ar7C5WcI3CuYTneLk3RmV3-rVsJ7YE27-9cIjSlc_qil1T1R8WayBovHjw6vbVCog',
    isCurrentUser: true,
    todayGain: '+180 XP Hari Ini'
  },
  {
    rank: 5,
    name: 'Hamza Al-Ghamdi',
    xp: 1820,
    tajweedAcc: 95,
    streak: 11,
    avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuB2YNn3chwgvghi6bKAIGsEzSZIzx99nw2u8pS2HThk7F2THKw9y_ZhJ73dPHqsFS5__dExkPODyFeOt9GlkDytTjgroH4QSsM-9u4UY7NyIckRf-mt5ODfKBkVhZrAJAMEE_ch6sgUPNZPoQiwyPK8UrO9txsSCxA5ef_AS0q7wtGhzwvUAqX63PHPh3ZYRGVzAEi4MbythULEXgVF332iusFnFVQWQj-P7H_7YG-MLqFDxNZDHqiXgA'
  },
  {
    rank: 6,
    name: 'Dr. Omar Siddiqui',
    xp: 1750,
    tajweedAcc: 92,
    streak: 9,
    avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuC4PTvyt7-_5JmT_ZnOQdWxtCuYIdE--3_gxAqVzj0NOc7N6_bqcvR21UCMvLTCzQdSoO3QZCtryytN_R4zYIe6ouKr5cB3cssSdChFRePHKZSDaaXn_S08wLQV7Ax_gzj8D0vcg7rup-E9Mk7skIWgMoRtxrosUMDFBDS8RdcWpECxK8hYWjqTigBKC8yPkVSNQ_WhGKTJSLp1f9CZkzeWwWQhOjjjSz-kX7pqCPtyJkxmXIvjT6NrGg'
  },
  {
    rank: 7,
    name: 'Ibrahim Qureshi',
    xp: 1610,
    tajweedAcc: 91,
    streak: 6,
    avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAwgfRenieAlLRgHUPBwuuS-VTNTWIvwIb8DzHtL_B5CLE3pAvEuRHzWp-wAjL3DfFpwMDNIdV7pJVzgLweGWHQiDvVtrlBkgNA3Qc5hwsd94xQeucsbYmxOcjLbapMBO3loC4DIM60u4t4xLR_dRLbM7l-107koAC54gjokfg5zXjyvGelfNRPldGZAwEIK_jsLYyImLvfKchPKQQSD1lZuSfL5CLgdvxbPEVheGbvjpOSflgx7GT8Cw'
  },
  {
    rank: 8,
    name: 'Luqman Faris',
    xp: 1490,
    tajweedAcc: 89,
    streak: 4,
    avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDD5eNA6Cc-haxAb47iyA_T5sVq_esnqNS7ElzveTLKE5rxANA6DJjN84DSl41N4Vj46zDGw4UYabLdXU7nq04zEKgiSUntFivHLumiM1gofA2RwV6bR9Z_Y9NxZVSWr2jTomP_XSUAxKAX3tJPw0ZjCMqI68v5L85TLG9CMhWMPzMfCeKxpgODtb-3S8UNT5hlf-TU20-fu-pKPCnI95v9xK5yxmOIp8eoFKZpvymwvnWKqd7dz_Q9pQ'
  }
];

export const GLOBAL_LEADERBOARD: LeaderboardUser[] = [
  {
    rank: 1,
    name: 'Maryam Al-Zahra',
    xp: 4120,
    tajweedAcc: 99.1,
    streak: 45,
    avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCMxQ7RtfswlRDYQ98MNcACZgs5-Ey1ncw_eeWPAS-5xbw7LyeNkwVJdWS8pf-pTtCJzdoDuK6jwkptscXQQaCiDIoUM3wKhNq_KdEN_S0hBuya6DSojTu2Md0dls9Jh6UyMiq_0wxuNwbOjLNs7OihXe2bUOu_0a4ae5MsUXk8Cq8U6lxDxltUzGw1oqdpI-dDU4DbyQ6WJ9V2VyTX032uTLdAIL2IQZhBZLgbGIk2-6fD18tsA3nxcQ',
    roleOrCircle: "Halaqah Akhwat • Kairo",
    badge: 'Top 1%'
  },
  {
    rank: 2,
    name: 'Tariq Mansoor',
    xp: 3850,
    tajweedAcc: 98.2,
    streak: 28,
    avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBk9LWZ-0dEg9IaUBzxXTxLUfqZoGy8Q_Gyq5eDi0id422l1gTQRXmu7w2IRUuHKnuIIKDQfz0IqBGjhZolSIVvibJWwQh9isFTPI1q30Rtimj2C28zuAiMh9aejCr8Mrm22bx69cIaYiDngzNd-7HRJwZMIdc1HT_JjbH1nfrbjhcqmM4hG6bGivGECaOerT1I6Qr9T25Ia-I4lI1Bm2PPZWQ4GhNd14lU0olP2lEoLJjkI3TVKVwjYg',
    roleOrCircle: 'Lingkaran Hafiz • Istanbul',
    badge: 'Mumtaz'
  },
  {
    rank: 3,
    name: 'Suhayb Ar-Rumi',
    xp: 3410,
    tajweedAcc: 97.4,
    streak: 33,
    avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDFaQMyKnk2iLn9PRfVmgzOfoHE-e58Ab-VQMcTGdrxacm8wwW5nVi98gYcmjd_aHSNCKD0sbLlHflF6AoNGqxQ_Qheo_UDWOWgK1ivvZ9y8uvq7cdAjlrY5W6ibzXVRWlgMIxEXSbSK4NBiLsJ_1i-PslkBNixofnYzQWHbJhPmdsvZPmjWmq9Gf7Q02c1TuG4PIm9KXJKPp4IwrwHIie0wPPqYICwOCcU4f0tryN4MvTSkghJ6IZD_Q',
    roleOrCircle: 'Halaqah Madinah Munawwarah',
    badge: 'Mumtaz'
  },
  {
    rank: 14,
    name: 'Zubair Ahmed',
    xp: 1940,
    tajweedAcc: 94,
    streak: 7,
    avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDD9rhoZ_oKw2kaX_ib087jl58ZWxEyxXJe-f4-lkyam50XjJD1y4vmoJo_OP09N6wOgiWdvpNv5yr2G5JpuvLbm3TjeqXW0MHbuS6TtuFe6htOFVs18a00iBznKV3vany3LAk28L6AP7NVZ7sHf96ricgJ9NAjW7IvzR3eOOx6e1jpn11EVj5B7ar7C5WcI3CuYTneLk3RmV3-rVsJ7YE27-9cIjSlc_qil1T1R8WayBovHjw6vbVCog',
    isCurrentUser: true,
    todayGain: '+180 XP Hari Ini'
  }
];

export const ALL_RECITERS_DIRECTORY: ReciterProfile[] = [
  {
    id: 'reciter-1',
    name: 'Tariq Mansoor',
    group: 'Hafiz Circle',
    supervisor: 'Masjid Pusat',
    avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDxUvy8dcUkArsPUzlK3EWJ7-YZwvRO6i1pNvZP2V-XXhY9QAXkX9ctclshGt0vXgy5oOSBhulpHshdKxzXlOAXqseZKYrM7t_AS-ThOPy5j_qTaaUDnC5-pwFGK0HlFNOiCOSUc9GQ6Jp1F3XXZ8L4mCvLPaMcGhuQjQF3nVlHKE0i1t1ZWzLoUl7YE6xDzelCltHIFN8xEO8CqxQB-Oimx_QaBtJdna2fI6ltmN_i6OynIgF-0VRrug',
    status: 'Mumtaz',
    isLive: true,
    tajweedAcc: 98.2,
    streakDays: 28,
    totalXp: '14.2k',
    currentActivity: 'Membaca Surah An-Nur (Ayat 35)',
    lastActive: 'Sedang Mengaji'
  },
  {
    id: 'reciter-2',
    name: 'Maryam Al-Zahra',
    group: "Halaqah Akhwat",
    supervisor: 'Daring Global',
    avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCMxQ7RtfswlRDYQ98MNcACZgs5-Ey1ncw_eeWPAS-5xbw7LyeNkwVJdWS8pf-pTtCJzdoDuK6jwkptscXQQaCiDIoUM3wKhNq_KdEN_S0hBuya6DSojTu2Md0dls9Jh6UyMiq_0wxuNwbOjLNs7OihXe2bUOu_0a4ae5MsUXk8Cq8U6lxDxltUzGw1oqdpI-dDU4DbyQ6WJ9V2VyTX032uTLdAIL2IQZhBZLgbGIk2-6fD18tsA3nxcQ',
    status: 'Top 1%',
    tajweedAcc: 99.1,
    streakDays: 45,
    totalXp: '21.3k',
    currentActivity: 'Kandidat Hafizhah • Tuntas Surah Maryam',
    lastActive: '5 mnt lalu'
  },
  {
    id: 'reciter-3',
    name: 'Hamza Malik',
    group: 'Halaqah Al-Fajr',
    supervisor: 'Syaikh Omar',
    avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDl2oh3o0y1qDHWksSoqmd8XMiZZldRTSjimhlbpgvokYxxLZf3dzPd7n29Nhetf_Olmrxo8f9PEEVJhi4uXMk4tNb7fFd_nZUOzN5Rdja-yRE3q5yF17T8TSUKJOy1bcgtuTtokarrdyNVkM2Z_9y1dzn6US_MYhabTxnbkjabBFoyfSVw_r_AWxTv7v3vkt5B9VHnhxEkJqUEqS7Pe5oQFVZO3Zo5EoaPga-DW757Niz5e4SApnpruQ',
    status: 'Review Needed',
    isFlagged: true,
    flagMessage: "3 Catatan Fonetik pada Ayat 14 (Qalqalah terlewat pada huruf 'ق')",
    tajweedAcc: 84.5,
    streakDays: 3,
    totalXp: '2.1k',
    currentActivity: 'Setoran Surah Al-Mulk: Perlu bimbingan Ustadz',
    lastActive: '42 mnt lalu'
  },
  {
    id: 'reciter-4',
    name: 'Zayd Al-Amin',
    group: 'Halaqah Al-Fajr',
    supervisor: 'Syaikh Omar',
    avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAL8eyZ8tnKQ_pNL9nhrbu1ZrjoYNAjCOhMK5SE5d4mXRd3UfyHkHCPJgj_EcHF2yjzDVTuzZBpcFAnKNY7rCAhlBYvwXCquVJodKYbzYgjZtisHS_hqLM9GoUB9jVhekcw2jGEXKve9Qx2hlLIFHbaQiuHrknZElLeHp_d6DggLVy2-Q4Qm_pBPNnWGgeKdBLuVaEBC_k8dpga9lqdryg65Y55aM3Wl9yZJtnVHHXip-_Dd2Rikf81sQ',
    status: 'Jayyid Jiddan',
    tajweedAcc: 96.0,
    streakDays: 12,
    totalXp: '8.4k',
    currentActivity: 'Surah Al-Mulk (Ayat 1–30 tuntas)',
    lastActive: '14 mnt lalu'
  },
  {
    id: 'reciter-5',
    name: 'Bilal Kareem',
    group: 'Youth Tajweed',
    supervisor: 'Masjid Al-Ikhlas',
    avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCk7Ng2NYqB-E8a77cnkx5RcXAWy5V_quwhyswZscObx00whBdBV1MJfpsPuKOTMOME1dPKfDRZnGMeT6yR5PXCxFcrBhSwSHLT6ZdbBCEZFFfIHvBdsYxd4PPcQ17SZfTiyVT6qz06ZZsB6Msxk1vN_TxPOW1Tfm_DPsI00lTcglSJX2xH6uSo3GgmQAaQ12g-D5DM4h6v6mtFc-oHZWc1RLZSFmEDoSkXjH-5JwI3TRzX03Zl0UNJWg',
    status: 'Youth League',
    tajweedAcc: 91.5,
    streakDays: 5,
    totalXp: '4.1k',
    currentActivity: 'Muraja’ah Juz ‘Amma • Lulus Surah An-Naba',
    lastActive: '2 jam lalu'
  }
];

export const ADMIN_LIVE_FEED = [
  {
    id: 'feed-1',
    studentName: 'Zayd Al-Amin',
    avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuD3LKdxhYg8BNEQzBtO7-b69TyQyy8OIiP_PRWsoT56RQ_QHYlNwZF1rDFkjPd1zcb48CvNx5hPLNDa3R1XEYQctYvxrQp_L1ObT3s9cnfwbWWPVf7OuABgUAqCzLXR6Cytv0u2YYs6Eqt5YhrklePutAmVxZRHOy_M_4oc_rfpSggEz3aw_HNQcxWNmh-52btP2oOILbtzKEFtRzeb7dNbjgc8NUeHnlM8uuy2yrNSmK5vIXjV3YYOlA',
    badge: 'Skor 96% Mumtaz',
    badgeType: 'success',
    timeAgo: '4 mnt lalu',
    detail: 'Surah Al-Mulk (Ayat 1–10) • 0 kesalahan',
    audioDuration: '01:42 Terverifikasi AI',
    hasAudio: true
  },
  {
    id: 'feed-2',
    studentName: 'Omar Farooq',
    avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCcAVJVBIvR2fyyLBXyaSgjvE4RI9klor1q9f3YpkDkf2KeXbl0hrWztnFRiSWcSfLTnrQkd_41qxbM1C2uyRrsHq1ir_TL4Gh-GFly3YVQqNRB7HTPQHdPaGBv7x6KCgmQhOU0q3Ae2XU0SM9lprCvHiTSyzcvD7stWgUUtTmZyRx0-ZN_QclVfCoBLY3-e8BaNX2o3RmqVh4WpflwNhtXqvDNzEuTqnRmlfSalk2ZwuxkhPfQqwygGA',
    badge: "Subuh Berjamaah",
    badgeType: 'primary',
    timeAgo: '18 mnt lalu',
    detail: 'Masjid Al-Ikhlas',
    subdetail: 'Presensi Terkonfirmasi • Tepat Waktu'
  },
  {
    id: 'feed-3',
    studentName: 'Hamza Malik',
    avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAQke-xiy7Lx9paHtysR_J9UEc_wsTYLsuzfNN4Ff5mMM66C80LrpSbmZ3xFCbntnqUK_dGmkID-1rE6UegUdK0oW9Tyuck4ygHF8JSx6VgdOiFm-TjY8tABKVivrR6lDrbirRShlSSiRL28i1MUbinFq-vgQFIFq-ctT5at4eIZMBvET9WZGqOw6D1XiSed0gRoPK9LdHGOCD_EsF_Qckwv9tip7oC-oBi7qpqiWhicxO3_0BbW4SiDA',
    badge: 'Perlu Bimbingan',
    badgeType: 'error',
    timeAgo: '42 mnt lalu',
    detail: 'Surah Yasin • 3 catatan fonetik terdeteksi',
    flaggedAyah: 'Catatan Ustadz: Ayat 12, 14 (Qalqalah Kubra)',
    needsReview: true
  }
];

export const NOTIFICATIONS_LIST = [
  {
    id: 'notif-1',
    title: 'Kehadiran Berjamaah Terverifikasi',
    message: 'Shalat berjamaah tercatat di sistem halaqah. Bonus +50 XP siap diklaim!',
    time: '8 menit lalu',
    read: false,
    type: 'worship'
  },
  {
    id: 'notif-2',
    title: 'Jadwal Setoran Tilawah Siap',
    message: "Ustadz Farhan telah menugaskan Surah Al-Mulk (Ayat 1-10) untuk evaluasi halaqah hari ini.",
    time: '2 jam lalu',
    read: false,
    type: 'assignment'
  },
  {
    id: 'notif-3',
    title: 'Pencapaian Runtutan Ibadah Terbuka 🔥',
    message: 'MashaAllah! Anda mencapai 7 hari beruntun shalat Subuh berjamaah tanpa terputus.',
    time: 'Kemarin',
    read: true,
    type: 'milestone'
  }
];

export const DEFAULT_ATTENDANCE_SESSIONS: HalaqahAttendanceSession[] = [
  {
    id: 'att-session-1',
    halaqahName: 'Halaqah Al-Fajr',
    halaqahCode: 'HF-4092',
    date: '2026-11-04',
    timeStr: '05:30 WIB',
    sessionTitle: 'Halaqah Ba\'da Subuh: Tahsin & Tajwid Al-Mulk',
    location: 'Masjid Al-Ikhlas (Ruang Halaqah Utama)',
    ustadzId: 'user-farhan',
    ustadzName: 'Ustadz Farhan',
    ustadzAvatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuByNNGi_lD7Io3zG-zuX1aVUKDmzjOoc5-OcbzMeGp_VokoCj0ecHRfr2rPFeoV-YkFob6LvNNTHtptfMgKsKgthT1j38bvvTncB9crVDK12gZ75nLsO6m-Bu-El2MGndKztg11ZOCqNWZizJ9bXROCHpppamkoNS1TKKo2NsFPVYqbfcBOWFHTiykrTC70Ubm-xxgZwE9emuyiY1s3kbTQOIuH8ryqG7XWp6Ni31JxpRbEz8d69w6Pmw',
    ustadzStatus: 'hadir',
    ustadzNotes: 'Membahas kaidah ghunnah dan makharijul huruf pada Surah Al-Mulk ayat 1-10. Seluruh anggota bersemangat.',
    ustadzConfirmedAt: '2026-11-04T05:35:00.000Z',
    members: [
      {
        userId: 'user-zubair',
        userName: 'Zubair Ahmed',
        userAvatar: DEFAULT_HALAQAH_ROSTER[0].avatar,
        status: 'hadir',
        notes: 'Hadir tepat waktu di shaf depan',
        markedAt: '05:28 WIB',
        xpAwarded: 15
      },
      {
        userId: 'user-zayd',
        userName: 'Zayd Al-Amin',
        userAvatar: DEFAULT_HALAQAH_ROSTER[1].avatar,
        status: 'hadir',
        notes: 'Hadir dan memimpin tilawah pembuka',
        markedAt: '05:25 WIB',
        xpAwarded: 15
      },
      {
        userId: 'user-omar',
        userName: 'Omar Farooq',
        userAvatar: DEFAULT_HALAQAH_ROSTER[3].avatar,
        status: 'hadir',
        notes: 'Hadir tepat waktu',
        markedAt: '05:30 WIB',
        xpAwarded: 15
      },
      {
        userId: 'user-bilal',
        userName: 'Bilal Ar-Rasyid',
        userAvatar: DEFAULT_HALAQAH_ROSTER[4].avatar,
        status: 'hadir',
        notes: 'Hadir tepat waktu',
        markedAt: '05:29 WIB',
        xpAwarded: 15
      },
      {
        userId: 'user-faris',
        userName: 'Faris Al-Banjari',
        userAvatar: DEFAULT_HALAQAH_ROSTER[5].avatar,
        status: 'hadir',
        notes: 'Hadir tepat waktu',
        markedAt: '05:32 WIB',
        xpAwarded: 15
      },
      {
        userId: 'user-hamza',
        userName: 'Hamza Malik',
        userAvatar: DEFAULT_HALAQAH_ROSTER[2].avatar,
        status: 'izin',
        notes: 'Izin dinas luar kantor pagi ini',
        markedAt: '05:15 WIB',
        xpAwarded: 0
      }
    ],
    totalMembers: 6,
    presentCount: 5,
    attendanceRate: 83,
    createdAt: '2026-11-04T05:35:00.000Z',
    syncedWithHX: true
  },
  {
    id: 'att-session-2',
    halaqahName: 'Hafiz Circle',
    halaqahCode: 'HC-1001',
    date: '2026-11-03',
    timeStr: '16:00 WIB',
    sessionTitle: 'Muraja\'ah Hifdzil Quran Pekanan',
    location: 'Masjid Pusat (Baitul Quran)',
    ustadzId: 'user-tariq',
    ustadzName: 'Tariq Mansoor',
    ustadzAvatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDxUvy8dcUkArsPUzlK3EWJ7-YZwvRO6i1pNvZP2V-XXhY9QAXkX9ctclshGt0vXgy5oOSBhulpHshdKxzXlOAXqseZKYrM7t_AS-ThOPy5j_qTaaUDnC5-pwFGK0HlFNOiCOSUc9GQ6Jp1F3XXZ8L4mCvLPaMcGhuQjQF3nVlHKE0i1t1ZWzLoUl7YE6xDzelCltHIFN8xEO8CqxQB-Oimx_QaBtJdna2fI6ltmN_i6OynIgF-0VRrug',
    ustadzStatus: 'hadir',
    ustadzNotes: 'Penyetoran hafalan Juz 29 tuntas lancar.',
    ustadzConfirmedAt: '2026-11-03T16:05:00.000Z',
    members: [
      {
        userId: 'user-reciter-1',
        userName: 'Tariq Mansoor',
        status: 'hadir',
        xpAwarded: 15
      },
      {
        userId: 'user-reciter-4',
        userName: 'Zayd Al-Amin',
        status: 'hadir',
        xpAwarded: 15
      }
    ],
    totalMembers: 2,
    presentCount: 2,
    attendanceRate: 100,
    createdAt: '2026-11-03T16:05:00.000Z',
    syncedWithHX: true
  }
];

