// "use client";

// import Link from "next/link";
// import { usePathname } from "next/navigation";
// import { useState } from "react";
// import {
//     ArrowLeft,
//     Brain,
//     Gavel,
//     Gamepad2,
//     MessageCircle,
//     Plus,
//     Shapes,
//     Sparkles,
//     User,
//     Users,
//     Zap,
//     type LucideIcon,
// } from "lucide-react";

// type Game = {
//     id: string;
//     title: string;
//     description: string;
//     meta: string;
//     href: string | null;
//     icon: LucideIcon;
// };

// const GAMES: Game[] = [
//     {
//         id: "signal-match",
//         title: "chimp",
//         description: "Pair live signals before the feed resets.",
//         meta: "mode / memory",
//         href: "/games/chimp",
//         icon: Brain,
//     },
//     {
//         id: "rapid-sketch",
//         title: "number-memory",
//         description: "Draw the prompt before the room times out.",
//         meta: "mode / creative",
//         href: "/games/number-memory",
//         icon: Shapes,
//     },
//     {
//         id: "pulse-poll",
//         title: "sequence-memory",
//         description: "Vote with the crowd on the fastest path.",
//         meta: "mode / social",
//         href: "/games/sequence-memory",
//         icon: Zap,
//     },
//     {
//         id: "spark-trivia",
//         title: "reaction-time",
//         description: "Answer streak questions from the event deck.",
//         meta: "mode / quiz",
//         href: "/games/reaction-time",
//         icon: Sparkles,
//     },
// ];

// const bottomNavItems = [
//     { label: "My Team", href: "/myteam", icon: Users, enabled: true },
//     { label: "Bidding", href: null, icon: Gavel, enabled: false },
//     { label: "Games", href: "/games", icon: Gamepad2, enabled: true },
//     { label: "Live Chat", href: "/live", icon: MessageCircle, enabled: true },
// ];

// export default function GamesPage() {
//     const pathname = usePathname();
//     const [selectedId, setSelectedId] = useState(GAMES[0].id);

//     const selectedGame = GAMES.find((game) => game.id === selectedId) ?? GAMES[0];
//     const canPlay = Boolean(selectedGame.href);

//     return (
//         <main className="relative flex min-h-screen flex-col overflow-hidden bg-[#181818] text-white selection:bg-[#ff6a6a] selection:text-[#171717]">
//             <PageDecor />

//             <header className="relative z-20 flex shrink-0 items-center justify-between border-b border-[#2e2e2e] bg-[#181818]/95 px-5 py-4 backdrop-blur-[2px]">
//                 <Link
//                     href="/dashboard"
//                     className="flex h-10 items-center gap-2 border border-[#2e2e2e] px-4 font-mono text-[11px] uppercase tracking-[0.14em] text-[#929292] active:border-[rgba(222,247,103,0.5)] active:text-[#DEF767]"
//                 >
//                     <ArrowLeft size={14} aria-hidden />
//                     Dashboard
//                 </Link>

//                 <Link
//                     href="/profile"
//                     aria-label="Open profile"
//                     className="grid h-10 w-10 place-items-center rounded-[24px] border border-[#5b5b5b] bg-[#181818] text-[#929292] active:border-[rgba(222,247,103,0.5)] active:text-[#DEF767]"
//                 >
//                     <User size={18} aria-hidden />
//                 </Link>
//             </header>

//             <section className="relative z-10 mx-auto flex w-full max-w-lg flex-1 flex-col px-5 pb-36 pt-8">
//                 <div className="mb-8">
//                     <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-[#5b5b5b]">
//                         UXATHON / GAMES / PLAY LOUNGE
//                     </p>
//                     <h1 className="mt-3 font-sans text-[32px] uppercase leading-[0.95] tracking-[0.02em] text-white sm:text-[40px]">
//                         Choose a Game
//                     </h1>
//                     <p className="mt-4 max-w-[34ch] text-[13px] leading-6 text-[#929292]">
//                         Select one of four room games. Routes will connect here when each game is ready.
//                     </p>
//                 </div>

//                 <ul className="border border-[#2e2e2e]" role="listbox" aria-label="Available games">
//                     {GAMES.map((game, index) => {
//                         const Icon = game.icon;
//                         const isSelected = game.id === selectedId;

//                         return (
//                             <li key={game.id} className={index > 0 ? "-mt-px" : undefined}>
//                                 <button
//                                     type="button"
//                                     role="option"
//                                     aria-selected={isSelected}
//                                     onClick={() => setSelectedId(game.id)}
//                                     className={`grid w-full min-h-[90px] grid-cols-[auto_1fr_auto] items-center gap-4 border border-[#2e2e2e] px-4 py-4 text-left transition-colors sm:px-5 ${isSelected
//                                             ? "relative z-10 bg-[#ff6a6a] text-[#171717]"
//                                             : "bg-[#181818] text-white active:bg-[#171717]"
//                                         }`}
//                                 >
//                                     <span
//                                         className={`grid h-11 w-11 place-items-center border ${isSelected ? "border-[#171717]/30" : "border-[#2e2e2e]"
//                                             }`}
//                                     >
//                                         <Icon
//                                             size={20}
//                                             className={isSelected ? "text-[#171717]" : "text-[#929292]"}
//                                             aria-hidden
//                                         />
//                                     </span>

//                                     <span className="min-w-0">
//                                         <span className="block font-sans text-[16px] uppercase tracking-[0.04em]">
//                                             {game.title}
//                                         </span>
//                                         <span
//                                             className={`mt-1 block truncate font-mono text-[10px] uppercase tracking-[0.14em] ${isSelected ? "text-[#171717]/70" : "text-[#5b5b5b]"
//                                                 }`}
//                                         >
//                                             {game.meta}
//                                         </span>
//                                     </span>

//                                     <Plus
//                                         size={18}
//                                         className={`shrink-0 transition-transform duration-200 ${isSelected ? "rotate-45 text-[#171717]" : "text-[#5b5b5b]"
//                                             }`}
//                                         aria-hidden
//                                     />
//                                 </button>
//                             </li>
//                         );
//                     })}
//                 </ul>

//                 <div className="mt-6 border border-[#2e2e2e] bg-[#171717]/70 px-4 py-4 sm:px-5">
//                     <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#5b5b5b]">selected</p>
//                     <p className="mt-2 font-sans text-[18px] uppercase tracking-[0.04em] text-white">
//                         {selectedGame.title}
//                     </p>
//                     <p className="mt-2 text-[13px] leading-6 text-[#929292]">{selectedGame.description}</p>
//                 </div>
//             </section>

//             <div className="fixed bottom-[calc(4.75rem+env(safe-area-inset-bottom))] left-0 right-0 z-20 px-5">
//                 <div className="mx-auto max-w-lg">
//                     {canPlay ? (
//                         <Link
//                             href={selectedGame.href!}
//                             className="flex min-h-[58px] w-full items-center justify-center border border-[rgba(222,247,103,0.5)] bg-[#181818] font-mono text-[11px] uppercase tracking-[0.14em] text-[#DEF767] active:border-[#ff6a6a] active:bg-[#ff6a6a] active:text-[#171717]"
//                         >
//                             Play {selectedGame.title}
//                         </Link>
//                     ) : (
//                         <button
//                             type="button"
//                             disabled
//                             className="flex min-h-[58px] w-full cursor-not-allowed items-center justify-center border border-[#2e2e2e] bg-[#171717] font-mono text-[11px] uppercase tracking-[0.14em] text-[#5b5b5b]"
//                             aria-disabled="true"
//                         >
//                             Play — route pending
//                         </button>
//                     )}
//                 </div>
//             </div>

//             <nav
//                 aria-label="Dashboard navigation"
//                 className="fixed bottom-0 left-0 right-0 z-20 border-t border-[#2e2e2e] bg-[#181818]/95 backdrop-blur-[2px] pb-[max(0.75rem,env(safe-area-inset-bottom))]"
//             >
//             </nav>
//         </main>
//     );
// }

// function PageDecor() {
//     return (
//         <>
//             <div className="pointer-events-none fixed inset-0 opacity-25 [background-image:radial-gradient(#5b5b5b_1px,transparent_1px)] [background-size:18px_18px]" />
//             <div className="pointer-events-none fixed left-4 top-4 z-0 h-5 w-5 border-l border-t border-[#5b5b5b]" />
//             <div className="pointer-events-none fixed right-4 top-4 z-0 h-5 w-5 border-r border-t border-[#5b5b5b]" />
//             <div className="pointer-events-none fixed bottom-24 left-4 z-0 h-5 w-5 border-b border-l border-[#5b5b5b]" />
//             <div className="pointer-events-none fixed bottom-24 right-4 z-0 h-5 w-5 border-b border-r border-[#5b5b5b]" />
//             <div className="pointer-events-none fixed left-1/2 top-[-120px] h-[280px] w-[280px] -translate-x-1/2 rounded-full bg-[radial-gradient(circle_at_30%_30%,#46B1FF,transparent_35%),radial-gradient(circle_at_70%_40%,#A259FF,transparent_35%),radial-gradient(circle_at_50%_70%,#ff6a6a,transparent_38%),radial-gradient(circle_at_80%_80%,#DEF767,transparent_30%)] opacity-20 blur-3xl" />
//         </>
//     );
// }


"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
// import { ArrowLeft, Brain, Gamepad2, MessageCircle, Plus, Shapes, Sparkles, User, Users, Zap, type LucideIcon, X, Radio } from "lucide-react";
import { ArrowLeft, Brain, Gamepad2, MessageCircle, Plus, Shapes, Sparkles, User, Users, Zap, Layers, type LucideIcon, X, Radio } from "lucide-react";
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
    { 
        id: "persona-flow", 
        title: "Persona Flow", 
        description: "Draft identity matrices in a real-time race against synced nodes.", 
        meta: "mode / strategy", 
        href: "/games/persona-flow", 
        icon: Layers // Import Layers from lucide-react
    },
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
                <Link href="/profile" className="grid h-10 w-10 place-items-center rounded-[24px] border border-[#5b5b5b] text-[#929292]">
                    <User size={18} />
                </Link>
            </header>

            <section className="relative z-10 mx-auto flex w-full max-w-lg flex-1 flex-col px-5 pb-36 pt-8">
                <div className="mb-8">
                    <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-[#5b5b5b]">UXATHON / GAMES / LOUNGE</p>
                    <h1 className="mt-3 font-sans text-[32px] uppercase tracking-[0.02em]">Choose operational mode</h1>
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
