// lib/types.ts — Shared game types

export type CardType = 'AVATAR' | 'PERSONA' | 'SCENARIO' | 'UX_PROBLEM' | 'UI_PROBLEM' | 'CX_PROBLEM' | 'AI_PROBLEM';
export type PersonaStatus = 'AVAILABLE' | 'CLAIMED';
export type GameMode = 'LOCK_ON_FILL' | 'REPLACE_ALLOWED' | 'SOFT_LOCK';

export interface User {
  id: string;
  username: string;
  teamName?: string;
  teamMembers?: string[];
}

export interface Domain {
  id: string;
  name: string;
  description: string;
  icon: string;
}

export interface Persona {
  id: string;
  name: string;
  domain_id: string;
  color_code: string;
  asset_path: string;
  status: PersonaStatus;
  claimed_by_user_id: string | null;
  claimed_at?: string | null; // Added to resolve the mockData build error
  description?: string;
  scenario?: string;
  ux_problems?: string;
  ui_problems?: string;
  cx_problems?: string;
  ai_problems?: string;
  persona_details?: string;
}

export interface Card {
  id: string;
  persona_id: string;
  domain_id: string;
  card_type: CardType;
  content: string;
  isUpgraded?: boolean;
  heading?: string;
  subHeading?: string;
  listItems?: string[];
  sections?: { label: string; value: string }[];
  bodyText?: string;
}

export interface GameSession {
  id: string;
  user_id: string;
  persona_id: string;
  domain_id: string;
  slot_avatar_id: string | null;
  slot_persona_id: string | null;
  slot_scenario_id: string | null;
  slot_ux_problem_id: string | null;
  slot_ui_problem_id: string | null;
  slot_cx_problem_id: string | null;
  slot_ai_problem_id: string | null;
  is_complete: boolean;
}

export type SlotKey = 'AVATAR' | 'PERSONA' | 'SCENARIO' | 'UX_PROBLEM' | 'UI_PROBLEM' | 'CX_PROBLEM' | 'AI_PROBLEM';

export interface SlotState {
  AVATAR: Card | null;
  PERSONA: Card | null;
  SCENARIO: Card | null;
  UX_PROBLEM: Card | null;
  UI_PROBLEM: Card | null;
  CX_PROBLEM: Card | null;
  AI_PROBLEM: Card | null;
}

export const SLOT_ORDER: SlotKey[] = [
  'AVATAR',
  'PERSONA',
  'SCENARIO',
  'UX_PROBLEM',
  'UI_PROBLEM',
  'CX_PROBLEM',
  'AI_PROBLEM'
];

export const SLOT_LABELS: Record<SlotKey, string> = {
  AVATAR: 'Avatar',
  PERSONA: 'Persona',
  SCENARIO: 'Scenario',
  UX_PROBLEM: 'UX Problem',
  UI_PROBLEM: 'UI Problem',
  CX_PROBLEM: 'CX Problem',
  AI_PROBLEM: 'AI Problem',
};

export const CARD_TYPE_SLOT_MAP: Record<CardType, SlotKey> = {
  AVATAR: 'AVATAR',
  PERSONA: 'PERSONA',
  SCENARIO: 'SCENARIO',
  UX_PROBLEM: 'UX_PROBLEM',
  UI_PROBLEM: 'UI_PROBLEM',
  CX_PROBLEM: 'CX_PROBLEM',
  AI_PROBLEM: 'AI_PROBLEM',
};
