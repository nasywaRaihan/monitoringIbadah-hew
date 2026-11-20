import React, { useEffect, useState } from 'react';
import { BRAND_ASSETS } from '../data/mockData';

interface SplashScreenProps {
  onFinish: () => void;
  isLoggedIn?: boolean;
  activeUserName?: string;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({
  onFinish,
  isLoggedIn,
  activeUserName
}) => {
  const [progress, setProgress] = useState(15);
  const [loadingText, setLoadingText] = useState('Memulai sistem JejakTaqwa...');
  const [isFadingOut, setIsFadingOut] = useState(false);

  useEffect(() => {
    // Step 1: 300ms
    const t1 = setTimeout(() => {
      setProgress(45);
      setLoadingText('Memeriksa profil dan sesi halaqah...');
    }, 350);

    // Step 2: 850ms
    const t2 = setTimeout(() => {
      setProgress(85);
      if (isLoggedIn && activeUserName) {
        setLoadingText(`Sesi aktif terdeteksi: Ahlan wa Sahlan, ${activeUserName}!`);
      } else {
        setLoadingText('Menyiapkan gerbang masuk dan pendaftaran...');
      }
    }, 900);

    // Step 3: 1500ms
    const t3 = setTimeout(() => {
      setProgress(100);
      setLoadingText('Selesai!');
    }, 1500);

    // Step 4: Fade out & finish at 1800ms
    const t4 = setTimeout(() => {
      setIsFadingOut(true);
    }, 1750);

    const t5 = setTimeout(() => {
      onFinish();
    }, 2050);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
      clearTimeout(t5);
    };
  }, [onFinish, isLoggedIn, activeUserName]);

  const handleSkip = () => {
    setIsFadingOut(true);
    setTimeout(onFinish, 200);
  };

  return (
    <div
      className={`fixed inset-0 z-[80] flex flex-col items-center justify-between bg-gradient-to-b from-[#012d1d] via-[#1b4332] to-[#012d1d] text-white p-6 sm:p-8 select-none transition-opacity duration-300 ${
        isFadingOut ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
    >
      {/* Top Bar with Skip Action */}
      <div className="w-full max-w-md flex items-center justify-between">
        <span className="text-[11px] font-semibold text-[#86af99] tracking-wider uppercase">
          Versi 2.4 • Edisi Halaqah
        </span>
        <button
          onClick={handleSkip}
          className="text-xs font-medium text-[#c1ecd4] hover:text-white bg-white/10 hover:bg-white/20 px-3 py-1 rounded-full backdrop-blur-md transition-colors cursor-pointer"
        >
          Lewati &gt;
        </button>
      </div>

      {/* Center Branding Content */}
      <div className="flex flex-col items-center text-center max-w-sm px-4">
        {/* Ambient Ring & Logo */}
        <div className="relative mb-6">
          <div className="absolute -inset-4 rounded-full bg-[#53b889]/20 blur-xl animate-pulse" />
          <div className="relative w-28 h-28 sm:w-32 sm:h-32 rounded-3xl bg-[#012d1d]/90 border border-white/20 backdrop-blur-md flex items-center justify-center p-2.5 shadow-2xl overflow-hidden ring-4 ring-[#fed488]/20">
            <img
              src={BRAND_ASSETS.logo}
              alt=""
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
              className="w-full h-full object-contain filter drop-shadow-md rounded-2xl relative z-10"
            />
            <span className="absolute inset-0 flex items-center justify-center text-[#fed488] font-extrabold text-2xl tracking-tight select-none pointer-events-none">
              JT
            </span>
          </div>
        </div>

        {/* Bismillah Calligraphy */}
        <p className="font-amiri text-2xl sm:text-3xl text-[#fed488] mb-2 leading-relaxed tracking-wide">
          بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ
        </p>

        {/* App Title */}
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white mb-1.5">
          JejakTaqwa
        </h1>

        {/* Subtitle */}
        <p className="text-xs sm:text-sm text-[#c1ecd4] leading-relaxed max-w-sm font-normal">
          Aplikasi monitoring ibadah karyawan PT Herba Emas Wahidatama
        </p>
      </div>

      {/* Bottom Loading Progress Deck */}
      <div className="w-full max-w-xs flex flex-col items-center gap-3">
        {/* Progress Bar */}
        <div className="w-full h-1.5 bg-white/15 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-[#fed488] to-[#92f7c3] rounded-full transition-all duration-300 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Dynamic status text */}
        <p className="text-xs text-[#86af99] font-medium text-center truncate max-w-full">
          {loadingText}
        </p>

        <span className="text-[10px] text-white/40 mt-1">
          Dikelola untuk kemudahan Karyawan &amp; Ustadz/ah Pembimbing
        </span>
      </div>
    </div>
  );
};
