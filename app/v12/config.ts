// ═══════════════════════════════════════════════════════════════════
// MODE CONFIGURATION & TYPES
// ═══════════════════════════════════════════════════════════════════

export const MODES = {
  genesis: {
    id: 'genesis',
    label: 'Genesis',
    hz: '432 Hz',
    color1: [1.0, 0.5, 0.2],
    color2: [1.0, 0.9, 0.8],
    bg: [0.02, 0.008, 0.004],
    tension: 0.15,
    friction: 0.85,
    n: 3.0,
    m: 5.0,
    shapeFn: 0,
  },
  revelation: {
    id: 'revelation',
    label: 'Revelation',
    hz: '528 Hz',
    color1: [0.0, 0.7, 0.6],
    color2: [0.8, 0.9, 1.0],
    bg: [0.0, 0.031, 0.039],
    tension: 0.2,
    friction: 0.8,
    n: 5.0,
    m: 7.0,
    shapeFn: 1,
  },
  ascension: {
    id: 'ascension',
    label: 'Ascension',
    hz: '963 Hz',
    color1: [0.5, 0.0, 1.0],
    color2: [1.0, 0.6, 0.2],
    bg: [0.039, 0.0, 0.059],
    tension: 0.1,
    friction: 0.9,
    n: 7.0,
    m: 11.0,
    shapeFn: 2,
  }
} as const;

export type ModeId = keyof typeof MODES;

// ═══════════════════════════════════════════════════════════════════
// SPRING PHYSICS
// ═══════════════════════════════════════════════════════════════════

export class Spring {
  val: number;
  target: number;
  vel: number;
  constructor(v: number) {
    this.val = v;
    this.target = v;
    this.vel = 0;
  }
  update(target: number, tension: number, friction: number) {
    this.target = target;
    this.vel += (this.target - this.val) * tension;
    this.vel *= friction;
    this.val += this.vel;
    return this.val;
  }
}

// ═══════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════

export const smoothstep = (e0: number, e1: number, x: number) => {
  const t = Math.max(0, Math.min(1, (x - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
};

// Quiz questions
export const QUIZ_QUESTIONS = [
  {
    question: "What does your body need most right now?",
    options: [
      { text: "Calm & grounding", icon: "🌿", weight: 'genesis' as ModeId },
      { text: "Clarity & focus", icon: "💎", weight: 'revelation' as ModeId },
      { text: "Energy & expansion", icon: "⚡", weight: 'ascension' as ModeId },
    ]
  },
  {
    question: "How would you describe your current state?",
    options: [
      { text: "Overwhelmed — I need to slow down", icon: "🌊", weight: 'genesis' as ModeId },
      { text: "Foggy — I need to cut through the noise", icon: "🔮", weight: 'revelation' as ModeId },
      { text: "Stagnant — I need to break free", icon: "🔥", weight: 'ascension' as ModeId },
    ]
  },
  {
    question: "When you close your eyes, what do you hear?",
    options: [
      { text: "A deep hum, like the earth breathing", icon: "🪨", weight: 'genesis' as ModeId },
      { text: "A clear tone, like a bell in still air", icon: "🔔", weight: 'revelation' as ModeId },
      { text: "A rising wave, like wind through a canyon", icon: "🌀", weight: 'ascension' as ModeId },
    ]
  }
];
