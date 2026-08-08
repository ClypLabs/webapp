// The clips the editor graphic rotates through.
//
// The metadata line is what ffprobe reports for the source file, and the game
// audio waveform is the real thing: the clip's own audio, reduced to 96 RMS
// buckets over the six seconds the excerpt covers.
//
// All five were captured with game audio alone, so their chat and mic rows are
// generated - the panel is showing what a three-track session looks like, and
// a row that vanishes reads as a bug rather than as a feature.

export const EXCERPT_SECONDS = 6;

const BARS = 96;

function noise(seed: number) {
  let value = seed;
  return () => {
    value = (value * 1103515245 + 12345) % 2147483648;
    return value / 2147483648;
  };
}

// Speech is bursts and gaps, not a rug of noise: someone says something, then
// stops. `talkiness` is how much of the six seconds they spend saying it.
function voice(seed: number, talkiness: number) {
  const rand = noise(seed);
  const out: number[] = [];
  let level = 0;
  let speaking = false;
  let hold = 0;

  for (let i = 0; i < BARS; i++) {
    if (hold <= 0) {
      speaking = rand() < talkiness;
      hold = 3 + Math.floor(rand() * 9);
    }
    hold--;
    // Idle is not silence - a live mic still has a floor.
    const target = speaking ? 0.35 + rand() * 0.6 : 0.08 + rand() * 0.05;
    level += (target - level) * 0.6;
    out.push(Math.round(Math.min(1, level) * 100) / 100);
  }
  return out;
}

export type EditorClip = {
  slug: string;
  /** Title exactly as the app names the file. */
  title: string;
  /** Basename in /media/games, from ClypDat's own game-icon cache. */
  icon: string;
  /** Metadata strip under the title bar. */
  created: string;
  format: string;
  size: string;
  /** Game, chat and mic, 96 bars each, 0-1. */
  waveforms: number[][];
};

// Track identities, in stream order. A clip with one stream is game audio.
export const TRACKS = [
  { label: "Game Audio", colour: "bg-teal-400/70", volume: 0.72 },
  { label: "Chat Audio", colour: "bg-sky-400/70", volume: 0.6 },
  { label: "Microphone", colour: "bg-amber-400/70", volume: 0.66 },
];

export const clips: EditorClip[] = [
  {
    slug: "fortnite",
    icon: "fortnite",
    title: "Fortnite - Jul-30-2026 - 04-45-41",
    created: "30 Jul 2026, 04:45",
    format: "1080p@60",
    size: "30.6 MB",
    waveforms: [
      [0.1,0.13,0.13,0.1,0.11,0.08,0.09,0.22,0.17,0.2,0.48,0.23,0.16,0.26,0.13,0.07,0.07,0.11,0.12,0.29,0.17,0.32,0.44,0.22,0.19,0.35,0.47,0.36,0.37,0.39,0.43,0.44,0.47,0.36,0.32,0.28,0.48,0.47,0.48,0.55,0.48,0.43,0.33,0.49,0.56,0.63,0.73,0.45,0.46,0.37,0.32,0.39,0.4,0.32,0.29,0.94,1,0.99,0.76,0.28,0.24,0.66,0.39,0.28,0.71,1,0.54,0.28,0.27,0.19,0.12,0.16,0.12,0.09,0.15,0.16,0.09,0.14,0.17,0.17,0.17,0.11,0.21,0.21,0.25,1,1,0.14,0.35,0.51,0.19,0.22,0.19,0.13,0.12,0.14],
      voice(6042, 0.58),
      voice(4571, 0.47),
    ],
  },
  {
    slug: "dead-by-daylight",
    icon: "dead-by-daylight",
    title: "Dead by Daylight - Jul-26-2026 - 00-13-54",
    created: "26 Jul 2026, 00:13",
    format: "1080p@60",
    size: "32.0 MB",
    waveforms: [
      [0.09,0.1,0.09,0.1,0.11,0.1,0.12,0.1,0.11,0.11,0.1,0.11,0.11,0.1,0.13,0.1,0.1,0.09,0.1,0.1,0.11,0.1,0.13,0.11,0.23,0.22,0.11,0.32,0.25,0.16,1,0.24,0.15,0.55,0.26,0.15,0.16,0.22,0.28,0.14,0.1,0.1,0.09,0.16,0.28,0.28,0.49,0.83,0.31,0.9,0.62,0.34,0.35,0.34,1,0.43,0.16,0.1,0.64,0.66,0.47,0.14,0.19,0.51,0.54,0.35,0.2,0.16,0.21,0.1,0.72,0.37,0.63,0.49,0.45,0.16,0.88,0.56,0.19,0.71,0.5,0.28,0.13,0.15,0.18,0.22,0.2,0.45,0.22,0.11,0.17,0.64,0.21,0.31,0.37,0.74],
      voice(1471, 0.5),
      voice(9203, 0.38),
    ],
  },
  {
    slug: "machine-party",
    icon: "machine-party",
    title: "Machine Party - Aug-02-2026 - 17-56-51",
    created: "2 Aug 2026, 17:56",
    format: "1080p@60",
    size: "18.8 MB",
    waveforms: [
      [0.09,0.22,0.3,0.18,0.1,0.16,0.41,0.37,0.14,0.22,0.2,0.47,0.2,0.12,0.13,0.26,0.27,0.3,0.27,0.16,0.15,0.15,0.14,0.19,0.25,0.37,0.15,0.14,0.26,0.18,0.17,0.27,0.73,0.12,0.13,0.2,0.25,0.55,0.47,0.27,0.4,0.46,0.68,0.8,0.43,0.82,0.69,0.43,0.9,0.54,0.57,1,0.48,0.27,0.94,0.4,0.43,0.45,0.66,0.32,0.21,0.45,0.56,0.17,0.13,0.51,0.45,0.14,0.35,0.74,0.52,0.37,0.4,0.34,0.19,0.43,0.28,0.15,0.43,0.23,0.18,0.31,0.17,0.17,0.16,0.33,0.25,0.47,0.39,0.3,0.26,0.23,0.51,0.38,0.36,0.17],
      voice(3312, 0.62),
      voice(7788, 0.45),
    ],
  },
  {
    slug: "necrodancer",
    icon: "necrodancer",
    title: "Rift of the NecroDancer - Jul-29-2026 - 04-31-46",
    created: "29 Jul 2026, 04:31",
    format: "1080p@60",
    size: "29.8 MB",
    waveforms: [
      [0.53,0.43,0.57,0.54,0.74,0.81,0.6,0.56,0.76,1,0.9,0.86,0.81,0.67,0.54,0.65,0.62,0.67,0.88,0.7,0.53,0.68,0.64,0.84,0.72,0.68,0.57,0.47,0.54,0.57,0.74,0.86,0.55,0.3,0.49,0.54,0.73,0.72,0.63,0.55,0.45,0.56,0.53,0.63,0.87,0.64,0.6,0.68,0.63,0.58,0.6,0.57,0.54,0.49,0.68,0.69,0.71,0.81,0.64,0.49,0.75,0.69,0.84,0.75,0.66,0.56,0.58,0.64,0.64,0.69,0.78,0.64,0.48,0.68,0.65,0.69,0.75,0.64,0.63,0.58,0.74,0.82,0.67,0.85,0.59,0.48,0.68,0.7,0.82,0.73,0.59,0.44,0.39,0.47,0.47,0.67],
      voice(5150, 0.42),
      voice(2604, 0.55),
    ],
  },
  {
    slug: "r6-siege",
    icon: "rainbow-six-siege",
    title: "Tom Clancy's Rainbow Six Siege - Jul-29-2026 - 21-26-12",
    created: "29 Jul 2026, 21:26",
    format: "1080p@60",
    size: "24.9 MB",
    waveforms: [
      [0.11,0.1,0.1,0.1,0.09,0.09,0.11,0.11,0.1,0.11,0.11,0.1,0.1,0.1,0.1,0.1,0.11,0.11,0.1,0.12,0.18,0.15,0.2,0.21,0.39,0.29,0.13,0.57,0.19,0.17,0.67,0.35,0.14,0.11,0.46,0.4,0.19,0.14,0.28,0.15,0.11,0.12,0.17,0.34,0.24,0.11,0.16,0.14,0.11,0.09,0.09,0.3,0.14,0.22,0.34,0.13,0.55,0.36,0.16,0.69,0.69,0.24,0.15,0.61,0.57,0.2,0.13,0.34,0.47,0.16,0.15,0.39,0.32,0.15,0.32,0.57,0.3,0.25,0.27,0.17,0.22,0.4,0.35,0.2,0.33,0.27,0.85,0.92,0.89,0.59,0.25,0.66,1,0.41,0.52,0.91],
      voice(8461, 0.68),
      voice(1937, 0.5),
    ],
  },
];
