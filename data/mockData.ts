// // lib/mockData.ts
// // Fully self-contained mock dataset — no Hasura/DB required for the MVP demo.

// import { Domain, Persona, Card, User } from '@/app/x/types/index';

// export const MOCK_USERS: User[] = [
//   { id: 'u1', username: 'PlayerOne', teamName: 'Alpha Squad', teamMembers: ['Alice', 'Bob', 'Charlie'] },
//   { id: 'u2', username: 'NeonRacer', teamName: 'Cyber Punks', teamMembers: ['Dave', 'Eve', 'Frank'] },
//   { id: 'u3', username: 'GridRunner', teamName: 'Velocity', teamMembers: ['Grace', 'Heidi', 'Ivan'] },
//   { id: 'u4', username: 'DataPilot', teamName: 'NeuroNet', teamMembers: ['Jack', 'Karl', 'Liam'] },
// ];

// export const MOCK_DOMAINS: Domain[] = [
//   { id: 'd1', name: 'FinTech', icon: '◈', description: 'Payments, trading, compliance & wealth management' },
//   { id: 'd2', name: 'HealthTech', icon: '⊕', description: 'Clinical workflows, diagnostics, & patient care' },
//   { id: 'd3', name: 'AI Tech', icon: '⊙', description: 'Model training, ethics, & intelligent agents' },
//   { id: 'd4', name: 'GameDev', icon: '🎮', description: 'Mechanics, rendering, & player experience' },
// ];

// export const MOCK_PERSONAS: Persona[] = [
//   { id: 'p01', name: 'MARIA', color_code: '#FFD700', asset_path: '/assets/avatars/placeholder.svg', status: 'AVAILABLE', claimed_by_user_id: null, claimed_at: null },
//   { id: 'p02', name: 'JAXON', color_code: '#aed581', asset_path: '/assets/avatars/placeholder.svg', status: 'AVAILABLE', claimed_by_user_id: null, claimed_at: null },
//   { id: 'p03', name: 'ELARA', color_code: '#ce93d8', asset_path: '/assets/avatars/placeholder.svg', status: 'AVAILABLE', claimed_by_user_id: null, claimed_at: null },
//   { id: 'p04', name: 'KAI', color_code: '#ffb74d', asset_path: '/assets/avatars/placeholder.svg', status: 'AVAILABLE', claimed_by_user_id: null, claimed_at: null },
//   { id: 'p05', name: 'ZARA', color_code: '#4db6ac', asset_path: '/assets/avatars/placeholder.svg', status: 'AVAILABLE', claimed_by_user_id: null, claimed_at: null },
//   { id: 'p06', name: 'FINN', color_code: '#81d4fa', asset_path: '/assets/avatars/placeholder.svg', status: 'AVAILABLE', claimed_by_user_id: null, claimed_at: null },
//   { id: 'p07', name: 'LUNA', color_code: '#f06292', asset_path: '/assets/avatars/placeholder.svg', status: 'AVAILABLE', claimed_by_user_id: null, claimed_at: null },
//   { id: 'p08', name: 'NOVA', color_code: '#ba68c8', asset_path: '/assets/avatars/placeholder.svg', status: 'AVAILABLE', claimed_by_user_id: null, claimed_at: null },
//   { id: 'p09', name: 'ORION', color_code: '#7986cb', asset_path: '/assets/avatars/placeholder.svg', status: 'AVAILABLE', claimed_by_user_id: null, claimed_at: null },
//   { id: 'p10', name: 'REMY', color_code: '#4fc3f7', asset_path: '/assets/avatars/placeholder.svg', status: 'AVAILABLE', claimed_by_user_id: null, claimed_at: null },
//   { id: 'p11', name: 'SAGE', color_code: '#4db6ac', asset_path: '/assets/avatars/placeholder.svg', status: 'AVAILABLE', claimed_by_user_id: null, claimed_at: null },
//   { id: 'p12', name: 'THEO', color_code: '#dce775', asset_path: '/assets/avatars/placeholder.svg', status: 'AVAILABLE', claimed_by_user_id: null, claimed_at: null },
//   { id: 'p13', name: 'VAL', color_code: '#ff8a65', asset_path: '/assets/avatars/placeholder.svg', status: 'AVAILABLE', claimed_by_user_id: null, claimed_at: null },
//   { id: 'p14', name: 'WREN', color_code: '#a1887f', asset_path: '/assets/avatars/placeholder.svg', status: 'AVAILABLE', claimed_by_user_id: null, claimed_at: null },
//   { id: 'p15', name: 'XER', color_code: '#90a4ae', asset_path: '/assets/avatars/placeholder.svg', status: 'AVAILABLE', claimed_by_user_id: null, claimed_at: null },
//   { id: 'p16', name: 'YARA', color_code: '#f48fb1', asset_path: '/assets/avatars/placeholder.svg', status: 'AVAILABLE', claimed_by_user_id: null, claimed_at: null },
//   { id: 'p17', name: 'ZANE', color_code: '#9575cd', asset_path: '/assets/avatars/placeholder.svg', status: 'AVAILABLE', claimed_by_user_id: null, claimed_at: null },
//   { id: 'p18', name: 'MIRA', color_code: '#64b5f6', asset_path: '/assets/avatars/placeholder.svg', status: 'AVAILABLE', claimed_by_user_id: null, claimed_at: null },
//   { id: 'p19', name: 'KOA', color_code: '#81c784', asset_path: '/assets/avatars/placeholder.svg', status: 'AVAILABLE', claimed_by_user_id: null, claimed_at: null },
//   { id: 'p20', name: 'IRIS', color_code: '#e57373', asset_path: '/assets/avatars/placeholder.svg', status: 'AVAILABLE', claimed_by_user_id: null, claimed_at: null },
// ];


// // ─────────────────────────────────────────────────────────────
// // 6 correct cards per persona — the new design sequence
// // ─────────────────────────────────────────────────────────────
// const HARDCODED_CARDS: Card[] = [
//   // p01 — MARIA
//   { 
//     id: 'c01-id', persona_id: 'p01', domain_id: 'd1', card_type: 'IDENTITY', 
//     heading: 'MARIA', content: 'The Busy Professional' 
//   },
//   { 
//     id: 'c01-desc', persona_id: 'p01', domain_id: 'd1', card_type: 'DESCRIPTION', 
//     heading: 'The Busy Professional', subHeading: 'Early Adopter', content: 'Maria Profile',
//     sections: [
//       { label: 'Demographics', value: '34, Urban, Tech-savvy' },
//       { label: 'Goals', value: 'Efficiency, Automation, Speed' },
//       { label: 'Pain Points', value: 'Complexity, Lag, Manual steps' },
//     ]
//   },
//   { 
//     id: 'c01-scen', persona_id: 'p01', domain_id: 'd1', card_type: 'SCENARIO', 
//     heading: 'Morning Rush', content: 'Scenario Context',
//     bodyText: 'Maria needs to quickly check her schedule while commuting on a crowded train.' 
//   },
//   { 
//     id: 'c01-task', persona_id: 'p01', domain_id: 'd1', card_type: 'TASK', 
//     heading: 'Daily Briefing', content: 'Core Task',
//     bodyText: 'Generate a summary of the most important tasks for the day in under 30 seconds.' 
//   },
//   { 
//     id: 'c01-flow', persona_id: 'p01', domain_id: 'd1', card_type: 'TASK_FLOW', 
//     heading: 'Task Workflow', content: 'Process Steps',
//     listItems: [
//       'Open AI Assistant app',
//       'Voice command: "Brief me"',
//       'Review task list',
//       'Prioritize top 3 items',
//       'Confirm and start focus mode',
//     ]
//   },
//   { 
//     id: 'c01-pers', persona_id: 'p01', domain_id: 'd1', card_type: 'PERSUASION', 
//     heading: 'Social Proof', subHeading: 'Framing', content: 'Tool nudge',
//     bodyText: 'Join 10,000+ professionals who save 2 hours daily using our briefing tool.' 
//   },
// ];

// const generatedCards: Card[] = [];
// MOCK_PERSONAS.forEach(p => {
//   MOCK_DOMAINS.forEach(d => {
//     const hasHardcoded = HARDCODED_CARDS.some(c => c.persona_id === p.id && c.domain_id === d.id);
//     if (!hasHardcoded) {
//       generatedCards.push({ id: `c-${p.id}-${d.id}-id`, persona_id: p.id, domain_id: d.id, card_type: 'IDENTITY', heading: p.name, content: `${p.name} Identity` });
//       generatedCards.push({ 
//         id: `c-${p.id}-${d.id}-desc`, persona_id: p.id, domain_id: d.id, card_type: 'DESCRIPTION', 
//         heading: `${p.name} Profile`, content: 'Description',
//         sections: [{ label: 'Trait', value: 'Archetype Trait' }]
//       });
//       generatedCards.push({ id: `c-${p.id}-${d.id}-scen`, persona_id: p.id, domain_id: d.id, card_type: 'SCENARIO', heading: 'The Scenario', content: 'Scenario', bodyText: `Context for ${p.name}.` });
//       generatedCards.push({ id: `c-${p.id}-${d.id}-task`, persona_id: p.id, domain_id: d.id, card_type: 'TASK', heading: 'The Task', content: 'Task', bodyText: `Task for ${p.name}.` });
//       generatedCards.push({ id: `c-${p.id}-${d.id}-flow`, persona_id: p.id, domain_id: d.id, card_type: 'TASK_FLOW', heading: 'The Flow', content: 'Flow', listItems: ['Action 1', 'Action 2'] });
//       generatedCards.push({ id: `c-${p.id}-${d.id}-pers`, persona_id: p.id, domain_id: d.id, card_type: 'PERSUASION', heading: 'The Tool', content: 'Tool', bodyText: `Nudge for ${p.name}.` });
//     }
//   });
// });

// export const MOCK_CARDS: Card[] = [...HARDCODED_CARDS, ...generatedCards];

// export function buildDeck(_correctCards: Card[], allCards: Card[], domainId: string): Card[] {
//   // Return all cards for this domain, shuffled.
//   // The RuleManager will filter them to show only the relevant next slot.
//   return allCards
//     .filter(c => c.domain_id === domainId)
//     .sort(() => Math.random() - 0.5);
// }

// import { SlotState, SlotKey, SLOT_ORDER } from '@/types';

// export function isFlowComplete(slots: SlotState, correctCards: Card[]): boolean {
//   return SLOT_ORDER.every((slotKey: SlotKey) => {
//     const placed = slots[slotKey];
//     if (!placed) return false;
//     const correct = correctCards.find(c => c.card_type === slotKey);
//     return placed.id === correct?.id;
//   });
// }

// export function getCorrectCards(personaId: string, domainId: string): Card[] {
//   return MOCK_CARDS.filter(c => c.persona_id === personaId && c.domain_id === domainId);
// }







// lib/mockData.ts
// Fully self-contained mock dataset — no Hasura/DB required for the MVP demo.

import { Domain, Persona, Card, User } from '@/app/x/types/index';
import {
  HeartPulse,
  GraduationCap,
  Landmark,
  ShoppingCart,
  TrainFront, // or Truck / Bus
  Sprout, // or Tractor
  Store,
  Plane, // or MapPin
  Scale, // or Building2
  Clapperboard
} from 'lucide-react';
export const MOCK_USERS: User[] = [
  { id: 'u1', username: 'PlayerOne', teamName: 'Alpha Squad', teamMembers: ['Alice', 'Bob', 'Charlie'] },
  { id: 'u2', username: 'NeonRacer', teamName: 'Cyber Punks', teamMembers: ['Dave', 'Eve', 'Frank'] },
  { id: 'u3', username: 'GridRunner', teamName: 'Velocity', teamMembers: ['Grace', 'Heidi', 'Ivan'] },
  { id: 'u4', username: 'DataPilot', teamName: 'NeuroNet', teamMembers: ['Jack', 'Karl', 'Liam'] },
];

// export const MOCK_DOMAINS: Domain[] = [
//   { id: 'd1', name: 'Health Care Sector', icon: '◈', description: 'Delivering quality healthcare services to improve patient outcomes and wellbeing.' },
//   { id: 'd2', name: 'Education Sector', icon: '⊕', description: 'Empowering learners through accessible, engaging, and effective educational experiences.' },
//   { id: 'd3', name: 'Banking & Finance Sector', icon: '⊙', description: 'Managing financial transactions securely while enabling economic growth opportunities.' },
//   { id: 'd4', name: 'E-Commerce Sector', icon: '🎮', description: 'Providing convenient online shopping experiences with seamless digital transactions.' },
//   { id: 'd5', name: 'Transportation & Mobility Sector', icon: '🎮', description: 'Enabling efficient movement of people and goods across regions.' },
//   { id: 'd6', name: 'Agriculture Sector', icon: '🎮', description: 'Enhancing crop production through sustainable farming practices and innovation.' },
//   { id: 'd7', name: 'Retail Sector', icon: '🎮', description: 'Connecting customers with products through personalized shopping experiences daily.' },
//   { id: 'd8', name: 'Travel & Hospitality Sector', icon: '🎮', description: 'Creating exceptional travel experiences and comfortable hospitality services worldwide.' },
//   { id: 'd9', name: 'Government & Public Service Sector', icon: '🎮', description: 'Delivering public services efficiently while promoting transparency and accountability.' },
//   { id: 'd10', name: 'Media & Entertainment Sector', icon: '🎮', description: 'Engaging audiences with creative content across diverse digital platforms.' },
// ];

export const MOCK_DOMAINS: Domain[] = [
  { id: 'd1', name: 'Health Care Sector', icon: '✚', description: 'Delivering quality healthcare services to improve patient outcomes and wellbeing.' }, // Heavy cross
  { id: 'd2', name: 'Education Sector', icon: '✎', description: 'Empowering learners through accessible, engaging, and effective educational experiences.' }, // Pencil
  { id: 'd3', name: 'Banking & Finance Sector', icon: '⛃', description: 'Managing financial transactions securely while enabling economic growth opportunities.' }, // Coin stack / Database
  { id: 'd4', name: 'E-Commerce Sector', icon: '⊞', description: 'Providing convenient online shopping experiences with seamless digital transactions.' }, // Digital grid / Window
  { id: 'd5', name: 'Transportation & Mobility Sector', icon: '⇄', description: 'Enabling efficient movement of people and goods across regions.' }, // Movement arrows
  { id: 'd6', name: 'Agriculture Sector', icon: '⚘', description: 'Enhancing crop production through sustainable farming practices and innovation.' }, // Plant symbol
  { id: 'd7', name: 'Retail Sector', icon: '⌂', description: 'Connecting customers with products through personalized shopping experiences daily.' }, // Storefront / Building
  { id: 'd8', name: 'Travel & Hospitality Sector', icon: '⛯', description: 'Creating exceptional travel experiences and comfortable hospitality services worldwide.' }, // Map marker / Compass
  { id: 'd9', name: 'Government & Public Service Sector', icon: '🏛', description: 'Delivering public services efficiently while promoting transparency and accountability.' }, // Scales
  { id: 'd10', name: 'Media & Entertainment Sector', icon: '▷', description: 'Engaging audiences with creative content across diverse digital platforms.' }  // Play button
];


export const MOCK_PERSONAS: Persona[] = [
  {
    id: "p01",
    name: "Shanti Devi",
    domain_id: "d1",
    color_code: "#FEF102",
    asset_path: "/assets/avatars/ShantiDevi.svg",
    status: "AVAILABLE",
    claimed_by_user_id: null,
    claimed_at: null,
    persona_details: "63, female | Goals: Book doctor appointments easily, Access prescriptions and reports, Understand medicines | Pain Points: Difficulty reading English interfaces, Confused by medical terminology",
    scenario: "Shanti Devi needs to consult a doctor for diabetes follow-up. She attempts to use a telemedicine app but struggles to upload reports and locate the consultation button.",
    ux_problems: "Complex appointment booking flows, Too many steps for report uploads, Poor onboarding for elderly users, Lack of guided navigation, No offline-first experience",
    ui_problems: "Visual Clutter, Small text sizes, Poor contrast ratios, Non-standard icons, Lack of visual cues",
    cx_problems: "Fear of wrong diagnosis, Anxiety during online consultations, Lack of human reassurance, Inconsistent support experience, Reduced trust after failed payments",
    ai_problems: "Poor regional language understanding, Inaccurate symptom prediction, Biased health recommendations, Weak personalization for chronic patients, Inability to detect emotional distress"
  },
  {
    id: "p02",
    name: "Rohit Malhotra",
    domain_id: "d1",
    color_code: "#CADB2B",
    asset_path: "/assets/avatars/Rohit.svg",
    status: "AVAILABLE",
    claimed_by_user_id: null,
    claimed_at: null,
    persona_details: "32, male | Goals: Quick doctor consultations, Fast insurance claims, Smart health tracking | Pain Points: Too many irrelevant notifications, Confusing insurance claim process",
    scenario: "Rohit uses a health app to schedule annual checkups and manage fitness reports but receives irrelevant notifications and duplicate reminders.",
    ux_problems: "Fragmented patient journeys, Repetitive data entry, Poor synchronization across devices, Confusing insurance claim workflow",
    ui_problems: "Cluttered dashboards, Notification overload, Unclear CTAs, Difficult report comparison views",
    cx_problems: "Distrust in hidden healthcare costs, Frustration from delayed customer support, Lack of continuity between hospitals and insurers, Emotional stress during emergencies",
    ai_problems: "Incorrect health risk scoring, Weak predictive alerts, Generic fitness recommendations, Data privacy concerns, Poor integration of wearable data"
  },
  {
    id: "p03",
    name: "Kavya",
    domain_id: "d2",
    color_code: "#72AC22",
    asset_path: "/assets/avatars/Kavya.svg",
    status: "AVAILABLE",
    claimed_by_user_id: null,
    claimed_at: null,
    persona_details: "14, female | Goals: Access learning content, Prepare for exams, Learn in Punjabi/Hindi | Pain Points: Poor internet for online learning, Difficult navigation on LMS platforms",
    scenario: "Kavya attends online classes through a state LMS but struggles due to poor internet and difficult navigation.",
    ux_problems: "Complicated course navigation, Lack of progress indicators, Poor mobile optimization, High cognitive load for students",
    ui_problems: "Tiny clickable areas, Poor readability, Non responsive layouts, Excessive text heavy screens",
    cx_problems: "Feeling disconnected from teachers, Low motivation due to isolation, Frustration from technical issues, Reduced confidence after repeated failures",
    ai_problems: "Weak adaptive learning models, Poor language translation quality, Inaccurate student performance prediction, Lack of emotional engagement analysis"
  },
  {
    id: "p04",
    name: "Dr. Meera",
    domain_id: "d2",
    color_code: "#4BB059",
    asset_path: "/assets/avatars/DrMeera.svg",
    status: "AVAILABLE",
    claimed_by_user_id: null,
    claimed_at: null,
    persona_details: "45, female | Goals: Manage assignments efficiently, Track student performance, Conduct hybrid classes | Pain Points: Time consuming grading workflows, Overcrowded dashboards",
    scenario: "Dr. Meera uses a university LMS to upload assignments but struggles with grading automation and analytics.",
    ux_problems: "Complex admin workflows, Multi step grading systems, Poor analytics discoverability, Time consuming content uploads",
    ui_problems: "Overcrowded teacher dashboards, Difficult table navigation, Poor accessibility for long sessions, Inconsistent layouts across modules",
    cx_problems: "Burnout due to repetitive tasks, Lack of trust in digital grading, Difficulty maintaining student engagement, Reduced satisfaction from system crashes",
    ai_problems: "Incorrect plagiarism detection, Weak recommendation engines, Bias in automated grading, Poor predictive dropout analysis"
  },
  {
    id: "p05",
    name: "Suresh",
    domain_id: "d3",
    color_code: "#319F69",
    asset_path: "/assets/avatars/Suresh.svg",
    status: "AVAILABLE",
    claimed_by_user_id: null,
    claimed_at: null,
    persona_details: "40, male | Goals: Manage inventory, Track sales, File GST easily | Pain Points: Complex tax filing, Difficult inventory management, Lack of business insights",
    scenario: "Suresh tries to use a business management app to track his shop's inventory and file GST but finds the interface overwhelming.",
    ux_problems: "Confusing tax filing steps, Lack of bulk inventory updates, Poor data visualization, Non-intuitive navigation",
    ui_problems: "Cluttered data tables, Small fonts, Lack of visual hierarchy, Inconsistent button styles",
    cx_problems: "Anxiety over tax compliance, Frustration with slow support, Lack of trust in data security, Feeling overwhelmed by complex features",
    ai_problems: "Inaccurate sales forecasting, Weak inventory alerts, Generic business advice, Poor tax calculation accuracy"
  },

  {
    id: "p06",
    name: "Aditi",
    domain_id: "d3",
    color_code: "#29BA8F",
    asset_path: "/assets/avatars/Aditi.svg",
    status: "AVAILABLE",
    claimed_by_user_id: null,
    claimed_at: null,
    persona_details: "27, male | Goals: Invest in mutual funds Track portfolio growth Receive smart financial insights | Pain Points: Complex investment analysis Irrelevant financial suggestions",
    scenario: "Aditi uses an investment app but receives confusing risk analysis and irrelevant investment suggestions.",
    ux_problems: "Difficult onboarding for investors Complex portfolio comparison flows Poor transaction transparency Overwhelming financial information",
    ui_problems: "Cluttered data tables, Small fonts, Lack of visual hierarchy, Inconsistent button styles",
    cx_problems: "Anxiety over tax compliance, Frustration with slow support, Lack of trust in data security, Feeling overwhelmed by complex features",
    ai_problems: "Inaccurate sales forecasting, Weak inventory alerts, Generic business advice, Poor tax calculation accuracy"
  },






];

// ─────────────────────────────────────────────────────────────
// 7 correct cards per persona — the new design sequence
// ─────────────────────────────────────────────────────────────
export const HARDCODED_CARDS: Card[] = [
  // p01 — Shanti Devi (Mapped to d1)
  {
    id: 'c01-avatar', persona_id: 'p01', domain_id: 'd1', card_type: 'AVATAR',
    heading: 'Shanti Devi', content: 'Elderly Rural Patient'
  },
  {
    id: 'c01-persona', persona_id: 'p01', domain_id: 'd1', card_type: 'PERSONA',
    heading: 'Elderly Rural Patient', subHeading: 'Shanti Devi', content: 'Profile Details',
    sections: [
      { label: 'Demographics', value: '63, female' },
      { label: 'Goals', value: 'Book doctor appointments easily, Access prescriptions' },
      { label: 'Pain Points', value: 'Difficulty reading English, Confused by medical terminology' },
    ]
  },
  {
    id: 'c01-scenario', persona_id: 'p01', domain_id: 'd1', card_type: 'SCENARIO',
    heading: 'The Scenario', content: 'Scenario Context',
    bodyText: 'Shanti Devi needs to consult a doctor for diabetes follow-up. She attempts to use a telemedicine app but struggles to upload reports and locate the consultation button.'
  },
  {
    id: 'c01-ux', persona_id: 'p01', domain_id: 'd1', card_type: 'UX_PROBLEM',
    heading: 'UX Challenges', content: 'UX Problem',
    bodyText: 'Complex appointment booking flows, Too many steps for report uploads, Poor onboarding for elderly users.'
  },
  {
    id: 'c01-ui', persona_id: 'p01', domain_id: 'd1', card_type: 'UI_PROBLEM',
    heading: 'UI & Interaction', content: 'UI Problem',
    listItems: [
      'Visual Clutter',
      'Small text sizes',
      'Poor contrast ratios',
      'Non-standard icons',
      'Lack of visual cues'
    ]
  },
  {
    id: 'c01-cx', persona_id: 'p01', domain_id: 'd1', card_type: 'CX_PROBLEM',
    heading: 'CX & Trust', subHeading: 'Emotional Nudge', content: 'CX Problem',
    bodyText: 'Fear of wrong diagnosis, Anxiety during online consultations, Lack of human reassurance.'
  },
  {
    id: 'c01-ai', persona_id: 'p01', domain_id: 'd1', card_type: 'AI_PROBLEM',
    heading: 'AI Intelligence', content: 'AI Problem',
    bodyText: 'Poor regional language understanding, Inaccurate symptom prediction, Biased health recommendations.'
  },
];

const generatedCards: Card[] = [];
MOCK_PERSONAS.forEach(p => {
  const dId = p.domain_id;
  const hasHardcoded = HARDCODED_CARDS.some(c => c.persona_id === p.id && c.domain_id === dId);

  if (!hasHardcoded) {
    // 1. AVATAR
    generatedCards.push({
      id: `c-${p.id}-avatar`, persona_id: p.id, domain_id: dId, card_type: 'AVATAR',
      heading: p.name, content: "Persona Archetype"
    });

    // 2. PERSONA
    const descParts = p.persona_details?.split('|') || [];
    const sections = descParts.map(part => {
      const [label, ...valueParts] = part.split(':');
      if (valueParts.length === 0) return { label: 'Bio', value: label.trim() };
      return {
        label: label?.trim() || "Profile",
        value: valueParts.join(':')?.trim() || part.trim()
      };
    });
    generatedCards.push({
      id: `c-${p.id}-persona`, persona_id: p.id, domain_id: dId, card_type: 'PERSONA',
      heading: "Archetype Profile", subHeading: p.name, content: 'Persona Details',
      sections: sections.length > 0 ? sections : [{ label: 'Trait', value: 'Archetype Trait' }]
    });

    // 3. SCENARIO
    generatedCards.push({
      id: `c-${p.id}-scenario`, persona_id: p.id, domain_id: dId, card_type: 'SCENARIO',
      heading: 'The Scenario', content: 'Scenario',
      bodyText: p.scenario || `Context for ${p.name}.`
    });

    // 4. UX_PROBLEM
    generatedCards.push({
      id: `c-${p.id}-ux`, persona_id: p.id, domain_id: dId, card_type: 'UX_PROBLEM',
      heading: 'UX Challenges', content: 'UX Problem',
      bodyText: p.ux_problems || `Analyze UX for ${p.name}.`
    });

    // 5. UI_PROBLEM
    const uiList = p.ui_problems?.split(',').map(s => s.trim()).filter(s => s && s.toLowerCase() !== 'z') || [];
    generatedCards.push({
      id: `c-${p.id}-ui`, persona_id: p.id, domain_id: dId, card_type: 'UI_PROBLEM',
      heading: 'UI & Interaction', content: 'UI Problem',
      listItems: uiList.length > 0 ? uiList : ['Analyze visual hierarchy', 'Review touch targets', 'Check accessibility']
    });

    // 6. CX_PROBLEM
    generatedCards.push({
      id: `c-${p.id}-cx`, persona_id: p.id, domain_id: dId, card_type: 'CX_PROBLEM',
      heading: 'CX & Trust', subHeading: 'Emotional Nudge',
      content: 'CX Problem',
      bodyText: p.cx_problems || `Build trust with ${p.name}.`
    });

    // 7. AI_PROBLEM
    generatedCards.push({
      id: `c-${p.id}-ai`, persona_id: p.id, domain_id: dId, card_type: 'AI_PROBLEM',
      heading: 'AI Intelligence', content: 'AI Problem',
      bodyText: p.ai_problems || `AI recommendations for ${p.name}.`
    });
  }
});

export const MOCK_CARDS: Card[] = [...HARDCODED_CARDS, ...generatedCards];

export function buildDeck(_correctCards: Card[], allCards: Card[], domainId: string): Card[] {
  // Return all cards for this domain, shuffled.
  // The RuleManager will filter them to show only the relevant next slot.
  return allCards
    .filter(c => c.domain_id === domainId)
    .sort(() => Math.random() - 0.5);
}

import { SlotState, SlotKey, SLOT_ORDER } from '@/app/x/types/index';

export function isFlowComplete(slots: SlotState, correctCards: Card[]): boolean {
  return SLOT_ORDER.every((slotKey: SlotKey) => {
    const placed = slots[slotKey];
    if (!placed) return false;
    const correct = correctCards.find(c => c.card_type === slotKey);
    return placed.id === correct?.id;
  });
}

export function getCorrectCards(personaId: string, domainId: string): Card[] {
  return MOCK_CARDS.filter(c => c.persona_id === personaId && c.domain_id === domainId);
}
