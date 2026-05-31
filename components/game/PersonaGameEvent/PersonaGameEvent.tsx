"use client";

import React, { useEffect, useState } from "react";
import { useQuery } from "@apollo/client/react";
import { useRouter } from "next/navigation";
import { GET_USER_CLAIM } from "@/lib/GameRules/game-queries";

// Auth & Game Store Integration
import { useAuth } from "@/context/token-context";
import { GameProvider, useGame } from "@/store/gameStore";

// Game Phase Components
import DomainSelect from "@/components/onboarding/DomainSelect/DomainSelect";
import PersonaSelect from "@/components/onboarding/PersonaSelect/PersonaSelect";
import GameBoard from "@/components/game/GameBoard/GameBoard";
import Leaderboard from "@/components/views/Leaderboard/Leaderboard";
import { ArrowLeft } from "lucide-react";

function GameOrchestrator({ onBack }: { onBack: () => void }) {
    const { state, dispatch } = useGame();
    const { getData } = useAuth();
    const router = useRouter();
    const [isInitializing, setIsInitializing] = useState(true);

    const userPayload = getData();
    // const userId = userPayload?.sub;
    const userId = userPayload?.sub || (userPayload as any)?.["https://hasura.io/jwt/claims"]?.["x-hasura-user-id"];
    const { data: claimData, loading: claimLoading } = useQuery<{ personas: any[] }>(GET_USER_CLAIM, {
        variables: { userId },
        skip: !userId,
    });

    useEffect(() => {
        if (claimData?.personas && claimData.personas.length > 0) {
            router.push("/dashboard");
            return;
        }

        if (state.gamePhase === "USER_SELECT") {
            if (userPayload && userId) {
            console.log("userPayload in personaGameEvent", userPayload)
            console.log("userPayload.id in personaGameEvent", userPayload.id)
                dispatch({
                    type: "SET_USER",
                    payload: {
                        // id: userPayload.id || "fuckkk",
                        id: String(userId),
                        username: (userPayload.name as string) || "Authorized Fuuckk Player",
                        teamName: "Sololofuckk"
                    }
                });
                dispatch({ type: "GO_TO_PHASE", payload: "DOMAIN_SELECT" });
            }
        }

        if (!claimLoading) {
            setTimeout(() => setIsInitializing(false), 100);
        }
    }, [userPayload, state.gamePhase, dispatch, claimData, claimLoading, router]);

    if (isInitializing || claimLoading) {
        return (
            <div className="flex-1 flex items-center justify-center font-mono text-[11px] uppercase tracking-[0.14em] text-[#5b5b5b]">
                Syncing Neural Link...
            </div>
        );
    }

    if (state.gamePhase === "USER_SELECT") {
        return (
            <div className="flex-1 flex flex-col items-center justify-center text-center px-5">
                <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-[#ff6a6a] mb-4">
                    Access Denied: Unauthenticated
                </p>
                <h2 className="font-serif text-2xl uppercase text-white mb-6">
                    Identity Not Found
                </h2>
                <a
                    href="/login"
                    className="border border-[#2e2e2e] bg-[#171717] px-6 py-3 font-mono text-[11px] uppercase tracking-[0.14em] text-[#929292] hover:border-[#DEF767] hover:text-[#DEF767] transition-colors"
                >
                    Return to Login
                </a>
            </div>
        );
    }

    return (
        <div className="relative z-20 flex-1 w-full flex flex-col">
            {/* Back to Events Navigation - Only show on Domain Select */}
            {state.gamePhase === "DOMAIN_SELECT" && (
                <div className="px-6 pt-8 sm:px-12">
                    <button 
                        onClick={onBack}
                        className="flex items-center gap-2 text-[#5b5b5b] hover:text-white font-mono text-[10px] uppercase tracking-widest transition-colors"
                    >
                        <ArrowLeft size={14} />
                        Back to Hub
                    </button>
                </div>
            )}

            {state.gamePhase === "DOMAIN_SELECT" && <DomainSelect />}
            {state.gamePhase === "PERSONA_SELECT" && <PersonaSelect />}
            {(state.gamePhase === "PLAYING" ||
                state.gamePhase === "WON" ||
                state.gamePhase === "PERSONA_TAKEN") && <GameBoard />}
        </div>
    );
}

export default function PersonaGameEvent({ onBack }: { onBack: () => void }) {
    return (
        <GameProvider>
            <GameOrchestrator onBack={onBack} />
        </GameProvider>
    );
}
