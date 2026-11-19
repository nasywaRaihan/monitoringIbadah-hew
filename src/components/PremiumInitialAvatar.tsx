import React from 'react';

interface PremiumInitialAvatarProps {
  name?: string;
  role?: string;
  className?: string;
  title?: string;
}

const HONORIFIC_PREFIXES = new Set([
  'ustadz',
  'ustadzah',
  'ustadz/ah',
  'ustz',
  'ustz.',
  'ust',
  'ust.',
  'kh',
  'kh.',
  'h',
  'h.',
  'hj',
  'hj.',
  'dr',
  'dr.',
  'drs',
  'drs.',
  'ir',
  'ir.'
]);

export function extractPremiumInitials(rawName?: string): string {
  const cleaned = (rawName || 'Pengguna')
    .replace(/[^a-zA-Z0-9\s']/g, ' ')
    .trim();

  if (!cleaned) return 'JT';

  const parts = cleaned.split(/\s+/).filter(Boolean);
  const meaningful = parts.filter(
    (word, idx) => !(idx === 0 && parts.length > 1 && HONORIFIC_PREFIXES.has(word.toLowerCase()))
  );

  const target = meaningful.length > 0 ? meaningful : parts;

  if (target.length >= 2) {
    return `${target[0][0] || ''}${target[1][0] || ''}`.toUpperCase();
  }

  const single = target[0] || 'JT';
  return single.slice(0, 2).toUpperCase();
}

const PREMIUM_PALETTES = [
  'bg-gradient-to-br from-[#012d1d] via-[#0e3a26] to-[#1b4332] text-[#fed488] ring-1 ring-[#fed488]/40',
  'bg-gradient-to-br from-[#0f291e] via-[#00452c] to-[#012d1d] text-[#ffdea5] ring-1 ring-[#c1ecd4]/45',
  'bg-gradient-to-br from-[#141b2b] via-[#1c2539] to-[#012d1d] text-[#fed488] ring-1 ring-[#fed488]/35',
  'bg-gradient-to-br from-[#4a350b] via-[#654a12] to-[#775a19] text-[#fff3d1] ring-1 ring-[#fed488]/50'
];

function getPaletteClass(name: string, role?: string): string {
  if (role === 'dept-hx' || role === 'hq-admin') {
    return PREMIUM_PALETTES[2];
  }
  if (role === 'admin') {
    return PREMIUM_PALETTES[3];
  }
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) % 997;
  }
  return PREMIUM_PALETTES[hash % 2];
}

function getFontSizeClass(className: string): string {
  if (/w-20|h-20|w-18|h-18|w-16|h-16/.test(className)) {
    return 'text-lg sm:text-xl';
  }
  if (/w-14|h-14|w-15|h-15|w-12|h-12/.test(className)) {
    return 'text-sm sm:text-base';
  }
  if (/w-6|h-6|w-7|h-7/.test(className)) {
    return 'text-[10px]';
  }
  return 'text-xs';
}

export const PremiumInitialAvatar: React.FC<PremiumInitialAvatarProps> = ({
  name = 'Pengguna',
  role,
  className = 'w-9 h-9 rounded-full',
  title
}) => {
  const initials = extractPremiumInitials(name);
  const paletteClass = getPaletteClass(name, role);
  const fontSizeClass = getFontSizeClass(className);

  // Strip object-cover so div classes remain clean
  const sanitizedClass = className.replace(/\bobject-cover\b/g, '').trim();

  return (
    <div
      title={title || name}
      aria-label={name}
      className={`inline-flex items-center justify-center rounded-full font-extrabold tracking-wider uppercase select-none shadow-sm shrink-0 ${paletteClass} ${fontSizeClass} ${sanitizedClass}`}
    >
      <span className="leading-none drop-shadow-[0_1px_1px_rgba(0,0,0,0.25)]">
        {initials}
      </span>
    </div>
  );
};
