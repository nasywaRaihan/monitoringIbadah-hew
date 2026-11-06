import React, { useState, useEffect, useMemo } from 'react';
import { collection, onSnapshot, query, orderBy, limit } from 'firebase/firestore';
import { db } from '../services/firebase';
import { LeaderboardUser, ActiveUser } from '../types';
import { DEFAULT_BASE_HALAQAHS, HalaqahDetail } from './HQAdminScreen';

interface LeaderboardScreenProps {
  userXp: number;
  userStreak: number;
  onShowToast: (msg: string) => void;
  activeUser?: ActiveUser;
  onOpenAuth?: () => void;
  registeredUsers?: ActiveUser[];
}

// Baseline mock employee roster so each halaqah has realistic, active members with XP
const BASE_EMPLOYEES_ROSTER: ActiveUser[] = [
  // Halaqah Al-Fajr
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
    supervisor: 'Ustadz Farhan'
  },
  {
    id: 'user-zubair',
    name: 'Zubair Ahmed',
    halaqah: 'Halaqah Al-Fajr',
    halaqahCode: 'HF-4092',
    passcode: '1234',
    avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDD9rhoZ_oKw2kaX_ib087jl58ZWxEyxXJe-f4-lkyam50XjJD1y4vmoJo_OP09N6wOgiWdvpNv5yr2G5JpuvLbm3TjeqXW0MHbuS6TtuFe6htOFVs18a00iBznKV3vany3LAk28L6AP7NVZ7sHf96ricgJ9NAjW7IvzR3eOOx6e1jpn11EVj5B7ar7C5WcI3CuYTneLk3RmV3-rVsJ7YE27-9cIjSlc_qil1T1R8WayBovHjw6vbVCog',
    role: 'member',
    totalXp: 1940,
    streakDays: 7,
    supervisor: 'Ustadz Farhan'
  },
  {
    id: 'user-hamza-malik',
    name: 'Hamza Malik',
    halaqah: 'Halaqah Al-Fajr',
    halaqahCode: 'HF-4092',
    passcode: '1234',
    avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDl2oh3o0y1qDHWksSoqmd8XMiZZldRTSjimhlbpgvokYxxLZf3dzPd7n29Nhetf_Olmrxo8f9PEEVJhi4uXMk4tNb7fFd_nZUOzN5Rdja-yRE3q5yF17T8TSUKJOy1bcgtuTtokarrdyNVkM2Z_9y1dzn6US_MYhabTxnbkjabBFoyfSVw_r_AWxTv7v3vkt5B9VHnhxEkJqUEqS7Pe5oQFVZO3Zo5EoaPga-DW757Niz5e4SApnpruQ',
    role: 'member',
    totalXp: 1820,
    streakDays: 11,
    supervisor: 'Ustadz Farhan'
  },
  {
    id: 'user-omar-farooq',
    name: 'Omar Farooq',
    halaqah: 'Halaqah Al-Fajr',
    halaqahCode: 'HF-4092',
    passcode: '1234',
    avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCcAVJVBIvR2fyyLBXyaSgjvE4RI9klor1q9f3YpkDkf2KeXbl0hrWztnFRiSWcSfLTnrQkd_41qxbM1C2uyRrsHq1ir_TL4Gh-GFly3YVQqNRB7HTPQHdPaGBv7x6KCgmQhOU0q3Ae2XU0SM9lprCvHiTSyzcvD7stWgUUtTmZyRx0-ZN_QclVfCoBLY3-e8BaNX2o3RmqVh4WpflwNhtXqvDNzEuTqnRmlfSalk2ZwuxkhPfQqwygGA',
    role: 'member',
    totalXp: 1650,
    streakDays: 9,
    supervisor: 'Ustadz Farhan'
  },
  {
    id: 'user-bilal-rasyid',
    name: 'Bilal Ar-Rasyid',
    halaqah: 'Halaqah Al-Fajr',
    halaqahCode: 'HF-4092',
    passcode: '1234',
    avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCk7Ng2NYqB-E8a77cnkx5RcXAWy5V_quwhyswZscObx00whBdBV1MJfpsPuKOTMOME1dPKfDRZnGMeT6yR5PXCxFcrBhSwSHLT6ZdbBCEZFFfIHvBdsYxd4PPcQ17SZfTiyVT6qz06ZZsB6Msxk1vN_TxPOW1Tfm_DPsI00lTcglSJX2xH6uSo3GgmQAaQ12g-D5DM4h6v6mtFc-oHZWc1RLZSFmEDoSkXjH-5JwI3TRzX03Zl0UNJWg',
    role: 'member',
    totalXp: 1540,
    streakDays: 8,
    supervisor: 'Ustadz Farhan'
  },
  {
    id: 'user-faris-banjari',
    name: 'Faris Al-Banjari',
    halaqah: 'Halaqah Al-Fajr',
    halaqahCode: 'HF-4092',
    passcode: '1234',
    avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDD5eNA6Cc-haxAb47iyA_T5sVq_esnqNS7ElzveTLKE5rxANA6DJjN84DSl41N4Vj46zDGw4UYabLdXU7nq04zEKgiSUntFivHLumiM1gofA2RwV6bR9Z_Y9NxZVSWr2jTomP_XSUAxKAX3tJPw0ZjCMqI68v5L85TLG9CMhWMPzMfCeKxpgODtb-3S8UNT5hlf-TU20-fu-pKPCnI95v9xK5yxmOIp8eoFKZpvymwvnWKqd7dz_Q9pQ',
    role: 'member',
    totalXp: 1380,
    streakDays: 5,
    supervisor: 'Ustadz Farhan'
  },

  // Hafiz Circle
  {
    id: 'user-tariq-mansoor',
    name: 'Tariq Mansoor',
    halaqah: 'Hafiz Circle',
    halaqahCode: 'HC-1108',
    passcode: '1234',
    avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBk9LWZ-0dEg9IaUBzxXTxLUfqZoGy8Q_Gyq5eDi0id422l1gTQRXmu7w2IRUuHKnuIIKDQfz0IqBGjhZolSIVvibJWwQh9isFTPI1q30Rtimj2C28zuAiMh9aejCr8Mrm22bx69cIaYiDngzNd-7HRJwZMIdc1HT_JjbH1nfrbjhcqmM4hG6bGivGECaOerT1I6Qr9T25Ia-I4lI1Bm2PPZWQ4GhNd14lU0olP2lEoLJjkI3TVKVwjYg',
    role: 'member',
    totalXp: 2850,
    streakDays: 28,
    supervisor: 'Ustadz Tariq Mansoor'
  },
  {
    id: 'user-luqman-faris',
    name: 'Luqman Faris',
    halaqah: 'Hafiz Circle',
    halaqahCode: 'HC-1108',
    passcode: '1234',
    avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDD5eNA6Cc-haxAb47iyA_T5sVq_esnqNS7ElzveTLKE5rxANA6DJjN84DSl41N4Vj46zDGw4UYabLdXU7nq04zEKgiSUntFivHLumiM1gofA2RwV6bR9Z_Y9NxZVSWr2jTomP_XSUAxKAX3tJPw0ZjCMqI68v5L85TLG9CMhWMPzMfCeKxpgODtb-3S8UNT5hlf-TU20-fu-pKPCnI95v9xK5yxmOIp8eoFKZpvymwvnWKqd7dz_Q9pQ',
    role: 'member',
    totalXp: 1790,
    streakDays: 10,
    supervisor: 'Ustadz Tariq Mansoor'
  },
  {
    id: 'user-salim-basalamah',
    name: 'Salim Basalamah',
    halaqah: 'Hafiz Circle',
    halaqahCode: 'HC-1108',
    passcode: '1234',
    avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAwgfRenieAlLRgHUPBwuuS-VTNTWIvwIb8DzHtL_B5CLE3pAvEuRHzWp-wAjL3DfFpwMDNIdV7pJVzgLweGWHQiDvVtrlBkgNA3Qc5hwsd94xQeucsbYmxOcjLbapMBO3loC4DIM60u4t4xLR_dRLbM7l-107koAC54gjokfg5zXjyvGelfNRPldGZAwEIK_jsLYyImLvfKchPKQQSD1lZuSfL5CLgdvxbPEVheGbvjpOSflgx7GT8Cw',
    role: 'member',
    totalXp: 1640,
    streakDays: 8,
    supervisor: 'Ustadz Tariq Mansoor'
  },
  {
    id: 'user-rayhan-abdullah',
    name: 'Rayhan Abdullah',
    halaqah: 'Hafiz Circle',
    halaqahCode: 'HC-1108',
    passcode: '1234',
    avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuB2YNn3chwgvghi6bKAIGsEzSZIzx99nw2u8pS2HThk7F2THKw9y_ZhJ73dPHqsFS5__dExkPODyFeOt9GlkDytTjgroH4QSsM-9u4UY7NyIckRf-mt5ODfKBkVhZrAJAMEE_ch6sgUPNZPoQiwyPK8UrO9txsSCxA5ef_AS0q7wtGhzwvUAqX63PHPh3ZYRGVzAEi4MbythULEXgVF332iusFnFVQWQj-P7H_7YG-MLqFDxNZDHqiXgA',
    role: 'member',
    totalXp: 1410,
    streakDays: 6,
    supervisor: 'Ustadz Tariq Mansoor'
  },

  // Youth Tajweed
  {
    id: 'user-bilal-kareem',
    name: 'Bilal Kareem',
    halaqah: 'Youth Tajweed',
    halaqahCode: 'YT-7721',
    passcode: '1234',
    avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDnFoMagLqqmSNjNYEANFOH4M8kwlAzN0a2jOL9MjmFLHT-2YXwQ-926XaHXKQHACoeY1PzlqbgsHc1qg1ED_d1qS9ylheKXHkFOm3yFHJhJShgoMaivpA8tTv614np7Cw5fh_lLTaVm24ZOJ_W6kd-rdp4ZouYXhxWQmgmOSgukYsYMPmKn1NFqp1nLXOz4G3TO3Ejptv1Grd2xEu5b-ipFoGM7rJhQhyWV14NaZHptPX8sXfAM5W9wA',
    role: 'member',
    totalXp: 2180,
    streakDays: 15,
    supervisor: 'Ustadzah Sarah'
  },
  {
    id: 'user-yusuf-pratama',
    name: 'Yusuf Pratama',
    halaqah: 'Youth Tajweed',
    halaqahCode: 'YT-7721',
    passcode: '1234',
    avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDD9rhoZ_oKw2kaX_ib087jl58ZWxEyxXJe-f4-lkyam50XjJD1y4vmoJo_OP09N6wOgiWdvpNv5yr2G5JpuvLbm3TjeqXW0MHbuS6TtuFe6htOFVs18a00iBznKV3vany3LAk28L6AP7NVZ7sHf96ricgJ9NAjW7IvzR3eOOx6e1jpn11EVj5B7ar7C5WcI3CuYTneLk3RmV3-rVsJ7YE27-9cIjSlc_qil1T1R8WayBovHjw6vbVCog',
    role: 'member',
    totalXp: 1910,
    streakDays: 11,
    supervisor: 'Ustadzah Sarah'
  },
  {
    id: 'user-arkan-fauzan',
    name: 'Arkan Fauzan',
    halaqah: 'Youth Tajweed',
    halaqahCode: 'YT-7721',
    passcode: '1234',
    avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuC4PTvyt7-_5JmT_ZnOQdWxtCuYIdE--3_gxAqVzj0NOc7N6_bqcvR21UCMvLTCzQdSoO3QZCtryytN_R4zYIe6ouKr5cB3cssSdChFRePHKZSDaaXn_S08wLQV7Ax_gzj8D0vcg7rup-E9Mk7skIWgMoRtxrosUMDFBDS8RdcWpECxK8hYWjqTigBKC8yPkVSNQ_WhGKTJSLp1f9CZkzeWwWQhOjjjSz-kX7pqCPtyJkxmXIvjT6NrGg',
    role: 'member',
    totalXp: 1580,
    streakDays: 7,
    supervisor: 'Ustadzah Sarah'
  },
  {
    id: 'user-dimas-alhafidz',
    name: 'Dimas Al-Hafidz',
    halaqah: 'Youth Tajweed',
    halaqahCode: 'YT-7721',
    passcode: '1234',
    avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDFaQMyKnk2iLn9PRfVmgzOfoHE-e58Ab-VQMcTGdrxacm8wwW5nVi98gYcmjd_aHSNCKD0sbLlHflF6AoNGqxQ_Qheo_UDWOWgK1ivvZ9y8uvq7cdAjlrY5W6ibzXVRWlgMIxEXSbSK4NBiLsJ_1i-PslkBNixofnYzQWHbJhPmdsvZPmjWmq9Gf7Q02c1TuG4PIm9KXJKPp4IwrwHIie0wPPqYICwOCcU4f0tryN4MvTSkghJ6IZD_Q',
    role: 'member',
    totalXp: 1320,
    streakDays: 4,
    supervisor: 'Ustadzah Sarah'
  },

  // Madinah Memorization Circle
  {
    id: 'user-dr-omar-siddiqui',
    name: 'Dr. Omar Siddiqui',
    halaqah: 'Madinah Memorization Circle',
    halaqahCode: 'MC-9901',
    passcode: '1234',
    avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuC4PTvyt7-_5JmT_ZnOQdWxtCuYIdE--3_gxAqVzj0NOc7N6_bqcvR21UCMvLTCzQdSoO3QZCtryytN_R4zYIe6ouKr5cB3cssSdChFRePHKZSDaaXn_S08wLQV7Ax_gzj8D0vcg7rup-E9Mk7skIWgMoRtxrosUMDFBDS8RdcWpECxK8hYWjqTigBKC8yPkVSNQ_WhGKTJSLp1f9CZkzeWwWQhOjjjSz-kX7pqCPtyJkxmXIvjT6NrGg',
    role: 'member',
    totalXp: 2250,
    streakDays: 14,
    supervisor: 'Ustadz Mansoor'
  },
  {
    id: 'user-suhayb-rumi',
    name: 'Suhayb Ar-Rumi',
    halaqah: 'Madinah Memorization Circle',
    halaqahCode: 'MC-9901',
    passcode: '1234',
    avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDFaQMyKnk2iLn9PRfVmgzOfoHE-e58Ab-VQMcTGdrxacm8wwW5nVi98gYcmjd_aHSNCKD0sbLlHflF6AoNGqxQ_Qheo_UDWOWgK1ivvZ9y8uvq7cdAjlrY5W6ibzXVRWlgMIxEXSbSK4NBiLsJ_1i-PslkBNixofnYzQWHbJhPmdsvZPmjWmq9Gf7Q02c1TuG4PIm9KXJKPp4IwrwHIie0wPPqYICwOCcU4f0tryN4MvTSkghJ6IZD_Q',
    role: 'member',
    totalXp: 2120,
    streakDays: 12,
    supervisor: 'Ustadz Mansoor'
  },
  {
    id: 'user-harun-khattab',
    name: 'Harun Al-Khattab',
    halaqah: 'Madinah Memorization Circle',
    halaqahCode: 'MC-9901',
    passcode: '1234',
    avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDl2oh3o0y1qDHWksSoqmd8XMiZZldRTSjimhlbpgvokYxxLZf3dzPd7n29Nhetf_Olmrxo8f9PEEVJhi4uXMk4tNb7fFd_nZUOzN5Rdja-yRE3q5yF17T8TSUKJOy1bcgtuTtokarrdyNVkM2Z_9y1dzn6US_MYhabTxnbkjabBFoyfSVw_r_AWxTv7v3vkt5B9VHnhxEkJqUEqS7Pe5oQFVZO3Zo5EoaPga-DW757Niz5e4SApnpruQ',
    role: 'member',
    totalXp: 1700,
    streakDays: 9,
    supervisor: 'Ustadz Mansoor'
  },
  {
    id: 'user-salman-faris',
    name: 'Salman Faris',
    halaqah: 'Madinah Memorization Circle',
    halaqahCode: 'MC-9901',
    passcode: '1234',
    avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAwgfRenieAlLRgHUPBwuuS-VTNTWIvwIb8DzHtL_B5CLE3pAvEuRHzWp-wAjL3DfFpwMDNIdV7pJVzgLweGWHQiDvVtrlBkgNA3Qc5hwsd94xQeucsbYmxOcjLbapMBO3loC4DIM60u4t4xLR_dRLbM7l-107koAC54gjokfg5zXjyvGelfNRPldGZAwEIK_jsLYyImLvfKchPKQQSD1lZuSfL5CLgdvxbPEVheGbvjpOSflgx7GT8Cw',
    role: 'member',
    totalXp: 1450,
    streakDays: 6,
    supervisor: 'Ustadz Mansoor'
  },

  // Noor Al-Huda Tajweed Circle
  {
    id: 'user-ibrahim-qureshi',
    name: 'Ibrahim Qureshi',
    halaqah: 'Noor Al-Huda Tajweed Circle',
    halaqahCode: 'NH-3382',
    passcode: '1234',
    avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAwgfRenieAlLRgHUPBwuuS-VTNTWIvwIb8DzHtL_B5CLE3pAvEuRHzWp-wAjL3DfFpwMDNIdV7pJVzgLweGWHQiDvVtrlBkgNA3Qc5hwsd94xQeucsbYmxOcjLbapMBO3loC4DIM60u4t4xLR_dRLbM7l-107koAC54gjokfg5zXjyvGelfNRPldGZAwEIK_jsLYyImLvfKchPKQQSD1lZuSfL5CLgdvxbPEVheGbvjpOSflgx7GT8Cw',
    role: 'member',
    totalXp: 2050,
    streakDays: 13,
    supervisor: 'Ustadz Zulkifli'
  },
  {
    id: 'user-ahmad-daniyal',
    name: 'Ahmad Daniyal',
    halaqah: 'Noor Al-Huda Tajweed Circle',
    halaqahCode: 'NH-3382',
    passcode: '1234',
    avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuB2YNn3chwgvghi6bKAIGsEzSZIzx99nw2u8pS2HThk7F2THKw9y_ZhJ73dPHqsFS5__dExkPODyFeOt9GlkDytTjgroH4QSsM-9u4UY7NyIckRf-mt5ODfKBkVhZrAJAMEE_ch6sgUPNZPoQiwyPK8UrO9txsSCxA5ef_AS0q7wtGhzwvUAqX63PHPh3ZYRGVzAEi4MbythULEXgVF332iusFnFVQWQj-P7H_7YG-MLqFDxNZDHqiXgA',
    role: 'member',
    totalXp: 1880,
    streakDays: 10,
    supervisor: 'Ustadz Zulkifli'
  },
  {
    id: 'user-ziyad-farisi',
    name: 'Ziyad Al-Farisi',
    halaqah: 'Noor Al-Huda Tajweed Circle',
    halaqahCode: 'NH-3382',
    passcode: '1234',
    avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDD9rhoZ_oKw2kaX_ib087jl58ZWxEyxXJe-f4-lkyam50XjJD1y4vmoJo_OP09N6wOgiWdvpNv5yr2G5JpuvLbm3TjeqXW0MHbuS6TtuFe6htOFVs18a00iBznKV3vany3LAk28L6AP7NVZ7sHf96ricgJ9NAjW7IvzR3eOOx6e1jpn11EVj5B7ar7C5WcI3CuYTneLk3RmV3-rVsJ7YE27-9cIjSlc_qil1T1R8WayBovHjw6vbVCog',
    role: 'member',
    totalXp: 1620,
    streakDays: 8,
    supervisor: 'Ustadz Zulkifli'
  },
  {
    id: 'user-fathur-rahman',
    name: 'Fathur Rahman',
    halaqah: 'Noor Al-Huda Tajweed Circle',
    halaqahCode: 'NH-3382',
    passcode: '1234',
    avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDFaQMyKnk2iLn9PRfVmgzOfoHE-e58Ab-VQMcTGdrxacm8wwW5nVi98gYcmjd_aHSNCKD0sbLlHflF6AoNGqxQ_Qheo_UDWOWgK1ivvZ9y8uvq7cdAjlrY5W6ibzXVRWlgMIxEXSbSK4NBiLsJ_1i-PslkBNixofnYzQWHbJhPmdsvZPmjWmq9Gf7Q02c1TuG4PIm9KXJKPp4IwrwHIie0wPPqYICwOCcU4f0tryN4MvTSkghJ6IZD_Q',
    role: 'member',
    totalXp: 1390,
    streakDays: 5,
    supervisor: 'Ustadz Zulkifli'
  }
];

export const LeaderboardScreen: React.FC<LeaderboardScreenProps> = ({
  userXp,
  userStreak,
  onShowToast,
  activeUser,
  onOpenAuth,
  registeredUsers
}) => {
  const isDeptHX = activeUser?.role === 'dept-hx' || activeUser?.role === 'hq-admin';
  const [scope, setScope] = useState<'group' | 'global'>('group');
  const [, setSelectedMilestone] = useState<string | null>(null);
  const [liveUsers, setLiveUsers] = useState<ActiveUser[]>([]);
  
  // Sub-filter for Dept HX in "Per Halaqah" mode: 'all' or specific halaqah name
  const [selectedHalaqahFilter, setSelectedHalaqahFilter] = useState<string>('all');

  // Listen to all users in Firestore for leaderboard
  useEffect(() => {
    const q = query(collection(db, 'users'), orderBy('totalXp', 'desc'), limit(100));
    const unsub = onSnapshot(q, (snapshot) => {
      const users: ActiveUser[] = [];
      snapshot.forEach((doc) => {
        users.push(doc.data() as ActiveUser);
      });
      setLiveUsers(users);
    });
    return () => unsub();
  }, []);

  // List of all halaqahs (loaded from localStorage unified list or defaults)
  const halaqahDetailsList = useMemo<HalaqahDetail[]>(() => {
    let list: HalaqahDetail[] = [];
    try {
      const saved = localStorage.getItem('noorworship_unified_halaqahs_v2');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) list = parsed;
      }
    } catch (e) {
      console.warn(e);
    }
    if (list.length === 0) {
      list = DEFAULT_BASE_HALAQAHS;
    }
    return list;
  }, []);

  // Merged pool of all rankable employee users
  const allEmployees = useMemo<ActiveUser[]>(() => {
    const map = new Map<string, ActiveUser>();

    // 1. Base employees
    BASE_EMPLOYEES_ROSTER.forEach((u) => map.set(u.id, u));

    // 2. Overlay registeredUsers (e.g. newly added by Dept HX or AuthScreen)
    if (registeredUsers && registeredUsers.length > 0) {
      registeredUsers.forEach((u) => {
        if (u.role === 'member') {
          map.set(u.id, { ...(map.get(u.id) || {}), ...u });
        }
      });
    }

    // 3. Overlay Firestore live users
    liveUsers.forEach((u) => {
      if (u.role === 'member') {
        map.set(u.id, { ...(map.get(u.id) || {}), ...u });
      }
    });

    return Array.from(map.values());
  }, [liveUsers, registeredUsers]);

  // Unique list of halaqah names found in halaqahDetailsList + allEmployees
  const allHalaqahNames = useMemo<string[]>(() => {
    const names = new Set<string>();
    halaqahDetailsList.forEach((h) => names.add(h.name));
    allEmployees.forEach((u) => {
      if (u.halaqah) names.add(u.halaqah);
    });
    return Array.from(names);
  }, [halaqahDetailsList, allEmployees]);

  // Helper to get formatted ranked leaderboard list for a given set of users
  const formatLeaderboardUsers = (users: ActiveUser[]): LeaderboardUser[] => {
    return [...users]
      .sort((a, b) => (b.totalXp || 0) - (a.totalXp || 0))
      .map((u, index) => ({
        rank: index + 1,
        name: u.name,
        xp: u.totalXp || 0,
        streak: u.streakDays || 1,
        avatar: u.avatar || 'https://lh3.googleusercontent.com/aida-public/AB6AXuDD9rhoZ_oKw2kaX_ib087jl58ZWxEyxXJe-f4-lkyam50XjJD1y4vmoJo_OP09N6wOgiWdvpNv5yr2G5JpuvLbm3TjeqXW0MHbuS6TtuFe6htOFVs18a00iBznKV3vany3LAk28L6AP7NVZ7sHf96ricgJ9NAjW7IvzR3eOOx6e1jpn11EVj5B7ar7C5WcI3CuYTneLk3RmV3-rVsJ7YE27-9cIjSlc_qil1T1R8WayBovHjw6vbVCog',
        isCurrentUser: u.id === activeUser?.id,
        tajweedAcc: Math.min(99, Math.max(86, Math.floor(90 + ((u.totalXp || 0) % 9)))),
        badge: index === 0 ? 'Peringkat 1' : index === 1 ? 'Peringkat 2' : index === 2 ? 'Peringkat 3' : 'Karyawan',
        roleOrCircle: u.halaqah
      }));
  };

  // National / Global ranking (accumulated from all employees across all halaqahs)
  const nationalLeaderboard = useMemo<LeaderboardUser[]>(() => {
    return formatLeaderboardUsers(allEmployees);
  }, [allEmployees, activeUser?.id]);

  // Halaqah-specific ranking for current view
  // If Dept HX & specific halaqah chosen: use that. If member: use activeUser's halaqah
  const activeHalaqahTarget = isDeptHX
    ? (selectedHalaqahFilter === 'all' ? (allHalaqahNames[0] || 'Halaqah Al-Fajr') : selectedHalaqahFilter)
    : (activeUser?.halaqah || 'Halaqah Al-Fajr');

  const singleHalaqahLeaderboard = useMemo<LeaderboardUser[]>(() => {
    const halaqahMembers = allEmployees.filter((u) => u.halaqah === activeHalaqahTarget);
    return formatLeaderboardUsers(halaqahMembers);
  }, [allEmployees, activeHalaqahTarget, activeUser?.id]);

  // Current active list for podium display
  const currentList = scope === 'global' ? nationalLeaderboard : singleHalaqahLeaderboard;
  const top1 = currentList[0];
  const top2 = currentList[1];
  const top3 = currentList[2];
  const remainingReciters = currentList.slice(3);

  // Per-halaqah breakdown for Dept HX when in "all" mode
  const halaqahBreakdowns = useMemo(() => {
    return allHalaqahNames.map((name) => {
      const detail = halaqahDetailsList.find((h) => h.name === name);
      const members = allEmployees.filter((u) => u.halaqah === name);
      const ranked = formatLeaderboardUsers(members);
      const totalXp = members.reduce((sum, u) => sum + (u.totalXp || 0), 0);
      const avgAcc = members.length > 0
        ? Math.round(ranked.reduce((sum, r) => sum + r.tajweedAcc, 0) / members.length)
        : 90;

      return {
        name,
        code: detail?.code || 'HF-DIR',
        supervisor: detail?.supervisor || 'Ustadz Pembina',
        dept: detail?.dept || 'Dept Operasional',
        memberCount: members.length,
        totalXp,
        avgAcc,
        rankedList: ranked
      };
    });
  }, [allHalaqahNames, halaqahDetailsList, allEmployees]);

  return (
    <div className="flex flex-col w-full px-4 md:px-6 py-4 space-y-5 max-w-4xl mx-auto pb-28">
      {/* Sub-header & Motivational Greeting */}
      <div className="flex items-center justify-between pt-1">
        <div>
          <div className="flex items-center gap-1.5">
            <span
              className="material-symbols-outlined text-[#775a19] text-[20px]"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              stars
            </span>
            <h2 className="text-xl font-bold text-[#012d1d] tracking-tight">
              Papan Peringkat Karyawan
            </h2>
          </div>
          <p className="text-xs text-[#414844] mt-0.5">
            Berlomba-lomba dalam amal kebaikan (Fastabiqul Khairat)
          </p>
        </div>

        {/* Mini Timer Chip */}
        <div className="flex items-center gap-1 bg-[#e9edff] px-3 py-1 rounded-full shadow-sm shrink-0">
          <span className="material-symbols-outlined text-[15px] text-[#775a19]">schedule</span>
          <span className="text-xs text-[#141b2b] font-semibold">Reset Ahad</span>
        </div>
      </div>

      {/* Floating Active User Sticky Ranking Card or Supervisor Monitoring Banner (Placed directly below 'berlomba-lomba' and above Scope Buttons) */}
      {isDeptHX || activeUser?.role === 'admin' ? (
        <div className="w-full bg-[#012d1d] text-white rounded-2xl p-4 flex items-center justify-between border border-[#c1ecd4]/30 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#fed488] text-[#785a1a] flex items-center justify-center font-bold shadow-xs shrink-0">
              <span className="material-symbols-outlined text-[20px]">admin_panel_settings</span>
            </div>
            <div>
              <h4 className="text-xs sm:text-sm font-bold text-white flex items-center gap-1.5">
                <span>Mode Monitoring {activeUser?.role === 'admin' ? 'Ustadz' : 'Dept HX'}</span>
                <span className="text-[10px] bg-[#c1ecd4] text-[#002114] px-2 py-0.2 rounded-full font-bold">
                  {scope === 'group' ? 'Monitoring Per Halaqah' : 'Monitoring Akumulasi Nasional'}
                </span>
              </h4>
              <p className="text-[11px] text-[#c1ecd4]/90">
                {isDeptHX
                  ? scope === 'group'
                    ? 'Memantau kompetisi sehat antar santri di tiap kelompok halaqah binaan secara terpisah.'
                    : 'Memantau klasemen agregat seluruh karyawan secara nasional lintas seluruh halaqah.'
                  : 'Akun Ustadz berfungsi memantau. Poin & peringkat sepenuhnya milik santri/karyawan.'}
              </p>
            </div>
          </div>
          <span className="text-xs font-bold text-[#fed488] shrink-0 bg-white/10 px-3 py-1 rounded-full border border-white/20 hidden sm:inline-block">
            Pengawas Klasemen
          </span>
        </div>
      ) : (
        <div className="w-full bg-[#f1f3ff] rounded-2xl p-4 flex items-center justify-between border-2 border-[#1b4332]/20 shadow-sm">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex flex-col items-center justify-center w-8 h-8 rounded-full bg-[#1b4332] text-white font-bold text-xs shrink-0 shadow-sm">
              #{currentList.findIndex((u) => u.isCurrentUser) >= 0 ? currentList.findIndex((u) => u.isCurrentUser) + 1 : 4}
            </div>
            <img
              alt={activeUser?.name || 'Karyawan'}
              className="w-11 h-11 rounded-full object-cover shrink-0 ring-2 ring-[#1b4332]/20 shadow-sm"
              src={activeUser?.avatar || 'https://lh3.googleusercontent.com/aida-public/AB6AXuDD9rhoZ_oKw2kaX_ib087jl58ZWxEyxXJe-f4-lkyam50XjJD1y4vmoJo_OP09N6wOgiWdvpNv5yr2G5JpuvLbm3TjeqXW0MHbuS6TtuFe6htOFVs18a00iBznKV3vany3LAk28L6AP7NVZ7sHf96ricgJ9NAjW7IvzR3eOOx6e1jpn11EVj5B7ar7C5WcI3CuYTneLk3RmV3-rVsJ7YE27-9cIjSlc_qil1T1R8WayBovHjw6vbVCog'}
            />
            <div className="min-w-0">
              <h4 className="text-xs sm:text-sm font-bold text-[#141b2b] truncate">{activeUser?.name}</h4>
              <span className="text-[10px] text-[#00452c] font-semibold">{activeUser?.halaqah}</span>
            </div>
          </div>

          {/* XP Stats Block */}
          <div className="text-right shrink-0">
            <div className="text-base font-bold text-[#012d1d]">
              {userXp.toLocaleString()} <span className="text-xs text-[#414844] font-normal">XP</span>
            </div>
            <div className="flex items-center justify-end gap-0.5 text-xs text-[#00452c] font-semibold">
              <span className="material-symbols-outlined text-[14px]">arrow_upward</span>
              <span>Peringkat Aktif</span>
            </div>
          </div>
        </div>
      )}

      {/* Scope Segmented Control */}
      <div className="w-full bg-[#e1e8fd] p-1 rounded-full flex relative select-none">
        <button
          onClick={() => {
            setScope('group');
            if (isDeptHX) {
              onShowToast('Beralih ke Menu HX Pusat: Klasemen Terpisah Per Halaqah');
            } else {
              onShowToast(`Beralih ke peringkat ${activeUser?.halaqah || 'Halaqah Al-Fajr'}`);
            }
          }}
          className={`flex-1 py-2 px-3 rounded-full flex items-center justify-center gap-1.5 text-xs font-bold transition-all duration-300 cursor-pointer ${
            scope === 'group'
              ? 'bg-white text-[#012d1d] shadow-sm'
              : 'text-[#414844] hover:text-[#012d1d]'
          }`}
        >
          <span className="material-symbols-outlined text-[17px]">
            {isDeptHX ? 'corporate_fare' : 'group'}
          </span>
          <span>
            {isDeptHX ? 'HX Pusat (Per Halaqah)' : (activeUser?.halaqah || 'Halaqah Saya')}
          </span>
        </button>

        <button
          onClick={() => {
            setScope('global');
            onShowToast(
              isDeptHX
                ? 'Beralih ke Peringkat Nasional (Akumulasi Seluruh Karyawan)'
                : 'Beralih ke peringkat nasional & global'
            );
          }}
          className={`flex-1 py-2 px-3 rounded-full flex items-center justify-center gap-1.5 text-xs font-bold transition-all duration-300 cursor-pointer ${
            scope === 'global'
              ? 'bg-white text-[#012d1d] shadow-sm'
              : 'text-[#414844] hover:text-[#012d1d]'
          }`}
        >
          <span className="material-symbols-outlined text-[17px]">public</span>
          <span>
            {isDeptHX ? 'Nasional (Seluruh Karyawan)' : 'Nasional & Global'}
          </span>
        </button>
      </div>

      {/* SPECIAL DEPT HX FILTER BAR FOR PER-HALAQAH VIEW (Placed under Scope Buttons) */}
      {isDeptHX && scope === 'group' && (
        <div className="w-full bg-white rounded-2xl p-3.5 border border-[#1b4332]/10 shadow-sm space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-bold text-[#012d1d]">
              <span className="material-symbols-outlined text-[18px] text-[#00452c]">hub</span>
              <span>Pilih Tampilan Peringkat Halaqah Binaan</span>
            </div>
            <span className="text-[10px] bg-[#c1ecd4] text-[#002114] px-2 py-0.5 rounded-full font-bold">
              {allHalaqahNames.length} Halaqah Aktif
            </span>
          </div>

          {/* Halaqah Filter Chips */}
          <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
            <button
              onClick={() => {
                setSelectedHalaqahFilter('all');
                onShowToast('Menampilkan peringkat setiap halaqah secara terpisah');
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all cursor-pointer flex items-center gap-1.5 ${
                selectedHalaqahFilter === 'all'
                  ? 'bg-[#012d1d] text-white shadow-sm'
                  : 'bg-[#f1f3ff] text-[#414844] hover:bg-[#e4e7ff]'
              }`}
            >
              <span className="material-symbols-outlined text-[15px]">view_agenda</span>
              <span>Semua Halaqah (Terpisah)</span>
            </button>

            {allHalaqahNames.map((halName) => {
              const isSelected = selectedHalaqahFilter === halName;
              const count = allEmployees.filter((u) => u.halaqah === halName).length;
              return (
                <button
                  key={halName}
                  onClick={() => {
                    setSelectedHalaqahFilter(halName);
                    onShowToast(`Melihat peringkat internal ${halName}`);
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all cursor-pointer flex items-center gap-1.5 ${
                    isSelected
                      ? 'bg-[#012d1d] text-white shadow-sm'
                      : 'bg-[#f1f3ff] text-[#414844] hover:bg-[#e4e7ff]'
                  }`}
                >
                  <span>{halName}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                      isSelected ? 'bg-white/20 text-white' : 'bg-[#e1e8fd] text-[#141b2b]'
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* VIEW BRANCH 1: DEPT HX "ALL HALAQAHS" SEPARATED OVERVIEW */}
      {isDeptHX && scope === 'group' && selectedHalaqahFilter === 'all' ? (
        <div className="w-full space-y-6">
          <div className="flex items-center justify-between pb-1 border-b border-[#1b4332]/10">
            <div>
              <h3 className="text-base font-bold text-[#012d1d] flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[20px] text-[#00452c]">format_list_bulleted</span>
                <span>Peringkat Setiap Halaqah (Terpisah Antar Halaqah)</span>
              </h3>
              <p className="text-xs text-[#414844] mt-0.5">
                Masing-masing halaqah memiliki klasemen internal sendiri berdasarkan total XP anggota.
              </p>
            </div>
            <span className="text-xs font-semibold text-[#00452c] bg-[#c1ecd4]/60 px-3 py-1 rounded-full shrink-0 hidden sm:inline-block">
              {halaqahBreakdowns.length} Kelompok Terdata
            </span>
          </div>

          {/* Group Cards List: Each Halaqah Rendered Separately */}
          <div className="flex flex-col space-y-5">
            {halaqahBreakdowns.map((hGroup) => (
              <div
                key={hGroup.name}
                className="w-full bg-white rounded-2xl border border-[#1b4332]/10 shadow-sm overflow-hidden transition-all hover:border-[#1b4332]/25"
              >
                {/* Halaqah Card Header */}
                <div className="bg-gradient-to-r from-[#012d1d] to-[#1b4332] text-white p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-[#fed488] shrink-0 border border-white/15">
                      <span className="material-symbols-outlined text-[22px]">mosque</span>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-base font-bold text-white">{hGroup.name}</h4>
                        <span className="px-2 py-0.5 bg-[#fed488] text-[#785a1a] text-[10px] font-bold rounded-full">
                          {hGroup.code}
                        </span>
                      </div>
                      <p className="text-xs text-[#c1ecd4] mt-0.5 flex items-center gap-2">
                        <span>Pembimbing: {hGroup.supervisor}</span>
                        <span>•</span>
                        <span>{hGroup.dept}</span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-auto">
                    <div className="text-right mr-1">
                      <div className="text-sm font-bold text-[#fed488]">
                        {hGroup.totalXp.toLocaleString()} XP
                      </div>
                      <div className="text-[10px] text-[#c1ecd4]">
                        {hGroup.memberCount} Anggota • Rata-rata {hGroup.avgAcc}% Tajwid
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setSelectedHalaqahFilter(hGroup.name);
                        onShowToast(`Membuka fokus podium ${hGroup.name}`);
                      }}
                      className="px-3 py-1.5 rounded-full bg-white/15 hover:bg-white/25 text-white text-xs font-bold transition-all flex items-center gap-1 cursor-pointer shrink-0"
                    >
                      <span className="material-symbols-outlined text-[15px]">podium</span>
                      <span>Fokus</span>
                    </button>
                  </div>
                </div>

                {/* Halaqah Internal Leaderboard Members List */}
                <div className="p-3.5 space-y-2">
                  {hGroup.rankedList.length === 0 ? (
                    <div className="text-center py-6 text-xs text-[#717973]">
                      Belum ada santri terdaftar di halaqah ini.
                    </div>
                  ) : (
                    hGroup.rankedList.map((user, idx) => (
                      <div
                        key={user.name + idx}
                        onClick={() => onShowToast(`Melihat capaian ${user.name} (${user.xp} XP)`)}
                        className={`w-full rounded-xl p-3 flex items-center justify-between gap-3 transition-all cursor-pointer ${
                          idx === 0
                            ? 'bg-[#fef9ee] border border-[#fed488]/60'
                            : idx === 1
                            ? 'bg-[#f8f9fc] border border-[#dce2f7]'
                            : idx === 2
                            ? 'bg-[#fffbf5] border border-[#ffdea5]/40'
                            : 'bg-white hover:bg-[#f9f9ff] border border-gray-100'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          {/* Rank Icon / Badge */}
                          <div className="w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
                            {idx === 0 ? (
                              <span className="w-full h-full rounded-full bg-[#fed488] text-[#785a1a] flex items-center justify-center">
                                🥇
                              </span>
                            ) : idx === 1 ? (
                              <span className="w-full h-full rounded-full bg-[#dce2f7] text-[#141b2b] flex items-center justify-center">
                                🥈
                              </span>
                            ) : idx === 2 ? (
                              <span className="w-full h-full rounded-full bg-[#e9c176] text-[#261900] flex items-center justify-center">
                                🥉
                              </span>
                            ) : (
                              <span className="text-xs font-semibold text-[#414844]">
                                #{user.rank}
                              </span>
                            )}
                          </div>

                          <img
                            className="w-9 h-9 rounded-full object-cover shrink-0 shadow-xs"
                            alt={user.name}
                            src={user.avatar}
                          />

                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs sm:text-sm font-bold text-[#141b2b] truncate">
                                {user.name}
                              </span>
                              {idx === 0 && (
                                <span className="text-[9px] font-bold bg-[#fed488] text-[#785a1a] px-1.5 py-0.2 rounded-full">
                                  Juara 1 Halaqah
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 mt-0.5 text-xs text-[#414844]">
                              <span className="text-[10px] text-[#00452c] font-semibold flex items-center gap-0.5">
                                <span className="material-symbols-outlined text-[13px]">local_fire_department</span>
                                {user.streak} hari
                              </span>
                              <span className="text-[10px] bg-[#f1f3ff] px-1.5 py-0.2 rounded-full text-[#414844]">
                                {user.tajweedAcc}% Tajwid
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* XP Stats */}
                        <div className="text-right shrink-0">
                          <div className="text-sm font-bold text-[#012d1d]">
                            {user.xp.toLocaleString()}
                          </div>
                          <div className="text-[9px] text-[#717973] uppercase font-semibold">XP</div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        /* VIEW BRANCH 2: PODIUM + RANKING LIST (For Single Halaqah OR National Global) */
        <div className="w-full space-y-5">
          {/* Active Scope Label Info */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[#00452c] text-[20px]">
                {scope === 'global' ? 'public' : 'workspace_premium'}
              </span>
              <div>
                <h3 className="text-sm font-bold text-[#141b2b]">
                  {scope === 'global'
                    ? 'Klasemen Nasional (Akumulasi Seluruh Karyawan)'
                    : `Klasemen Internal: ${activeHalaqahTarget}`}
                </h3>
                <p className="text-[11px] text-[#717973]">
                  {scope === 'global'
                    ? `Menampilkan total ${nationalLeaderboard.length} karyawan terakumulasi dari seluruh halaqah se-Indonesia`
                    : `Menampilkan ${singleHalaqahLeaderboard.length} santri aktif terdaftar pada ${activeHalaqahTarget}`}
                </p>
              </div>
            </div>

            {isDeptHX && scope === 'group' && selectedHalaqahFilter !== 'all' && (
              <button
                onClick={() => {
                  setSelectedHalaqahFilter('all');
                  onShowToast('Kembali ke tampilan semua halaqah terpisah');
                }}
                className="text-xs text-[#00452c] font-bold hover:underline flex items-center gap-1 cursor-pointer shrink-0"
              >
                <span className="material-symbols-outlined text-[15px]">arrow_back</span>
                <span>Lihat Semua Halaqah</span>
              </button>
            )}
          </div>

          {/* Top 3 Podium Showcase Card */}
          <div className="w-full bg-gradient-to-b from-[#1b4332] via-[#1b4332] to-[#012d1d] text-white rounded-2xl p-4 sm:p-5 shadow-md relative overflow-hidden">
            {/* Ambient Geometry */}
            <svg
              className="absolute -right-6 -bottom-6 w-40 h-40 opacity-10 text-white pointer-events-none"
              fill="currentColor"
              viewBox="0 0 100 100"
            >
              <circle cx="50" cy="50" fill="none" r="45" stroke="currentColor" strokeDasharray="6 6" strokeWidth="4" />
              <polygon points="50,15 61,38 86,41 68,59 73,85 50,72 27,85 32,59 14,41 39,38" />
            </svg>

            <div className="flex items-center justify-between pb-3">
              <span className="text-xs uppercase tracking-wider text-[#ffdea5] font-bold">
                {scope === 'global'
                  ? 'Podium Nasional Pekan Ini'
                  : `Qari Terbaik: ${activeHalaqahTarget}`}
              </span>
              <span className="text-xs bg-white/15 backdrop-blur-md px-2.5 py-0.5 rounded-full text-[#e9c176] font-medium">
                Pekan ke-34
              </span>
            </div>

            {/* Podium Layout */}
            <div className="grid grid-cols-3 gap-2 items-end pt-2 pb-1 text-center">
              {/* 2nd Place */}
              {top2 ? (
                <div className="flex flex-col items-center">
                  <div className="relative mb-2">
                    <div className="w-14 h-14 rounded-full p-0.5 bg-[#dce2f7]/70 shadow-sm flex items-center justify-center">
                      <img
                        className="w-full h-full object-cover rounded-full"
                        alt={top2.name}
                        src={top2.avatar}
                      />
                    </div>
                    <span className="absolute -bottom-1 -right-1 w-5 h-5 bg-[#dce2f7] text-[#141b2b] text-[11px] font-bold rounded-full flex items-center justify-center shadow">
                      2
                    </span>
                  </div>
                  <h4 className="text-xs font-bold truncate max-w-full text-white">{top2.name}</h4>
                  <span className="text-[10px] text-[#ffdea5] font-semibold">
                    {top2.xp.toLocaleString()} XP
                  </span>
                  <span className="text-[9px] text-[#86af99] truncate max-w-full">
                    {top2.roleOrCircle || `${top2.tajweedAcc}% Tajwid`}
                  </span>
                </div>
              ) : (
                <div className="opacity-40 text-[10px] text-center text-white py-4">- Posisi 2 -</div>
              )}

              {/* 1st Place */}
              {top1 ? (
                <div className="flex flex-col items-center -translate-y-2">
                  <div className="relative mb-2">
                    {/* Crown Icon */}
                    <span className="material-symbols-outlined text-[24px] text-[#fed488] absolute -top-5 left-1/2 -translate-x-1/2 drop-shadow animate-bounce">
                      crown
                    </span>
                    <div className="w-18 h-18 rounded-full p-1 bg-gradient-to-tr from-[#fed488] to-[#ffdea5] shadow-lg flex items-center justify-center ring-2 ring-[#fed488]/50">
                      <img
                        className="w-full h-full object-cover rounded-full"
                        alt={top1.name}
                        src={top1.avatar}
                      />
                    </div>
                    <span className="absolute -bottom-1 -right-1 w-6 h-6 bg-[#fed488] text-[#785a1a] text-xs font-bold rounded-full flex items-center justify-center shadow">
                      1
                    </span>
                  </div>
                  <h4 className="text-sm font-bold truncate max-w-full text-[#ffdea5]">{top1.name}</h4>
                  <span className="text-xs font-bold text-white">{top1.xp.toLocaleString()} XP</span>
                  <span className="text-[10px] text-[#92f7c3] font-semibold truncate max-w-full">
                    {top1.roleOrCircle || 'Peringkat Utama'}
                  </span>
                </div>
              ) : (
                <div className="opacity-40 text-[10px] text-center text-white py-4">- Posisi 1 -</div>
              )}

              {/* 3rd Place */}
              {top3 ? (
                <div className="flex flex-col items-center">
                  <div className="relative mb-2">
                    <div className="w-14 h-14 rounded-full p-0.5 bg-[#fed488]/40 shadow-sm flex items-center justify-center">
                      <img
                        className="w-full h-full object-cover rounded-full"
                        alt={top3.name}
                        src={top3.avatar}
                      />
                    </div>
                    <span className="absolute -bottom-1 -right-1 w-5 h-5 bg-[#e9c176] text-[#261900] text-[11px] font-bold rounded-full flex items-center justify-center shadow">
                      3
                    </span>
                  </div>
                  <h4 className="text-xs font-bold truncate max-w-full text-white">{top3.name}</h4>
                  <span className="text-[10px] text-[#ffdea5] font-semibold">
                    {top3.xp.toLocaleString()} XP
                  </span>
                  <span className="text-[9px] text-[#86af99] truncate max-w-full">
                    {top3.roleOrCircle || `${top3.tajweedAcc}% Tajwid`}
                  </span>
                </div>
              ) : (
                <div className="opacity-40 text-[10px] text-center text-white py-4">- Posisi 3 -</div>
              )}
            </div>
          </div>

          {/* Gamification Achievement Badges Horizontal Carousel */}
          <div className="w-full space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[#775a19] text-[20px]">military_tech</span>
                <h3 className="text-sm font-bold text-[#141b2b]">Lencana Capaian Ibadah</h3>
              </div>
              <span className="text-xs text-[#775a19] font-semibold">3 Terbuka</span>
            </div>

            <div className="flex gap-3 overflow-x-auto pb-1 -mx-4 px-4 no-scrollbar">
              {/* Badge 1 */}
              <div
                onClick={() => {
                  setSelectedMilestone('Master Itqan');
                  onShowToast('Master Itqan: Membaca 10 Juz dengan akurasi makhraj di atas 90%');
                }}
                className="min-w-[210px] bg-white p-3.5 rounded-2xl flex items-start gap-3 shadow-sm border border-[#1b4332]/5 shrink-0 cursor-pointer hover:bg-[#f9f9ff] transition-all"
              >
                <div className="w-10 h-10 rounded-full bg-[#fed488]/40 flex items-center justify-center text-[#775a19] shrink-0">
                  <span
                    className="material-symbols-outlined text-[22px]"
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    menu_book
                  </span>
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-bold text-[#141b2b] truncate">Master Itqan</div>
                  <div className="text-[11px] text-[#414844] line-clamp-2 mt-0.5">
                    Membaca 10 Juz dengan akurasi &gt;90%
                  </div>
                  <span className="inline-block mt-1.5 px-2 py-0.5 rounded-full bg-[#ffdea5]/50 text-[10px] text-[#775a19] font-bold">
                    +350 XP
                  </span>
                </div>
              </div>

              {/* Badge 2 */}
              <div
                onClick={() => {
                  setSelectedMilestone('Penjaga Masjid');
                  onShowToast('Penjaga Masjid: 100% Kehadiran Subuh Berjamaah selama 7 hari berturut-turut');
                }}
                className="min-w-[210px] bg-white p-3.5 rounded-2xl flex items-start gap-3 shadow-sm border border-[#1b4332]/5 shrink-0 cursor-pointer hover:bg-[#f9f9ff] transition-all"
              >
                <div className="w-10 h-10 rounded-full bg-[#c1ecd4] flex items-center justify-center text-[#012d1d] shrink-0">
                  <span
                    className="material-symbols-outlined text-[22px]"
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    mosque
                  </span>
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-bold text-[#141b2b] truncate">Penjaga Masjid</div>
                  <div className="text-[11px] text-[#414844] line-clamp-2 mt-0.5">
                    100% Subuh Berjamaah 7 hari
                  </div>
                  <span className="inline-block mt-1.5 px-2 py-0.5 rounded-full bg-[#c1ecd4] text-[10px] text-[#012d1d] font-bold">
                    +500 XP
                  </span>
                </div>
              </div>

              {/* Badge 3 */}
              <div
                onClick={() => {
                  setSelectedMilestone('Pembelajar Tanggap');
                  onShowToast('Pembelajar Tanggap: Berhasil memperbaiki catatan tajwid pada percobaan kedua');
                }}
                className="min-w-[210px] bg-white p-3.5 rounded-2xl flex items-start gap-3 shadow-sm border border-[#1b4332]/5 shrink-0 cursor-pointer hover:bg-[#f9f9ff] transition-all"
              >
                <div className="w-10 h-10 rounded-full bg-[#dce2f7] flex items-center justify-center text-[#414844] shrink-0">
                  <span
                    className="material-symbols-outlined text-[22px]"
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    bolt
                  </span>
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-bold text-[#141b2b] truncate">Pembelajar Tanggap</div>
                  <div className="text-[11px] text-[#414844] line-clamp-2 mt-0.5">
                    Perbaiki tajwid seketika pada uji ulang
                  </div>
                  <span className="inline-block mt-1.5 px-2 py-0.5 rounded-full bg-[#e9edff] text-[10px] text-[#414844] font-bold">
                    +150 XP
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Remaining Reciters List */}
          <div className="w-full space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-[#141b2b]">
                {scope === 'group'
                  ? `Daftar Anggota Lainnya (${activeHalaqahTarget})`
                  : 'Seluruh Karyawan (Peringkat #4 ke Bawah)'}
              </span>
              <span className="text-xs text-[#414844]">
                {remainingReciters.length} Santri
              </span>
            </div>

            {/* Ranked Cards Collection */}
            <div className="flex flex-col space-y-2">
              {remainingReciters.length === 0 ? (
                <div className="text-center py-6 text-xs text-[#717973] bg-white rounded-2xl border border-[#1b4332]/5">
                  Semua anggota telah berada di podium utama.
                </div>
              ) : (
                remainingReciters.map((user) => (
                  <div
                    key={user.name + user.rank}
                    onClick={() => onShowToast(`Melihat profil tilawah ${user.name} (${user.xp} XP)`)}
                    className="w-full bg-white rounded-2xl p-3.5 shadow-sm border border-[#1b4332]/5 flex items-center justify-between gap-3 hover:bg-[#f9f9ff] active:scale-[0.99] transition-all cursor-pointer"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-xs font-bold text-[#414844] w-5 text-center shrink-0">
                        {user.rank}
                      </span>
                      <img
                        className="w-10 h-10 rounded-full object-cover shrink-0 shadow-sm"
                        alt={user.name}
                        src={user.avatar}
                      />
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs sm:text-sm font-bold text-[#141b2b] truncate">
                            {user.name}
                          </span>
                          {user.isCurrentUser && (
                            <span className="px-1.5 py-0.2 rounded-full bg-[#c1ecd4] text-[#002114] text-[9px] font-bold">
                              Anda
                            </span>
                          )}
                          {scope === 'global' && user.roleOrCircle && (
                            <span className="px-1.5 py-0.2 rounded-full bg-[#e9edff] text-[#141b2b] text-[9px] font-semibold truncate hidden sm:inline">
                              {user.roleOrCircle}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5 text-xs text-[#414844]">
                          <span className="px-1.5 py-0.2 bg-[#f1f3ff] rounded-full text-[10px] font-semibold text-[#414844]">
                            {user.tajweedAcc}% rata-rata
                          </span>
                          <span className="text-[10px] text-[#00452c] font-semibold">
                            🔥 {user.streak} hari
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-sm font-bold text-[#141b2b]">
                        {user.xp.toLocaleString()}
                      </div>
                      <div className="text-[10px] text-[#717973] uppercase font-semibold">XP</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Encouraging Fastabiqul Khairat Quote */}
      <div className="w-full bg-[#f1f3ff] rounded-2xl p-4 flex items-center gap-3 border border-[#1b4332]/5">
        <div className="w-10 h-10 rounded-full bg-[#ffdea5]/50 flex items-center justify-center text-[#775a19] shrink-0">
          <span className="material-symbols-outlined text-[20px]">format_quote</span>
        </div>
        <div className="min-w-0">
          <p
            className="font-amiri text-lg text-[#012d1d] text-right leading-relaxed mb-0.5"
            dir="rtl"
          >
            فَاسْتَبِقُوا الْخَيْرَاتِ
          </p>
          <p className="text-xs text-[#414844]">
            &ldquo;Maka berlomba-lombalah kamu dalam kebaikan.&rdquo; (QS. Al-Baqarah: 148)
          </p>
        </div>
      </div>
    </div>
  );
};
