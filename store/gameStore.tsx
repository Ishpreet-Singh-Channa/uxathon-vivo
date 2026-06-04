// // lib/gameStore.ts
// // Lightweight React Context-based state store — no Redux needed for MVP.
// // Swap persistence layer for Hasura mutations when backend is live.

// 'use client';
// import React, { createContext, useContext, useReducer, ReactNode } from 'react';
// import { Domain, Persona, Card, SlotState, User, CardType, CARD_TYPE_SLOT_MAP, GameMode } from '@/types';
// import { RuleManager } from '@/lib/GameRules';

// // ─── STATE ────────────────────────────────────────────────────
// export interface GameState {
//   currentUser:    User | null;
//   selectedDomain: Domain | null;
//   selectedPersona: Persona | null;
//   correctCards:   Card[];
//   deck:           Card[];
//   pool:           Card[];
//   discardPile:    Card[];
//   slots:          SlotState;
//   opponentCount:  number;
//   gamePhase: 'USER_SELECT' | 'DOMAIN_SELECT' | 'PERSONA_SELECT' | 'PLAYING' | 'WON' | 'PERSONA_TAKEN' | 'LEADERBOARD';
//   personaClaimed: boolean;
//   personaTakenBy: string | null;
//   gameMode:       GameMode;
//   confirmCard:    Card | null;
//   showTryAgainPopup: boolean;
//   showDeck:       boolean;
//   leaderboard:    Array<{
//     user: User;
//     persona: Persona;
//     domain: Domain;
//     claimedAt: string;
//   }>;
// }

// const emptySlots: SlotState = { 
//   IDENTITY:    null, 
//   DESCRIPTION: null, 
//   SCENARIO:    null, 
//   TASK:        null, 
//   TASK_FLOW:   null, 
//   PERSUASION:  null 
// };


// const initialState: GameState = {
//   currentUser:     null,
//   selectedDomain:  null,
//   selectedPersona: null,
//   correctCards:    [],
//   deck:            [],
//   pool:            [],
//   discardPile:     [],
//   slots:           emptySlots,
//   opponentCount:   0,
//   gamePhase:       'USER_SELECT',
//   personaClaimed:  false,
//   personaTakenBy:  null,
//   gameMode:        'LOCK_ON_FILL',
//   confirmCard:     null,
//   showTryAgainPopup: false,
//   showDeck:        true,
//   leaderboard:     [],
// };

// // ─── ACTIONS ──────────────────────────────────────────────────
// export type Action =
//   | { type: 'SET_USER';           payload: User }
//   | { type: 'SELECT_DOMAIN';      payload: Domain }
//   | { type: 'SELECT_PERSONA';     payload: { persona: Persona; correctCards: Card[]; deck: Card[] } }
//   | { type: 'PLACE_CARD';         payload: { card: Card } }
//   | { type: 'DISCARD_CARD' }
//   | { type: 'SET_OPPONENT_COUNT'; payload: number }
//   | { type: 'PERSONA_CLAIMED_BY_ME' }
//   | { type: 'PERSONA_TAKEN_BY';   payload: string }
//   | { type: 'RESET_BOARD' }
//   | { type: 'GO_TO_PHASE';        payload: GameState['gamePhase'] }
//   | { type: 'SET_GAME_MODE';      payload: GameMode }
//   | { type: 'SHOW_CONFIRM_POPUP'; payload: Card }
//   | { type: 'CANCEL_CONFIRM' }
//   | { type: 'SHOW_TRY_AGAIN' }
//   | { type: 'HIDE_TRY_AGAIN' }
//   | { type: 'PLACE_CARD_FORCE';   payload: { card: Card } }
//   | { type: 'TOGGLE_DECK_VISIBILITY' };

// function reducer(state: GameState, action: Action): GameState {
//   // Ensure leaderboard exists to prevent HMR or state initialization issues
//   const leaderboard = state.leaderboard || [];
//   const safeState = { ...state, leaderboard };

//   switch (action.type) {
//     case 'SET_USER':
//       return { ...safeState, currentUser: action.payload, gamePhase: 'DOMAIN_SELECT' };

//     case 'SELECT_DOMAIN':
//       return { ...safeState, selectedDomain: action.payload, gamePhase: 'PERSONA_SELECT' };

//     case 'SELECT_PERSONA': {
//       const { persona, correctCards, deck: initialPool } = action.payload;
//       const identityCard = correctCards.find(c => c.card_type === 'IDENTITY') || null;
      
//       const startingSlots = { 
//         ...emptySlots, 
//         IDENTITY: identityCard 
//       };

//       const remainingPool = identityCard 
//         ? initialPool.filter(c => c.id !== identityCard.id)
//         : initialPool;

//       const initialDeck = RuleManager.rebuildDeck(remainingPool, startingSlots, state.gameMode);
      
//       return {
//         ...safeState,
//         selectedPersona: persona,
//         correctCards:    correctCards,
//         pool:            remainingPool,
//         discardPile:     [],
//         deck:            initialDeck,
//         slots:           startingSlots,
//         gamePhase:       'PLAYING',
//         personaClaimed:  false,
//         personaTakenBy:  null,
//       };
//     }

//     case 'PLACE_CARD': {
//       const { card } = action.payload;
//       const slotKey = CARD_TYPE_SLOT_MAP[card.card_type as CardType];
//       const newSlots = { ...state.slots, [slotKey]: card };
//       let newPool = state.pool.filter(c => c.id !== card.id);
//       let newDeck = RuleManager.rebuildDeck(newPool, newSlots, state.gameMode);
//       let newDiscardPile = state.discardPile;

//       if (newDeck.length === 0 && newDiscardPile.length > 0) {
//         newPool = [...newPool, ...newDiscardPile].sort(() => Math.random() - 0.5);
//         newDeck = RuleManager.rebuildDeck(newPool, newSlots, state.gameMode);
//         newDiscardPile = [];
//       }

//       return {
//         ...safeState,
//         slots: newSlots,
//         pool: newPool,
//         deck: newDeck,
//         discardPile: newDiscardPile,
//       };
//     }

//     case 'DISCARD_CARD': {
//       if (state.deck.length === 0) return state;
//       const discardedCard = state.deck[0];
//       let newPool = state.pool.filter(c => c.id !== discardedCard.id);
//       let newDiscardPile = [...state.discardPile, discardedCard];
      
//       let newDeck = RuleManager.rebuildDeck(newPool, state.slots, state.gameMode);
      
//       // Respawn left-swiped cards if deck is empty
//       if (newDeck.length === 0 && newDiscardPile.length > 0) {
//         newPool = [...newPool, ...newDiscardPile].sort(() => Math.random() - 0.5);
//         newDeck = RuleManager.rebuildDeck(newPool, state.slots, state.gameMode);
//         newDiscardPile = [];
//       }
      
//       return { ...safeState, pool: newPool, discardPile: newDiscardPile, deck: newDeck };
//     }

//     case 'SET_OPPONENT_COUNT':
//       return { ...safeState, opponentCount: action.payload };

//     case 'PERSONA_CLAIMED_BY_ME': {
//       const newClaim = {
//         user: state.currentUser!,
//         persona: state.selectedPersona!,
//         domain: state.selectedDomain!,
//         claimedAt: new Date().toISOString(),
//       };
//       return { 
//         ...safeState, 
//         gamePhase: 'WON', 
//         personaClaimed: true,
//         leaderboard: [newClaim, ...leaderboard]
//       };
//     }

//     case 'PERSONA_TAKEN_BY':
//       return { ...safeState, gamePhase: 'PERSONA_TAKEN', personaTakenBy: action.payload };

//     case 'RESET_BOARD': {
//       const identityCard = state.correctCards.find(c => c.card_type === 'IDENTITY') || null;
//       const startingSlots = { ...emptySlots, IDENTITY: identityCard };
      
//       // Collect all cards currently in slots and pool, except the fixed identity card
//       const allCards = [...state.pool, ...Object.values(state.slots).filter(Boolean) as Card[]];
//       const newPool = allCards.filter(c => c.id !== identityCard?.id).sort(() => Math.random() - 0.5);
      
//       const newDeck = RuleManager.rebuildDeck(newPool, startingSlots, state.gameMode);
//       return {
//         ...safeState,
//         slots:          startingSlots,
//         pool:           newPool,
//         discardPile:    [],
//         deck:           newDeck,
//         gamePhase:      'PLAYING',
//         personaClaimed: false,
//         personaTakenBy: null,
//         showTryAgainPopup: false,
//       };
//     }

//     case 'GO_TO_PHASE':
//       return { ...safeState, gamePhase: action.payload };

//     case 'SET_GAME_MODE': {
//       const newMode = action.payload;
//       let newPool = state.pool;
//       let newDeck = RuleManager.rebuildDeck(newPool, state.slots, newMode);
//       let newDiscardPile = state.discardPile;

//       if (newDeck.length === 0 && newDiscardPile.length > 0) {
//         newPool = [...newPool, ...newDiscardPile].sort(() => Math.random() - 0.5);
//         newDeck = RuleManager.rebuildDeck(newPool, state.slots, newMode);
//         newDiscardPile = [];
//       }
//       return { ...safeState, gameMode: newMode, deck: newDeck, pool: newPool, discardPile: newDiscardPile };
//     }

//     case 'SHOW_CONFIRM_POPUP':
//       return { ...safeState, confirmCard: action.payload };

//     case 'CANCEL_CONFIRM':
//       return { ...safeState, confirmCard: null };

//     case 'SHOW_TRY_AGAIN':
//       return { ...safeState, showTryAgainPopup: true };

//     case 'HIDE_TRY_AGAIN':
//       return { ...safeState, showTryAgainPopup: false };

//     case 'PLACE_CARD_FORCE': {
//       const { card } = action.payload;
//       const slotKey = CARD_TYPE_SLOT_MAP[card.card_type as CardType];
//       const newSlots = { ...state.slots, [slotKey]: card };
//       let newPool = state.pool.filter(c => c.id !== card.id);
//       let newDeck = RuleManager.rebuildDeck(newPool, newSlots, state.gameMode);
//       let newDiscardPile = state.discardPile;

//       if (newDeck.length === 0 && newDiscardPile.length > 0) {
//         newPool = [...newPool, ...newDiscardPile].sort(() => Math.random() - 0.5);
//         newDeck = RuleManager.rebuildDeck(newPool, newSlots, state.gameMode);
//         newDiscardPile = [];
//       }

//       return {
//         ...safeState,
//         slots: newSlots,
//         pool: newPool,
//         deck: newDeck,
//         discardPile: newDiscardPile,
//         confirmCard: null,
//       };
//     }

//     case 'TOGGLE_DECK_VISIBILITY':
//       return { ...safeState, showDeck: !state.showDeck };

//     default:
//       return state;
//   }
// }

// // ─── CONTEXT ──────────────────────────────────────────────────
// const GameContext = createContext<{
//   state:    GameState;
//   dispatch: React.Dispatch<Action>;
// } | null>(null);

// export function GameProvider({ children }: { children: ReactNode }) {
//   const [state, dispatch] = useReducer(reducer, initialState);
//   return (
//     <GameContext.Provider value={{ state, dispatch }}>
//       {children}
//     </GameContext.Provider>
//   );
// }

// export function useGame() {
//   const ctx = useContext(GameContext);
//   if (!ctx) throw new Error('useGame must be used within GameProvider');
//   return ctx;
// }








// lib/gameStore.ts
// Lightweight React Context-based state store — no Redux needed for MVP.
// Swap persistence layer for Hasura mutations when backend is live.

'use client';
import React, { createContext, useContext, useReducer, ReactNode } from 'react';
import { Domain, Persona, Card, SlotState, User, CardType, CARD_TYPE_SLOT_MAP, GameMode } from '@/app/x/types/index';
import { RuleManager } from '@/app/x/lib/GameRules';

// ─── STATE ────────────────────────────────────────────────────
export interface GameState {
  currentUser:    User | null;
  selectedDomain: Domain | null;
  selectedPersona: Persona | null;
  takenBy:         null,
  outpacedBy:      null
  correctCards:   Card[];
  deck:           Card[];
  pool:           Card[];
  discardPile:    Card[];
  slots:          SlotState;
  opponentCount:  number;
  gamePhase: 'USER_SELECT' | 'DOMAIN_SELECT' | 'PERSONA_SELECT' | 'PLAYING' | 'WON' | 'PERSONA_TAKEN' | 'LEADERBOARD';
  personaClaimed: boolean;
  personaTakenBy: string | null;
  gameMode:       GameMode;
  confirmCard:    Card | null;
  showTryAgainPopup: boolean;
  showDeck:       boolean;
  leaderboard:    Array<{
    user: User;
    persona: Persona;
    domain: Domain;
    claimedAt: string;
  }>;
}

const emptySlots: SlotState = { 
  AVATAR:      null, 
  PERSONA:     null, 
  SCENARIO:    null, 
  UX_PROBLEM:  null, 
  UI_PROBLEM:  null, 
  CX_PROBLEM:  null, 
  AI_PROBLEM:  null 
};

const initialState: GameState = {
  currentUser:     null,
  selectedDomain:  null,
  selectedPersona: null,
  correctCards:    [],
  deck:            [],
  pool:            [],
  discardPile:     [],
  slots:           emptySlots,
  opponentCount:   0,
  gamePhase:       'USER_SELECT',
  personaClaimed:  false,
  personaTakenBy:  null,
  gameMode:        'LOCK_ON_FILL',
  confirmCard:     null,
  showTryAgainPopup: false,
  showDeck:        true,
  leaderboard:     [],
  takenBy:         null,
  outpacedBy:      null
};

// ─── ACTIONS ──────────────────────────────────────────────────
export type Action =
  | { type: 'SET_USER';           payload: User }
  | { type: 'SELECT_DOMAIN';      payload: Domain }
  | { type: 'SELECT_PERSONA';     payload: { persona: Persona; correctCards: Card[]; deck: Card[] } }
  | { type: 'PLACE_CARD';         payload: { card: Card } }
  | { type: 'DISCARD_CARD' }
  | { type: 'SET_OPPONENT_COUNT'; payload: number }
  | { type: 'PERSONA_CLAIMED_BY_ME' }
  | { type: 'PERSONA_TAKEN_BY';   payload: string }
  | { type: 'RESET_BOARD' }
  | { type: 'GO_TO_PHASE';        payload: GameState['gamePhase'] }
  | { type: 'SET_GAME_MODE';      payload: GameMode }
  | { type: 'SHOW_CONFIRM_POPUP'; payload: Card }
  | { type: 'CANCEL_CONFIRM' }
  | { type: 'SHOW_TRY_AGAIN' }
  | { type: 'HIDE_TRY_AGAIN' }
  | { type: 'PLACE_CARD_FORCE';   payload: { card: Card } }
  | { type: 'TOGGLE_DECK_VISIBILITY' }
  | { type: 'PICK_ANOTHER_PERSONA' };

function reducer(state: GameState, action: Action): GameState {
  // Ensure leaderboard exists to prevent HMR or state initialization issues
  const leaderboard = state.leaderboard || [];
  const safeState = { ...state, leaderboard };

  switch (action.type) {
    case 'SET_USER':
      return { ...safeState, currentUser: action.payload, gamePhase: 'DOMAIN_SELECT' };

    case 'SELECT_DOMAIN':
      return { ...safeState, selectedDomain: action.payload, gamePhase: 'PERSONA_SELECT' };

    case 'SELECT_PERSONA': {
      const { persona, correctCards, deck: initialPool } = action.payload;
      const avatarCard = correctCards.find(c => c.card_type === 'AVATAR') || null;
      
      const startingSlots = { 
        ...emptySlots, 
        AVATAR: avatarCard 
      };

      const remainingPool = avatarCard 
        ? initialPool.filter(c => c.id !== avatarCard.id)
        : initialPool;

      const initialDeck = RuleManager.rebuildDeck(remainingPool, startingSlots, state.gameMode);
      
      return {
        ...safeState,
        selectedPersona: persona,
        correctCards:    correctCards,
        pool:            remainingPool,
        discardPile:     [],
        deck:            initialDeck,
        slots:           startingSlots,
        gamePhase:       'PLAYING',
        personaClaimed:  false,
        personaTakenBy:  null,
      };
    }

    case 'PLACE_CARD': {
      const { card } = action.payload;
      const slotKey = CARD_TYPE_SLOT_MAP[card.card_type as CardType];
      const newSlots = { ...state.slots, [slotKey]: card };
      let newPool = state.pool.filter(c => c.id !== card.id);
      let newDeck = RuleManager.rebuildDeck(newPool, newSlots, state.gameMode);
      let newDiscardPile = state.discardPile;

      if (newDeck.length === 0 && newDiscardPile.length > 0) {
        newPool = [...newPool, ...newDiscardPile].sort(() => Math.random() - 0.5);
        newDeck = RuleManager.rebuildDeck(newPool, newSlots, state.gameMode);
        newDiscardPile = [];
      }

      return {
        ...safeState,
        slots: newSlots,
        pool: newPool,
        deck: newDeck,
        discardPile: newDiscardPile,
      };
    }

    case 'DISCARD_CARD': {
      if (state.deck.length === 0) return state;
      const discardedCard = state.deck[0];
      let newPool = state.pool.filter(c => c.id !== discardedCard.id);
      let newDiscardPile = [...state.discardPile, discardedCard];
      
      let newDeck = RuleManager.rebuildDeck(newPool, state.slots, state.gameMode);
      
      // Respawn left-swiped cards if deck is empty
      if (newDeck.length === 0 && newDiscardPile.length > 0) {
        newPool = [...newPool, ...newDiscardPile].sort(() => Math.random() - 0.5);
        newDeck = RuleManager.rebuildDeck(newPool, state.slots, state.gameMode);
        newDiscardPile = [];
      }
      
      return { ...safeState, pool: newPool, discardPile: newDiscardPile, deck: newDeck };
    }

    case 'SET_OPPONENT_COUNT':
      return { ...safeState, opponentCount: action.payload };

    case 'PERSONA_CLAIMED_BY_ME': {
      const newClaim = {
        user: state.currentUser!,
        persona: state.selectedPersona!,
        domain: state.selectedDomain!,
        claimedAt: new Date().toISOString(),
      };
      return { 
        ...safeState, 
        gamePhase: 'WON', 
        personaClaimed: true,
        leaderboard: [newClaim, ...leaderboard]
      };
    }

    case 'PERSONA_TAKEN_BY':
      return { ...safeState, gamePhase: 'PERSONA_TAKEN', personaTakenBy: action.payload };

    case 'RESET_BOARD': {
      const avatarCard = state.correctCards.find(c => c.card_type === 'AVATAR') || null;
      const startingSlots = { ...emptySlots, AVATAR: avatarCard };
      
      // Collect all cards currently in slots and pool, except the fixed avatar card
      const allCards = [...state.pool, ...Object.values(state.slots).filter(Boolean) as Card[]];
      const newPool = allCards.filter(c => c.id !== avatarCard?.id).sort(() => Math.random() - 0.5);
      
      const newDeck = RuleManager.rebuildDeck(newPool, startingSlots, state.gameMode);
      return {
        ...safeState,
        slots:          startingSlots,
        pool:           newPool,
        discardPile:    [],
        deck:           newDeck,
        gamePhase:      'PLAYING',
        personaClaimed: false,
        personaTakenBy: null,
        showTryAgainPopup: false,
      };
    }

    case 'GO_TO_PHASE':
      return { ...safeState, gamePhase: action.payload };

    case 'SET_GAME_MODE': {
      const newMode = action.payload;
      let newPool = state.pool;
      let newDeck = RuleManager.rebuildDeck(newPool, state.slots, newMode);
      let newDiscardPile = state.discardPile;

      if (newDeck.length === 0 && newDiscardPile.length > 0) {
        newPool = [...newPool, ...newDiscardPile].sort(() => Math.random() - 0.5);
        newDeck = RuleManager.rebuildDeck(newPool, state.slots, newMode);
        newDiscardPile = [];
      }
      return { ...safeState, gameMode: newMode, deck: newDeck, pool: newPool, discardPile: newDiscardPile };
    }

    case 'SHOW_CONFIRM_POPUP':
      return { ...safeState, confirmCard: action.payload };

    case 'CANCEL_CONFIRM':
      return { ...safeState, confirmCard: null };

    case 'SHOW_TRY_AGAIN':
      return { ...safeState, showTryAgainPopup: true };

    case 'HIDE_TRY_AGAIN':
      return { ...safeState, showTryAgainPopup: false };

    case 'PLACE_CARD_FORCE': {
      const { card } = action.payload;
      const slotKey = CARD_TYPE_SLOT_MAP[card.card_type as CardType];
      const newSlots = { ...state.slots, [slotKey]: card };
      let newPool = state.pool.filter(c => c.id !== card.id);
      let newDeck = RuleManager.rebuildDeck(newPool, newSlots, state.gameMode);
      let newDiscardPile = state.discardPile;

      if (newDeck.length === 0 && newDiscardPile.length > 0) {
        newPool = [...newPool, ...newDiscardPile].sort(() => Math.random() - 0.5);
        newDeck = RuleManager.rebuildDeck(newPool, newSlots, state.gameMode);
        newDiscardPile = [];
      }

      return {
        ...safeState,
        slots: newSlots,
        pool: newPool,
        deck: newDeck,
        discardPile: newDiscardPile,
        confirmCard: null,
      };
    }

    case 'TOGGLE_DECK_VISIBILITY':
      return { ...safeState, showDeck: !state.showDeck };

    case 'PICK_ANOTHER_PERSONA':
      return {
        ...state,
        gamePhase: 'DOMAIN_SELECT',
        selectedDomain: null,
        selectedPersona: null,
        personaClaimed: false,
        takenBy: null,
        outpacedBy: null,
      };

    default:
      return state;
  }
}

// ─── CONTEXT ──────────────────────────────────────────────────
const GameContext = createContext<{
  state:    GameState;
  dispatch: React.Dispatch<Action>;
} | null>(null);

export function GameProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  return (
    <GameContext.Provider value={{ state, dispatch }}>
      {children}
    </GameContext.Provider>
  );
}

export function useGame() {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error('useGame must be used within GameProvider');
  return ctx;
}
