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

export function inferEffectiveAvatarRole(name?: string, explicitRole?: string): 'dept-hx' | 'admin' | 'member' {
  if (explicitRole === 'dept-hx' || explicitRole === 'hq-admin') {
    return 'dept-hx';
  }
  if (explicitRole === 'admin') {
    return 'admin';
  }
  const lower = (name || '').toLowerCase().trim();
  if (
    lower.includes('dept hx') ||
    lower.includes('departemen hx') ||
    lower.includes('direktorat') ||
    lower.includes('human experience')
  ) {
    return 'dept-hx';
  }
  if (/^(ustadz|ustadzah|ustadz\/ah|ustz\.?|ust\.?)\b/i.test(lower)) {
    return 'admin';
  }
  return 'member';
}

export function extractPremiumInitials(rawName?: string, role?: string): string {
  const effectiveRole = inferEffectiveAvatarRole(rawName, role);
  if (effectiveRole === 'dept-hx') {
    return 'HX';
  }

  const cleaned = (rawName || 'Pengguna')
    .replace(/\([^)]*\)/g, ' ')
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

const ROLE_PALETTES = {
  // Karyawan (Member): Emerald Forest Green
  member: [
    'bg-gradient-to-br from-[#012d1d] via-[#00452c] to-[#1b4332] text-[#92f7c3] ring-2 ring-[#92f7c3]/60',
    'bg-gradient-to-br from-[#064e3b] via-[#047857] to-[#012d1d] text-[#d1fae5] ring-2 ring-[#6ee7b7]/60'
  ],
  // Ustadz/ah (Pembimbing): Royal Amber-Gold Bronze
  admin:
    'bg-gradient-to-br from-[#785a1a] via-[#a17720] to-[#c8962e] text-[#fffbeb] ring-2 ring-[#fed488] shadow-[0_2px_10px_rgba(180,134,40,0.3)]',
  // Departemen HX (Human Experience): Royal Sapphire Navy Indigo
  'dept-hx':
    'bg-gradient-to-br from-[#1e3a8a] via-[#1d4ed8] to-[#0f172a] text-[#e0e7ff] ring-2 ring-[#93c5fd] shadow-[0_2px_10px_rgba(29,78,216,0.3)]'
};

function getPaletteClass(name: string, role?: string): string {
  const effectiveRole = inferEffectiveAvatarRole(name, role);
  if (effectiveRole === 'dept-hx') {
    return ROLE_PALETTES['dept-hx'];
  }
  if (effectiveRole === 'admin') {
    return ROLE_PALETTES.admin;
  }
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) % 997;
  }
  return ROLE_PALETTES.member[hash % ROLE_PALETTES.member.length];
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
  const effectiveRole = inferEffectiveAvatarRole(name, role);
  const initials = extractPremiumInitials(name, effectiveRole);
  const paletteClass = getPaletteClass(name, effectiveRole);
  const fontSizeClass = getFontSizeClass(className);

  // Strip object-cover and conflicting ring-* classes when role is admin or dept-hx so their distinct colors remain vivid
  const sanitizedClass = className
    .replace(/\bobject-cover\b/g, '')
    .replace(effectiveRole !== 'member' ? /\bring-[^\s]+\b/g : '', '')
    .trim();

  return (
    <div
      title={title || name}
      aria-label={name}
      className={`inline-flex items-center justify-center rounded-full font-extrabold tracking-wider uppercase select-none shadow-sm shrink-0 ${paletteClass} ${fontSizeClass} ${sanitizedClass}`}
    >
      <span className="leading-none drop-shadow-[0_1px_2px_rgba(0,0,0,0.3)]">
        {initials}
      </span>
    </div>
  );
};
