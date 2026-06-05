"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Radio, Gamepad2, MessageCircle, User, Users, Activity, Gem, Layers } from "lucide-react";
import { gql } from "@apollo/client";
import { useQuery } from "@apollo/client/react";
import { AnimatedBanner } from "@/components/AnimatedBanner";
import { useAuth } from "@/context/token-context";
import { useEffect, useState } from "react";

const BANNER_SUBSCRIPTION = gql`
    query GetLiveBanner {
        banner_by_pk(id: 1) { data }
    }
`;

export default function DashboardPage() {
    const router = useRouter();
    const auth = useAuth();

    const [joinCode, setJoinCode] = useState('');
    const [roomError, setRoomError] = useState('');
    const [isRoomLoading, setIsRoomLoading] = useState(false);

    // Guard route against anonymous access vectors
    useEffect(() => {
        if (typeof window !== "undefined" && !auth.getJwt()) {
            router.push("/login");
        }
    }, [auth, router]);

    const { data } = useQuery<{ banner_by_pk: { data: any } }>(BANNER_SUBSCRIPTION);
    const bannerConfig = data?.banner_by_pk?.data;

    async function createRoom() {
        setIsRoomLoading(true);
        setRoomError('');
        try {
            const token = auth.getJwt();
            const headers: Record<string, string> = { 'Content-Type': 'application/json' };
            if (token) headers['Authorization'] = `Bearer ${token}`;

            const res = await fetch('/api/multiplayer/create', {
                method: 'POST',
                headers,
                body: JSON.stringify({ gameId: 'persona-flow' })
            });

            const data = await res.json();
            console.log("data", data)
            console.log(
                token,
                //host_user_id,
                //game_id,
                //code
            )
            if (res.ok && data.room) {
                localStorage.setItem('active-room-code', data.room.code);
                router.push(`/room/${data.room.code}`);
            } else {
                setRoomError(data.error ?? 'Failed to create room channel');
            }
        } catch (err) {
            setRoomError('Network execution timeout.');
        } finally {
            setIsRoomLoading(false);
        }
    }

    async function joinRoom() {
        if (joinCode.trim().length !== 6) return;
        setIsRoomLoading(true);
        setRoomError('');
        try {
            const token = auth.getJwt();
            const headers: Record<string, string> = { 'Content-Type': 'application/json' };
            if (token) headers['Authorization'] = `Bearer ${token}`;

            const res = await fetch('/api/multiplayer/join', {
                method: 'POST',
                headers,
                body: JSON.stringify({ code: joinCode.trim().toUpperCase() }),
            });
            console.log("res", res)

            const data = await res.json();
            console.log("data", data)
            if (res.ok && data.code) {
                localStorage.setItem('active-room-code', data.code);
                router.push(`/room/${data.code}`);
            } else {
                setRoomError(data.error ?? 'Validation failed for coordinate key');
            }
        } catch (err) {
            setRoomError('Synchronization pipeline mismatch.');
        } finally {
            setIsRoomLoading(false);
        }
    }

    return (
        <main className="relative flex min-h-screen flex-col overflow-hidden bg-[#181818] text-white">
            <header className="relative z-20 flex shrink-0 items-center justify-between border-b border-[#2e2e2e] bg-[#181818]/95 px-5 py-4">
                <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-[#929292]">UXISM<span className="text-[#5b5b5b]">/</span>TOPOLOGY</p>
                <Link href="/profile" className="grid h-10 w-10 place-items-center rounded-[24px] border border-[#5b5b5b] text-[#929292]"><User size={18} /></Link>
            </header>

            {/* Live Banner Metrics Frame */}
            <section className="relative z-10 flex flex-col items-center justify-center px-5 pt-8 w-full max-w-5xl mx-auto">
                {bannerConfig && bannerConfig.text ? (
                    <div className="w-full border border-[#2e2e2e] bg-[#171717]/80 p-6 flex flex-col items-center">
                        <div style={{ fontFamily: "var(--font-mono)", fontSize: "11px", color: "#DEF767", letterSpacing: "0.25em", marginBottom: "16px" }}>
                            [ {bannerConfig.subHeader || "LIVE RUNNING BROADCAST"} ]
                        </div>
                        <AnimatedBanner text={bannerConfig.text} effect={bannerConfig.effect} speed={bannerConfig.speed} blurStrength={bannerConfig.blurStrength} font={bannerConfig.font} fontSize={bannerConfig.mainFontSize} repeat={bannerConfig.repeat} color={bannerConfig.color} />
                    </div>
                ) : (
                    <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-[#5b5b5b]">SYNCING SYSTEM ENGINE DATA...</p>
                )}
            </section>

            {/* Stream Gateway Interface Blocks */}
            <section className="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-6 px-5 pb-28 pt-6 w-full max-w-5xl mx-auto">
                <div className="border border-[#2e2e2e] bg-[#171717]/70 p-5 text-center flex flex-col justify-between">
                    <div>
                        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#5b5b5b] mb-2">TRANSMITTER LINK</p>
                        <h3 className="font-sans text-lg uppercase tracking-[0.04em] mb-2">Host New Session</h3>
                        <p className="text-[12px] text-[#929292] mb-6 leading-5">Initialize a room framework channel on local host context definitions.</p>
                    </div>
                    <button onClick={createRoom} disabled={isRoomLoading} className="w-full border border-[rgba(222,247,103,0.5)] bg-[#181818] font-mono text-[11px] uppercase tracking-[0.14em] text-[#DEF767] py-3.5">
                        {isRoomLoading ? 'Deploying...' : 'Deploy Room Channel'}
                    </button>
                </div>

                <div className="border border-[#2e2e2e] bg-[#171717]/70 p-5 text-center flex flex-col justify-between">
                    <div>
                        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#5b5b5b] mb-2">RECEIVER LINK</p>
                        <h3 className="font-sans text-lg uppercase tracking-[0.04em] mb-2">Sync Existing Room</h3>
                        <p className="text-[12px] text-[#929292] mb-6 leading-5">Enter 6-character room matrix identity hash code keys directly.</p>
                    </div>
                    <div className="space-y-4">
                        <input type="text" value={joinCode} onChange={(e) => setJoinCode(e.target.value.toUpperCase())} placeholder="ROOM KEY" maxLength={6} className="w-full border border-[#2e2e2e] bg-[#181818] py-3 text-center font-mono font-bold tracking-[0.2em]" />
                        <button onClick={joinRoom} disabled={isRoomLoading || joinCode.trim().length !== 6} className="w-full border border-[rgba(222,247,103,0.5)] bg-[#181818] font-mono text-[11px] uppercase tracking-[0.14em] text-[#DEF767] py-3.5">
                            Sync Session Channel
                        </button>
                    </div>
                </div>
            </section>

            {/* Footer Navigation bar layout definitions */}
            <nav className="fixed bottom-0 left-0 right-0 z-20 border-t border-[#2e2e2e] bg-[#181818]/95 h-16 flex items-center justify-around font-mono text-[10px]">
                <button onClick={() => router.push("/myteam")} className="flex flex-col items-center text-[#FFFFFF]"> <Users size={16} /> TEAM </button>
                <Link href="/x" className="flex flex-col items-center text-[#FFFFFF]"><Gem size={16} />Playground</Link>
                <Link href="/games" className="flex flex-col items-center text-[#FFFFFF]"><Gamepad2 size={16} />GAMES LOUNGE</Link>
                <Link href="/live" className="flex flex-col items-center text-[#FFFFFF]"><MessageCircle size={16} />LIVE STREAM</Link>
            </nav>
        </main>
    );
}    
