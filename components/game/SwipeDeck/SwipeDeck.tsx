'use client';
import { useCallback, useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import { motion, useMotionValue, useTransform, useAnimation, AnimatePresence } from 'framer-motion';
import { useGame } from '@/store/gameStore';
import { CardType } from '@/types';
import { RuleManager } from '@/lib/GameRules';
import { MOCK_PERSONAS } from '@/data/mockData';
import styles from './SwipeDeck.module.css';

const THRESHOLD = 70;

import { Card } from '@/types';
import PersonaFlowCard, { CardVariant } from '@/components/game/PersonaFlowCard/PersonaFlowCard';
import HandFan from '@/components/game/HandFan/HandFan';

const VARIANT_MAP: Record<CardType, CardVariant> = {
  AVATAR: 'identity',
  PERSONA: 'description',
  SCENARIO: 'scenario',
  UX_PROBLEM: 'task',
  UI_PROBLEM: 'taskFlow',
  CX_PROBLEM: 'persuasion',
  AI_PROBLEM: 'task',
};

// ── Horizontal Deck static assets ──────────────────────────────
function HorizontalDeck({ count }: { count: number }) {
  // Use the 6 static SVGs as a backdrop
  const assetIndices = [1, 2, 3, 4, 5, 6];

  return (
    <div className={styles.horizontalDeck}>
      {assetIndices.map((assetIdx, i) => {
        // Calculate a dynamic position that 'circles' as count changes
        const logicalIdx = (i + count) % 6;
        const offset = (logicalIdx - 2.5) * 45;
        const rotation = (logicalIdx - 2.5) * 6;
        const scale = 0.8 + (Math.sin(logicalIdx / 6 * Math.PI) * 0.15);

        const depthFactor = (logicalIdx / 5);
        const baseOpacity = i < count ? (0.1 + depthFactor * 0.7) : 0;

        return (
          <motion.div
            key={assetIdx}
            className={styles.staticCard}
            animate={{
              x: offset,
              rotate: rotation,
              scale: scale,
              opacity: baseOpacity,
              zIndex: Math.floor(logicalIdx * 10),
            }}
            transition={{ type: 'spring', stiffness: 100, damping: 20 }}
          >
            <img src={`/assets/graphics/topCard${assetIdx}.svg`} alt="" />
          </motion.div>
        );
      })}
    </div>
  );
}

interface CardHandle { swipeLeft(): Promise<void>; swipeRight(): Promise<void>; }
interface DraggableCardProps {
  card: Card;
  onLeft(): void;
  onRight(): void;
  x: any;
}

const DraggableCard = forwardRef<CardHandle, DraggableCardProps>(function DraggableCard({ card, onLeft, onRight, x }, ref) {
  const controls = useAnimation();
  const rotate = useTransform(x, [-200, 200], [-15, 15]);
  const lOp = useTransform(x, [-THRESHOLD, 0], [1, 0]);
  const rOp = useTransform(x, [0, THRESHOLD], [0, 1]);

  const persona = MOCK_PERSONAS.find(p => p.id === card.persona_id);
  const bg = persona?.color_code ?? '#FFD700';

  useEffect(() => {
    controls.start({ x: 0, y: 0, opacity: 1, scale: 1, rotate: 0, transition: { type: 'spring', stiffness: 260, damping: 24 } });
  }, [controls]);

  const doLeft = useCallback(async () => {
    await controls.start({ x: -600, rotate: -30, opacity: 0, transition: { duration: 0.3, ease: 'circIn' } });
    onLeft();
  }, [controls, onLeft]);

  const doRight = useCallback(async () => {
    await controls.start({ y: -600, scale: 0.2, opacity: 0, transition: { duration: 0.4, ease: 'circIn' } });
    onRight();
  }, [controls, onRight]);

  useImperativeHandle(ref, () => ({ swipeLeft: doLeft, swipeRight: doRight }));

  return (
    <motion.div
      className={styles.cardWrapper}
      style={{ x, rotate, touchAction: 'none' }}
      animate={controls}
      initial={{ y: 100, opacity: 0, scale: 0.9 }}
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      onDragEnd={async (_, info) => {
        if (info.offset.x < -THRESHOLD) await doLeft();
        else if (info.offset.x > THRESHOLD) await doRight();
        else controls.start({ x: 0, rotate: 0, transition: { type: 'spring', stiffness: 450, damping: 35 } });
      }}
    >
      <motion.span className={`${styles.hint} ${styles.hintL}`} style={{ opacity: lOp }}>DISCARD</motion.span>
      <motion.span className={`${styles.hint} ${styles.hintR}`} style={{ opacity: rOp }}>SELECT</motion.span>

      <div className={styles.personaCardScale}>
        <PersonaFlowCard
          variant={VARIANT_MAP[card.card_type]}
          baseHexColor={bg}
          heading={card.heading}
          subHeading={card.subHeading}
          bodyText={card.bodyText}
          listItems={card.listItems}
          sections={card.sections}
          topRightIcon={<img src="/assets/icons/placeholder.svg" alt="" style={{ width: '100%', height: '100%', opacity: 0.6 }} />}
          logoSvg={<img src="/assets/UXism_Logo.svg" alt="UXISM" className="h-full w-full invert opacity-20" />}
        // centralGraphic={card.card_type === 'AVATAR' && persona ? <img src={persona.asset_path} alt={persona.name} className="h-full w-full object-contain" /> : null}
        />
      </div>

      <p className={styles.cue}>← discard · select →</p>
    </motion.div>
  );
});

export default function SwipeDeck() {
  const { state, dispatch } = useGame();
  const { deck, slots, correctCards } = state;
  const top = deck[0] ?? null;
  const cardRef = useRef<CardHandle>(null);

  const x = useMotionValue(0);

  const onLeft = useCallback(() => {
    dispatch({ type: 'DISCARD_CARD' });
    x.set(0);
  }, [dispatch, x]);

  const onRight = useCallback(() => {
    if (!top) return;
    RuleManager.getMode(state.gameMode).handleSwipeRight(top, slots, correctCards, dispatch);
    x.set(0);
  }, [top, slots, correctCards, state.gameMode, dispatch, x]);

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') cardRef.current?.swipeLeft();
      if (e.key === 'ArrowRight') cardRef.current?.swipeRight();
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, []);

  return (
    <section className={styles.wrap}>
      <div className={styles.deckAndActiveContainer}>
        <div className={styles.deckBackdrop}>
          <HorizontalDeck count={Math.min(6, deck.length)} />
        </div>

        <div className={styles.activeZone}>
          <AnimatePresence mode="wait">
            {top ? (
              <DraggableCard
                key={top.id}
                ref={cardRef}
                card={top}
                onLeft={onLeft}
                onRight={onRight}
                x={x}
              />
            ) : (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className={styles.empty}>
                <p className={styles.emptyText}>Sequence Pending</p>
                <button
                  onClick={() => dispatch({ type: 'RESET_BOARD' })}
                  className={styles.resetBtn}
                >
                  Restart Protocol
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {top && (
        <div className={styles.btns}>
          <button
            onClick={() => cardRef.current?.swipeLeft()}
            className={`${styles.btn} ${styles.btnL}`}
            aria-label="Discard Node"
          >
            ✕
          </button>

          <button
            onClick={() => cardRef.current?.swipeRight()}
            className={`${styles.btn} ${styles.btnR}`}
            aria-label="Select Protocol"
          >
            ✓
          </button>
        </div>
      )}

      <HandFan />
    </section>
  );
}

