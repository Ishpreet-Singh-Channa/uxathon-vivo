"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
// import { ArrowLeft, Brain, Gamepad2, MessageCircle, Plus, Shapes, Sparkles, User, Users, Zap, type LucideIcon, X, Radio } from "lucide-react";
import { ArrowLeft, Brain, Gamepad2, MessageCircle, Plus, Shapes, Sparkles, User, Users, Zap, type LucideIcon, X, Radio } from "lucide-react";
import { useMultiplayer } from "@/lib/multiplayer/useMultiplayer";

type Game = {
    id: string;
    title: string;
    description: string;
    meta: string;
    href: string;
    icon: LucideIcon;
};

const GAMES: Game[] = [
    { id: "chimp", title: "chimp", description: "Pair live signals before the feed resets.", meta: "mode / memory", href: "/games/chimp", icon: Brain },
    { id: "number-memory", title: "number-memory", description: "Draw the prompt before the room times out.", meta: "mode / creative", href: "/games/number-memory", icon: Shapes },
    { id: "sequence-memory", title: "sequence-memory", description: "Vote with the crowd on the fastest path.", meta: "mode / social", href: "/games/sequence-memory", icon: Zap },
    { id: "reaction-time", title: "reaction-time", description: "Answer streak questions from the event deck.", meta: "mode / quiz", href: "/games/reaction-time", icon: Sparkles },
];

export default function GamesPage() {
    const [selectedId, setSelectedId] = useState(GAMES[0].id);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const { activeRoomCode } = useMultiplayer();

    const selectedGame = GAMES.find((game) => game.id === selectedId) ?? GAMES[0];

    return (
        <main className="relative flex min-h-screen flex-col overflow-hidden bg-[#181818] text-white select-none">
            <header className="relative z-20 flex shrink-0 items-center justify-between border-b border-[#2e2e2e] bg-[#181818]/95 px-5 py-4">
                <Link href="/dashboard" className="flex h-10 items-center gap-2 border border-[#2e2e2e] px-4 font-mono text-[11px] uppercase tracking-[0.14em] text-[#929292]">
                    <ArrowLeft size={14} /> Dashboard
                </Link>
            </header>

            <section className="relative z-10 mx-auto flex w-full max-w-lg flex-1 flex-col px-5 pb-36 pt-8">
                <div className="mb-8">
                    <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-[#5b5b5b]">UXATHON / GAMING LOUNGE</p>
                    <h1 className="mt-3 font-sans text-[30px] uppercase tracking-[0.02em]">Pick your challenge</h1>
                </div>

                <ul className="border border-[#2e2e2e]">
                    {GAMES.map((game) => {
                        const Icon = game.icon;
                        const isSelected = game.id === selectedId;
                        return (
                            <li key={game.id}>
                                <button type="button" onClick={() => setSelectedId(game.id)} className={`grid w-full grid-cols-[auto_1fr_auto] items-center gap-4 border border-[#2e2e2e] px-4 py-4 text-left ${isSelected ? "bg-[#ff6a6a] text-[#171717]" : "bg-[#181818]"}`}>
                                    <span className={`grid h-11 w-11 place-items-center border ${isSelected ? "border-[#171717]/30" : "border-[#2e2e2e]"}`}><Icon size={20} /></span>
                                    <div>
                                        <span className="block font-sans text-[16px] uppercase tracking-[0.04em]">{game.title}</span>
                                        <span className="block font-mono text-[10px] uppercase tracking-[0.14em]">{game.meta}</span>
                                    </div>
                                    <Plus size={18} className={isSelected ? "rotate-45" : ""} />
                                </button>
                            </li>
                        );
                    })}
                </ul>

                <button type="button" onClick={() => setIsModalOpen(true)} className="mt-6 flex min-h-[58px] w-full items-center justify-center border border-[rgba(222,247,103,0.5)] bg-[#181818] font-mono text-[11px] uppercase tracking-[0.14em] text-[#DEF767]">
                    Initialize {selectedGame.title}
                </button>
            </section>

            {/* Mode Split Intercept Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                    <div className="w-full max-w-md border border-[#2e2e2e] bg-[#171717] p-6 relative">
                        <button onClick={() => setIsModalOpen(false)} className="absolute right-4 top-4 text-[#5b5b5b] hover:text-white"><X size={16} /></button>
                        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#5b5b5b] mb-1">MODE ROUTING INTERCEPT</p>
                        <h3 className="font-sans text-xl uppercase tracking-[0.04em] mb-4">Select Deployment Layer</h3>
                        
                        <div className="space-y-3">
                            <Link href={`${selectedGame.href}?mode=singleplayer`} className="block w-full text-center border border-[#2e2e2e] bg-[#181818] py-4 font-mono text-[11px] uppercase tracking-[0.14em] hover:border-[#ff6a6a]">
                                [ Mode A ] Local Sandbox (Singleplayer)
                            </Link>

                            {activeRoomCode ? (
                                <Link href={`/room/${activeRoomCode}`} className="block w-full text-center border border-[rgba(222,247,103,0.5)] bg-[#181818] py-4 font-mono text-[11px] uppercase tracking-[0.14em] text-[#DEF767] hover:bg-[#DEF767] hover:text-[#171717]">
                                    [ Mode B ] Broadcast to Linked Room ({activeRoomCode})
                                </Link>
                            ) : (
                                <button onClick={() => alert('Operational Failure: No active room key mapped. Deploy or sync a room from the dashboard topology first.')} className="block w-full text-center border border-[#2e2e2e] opacity-40 cursor-not-allowed bg-[#181818]/50 py-4 font-mono text-[11px] uppercase tracking-[0.14em] text-[#5b5b5b]">
                                    [ Mode B ] Multiplayer (No Linked Room Detected)
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </main>
    );
}
