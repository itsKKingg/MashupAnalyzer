// Maps musical keys to Camelot notation for harmonic mixing
export interface CamelotMapping {
  key: string;
  camelot: string;
  position: number; // 0-23 for wheel positioning
}

export const CAMELOT_WHEEL: CamelotMapping[] = [
  // Inner wheel (A = minor)
  { key: 'Am', camelot: '1A', position: 0 },
  { key: 'Em', camelot: '2A', position: 1 },
  { key: 'Bm', camelot: '3A', position: 2 },
  { key: 'F#m', camelot: '4A', position: 3 },
  { key: 'C#m', camelot: '5A', position: 4 },
  { key: 'G#m', camelot: '6A', position: 5 },
  { key: 'D#m', camelot: '7A', position: 6 },
  { key: 'A#m', camelot: '8A', position: 7 },
  { key: 'Fm', camelot: '9A', position: 8 },
  { key: 'Cm', camelot: '10A', position: 9 },
  { key: 'Gm', camelot: '11A', position: 10 },
  { key: 'Dm', camelot: '12A', position: 11 },

  // Outer wheel (B = major)
  { key: 'C', camelot: '1B', position: 12 },
  { key: 'G', camelot: '2B', position: 13 },
  { key: 'D', camelot: '3B', position: 14 },
  { key: 'A', camelot: '4B', position: 15 },
  { key: 'E', camelot: '5B', position: 16 },
  { key: 'B', camelot: '6B', position: 17 },
  { key: 'F#', camelot: '7B', position: 18 },
  { key: 'C#', camelot: '8B', position: 19 },
  { key: 'G#', camelot: '9B', position: 20 },
  { key: 'D#', camelot: '10B', position: 21 },
  { key: 'A#', camelot: '11B', position: 22 },
  { key: 'F', camelot: '12B', position: 23 },
];

// Map standard key notation to Camelot (handles sharp/flat variations)
export function keyToCamelot(key: string): string {
  if (!key || key === 'Unknown') return 'N/A';

  // Normalize key notation
  const normalized = normalizeKeyNotation(key);
  
  const mapping = CAMELOT_WHEEL.find(m => m.key === normalized);
  return mapping ? mapping.camelot : 'N/A';
}

// Convert Camelot back to musical key
export function camelotToKey(camelot: string): string {
  const mapping = CAMELOT_WHEEL.find(m => m.camelot === camelot);
  return mapping ? mapping.key : 'Unknown';
}

// Get compatible Camelot codes for harmonic mixing
export function getCompatibleCamelot(camelot: string): string[] {
  if (!camelot || camelot === 'N/A') return [];

  const number = parseInt(camelot.substring(0, camelot.length - 1));
  const letter = camelot[camelot.length - 1];

  if (isNaN(number) || (letter !== 'A' && letter !== 'B')) return [];

  const compatible: string[] = [];

  // Same key
  compatible.push(camelot);

  // +1 (clockwise)
  const next = number === 12 ? 1 : number + 1;
  compatible.push(`${next}${letter}`);

  // -1 (counter-clockwise)
  const prev = number === 1 ? 12 : number - 1;
  compatible.push(`${prev}${letter}`);

  // Switch between A and B (relative major/minor)
  const otherLetter = letter === 'A' ? 'B' : 'A';
  compatible.push(`${number}${otherLetter}`);

  return compatible;
}

// Get compatible keys for a given key
export function getCompatibleKeys(key: string): string[] {
  const camelot = keyToCamelot(key);
  const compatibleCamelot = getCompatibleCamelot(camelot);
  return compatibleCamelot.map(camelotToKey).filter(k => k !== 'Unknown');
}

// Normalize key notation (handle variations like Db vs C#)
function normalizeKeyNotation(key: string): string {
  const flatToSharp: { [key: string]: string } = {
    'Db': 'C#',
    'Dbm': 'C#m',
    'Eb': 'D#',
    'Ebm': 'D#m',
    'Gb': 'F#',
    'Gbm': 'F#m',
    'Ab': 'G#',
    'Abm': 'G#m',
    'Bb': 'A#',
    'Bbm': 'A#m',
  };

  return flatToSharp[key] || key;
}

// Get color for Camelot position (for wheel visualization)
export function getCamelotColor(camelot: string): string {
  const colors = [
    '#FF6B6B', '#FF8E53', '#FFC93D', '#FFEE63',
    '#D4FF63', '#8FFF63', '#63FFB4', '#63F4FF',
    '#63C5FF', '#6B8EFF', '#9D6BFF', '#D66BFF'
  ];

  const number = parseInt(camelot.substring(0, camelot.length - 1));
  if (isNaN(number)) return '#999';

  return colors[(number - 1) % 12];
}

// Check if two keys are compatible
export function areKeysCompatible(key1: string, key2: string): boolean {
  const compatible = getCompatibleKeys(key1);
  return compatible.includes(key2);
}