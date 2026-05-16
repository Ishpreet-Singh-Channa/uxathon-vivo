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
                                <h1 className="mt-3 font-serif text-[36px] uppercase leading-[0.92] tracking-[0.02em] text-white sm:text-[48px]">Signal Room</h1>
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
                                                        <h2 className="truncate font-serif text-[16px] uppercase tracking-[0.04em] text-white">{name}</h2>
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
                                <p className="font-serif text-[18px] uppercase leading-tight tracking-[0.04em] text-white">Question Sent</p>
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
                    <h2 className={`mt-2 break-words font-serif uppercase leading-[1.05] tracking-[0.04em] text-white ${compact ? "overflow-hidden text-[16px] [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:1] sm:text-[18px]" : "text-[20px] sm:text-[24px]"}`}>{poll.title}</h2>
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
