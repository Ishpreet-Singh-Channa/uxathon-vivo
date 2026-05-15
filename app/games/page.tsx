"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
    Brain,
    Gavel,
    Gamepad2,
    MessageCircle,
    Plus,
    Shapes,
    Sparkles,
    User,
    Users,
    Zap,
    type LucideIcon,
} from "lucide-react";

type Game = {
    id: string;
    title: string;
    description: string;
    meta: string;
    href: string | null;
    icon: LucideIcon;
};

const GAMES: Game[] = [
    {
        id: "signal-match",
        title: "chimp",
        description: "Pair live signals before the feed resets.",
        meta: "mode / memory",
        href: "/games/chimp",
        icon: Brain,
    },
    {
        id: "rapid-sketch",
        title: "number-memory",
        description: "Draw the prompt before the room times out.",
        meta: "mode / creative",
        href: "/games/number-memory",
        icon: Shapes,
    },
    {
        id: "pulse-poll",
        title: "sequence-memory",
        description: "Vote with the crowd on the fastest path.",
        meta: "mode / social",
        href: "/games/sequence-memory",
        icon: Zap,
    },
    {
        id: "spark-trivia",
        title: "reaction-time",
        description: "Answer streak questions from the event deck.",
        meta: "mode / quiz",
        href: "/games/reaction-time",
        icon: Sparkles,
    },
];

const bottomNavItems = [
    { label: "My Team", href: "/myteam", icon: Users, enabled: true },
    { label: "Bidding", href: null, icon: Gavel, enabled: false },
    { label: "Games", href: "/games", icon: Gamepad2, enabled: true },
    { label: "Live Chat", href: "/live", icon: MessageCircle, enabled: true },
];

export default function GamesPage() {
    const pathname = usePathname();
    const [selectedId, setSelectedId] = useState(GAMES[0].id);

    const selectedGame = GAMES.find((game) => game.id === selectedId) ?? GAMES[0];
    const canPlay = Boolean(selectedGame.href);

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

            <section className="relative z-10 mx-auto flex w-full max-w-lg flex-1 flex-col px-5 pb-36 pt-8">
                <div className="mb-8">
                    <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-[#5b5b5b]">
                        UXATHON / GAMES / PLAY LOUNGE
                    </p>
                    <h1 className="mt-3 font-serif text-[32px] uppercase leading-[0.95] tracking-[0.02em] text-white sm:text-[40px]">
                        Choose a Game
                    </h1>
                    <p className="mt-4 max-w-[34ch] text-[13px] leading-6 text-[#929292]">
                        Select one of four room games. Routes will connect here when each game is ready.
                    </p>
                </div>

                <ul className="border border-[#2e2e2e]" role="listbox" aria-label="Available games">
                    {GAMES.map((game, index) => {
                        const Icon = game.icon;
                        const isSelected = game.id === selectedId;

                        return (
                            <li key={game.id} className={index > 0 ? "-mt-px" : undefined}>
                                <button
                                    type="button"
                                    role="option"
                                    aria-selected={isSelected}
                                    onClick={() => setSelectedId(game.id)}
                                    className={`grid w-full min-h-[90px] grid-cols-[auto_1fr_auto] items-center gap-4 border border-[#2e2e2e] px-4 py-4 text-left transition-colors sm:px-5 ${
                                        isSelected
                                            ? "relative z-10 bg-[#ff6a6a] text-[#171717]"
                                            : "bg-[#181818] text-white active:bg-[#171717]"
                                    }`}
                                >
                                    <span
                                        className={`grid h-11 w-11 place-items-center border ${
                                            isSelected ? "border-[#171717]/30" : "border-[#2e2e2e]"
                                        }`}
                                    >
                                        <Icon
                                            size={20}
                                            className={isSelected ? "text-[#171717]" : "text-[#929292]"}
                                            aria-hidden
                                        />
                                    </span>

                                    <span className="min-w-0">
                                        <span className="block font-serif text-[16px] uppercase tracking-[0.04em]">
                                            {game.title}
                                        </span>
                                        <span
                                            className={`mt-1 block truncate font-mono text-[10px] uppercase tracking-[0.14em] ${
                                                isSelected ? "text-[#171717]/70" : "text-[#5b5b5b]"
                                            }`}
                                        >
                                            {game.meta}
                                        </span>
                                    </span>

                                    <Plus
                                        size={18}
                                        className={`shrink-0 transition-transform duration-200 ${
                                            isSelected ? "rotate-45 text-[#171717]" : "text-[#5b5b5b]"
                                        }`}
                                        aria-hidden
                                    />
                                </button>
                            </li>
                        );
                    })}
                </ul>

                <div className="mt-6 border border-[#2e2e2e] bg-[#171717]/70 px-4 py-4 sm:px-5">
                    <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#5b5b5b]">selected</p>
                    <p className="mt-2 font-serif text-[18px] uppercase tracking-[0.04em] text-white">
                        {selectedGame.title}
                    </p>
                    <p className="mt-2 text-[13px] leading-6 text-[#929292]">{selectedGame.description}</p>
                </div>
            </section>

            <div className="fixed bottom-[calc(4.75rem+env(safe-area-inset-bottom))] left-0 right-0 z-20 px-5">
                <div className="mx-auto max-w-lg">
                    {canPlay ? (
                        <Link
                            href={selectedGame.href!}
                            className="flex min-h-[58px] w-full items-center justify-center border border-[rgba(222,247,103,0.5)] bg-[#181818] font-mono text-[11px] uppercase tracking-[0.14em] text-[#DEF767] active:border-[#ff6a6a] active:bg-[#ff6a6a] active:text-[#171717]"
                        >
                            Play {selectedGame.title}
                        </Link>
                    ) : (
                        <button
                            type="button"
                            disabled
                            className="flex min-h-[58px] w-full cursor-not-allowed items-center justify-center border border-[#2e2e2e] bg-[#171717] font-mono text-[11px] uppercase tracking-[0.14em] text-[#5b5b5b]"
                            aria-disabled="true"
                        >
                            Play — route pending
                        </button>
                    )}
                </div>
            </div>

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
                                        isActive
                                            ? "text-[#ff6a6a]"
                                            : "text-[#929292] active:text-[#DEF767]"
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
