// Accurate Indonesian & Global Prayer Times Engine with Solar Astronomy
// Standards compliant with Kementerian Agama Republik Indonesia (Kemenag RI) & MWL

export interface RegionLocation {
  id: string;
  name: string;
  province: string;
  lat: number;
  lng: number;
  timezone: number; // UTC offset (7 = WIB, 8 = WITA, 9 = WIT)
  timezoneName: 'WIB' | 'WITA' | 'WIT';
  isGpsDetected?: boolean;
}

export interface PrayerTimeItem {
  id: 'subuh' | 'syuruq' | 'zhuhur' | 'ashar' | 'maghrib' | 'isya';
  name: string;
  arabic: string;
  hour: number;
  minute: number;
  timeStr: string;
  isPrayer: boolean; // false for Syuruq (sunrise)
}

// Popular Indonesian Cities & Regions
export const DEFAULT_INDONESIAN_REGIONS: RegionLocation[] = [
  {
    id: 'reg-purbalingga',
    name: 'Purbalingga (PT HEW)',
    province: 'Jawa Tengah',
    lat: -7.391215,
    lng: 109.344018,
    timezone: 7,
    timezoneName: 'WIB'
  },
  {
    id: 'reg-banyumas',
    name: 'Banyumas / Purwokerto',
    province: 'Jawa Tengah',
    lat: -7.4243,
    lng: 109.2304,
    timezone: 7,
    timezoneName: 'WIB'
  },
  {
    id: 'reg-jakarta',
    name: 'DKI Jakarta',
    province: 'DKI Jakarta',
    lat: -6.2088,
    lng: 106.8456,
    timezone: 7,
    timezoneName: 'WIB'
  },
  {
    id: 'reg-bandung',
    name: 'Bandung',
    province: 'Jawa Barat',
    lat: -6.9175,
    lng: 107.6191,
    timezone: 7,
    timezoneName: 'WIB'
  },
  {
    id: 'reg-semarang',
    name: 'Semarang',
    province: 'Jawa Tengah',
    lat: -6.9667,
    lng: 110.4167,
    timezone: 7,
    timezoneName: 'WIB'
  },
  {
    id: 'reg-yogyakarta',
    name: 'Yogyakarta',
    province: 'D.I. Yogyakarta',
    lat: -7.7956,
    lng: 110.3695,
    timezone: 7,
    timezoneName: 'WIB'
  },
  {
    id: 'reg-surakarta',
    name: 'Solo / Surakarta',
    province: 'Jawa Tengah',
    lat: -7.5667,
    lng: 110.8167,
    timezone: 7,
    timezoneName: 'WIB'
  },
  {
    id: 'reg-surabaya',
    name: 'Surabaya',
    province: 'Jawa Timur',
    lat: -7.2575,
    lng: 112.7521,
    timezone: 7,
    timezoneName: 'WIB'
  },
  {
    id: 'reg-malang',
    name: 'Malang',
    province: 'Jawa Timur',
    lat: -7.9797,
    lng: 112.6304,
    timezone: 7,
    timezoneName: 'WIB'
  },
  {
    id: 'reg-medan',
    name: 'Medan',
    province: 'Sumatera Utara',
    lat: 3.5952,
    lng: 98.6722,
    timezone: 7,
    timezoneName: 'WIB'
  },
  {
    id: 'reg-padang',
    name: 'Padang',
    province: 'Sumatera Barat',
    lat: -0.9471,
    lng: 100.4172,
    timezone: 7,
    timezoneName: 'WIB'
  },
  {
    id: 'reg-palembang',
    name: 'Palembang',
    province: 'Sumatera Selatan',
    lat: -2.9909,
    lng: 104.7565,
    timezone: 7,
    timezoneName: 'WIB'
  },
  {
    id: 'reg-makassar',
    name: 'Makassar',
    province: 'Sulawesi Selatan',
    lat: -5.1477,
    lng: 119.4327,
    timezone: 8,
    timezoneName: 'WITA'
  },
  {
    id: 'reg-denpasar',
    name: 'Denpasar',
    province: 'Bali',
    lat: -8.6705,
    lng: 115.2126,
    timezone: 8,
    timezoneName: 'WITA'
  },
  {
    id: 'reg-balikpapan',
    name: 'Balikpapan / IKN',
    province: 'Kalimantan Timur',
    lat: -1.2654,
    lng: 116.8312,
    timezone: 8,
    timezoneName: 'WITA'
  },
  {
    id: 'reg-jayapura',
    name: 'Jayapura',
    province: 'Papua',
    lat: -2.5916,
    lng: 140.669,
    timezone: 9,
    timezoneName: 'WIT'
  }
];

// Helper to convert radians / degrees
const degToRad = (d: number) => (d * Math.PI) / 180;
const radToDeg = (r: number) => (r * 180) / Math.PI;

/**
 * Astronomical Prayer Time Calculation
 * Method: Kementerian Agama RI (Fajr 20 deg, Isha 18 deg, 2-3 mins Ihtiyat)
 */
export function calculatePrayerTimes(
  lat: number,
  lng: number,
  timezone: number,
  date: Date = new Date()
): PrayerTimeItem[] {
  // Day of year calculation
  const startOfYear = new Date(date.getFullYear(), 0, 0);
  const diff = date.getTime() - startOfYear.getTime();
  const dayOfYear = Math.floor(diff / (1000 * 60 * 60 * 24));

  // Sun declination (delta in degrees)
  // Approximate standard formula
  const b = (360 / 365) * (dayOfYear - 81);
  const bRad = degToRad(b);
  const declination = 23.45 * Math.sin(bRad);
  const decRad = degToRad(declination);
  const latRad = degToRad(lat);

  // Equation of Time (EoT in minutes)
  const eot = 9.87 * Math.sin(2 * bRad) - 7.53 * Math.cos(bRad) - 1.5 * Math.sin(bRad);

  // Solar noon (Transit / Zhuhur) in hours
  // + 2 minutes ihtiyat (safety margin)
  const transitHours = 12 + timezone - lng / 15 - eot / 60 + 2 / 60;

  // Helper to compute hour angle (H in degrees) for a given sun altitude (alpha in degrees)
  const computeHourAngle = (alphaDeg: number) => {
    const alphaRad = degToRad(alphaDeg);
    const cosH =
      (Math.sin(alphaRad) - Math.sin(latRad) * Math.sin(decRad)) /
      (Math.cos(latRad) * Math.cos(decRad));

    if (cosH > 1) return 0; // Sun never rises
    if (cosH < -1) return 180; // Sun never sets
    return radToDeg(Math.acos(cosH));
  };

  // 1. Subuh: Sun altitude = -20 degrees (Kemenag standard)
  const hSubuh = computeHourAngle(-20);
  const subuhHours = transitHours - hSubuh / 15;

  // 2. Syuruq (Sunrise): Sun altitude = -0.833 degrees (refraction & sun radius)
  const hSyuruq = computeHourAngle(-0.833);
  const syuruqHours = transitHours - hSyuruq / 15;

  // 3. Ashar: Shadow length = 1 + noon shadow (Shafi'i standard)
  const noonAltitudeRad = Math.PI / 2 - Math.abs(latRad - decRad);
  const noonShadow = 1 / Math.tan(noonAltitudeRad);
  const asharAltitudeRad = Math.atan(1 / (1 + noonShadow));
  const asharAltitudeDeg = radToDeg(asharAltitudeRad);
  const hAshar = computeHourAngle(asharAltitudeDeg);
  const asharHours = transitHours + hAshar / 15;

  // 4. Maghrib: Sun altitude = -0.833 degrees + 2 minutes ihtiyat
  const hMaghrib = computeHourAngle(-0.833);
  const maghribHours = transitHours + hMaghrib / 15 + 2 / 60;

  // 5. Isya: Sun altitude = -18 degrees (Kemenag standard) + 2 minutes ihtiyat
  const hIsya = computeHourAngle(-18);
  const isyaHours = transitHours + hIsya / 15 + 2 / 60;

  // Helper to format float hours to HH:mm
  const formatTime = (hoursFloat: number) => {
    // Normalize to 0-24
    let normalized = hoursFloat % 24;
    if (normalized < 0) normalized += 24;

    const totalMinutes = Math.round(normalized * 60);
    const h = Math.floor(totalMinutes / 60) % 24;
    const m = totalMinutes % 60;

    return {
      hour: h,
      minute: m,
      timeStr: `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
    };
  };

  const subuh = formatTime(subuhHours);
  const syuruq = formatTime(syuruqHours);
  const zhuhur = formatTime(transitHours);
  const ashar = formatTime(asharHours);
  const maghrib = formatTime(maghribHours);
  const isya = formatTime(isyaHours);

  return [
    {
      id: 'subuh',
      name: 'Subuh',
      arabic: 'صلاة الفجر',
      hour: subuh.hour,
      minute: subuh.minute,
      timeStr: subuh.timeStr,
      isPrayer: true
    },
    {
      id: 'syuruq',
      name: 'Terbit',
      arabic: 'الشروق',
      hour: syuruq.hour,
      minute: syuruq.minute,
      timeStr: syuruq.timeStr,
      isPrayer: false
    },
    {
      id: 'zhuhur',
      name: 'Zhuhur',
      arabic: 'صلاة الظهر',
      hour: zhuhur.hour,
      minute: zhuhur.minute,
      timeStr: zhuhur.timeStr,
      isPrayer: true
    },
    {
      id: 'ashar',
      name: 'Ashar',
      arabic: 'صلاة العصر',
      hour: ashar.hour,
      minute: ashar.minute,
      timeStr: ashar.timeStr,
      isPrayer: true
    },
    {
      id: 'maghrib',
      name: 'Maghrib',
      arabic: 'صلاة المغرب',
      hour: maghrib.hour,
      minute: maghrib.minute,
      timeStr: maghrib.timeStr,
      isPrayer: true
    },
    {
      id: 'isya',
      name: 'Isya',
      arabic: 'صلاة العشاء',
      hour: isya.hour,
      minute: isya.minute,
      timeStr: isya.timeStr,
      isPrayer: true
    }
  ];
}

/**
 * Match coordinates to nearest Indonesian city/region
 */
export function findNearestRegion(lat: number, lng: number): RegionLocation {
  let closest = DEFAULT_INDONESIAN_REGIONS[0];
  let minDistance = Infinity;

  for (const reg of DEFAULT_INDONESIAN_REGIONS) {
    const dLat = reg.lat - lat;
    const dLng = reg.lng - lng;
    const distSq = dLat * dLat + dLng * dLng;
    if (distSq < minDistance) {
      minDistance = distSq;
      closest = reg;
    }
  }

  // If coordinates are specifically near Purbalingga / Banyumas
  if (minDistance < 0.25) {
    return closest;
  }

  // Estimate timezone from longitude if outside standard cities
  let tz = 7;
  let tzName: 'WIB' | 'WITA' | 'WIT' = 'WIB';
  if (lng > 120 && lng <= 135) {
    tz = 8;
    tzName = 'WITA';
  } else if (lng > 135) {
    tz = 9;
    tzName = 'WIT';
  }

  return {
    id: `custom-coords-${lat.toFixed(3)}-${lng.toFixed(3)}`,
    name: `Wilayah Koordinat (${lat.toFixed(2)}, ${lng.toFixed(2)})`,
    province: closest.province,
    lat,
    lng,
    timezone: tz,
    timezoneName: tzName,
    isGpsDetected: true
  };
}
