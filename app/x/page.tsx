"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Hash, Play, Info, Shield, Zap, Globe, Cpu, ArrowLeft, Gavel, X, AlertTriangle } from "lucide-react";
import Link from "next/link";
import { useSubscription } from "@apollo/client/react";
import { WATCH_TEAMS } from "@/lib/GameRules/game-queries";
import { useAuth } from "@/context/token-context";
import PersonaGameEvent from "@/components/game/PersonaGameEvent/PersonaGameEvent";

// --- TEMPLATE SYSTEM: Define your events here ---
const EVENTS = [
    {
        id: "persona-race",
        type: "GAME",
        title: "Persona Race",
        description: "Sort through the architectural archetypes to define your operational stance. Restraint is a value; density is earned.",
        icon: <Zap className="text-[#DEF767]" size={20} />,
        status: "ACTIVE",
        coord: "34.0522° N / 118.2437° W"
    },
    {
        id: "event-bidding",
        type: "BIDDING",
        title: "Event Biddings",
        description: "Participate in high-stakes auctions to secure elite personnel. Winners gain the right to buy their team members first.",
        icon: <Gavel className="text-[#ff6a6a]" size={20} />,
        status: "LOCKED",
        coord: "51.5074° N / 0.1278° W"
    }
];

export default function EventHubPage() {
    const [activeEventId, setActiveEventId] = useState<string | null>(null);
    const [isMounted, setIsMounted] = useState(false);
    const [transId, setTransId] = useState("");
    const [showAlreadyAssignedPopup, setShowAlreadyAssignedPopup] = useState(false);

    const { getData } = useAuth();
    const { data: teamsData } = useSubscription<{ teams: any[] }>(WATCH_TEAMS);

    useEffect(() => {
        setIsMounted(true);
        setTransId(Math.random().toString(36).substring(7).toUpperCase());
    }, []);

    // Identity verification
    const userData = getData();
    const userId = userData?.sub || (userData as any)?.["https://hasura.io/jwt/claims"]?.["x-hasura-user-id"];

    // Logic: If user has a team, they have already won and assigned a persona
    const isAlreadyAssigned = teamsData?.teams?.some((t: any) => String(t.leader_id) === String(userId));

    // Render the specific event component based on selection
    if (activeEventId === "persona-race") {
        return <PersonaGameEvent onBack={() => setActiveEventId(null)} />;
    }

    if (!isMounted) return null;

    return (
        <main className="relative min-h-screen flex flex-col items-center bg-[#181818] text-white selection:bg-[#ff6a6a] selection:text-[#171717] overflow-x-hidden">
            {/* --- GLOBAL VISUAL SHELL --- */}
            <div className="pointer-events-none fixed inset-0 opacity-25 [background-image:radial-gradient(#5b5b5b_1px,transparent_1px)] [background-size:24px_24px]" />
            <div className="pointer-events-none fixed left-4 top-4 h-6 w-6 border-l border-t border-[#5b5b5b] sm:left-6 sm:top-6" />
            <div className="pointer-events-none fixed right-4 top-4 h-6 w-6 border-r border-t border-[#5b5b5b] sm:right-6 sm:top-6" />
            <div className="pointer-events-none fixed bottom-4 left-4 h-6 w-6 border-b border-l border-[#5b5b5b] sm:bottom-6 sm:left-6" />
            <div className="pointer-events-none fixed bottom-4 right-4 h-6 w-6 border-b border-r border-[#5b5b5b] sm:bottom-6 sm:right-6" />

            <div className="pointer-events-none fixed left-1/2 top-1/4 h-[500px] w-[500px] -translate-x-1/2 rounded-full bg-[radial-gradient(circle_at_50%_50%,#ff6a6a,transparent_50%),radial-gradient(circle_at_20%_20%,#46B1FF,transparent_40%)] opacity-10 blur-[100px]" />

            {/* Back Button - Top Left relative to container */}
            <div className="w-full max-w-4xl px-6 sm:px-12 pt-12 flex justify-start">
                <Link
                    href="/dashboard"
                    className="group flex-shrink-0"
                    aria-label="Back to Dashboard"
                >
                    <div className="grid h-10 w-10 place-items-center border border-[#2e2e2e] group-hover:border-[#DEF767] group-hover:bg-[#DEF767] group-hover:text-[#171717] transition-all">
                        <ArrowLeft size={18} />
                    </div>
                </Link>
            </div>

            {/* Header */}
            <header className="relative z-10 pt-4 px-6 sm:px-12 max-w-4xl flex flex-col items-center text-center">
                <h1 className="font-serif text-[clamp(2.5rem,8vw,4rem)] uppercase leading-[0.9] tracking-tight">
                    Event <span className="text-[#DEF767]">Playground</span>
                </h1>

                <p className="mt-8 font-sans text-[15px] leading-relaxed text-[#929292] max-w-[45ch]">
                    Play the games before everyone else joins in a competetive room.
                </p>
            </header>

            {/* Event Grid */}
            <section className="relative z-10 mt-16 flex-1 px-6 sm:px-12 pb-32 w-full max-w-4xl">
                <div className="grid gap-4">
                    {EVENTS.map((event, index) => (
                        <EventRow
                            key={event.id}
                            event={event}
                            index={index}
                            onSelect={() => {
                                if (event.id === "persona-race" && isAlreadyAssigned) {
                                    setShowAlreadyAssignedPopup(true);
                                    return;
                                }
                                if (event.status === "ACTIVE") {
                                    setActiveEventId(event.id);
                                }
                            }}
                        />
                    ))}
                </div>
            </section>

            {/* Right Rail FABs */}
            <aside className="fixed right-0 top-0 bottom-0 w-[20%] pointer-events-none hidden lg:flex flex-col items-end justify-end p-12 z-50">
                <div className="flex flex-col gap-4 pointer-events-auto">
                    <button className="group relative grid h-10 w-10 place-items-center rounded-full border border-[#5b5b5b] bg-[#181818] transition-all hover:border-[#DEF767]">
                        <Plus className="text-[#929292] group-hover:text-white" size={18} />
                    </button>
                    <button className="group relative grid h-10 w-10 place-items-center rounded-full border border-[#5b5b5b] bg-[#181818]">
                        <Hash className="text-[#DEF767]" size={18} />
                    </button>
                </div>
            </aside>

            {/* --- ALREADY ASSIGNED POPUP --- */}
            <AnimatePresence>
                {showAlreadyAssignedPopup && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
                        {/* Overlay backdrop */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setShowAlreadyAssignedPopup(false)}
                            className="absolute inset-0 bg-[#181818]/90 backdrop-blur-md"
                        />

                        {/* Dot grid echo in popup */}
                        <div className="absolute inset-0 pointer-events-none opacity-[0.1] [background-image:radial-gradient(#5b5b5b_1px,transparent_1px)] [background-size:16px_16px]" />

                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 10 }}
                            className="relative max-w-lg w-full bg-[#171717] border border-[#2e2e2e] p-12 overflow-hidden shadow-2xl"
                        >
                            {/* Corner Accents - Technical Aesthetic */}
                            <div className="absolute left-0 top-0 h-4 w-4 border-l border-t border-[#ff6a6a]" />
                            <div className="absolute right-0 top-0 h-4 w-4 border-r border-t border-[#ff6a6a]" />
                            <div className="absolute left-0 bottom-0 h-4 w-4 border-l border-b border-[#ff6a6a]" />
                            <div className="absolute right-0 bottom-0 h-4 w-4 border-r border-b border-[#ff6a6a]" />

                            {/* Close Button - NOTICEABLE CROSS BUTTON */}
                            <button
                                onClick={() => setShowAlreadyAssignedPopup(false)}
                                className="absolute top-4 right-4 h-10 w-10 grid place-items-center border border-[#2e2e2e] text-[#5b5b5b] hover:border-[#ff6a6a] hover:bg-[#ff6a6a] hover:text-[#171717] transition-all group z-10"
                                aria-label="Close popup"
                            >
                                <X size={20} className="group-hover:rotate-90 transition-transform duration-300" />
                            </button>

                            <div className="flex flex-col items-center text-center">
                                <div className="mb-8 relative">
                                    <div className="absolute inset-0 bg-[#ff6a6a]/20 blur-2xl rounded-full" />
                                    <div className="relative h-20 w-20 border border-[#ff6a6a]/30 grid place-items-center">
                                        <Shield size={40} className="text-[#ff6a6a]" />
                                    </div>
                                </div>

                                <h2 className="font-serif text-[clamp(1.5rem,4vw,2.5rem)] uppercase tracking-tighter leading-none mb-6">
                                    Protocol <span className="text-[#ff6a6a]">Restriction</span>
                                </h2>

                                <div className="space-y-4">
                                    <p className="font-sans text-[15px] text-white font-medium leading-relaxed max-w-sm">
                                        You are already assigned a persona.
                                    </p>
                                    <p className="font-sans text-[13px] text-[#929292] leading-relaxed max-w-sm">
                                        System scan indicates you have already secured a persona unit. Dual deployment within this shard is restricted to prevent architectural dissonance.
                                    </p>
                                    <p className="font-sans text-[12px] text-[#5b5b5b] italic">
                                        Proceed to the dashboard or team view to manage your current unit.
                                    </p>
                                </div>

                                <div className="mt-12 pt-8 border-t border-[#2e2e2e] w-full flex flex-col items-center gap-4">
                                    <span className="font-mono text-[9px] uppercase tracking-[0.4em] text-[#5b5b5b]">Error_Log: DEPLOYMENT_LOCKED_X04</span>

                                    <button
                                        onClick={() => setShowAlreadyAssignedPopup(false)}
                                        className="h-12 px-10 border border-[#2e2e2e] font-mono text-[11px] uppercase tracking-widest text-[#929292] hover:border-[#DEF767] hover:text-white hover:bg-white/5 transition-all"
                                    >
                                        Acknowledge
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </main>
    );
}

function EventRow({ event, index, onSelect }: { event: typeof EVENTS[0], index: number, onSelect: () => void }) {
    const isLocked = event.status === "LOCKED";

    return (
        <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            onClick={onSelect}
            className={`group relative flex flex-col sm:flex-row sm:items-center gap-6 border border-[#2e2e2e] p-6 cursor-pointer transition-all duration-300 ${isLocked ? "opacity-50 grayscale cursor-not-allowed" : "hover:border-[#DEF767] hover:bg-white/[0.02]"
                }`}
        >
            <div className="flex items-center gap-4 sm:w-1/3">
                <div className="h-10 w-10 grid place-items-center bg-[#171717] border border-[#2e2e2e] group-hover:border-[#DEF767]/50 transition-colors">
                    {event.icon}
                </div>
                <div className="text-left">
                    <h3 className="font-serif text-lg uppercase tracking-wider text-white group-hover:text-[#DEF767] transition-colors">
                        {event.title}
                    </h3>
                </div>
            </div>

            <p className="flex-1 font-sans text-[12px] text-[#929292] leading-relaxed max-w-md text-left">
                {event.description}
            </p>

            <div className="flex items-center justify-between sm:justify-end gap-8 sm:w-1/4">
                <div className="flex flex-col items-end">
                    <span className={`text-[9px] font-mono uppercase tracking-tighter px-2 py-0.5 border ${event.status === "ACTIVE" ? "text-[#DEF767] border-[#DEF767]/30" : "text-[#5b5b5b] border-[#2e2e2e]"
                        }`}>
                        {event.status}
                    </span>
                </div>
                <div className={`h-8 w-8 rounded-full grid place-items-center border transition-all ${isLocked ? "border-[#2e2e2e]" : "border-[#5b5b5b] group-hover:border-[#DEF767] group-hover:bg-[#DEF767] group-hover:text-[#171717]"
                    }`}>
                    <Play size={12} fill={!isLocked ? "currentColor" : "none"} />
                </div>
            </div>

            {/* Visual Accents */}
            <div className="absolute left-0 top-0 bottom-0 w-[2px] bg-[#DEF767] scale-y-0 group-hover:scale-y-100 transition-transform origin-top duration-500" />
        </motion.div>
    );
}
