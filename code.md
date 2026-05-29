app/game/types.ts:
export type ScoringStrategy = 'lowest' | 'highest' | 'accumulated';

export interface GameScoring {
  strategy: ScoringStrategy;
  unit: string;
}

export interface GameDefinition {
  id: string;
  name: string;
  description?: string;
  category: 'cognitive' | 'reflex' | 'design' | 'accessibility';
  scoring: GameScoring;
  realtime: boolean;
  leaderboard: boolean;
  rounds: number;
  component: React.ComponentType<any>;
}

export type GameLifecycleStatus = 'idle' | 'ready' | 'playing' | 'paused' | 'completed' | 'reviewing';

export interface GameState {
  status: GameLifecycleStatus;
  currentRound: number;
  totalRounds: number;
  score: number;
  startTime?: number;
  endTime?: number;
}


app/game/registry.ts:
import { GameDefinition } from "./types";

const gameRegistry = new Map<string, GameDefinition>();

export function registerGame(definition: GameDefinition): void {
  gameRegistry.set(definition.id, definition);
}

export function getGame(id: string): GameDefinition | undefined {
  return gameRegistry.get(id);
}

export function getAllGames(): GameDefinition[] {
  return Array.from(gameRegistry.values());
}


app/games/_components/GameShell.tsx:
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowLeft, Gavel, Gamepad2, MessageCircle, User, Users } from "lucide-react";

const bottomNavItems = [
  { label: "My Team", href: "/myteam", icon: Users, enabled: true },
  { label: "Bidding", href: null, icon: Gavel, enabled: false },
  { label: "Games", href: "/games", icon: Gamepad2, enabled: true },
  { label: "Live Chat", href: "/live", icon: MessageCircle, enabled: true },
];

type GameShellProps = {
  meta: string;
  title: string;
  description: string;
  children: React.ReactNode;
};

export function GameShell({ meta, title, description, children }: GameShellProps) {
  const pathname = usePathname();

  return (
    <main className="relative flex min-h-screen flex-col overflow-hidden bg-[#181818] text-white selection:bg-[#ff6a6a] selection:text-[#171717]">
      <PageDecor />

      <header className="relative z-20 flex shrink-0 items-center justify-between border-b border-[#2e2e2e] bg-[#181818]/95 px-5 py-4 backdrop-blur-[2px]">
        <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-[#929292] sm:text-[12px]">
          UXISM<span className="text-[#5b5b5b]">/</span>UXATHON
        </p>

        <Link
          href="/profile"
          aria-label="Open profile"
          className="grid h-10 w-10 place-items-center rounded-[24px] border border-[#5b5b5b] bg-[#181818] text-[#929292] active:border-[rgba(222,247,103,0.5)] active:text-[#DEF767]"
        >
          <User size={18} aria-hidden />
        </Link>
      </header>

      <section className="relative z-10 mx-auto flex w-full max-w-lg flex-1 flex-col px-5 pb-28 pt-6">
        <Link
          href="/games"
          className="mb-6 inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.14em] text-[#929292] active:text-[#DEF767]"
        >
          <ArrowLeft size={14} aria-hidden />
          Games lounge
        </Link>

        <div className="mb-6">
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-[#5b5b5b]">{meta}</p>
          <h1 className="mt-3 font-sans text-[32px] uppercase leading-[0.95] tracking-[0.02em] text-white sm:text-[40px]">
            {title}
          </h1>
          <p className="mt-4 max-w-[34ch] text-[13px] leading-6 text-[#929292]">{description}</p>
        </div>

        {children}
      </section>

      <nav
        aria-label="Dashboard navigation"
        className="fixed bottom-0 left-0 right-0 z-20 border-t border-[#2e2e2e] bg-[#181818]/95 backdrop-blur-[2px] pb-[max(0.75rem,env(safe-area-inset-bottom))]"
      >
        <ul className="grid grid-cols-4">
          {bottomNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = item.href && pathname === item.href;

            if (!item.enabled) {
              return (
                <li key={item.label}>
                  <span
                    className="flex flex-col items-center gap-1.5 px-1 py-3 text-[#5b5b5b]"
                    aria-disabled="true"
                  >
                    <Icon size={18} aria-hidden />
                    <span className="font-mono text-[9px] uppercase tracking-[0.1em] sm:text-[10px]">
                      {item.label}
                    </span>
                  </span>
                </li>
              );
            }

            return (
              <li key={item.label}>
                <Link
                  href={item.href!}
                  className={`flex flex-col items-center gap-1.5 px-1 py-3 transition-colors ${
                    isActive ? "text-[#ff6a6a]" : "text-[#929292] active:text-[#DEF767]"
                  }`}
                  aria-current={isActive ? "page" : undefined}
                >
                  <Icon size={18} aria-hidden />
                  <span className="font-mono text-[9px] uppercase tracking-[0.1em] sm:text-[10px]">
                    {item.label}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </main>
  );
}

export function GameStats({
  levelLabel = "level",
  levelValue,
  bestLabel = "best",
  bestValue,
}: {
  levelLabel?: string;
  levelValue: string | number;
  bestLabel?: string;
  bestValue: string | number;
}) {
  return (
    <div className="mb-4 grid grid-cols-2 gap-px border border-[#2e2e2e] bg-[#2e2e2e]">
      <div className="bg-[#171717]/70 px-4 py-3">
        <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#5b5b5b]">{levelLabel}</p>
        <p className="mt-1 font-sans text-2xl tabular-nums uppercase tracking-[0.04em] text-white">{levelValue}</p>
      </div>
      <div className="bg-[#171717]/70 px-4 py-3">
        <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#5b5b5b]">{bestLabel}</p>
        <p className="mt-1 font-sans text-2xl tabular-nums uppercase tracking-[0.04em] text-white">{bestValue}</p>
      </div>
    </div>
  );
}

export function GamePanel({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`border border-[#2e2e2e] bg-[#171717]/70 px-4 py-6 sm:px-5 ${className}`}>{children}</div>
  );
}

export const gameButtonPrimary =
  "px-6 py-3 border border-[rgba(222,247,103,0.5)] bg-[#181818] font-mono text-[11px] uppercase tracking-[0.14em] text-[#DEF767] active:border-[#ff6a6a] active:bg-[#ff6a6a] active:text-[#171717]";

export const gameButtonSecondary =
  "px-4 py-2 border border-[#2e2e2e] font-mono text-[11px] uppercase tracking-[0.14em] text-[#929292] active:border-[rgba(222,247,103,0.5)] active:text-[#DEF767]";

function PageDecor() {
  return (
    <>
      <div className="pointer-events-none fixed inset-0 opacity-25 [background-image:radial-gradient(#5b5b5b_1px,transparent_1px)] [background-size:18px_18px]" />
      <div className="pointer-events-none fixed left-4 top-4 z-0 h-5 w-5 border-l border-t border-[#5b5b5b]" />
      <div className="pointer-events-none fixed right-4 top-4 z-0 h-5 w-5 border-r border-t border-[#5b5b5b]" />
      <div className="pointer-events-none fixed bottom-24 left-4 z-0 h-5 w-5 border-b border-l border-[#5b5b5b]" />
      <div className="pointer-events-none fixed bottom-24 right-4 z-0 h-5 w-5 border-b border-r border-[#5b5b5b]" />
      <div className="pointer-events-none fixed left-1/2 top-[-120px] h-[280px] w-[280px] -translate-x-1/2 rounded-full bg-[radial-gradient(circle_at_30%_30%,#46B1FF,transparent_35%),radial-gradient(circle_at_70%_40%,#A259FF,transparent_35%),radial-gradient(circle_at_50%_70%,#ff6a6a,transparent_38%),radial-gradient(circle_at_80%_80%,#DEF767,transparent_30%)] opacity-20 blur-3xl" />
    </>
  );
}


app/games/chimp/config.tsx:
import { lazy } from "react";
import { registerGame } from "../registry";

export const chimpConfig = {
  id: "chimp",
  name: "Chimp Test",
  description: "Memorize the numbered tiles and click them in ascending order.",
  category: "cognitive" as const,
  scoring: { strategy: "highest" as const, unit: "level" },
  realtime: false,
  leaderboard: true,
  rounds: 99,
  component: lazy(() => import("./page")),
};

export function initChimp() {
  registerGame(chimpConfig);
}


app/games/chimp/page.tsx:
"use client";

import React from "react";
import {
  GamePanel,
  GameShell,
  GameStats,
  gameButtonPrimary,
  gameButtonSecondary,
} from "../_components/GameShell";

type Phase = "idle" | "memorize" | "input" | "success" | "fail";

const START_COUNT = 4;
const MAX_COUNT = 25;
const MEMORIZE_MS = 1400;
const MIN_MEMORIZE_MS = 650;

function shuffle<T>(items: T[]) {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
  }
  return copy;
}

function createBoard(count: number) {
  const positions = shuffle(Array.from({ length: count }, (_, index) => index));
  return Array.from({ length: count }, (_, index) => ({
    number: index + 1,
    position: positions[index],
  }));
}

function ChimpGame() {
  const [level, setLevel] = React.useState(1);
  const [phase, setPhase] = React.useState<Phase>("idle");
  const [board, setBoard] = React.useState<Array<{ number: number; position: number }>>([]);
  const [boardCount, setBoardCount] = React.useState(START_COUNT);
  const [expected, setExpected] = React.useState(1);
  const [revealed, setRevealed] = React.useState<number[]>([]);
  const [bestLevel, setBestLevel] = React.useState(0);

  const timerRef = React.useRef<number | null>(null);

  const clearTimer = React.useCallback(() => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  React.useEffect(() => {
    return () => clearTimer();
  }, [clearTimer]);

  const memorizeDuration = React.useCallback((count: number) => {
    return Math.max(MIN_MEMORIZE_MS, MEMORIZE_MS - (count - START_COUNT) * 45);
  }, []);

  const startRound = React.useCallback(
    (nextLevel = level) => {
      clearTimer();

      const count = Math.min(MAX_COUNT, START_COUNT + nextLevel - 1);
      const nextBoard = createBoard(count);

      setLevel(nextLevel);
      setBoardCount(count);
      setBoard(nextBoard);
      setExpected(1);
      setRevealed([]);
      setPhase("memorize");

      timerRef.current = window.setTimeout(() => {
        setPhase("input");
      }, memorizeDuration(count));
    },
    [clearTimer, level, memorizeDuration],
  );

  const handleStart = React.useCallback(() => {
    startRound(1);
  }, [startRound]);

  const handleCellClick = React.useCallback(
    (position: number) => {
      if (phase !== "input") {
        return;
      }

      const targetCell = board.find((entry) => entry.number === expected);
      if (!targetCell || targetCell.position !== position) {
        setPhase("fail");
        setBestLevel((current) => Math.max(current, level));
        return;
      }

      const nextExpected = expected + 1;
      setRevealed((current) => [...current, position]);

      if (nextExpected > board.length) {
        setPhase("success");
        setBestLevel((current) => Math.max(current, level));

        timerRef.current = window.setTimeout(() => {
          startRound(level + 1);
        }, 650);
        return;
      }

      setExpected(nextExpected);
    },
    [board, expected, level, phase, startRound],
  );

  const handleReset = React.useCallback(() => {
    clearTimer();
    setLevel(1);
    setPhase("idle");
    setBoard([]);
    setBoardCount(START_COUNT);
    setExpected(1);
    setRevealed([]);
  }, [clearTimer]);

  const gridSize = Math.ceil(Math.sqrt(boardCount));

  const cellByPosition = React.useMemo(() => {
    const map = new Map<number, { number: number; position: number }>();
    board.forEach((entry) => {
      map.set(entry.position, entry);
    });
    return map;
  }, [board]);

  const phaseLabel =
    phase === "memorize"
      ? "memorize"
      : phase === "input"
        ? `click ${expected}`
        : phase === "success"
          ? "good"
          : phase === "fail"
            ? "wrong"
            : "";

  return (
    <>
      <GameStats levelValue={level} bestValue={bestLevel || "—"} />

      <GamePanel className="min-h-[300px]">
        {phase === "idle" && (
          <div className="flex flex-col items-center gap-6 py-4 text-center">
            <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-[#5b5b5b]">
              numbers will disappear
            </p>
            <button type="button" onClick={handleStart} className={gameButtonPrimary}>
              start
            </button>
          </div>
        )}

        {phase !== "idle" && (
          <div className="flex w-full flex-col items-center gap-4">
            <div className="flex w-full items-center justify-between px-1">
              <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-[#5b5b5b]">{phaseLabel}</span>
              <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-[#5b5b5b]">{boardCount} cells</span>
            </div>
            <div className="grid w-full gap-2" style={{ gridTemplateColumns: `repeat(${gridSize}, minmax(0, 1fr))` }}>
              {Array.from({ length: gridSize * gridSize }).map((_, position) => {
                const entry = cellByPosition.get(position);
                const isActive = phase === "memorize" && Boolean(entry);
                const isRevealed = revealed.includes(position) || (phase === "memorize" && Boolean(entry));
                const cellNumber = entry?.number;
                return (
                  <button
                    key={position}
                    type="button"
                    onClick={() => handleCellClick(position)}
                    disabled={phase !== "input"}
                    className={[
                      "flex aspect-square items-center justify-center border border-[#2e2e2e] bg-[#181818] transition-colors duration-150",
                      phase === "input" ? "active:border-[rgba(222,247,103,0.5)] active:bg-[#171717]" : "cursor-default",
                      isRevealed ? "text-white" : "text-[#5b5b5b]",
                      isActive ? "bg-[#171717]" : "",
                    ].join(" ")}
                    aria-label={`chimp-cell-${position}`}
                  >
                    <span className="font-sans text-xl tabular-nums uppercase tracking-[0.04em] sm:text-2xl">
                      {isRevealed && cellNumber ? cellNumber : ""}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </GamePanel>

      <div className="mt-4 flex items-center justify-center gap-3">
        {phase !== "idle" && (
          <button type="button" onClick={handleReset} className={gameButtonSecondary}>
            {phase === "fail" ? "try again" : "reset"}
          </button>
        )}
      </div>
    </>
  );
}

export default function ChimpPage() {
  return (
    <GameShell
      meta="UXATHON / GAMES / CHIMP"
      title="Chimp Test"
      description="Memorize the numbered tiles, then click them in ascending order."
    >
      <ChimpGame />
    </GameShell>
  );
}




apis/hasura/AppoloClient.tsx:
"use client";
import { ApolloClient, InMemoryCache, HttpLink, ApolloLink } from "@apollo/client";
import { ApolloProvider } from "@apollo/client/react";
import { GraphQLWsLink } from "@apollo/client/link/subscriptions";
import { createClient } from "graphql-ws";
import { getMainDefinition } from "@apollo/client/utilities";

// Normal Query, mutation link
const httpLink = new HttpLink({
    uri: "https://dev.uxism.org/v1/graphql",
    fetch: async (uri, options) => {
        const token = localStorage.getItem("jwt-token");
        console.log("Token in fetch:", token);
        const headers = { ...(options?.headers || {}), Authorization: token ? `Bearer ${token}` : "" };
        return fetch(uri, { ...options, headers });
    },
});

// WebSocket link for subscriptions
const wsLink = new GraphQLWsLink(
    createClient({
        url: "wss://dev.uxism.org/v1/graphql",
        connectionParams: async () => {
            const token = localStorage.getItem("jwt-token");
            if (!token) window.location.href = "/login";
            return { headers: { Authorization: token ? `Bearer ${token}` : "" } };
        },
    }),
);

const link = ApolloLink.split(
    ({ query }) => {
        const definition = getMainDefinition(query);
        return definition.kind === "OperationDefinition" && definition.operation === "subscription";
    },
    wsLink,
    httpLink,
);

export const client = new ApolloClient({
    link,
    cache: new InMemoryCache(),
});

export function ApolloWrapper({ children }: { children: React.ReactNode }) {
    return <ApolloProvider client={client}>{children}</ApolloProvider>;
}




app/live/page.tsx:
"use client";
import { FormEvent, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { gql } from "@apollo/client";
import { useMutation, useSubscription } from "@apollo/client/react";
import { ArrowLeft, ArrowUp, MessageCircle, Plus, Send, Smile, Users, X } from "lucide-react";

const REACTIONS = [
    { id: "heart", emoji: "❤️", label: "Heart" },
    { id: "thumbs", emoji: "👍", label: "Thumbs up" },
    { id: "raise", emoji: "🙋", label: "Hand raise" },
] as const;

type FloatingReaction = {
    id: string;
    emoji: string;
};

type PollOption = {
    id: string;
    option: string;
};

type LivePoll = {
    id: string;
    title: string;
    created_at: string;
    ends_at: string;
    poll_options: PollOption[];
};

const MUTATION_CREATE_QUESTION = gql`
    mutation CreateQuestion($sessionId: uuid!, $question: String!) {
        insert_live_questions_one(object: { session_id: $sessionId, question: $question }) {
            question
        }
    }
`;

const POLL_SUBSCRIPTION = gql`
    subscription PollSubscription($sessionId: uuid!) {
        live_polls(where: { session_id: { _eq: $sessionId } }, order_by: { created_at: asc }) {
            id
            title
            created_at
            ends_at
            poll_options {
                id
                option
            }
        }
    }
`;

const VOTE_MUTATION = gql`
    mutation Vote($pollOptionId: uuid!, $pollId: uuid!) {
        insert_live_user_votes_one(object: { option_id: $pollOptionId, poll_id: $pollId }) {
            id
        }
    }
`;

const CHAT_SUBSCRIPTION = gql`
    subscription ChatSubsScription($sessionId: uuid!) {
        live_chat(order_by: { created_at: desc }, where: { session_id: { _eq: $sessionId } }) {
            user {
                name
                profile_picture
            }
            message
        }
    }
`;

const GET_ACTIVE_SESSION = gql`
    subscription GetActiveSession {
        live_sessions(order_by: { started_at: desc }, where: { active: { _eq: true } }, limit: 1) {
            id
            started_at
        }
    }
`;

const MUTATION_ADD_MESSAGE = gql`
    mutation AddMessage($sessionId: uuid!, $message: String!) {
        insert_live_chat_one(object: { session_id: $sessionId, message: $message }) {
            message
        }
    }
`;

type LiveSession = {
    id: string;
    started_at: string;
};

type ChatItem = {
    user: {
        name: string | null;
        profile_picture: string | null;
    } | null;
    message: string;
};

type ActiveSessionData = {
    live_sessions: LiveSession[];
};

type ChatSubscriptionData = {
    live_chat: ChatItem[];
};

type PollSubscriptionData = {
    live_polls: LivePoll[];
};

type AddMessageVariables = {
    sessionId: string;
    message: string;
};

type VoteVariables = {
    pollOptionId: string;
    pollId: string;
};

type VotedOptionByPoll = Record<string, string>;

function getInitials(name?: string | null) {
    if (!name || !name.trim()) return "UX";

    return name
        .trim()
        .split(" ")
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0])
        .join("")
        .toUpperCase();
}

function normalizeMessages(items?: ChatItem[]) {
    return items?.slice().reverse() ?? [];
}

function getVoteStorageKey(sessionId: string) {
    return `uxism-live-votes:${sessionId}`;
}

function subscribeVoteStorage(onStoreChange: () => void) {
    window.addEventListener("storage", onStoreChange);

    return () => window.removeEventListener("storage", onStoreChange);
}

function readStoredVotes(sessionId?: string) {
    if (!sessionId || typeof window === "undefined") return "{}";

    return window.localStorage.getItem(getVoteStorageKey(sessionId)) ?? "{}";
}

function parseStoredVotes(value: string): VotedOptionByPoll {
    try {
        return JSON.parse(value);
    } catch {
        return {};
    }
}

function getPollProgress(poll: LivePoll, currentTime: number) {
    const startTime = new Date(poll.created_at).getTime();
    const endTime = new Date(poll.ends_at).getTime();

    if (!Number.isFinite(startTime) || !Number.isFinite(endTime) || endTime <= startTime) return 100;

    return Math.min(100, Math.max(0, ((currentTime - startTime) / (endTime - startTime)) * 100));
}

function getSecondsRemaining(endsAt: string, currentTime: number) {
    const endTime = new Date(endsAt).getTime();

    if (!Number.isFinite(endTime)) return 0;

    return Math.max(0, Math.ceil((endTime - currentTime) / 1000));
}

export default function LivePage() {
    const [input, setInput] = useState("");
    const [reactionsOpen, setReactionsOpen] = useState(false);
    const [floatingReactions, setFloatingReactions] = useState<FloatingReaction[]>([]);
    const [currentTime, setCurrentTime] = useState(() => Date.now());
    const [voteLocksBySession, setVoteLocksBySession] = useState<Record<string, VotedOptionByPoll>>({});
    const [pendingPollIds, setPendingPollIds] = useState<Set<string>>(() => new Set());
    const [questionOpen, setQuestionOpen] = useState(false);
    const [questionText, setQuestionText] = useState("");
    const [questionSent, setQuestionSent] = useState(false);
    const scrollRef = useRef<HTMLDivElement | null>(null);
    const reactionsRef = useRef<HTMLDivElement | null>(null);
    const reactionIdRef = useRef(0);
    const questionResetRef = useRef<number | null>(null);

    const { data: sessionData, loading: sessionLoading, error: sessionError } = useSubscription<ActiveSessionData>(GET_ACTIVE_SESSION);
    const [createQuestion] = useMutation(MUTATION_CREATE_QUESTION);

    const activeSession = sessionData?.live_sessions?.[0] ?? null;
    const activeSessionId = activeSession?.id;

    const {
        data,
        loading: messagesLoading,
        error: messagesError,
    } = useSubscription<ChatSubscriptionData>(CHAT_SUBSCRIPTION, {
        skip: !activeSessionId,
        variables: activeSessionId ? { sessionId: activeSessionId } : undefined,
    });

    const {
        data: pollData,
        loading: pollsLoading,
        error: pollsError,
    } = useSubscription<PollSubscriptionData>(POLL_SUBSCRIPTION, {
        skip: !activeSessionId,
        variables: activeSessionId ? { sessionId: activeSessionId } : undefined,
    });

    const [addMessage, { loading: addMessageLoading, error: addMessageError }] = useMutation<unknown, AddMessageVariables>(MUTATION_ADD_MESSAGE);
    const [vote, { error: voteError }] = useMutation<unknown, VoteVariables>(VOTE_MUTATION);

    const storedVoteSnapshot = useSyncExternalStore(
        subscribeVoteStorage,
        () => readStoredVotes(activeSessionId),
        () => "{}",
    );
    const storedVotedOptionByPoll = useMemo(() => parseStoredVotes(storedVoteSnapshot), [storedVoteSnapshot]);
    const votedOptionByPoll = useMemo(() => {
        return { ...storedVotedOptionByPoll, ...(activeSessionId ? voteLocksBySession[activeSessionId] : undefined) };
    }, [activeSessionId, storedVotedOptionByPoll, voteLocksBySession]);
    const messages = useMemo(() => normalizeMessages(data?.live_chat), [data?.live_chat]);
    const activePolls = useMemo(() => {
        return (
            pollData?.live_polls?.filter((poll) => {
                const endTime = new Date(poll.ends_at).getTime();

                return Number.isFinite(endTime) && currentTime < endTime;
            }) ?? []
        );
    }, [currentTime, pollData?.live_polls]);
    const hasStackedPolls = activePolls.length > 1;
    const visibleUserCount = useMemo(() => Math.max(1, messages.length), [messages.length]);

    const errorMessage = sessionError?.message || messagesError?.message || addMessageError?.message || null;
    const pollErrorMessage = pollsError?.message || voteError?.message || null;

    const statusText = sessionLoading ? "loading session" : errorMessage ? "error" : !activeSessionId ? "no active session" : messagesLoading ? "loading messages" : pollsLoading ? "loading polls" : "live";

    useEffect(() => {
        requestAnimationFrame(() => {
            scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
        });
    }, [messages.length]);

    useEffect(() => {
        const interval = window.setInterval(() => setCurrentTime(Date.now()), 250);

        return () => window.clearInterval(interval);
    }, []);

    useEffect(() => {
        return () => {
            if (questionResetRef.current) window.clearTimeout(questionResetRef.current);
        };
    }, []);

    useEffect(() => {
        if (!reactionsOpen) return;

        function handlePointerDown(event: MouseEvent | TouchEvent) {
            if (!reactionsRef.current?.contains(event.target as Node)) {
                setReactionsOpen(false);
            }
        }

        document.addEventListener("mousedown", handlePointerDown);
        document.addEventListener("touchstart", handlePointerDown);
        return () => {
            document.removeEventListener("mousedown", handlePointerDown);
            document.removeEventListener("touchstart", handlePointerDown);
        };
    }, [reactionsOpen]);

    function triggerReaction(emoji: string) {
        reactionIdRef.current += 1;
        const id = `reaction-${reactionIdRef.current}`;
        setFloatingReactions((prev) => [...prev, { id, emoji }]);
        setReactionsOpen(false);
        window.setTimeout(() => {
            setFloatingReactions((prev) => prev.filter((item) => item.id !== id));
        }, 1800);
    }

    async function sendMessage(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        const message = input.trim();
        if (!message || !activeSessionId || addMessageLoading) return;

        await addMessage({ variables: { sessionId: activeSessionId, message } });
        setInput("");
    }

    async function submitVote(poll: LivePoll, optionId: string) {
        if (!activeSessionId || votedOptionByPoll[poll.id] || pendingPollIds.has(poll.id)) return;

        const endTime = new Date(poll.ends_at).getTime();
        if (!Number.isFinite(endTime) || currentTime >= endTime) return;

        setPendingPollIds((prev) => new Set(prev).add(poll.id));

        try {
            await vote({ variables: { pollId: poll.id, pollOptionId: optionId } });

            setVoteLocksBySession((prev) => {
                const nextSessionVotes = { ...(prev[activeSessionId] ?? {}), [poll.id]: optionId };

                try {
                    window.localStorage.setItem(getVoteStorageKey(activeSessionId), JSON.stringify(nextSessionVotes));
                } catch {
                    // Local storage is only a UI lock; the backend vote mutation is the source of truth.
                }

                return { ...prev, [activeSessionId]: nextSessionVotes };
            });
        } finally {
            setPendingPollIds((prev) => {
                const next = new Set(prev);
                next.delete(poll.id);
                return next;
            });
        }
    }

    function scrollToLatest() {
        scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
    }

    function closeQuestionBox() {
        if (questionResetRef.current) window.clearTimeout(questionResetRef.current);
        setQuestionOpen(false);
        setQuestionSent(false);
        setQuestionText("");
    }

    function sendQuestion(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        if (!questionText.trim() || questionSent) return;

        setQuestionText("");
        createQuestion({ variables: { sessionId: activeSessionId!, question: questionText.trim() } }).then(() => {
            setQuestionSent(true);
        });

        questionResetRef.current = window.setTimeout(() => {
            setQuestionOpen(false);
            setQuestionSent(false);
        }, 1400);
    }

    return (
        <main className="h-screen overflow-hidden bg-[#181818] text-white selection:bg-[#ff6a6a] selection:text-[#171717]">
            <div className="pointer-events-none fixed inset-0 opacity-25 [background-image:radial-gradient(#5b5b5b_1px,transparent_1px)] [background-size:18px_18px]" />

            <div className="pointer-events-none fixed left-4 top-4 z-30 h-5 w-5 border-l border-t border-[#5b5b5b]" />
            <div className="pointer-events-none fixed right-4 top-4 z-30 h-5 w-5 border-r border-t border-[#5b5b5b]" />
            <div className="pointer-events-none fixed bottom-4 left-4 z-30 h-5 w-5 border-b border-l border-[#5b5b5b]" />
            <div className="pointer-events-none fixed bottom-4 right-4 z-30 h-5 w-5 border-b border-r border-[#5b5b5b]" />

            <div className="pointer-events-none fixed left-1/2 top-[-140px] h-[340px] w-[340px] -translate-x-1/2 rounded-full bg-[radial-gradient(circle_at_30%_30%,#46B1FF,transparent_35%),radial-gradient(circle_at_70%_40%,#A259FF,transparent_35%),radial-gradient(circle_at_50%_70%,#ff6a6a,transparent_38%),radial-gradient(circle_at_80%_80%,#DEF767,transparent_30%)] opacity-25 blur-3xl" />

            {(activePolls.length > 0 || pollErrorMessage) && (
                <div className={`fixed left-5 right-5 top-5 z-40 mx-auto flex max-w-3xl flex-col overflow-y-auto sm:left-8 sm:right-8 ${hasStackedPolls ? "max-h-[68vh] gap-2" : "max-h-[52vh] gap-3"}`}>
                    {pollErrorMessage && <div className="border border-[#2e2e2e] bg-[#171717] px-4 py-3 font-mono text-[10px] uppercase tracking-[0.14em] text-[#ff6a6a]">poll / {pollErrorMessage}</div>}

                    {activePolls.map((poll) => (
                        <LivePollPanel key={poll.id} poll={poll} currentTime={currentTime} selectedOptionId={votedOptionByPoll[poll.id]} isPending={pendingPollIds.has(poll.id)} compact={hasStackedPolls} onVote={submitVote} />
                    ))}
                </div>
            )}

            <section className="relative z-10 mx-auto grid h-screen w-full max-w-5xl grid-rows-[1fr] px-5 py-5 md:px-10 lg:grid-cols-[1fr_160px] lg:gap-8">
                <div className="grid min-h-0 grid-rows-[auto_1fr_auto] lg:max-w-[75%]">
                    <header className="relative z-20 border-b border-[#2e2e2e] bg-[#181818]/95 pb-4 pt-2">
                        <nav className="flex items-center justify-between gap-4">
                            <a href="/dashboard" className="flex h-10 items-center gap-2 border border-[#2e2e2e] px-4 font-mono text-[11px] uppercase tracking-[0.14em] text-[#929292] active:border-[rgba(222,247,103,0.5)] active:text-[#DEF767]">
                                <ArrowLeft size={15} />
                                Dashboard
                            </a>

                            <div className="flex items-center gap-3">
                                <div className="hidden h-10 items-center gap-2 border border-[#2e2e2e] px-4 font-mono text-[11px] uppercase tracking-[0.14em] text-[#929292] sm:flex">
                                    <Users size={15} />
                                    {visibleUserCount} Users
                                </div>

                                <button type="button" onClick={scrollToLatest} className="grid h-10 w-10 place-items-center rounded-[24px] border border-[rgba(222,247,103,0.5)] bg-[#181818] text-[#DEF767]" aria-label="Scroll to latest message">
                                    <ArrowUp className="rotate-180" size={17} />
                                </button>
                            </div>
                        </nav>

                        <div className="mt-7 flex items-end justify-between gap-6">
                            <div>
                                <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-[#5b5b5b]">UXISM / LIVE CHAT / EVENT ROOM</p>
                                <h1 className="mt-3 font-sans text-[36px] uppercase leading-[0.92] tracking-[0.02em] text-white sm:text-[48px]">Signal Room</h1>
                            </div>

                            <div className="hidden text-right font-mono text-[11px] uppercase tracking-[0.14em] text-[#5b5b5b] sm:block">
                                <p>feed / public</p>
                                <p>state / {statusText}</p>
                            </div>
                        </div>

                        {activeSessionId && <div className="mt-4 truncate border border-[#2e2e2e] px-3 py-2 font-mono text-[10px] uppercase tracking-[0.14em] text-[#5b5b5b]">Session is Active</div>}
                    </header>

                    <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden border-x border-[#2e2e2e] bg-[#171717]/70">
                        <div className="pointer-events-none absolute left-0 right-0 top-0 z-20 h-20 bg-gradient-to-b from-[#181818] via-[#181818]/75 to-transparent backdrop-blur-[2px]" />

                        <div ref={scrollRef} className="flex h-full flex-col overflow-y-auto overscroll-contain px-0 pb-4 pt-4">
                            <div className="mt-auto flex min-h-min flex-col">
                                {sessionLoading && <SystemMessage title="Loading session" body="Checking for the latest active live session." />}
                                {errorMessage && <SystemMessage title="Connection error" body={errorMessage} tone="error" />}
                                {!sessionLoading && !errorMessage && !activeSessionId && <SystemMessage title="No active session" body="Create or activate a live session before messages can appear." />}
                                {activeSessionId && messagesLoading && <SystemMessage title="Loading messages" body="Reading live chat feed." />}
                                {activeSessionId && !messagesLoading && messages.length === 0 && <SystemMessage title="No messages yet" body="Send the first message to start the room signal." />}

                                {messages.map((chat, index) => {
                                    const name = chat.user?.name || "Unknown User";
                                    const profilePicture = chat.user?.profile_picture || "";

                                    return (
                                        <article key={`${index}-${name}-${chat.message}`} className="grid animate-[fadeInUp_260ms_ease-out] grid-cols-[48px_1fr] gap-3 border-b border-[#2e2e2e] px-4 py-4 sm:grid-cols-[56px_1fr] sm:px-5">
                                            {profilePicture ? <img src={profilePicture} alt={`${name} avatar`} className="h-10 w-10 border border-[#2e2e2e] object-cover sm:h-11 sm:w-11" /> : <div className="grid h-10 w-10 place-items-center border border-[#2e2e2e] bg-[#181818] font-mono text-[11px] uppercase tracking-[0.08em] text-[#ff6a6a] sm:h-11 sm:w-11">{getInitials(name)}</div>}

                                            <div className="min-w-0">
                                                <div className="flex items-start justify-between gap-3">
                                                    <div className="min-w-0">
                                                        <h2 className="truncate font-sans text-[16px] uppercase tracking-[0.04em] text-white">{name}</h2>
                                                        <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.14em] text-[#5b5b5b]">participant</p>
                                                    </div>

                                                    {index === messages.length - 1 && <span className="shrink-0 border border-[rgba(222,247,103,0.5)] px-2 py-1 font-mono text-[10px] uppercase tracking-[0.12em] text-[#DEF767]">Latest</span>}
                                                </div>

                                                <p className="mt-3 break-words text-[13px] leading-6 text-[#929292]">{chat.message}</p>
                                            </div>
                                        </article>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    <form onSubmit={sendMessage} className="relative z-20 shrink-0 border-t border-[#2e2e2e] bg-[#181818] pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-4">
                        <div className="flex items-stretch gap-2">
                            <div ref={reactionsRef} className="relative shrink-0 self-end">
                                {floatingReactions.map((reaction, index) => (
                                    <span key={reaction.id} className="pointer-events-none absolute bottom-full left-1/2 z-30 -translate-x-1/2 animate-[reactionFloat_1.8s_ease-out_forwards] text-[22px]" style={{ marginBottom: 8 + index * 6 }} aria-hidden>
                                        {reaction.emoji}
                                    </span>
                                ))}

                                {reactionsOpen && (
                                    <div className="absolute bottom-full left-0 z-40 mb-2 flex flex-col-reverse gap-1.5 border border-[#2e2e2e] bg-[#171717] p-1.5" role="menu" aria-label="Reactions">
                                        {REACTIONS.map((reaction) => (
                                            <button key={reaction.id} type="button" role="menuitem" onClick={() => triggerReaction(reaction.emoji)} className="grid h-11 w-11 place-items-center text-[22px] active:bg-[#ff6a6a]" aria-label={reaction.label}>
                                                {reaction.emoji}
                                            </button>
                                        ))}
                                    </div>
                                )}

                                <button type="button" onClick={() => setReactionsOpen((open) => !open)} className={`grid h-[58px] w-12 place-items-center border bg-[#171717] text-[#929292] active:border-[rgba(222,247,103,0.5)] active:text-[#DEF767] ${reactionsOpen ? "border-[rgba(222,247,103,0.5)] text-[#DEF767]" : "border-[#2e2e2e]"}`} aria-label="Add reaction" aria-expanded={reactionsOpen} aria-haspopup="menu">
                                    <Smile size={20} aria-hidden />
                                </button>
                            </div>

                            <div className="flex min-h-[58px] min-w-0 flex-1 border border-[#2e2e2e] bg-[#171717] focus-within:border-[rgba(222,247,103,0.5)]">
                                <input value={input} onChange={(event) => setInput(event.target.value)} placeholder={activeSessionId ? "Type message to everyone" : "No active session"} disabled={!activeSessionId || addMessageLoading} className="h-[58px] min-w-0 flex-1 bg-transparent px-4 text-[13px] leading-6 text-white outline-none placeholder:text-[#5b5b5b] disabled:cursor-not-allowed disabled:text-[#5b5b5b]" maxLength={500} />

                                <button type="submit" disabled={!activeSessionId || addMessageLoading || input.trim().length === 0} className="grid w-14 shrink-0 place-items-center border-l border-[#2e2e2e] text-[#929292] disabled:cursor-not-allowed disabled:opacity-30 active:bg-[#ff6a6a] active:text-[#171717]" aria-label="Send message">
                                    <Send size={18} />
                                </button>
                            </div>
                        </div>

                        <div className="mt-3 flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.14em] text-[#5b5b5b]">
                            <span>{addMessageLoading ? "sending" : "public channel"}</span>
                            <span>{input.length}/500</span>
                        </div>
                    </form>
                </div>

                <aside className="pointer-events-none fixed bottom-6 right-5 hidden flex-col gap-4 lg:flex">
                    <button type="button" className="pointer-events-auto grid h-10 w-10 place-items-center rounded-[24px] border border-[#5b5b5b] bg-[#181818] text-[#929292] active:border-[rgba(222,247,103,0.5)]">
                        <Plus size={17} />
                    </button>

                    <button type="button" onClick={scrollToLatest} className="pointer-events-auto grid h-10 w-10 place-items-center rounded-[24px] border border-[rgba(222,247,103,0.5)] bg-[#181818] text-[#DEF767]">
                        <ArrowUp className="rotate-180" size={17} />
                    </button>
                </aside>
            </section>

            <div className="fixed bottom-6 right-5 z-50 flex flex-col items-end">
                {questionOpen && (
                    <div className="mb-3 w-[min(calc(100vw-40px),320px)] border border-[#2e2e2e] bg-[#181818]">
                        <div className="flex h-11 items-center justify-between border-b border-[#2e2e2e] px-3">
                            <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#929292]">ask / live question</p>
                            <button type="button" onClick={closeQuestionBox} className="grid h-8 w-8 place-items-center text-[#929292] active:bg-[#ff6a6a] active:text-[#171717]" aria-label="Close question box">
                                <X size={15} />
                            </button>
                        </div>

                        {questionSent ? (
                            <div className="px-4 py-5">
                                <p className="font-sans text-[18px] uppercase leading-tight tracking-[0.04em] text-white">Question Sent</p>
                                <p className="mt-2 text-[13px] leading-5 text-[#929292]">Your question has been sent.</p>
                            </div>
                        ) : (
                            <form onSubmit={sendQuestion} className="p-3">
                                <textarea value={questionText} onChange={(event) => setQuestionText(event.target.value)} placeholder="Write your question" className="min-h-24 w-full resize-none border border-[#2e2e2e] bg-[#171717] px-3 py-3 text-[13px] leading-5 text-white outline-none placeholder:text-[#5b5b5b] focus:border-[rgba(222,247,103,0.5)]" maxLength={240} />

                                <div className="mt-3 flex items-center justify-between gap-3">
                                    <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#5b5b5b]">{questionText.length}/240</span>
                                    <button type="submit" disabled={questionText.trim().length === 0} className="flex h-10 items-center gap-2 border border-[#2e2e2e] px-3 font-mono text-[10px] uppercase tracking-[0.14em] text-[#929292] disabled:cursor-not-allowed disabled:opacity-30 active:bg-[#ff6a6a] active:text-[#171717]">
                                        <Send size={14} />
                                        Send
                                    </button>
                                </div>
                            </form>
                        )}
                    </div>
                )}

                {!questionOpen && (
                    <button type="button" onClick={() => setQuestionOpen(true)} className="flex h-10 items-center gap-2 rounded-[24px] border border-[#5b5b5b] bg-[#181818] px-3 font-mono text-[10px] uppercase tracking-[0.14em] text-[#929292] active:border-[rgba(222,247,103,0.5)] active:text-[#DEF767]" aria-label="Ask a question">
                        <MessageCircle size={15} />
                        Ask me a question
                    </button>
                )}
            </div>

            <style jsx global>{`
                @keyframes fadeInUp {
                    from {
                        opacity: 0;
                        transform: translateY(14px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }

                @keyframes reactionFloat {
                    0% {
                        opacity: 0;
                        transform: translate(-50%, 12px) scale(0.85);
                    }
                    15% {
                        opacity: 1;
                        transform: translate(-50%, 0) scale(1);
                    }
                    100% {
                        opacity: 0;
                        transform: translate(-50%, -72px) scale(1.1);
                    }
                }
            `}</style>
        </main>
    );
}

function SystemMessage({ title, body, tone = "muted" }: { title: string; body: string; tone?: "muted" | "error" }) {
    return (
        <div className="border-b border-[#2e2e2e] px-4 py-5 sm:px-5">
            <p className={`font-mono text-[11px] uppercase tracking-[0.14em] ${tone === "error" ? "text-[#ff6a6a]" : "text-[#5b5b5b]"}`}>{title}</p>
            <p className="mt-2 text-[13px] leading-6 text-[#929292]">{body}</p>
        </div>
    );
}

function LivePollPanel({ poll, currentTime, selectedOptionId, isPending, compact, onVote }: { poll: LivePoll; currentTime: number; selectedOptionId?: string; isPending: boolean; compact: boolean; onVote: (poll: LivePoll, optionId: string) => void }) {
    const progress = getPollProgress(poll, currentTime);
    const secondsRemaining = getSecondsRemaining(poll.ends_at, currentTime);
    const hasVoted = Boolean(selectedOptionId);

    return (
        <section className="relative overflow-hidden border border-[#2e2e2e] bg-[#181818]/95 backdrop-blur-sm">
            <div className={`grid gap-3 px-4 sm:grid-cols-[1fr_auto] sm:items-start sm:px-5 ${compact ? "pb-3 pt-3" : "pb-5 pt-4"}`}>
                <div className="min-w-0">
                    <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#5b5b5b]">poll / {hasVoted ? "vote locked" : isPending ? "sending vote" : `${secondsRemaining}s left`}</p>
                    <h2 className={`mt-2 break-words font-sans uppercase leading-[1.05] tracking-[0.04em] text-white ${compact ? "overflow-hidden text-[16px] [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:1] sm:text-[18px]" : "text-[20px] sm:text-[24px]"}`}>{poll.title}</h2>
                </div>

                <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#5b5b5b] sm:text-right">{poll.poll_options.length} options</p>
            </div>

            <div className={`grid gap-2 px-4 sm:grid-cols-2 sm:px-5 ${compact ? "pb-3" : "pb-5"}`}>
                {poll.poll_options.map((option) => {
                    const isSelected = selectedOptionId === option.id;
                    const disabled = hasVoted || isPending;

                    return (
                        <button key={option.id} type="button" onClick={() => onVote(poll, option.id)} disabled={disabled} className={`border px-3 text-left transition-colors disabled:cursor-not-allowed ${compact ? "min-h-9 truncate py-2 text-[12px] leading-4" : "min-h-12 py-3 text-[13px] leading-5"} ${isSelected ? "border-[#ff6a6a] bg-[#ff6a6a] text-[#171717]" : "border-[#2e2e2e] bg-[#171717] text-[#929292] active:bg-[#ff6a6a] active:text-[#171717] disabled:text-[#5b5b5b]"}`} aria-pressed={isSelected}>
                            {option.option}
                        </button>
                    );
                })}
            </div>

            <div className="absolute bottom-0 left-0 h-1 bg-[#2e2e2e] right-0" aria-hidden>
                <div className="h-full bg-white transition-[width] duration-200 ease-linear" style={{ width: `${progress}%` }} />
            </div>
        </section>
    );
}
