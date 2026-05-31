// "use client";

// import Link from "next/link";
// import { usePathname, useRouter } from "next/navigation";
// import { Gavel, Radio, Gamepad2, MessageCircle, User, Users, Activity, Gem } from "lucide-react";
// import { gql } from "@apollo/client";
// import { useQuery } from "@apollo/client/react";
// import { AnimatedBanner } from "@/components/AnimatedBanner";
// import { useAuth } from "@/context/token-context";
// import { useEffect, useState } from "react";

// // 1. Subscription to listen for the live banner config
// const BANNER_SUBSCRIPTION = gql`
//     query GetLiveBanner {
//         banner_by_pk(id: 1) {
//             data
//         }
//     }
// `;

// export default function DashboardPage() {
//     const pathname = usePathname();
//     const router = useRouter();
//     const auth = useAuth();
    
//     // Existing State
//     const [activeRoomCode, setActiveRoomCode] = useState<string | null>(null);
    
//     // NEW Multiplayer Room State
//     const [joinCode, setJoinCode] = useState('');
//     const [roomError, setRoomError] = useState('');
//     const [isRoomLoading, setIsRoomLoading] = useState(false);

//     const bottomNavItems = [
//         { label: "My Team", href: "/myteam", icon: Users, enabled: true },
//         { label: "X", href: null, icon: Gem, enabled: false },
//         { label: "Games", href: "/games", icon: Gamepad2, enabled: true },
//         { label: "Live Chat", href: "/live", icon: MessageCircle, enabled: true },
//         { label: "Room", href: activeRoomCode ? `/room/${activeRoomCode}` : "/", icon: Radio, enabled: true },
//     ];

//     // Auth Protection
//     useEffect(() => {
//         if (typeof window !== "undefined" && !auth.getJwt()) {
//             router.push("/login");
//         }
//     }, [auth, router]);

//     // Active Room Tracking
//     useEffect(() => {
//         const roomMatch = pathname?.match(/^\/room\/([A-Z0-9]+)/i);
//         if (roomMatch) {
//             const code = roomMatch[1].toUpperCase();
//             setActiveRoomCode(code);
//             localStorage.setItem('active-room-code', code);
//         } else {
//             const saved = localStorage.getItem('active-room-code');
//             if (saved) {
//                 setActiveRoomCode(saved);
//             }
//         }
//     }, [pathname]);

//     // Fetch the live data via WebSocket
//     const { data, loading, error } = useQuery<{ banner_by_pk: { data: any } }>(BANNER_SUBSCRIPTION);
//     const bannerConfig = data?.banner_by_pk?.data;
//     console.log("data:", data);
//     console.log("loading:", loading);
//     console.log("error:", error);
//     console.log("banner config:", bannerConfig);

//     // --- MULTIPLAYER LOGIC ---

//     async function createRoom() {
//         setIsRoomLoading(true)
//         setRoomError('')
//         try {
//             const token = auth.getJwt()
//             const headers: Record<string, string> = {
//                 'Content-Type': 'application/json'
//             }
//             if (token) {
//                 headers['Authorization'] = `Bearer ${token}`
//             }

//             const res = await fetch('/api/multiplayer/create', { 
//                 method: 'POST',
//                 headers,
//                 body: JSON.stringify({ gameId: 'chimp' }) // Default game to chimp
//             })
            
//             const data = await res.json()
//             if (res.ok && data.room) {
//                 router.push(`/room/${data.room.code}`)
//             } else {
//                 setRoomError(data.error ?? 'Failed to create room')
//                 setIsRoomLoading(false)
//             }
//         } catch (err) {
//             console.error(err)
//             setRoomError('A network error occurred while creating the room.')
//             setIsRoomLoading(false)
//         }
//     }

//     async function joinRoom() {
//         if (!joinCode.trim()) return
//         setIsRoomLoading(true)
//         setRoomError('')
//         try {
//             const token = auth.getJwt()
//             const headers: Record<string, string> = {
//                 'Content-Type': 'application/json'
//             }
//             if (token) {
//                 headers['Authorization'] = `Bearer ${token}`
//             }

//             const res = await fetch('/api/multiplayer/join', {
//                 method: 'POST',
//                 headers,
//                 body: JSON.stringify({ code: joinCode.trim().toUpperCase() }),
//             })
            
//             const data = await res.json()
//             if (res.ok && data.code) {
//                 router.push(`/room/${data.code}`)
//             } else {
//                 setRoomError(data.error ?? 'Failed to join room')
//                 setIsRoomLoading(false)
//             }
//         } catch (err) {
//             console.error(err)
//             setRoomError('A network error occurred while joining the room.')
//             setIsRoomLoading(false)
//         }
//     }

//     return (
//         <main className="relative flex min-h-screen flex-col overflow-hidden bg-[#181818] text-white selection:bg-[#ff6a6a] selection:text-[#171717]">
//             <div className="pointer-events-none fixed inset-0 opacity-25 [background-image:radial-gradient(#5b5b5b_1px,transparent_1px)] [background-size:18px_18px]" />

//             <header className="relative z-20 flex shrink-0 items-center justify-between border-b border-[#2e2e2e] bg-[#181818]/95 px-5 py-4 backdrop-blur-[2px]">
//                 <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-[#929292] sm:text-[12px]">
//                     UXISM<span className="text-[#5b5b5b]">/</span>UXATHON
//                 </p>

//                 <Link href="/profile" aria-label="Open profile" className="grid h-10 w-10 place-items-center rounded-[24px] border border-[#5b5b5b] bg-[#181818] text-[#929292] active:border-[rgba(222,247,103,0.5)] active:text-[#DEF767]">
//                     <User size={18} aria-hidden />
//                 </Link>
//             </header>

//             {/* Live Banner Section */}
//             <section className="relative z-10 flex flex-col items-center justify-center px-5 pt-8 w-full max-w-5xl mx-auto">
//                 {bannerConfig && bannerConfig.text ? (
//                     <div className="w-full border border-[#2e2e2e] bg-[#171717]/80 backdrop-blur-sm p-6 sm:p-10 flex flex-col items-center">
//                         <div
//                             style={{
//                                 fontFamily: "var(--font-mono)",
//                                 fontSize: bannerConfig.subHeaderFontSize ? `${bannerConfig.subHeaderFontSize}px` : "11px",
//                                 color: "#DEF767",
//                                 letterSpacing: "0.25em",
//                                 marginBottom: "16px",
//                                 fontWeight: "bold",
//                             }}
//                         >
//                             [ {bannerConfig.subHeader || "LIVE BROADCAST"} ]
//                         </div>

//                         <div className="w-full">
//                             <AnimatedBanner
//                                 text={bannerConfig.text}
//                                 effect={bannerConfig.effect}
//                                 speed={bannerConfig.speed}
//                                 blurStrength={bannerConfig.blurStrength}
//                                 font={bannerConfig.font}
//                                 fontSize={bannerConfig.mainFontSize}
//                                 repeat={bannerConfig.repeat}
//                                 color={bannerConfig.color}
//                             />
//                         </div>

//                         <div className="flex flex-wrap justify-center items-center gap-4 sm:gap-8 mt-6 font-mono text-[10px] sm:text-[11px] text-[#929292] uppercase">
//                             <div className="flex items-center gap-2">
//                                 <Activity size={12} className="text-[#DEF767]" />
//                                 {bannerConfig.footer1Label || "STATUS"}: <span className="text-[#DEF767] font-bold">{bannerConfig.footer1Value || "ACTIVE"}</span>
//                             </div>
//                             <div className="hidden sm:block">•</div>
//                             <div>
//                                 {bannerConfig.footer2Label || "NODE"}: <span className="text-[#DEF767] font-bold">{bannerConfig.footer2Value || "SYNCED"}</span>
//                             </div>
//                         </div>
//                     </div>
//                 ) : (
//                     <p className="max-w-[22ch] text-center font-mono text-[11px] uppercase leading-[1.6] tracking-[0.14em] text-[#5b5b5b] sm:text-[12px]">{loading ? "SYNCING TELEMETRY..." : "UXATHON'26"}</p>
//                 )}
//             </section>

//             {/* Multiplayer Room Section (Host & Join) */}
//             <section className="relative z-10 flex flex-col md:flex-row gap-6 px-5 pb-28 pt-6 w-full max-w-5xl mx-auto">
                
//                 {/* Host Session block */}
//                 <div className="flex-1 border border-[#2e2e2e] bg-[#171717]/70 p-5 text-center flex flex-col justify-between">
//                     <div>
//                         <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#5b5b5b] mb-2">SIGNAL TRANSMITTER</p>
//                         <h3 className="font-sans text-lg uppercase tracking-[0.04em] text-white mb-2">Host New Session</h3>
//                         <p className="text-[12px] text-[#929292] mb-6 leading-5 max-w-[28ch] mx-auto">
//                             Initialize a sandbox room channel and invite peers via signal key.
//                         </p>
//                     </div>
//                     <button
//                         id="btn-create-room"
//                         onClick={createRoom}
//                         disabled={isRoomLoading}
//                         className="w-full border border-[rgba(222,247,103,0.5)] bg-[#181818] font-mono text-[11px] uppercase tracking-[0.14em] text-[#DEF767] py-3.5 active:border-[#ff6a6a] active:bg-[#ff6a6a] active:text-[#171717] disabled:opacity-30 disabled:cursor-not-allowed transition-all mt-auto"
//                     >
//                         {isRoomLoading ? 'Initializing Stream...' : 'Deploy Room Channel'}
//                     </button>
//                 </div>

//                 {/* Join Session block */}
//                 <div className="flex-1 border border-[#2e2e2e] bg-[#171717]/70 p-5 text-center flex flex-col justify-between">
//                     <div>
//                         <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#5b5b5b] mb-2">SIGNAL RECEIVER</p>
//                         <h3 className="font-sans text-lg uppercase tracking-[0.04em] text-white mb-2">Sync Existing Room</h3>
//                         <p className="text-[12px] text-[#929292] mb-6 leading-5 max-w-[28ch] mx-auto">
//                             Enter the 6-character room coordinate key to connect.
//                         </p>
//                     </div>

//                     <div className="space-y-4 mt-auto">
//                         <input
//                             id="input-room-code"
//                             type="text"
//                             value={joinCode}
//                             onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
//                             placeholder="ROOM CODE"
//                             maxLength={6}
//                             disabled={isRoomLoading}
//                             className="w-full border border-[#2e2e2e] bg-[#181818] px-4 py-3 font-mono text-lg text-center text-white placeholder-[#5b5b5b] focus:outline-none focus:border-[#DEF767] transition-colors uppercase tracking-[0.2em] font-bold"
//                         />

//                         <button
//                             id="btn-join-room"
//                             onClick={joinRoom}
//                             disabled={isRoomLoading || joinCode.trim().length !== 6}
//                             className="w-full border border-[rgba(222,247,103,0.5)] bg-[#181818] font-mono text-[11px] uppercase tracking-[0.14em] text-[#DEF767] py-3.5 active:border-[#ff6a6a] active:bg-[#ff6a6a] active:text-[#171717] disabled:opacity-30 disabled:cursor-not-allowed transition-all"
//                         >
//                             {isRoomLoading ? 'Connecting Channel...' : 'Sync Session'}
//                         </button>

//                         {roomError && (
//                             <div className="border border-[#ff6a6a]/30 bg-[#ff6a6a]/5 text-[#ff6a6a] font-mono text-[10px] uppercase tracking-[0.1em] py-2 px-3">
//                                 Error: {roomError}
//                             </div>
//                         )}
//                     </div>
//                 </div>

//             </section>

//             <nav aria-label="Dashboard navigation" className="fixed bottom-0 left-0 right-0 z-20 border-t border-[#2e2e2e] bg-[#181818]/95 backdrop-blur-[2px] pb-[max(0.75rem,env(safe-area-inset-bottom))]">
//                 <ul className="grid grid-cols-5" style={{ display: "grid", gridTemplateColumns: "repeat(5, minmax(0, 1fr))" }}>
//                     {bottomNavItems.map((item) => {
//                         const Icon = item.icon;
//                         const isActive = 
//                             item.href && 
//                             (pathname === item.href || 
//                              (item.label === "Room" && pathname?.startsWith("/room/")));

//                         if (!item.enabled) {
//                             return (
//                                 <li key={item.label} className="border-r border-[#2e2e2e] last:border-r-0 -mr-[1px]">
//                                     <span className="flex flex-col items-center justify-center gap-1 h-[64px] text-[#5b5b5b] cursor-not-allowed" aria-disabled="true">
//                                         <Icon size={16} aria-hidden />
//                                         <span className="font-mono text-[8px] uppercase tracking-[0.12em] sm:text-[9px]">{item.label}</span>
//                                     </span>
//                                 </li>
//                             );
//                         }

//                         return (
//                             <li key={item.label} className="border-r border-[#2e2e2e] last:border-r-0 -mr-[1px]">
//                                 <Link
//                                     href={item.href!}
//                                     className={`flex flex-col items-center justify-center gap-1 h-[64px] transition-colors ${
//                                         isActive
//                                             ? "bg-[#ff6a6a] text-[#171717]"
//                                             : "text-[#929292] hover:text-white active:bg-[#DEF767] active:text-[#171717]"
//                                     }`}
//                                     aria-current={isActive ? "page" : undefined}
//                                 >
//                                     <Icon
//                                         size={16}
//                                         aria-hidden
//                                         className="transition-transform duration-200"
//                                         style={{ transform: isActive ? "rotate(45deg)" : "none" }}
//                                     />
//                                     <span className="font-mono text-[8px] uppercase tracking-[0.12em] sm:text-[9px]">{item.label}</span>
//                                 </Link>
//                             </li>
//                         );
//                     })}
//                 </ul>
//             </nav>
//         </main>
//     );
// }






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
                body: JSON.stringify({ gameId: 'chimp' }) 
            });
            
            const data = await res.json();
            console.log("data",data)
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
                <button onClick={() => router.push("/myteam")} className="flex flex-col items-center text-[#FFFFFF]"> <Users size={16}/> TEAM </button>
                <Link href="/games" className="flex flex-col items-center text-[#FFFFFF]"><Gamepad2 size={16}/>GAMES LOUNGE</Link>
                <Link href="/live" className="flex flex-col items-center text-[#FFFFFF]"><MessageCircle size={16}/>LIVE STREAM</Link>
                <Link href="/x" className="flex flex-col items-center text-[#FFFFFF]"><MessageCircle size={16}/>X</Link>
            </nav>
        </main>
    );
}    
