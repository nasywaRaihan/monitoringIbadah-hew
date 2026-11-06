export interface AyahWord {
  id: string;
  arabic: string;
  transliteration?: string;
  status: 'perfect' | 'correct' | 'warning' | 'error';
  tag: string;
  title: string;
  icon: string;
  body: string;
  correctionGuide?: string;
  audioHint: string;
  targetMetric: string;
  tajweedRuleName?: string;
}

export interface RecitationAyah {
  id: string;
  surahNumber: number;
  ayahNumber: number;
  surahName: string;
  surahArabic: string;
  sheikhAudioUrl: string;
  translation: string;
  tajweedRule: string;
  idealDurationMinSec: number;
  idealDurationMaxSec: number;
  words: AyahWord[];
  ustadzNote: string;
}

export const RECITATION_AYAHS: RecitationAyah[] = [
  // 1. SURAH AN-NAS (114)
  {
    id: 'surah-114',
    surahNumber: 114,
    ayahNumber: 1,
    surahName: '114. Surah An-Nas',
    surahArabic: 'سُورَةُ النَّاسِ',
    sheikhAudioUrl: 'https://everyayah.com/data/Alafasy_128kbps/114001.mp3',
    translation: 'Katakanlah: "Aku berlindung kepada Tuhannya manusia, Raja manusia, Sembahan manusia, dari kejahatan bisikan syaitan yang bersembunyi."',
    tajweedRule: 'Ghunnah Musyaddadah (2 Harakat), Ikhfa Haqiqi, & Mad ‘Aridh Lissukun',
    idealDurationMinSec: 15,
    idealDurationMaxSec: 35,
    ustadzNote: 'Tahan dengung Ghunnah pada huruf Nun bertasydid (ٱلنَّاسِ) selama 2 harakat stabil pada setiap waqaf.',
    words: [
      { id: 'w114-1', arabic: 'قُلْ', transliteration: 'Qul', status: 'perfect', tag: 'Qaf Tebal', title: 'Makhraj Qaf', icon: 'check_circle', body: 'Qaf tebal dari pangkal lidah, Lam sukun tidak memantul.', correctionGuide: 'Tekan Qaf di pangkal lidah.', audioHint: 'Qaf tebal.', targetMetric: 'Makharij 98%' },
      { id: 'w114-2', arabic: 'أَعُوذُ', transliteration: 'A‘ūżu', status: 'correct', tag: 'Dzal Halus', title: 'Makhraj Dzal', icon: 'check_circle', body: 'Dzal lembut di ujung lidah menempel gigi seri atas.', correctionGuide: 'Sentuhkan ujung lidah ke gigi seri atas.', audioHint: 'Dzal lembut.', targetMetric: 'Tajwid 95%' },
      { id: 'w114-3', arabic: 'بِرَبِّ', transliteration: 'Birabbi', status: 'correct', tag: 'Tafkhim Raa', title: 'Raa Bertasydid', icon: 'check_circle', body: 'Raa ditebalkan dengan tasydid mantap.', correctionGuide: 'Tebalkan Raa.', audioHint: 'Raa tebal.', targetMetric: 'Makharij 96%' },
      { id: 'w114-4', arabic: 'ٱلنَّاسِ', transliteration: 'An-Nās', status: 'perfect', tag: 'Ghunnah 2h', title: 'Ghunnah Musyaddadah', icon: 'check_circle', body: 'Dengung Nun bertasydid 2 harakat penuh.', correctionGuide: 'Tahan dengung Nun 2 ketukan.', audioHint: 'Dengung 2 ketukan.', targetMetric: 'Ghunnah 98%' },
      { id: 'w114-5', arabic: 'مَلِكِ', transliteration: 'Maliki', status: 'correct', tag: 'Harakat Pendek', title: 'Vokal Short', icon: 'check_circle', body: 'Dibaca 1 harakat pendek teratur.', correctionGuide: 'Jangan diseret.', audioHint: '1 ketukan.', targetMetric: 'Kelancaran 95%' },
      { id: 'w114-6', arabic: 'إِلَٰهِ', transliteration: 'Ilāhi', status: 'correct', tag: 'Mad 2h', title: 'Mad Thabi’i', icon: 'check_circle', body: 'Mad 2 harakat pada Lam.', correctionGuide: 'Ayunkan 2 ketukan.', audioHint: 'Mad 2 ketukan.', targetMetric: 'Tajwid 95%' },
      { id: 'w114-7', arabic: 'مِن', transliteration: 'Min', status: 'correct', tag: 'Ikhfa', title: 'Ikhfa Haqiqi', icon: 'check_circle', body: 'Nun sukun sebelum Syin disamarkan dengan dengung 2 harakat.', correctionGuide: 'Samarkan Nun.', audioHint: 'Ikhfa 2 ketukan.', targetMetric: 'Ikhfa 94%' },
      { id: 'w114-8', arabic: 'شَرِّ', transliteration: 'Syarri', status: 'correct', tag: 'Syin Berdesis', title: 'Sifat Tafasysyi', icon: 'check_circle', body: 'Hembusan angin Syin di tengah lidah.', correctionGuide: 'Alirkan hembusan Syin.', audioHint: 'Syin berdesis.', targetMetric: 'Makharij 95%' },
      { id: 'w114-9', arabic: 'ٱلْوَسْوَاسِ', transliteration: 'Al-Waswās', status: 'correct', tag: 'Hams Sin', title: 'Sin Sukun', icon: 'check_circle', body: 'Sin sukun berdesis halus.', correctionGuide: 'Alirkan hams Sin.', audioHint: 'Desis Sin.', targetMetric: 'Tajwid 96%' },
      { id: 'w114-10', arabic: 'ٱلْخَنَّاسِ', transliteration: 'Al-Khannās', status: 'perfect', tag: 'Kha Tebal', title: 'Makhraj Kha', icon: 'check_circle', body: 'Kha dari tenggorokan atas tebal.', correctionGuide: 'Tebalkan Kha.', audioHint: 'Kha tebal.', targetMetric: 'Makharij 98%' }
    ]
  },

  // 2. SURAH AL-FALAQ (113)
  {
    id: 'surah-113',
    surahNumber: 113,
    ayahNumber: 1,
    surahName: '113. Surah Al-Falaq',
    surahArabic: 'سُورَةُ الفَلَقِ',
    sheikhAudioUrl: 'https://everyayah.com/data/Alafasy_128kbps/113001.mp3',
    translation: 'Katakanlah: "Aku berlindung kepada Tuhan yang menguasai subuh, dari kejahatan makhluk-Nya, dan dari kejahatan malam apabila telah gelap gulita."',
    tajweedRule: 'Qalqalah Kubra Waqaf (Qaf, Ba, Dal), Ikhfa Haqiqi & Izhar Halqi',
    idealDurationMinSec: 14,
    idealDurationMaxSec: 32,
    ustadzNote: 'Mantapkan pantulan Qalqalah Kubra pada setiap waqaf akhir ayat: ٱلْفَلَقِ, خَلَقَ, وَقَبَ, ٱلْعُقَدِ, dan حَسَدَ.',
    words: [
      { id: 'w113-1', arabic: 'قُلْ', transliteration: 'Qul', status: 'perfect', tag: 'Qaf Tebal', title: 'Makhraj Qaf', icon: 'check_circle', body: 'Makhraj Qaf tebal dari pangkal lidah.', correctionGuide: 'Angkat pangkal lidah.', audioHint: 'Qaf tebal.', targetMetric: 'Makharij 98%' },
      { id: 'w113-2', arabic: 'أَعُوذُ', transliteration: 'A‘ūżu', status: 'correct', tag: 'Dzal Halus', title: 'Makhraj Dzal', icon: 'check_circle', body: 'Dzal lembut di ujung lidah.', correctionGuide: 'Sentuhkan ke gigi seri atas.', audioHint: 'Dzal lembut.', targetMetric: 'Tajwid 95%' },
      { id: 'w113-3', arabic: 'بِرَبِّ', transliteration: 'Birabbi', status: 'correct', tag: 'Tafkhim Raa', title: 'Raa Tebal', icon: 'check_circle', body: 'Raa ditebalkan.', correctionGuide: 'Tebalkan Raa.', audioHint: 'Raa tebal.', targetMetric: 'Makharij 96%' },
      { id: 'w113-4', arabic: 'ٱلْفَلَقِ', transliteration: 'Al-Falaq', status: 'perfect', tag: 'Qalqalah Kubra', title: 'Pantulan Qaf', icon: 'check_circle', body: 'Qalqalah Kubra Qaf waqaf memantul kuat.', correctionGuide: 'Pantulkan Qaf tegas.', audioHint: 'Pantulan Qaf mantap.', targetMetric: 'Qalqalah 98%' },
      { id: 'w113-5', arabic: 'مِن', transliteration: 'Min', status: 'correct', tag: 'Ikhfa', title: 'Ikhfa Haqiqi', icon: 'check_circle', body: 'Dengung Ikhfa 2 harakat.', correctionGuide: 'Samarkan Nun 2 ketukan.', audioHint: 'Ikhfa 2 ketukan.', targetMetric: 'Tajwid 95%' },
      { id: 'w113-6', arabic: 'شَرِّ', transliteration: 'Syarri', status: 'correct', tag: 'Syin', title: 'Sifat Tafasysyi', icon: 'check_circle', body: 'Syin berhembus.', correctionGuide: 'Alirkan hembusan Syin.', audioHint: 'Syin berdesis.', targetMetric: 'Makharij 95%' },
      { id: 'w113-7', arabic: 'خَلَقَ', transliteration: 'Khalaq', status: 'perfect', tag: 'Qalqalah Kubra', title: 'Kha Tebal & Qaf', icon: 'check_circle', body: 'Kha tenggorokan atas tebal, Qaf memantul.', correctionGuide: 'Pantulkan Qaf saat waqaf.', audioHint: 'Qaf memantul mantap.', targetMetric: 'Qalqalah 97%' },
      { id: 'w113-8', arabic: 'غَاسِقٍ', transliteration: 'Ghāsiqin', status: 'correct', tag: 'Ghain Tebal', title: 'Makhraj Ghain', icon: 'check_circle', body: 'Ghain tebal basah dari tenggorokan atas.', correctionGuide: 'Tebalkan Ghain.', audioHint: 'Ghain tebal.', targetMetric: 'Makharij 96%' },
      { id: 'w113-9', arabic: 'وَقَبَ', transliteration: 'Waqab', status: 'perfect', tag: 'Qalqalah Ba', title: 'Pantulan Ba', icon: 'check_circle', body: 'Ba waqaf memantul bersih.', correctionGuide: 'Lepaskan bibir seketika.', audioHint: 'Pantulan Ba bersih.', targetMetric: 'Qalqalah 98%' }
    ]
  },

  // 3. SURAH AL-IKHLAS (112)
  {
    id: 'surah-112',
    surahNumber: 112,
    ayahNumber: 1,
    surahName: '112. Surah Al-Ikhlas',
    surahArabic: 'سُورَةُ الإِخْلَاصِ',
    sheikhAudioUrl: 'https://everyayah.com/data/Alafasy_128kbps/112001.mp3',
    translation: 'Katakanlah: "Dialah Allah, Yang Maha Esa. Allah adalah Tuhan yang bergantung kepada-Nya segala sesuatu. Dia tiada beranak dan tidak pula diperanakkan."',
    tajweedRule: 'Tafkhim Lafzhul Jalalah, Qalqalah Kubra Waqaf Dal, & Idgham Bilaghunnah',
    idealDurationMinSec: 10,
    idealDurationMaxSec: 24,
    ustadzNote: 'Tebalkan lafazh Allah (ٱللَّهُ) dan mantapkan pantulan Qalqalah Kubra huruf Dal di setiap akhir ayat.',
    words: [
      { id: 'w112-1', arabic: 'قُلْ', transliteration: 'Qul', status: 'perfect', tag: 'Qaf Tebal', title: 'Makhraj Qaf', icon: 'check_circle', body: 'Qaf tebal dari pangkal lidah.', correctionGuide: 'Angkat pangkal lidah.', audioHint: 'Qaf tebal.', targetMetric: 'Makharij 98%' },
      { id: 'w112-2', arabic: 'هُوَ', transliteration: 'Huwa', status: 'correct', tag: 'Harakat', title: 'Vokal Murni', icon: 'check_circle', body: 'Haa dada dan Wawu membulat.', correctionGuide: 'Bulatkan bibir.', audioHint: '1 ketukan.', targetMetric: 'Kelancaran 96%' },
      { id: 'w112-3', arabic: 'ٱللَّهُ', transliteration: 'Allāh', status: 'perfect', tag: 'Tafkhim Lam', title: 'Lafzhul Jalalah', icon: 'check_circle', body: 'Lafazh Allah dibaca tebal (Tafkhim).', correctionGuide: 'Tebalkan Lam Jalalah.', audioHint: 'Tafkhim tebal.', targetMetric: 'Tajwid 99%' },
      { id: 'w112-4', arabic: 'أَحَدٌ', transliteration: 'Ahad', status: 'perfect', tag: 'Qalqalah Dal', title: 'Qalqalah Kubra', icon: 'check_circle', body: 'Dal waqaf memantul kokoh.', correctionGuide: 'Pantulkan Dal tegas.', audioHint: 'Pantulan Dal mantap.', targetMetric: 'Qalqalah 98%' },
      { id: 'w112-5', arabic: 'ٱلصَّمَدُ', transliteration: 'Ash-Shamad', status: 'perfect', tag: 'Shad Tebal', title: 'Makhraj Shad', icon: 'check_circle', body: 'Shad Ithbaq tebal, Dal memantul.', correctionGuide: 'Tebalkan Shad.', audioHint: 'Shad tebal.', targetMetric: 'Makharij 98%' },
      { id: 'w112-6', arabic: 'لَمْ', transliteration: 'Lam', status: 'correct', tag: 'Izhar Syafawi', title: 'Mim Sukun', icon: 'check_circle', body: 'Mim sukun dibaca jelas.', correctionGuide: 'Jangan didengungkan.', audioHint: 'Izhar syafawi.', targetMetric: 'Tajwid 96%' },
      { id: 'w112-7', arabic: 'يَلِدْ', transliteration: 'Yalid', status: 'perfect', tag: 'Qalqalah Dal', title: 'Pantulan Dal', icon: 'check_circle', body: 'Dal sukun memantul bersih.', correctionGuide: 'Pantulkan Dal.', audioHint: 'Dal memantul.', targetMetric: 'Qalqalah 97%' },
      { id: 'w112-8', arabic: 'يُولَدْ', transliteration: 'Yūlad', status: 'perfect', tag: 'Mad & Qalqalah', title: 'Mad & Qalqalah', icon: 'check_circle', body: 'Mad Wawu 2h dan Dal memantul.', correctionGuide: 'Panjangkan mad 2 ketukan.', audioHint: 'Mad 2 ketukan.', targetMetric: 'Qalqalah 98%' }
    ]
  },

  // 4. SURAH AL-MASAD / AL-LAHAB (111)
  {
    id: 'surah-111',
    surahNumber: 111,
    ayahNumber: 1,
    surahName: '111. Surah Al-Masad',
    surahArabic: 'سُورَةُ المَسَدِ',
    sheikhAudioUrl: 'https://everyayah.com/data/Alafasy_128kbps/111001.mp3',
    translation: 'Binasalah kedua tangan Abu Lahab dan sesungguhnya dia akan binasa. Tidaklah berfaedah kepadanya hartanya dan apa yang ia usahakan.',
    tajweedRule: 'Qalqalah Kubra Syadid (Ba Bertasydid Waqaf), Mad Jaiz Munfashil, & Ikhfa',
    idealDurationMinSec: 12,
    idealDurationMaxSec: 28,
    ustadzNote: 'Perhatikan penekanan ekstra Qalqalah Kubra Syadid saat waqaf pada وَتَبَّ (Ba bertasydid waqaf) dengan menahan sejenak sebelum memantul.',
    words: [
      { id: 'w111-1', arabic: 'تَبَّتْ', transliteration: 'Tabbat', status: 'perfect', tag: 'Hams Taa', title: 'Hams Taa Sukun', icon: 'check_circle', body: 'Taa sukun diakhiri hams nafas halus.', correctionGuide: 'Alirkan hams Taa.', audioHint: 'Hams Taa halus.', targetMetric: 'Makharij 97%' },
      { id: 'w111-2', arabic: 'يَدَآ', transliteration: 'Yadā', status: 'correct', tag: 'Mad Jaiz 4h', title: 'Mad Jaiz Munfashil', icon: 'check_circle', body: 'Dipanjangkan 4-5 harakat sebelum Hamzah.', correctionGuide: 'Ayunkan mad 4 ketukan.', audioHint: 'Mad 4 ketukan.', targetMetric: 'Tajwid 96%' },
      { id: 'w111-3', arabic: 'أَبِي', transliteration: 'Abī', status: 'correct', tag: 'Mad 2h', title: 'Mad Thabi’i', icon: 'check_circle', body: 'Mad 2 harakat stabil.', correctionGuide: '2 ketukan.', audioHint: 'Mad 2 ketukan.', targetMetric: 'Tajwid 95%' },
      { id: 'w111-4', arabic: 'لَهَبٍ', transliteration: 'Lahabin', status: 'correct', tag: 'Idgham Bighunnah', title: 'Dengung Tanwin', icon: 'check_circle', body: 'Tanwin masuk ke Wawu dengan dengung 2h.', correctionGuide: 'Tahan dengung 2 ketukan.', audioHint: 'Dengung 2 ketukan.', targetMetric: 'Tajwid 95%' },
      { id: 'w111-5', arabic: 'وَتَبَّ', transliteration: 'Watabb', status: 'perfect', tag: 'Qalqalah Syadid', title: 'Ba Bertasydid Waqaf', icon: 'check_circle', body: 'Tahan tekanan tasydid sekejap lalu lepaskan pantulan Qalqalah Kubra kuat.', correctionGuide: 'Tahan tasydid 1 ketukan lalu pantulkan.', audioHint: 'Qalqalah syadid kuat.', targetMetric: 'Qalqalah 99%' }
    ]
  },

  // 5. SURAH AN-NASR (110)
  {
    id: 'surah-110',
    surahNumber: 110,
    ayahNumber: 1,
    surahName: '110. Surah An-Nasr',
    surahArabic: 'سُورَةُ النَّصْرِ',
    sheikhAudioUrl: 'https://everyayah.com/data/Alafasy_128kbps/11001.mp3',
    translation: 'Apabila telah datang pertolongan Allah dan kemenangan, dan kamu lihat manusia masuk agama Allah dengan berbondong-bondong.',
    tajweedRule: 'Mad Wajib Muttashil (4-5 Harakat), Tafkhim Shad, & Tafkhim/Tarqiq Raa Waqaf',
    idealDurationMinSec: 10,
    idealDurationMaxSec: 25,
    ustadzNote: 'Panjangkan Mad Wajib Muttashil pada جَآءَ selama 4-5 harakat dan tebalkan huruf Shad pada ٱلنَّصْرِ.',
    words: [
      { id: 'w110-1', arabic: 'إِذَا', transliteration: 'Iżā', status: 'correct', tag: 'Dzal Halus', title: 'Makhraj Dzal', icon: 'check_circle', body: 'Dzal lembut dan mad 2 harakat.', correctionGuide: 'Sentuhkan ke gigi seri atas.', audioHint: 'Dzal lembut.', targetMetric: 'Makharij 95%' },
      { id: 'w110-2', arabic: 'جَآءَ', transliteration: 'Jā-a', status: 'perfect', tag: 'Mad Wajib 4h', title: 'Mad Wajib Muttashil', icon: 'check_circle', body: 'Dipanjangkan 4-5 harakat dalam satu kata.', correctionGuide: 'Ayunkan mad 4-5 ketukan.', audioHint: 'Mad wajib 4 ketukan.', targetMetric: 'Tajwid 98%' },
      { id: 'w110-3', arabic: 'نَصْرُ', transliteration: 'Nashru', status: 'perfect', tag: 'Shad Tebal', title: 'Makhraj Shad', icon: 'check_circle', body: 'Shad tebal dengan sifat Ithbaq.', correctionGuide: 'Tebalkan Shad.', audioHint: 'Shad tebal.', targetMetric: 'Makharij 97%' },
      { id: 'w110-4', arabic: 'ٱللَّهِ', transliteration: 'Allāh', status: 'perfect', tag: 'Tafkhim Lam', title: 'Lafzhul Jalalah', icon: 'check_circle', body: 'Lam Jalalah tebal.', correctionGuide: 'Tebalkan Lam.', audioHint: 'Tafkhim tebal.', targetMetric: 'Tajwid 98%' },
      { id: 'w110-5', arabic: 'وَٱلْفَتْحُ', transliteration: 'Wal-Fath', status: 'correct', tag: 'Hams Taa & Haa', title: 'Hams Taa Sukun', icon: 'check_circle', body: 'Hams Taa dan Haa bersih.', correctionGuide: 'Alirkan hams Taa.', audioHint: 'Hams halus.', targetMetric: 'Makharij 96%' }
    ]
  },

  // 6. SURAH AL-KAFIRUN (109)
  {
    id: 'surah-109',
    surahNumber: 109,
    ayahNumber: 1,
    surahName: '109. Surah Al-Kafirun',
    surahArabic: 'سُورَةُ الكَافِرُونَ',
    sheikhAudioUrl: 'https://everyayah.com/data/Alafasy_128kbps/109001.mp3',
    translation: 'Katakanlah: "Hai orang-orang kafir, aku tidak akan menyembah apa yang kamu sembah. Dan kamu bukan penyembah Tuhan yang aku sembah."',
    tajweedRule: 'Mad Jaiz Munfashil (4-5 Harakat), Mad Thabi’i, & Izhar Syafawi',
    idealDurationMinSec: 15,
    idealDurationMaxSec: 35,
    ustadzNote: 'Perhatikan pemanjangan Mad Jaiz Munfashil pada يَآ أَيُّهَا dan لَآ أَعْبُدُ konsisten 4 harakat.',
    words: [
      { id: 'w109-1', arabic: 'قُلْ', transliteration: 'Qul', status: 'perfect', tag: 'Qaf Tebal', title: 'Makhraj Qaf', icon: 'check_circle', body: 'Qaf tebal pangkal lidah.', correctionGuide: 'Tekan Qaf tebal.', audioHint: 'Qaf tebal.', targetMetric: 'Makharij 98%' },
      { id: 'w109-2', arabic: 'يَٰأَيُّهَا', transliteration: 'Yā Ayyuhā', status: 'correct', tag: 'Mad Jaiz 4h', title: 'Mad Jaiz Munfashil', icon: 'check_circle', body: 'Dipanjangkan 4 harakat.', correctionGuide: 'Ayunkan mad 4 ketukan.', audioHint: 'Mad 4 ketukan.', targetMetric: 'Tajwid 96%' },
      { id: 'w109-3', arabic: 'ٱلْكَٰفِرُونَ', transliteration: 'Al-Kāfirūn', status: 'perfect', tag: 'Mad ‘Aridh 4h', title: 'Mad ‘Aridh Lissukun', icon: 'check_circle', body: 'Mad 4 harakat sebelum waqaf Nun.', correctionGuide: 'Panjangkan mad 4 ketukan.', audioHint: 'Mad 4 ketukan.', targetMetric: 'Tajwid 98%' },
      { id: 'w109-4', arabic: 'لَآ', transliteration: 'Lā', status: 'correct', tag: 'Mad Jaiz 4h', title: 'Mad Jaiz Munfashil', icon: 'check_circle', body: 'Dipanjangkan 4 harakat.', correctionGuide: 'Ayunkan mad 4 ketukan.', audioHint: 'Mad 4 ketukan.', targetMetric: 'Tajwid 95%' },
      { id: 'w109-5', arabic: 'أَعْبُدُ', transliteration: 'A‘budu', status: 'correct', tag: '‘Ain Tengah', title: 'Makhraj ‘Ain', icon: 'check_circle', body: '‘Ain bersih dari tenggorokan tengah.', correctionGuide: 'Tekan tengah tenggorokan.', audioHint: '‘Ain bersih.', targetMetric: 'Makharij 96%' }
    ]
  },

  // 7. SURAH AL-KAUTSAR (108)
  {
    id: 'surah-108',
    surahNumber: 108,
    ayahNumber: 1,
    surahName: '108. Surah Al-Kautsar',
    surahArabic: 'سُورَةُ الكَوْثَرِ',
    sheikhAudioUrl: 'https://everyayah.com/data/Alafasy_128kbps/108001.mp3',
    translation: 'Sesungguhnya Kami telah memberikan kepadamu nikmat yang banyak. Maka dirikanlah shalat karena Tuhanmu; dan berkorbanlah.',
    tajweedRule: 'Ghunnah Musyaddadah, Mad Jaiz Munfashil 4-5 Harakat, & Izhar Halqi',
    idealDurationMinSec: 8,
    idealDurationMaxSec: 20,
    ustadzNote: 'Panjangkan Mad Jaiz Munfashil pada إِنَّآ أَعْطَيْنَٰكَ selama 4-5 harakat dan tahan Ghunnah Nun 2 harakat.',
    words: [
      { id: 'w108-1', arabic: 'إِنَّآ', transliteration: 'Innā', status: 'perfect', tag: 'Ghunnah & Mad', title: 'Ghunnah & Mad Jaiz', icon: 'check_circle', body: 'Dengung Nun 2h dan Mad Jaiz 4h.', correctionGuide: 'Tahan dengung 2 ketukan.', audioHint: 'Dengung 2 ketukan.', targetMetric: 'Tajwid 98%' },
      { id: 'w108-2', arabic: 'أَعْطَيْنَٰكَ', transliteration: 'A‘thaināka', status: 'correct', tag: 'Thaa Tebal', title: 'Thaa Ithbaq', icon: 'check_circle', body: 'Thaa tebal dan ‘Ain bersih.', correctionGuide: 'Tebalkan Thaa.', audioHint: 'Thaa tebal.', targetMetric: 'Makharij 96%' },
      { id: 'w108-3', arabic: 'ٱلْكَوْثَرَ', transliteration: 'Al-Kautsar', status: 'perfect', tag: 'Tsaa Halus', title: 'Makhraj Tsaa', icon: 'check_circle', body: 'Tsaa berdesis di ujung lidah.', correctionGuide: 'Sentuhkan ke gigi seri atas.', audioHint: 'Tsaa berdesis.', targetMetric: 'Makharij 97%' },
      { id: 'w108-4', arabic: 'فَصَلِّ', transliteration: 'Fashalli', status: 'correct', tag: 'Shad Tebal', title: 'Makhraj Shad', icon: 'check_circle', body: 'Shad tebal dan Lam bertasydid.', correctionGuide: 'Tebalkan Shad.', audioHint: 'Shad tebal.', targetMetric: 'Makharij 95%' },
      { id: 'w108-5', arabic: 'وَٱنْحَرْ', transliteration: 'Wanhar', status: 'perfect', tag: 'Izhar Halqi', title: 'Izhar Nun Sukun', icon: 'check_circle', body: 'Nun sukun dibaca terang tanpa dengung.', correctionGuide: 'Baca Nun terang.', audioHint: 'Izhar terang.', targetMetric: 'Tajwid 98%' }
    ]
  },

  // 8. SURAH AL-MA'UN (107)
  {
    id: 'surah-107',
    surahNumber: 107,
    ayahNumber: 1,
    surahName: '107. Surah Al-Ma\'un',
    surahArabic: 'سُورَةُ المَاعُونِ',
    sheikhAudioUrl: 'https://everyayah.com/data/Alafasy_128kbps/107001.mp3',
    translation: 'Tahukah kamu orang yang mendustakan agama? Itulah orang yang menghardik anak yatim, dan tidak menganjurkan memberi makan orang miskin.',
    tajweedRule: 'Mad Thabi’i, Mad ‘Aridh Lissukun, & Idgham Bighunnah',
    idealDurationMinSec: 12,
    idealDurationMaxSec: 28,
    ustadzNote: 'Perhatikan makhraj huruf Hamzah dan ‘Ain pada أَرَأَيْتَ dan murnikan vokal Mad ‘Aridh Lissukun di akhir ayat.',
    words: [
      { id: 'w107-1', arabic: 'أَرَأَيْتَ', transliteration: 'Ara-aita', status: 'correct', tag: 'Hamzah Murni', title: 'Makhraj Hamzah', icon: 'check_circle', body: 'Dua Hamzah terbaca murni tanpa tasyhil.', correctionGuide: 'Bunyikan Hamzah tegas.', audioHint: 'Hamzah murni.', targetMetric: 'Makharij 96%' },
      { id: 'w107-2', arabic: 'ٱلَّذِى', transliteration: 'Alladzī', status: 'correct', tag: 'Dzal Halus', title: 'Makhraj Dzal', icon: 'check_circle', body: 'Dzal lembut di ujung lidah.', correctionGuide: 'Sentuhkan ke gigi seri atas.', audioHint: 'Dzal lembut.', targetMetric: 'Tajwid 95%' },
      { id: 'w107-3', arabic: 'يُكَذِّبُ', transliteration: 'Yukażżibu', status: 'correct', tag: 'Tasydid Dzal', title: 'Tasydid Dzal', icon: 'check_circle', body: 'Penekanan tasydid Dzal lembut.', correctionGuide: 'Tahan sejenak.', audioHint: 'Tasydid lembut.', targetMetric: 'Makharij 95%' },
      { id: 'w107-4', arabic: 'بِٱلدِّينِ', transliteration: 'Bid-Dīn', status: 'perfect', tag: 'Mad ‘Aridh 4h', title: 'Mad ‘Aridh Lissukun', icon: 'check_circle', body: 'Mad 4 harakat tenang sebelum Nun.', correctionGuide: 'Panjangkan mad 4 ketukan.', audioHint: 'Mad 4 ketukan.', targetMetric: 'Tajwid 98%' }
    ]
  },

  // 9. SURAH QURAISY (106)
  {
    id: 'surah-106',
    surahNumber: 106,
    ayahNumber: 1,
    surahName: '106. Surah Quraisy',
    surahArabic: 'سُورَةُ قُرَيْشٍ',
    sheikhAudioUrl: 'https://everyayah.com/data/Alafasy_128kbps/106001.mp3',
    translation: 'Karena kebiasaan orang-orang Quraisy, (yaitu) kebiasaan mereka bepergian pada musim dingin dan musim panas.',
    tajweedRule: 'Mad Layyin (2-4 Harakat Waqaf), Qaf Tebal, & Izhar Syafawi',
    idealDurationMinSec: 10,
    idealDurationMaxSec: 22,
    ustadzNote: 'Lembutkan aliran Mad Layyin pada قُرَيْشٍ dan ٱلصَّيْفِ dengan kelenturan 2-4 harakat saat waqaf.',
    words: [
      { id: 'w106-1', arabic: 'لِإِيلَٰفِ', transliteration: 'Li-īlāfi', status: 'correct', tag: 'Mad 2h', title: 'Mad Badal & Thabi’i', icon: 'check_circle', body: 'Mad 2 harakat teratur.', correctionGuide: '2 ketukan.', audioHint: 'Mad 2 ketukan.', targetMetric: 'Tajwid 95%' },
      { id: 'w106-2', arabic: 'قُرَيْشٍ', transliteration: 'Quraisy', status: 'perfect', tag: 'Mad Layyin 4h', title: 'Mad Layyin Waqaf', icon: 'check_circle', body: 'Ya sukun dialirkan lentur 4 harakat waqaf.', correctionGuide: 'Lembutkan perputaran bibir.', audioHint: 'Layyin lentur.', targetMetric: 'Tajwid 98%' },
      { id: 'w106-3', arabic: 'إِۦلَٰفِهِمْ', transliteration: 'Īlāfihim', status: 'correct', tag: 'Izhar Syafawi', title: 'Mim Sukun', icon: 'check_circle', body: 'Mim sukun dibaca jelas.', correctionGuide: 'Rapatkan bibir sekejap.', audioHint: 'Izhar syafawi.', targetMetric: 'Tajwid 96%' },
      { id: 'w106-4', arabic: 'ٱلصَّيْفِ', transliteration: 'Ash-Shaif', status: 'perfect', tag: 'Mad Layyin Waqaf', title: 'Shad Tebal & Layyin', icon: 'check_circle', body: 'Shad tebal dan Ya layyin dialirkan mulus.', correctionGuide: 'Tebalkan Shad.', audioHint: 'Shad tebal layyin.', targetMetric: 'Makharij 98%' }
    ]
  },

  // 10. SURAH AL-FIL (105)
  {
    id: 'surah-105',
    surahNumber: 105,
    ayahNumber: 1,
    surahName: '105. Surah Al-Fil',
    surahArabic: 'سُورَةُ الفِيلِ',
    sheikhAudioUrl: 'https://everyayah.com/data/Alafasy_128kbps/105001.mp3',
    translation: 'Apakah kamu tidak memperhatikan bagaimana Tuhanmu telah bertindak terhadap tentara bergajah? Bukankah Dia telah menjadikan tipu daya mereka itu sia-sia?',
    tajweedRule: 'Izhar Syafawi (Mim Sukun Terang), Tarqiq/Tafkhim Raa, & Mad ‘Aridh Lissukun',
    idealDurationMinSec: 12,
    idealDurationMaxSec: 28,
    ustadzNote: 'Perhatikan Izhar Syafawi pada أَلَمْ تَرَ dan كَيْدَهُمْ فِي agar suara Mim sukun tidak mendengung.',
    words: [
      { id: 'w105-1', arabic: 'أَلَمْ', transliteration: 'Alam', status: 'correct', tag: 'Izhar Syafawi', title: 'Mim Sukun Terang', icon: 'check_circle', body: 'Mim sukun jelas tanpa dengung.', correctionGuide: 'Jangan didengungkan.', audioHint: 'Izhar syafawi.', targetMetric: 'Tajwid 96%' },
      { id: 'w105-2', arabic: 'تَرَ', transliteration: 'Tara', status: 'correct', tag: 'Tafkhim Raa', title: 'Raa Fathah', icon: 'check_circle', body: 'Raa fathah ditebalkan.', correctionGuide: 'Tebalkan Raa.', audioHint: 'Raa tebal.', targetMetric: 'Makharij 95%' },
      { id: 'w105-3', arabic: 'كَيْفَ', transliteration: 'Kaifa', status: 'correct', tag: 'Mad Layyin', title: 'Kelunakan Ya Sukun', icon: 'check_circle', body: 'Ya sukun dialirkan lentur.', correctionGuide: 'Alirkan lentur.', audioHint: 'Layyin lentur.', targetMetric: 'Tajwid 95%' },
      { id: 'w105-4', arabic: 'فَعَلَ', transliteration: 'Fa‘ala', status: 'correct', tag: '‘Ain Tengah', title: 'Makhraj ‘Ain', icon: 'check_circle', body: '‘Ain dari tengah tenggorokan.', correctionGuide: 'Tekan tengah tenggorokan.', audioHint: '‘Ain bersih.', targetMetric: 'Makharij 95%' },
      { id: 'w105-5', arabic: 'بِأَصْحَٰبِ', transliteration: 'Bi-Ash-hābi', status: 'perfect', tag: 'Shad Tebal & Haa', title: 'Makhraj Shad & Haa', icon: 'check_circle', body: 'Shad Ithbaq tebal dan Haa bersih.', correctionGuide: 'Tebalkan Shad.', audioHint: 'Shad tebal.', targetMetric: 'Makharij 97%' },
      { id: 'w105-6', arabic: 'ٱلْفِيلِ', transliteration: 'Al-Fīl', status: 'perfect', tag: 'Mad ‘Aridh 4h', title: 'Mad ‘Aridh Lissukun', icon: 'check_circle', body: 'Mad 4 harakat tenang sebelum Lam.', correctionGuide: 'Panjangkan mad 4 ketukan.', audioHint: 'Mad 4 ketukan.', targetMetric: 'Tajwid 98%' }
    ]
  },

  // 11. SURAH AL-HUMAZAH (104)
  {
    id: 'surah-104',
    surahNumber: 104,
    ayahNumber: 1,
    surahName: '104. Surah Al-Humazah',
    surahArabic: 'سُورَةُ الهُمَزَةِ',
    sheikhAudioUrl: 'https://everyayah.com/data/Alafasy_128kbps/104001.mp3',
    translation: 'Kecelakaanlah bagi setiap pengumpat lagi pencela, yang mengumpulkan harta dan menghitung-hitungnya.',
    tajweedRule: 'Idgham Bighunnah/Bilaghunnah, Ghunnah Musyaddadah, & Iqlab',
    idealDurationMinSec: 12,
    idealDurationMaxSec: 28,
    ustadzNote: 'Leburkan tanwin tanpa dengung pada وَيْلٌ لِّكُلِّ (Idgham Bilaghunnah) dan dengungkan Idgham Bighunnah pada هُمَزَةٍ لُّمَزَةٍ.',
    words: [
      { id: 'w104-1', arabic: 'وَيْلٌ', transliteration: 'Wailun', status: 'perfect', tag: 'Idgham Bilaghunnah', title: 'Tanwin ke Lam', icon: 'check_circle', body: 'Tanwin melebur ke Lam tanpa dengung.', correctionGuide: 'Leburkan langsung tanpa dengung.', audioHint: 'Tanpa dengung.', targetMetric: 'Tajwid 98%' },
      { id: 'w104-2', arabic: 'لِّكُلِّ', transliteration: 'Likulli', status: 'correct', tag: 'Tasydid Lam', title: 'Penekanan Lam', icon: 'check_circle', body: 'Lam bertasydid tegas.', correctionGuide: 'Tahan tasydid Lam.', audioHint: 'Tasydid tegas.', targetMetric: 'Makharij 95%' },
      { id: 'w104-3', arabic: 'هُمَزَةٍ', transliteration: 'Humazatin', status: 'correct', tag: 'Haa Dada', title: 'Makhraj Haa', icon: 'check_circle', body: 'Haa dari pangkal tenggorokan.', correctionGuide: 'Keluarkan dari dada.', audioHint: 'Haa dada.', targetMetric: 'Makharij 95%' },
      { id: 'w104-4', arabic: 'لُّمَزَةٍ', transliteration: 'Lumazah', status: 'perfect', tag: 'Haa Marbuthah Waqaf', title: 'Waqaf Haa', icon: 'check_circle', body: 'Taa marbuthah berubah menjadi Haa sukun saat waqaf.', correctionGuide: 'Matikan menjadi Haa sukun.', audioHint: 'Haa sukun bersih.', targetMetric: 'Tajwid 98%' }
    ]
  },

  // 12. SURAH AL-'ASR (103)
  {
    id: 'surah-103',
    surahNumber: 103,
    ayahNumber: 1,
    surahName: '103. Surah Al-\'Asr',
    surahArabic: 'سُورَةُ العَصْرِ',
    sheikhAudioUrl: 'https://everyayah.com/data/Alafasy_128kbps/103001.mp3',
    translation: 'Demi masa. Sesungguhnya manusia itu benar-benar dalam kerugian, kecuali orang-orang yang beriman dan mengerjakan amal shaleh.',
    tajweedRule: 'Tafkhim Raa Waqaf, Ghunnah Musyaddadah, & Ikhfa Haqiqi',
    idealDurationMinSec: 10,
    idealDurationMaxSec: 22,
    ustadzNote: 'Tebalkan huruf Shad pada ٱلْعَصْرِ dan kunci Raa waqaf dengan ketebalan (Tafkhim) yang kokoh.',
    words: [
      { id: 'w103-1', arabic: 'وَٱلْعَصْرِ', transliteration: 'Wal-‘Ashr', status: 'perfect', tag: 'Shad Tebal & Raa', title: 'Makhraj Shad & Raa', icon: 'check_circle', body: 'Shad Ithbaq tebal, Raa waqaf ditebalkan mantap.', correctionGuide: 'Tebalkan Shad dan Raa.', audioHint: 'Shad dan Raa tebal.', targetMetric: 'Makharij 99%' },
      { id: 'w103-2', arabic: 'إِنَّ', transliteration: 'Inna', status: 'perfect', tag: 'Ghunnah 2h', title: 'Ghunnah Musyaddadah', icon: 'check_circle', body: 'Dengung Nun bertasydid 2 harakat.', correctionGuide: 'Tahan dengung 2 ketukan.', audioHint: 'Dengung 2 ketukan.', targetMetric: 'Tajwid 98%' },
      { id: 'w103-3', arabic: 'ٱلْإِنسَٰنَ', transliteration: 'Al-Insāna', status: 'correct', tag: 'Ikhfa', title: 'Ikhfa Haqiqi', icon: 'check_circle', body: 'Nun sukun sebelum Sin disamarkan.', correctionGuide: 'Samarkan Nun 2 ketukan.', audioHint: 'Ikhfa 2 ketukan.', targetMetric: 'Ikhfa 95%' },
      { id: 'w103-4', arabic: 'لَفِى', transliteration: 'Lafī', status: 'correct', tag: 'Mad 2h', title: 'Mad Thabi’i', icon: 'check_circle', body: 'Mad 2 harakat Faa.', correctionGuide: '2 ketukan.', audioHint: 'Mad 2 ketukan.', targetMetric: 'Tajwid 95%' },
      { id: 'w103-5', arabic: 'خُسْرٍ', transliteration: 'Khusr', status: 'perfect', tag: 'Kha & Raa Tebal', title: 'Tafkhim Kha & Raa', icon: 'check_circle', body: 'Kha tenggorokan atas tebal, Raa waqaf tebal.', correctionGuide: 'Tebalkan Kha dan Raa.', audioHint: 'Kha dan Raa tebal.', targetMetric: 'Makharij 98%' }
    ]
  },

  // 13. SURAH AT-TAKASUR (102)
  {
    id: 'surah-102',
    surahNumber: 102,
    ayahNumber: 1,
    surahName: '102. Surah At-Takasur',
    surahArabic: 'سُورَةُ التَّكَاثُرِ',
    sheikhAudioUrl: 'https://everyayah.com/data/Alafasy_128kbps/102001.mp3',
    translation: 'Bermegah-megahan telah melalaikan kamu, sampai kamu masuk ke dalam kubur. Jangan sekali-kali demikian, kelak kamu akan mengetahui.',
    tajweedRule: 'Makhraj Tsaa, Izhar Syafawi, & Mad ‘Aridh Lissukun',
    idealDurationMinSec: 12,
    idealDurationMaxSec: 28,
    ustadzNote: 'Perhatikan makhraj huruf Tsaa (ث) pada ٱلتَّكَاثُرُ agar tidak tertukar dengan huruf Sin.',
    words: [
      { id: 'w102-1', arabic: 'أَلْهَىٰكُمُ', transliteration: 'Alhākumu', status: 'correct', tag: 'Haa Dada', title: 'Makhraj Haa', icon: 'check_circle', body: 'Haa dari pangkal tenggorokan.', correctionGuide: 'Keluarkan dari dada.', audioHint: 'Haa dada.', targetMetric: 'Makharij 95%' },
      { id: 'w102-2', arabic: 'ٱلتَّكَاثُرُ', transliteration: 'At-Takātsur', status: 'perfect', tag: 'Tsaa Halus', title: 'Makhraj Tsaa', icon: 'check_circle', body: 'Tsaa berdesis lembut di ujung lidah.', correctionGuide: 'Sentuhkan ke gigi seri atas.', audioHint: 'Tsaa berdesis.', targetMetric: 'Makharij 98%' },
      { id: 'w102-3', arabic: 'حَتَّىٰ', transliteration: 'Hattā', status: 'correct', tag: 'Haa Halus', title: 'Makhraj Haa', icon: 'check_circle', body: 'Haa bersih dari tengah tenggorokan.', correctionGuide: 'Tekan tengah tenggorokan.', audioHint: 'Haa bersih.', targetMetric: 'Makharij 96%' },
      { id: 'w102-4', arabic: 'زُرْتُمُ', transliteration: 'Zurtumu', status: 'correct', tag: 'Raa Tebal', title: 'Tafkhim Raa Sukun', icon: 'check_circle', body: 'Raa sukun setelah dhommah ditebalkan.', correctionGuide: 'Tebalkan Raa.', audioHint: 'Raa tebal.', targetMetric: 'Tajwid 95%' },
      { id: 'w102-5', arabic: 'ٱلْمَقَابِرَ', transliteration: 'Al-Maqābir', status: 'perfect', tag: 'Qaf Tebal', title: 'Makhraj Qaf', icon: 'check_circle', body: 'Qaf tebal pangkal lidah, Raa waqaf tipis.', correctionGuide: 'Tebalkan Qaf.', audioHint: 'Qaf tebal.', targetMetric: 'Makharij 98%' }
    ]
  },

  // 14. SURAH AL-QARI'AH (101)
  {
    id: 'surah-101',
    surahNumber: 101,
    ayahNumber: 1,
    surahName: '101. Surah Al-Qari\'ah',
    surahArabic: 'سُورَةُ القَارِعَةِ',
    sheikhAudioUrl: 'https://everyayah.com/data/Alafasy_128kbps/101001.mp3',
    translation: 'Hari Kiamat, apakah hari Kiamat itu? Tahukah kamu apakah hari Kiamat itu? Pada hari itu manusia adalah seperti anai-anai yang bertebaran.',
    tajweedRule: 'Qaf Tebal, ‘Ain Wasathul Halq, & Ghunnah Musyaddadah',
    idealDurationMinSec: 12,
    idealDurationMaxSec: 28,
    ustadzNote: 'Tebalkan huruf Qaf pada ٱلْقَارِعَةُ dan bunyikan huruf ‘Ain dari tengah tenggorokan secara murni.',
    words: [
      { id: 'w101-1', arabic: 'ٱلْقَارِعَةُ', transliteration: 'Al-Qāri‘ah', status: 'perfect', tag: 'Qaf Tebal & ‘Ain', title: 'Makhraj Qaf & ‘Ain', icon: 'check_circle', body: 'Qaf tebal, Raa kasrah tipis, ‘Ain murni.', correctionGuide: 'Tebalkan Qaf dan bersihkan ‘Ain.', audioHint: 'Qaf tebal ‘Ain bersih.', targetMetric: 'Makharij 98%' },
      { id: 'w101-2', arabic: 'مَا', transliteration: 'Mā', status: 'correct', tag: 'Mad 2h', title: 'Mad Thabi’i', icon: 'check_circle', body: 'Mad 2 harakat.', correctionGuide: '2 ketukan.', audioHint: 'Mad 2 ketukan.', targetMetric: 'Tajwid 95%' },
      { id: 'w101-3', arabic: 'ٱلْقَارِعَةُ', transliteration: 'Al-Qāri‘ah', status: 'perfect', tag: 'Fasih', title: 'Pengulangan Kata', icon: 'check_circle', body: 'Pengulangan fasih dan konsisten.', correctionGuide: 'Pertahankan makhraj.', audioHint: 'Fasih.', targetMetric: 'Tajwid 98%' }
    ]
  },

  // 15. SURAH AL-'ADIYAT (100)
  {
    id: 'surah-100',
    surahNumber: 100,
    ayahNumber: 1,
    surahName: '100. Surah Al-\'Adiyat',
    surahArabic: 'سُورَةُ العَادِيَاتِ',
    sheikhAudioUrl: 'https://everyayah.com/data/Alafasy_128kbps/100001.mp3',
    translation: 'Demi kuda perang yang berlari kencang dengan terengah-engah, dan kuda yang mencetuskan percikan api dengan pukulan (kuku kakinya).',
    tajweedRule: 'Mad ‘Iwadh (2 Harakat Waqaf), Qalqalah Sughra, & Izhar Syafawi',
    idealDurationMinSec: 12,
    idealDurationMaxSec: 28,
    ustadzNote: 'Ganti tanwin fathatain menjadi Mad ‘Iwadh 2 harakat saat waqaf pada ضَبْحًا, قَدْحًا, dan صُبْحًا.',
    words: [
      { id: 'w100-1', arabic: 'وَٱلْعَٰدِيَٰتِ', transliteration: 'Wal-‘Ādiyāti', status: 'correct', tag: '‘Ain Wasath', title: 'Makhraj ‘Ain', icon: 'check_circle', body: '‘Ain tengah tenggorokan bersih.', correctionGuide: 'Tekan tengah tenggorokan.', audioHint: '‘Ain bersih.', targetMetric: 'Makharij 96%' },
      { id: 'w100-2', arabic: 'ضَبْحًا', transliteration: 'Dhabhā', status: 'perfect', tag: 'Dhad Ithbaq & Qalqalah', title: 'Dhad & Qalqalah Ba', icon: 'check_circle', body: 'Dhad tebal tepi lidah, Ba memantul, Mad ‘Iwadh 2h.', correctionGuide: 'Tebalkan Dhad tepi lidah.', audioHint: 'Dhad tebal Ba memantul.', targetMetric: 'Makharij 98%' },
      { id: 'w100-3', arabic: 'فَٱلْمُورِيَٰتِ', transliteration: 'Fal-Mūriyāti', status: 'correct', tag: 'Mad Wawu', title: 'Mad Thabi’i', icon: 'check_circle', body: 'Mad 2 harakat lembut.', correctionGuide: '2 ketukan.', audioHint: 'Mad 2 ketukan.', targetMetric: 'Tajwid 95%' },
      { id: 'w100-4', arabic: 'قَدْحًا', transliteration: 'Qadhā', status: 'perfect', tag: 'Qaf & Qalqalah Dal', title: 'Qaf & Qalqalah Dal', icon: 'check_circle', body: 'Qaf tebal, Dal sukun memantul bersih.', correctionGuide: 'Pantulkan Dal.', audioHint: 'Dal memantul.', targetMetric: 'Qalqalah 98%' }
    ]
  },

  // 16. SURAH AZ-ZALZALAH (99)
  {
    id: 'surah-99',
    surahNumber: 99,
    ayahNumber: 1,
    surahName: '99. Surah Az-Zalzalah',
    surahArabic: 'سُورَةُ الزَّلْزَلَةِ',
    sheikhAudioUrl: 'https://everyayah.com/data/Alafasy_128kbps/099001.mp3',
    translation: 'Apabila bumi digoncangkan dengan goncangan yang dahsyat, dan bumi telah mengeluarkan beban-beban berat (yang dikandung)nya.',
    tajweedRule: 'Shafir Huruf Zay, Idgham Bighunnah/Bilaghunnah, & Ikhfa',
    idealDurationMinSec: 12,
    idealDurationMaxSec: 28,
    ustadzNote: 'Jaga kejelasan desis Shafir tajm pada huruf Zay (ز) dan dengungkan Idgham Bighunnah pada فَمَن يَعْمَلْ.',
    words: [
      { id: 'w99-1', arabic: 'إِذَا', transliteration: 'Iżā', status: 'correct', tag: 'Dzal Halus', title: 'Makhraj Dzal', icon: 'check_circle', body: 'Dzal lembut di ujung lidah.', correctionGuide: 'Sentuhkan ke gigi seri atas.', audioHint: 'Dzal lembut.', targetMetric: 'Makharij 95%' },
      { id: 'w99-2', arabic: 'زُلْزِلَتِ', transliteration: 'Zulzilati', status: 'perfect', tag: 'Shafir Zay', title: 'Sifat Shafir Huruf Zay', icon: 'check_circle', body: 'Desis tajam seperti lebah pada huruf Zay.', correctionGuide: 'Bunyikan desis Zay tajam.', audioHint: 'Shafir Zay tajam.', targetMetric: 'Makharij 98%' },
      { id: 'w99-3', arabic: 'ٱلْأَرْضُ', transliteration: 'Al-Ardhu', status: 'perfect', tag: 'Dhad Ithbaq', title: 'Makhraj Dhad', icon: 'check_circle', body: 'Dhad ditebalkan dari tepi lidah menempel geraham.', correctionGuide: 'Tekan tepi lidah ke geraham atas.', audioHint: 'Dhad tebal.', targetMetric: 'Makharij 98%' },
      { id: 'w99-4', arabic: 'زِلْزَالَهَا', transliteration: 'Zilzālahā', status: 'correct', tag: 'Mad 2h', title: 'Mad Thabi’i', icon: 'check_circle', body: 'Dua Mad Thabi’i 2 harakat stabil.', correctionGuide: '2 ketukan stabil.', audioHint: 'Mad 2 ketukan.', targetMetric: 'Tajwid 96%' }
    ]
  },

  // 17. SURAH AL-BAYYINAH (98)
  {
    id: 'surah-98',
    surahNumber: 98,
    ayahNumber: 1,
    surahName: '98. Surah Al-Bayyinah',
    surahArabic: 'سُورَةُ البَيِّنَةِ',
    sheikhAudioUrl: 'https://everyayah.com/data/Alafasy_128kbps/098001.mp3',
    translation: 'Orang-orang kafir yakni ahli kitab dan orang-orang musyrik (sayang) tidak akan meninggalkan (agamanya) sebelum datang kepada mereka bukti yang nyata.',
    tajweedRule: 'Tasydid Ya dengan Nabrah, Mad Wajib Muttashil, & Izhar Halqi',
    idealDurationMinSec: 15,
    idealDurationMaxSec: 35,
    ustadzNote: 'Berikan penekanan Nabrah pada huruf Ya bertasydid (ٱلْبَيِّنَةُ) tanpa menghentak kasar.',
    words: [
      { id: 'w98-1', arabic: 'لَمْ', transliteration: 'Lam', status: 'correct', tag: 'Izhar Syafawi', title: 'Mim Sukun', icon: 'check_circle', body: 'Mim sukun terang tanpa dengung.', correctionGuide: 'Jangan didengungkan.', audioHint: 'Izhar syafawi.', targetMetric: 'Tajwid 96%' },
      { id: 'w98-2', arabic: 'يَكُنِ', transliteration: 'Yakuni', status: 'correct', tag: 'Harakat Short', title: 'Vokal Pendek', icon: 'check_circle', body: '1 harakat pendek.', correctionGuide: 'Jangan diseret.', audioHint: '1 ketukan.', targetMetric: 'Kelancaran 95%' },
      { id: 'w98-3', arabic: 'ٱلَّذِينَ', transliteration: 'Allażīna', status: 'correct', tag: 'Dzal Halus', title: 'Makhraj Dzal', icon: 'check_circle', body: 'Dzal lembut di ujung lidah.', correctionGuide: 'Sentuhkan ke gigi seri atas.', audioHint: 'Dzal lembut.', targetMetric: 'Makharij 95%' },
      { id: 'w98-4', arabic: 'كَفَرُوا۟', transliteration: 'Kafarū', status: 'correct', tag: 'Tafkhim Raa', title: 'Raa Dhommah', icon: 'check_circle', body: 'Raa ditebalkan dengan dhommah.', correctionGuide: 'Tebalkan Raa.', audioHint: 'Raa tebal.', targetMetric: 'Tajwid 95%' },
      { id: 'w98-5', arabic: 'ٱلْبَيِّنَةُ', transliteration: 'Al-Bayyinah', status: 'perfect', tag: 'Tasydid Ya & Haa', title: 'Nabrah Ya & Waqaf Haa', icon: 'check_circle', body: 'Penekanan Nabrah pada Ya bertasydid, waqaf Haa sukun.', correctionGuide: 'Tahan tasydid Ya sekejap.', audioHint: 'Nabrah Ya mantap.', targetMetric: 'Makharij 98%' }
    ]
  },

  // 18. SURAH AL-QADR (97)
  {
    id: 'surah-97',
    surahNumber: 97,
    ayahNumber: 1,
    surahName: '97. Surah Al-Qadr',
    surahArabic: 'سُورَةُ القَدْرِ',
    sheikhAudioUrl: 'https://everyayah.com/data/Alafasy_128kbps/097001.mp3',
    translation: 'Sesungguhnya Kami telah meurunkan Al-Qur\'an pada malam kemuliaan. Dan tahukah kamu apakah malam kemuliaan itu?',
    tajweedRule: 'Ghunnah Musyaddadah, Mad Jaiz Munfashil 4-5 Harakat, & Qalqalah Sughra/Kubra',
    idealDurationMinSec: 10,
    idealDurationMaxSec: 25,
    ustadzNote: 'Panjangkan Mad Jaiz Munfashil pada إِنَّآ أَنزَلْنَٰهُ selama 4-5 harakat dan pantulkan Qalqalah Dal pada ٱلْقَدْرِ.',
    words: [
      { id: 'w97-1', arabic: 'إِنَّآ', transliteration: 'Innā', status: 'perfect', tag: 'Ghunnah & Mad', title: 'Ghunnah & Mad Jaiz', icon: 'check_circle', body: 'Dengung Nun 2h dan Mad Jaiz 4h.', correctionGuide: 'Tahan dengung 2 ketukan.', audioHint: 'Dengung 2 ketukan.', targetMetric: 'Tajwid 98%' },
      { id: 'w97-2', arabic: 'أَنزَلْنَٰهُ', transliteration: 'Anzalnāhu', status: 'correct', tag: 'Ikhfa Haqiqi', title: 'Ikhfa Nun Sebelum Zay', icon: 'check_circle', body: 'Nun sukun disamarkan dengan dengung 2h.', correctionGuide: 'Samarkan Nun.', audioHint: 'Ikhfa 2 ketukan.', targetMetric: 'Ikhfa 95%' },
      { id: 'w97-3', arabic: 'فِى', transliteration: 'Fī', status: 'correct', tag: 'Mad 2h', title: 'Mad Thabi’i', icon: 'check_circle', body: 'Mad 2 harakat Faa.', correctionGuide: '2 ketukan.', audioHint: 'Mad 2 ketukan.', targetMetric: 'Tajwid 95%' },
      { id: 'w97-4', arabic: 'لَيْلَةِ', transliteration: 'Lailati', status: 'correct', tag: 'Mad Layyin', title: 'Kelunakan Ya Sukun', icon: 'check_circle', body: 'Ya sukun dialirkan lentur.', correctionGuide: 'Alirkan lentur.', audioHint: 'Layyin lentur.', targetMetric: 'Tajwid 95%' },
      { id: 'w97-5', arabic: 'ٱلْقَدْرِ', transliteration: 'Al-Qadr', status: 'perfect', tag: 'Qaf Tebal & Qalqalah', title: 'Qaf & Qalqalah Dal', icon: 'check_circle', body: 'Qaf tebal pangkal lidah, Dal sukun memantul.', correctionGuide: 'Tebalkan Qaf dan pantulkan Dal.', audioHint: 'Qaf tebal Dal memantul.', targetMetric: 'Qalqalah 98%' }
    ]
  },

  // 19. SURAH AL-'ALAQ (96)
  {
    id: 'surah-96',
    surahNumber: 96,
    ayahNumber: 1,
    surahName: '96. Surah Al-\'Alaq',
    surahArabic: 'سُورَةُ العَلَقِ',
    sheikhAudioUrl: 'https://everyayah.com/data/Alafasy_128kbps/096001.mp3',
    translation: 'Bacalah dengan (menyebut) nama Tuhanmu Yang menciptakan, Dia telah menciptakan manusia dari segumpal darah.',
    tajweedRule: 'Qalqalah Qaf Waqaf, Makhraj Hamzah & ‘Ain, & Ikhfa Haqiqi',
    idealDurationMinSec: 10,
    idealDurationMaxSec: 25,
    ustadzNote: 'Mantapkan pantulan Qalqalah Kubra pada akhir ayat ٱقْرَأْ dan ٱلْعَلَقِ.',
    words: [
      { id: 'w96-1', arabic: 'ٱقْرَأْ', transliteration: 'Iqra’', status: 'perfect', tag: 'Qalqalah Qaf', title: 'Qalqalah Qaf & Hamzah', icon: 'check_circle', body: 'Qaf sukun memantul tebal, Hamzah sukun mati tanpa pantulan.', correctionGuide: 'Pantulkan Qaf tebal.', audioHint: 'Qaf memantul tebal.', targetMetric: 'Qalqalah 98%' },
      { id: 'w96-2', arabic: 'بِٱسْمِ', transliteration: 'Bismi', status: 'correct', tag: 'Hams Sin', title: 'Makhraj Sin', icon: 'check_circle', body: 'Sin sukun berdesis halus.', correctionGuide: 'Alirkan hams Sin.', audioHint: 'Desis Sin.', targetMetric: 'Makharij 96%' },
      { id: 'w96-3', arabic: 'رَبِّكَ', transliteration: 'Rabbika', status: 'correct', tag: 'Tafkhim Raa', title: 'Raa Fathah', icon: 'check_circle', body: 'Raa bertasydid ditebalkan.', correctionGuide: 'Tebalkan Raa.', audioHint: 'Raa tebal.', targetMetric: 'Tajwid 95%' },
      { id: 'w96-4', arabic: 'ٱلَّذِى', transliteration: 'Allażī', status: 'correct', tag: 'Dzal Halus', title: 'Makhraj Dzal', icon: 'check_circle', body: 'Dzal lembut di ujung lidah.', correctionGuide: 'Sentuhkan ke gigi seri atas.', audioHint: 'Dzal lembut.', targetMetric: 'Makharij 95%' },
      { id: 'w96-5', arabic: 'خَلَقَ', transliteration: 'Khalaq', status: 'perfect', tag: 'Qalqalah Qaf', title: 'Kha Tebal & Qaf', icon: 'check_circle', body: 'Kha tenggorokan atas tebal, Qaf waqaf memantul.', correctionGuide: 'Pantulkan Qaf saat waqaf.', audioHint: 'Qaf memantul.', targetMetric: 'Qalqalah 98%' }
    ]
  },

  // 20. SURAH AT-TIN (95)
  {
    id: 'surah-95',
    surahNumber: 95,
    ayahNumber: 1,
    surahName: '95. Surah At-Tin',
    surahArabic: 'سُورَةُ التِّينِ',
    sheikhAudioUrl: 'https://everyayah.com/data/Alafasy_128kbps/095001.mp3',
    translation: 'Demi (buah) Tin dan (buah) Zaitun, dan demi bukit Sinai, dan demi kota (Aman) ini.',
    tajweedRule: 'Mad ‘Aridh Lissukun (4 Harakat), Makhraj Taa & Zay, & Idgham Syamsiyah',
    idealDurationMinSec: 10,
    idealDurationMaxSec: 25,
    ustadzNote: 'Panjangkan Mad ‘Aridh Lissukun 4 harakat pada ٱلتِّينِ, ٱلزَّيْتُونِ, dan سِينِينَ.',
    words: [
      { id: 'w95-1', arabic: 'وَٱلتِّينِ', transliteration: 'Wat-Tīn', status: 'perfect', tag: 'Makhraj Taa & Mad', title: 'Taa & Mad ‘Aridh', icon: 'check_circle', body: 'Taa pangkal gigi seri atas, Mad 4h tenang.', correctionGuide: 'Panjangkan mad 4 ketukan.', audioHint: 'Mad 4 ketukan.', targetMetric: 'Tajwid 98%' },
      { id: 'w95-2', arabic: 'وَٱلزَّيْتُونِ', transliteration: 'Waz-Zaitūn', status: 'perfect', tag: 'Shafir Zay', title: 'Shafir Zay & Mad', icon: 'check_circle', body: 'Desis Zay tajam dan Mad 4h.', correctionGuide: 'Bunyikan desis Zay.', audioHint: 'Shafir Zay tajam.', targetMetric: 'Makharij 98%' },
      { id: 'w95-3', arabic: 'وَطُورِ', transliteration: 'Wa Thūri', status: 'correct', tag: 'Thaa Tebal', title: 'Thaa Ithbaq', icon: 'check_circle', body: 'Thaa tebal dan Raa kasrah tipis.', correctionGuide: 'Tebalkan Thaa.', audioHint: 'Thaa tebal.', targetMetric: 'Makharij 96%' },
      { id: 'w95-4', arabic: 'سِينِينَ', transliteration: 'Sīnīn', status: 'perfect', tag: 'Mad ‘Aridh 4h', title: 'Mad ‘Aridh Lissukun', icon: 'check_circle', body: 'Mad 4 harakat tenang sebelum Nun.', correctionGuide: 'Panjangkan 4 ketukan.', audioHint: 'Mad 4 ketukan.', targetMetric: 'Tajwid 98%' }
    ]
  },

  // 21. SURAH ASY-SYARH / AL-INSYIRAH (94)
  {
    id: 'surah-94',
    surahNumber: 94,
    ayahNumber: 1,
    surahName: '94. Surah Asy-Syarh',
    surahArabic: 'سُورَةُ الشَّرْحِ',
    sheikhAudioUrl: 'https://everyayah.com/data/Alafasy_128kbps/094001.mp3',
    translation: 'Bukankah Kami telah melapangkan untukmu dadamu? Dan Kami telah menghilangkan daripadamu bebanmu, yang memberatkan punggungmu.',
    tajweedRule: 'Izhar Syafawi, Sifat Tafasysyi Syin, Hams Haa, & Tafkhim Raa',
    idealDurationMinSec: 10,
    idealDurationMaxSec: 25,
    ustadzNote: 'Sempurnakan hembusan nafas Syin pada نَشْرَحْ dan bersihkan Haa (ح) dari tengah tenggorokan.',
    words: [
      { id: 'w94-1', arabic: 'أَلَمْ', transliteration: 'Alam', status: 'correct', tag: 'Izhar Syafawi', title: 'Mim Sukun', icon: 'check_circle', body: 'Mim sukun terang tanpa dengung.', correctionGuide: 'Jangan didengungkan.', audioHint: 'Izhar syafawi.', targetMetric: 'Tajwid 96%' },
      { id: 'w94-2', arabic: 'نَشْرَحْ', transliteration: 'Nashrah', status: 'perfect', tag: 'Syin & Haa Halus', title: 'Tafasysyi Syin & Haa', icon: 'check_circle', body: 'Syin berhembus di tengah lidah, Haa bersih tengah tenggorokan.', correctionGuide: 'Alirkan hembusan Syin.', audioHint: 'Syin berdesis Haa bersih.', targetMetric: 'Makharij 98%' },
      { id: 'w94-3', arabic: 'لَكَ', transliteration: 'Laka', status: 'correct', tag: 'Harakat Short', title: 'Vokal Short', icon: 'check_circle', body: '1 harakat pendek teratur.', correctionGuide: 'Jangan diseret.', audioHint: '1 ketukan.', targetMetric: 'Kelancaran 95%' },
      { id: 'w94-4', arabic: 'صَدْرَكَ', transliteration: 'Shadrak', status: 'perfect', tag: 'Shad Tebal & Qalqalah', title: 'Shad & Qalqalah Dal', icon: 'check_circle', body: 'Shad tebal dan Dal sukun memantul.', correctionGuide: 'Tebalkan Shad dan pantulkan Dal.', audioHint: 'Shad tebal Dal memantul.', targetMetric: 'Qalqalah 98%' }
    ]
  },

  // 22. SURAH ADH-DHUHA (93)
  {
    id: 'surah-93',
    surahNumber: 93,
    ayahNumber: 1,
    surahName: '93. Surah Adh-Dhuha',
    surahArabic: 'سُورَةُ الضُّحَى',
    sheikhAudioUrl: 'https://everyayah.com/data/Alafasy_128kbps/093001.mp3',
    translation: 'Demi waktu matahari sepengalahan naik, dan demi malam apabila telah sunyi, Tuhanmu tiada meninggalkan kamu dan tiada (pula) benci kepadamu.',
    tajweedRule: 'Dhad Ithbaq (Tepi Lidah), Idgham Syamsiyah, & Imalah/Mad 2 Harakat',
    idealDurationMinSec: 10,
    idealDurationMaxSec: 25,
    ustadzNote: 'Tebalkan huruf Dhad pada وَٱلضُّحَىٰ dari tepi lidah menempel geraham atas.',
    words: [
      { id: 'w93-1', arabic: 'وَٱلضُّحَىٰ', transliteration: 'Wadh-Dhuhā', status: 'perfect', tag: 'Dhad Ithbaq & Haa', title: 'Makhraj Dhad & Haa', icon: 'check_circle', body: 'Dhad tebal tepi lidah menempel geraham, Haa bersih.', correctionGuide: 'Tekan tepi lidah ke geraham.', audioHint: 'Dhad tebal.', targetMetric: 'Makharij 98%' },
      { id: 'w93-2', arabic: 'وَٱلَّيْلِ', transliteration: 'Wal-Laili', status: 'correct', tag: 'Mad Layyin', title: 'Kelunakan Ya Sukun', icon: 'check_circle', body: 'Ya sukun dialirkan lentur.', correctionGuide: 'Alirkan lentur.', audioHint: 'Layyin lentur.', targetMetric: 'Tajwid 95%' },
      { id: 'w93-3', arabic: 'إِذَا', transliteration: 'Iżā', status: 'correct', tag: 'Dzal Halus', title: 'Makhraj Dzal', icon: 'check_circle', body: 'Dzal lembut di ujung lidah.', correctionGuide: 'Sentuhkan ke gigi seri atas.', audioHint: 'Dzal lembut.', targetMetric: 'Makharij 95%' },
      { id: 'w93-4', arabic: 'سَجَىٰ', transliteration: 'Sajā', status: 'correct', tag: 'Mad 2h', title: 'Mad Thabi’i', icon: 'check_circle', body: 'Mad 2 harakat Alif Maqshurah.', correctionGuide: '2 ketukan.', audioHint: 'Mad 2 ketukan.', targetMetric: 'Tajwid 96%' }
    ]
  },

  // 23. SURAH AL-LAIL (92)
  {
    id: 'surah-92',
    surahNumber: 92,
    ayahNumber: 1,
    surahName: '92. Surah Al-Lail',
    surahArabic: 'سُورَةُ اللَّيْلِ',
    sheikhAudioUrl: 'https://everyayah.com/data/Alafasy_128kbps/092001.mp3',
    translation: 'Demi malam apabila menutupi (cahaya siang), dan siang apabila terang benderang, sesungguhnya usaha kamu memang berbeda-beda.',
    tajweedRule: 'Mad Layyin, Ghunnah Musyaddadah, & Jim Wasathul Lisan',
    idealDurationMinSec: 12,
    idealDurationMaxSec: 28,
    ustadzNote: 'Lembutkan Mad Layyin pada ٱلَّيْلِ dan bunyikan Jim murni tanpa desis pada تَجَلَّىٰ.',
    words: [
      { id: 'w92-1', arabic: 'وَٱلَّيْلِ', transliteration: 'Wal-Laili', status: 'correct', tag: 'Mad Layyin', title: 'Kelunakan Ya Sukun', icon: 'check_circle', body: 'Ya sukun dialirkan lentur.', correctionGuide: 'Alirkan lentur.', audioHint: 'Layyin lentur.', targetMetric: 'Tajwid 95%' },
      { id: 'w92-2', arabic: 'إِذَا', transliteration: 'Iżā', status: 'correct', tag: 'Dzal Halus', title: 'Makhraj Dzal', icon: 'check_circle', body: 'Dzal lembut di ujung lidah.', correctionGuide: 'Sentuhkan ke gigi seri atas.', audioHint: 'Dzal lembut.', targetMetric: 'Makharij 95%' },
      { id: 'w92-3', arabic: 'يَغْشَىٰ', transliteration: 'Yagsyā', status: 'correct', tag: 'Ghain & Syin', title: 'Ghain & Syin', icon: 'check_circle', body: 'Ghain tenggorokan atas tebal, Syin berhembus.', correctionGuide: 'Tebalkan Ghain.', audioHint: 'Ghain tebal Syin berdesis.', targetMetric: 'Makharij 96%' },
      { id: 'w92-4', arabic: 'وَٱلنَّهَارِ', transliteration: 'Wan-Nahāri', status: 'perfect', tag: 'Ghunnah 2h', title: 'Ghunnah Musyaddadah', icon: 'check_circle', body: 'Dengung Nun bertasydid 2 harakat.', correctionGuide: 'Tahan dengung 2 ketukan.', audioHint: 'Dengung 2 ketukan.', targetMetric: 'Ghunnah 98%' }
    ]
  },

  // 24. SURAH ASY-SYAMS (91)
  {
    id: 'surah-91',
    surahNumber: 91,
    ayahNumber: 1,
    surahName: '91. Surah Asy-Syams',
    surahArabic: 'سُورَةُ الشَّمْسِ',
    sheikhAudioUrl: 'https://everyayah.com/data/Alafasy_128kbps/091001.mp3',
    translation: 'Demi matahari dan cahayanya di pagi hari, dan bulan apabila mengiringinya, dan siang apabila menampilkannya.',
    tajweedRule: 'Tafasysyi Syin, Izhar Syafawi, & Hams Haa Dada',
    idealDurationMinSec: 12,
    idealDurationMaxSec: 28,
    ustadzNote: 'Hembuskan angin huruf Syin di tengah lidah pada ٱلشَّمْسِ dan jangan mendengungkan Mim sukun.',
    words: [
      { id: 'w91-1', arabic: 'وَٱلشَّمْسِ', transliteration: 'Wash-Syamsi', status: 'perfect', tag: 'Syin & Mim Sukun', title: 'Tafasysyi Syin & Izhar', icon: 'check_circle', body: 'Syin berhembus di tengah lidah, Mim sukun terang.', correctionGuide: 'Alirkan hembusan Syin.', audioHint: 'Syin berdesis Mim jelas.', targetMetric: 'Makharij 98%' },
      { id: 'w91-2', arabic: 'وَضُحَىٰهَا', transliteration: 'Wa Dhuhāhā', status: 'perfect', tag: 'Dhad & Haa Halus', title: 'Dhad Ithbaq & Haa', icon: 'check_circle', body: 'Dhad tebal tepi lidah, Haa bersih tengah tenggorokan.', correctionGuide: 'Tebalkan Dhad.', audioHint: 'Dhad tebal Haa bersih.', targetMetric: 'Makharij 98%' },
      { id: 'w91-3', arabic: 'وَٱلْقَمَرِ', transliteration: 'Wal-Qamari', status: 'correct', tag: 'Qaf Tebal', title: 'Makhraj Qaf', icon: 'check_circle', body: 'Qaf tebal pangkal lidah, Raa kasrah tipis.', correctionGuide: 'Tebalkan Qaf.', audioHint: 'Qaf tebal.', targetMetric: 'Tajwid 95%' }
    ]
  },

  // 25. SURAH AL-BALAD (90)
  {
    id: 'surah-90',
    surahNumber: 90,
    ayahNumber: 1,
    surahName: '90. Surah Al-Balad',
    surahArabic: 'سُورَةُ البَلَدِ',
    sheikhAudioUrl: 'https://everyayah.com/data/Alafasy_128kbps/090001.mp3',
    translation: 'Aku benar-benar bersumpah dengan kota ini (Mekah), dan kamu bertempat di kota Mekah ini, dan demi bapak dan anaknya.',
    tajweedRule: 'Qalqalah Kubra Dal Waqaf, Mad Jaiz Munfashil, & Ikhfa Haqiqi',
    idealDurationMinSec: 12,
    idealDurationMaxSec: 28,
    ustadzNote: 'Mantapkan pantulan Qalqalah Kubra pada huruf Dal di setiap waqaf akhir ayat: ٱلْبَلَدِ.',
    words: [
      { id: 'w90-1', arabic: 'لَآ', transliteration: 'Lā', status: 'correct', tag: 'Mad Jaiz 4h', title: 'Mad Jaiz Munfashil', icon: 'check_circle', body: 'Dipanjangkan 4 harakat.', correctionGuide: 'Ayunkan mad 4 ketukan.', audioHint: 'Mad 4 ketukan.', targetMetric: 'Tajwid 95%' },
      { id: 'w90-2', arabic: 'أُقْسِمُ', transliteration: 'Uqsimu', status: 'perfect', tag: 'Qalqalah Qaf', title: 'Qalqalah Sughra Qaf', icon: 'check_circle', body: 'Qaf sukun memantul tebal di pangkal lidah.', correctionGuide: 'Pantulkan Qaf tebal.', audioHint: 'Qaf memantul tebal.', targetMetric: 'Qalqalah 98%' },
      { id: 'w90-3', arabic: 'بِهَٰذَا', transliteration: 'Bihāżā', status: 'correct', tag: 'Dzal Halus', title: 'Makhraj Dzal', icon: 'check_circle', body: 'Dzal lembut di ujung lidah.', correctionGuide: 'Sentuhkan ke gigi seri atas.', audioHint: 'Dzal lembut.', targetMetric: 'Makharij 95%' },
      { id: 'w90-4', arabic: 'ٱلْبَلَدِ', transliteration: 'Al-Balad', status: 'perfect', tag: 'Qalqalah Dal', title: 'Qalqalah Kubra Dal', icon: 'check_circle', body: 'Dal waqaf memantul kokoh.', correctionGuide: 'Pantulkan Dal tegas.', audioHint: 'Pantulan Dal mantap.', targetMetric: 'Qalqalah 99%' }
    ]
  },

  // 26. SURAH AL-FAJR (89)
  {
    id: 'surah-89',
    surahNumber: 89,
    ayahNumber: 1,
    surahName: '89. Surah Al-Fajr',
    surahArabic: 'سُورَةُ الفَجْرِ',
    sheikhAudioUrl: 'https://everyayah.com/data/Alafasy_128kbps/089001.mp3',
    translation: 'Demi fajar, dan malam yang sepuluh, dan yang genap dan yang ganjil, dan malam bila berlalu.',
    tajweedRule: 'Qalqalah Sughra Jim, Tafkhim/Tarqiq Raa Waqaf, & Izhar Halqi',
    idealDurationMinSec: 12,
    idealDurationMaxSec: 28,
    ustadzNote: 'Pantulkan Qalqalah Jim pada ٱلْفَجْرِ dan ٱلشَّفْعِ dengan bersih tanpa desis nafas.',
    words: [
      { id: 'w89-1', arabic: 'وَٱلْفَجْرِ', transliteration: 'Wal-Fajr', status: 'perfect', tag: 'Qalqalah Jim & Raa', title: 'Qalqalah Jim & Raa Waqaf', icon: 'check_circle', body: 'Jim sukun memantul bersih, Raa waqaf ditebalkan.', correctionGuide: 'Pantulkan Jim murni.', audioHint: 'Jim memantul bersih.', targetMetric: 'Qalqalah 98%' },
      { id: 'w89-2', arabic: 'وَلَيَالٍ', transliteration: 'Wa Layālin', status: 'correct', tag: 'Mad 2h', title: 'Mad Thabi’i', icon: 'check_circle', body: 'Mad 2 harakat Lam.', correctionGuide: '2 ketukan.', audioHint: 'Mad 2 ketukan.', targetMetric: 'Tajwid 95%' },
      { id: 'w89-3', arabic: 'عَشْرٍ', transliteration: '‘Asyr', status: 'perfect', tag: '‘Ain & Syin', title: 'Makhraj ‘Ain & Syin', icon: 'check_circle', body: '‘Ain tengah tenggorokan, Syin berhembus.', correctionGuide: 'Tekan tengah tenggorokan.', audioHint: '‘Ain bersih Syin berdesis.', targetMetric: 'Makharij 98%' }
    ]
  },

  // 27. SURAH AL-GHASYIYAH (88)
  {
    id: 'surah-88',
    surahNumber: 88,
    ayahNumber: 1,
    surahName: '88. Surah Al-Ghasyiyah',
    surahArabic: 'سُورَةُ الغَاشِيَةِ',
    sheikhAudioUrl: 'https://everyayah.com/data/Alafasy_128kbps/088001.mp3',
    translation: 'Sudahkah sampai kepadamu berita tentang hari kiamat? Banyak muka pada hari itu tunduk terhina, bekerja keras lagi kepayahan.',
    tajweedRule: 'Tafkhim Ghain, Tafasysyi Syin, & Idgham Bighunnah',
    idealDurationMinSec: 12,
    idealDurationMaxSec: 28,
    ustadzNote: 'Tebalkan huruf Ghain pada ٱلْغَاشِيَةِ dan keluarkan suara dari tenggorokan teratas.',
    words: [
      { id: 'w88-1', arabic: 'هَلْ', transliteration: 'Hal', status: 'correct', tag: 'Haa Dada', title: 'Makhraj Haa', icon: 'check_circle', body: 'Haa dari pangkal tenggorokan.', correctionGuide: 'Keluarkan dari dada.', audioHint: 'Haa dada.', targetMetric: 'Makharij 95%' },
      { id: 'w88-2', arabic: 'أَتَىٰكَ', transliteration: 'Atāka', status: 'correct', tag: 'Mad 2h', title: 'Mad Thabi’i', icon: 'check_circle', body: 'Mad 2 harakat Taa.', correctionGuide: '2 ketukan.', audioHint: 'Mad 2 ketukan.', targetMetric: 'Tajwid 95%' },
      { id: 'w88-3', arabic: 'حَدِيثُ', transliteration: 'Hadītsu', status: 'correct', tag: 'Tsaa Halus', title: 'Makhraj Tsaa', icon: 'check_circle', body: 'Tsaa berdesis di ujung lidah.', correctionGuide: 'Sentuhkan ke gigi seri atas.', audioHint: 'Tsaa berdesis.', targetMetric: 'Makharij 96%' },
      { id: 'w88-4', arabic: 'ٱلْغَاشِيَةِ', transliteration: 'Al-Ghāsyiyah', status: 'perfect', tag: 'Ghain & Syin', title: 'Tafkhim Ghain & Syin', icon: 'check_circle', body: 'Ghain tebal tenggorokan atas, Syin berhembus.', correctionGuide: 'Tebalkan Ghain.', audioHint: 'Ghain tebal Syin berdesis.', targetMetric: 'Makharij 98%' }
    ]
  },

  // 28. SURAH AL-A'LA (87)
  {
    id: 'surah-87',
    surahNumber: 87,
    ayahNumber: 1,
    surahName: '87. Surah Al-A\'la',
    surahArabic: 'سُورَةُ الأَعْلَى',
    sheikhAudioUrl: 'https://everyayah.com/data/Alafasy_128kbps/087001.mp3',
    translation: 'Sucikanlah nama Tuhanmu Yang Mahatinggi, Yang menciptakan, dan menyempurnakan (penciptaan-Nya), dan Yang menentukan kadar (masing-masing) dan memberi petunjuk.',
    tajweedRule: 'Hams Sin Sukun, Tafkhim Raa, & Makhraj ‘Ain Wasathul Halq',
    idealDurationMinSec: 12,
    idealDurationMaxSec: 28,
    ustadzNote: 'Alirkan hams nafas pada huruf Sin sukun سَبِّحِ ٱسْمَ dan murnikan huruf ‘Ain pada ٱلأَعْلَى.',
    words: [
      { id: 'w87-1', arabic: 'سَبِّحِ', transliteration: 'Sabbihi', status: 'correct', tag: 'Haa Halus', title: 'Makhraj Haa', icon: 'check_circle', body: 'Haa bersih dari tengah tenggorokan.', correctionGuide: 'Tekan tengah tenggorokan.', audioHint: 'Haa bersih.', targetMetric: 'Makharij 96%' },
      { id: 'w87-2', arabic: 'ٱسْمَ', transliteration: 'Isma', status: 'correct', tag: 'Hams Sin', title: 'Sin Sukun', icon: 'check_circle', body: 'Sin sukun berdesis hams.', correctionGuide: 'Alirkan hams Sin.', audioHint: 'Desis Sin.', targetMetric: 'Makharij 96%' },
      { id: 'w87-3', arabic: 'رَبِّكَ', transliteration: 'Rabbika', status: 'correct', tag: 'Tafkhim Raa', title: 'Raa Fathah', icon: 'check_circle', body: 'Raa ditebalkan.', correctionGuide: 'Tebalkan Raa.', audioHint: 'Raa tebal.', targetMetric: 'Tajwid 95%' },
      { id: 'w87-4', arabic: 'ٱلْأَعْلَى', transliteration: 'Al-A‘lā', status: 'perfect', tag: '‘Ain Wasath', title: 'Makhraj ‘Ain', icon: 'check_circle', body: '‘Ain tengah tenggorokan bersih, Mad 2h.', correctionGuide: 'Tekan tengah tenggorokan.', audioHint: '‘Ain bersih.', targetMetric: 'Makharij 98%' }
    ]
  },

  // 29. SURAH AT-TARIQ (86)
  {
    id: 'surah-86',
    surahNumber: 86,
    ayahNumber: 1,
    surahName: '86. Surah At-Tariq',
    surahArabic: 'سُورَةُ الطَّارِقِ',
    sheikhAudioUrl: 'https://everyayah.com/data/Alafasy_128kbps/086001.mp3',
    translation: 'Demi langit dan yang datang pada malam hari, tahukah kamu apakah yang datang pada malam hari itu? (Yaitu) bintang yang cahayanya menembus.',
    tajweedRule: 'Thaa Ithbaq Tebal, Qalqalah Kubra Qaf, & Mad Wajib Muttashil',
    idealDurationMinSec: 12,
    idealDurationMaxSec: 28,
    ustadzNote: 'Tebalkan huruf Thaa (ط) pada ٱلطَّارِقِ dan pantulkan Qalqalah Kubra huruf Qaf saat waqaf.',
    words: [
      { id: 'w86-1', arabic: 'وَٱلسَّمَآءِ', transliteration: 'Was-Samā’i', status: 'perfect', tag: 'Mad Wajib 4h', title: 'Mad Wajib Muttashil', icon: 'check_circle', body: 'Dipanjangkan 4-5 harakat.', correctionGuide: 'Ayunkan mad 4 ketukan.', audioHint: 'Mad 4 ketukan.', targetMetric: 'Tajwid 98%' },
      { id: 'w86-2', arabic: 'وَٱلطَّارِقِ', transliteration: 'Wat-Thāriq', status: 'perfect', tag: 'Thaa Tebal & Qaf', title: 'Thaa Ithbaq & Qalqalah', icon: 'check_circle', body: 'Thaa tebal, Raa kasrah tipis, Qaf memantul.', correctionGuide: 'Tebalkan Thaa dan pantulkan Qaf.', audioHint: 'Thaa tebal Qaf memantul.', targetMetric: 'Qalqalah 98%' }
    ]
  },

  // 30. SURAH AL-BURUJ (85)
  {
    id: 'surah-85',
    surahNumber: 85,
    ayahNumber: 1,
    surahName: '85. Surah Al-Buruj',
    surahArabic: 'سُورَةُ البُرُوجِ',
    sheikhAudioUrl: 'https://everyayah.com/data/Alafasy_128kbps/085001.mp3',
    translation: 'Demi langit yang mempunyai gugusan bintang, dan hari yang dijanjikan, dan yang menyaksikan dan yang disaksikan.',
    tajweedRule: 'Qalqalah Kubra Jim Waqaf, Mad Wajib Muttashil, & Ikhfa Haqiqi',
    idealDurationMinSec: 12,
    idealDurationMaxSec: 28,
    ustadzNote: 'Mantapkan pantulan Qalqalah Kubra murni huruf Jim pada ٱلْبُرُوجِ tanpa desis angin.',
    words: [
      { id: 'w85-1', arabic: 'وَٱلسَّمَآءِ', transliteration: 'Was-Samā’i', status: 'perfect', tag: 'Mad Wajib 4h', title: 'Mad Wajib Muttashil', icon: 'check_circle', body: 'Dipanjangkan 4-5 harakat.', correctionGuide: 'Ayunkan mad 4 ketukan.', audioHint: 'Mad 4 ketukan.', targetMetric: 'Tajwid 98%' },
      { id: 'w85-2', arabic: 'ذَاتِ', transliteration: 'Żāti', status: 'correct', tag: 'Dzal Halus', title: 'Makhraj Dzal', icon: 'check_circle', body: 'Dzal lembut di ujung lidah.', correctionGuide: 'Sentuhkan ke gigi seri atas.', audioHint: 'Dzal lembut.', targetMetric: 'Makharij 95%' },
      { id: 'w85-3', arabic: 'ٱلْبُرُوجِ', transliteration: 'Al-Burūj', status: 'perfect', tag: 'Qalqalah Jim', title: 'Qalqalah Kubra Jim', icon: 'check_circle', body: 'Jim waqaf memantul murni tanpa desis.', correctionGuide: 'Pantulkan Jim murni.', audioHint: 'Jim memantul murni.', targetMetric: 'Qalqalah 99%' }
    ]
  },

  // 31. SURAH AL-INSYIQAQ (84)
  {
    id: 'surah-84',
    surahNumber: 84,
    ayahNumber: 1,
    surahName: '84. Surah Al-Insyiqaq',
    surahArabic: 'سُورَةُ الانْشِقَاقِ',
    sheikhAudioUrl: 'https://everyayah.com/data/Alafasy_128kbps/084001.mp3',
    translation: 'Apabila langit terbelah, dan patuh kepada Tuhannya, dan sudah semestinya langit itu patuh.',
    tajweedRule: 'Ikhfa Haqiqi, Mad Wajib Muttashil, & Qalqalah Kubra Qaf Waqaf',
    idealDurationMinSec: 12,
    idealDurationMaxSec: 28,
    ustadzNote: 'Samarkan Nun sukun sebelum Syin pada ٱنشَقَّتْ dengan dengung Ikhfa 2 harakat.',
    words: [
      { id: 'w84-1', arabic: 'إِذَا', transliteration: 'Iżā', status: 'correct', tag: 'Dzal Halus', title: 'Makhraj Dzal', icon: 'check_circle', body: 'Dzal lembut di ujung lidah.', correctionGuide: 'Sentuhkan ke gigi seri atas.', audioHint: 'Dzal lembut.', targetMetric: 'Makharij 95%' },
      { id: 'w84-2', arabic: 'ٱلسَّمَآءُ', transliteration: 'As-Samā’u', status: 'perfect', tag: 'Mad Wajib 4h', title: 'Mad Wajib Muttashil', icon: 'check_circle', body: 'Dipanjangkan 4-5 harakat.', correctionGuide: 'Ayunkan mad 4 ketukan.', audioHint: 'Mad 4 ketukan.', targetMetric: 'Tajwid 98%' },
      { id: 'w84-3', arabic: 'ٱنشَقَّتْ', transliteration: 'Insyaqqat', status: 'perfect', tag: 'Ikhfa & Hams Taa', title: 'Ikhfa & Hams Taa', icon: 'check_circle', body: 'Dengung Ikhfa sebelum Syin, Taa sukun hams.', correctionGuide: 'Samarkan Nun 2 ketukan.', audioHint: 'Ikhfa 2 ketukan hams Taa.', targetMetric: 'Tajwid 98%' }
    ]
  },

  // 32. SURAH AL-MUTAFFIFIN (83)
  {
    id: 'surah-83',
    surahNumber: 83,
    ayahNumber: 1,
    surahName: '83. Surah Al-Mutaffifin',
    surahArabic: 'سُورَةُ المُطَفِّفِينَ',
    sheikhAudioUrl: 'https://everyayah.com/data/Alafasy_128kbps/083001.mp3',
    translation: 'Kecelakaan besarlah bagi orang-orang yang curang, (yaitu) orang-orang yang apabila menerima takaran dari orang lain mereka minta dipenuhi.',
    tajweedRule: 'Idgham Bilaghunnah, Thaa Ithbaq, & Mad ‘Aridh Lissukun',
    idealDurationMinSec: 15,
    idealDurationMaxSec: 35,
    ustadzNote: 'Tebalkan huruf Thaa pada ٱلْمُطَفِّفِينَ dan leburkan tanwin tanpa dengung pada وَيْلٌ لِّلْمُطَفِّفِينَ.',
    words: [
      { id: 'w83-1', arabic: 'وَيْلٌ', transliteration: 'Wailun', status: 'perfect', tag: 'Idgham Bilaghunnah', title: 'Tanwin ke Lam', icon: 'check_circle', body: 'Tanwin lebur ke Lam tanpa dengung.', correctionGuide: 'Leburkan tanpa dengung.', audioHint: 'Tanpa dengung.', targetMetric: 'Tajwid 98%' },
      { id: 'w83-2', arabic: 'لِّلْمُطَفِّفِينَ', transliteration: 'Lil-Muthaffifīn', status: 'perfect', tag: 'Thaa Tebal & Mad', title: 'Thaa Ithbaq & Mad ‘Aridh', icon: 'check_circle', body: 'Thaa tebal, Faa bertasydid, Mad 4h waqaf.', correctionGuide: 'Tebalkan Thaa.', audioHint: 'Thaa tebal mad 4 ketukan.', targetMetric: 'Makharij 98%' }
    ]
  },

  // 33. SURAH AL-INFITAR (82)
  {
    id: 'surah-82',
    surahNumber: 82,
    ayahNumber: 1,
    surahName: '82. Surah Al-Infitar',
    surahArabic: 'سُورَةُ الانْفِطَارِ',
    sheikhAudioUrl: 'https://everyayah.com/data/Alafasy_128kbps/082001.mp3',
    translation: 'Apabila langit terbelah, dan apabila bintang-bintang jatuh berserakan, dan apabila lautan dijadikan meluap.',
    tajweedRule: 'Ikhfa Haqiqi, Thaa Ithbaq, & Mad Wajib Muttashil',
    idealDurationMinSec: 12,
    idealDurationMaxSec: 28,
    ustadzNote: 'Tebalkan huruf Thaa pada ٱنفَطَرَتْ dan samarkan Nun sukun dengan Ikhfa 2 harakat.',
    words: [
      { id: 'w82-1', arabic: 'إِذَا', transliteration: 'Iżā', status: 'correct', tag: 'Dzal Halus', title: 'Makhraj Dzal', icon: 'check_circle', body: 'Dzal lembut di ujung lidah.', correctionGuide: 'Sentuhkan ke gigi seri atas.', audioHint: 'Dzal lembut.', targetMetric: 'Makharij 95%' },
      { id: 'w82-2', arabic: 'ٱلسَّمَآءُ', transliteration: 'As-Samā’u', status: 'perfect', tag: 'Mad Wajib 4h', title: 'Mad Wajib Muttashil', icon: 'check_circle', body: 'Dipanjangkan 4-5 harakat.', correctionGuide: 'Ayunkan mad 4 ketukan.', audioHint: 'Mad 4 ketukan.', targetMetric: 'Tajwid 98%' },
      { id: 'w82-3', arabic: 'ٱنفَطَرَتْ', transliteration: 'Infatarat', status: 'perfect', tag: 'Ikhfa & Thaa Tebal', title: 'Ikhfa & Thaa Ithbaq', icon: 'check_circle', body: 'Dengung Ikhfa sebelum Faa, Thaa tebal.', correctionGuide: 'Tebalkan Thaa.', audioHint: 'Ikhfa 2 ketukan Thaa tebal.', targetMetric: 'Makharij 98%' }
    ]
  },

  // 34. SURAH AT-TAKWIR (81)
  {
    id: 'surah-81',
    surahNumber: 81,
    ayahNumber: 1,
    surahName: '81. Surah At-Takwir',
    surahArabic: 'سُورَةُ التَّكْوِيرِ',
    sheikhAudioUrl: 'https://everyayah.com/data/Alafasy_128kbps/081001.mp3',
    translation: 'Apabila matahari digulung, dan apabila bintang-bintang berjatuhan, dan apabila gunung-gunung dihancurkan.',
    tajweedRule: 'Hams Kaaf Sukun, Hembusan Syin, & Tasydid Wawu',
    idealDurationMinSec: 12,
    idealDurationMaxSec: 28,
    ustadzNote: 'Alirkan hembusan nafas hams pada Kaaf sukun ٱلشَّمْسُ كُوِّرَتْ tanpa memantul.',
    words: [
      { id: 'w81-1', arabic: 'إِذَا', transliteration: 'Iżā', status: 'correct', tag: 'Dzal Halus', title: 'Makhraj Dzal', icon: 'check_circle', body: 'Dzal lembut di ujung lidah.', correctionGuide: 'Sentuhkan ke gigi seri atas.', audioHint: 'Dzal lembut.', targetMetric: 'Makharij 95%' },
      { id: 'w81-2', arabic: 'ٱلشَّمْسُ', transliteration: 'Asy-Syamsu', status: 'perfect', tag: 'Syin Berdesis', title: 'Sifat Tafasysyi', icon: 'check_circle', body: 'Syin berhembus di tengah lidah.', correctionGuide: 'Alirkan hembusan Syin.', audioHint: 'Syin berdesis.', targetMetric: 'Makharij 98%' },
      { id: 'w81-3', arabic: 'كُوِّرَتْ', transliteration: 'Kuw构irat', status: 'perfect', tag: 'Tasydid Wawu & Hams Taa', title: 'Tasydid Wawu & Taa', icon: 'check_circle', body: 'Bulatkan bibir Wawu bertasydid, Taa hams.', correctionGuide: 'Bulatkan bibir untuk Wawu.', audioHint: 'Wawu bertasydid mantap.', targetMetric: 'Makharij 98%' }
    ]
  },

  // 35. SURAH 'ABASA (80)
  {
    id: 'surah-80',
    surahNumber: 80,
    ayahNumber: 1,
    surahName: '80. Surah \'Abasa',
    surahArabic: 'سُورَةُ عَبَسَ',
    sheikhAudioUrl: 'https://everyayah.com/data/Alafasy_128kbps/080001.mp3',
    translation: 'Dia (Muhammad) bermuka masam dan berpaling, karena telah datang seorang buta kepadanya.',
    tajweedRule: '‘Ain Wasathul Halq, Hams Sin, & Mad Jaiz Munfashil',
    idealDurationMinSec: 12,
    idealDurationMaxSec: 28,
    ustadzNote: 'Murnikan pengucapan ‘Ain pada عَبَسَ dari tengah tenggorokan.',
    words: [
      { id: 'w80-1', arabic: 'عَبَسَ', transliteration: '‘Abasa', status: 'perfect', tag: '‘Ain Tengah', title: 'Makhraj ‘Ain', icon: 'check_circle', body: '‘Ain tengah tenggorokan bersih, Sin hams.', correctionGuide: 'Tekan tengah tenggorokan.', audioHint: '‘Ain bersih.', targetMetric: 'Makharij 98%' },
      { id: 'w80-2', arabic: 'وَتَوَلَّىٰ', transliteration: 'Wa Tawallā', status: 'correct', tag: 'Tasydid Lam', title: 'Tasydid Lam', icon: 'check_circle', body: 'Lam bertasydid ditekan lembut.', correctionGuide: 'Tahan tasydid Lam.', audioHint: 'Tasydid Lam.', targetMetric: 'Tajwid 95%' },
      { id: 'w80-3', arabic: 'أَن', transliteration: 'An', status: 'correct', tag: 'Ikhfa', title: 'Ikhfa Haqiqi', icon: 'check_circle', body: 'Nun sukun disamarkan sebelum Jim.', correctionGuide: 'Samarkan Nun 2 ketukan.', audioHint: 'Ikhfa 2 ketukan.', targetMetric: 'Ikhfa 95%' },
      { id: 'w80-4', arabic: 'جَآءَهُ', transliteration: 'Jā-ah', status: 'perfect', tag: 'Mad Wajib 4h', title: 'Mad Wajib Muttashil', icon: 'check_circle', body: 'Dipanjangkan 4-5 harakat.', correctionGuide: 'Ayunkan mad 4 ketukan.', audioHint: 'Mad 4 ketukan.', targetMetric: 'Tajwid 98%' }
    ]
  },

  // 36. SURAH AN-NAZI'AT (79)
  {
    id: 'surah-79',
    surahNumber: 79,
    ayahNumber: 1,
    surahName: '79. Surah An-Nazi\'at',
    surahArabic: 'سُورَةُ النَّازِعَاتِ',
    sheikhAudioUrl: 'https://everyayah.com/data/Alafasy_128kbps/079001.mp3',
    translation: 'Demi (malaikat-malaikat) yang mencabut (nyawa) dengan keras, dan (malaikat-malaikat) yang mencabut (nyawa) dengan lemah-lembut.',
    tajweedRule: 'Ghunnah Musyaddadah, Shafir Huruf Zay, & Mad ‘Iwadh',
    idealDurationMinSec: 15,
    idealDurationMaxSec: 35,
    ustadzNote: 'Tahan dengung Ghunnah pada ٱلنَّٰزِعَٰتِ 2 harakat dan desiskan Zay secara tajam.',
    words: [
      { id: 'w79-1', arabic: 'وَٱلنَّٰزِعَٰتِ', transliteration: 'Wan-Nāzi‘āti', status: 'perfect', tag: 'Ghunnah & Zay', title: 'Ghunnah & Shafir Zay', icon: 'check_circle', body: 'Dengung Nun 2h, Zay berdesis tajam, ‘Ain bersih.', correctionGuide: 'Tahan dengung Nun 2 ketukan.', audioHint: 'Ghunnah 2 ketukan Zay tajam.', targetMetric: 'Makharij 98%' },
      { id: 'w79-2', arabic: 'غَرْقًا', transliteration: 'Gharqā', status: 'perfect', tag: 'Ghain & Qaf Tebal', title: 'Ghain & Qaf Tafkhim', icon: 'check_circle', body: 'Ghain dan Qaf tebal, Mad ‘Iwadh 2h waqaf.', correctionGuide: 'Tebalkan Ghain dan Qaf.', audioHint: 'Ghain dan Qaf tebal.', targetMetric: 'Makharij 98%' },
      { id: 'w79-3', arabic: 'وَٱلنَّٰشِطَٰتِ', transliteration: 'Wan-Nāsyithāti', status: 'perfect', tag: 'Syin & Thaa Tebal', title: 'Tafasysyi & Thaa Ithbaq', icon: 'check_circle', body: 'Syin berhembus, Thaa tebal.', correctionGuide: 'Tebalkan Thaa.', audioHint: 'Syin berdesis Thaa tebal.', targetMetric: 'Makharij 98%' }
    ]
  },

  // 37. SURAH AN-NABA' (78)
  {
    id: 'surah-78',
    surahNumber: 78,
    ayahNumber: 1,
    surahName: '78. Surah An-Naba\'',
    surahArabic: 'سُورَةُ النَّبَإِ',
    sheikhAudioUrl: 'https://everyayah.com/data/Alafasy_128kbps/078001.mp3',
    translation: 'Tentang apakah mereka saling bertanya-tanya? Tentang berita yang besar, yang mereka perselisihkan tentang ini.',
    tajweedRule: 'Ghunnah Musyaddadah (2 Harakat), Mad Wajib Muttashil, & Hamzah Aqshal Halq',
    idealDurationMinSec: 15,
    idealDurationMaxSec: 35,
    ustadzNote: 'Tahan dengung Ghunnah pada عَمَّ (Mim bertasydid) 2 harakat dan murnikan Hamzah di akhir ayat ٱلنَّبَإِ ٱلْعَظِيمِ.',
    words: [
      { id: 'w78-1', arabic: 'عَمَّ', transliteration: '‘Amma', status: 'perfect', tag: '‘Ain & Ghunnah 2h', title: 'Makhraj ‘Ain & Ghunnah', icon: 'check_circle', body: '‘Ain tengah tenggorokan bersih, Mim bertasydid dengung 2h.', correctionGuide: 'Tahan dengung Mim 2 ketukan.', audioHint: 'Dengung Mim 2 ketukan.', targetMetric: 'Ghunnah 98%' },
      { id: 'w78-2', arabic: 'يَتَسَآءَلُونَ', transliteration: 'Yatasā-alūn', status: 'perfect', tag: 'Mad Wajib 4h', title: 'Mad Wajib Muttashil', icon: 'check_circle', body: 'Dipanjangkan 4-5 harakat.', correctionGuide: 'Ayunkan mad 4-5 ketukan.', audioHint: 'Mad 4-5 ketukan.', targetMetric: 'Tajwid 98%' },
      { id: 'w78-3', arabic: 'عَنِ', transliteration: '‘Ani', status: 'correct', tag: '‘Ain Wasath', title: 'Makhraj ‘Ain', icon: 'check_circle', body: '‘Ain murni tengah tenggorokan.', correctionGuide: 'Tekan tengah tenggorokan.', audioHint: '‘Ain bersih.', targetMetric: 'Makharij 96%' },
      { id: 'w78-4', arabic: 'ٱلنَّبَإِ', transliteration: 'An-Naba’i', status: 'perfect', tag: 'Ghunnah & Hamzah', title: 'Ghunnah Nun & Hamzah', icon: 'check_circle', body: 'Dengung Nun 2h, Hamzah kasrah murni.', correctionGuide: 'Tahan dengung Nun 2 ketukan.', audioHint: 'Ghunnah Nun 2 ketukan.', targetMetric: 'Ghunnah 98%' },
      { id: 'w78-5', arabic: 'ٱلْعَظِيمِ', transliteration: 'Al-‘Azhīm', status: 'perfect', tag: 'Zhaa Ithbaq & Mad', title: 'Zhaa Ithbaq & Mad ‘Aridh', icon: 'check_circle', body: 'Zhaa tebal ujung lidah, Mad 4h waqaf.', correctionGuide: 'Tebalkan Zhaa.', audioHint: 'Zhaa tebal mad 4 ketukan.', targetMetric: 'Makharij 99%' }
    ]
  },

  // 38. SURAH AL-FATIHAH (1)
  {
    id: 'surah-001',
    surahNumber: 1,
    ayahNumber: 1,
    surahName: '001. Surah Al-Fatihah',
    surahArabic: 'سُورَةُ الفَاتِحَةِ',
    sheikhAudioUrl: 'https://everyayah.com/data/Alafasy_128kbps/001001.mp3',
    translation: 'Dengan nama Allah Yang Maha Pengasih, Maha Penyayang. Segala puji bagi Allah, Tuhan seluruh alam.',
    tajweedRule: 'Basmalah, Tarqiq Lafzhul Jalalah, & Mad ‘Aridh Lissukun',
    idealDurationMinSec: 10,
    idealDurationMaxSec: 25,
    ustadzNote: 'Bacalah Basmalah dan Hamdalah dengan tartil, tarqiq (tipis) pada lafazh Allah karena diawali kasrah, dan sempurnakan mad di akhir ayat.',
    words: [
      { id: 'w001-1', arabic: 'بِسْمِ', transliteration: 'Bismi', status: 'perfect', tag: 'Hams Sin', title: 'Desis Sin', icon: 'check_circle', body: 'Sin sukun berdesis hams.', correctionGuide: 'Alirkan hams Sin.', audioHint: 'Desis Sin.', targetMetric: 'Makharij 98%' },
      { id: 'w001-2', arabic: 'ٱللَّهِ', transliteration: 'Allāh', status: 'perfect', tag: 'Tarqiq Lam', title: 'Lam Jalalah Tipis', icon: 'check_circle', body: 'Lafazh Allah dibaca tipis (tarqiq).', correctionGuide: 'Bacalah tipis.', audioHint: 'Tarqiq tipis.', targetMetric: 'Tajwid 99%' },
      { id: 'w001-3', arabic: 'ٱلرَّحْمَٰنِ', transliteration: 'Ar-Rahmāni', status: 'correct', tag: 'Haa Halus', title: 'Makhraj Haa', icon: 'check_circle', body: 'Haa dari tengah tenggorokan.', correctionGuide: 'Tekan tengah tenggorokan.', audioHint: 'Haa bersih.', targetMetric: 'Makharij 95%' },
      { id: 'w001-4', arabic: 'ٱلرَّحِيمِ', transliteration: 'Ar-Rahīm', status: 'perfect', tag: 'Mad ‘Aridh 4h', title: 'Mad ‘Aridh Lissukun', icon: 'check_circle', body: 'Mad 4 harakat tenang sebelum Mim.', correctionGuide: 'Panjangkan 4 ketukan.', audioHint: 'Mad 4 ketukan.', targetMetric: 'Tajwid 98%' }
    ]
  },

  // 39. SURAH AL-MULK (67)
  {
    id: 'surah-067',
    surahNumber: 67,
    ayahNumber: 1,
    surahName: '067. Surah Al-Mulk',
    surahArabic: 'سُورَةُ المُلْكِ',
    sheikhAudioUrl: 'https://everyayah.com/data/Alafasy_128kbps/067001.mp3',
    translation: 'Mahasuci Allah yang di tangan-Nya segala kerajaan, dan Dia Mahakuasa atas segala sesuatu.',
    tajweedRule: 'Hukum Mad Thabi’i, Izhar Qamariyah & Mad ‘Aridh Lissukun',
    idealDurationMinSec: 10,
    idealDurationMaxSec: 25,
    ustadzNote: 'Berikan jeda yang tenang di akhir Ayat 1 agar lafaz قَدِيرٌ mendapatkan resonansi Mad ‘Aridh Lissukun 4 hingga 6 harakat.',
    words: [
      { id: 'w067-1', arabic: 'تَبَٰرَكَ', transliteration: 'Tabāroka', status: 'perfect', tag: 'Tafkhim Raa', title: 'Makhraj & Raa', icon: 'check_circle', body: 'Taa ujung lidah, Raa tebal.', correctionGuide: 'Tebalkan Raa.', audioHint: 'Raa tebal.', targetMetric: 'Makharij 98%' },
      { id: 'w067-2', arabic: 'ٱلَّذِى', transliteration: 'Alladzī', status: 'correct', tag: 'Dzal Halus', title: 'Makhraj Dzal', icon: 'check_circle', body: 'Dzal lembut di ujung lidah.', correctionGuide: 'Sentuhkan ke gigi seri atas.', audioHint: 'Dzal lembut.', targetMetric: 'Tajwid 95%' },
      { id: 'w067-3', arabic: 'بِيَدِهِ', transliteration: 'Biyadihī', status: 'correct', tag: 'Haa Dada', title: 'Makhraj Haa', icon: 'check_circle', body: 'Haa dada mengalir alami.', correctionGuide: 'Alirkan hams Haa.', audioHint: 'Haa dada.', targetMetric: 'Kelancaran 94%' },
      { id: 'w067-4', arabic: 'ٱلْمُلْكُ', transliteration: 'Al-Mulku', status: 'warning', tag: 'Izhar Qamariyah', title: 'Lam Sakinah', icon: 'schedule', body: 'Tahan Lam sukun 1 ketukan.', correctionGuide: 'Tahan Lam sejenak.', audioHint: 'Tahan Lam.', targetMetric: 'Durasi Ghunnah' },
      { id: 'w067-5', arabic: 'قَدِيرٌ', transliteration: 'Qadīr', status: 'error', tag: 'Mad 4h Waqaf', title: 'Mad ‘Aridh Lissukun', icon: 'priority_high', body: 'Tahan mad 4 harakat sebelum waqaf Raa.', correctionGuide: 'Panjangkan mad 4 ketukan.', audioHint: 'Mad 4 ketukan.', targetMetric: 'Mad ‘Aridh' }
    ]
  }
];
