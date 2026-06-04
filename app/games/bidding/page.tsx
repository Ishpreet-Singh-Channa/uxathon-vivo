// "use client";

// import { GameShell, GamePanel } from "../_components/GameShell";

// export default function BiddingPage() {
//   return (
//     <GameShell
//       meta="UXATHON / MAIN GAME / BIDDING"
//       title="Bidding"
//       description="This main game mode is reserved for the bidding flow."
//     >
//       <GamePanel className="text-center">
//         <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-[#929292]">
//           Bidding module placeholder. Build logic here next.
//         </p>
//       </GamePanel>
//     </GameShell>
//   );
// }





"use client";

import React, { useMemo, useState } from "react";
import {
  Gavel,
  Trophy,
  Users,
  Radio,
  Coins,
  UserRound,
  Sparkles,
  Joystick,
  Zap,
  Crown,
} from "lucide-react";
import { GamePanel, GameShell } from "../_components/GameShell";

type BiddingPageProps = {
  isMultiplayer?: boolean;
  roomId?: string;
  roomCode?: string;
  gameState?: any;
  updateGameState?: (state: any) => Promise<void>;
  players?: any[];
  userId?: string | null;
  isHost?: boolean;
};

type ApiAction = "start" | "draw" | "bid" | "close";

function formatTokens(value: number | string | null | undefined) {
  const numberValue = Number(value || 0);
  return numberValue.toLocaleString("en-IN");
}

// image
function getProfileImageUrl(value: string | null | undefined) {
  if (!value) return null

  if (
    value.startsWith('http://') ||
    value.startsWith('https://') ||
    value.startsWith('data:') ||
    value.startsWith('blob:')
  ) {
    return value
  }

  if (value.startsWith('/')) {
    return value
  }

  return `/${value}`
}

function getProfilePicture(person: any) {
  return getProfileImageUrl(
    person?.profilePicture ||
      person?.profile_picture ||
      person?.user?.profile_picture ||
      null
  )
}

function getInitials(name: string | null | undefined) {
  const safeName = name || 'User'

  return safeName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('') || 'U'
}
// image

function getJwt() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("jwt-token");
}

async function callBiddingApi(action: ApiAction, body: Record<string, any>) {
  const token = getJwt();

  const res = await fetch(`/api/bidding/${action}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data.error || `Failed to run bidding action: ${action}`);
  }

  return data;
}

export default function BiddingPage(props: BiddingPageProps) {
  const {
    isMultiplayer = false,
    roomCode,
    gameState,
    players = [],
    userId,
    isHost = false,
  } = props;

  const bidding = gameState?.bidding;

  const myLeader = userId && bidding?.leaders ? bidding.leaders[userId] : null;
  const isLeader = !!myLeader;
  const currentNominee = bidding?.currentNominee;
  const currentBid = bidding?.currentBid;

  const [startingTokens, setStartingTokens] = useState(1_000_000);
  const [minIncrement, setMinIncrement] = useState(50_000);
  const [bidAmount, setBidAmount] = useState("");
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const soldToMe = useMemo(() => {
    if (!userId || !Array.isArray(bidding?.sold)) return null;

    return bidding.sold.find((record: any) => record.userId === userId) || null;
  }, [bidding?.sold, userId]);

  const amCurrentNominee = currentNominee?.userId === userId;

  const leadersList = useMemo(() => {
    if (!bidding?.leaders) return [];
    return Object.values(bidding.leaders) as any[];
  }, [bidding?.leaders]);

  const entries = Array.isArray(bidding?.entries) ? bidding.entries : [];
  const sold = Array.isArray(bidding?.sold) ? bidding.sold : [];
  const logs = Array.isArray(bidding?.logs) ? bidding.logs : [];

  const currentRequiredBid = Number(currentBid?.amount || 0) + Number(bidding?.minIncrement || minIncrement);

  async function runAction(action: ApiAction, body: Record<string, any>) {
    if (!roomCode) {
      setError("Room code missing. Open bidding from an active room.");
      return;
    }

    setIsBusy(true);
    setError(null);

    try {
      await callBiddingApi(action, {
        code: roomCode,
        ...body,
      });
    } catch (err: any) {
      setError(err.message || "Bidding action failed.");
      return null;
    } finally {
      setIsBusy(false);
    }
  }

  async function startBidding() {
    await runAction("start", {
      startingTokens,
      minIncrement,
    });
  }

  async function drawMember() {
    return await runAction("draw", {});
  }

  async function placeBid(amount?: number) {
    const finalAmount = Number(amount ?? bidAmount);

    if (!Number.isFinite(finalAmount) || finalAmount <= 0) {
      setError("Enter a valid bid amount.");
      return;
    }

    await runAction("bid", {
      amount: finalAmount,
    });

    setBidAmount("");
  }

  async function closeBid() {
    return await runAction("close", {});
  }

  if (!isMultiplayer) {
    return (
      <GameShell
        meta="UXATHON / MAIN GAME / BIDDING"
        title="Bidding"
        description="This game is designed for multiplayer room sessions."
      >
        <GamePanel className="text-center space-y-4">
          <Gavel className="mx-auto text-[#DEF767]" size={32} />
          <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-[#929292]">
            Open this game from an active room after Persona Flow.
          </p>
        </GamePanel>
      </GameShell>
    );
  }

  return (
    <div className={`space-y-5 ${isHost ? "w-full" : ""}`}>
    <section className="mx-auto w-full max-w-[1600px] border border-[#2e2e2e] bg-[#171717]/70 p-4 sm:p-5 lg:p-6">        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#5b5b5b]">
              UXATHON / BIDDING / ROOM {roomCode || "UNKNOWN"}
            </p>
            <h2 className="mt-2 font-sans text-2xl uppercase tracking-[0.04em] text-white">
              Bidding Arena
            </h2>
            <p className="mt-2 text-[12px] leading-5 text-[#929292]">
              Leaders bid tokens on available members. Winning bids assign members into the leader&apos;s team.
            </p>
          </div>

          <div className="shrink-0 border border-[#2e2e2e] px-3 py-2 text-right">
            <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-[#5b5b5b]">Phase</p>
            <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.14em] text-[#DEF767]">
              {bidding?.phase || "not started"}
            </p>
          </div>
        </div>

        {error && (
          <div className="mt-4 border border-[#ff6a6a]/40 bg-[#ff6a6a]/10 px-3 py-2 font-mono text-[10px] uppercase tracking-[0.1em] text-[#ff6a6a]">
            {error}
          </div>
        )}
      </section>

      {!bidding ? (
        <NotStartedPanel
          isHost={isHost}
          startingTokens={startingTokens}
          setStartingTokens={setStartingTokens}
          minIncrement={minIncrement}
          setMinIncrement={setMinIncrement}
          isBusy={isBusy}
          onStart={startBidding}
          playerCount={players.length}
        />
      ) : (
        <>
          {isHost ? (
          <HostJackpotStage
            bidding={bidding}
            currentNominee={currentNominee}
            currentBid={currentBid}
            entries={entries}
            isBusy={isBusy}
            onDraw={drawMember}
            onClose={closeBid}
          />
        ) : (
          <CurrentAuctionPanel
            currentNominee={currentNominee}
            currentBid={currentBid}
            bidding={bidding}
            amCurrentNominee={amCurrentNominee}
            soldToMe={soldToMe}
          />
        )}

        {isHost ? null : isLeader ? (
            <LeaderControls
              myLeader={myLeader}
              currentBid={currentBid}
              currentNominee={currentNominee}
              bidAmount={bidAmount}
              setBidAmount={setBidAmount}
              currentRequiredBid={currentRequiredBid}
              isBusy={isBusy}
              onPlaceBid={placeBid}
            />
          ) : (
            <SpectatorPanel
              amCurrentNominee={amCurrentNominee}
              soldToMe={soldToMe}
              currentNominee={currentNominee}
            />
          )}

          <LeaderBoard leaders={leadersList} currentLeaderId={currentBid?.leaderUserId} />

          <BiddingStats entries={entries} sold={sold} />

          <BidLogs logs={logs} />
        </>
      )}
    </div>
  );
}

function NotStartedPanel({
  isHost,
  startingTokens,
  setStartingTokens,
  minIncrement,
  setMinIncrement,
  isBusy,
  onStart,
  playerCount,
}: {
  isHost: boolean;
  startingTokens: number;
  setStartingTokens: (value: number) => void;
  minIncrement: number;
  setMinIncrement: (value: number) => void;
  isBusy: boolean;
  onStart: () => void;
  playerCount: number;
}) {
  return (
    <GamePanel className="space-y-5">
      <div className="text-center">
        <Sparkles className="mx-auto text-[#DEF767]" size={30} />
        <h3 className="mt-3 font-sans text-xl uppercase tracking-[0.04em]">Bidding Not Initialized</h3>
        <p className="mt-2 text-[12px] leading-5 text-[#929292]">
          {isHost
            ? "Initialize wallets and build the auction pool from non-leader room members."
            : "Waiting for the host to initialize the bidding session."}
        </p>
      </div>

      {isHost && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="block border border-[#2e2e2e] bg-[#181818] p-3">
              <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-[#5b5b5b]">
                Starting Tokens
              </span>
              <input
                type="number"
                value={startingTokens}
                onChange={(event) => setStartingTokens(Number(event.target.value))}
                className="mt-2 w-full bg-transparent font-mono text-sm text-white outline-none"
              />
            </label>

            <label className="block border border-[#2e2e2e] bg-[#181818] p-3">
              <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-[#5b5b5b]">
                Min Increment
              </span>
              <input
                type="number"
                value={minIncrement}
                onChange={(event) => setMinIncrement(Number(event.target.value))}
                className="mt-2 w-full bg-transparent font-mono text-sm text-white outline-none"
              />
            </label>
          </div>

          <button
            type="button"
            disabled={isBusy}
            onClick={onStart}
            className="w-full border border-[rgba(222,247,103,0.5)] bg-[#181818] py-3.5 font-mono text-[11px] uppercase tracking-[0.14em] text-[#DEF767] disabled:opacity-50"
          >
            {isBusy ? "Initializing..." : `Initialize Bidding for ${playerCount} Room Players`}
          </button>
        </div>
      )}
    </GamePanel>
  );
}

function CurrentAuctionPanel({
  currentNominee,
  currentBid,
  bidding,
  amCurrentNominee,
  soldToMe,
}: {
  currentNominee: any;
  currentBid: any;
  bidding: any;
  amCurrentNominee: boolean;
  soldToMe: any;
}) {
  return (
    <section className="border border-[#2e2e2e] bg-[#171717]/70 p-4">
      {amCurrentNominee && (
        <div className="mb-4 border border-[#DEF767]/40 bg-[#DEF767]/10 px-3 py-2 font-mono text-[10px] uppercase tracking-[0.12em] text-[#DEF767]">
          Your name has been drawn. Leaders are bidding for you now.
        </div>
      )}

      {soldToMe && (
        <div className="mb-4 border border-[#DEF767]/40 bg-[#DEF767]/10 px-3 py-2">
          <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-[#DEF767]">
            You are now part of {soldToMe.teamName}
          </p>
          <p className="mt-1 text-[12px] text-[#929292]">
            Your leader is {soldToMe.leaderName}. Coordinate and regroup with your team.
          </p>
        </div>
      )}

      <div className="flex items-center gap-2">
        <Radio size={15} className="text-[#ff6a6a]" />
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#5b5b5b]">
          Current Auction
        </p>
      </div>

      {currentNominee ? (
        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="border border-[#2e2e2e] bg-[#181818] p-4">
            <div className="flex items-center gap-4">
              {getProfilePicture(currentNominee) ? (
                <img
                  src={getProfilePicture(currentNominee)!}
                  alt={`${currentNominee.name || 'Member'} profile`}
                  className="h-16 w-16 rounded-full border border-[#2e2e2e] object-cover"
                />
              ) : (
                <div className="grid h-16 w-16 place-items-center rounded-full border border-[#2e2e2e] bg-[#181818] font-mono text-sm text-[#5b5b5b]">
                  {getInitials(currentNominee.name)}
                </div>
              )}

              <div>
                <h3 className="font-sans text-2xl uppercase tracking-[0.04em] text-white">
                  {currentNominee.name}
                </h3>
                <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.14em] text-[#5b5b5b]">
                  {currentNominee.affiliation || "Affiliation pending"}
                </p>
              </div>
            </div>

            <div className="mt-4">
              <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-[#5b5b5b]">Skills</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {Array.isArray(currentNominee.skills) && currentNominee.skills.length > 0 ? (
                  currentNominee.skills.map((skill: string) => (
                    <span
                      key={skill}
                      className="border border-[#2e2e2e] px-2 py-1 font-mono text-[9px] uppercase tracking-[0.1em] text-[#929292]"
                    >
                      {skill}
                    </span>
                  ))
                ) : (
                  <span className="text-[12px] text-[#5b5b5b]">No skills attached yet.</span>
                )}
              </div>
            </div>
          </div>

          <div className="border border-[#2e2e2e] bg-[#181818] p-4">
            <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-[#5b5b5b]">
              Current Highest Bid
            </p>
            <p className="mt-2 font-sans text-3xl uppercase tracking-[0.04em] text-[#DEF767]">
              {formatTokens(currentBid?.amount)}
            </p>
            <p className="mt-2 text-[12px] text-[#929292]">
              {currentBid?.leaderName
                ? `Highest bidder: ${currentBid.leaderName}`
                : "No bids yet."}
            </p>
            <p className="mt-4 font-mono text-[9px] uppercase tracking-[0.14em] text-[#5b5b5b]">
              Minimum next bid
            </p>
            <p className="mt-1 font-mono text-[12px] text-white">
              {formatTokens(Number(currentBid?.amount || 0) + Number(bidding?.minIncrement || 0))}
            </p>
          </div>
        </div>
      ) : (
        <div className="mt-4 border border-dashed border-[#2e2e2e] bg-[#181818]/60 p-6 text-center">
          <Gavel className="mx-auto text-[#5b5b5b]" size={30} />
          <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.14em] text-[#929292]">
            Waiting for host to draw the next member.
          </p>
        </div>
      )}
    </section>
  );
}


function HostJackpotStage({
  bidding,
  currentNominee,
  currentBid,
  entries,
  isBusy,
  onDraw,
  onClose,
}: {
  bidding: any;
  currentNominee: any;
  currentBid: any;
  entries: any[];
  isBusy: boolean;
  onDraw: () => Promise<any>;
  onClose: () => Promise<any>;
}) {
  const [isRolling, setIsRolling] = useState(false);
  const [leverPulled, setLeverPulled] = useState(false);
  const [previewName, setPreviewName] = useState<string | null>(null);

  const hasActiveAuction = bidding?.phase === "auction" && bidding?.currentNominee;

  const hasValidBid =
    Number(bidding?.currentBid?.amount || 0) > 0 &&
    !!bidding?.currentBid?.leaderUserId &&
    (!!bidding?.currentBid?.teamId ||
      !!bidding?.leaders?.[bidding?.currentBid?.leaderUserId]?.teamId);

  const availableEntries = useMemo(() => {
    return entries.filter((entry: any) => !entry.sold);
  }, [entries]);

  const reelNames = useMemo(() => {
    const names = availableEntries.map((entry: any) => entry.name || "Unnamed Member");

    if (names.length === 0) {
      return ["NO", "MEMBERS", "LEFT"];
    }

    while (names.length < 12) {
      names.push(...names);
    }

    return names.slice(0, 18);
  }, [availableEntries]);

  async function pullLever() {
    if (isBusy || isRolling || hasActiveAuction || bidding?.phase === "finished") return;

    setLeverPulled(true);
    setIsRolling(true);
    setPreviewName(null);

    const spinDuration = 2200;

    const previewTimer = window.setInterval(() => {
      const randomEntry = availableEntries[Math.floor(Math.random() * availableEntries.length)];
      setPreviewName(randomEntry?.name || "Searching...");
    }, 120);

    window.setTimeout(async () => {
      window.clearInterval(previewTimer);

      const result = await onDraw();
      const nominee = result?.nominee;

      if (nominee?.name) {
        setPreviewName(nominee.name);
      }

      setIsRolling(false);

      window.setTimeout(() => {
        setLeverPulled(false);
      }, 450);
    }, spinDuration);
  }

  const displayedNominee = currentNominee || (previewName ? { name: previewName } : null);

  return (
      <section className="relative mx-auto min-h-[calc(100vh-280px)] w-full max-w-[1600px] overflow-hidden border border-[#2e2e2e] bg-[#080808] p-3 sm:p-5 lg:p-6 xl:p-8">      <style jsx global>{`
        @keyframes jackpot-reel-roll {
          0% {
            transform: translateY(0);
          }
          100% {
            transform: translateY(-50%);
          }
        }

        @keyframes jackpot-glow-pulse {
          0%,
          100% {
            opacity: 0.45;
            transform: scale(1);
          }
          50% {
            opacity: 0.9;
            transform: scale(1.04);
          }
        }

        @keyframes jackpot-marquee {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-50%);
          }
        }
      `}</style>

      <div className="pointer-events-none absolute inset-0 opacity-30 [background-image:linear-gradient(rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.04)_1px,transparent_1px)] [background-size:28px_28px]" />
      <div className="pointer-events-none absolute left-1/2 top-[-160px] h-[420px] w-[420px] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,#DEF767,transparent_62%)] opacity-20 blur-3xl" />
      <div className="pointer-events-none absolute bottom-[-180px] right-[-120px] h-[360px] w-[360px] rounded-full bg-[radial-gradient(circle,#ff6a6a,transparent_60%)] opacity-20 blur-3xl" />

      <div className="relative z-10">
        <div className="mb-6 flex flex-col gap-3 border border-[#2e2e2e] bg-[#111]/90 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-[#DEF767]">
              Host Broadcast Machine
            </p>
            <h2 className="mt-1 font-sans text-2xl uppercase tracking-[0.04em] text-white sm:text-4xl">
              Member Jackpot Draw
            </h2>
          </div>

          <div className="grid grid-cols-3 gap-px border border-[#2e2e2e] bg-[#2e2e2e] text-center">
            <div className="bg-[#181818] px-4 py-2">
              <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-[#5b5b5b]">Pool</p>
              <p className="font-sans text-xl text-white">{entries.length}</p>
            </div>
            <div className="bg-[#181818] px-4 py-2">
              <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-[#5b5b5b]">Left</p>
              <p className="font-sans text-xl text-[#DEF767]">{availableEntries.length}</p>
            </div>
            <div className="bg-[#181818] px-4 py-2">
              <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-[#5b5b5b]">Phase</p>
              <p className="font-mono text-[11px] uppercase text-white">{bidding?.phase}</p>
            </div>
          </div>
        </div>

        <div className="grid gap-4 lg:gap-6 xl:grid-cols-[minmax(0,1fr)_180px] 2xl:grid-cols-[minmax(0,1fr)_220px]">
          <div className="relative min-h-[560px] border border-[#3a3a3a] bg-[#141414] p-4 shadow-[0_0_80px_rgba(222,247,103,0.08)] sm:p-6 lg:min-h-[640px] xl:min-h-[720px] 2xl:min-h-[780px]">            <div className="absolute inset-x-6 top-4 flex justify-between">
              {Array.from({ length: 9 }).map((_, index) => (
                <span
                  key={index}
                  className={`h-3 w-3 rounded-full border border-[#2e2e2e] ${
                    isRolling || currentNominee
                      ? "bg-[#DEF767] shadow-[0_0_18px_rgba(222,247,103,0.8)]"
                      : "bg-[#2e2e2e]"
                  }`}
                />
              ))}
            </div>

            <div className="mt-8 rounded-[28px] border border-[#2e2e2e] bg-[#090909] p-4 sm:p-6">
              <div className="mb-4 overflow-hidden border border-[#2e2e2e] bg-[#050505] py-2">
                <div
                  className="flex w-max gap-8 font-mono text-[10px] uppercase tracking-[0.2em] text-[#5b5b5b]"
                  style={{
                    animation: "jackpot-marquee 16s linear infinite",
                  }}
                >
                  <span>UXATHON AUCTION LIVE</span>
                  <span>PERSONA FLOW COMPLETE</span>
                  <span>TEAM DRAFT ACTIVE</span>
                  <span>UXATHON AUCTION LIVE</span>
                  <span>PERSONA FLOW COMPLETE</span>
                  <span>TEAM DRAFT ACTIVE</span>
                </div>
              </div>

              <div className="grid gap-3 sm:gap-4 lg:grid-cols-3">
                {[0, 1, 2].map((reel) => (
                  <div
                    key={reel}
                    className="relative h-40 overflow-hidden border border-[#2e2e2e] bg-[#111] sm:h-56 lg:h-[320px] xl:h-[380px] 2xl:h-[430px]"
                    >
                    <div className="pointer-events-none absolute inset-x-0 top-1/2 z-10 h-16 -translate-y-1/2 border-y border-[#DEF767]/40 bg-[#DEF767]/5 shadow-[0_0_30px_rgba(222,247,103,0.12)]" />

                    <div
                      className="space-y-3 py-3"
                      style={{
                        animation: isRolling
                          ? `jackpot-reel-roll ${0.42 + reel * 0.08}s linear infinite`
                          : undefined,
                      }}
                    >
                      {[...reelNames, ...reelNames].map((name, index) => (
                        <div
                          key={`${reel}-${name}-${index}`}
                          className="mx-2 flex h-12 items-center justify-center border border-[#2e2e2e] bg-[#181818] px-2 text-center font-sans text-sm uppercase tracking-[0.06em] text-white sm:mx-3 sm:h-14 sm:text-lg lg:h-20 lg:text-2xl xl:h-24 xl:text-3xl"
                        >
                          {name}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-6 border border-[#2e2e2e] bg-[#111] p-5 text-center">
                <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[#5b5b5b]">
                  {isRolling ? "Rolling..." : currentNominee ? "Selected Member" : "Ready to Draw"}
                </p>

                <h3
                  className={`mt-3 font-sans text-4xl uppercase leading-none tracking-[0.04em] sm:text-6xl lg:text-7xl xl:text-8xl 2xl:text-9xl ${
                    currentNominee ? "text-[#DEF767]" : "text-white"
                  }`}
                  style={{
                    animation: isRolling ? "jackpot-glow-pulse 0.8s ease-in-out infinite" : undefined,
                  }}
                >
                  {displayedNominee?.name || "Pull Lever"}
                </h3>

                {currentNominee && (
                  <div className="mt-5 grid gap-3 sm:grid-cols-2">
                    <div className="border border-[#2e2e2e] bg-[#181818] p-4">
                      <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-[#5b5b5b]">
                        Highest Bid
                      </p>
                      <p className="mt-1 font-sans text-3xl text-[#DEF767]">
                        {formatTokens(currentBid?.amount)}
                      </p>
                      <p className="mt-2 text-[12px] text-[#929292]">
                        {currentBid?.leaderName
                          ? `By ${currentBid.leaderName}`
                          : "No bids placed yet."}
                      </p>
                    </div>

                    <div className="border border-[#2e2e2e] bg-[#181818] p-4">
                      <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-[#5b5b5b]">
                        Next Minimum
                      </p>
                      <p className="mt-1 font-sans text-3xl text-white">
                        {formatTokens(
                          Number(currentBid?.amount || 0) + Number(bidding?.minIncrement || 0)
                        )}
                      </p>
                      <p className="mt-2 text-[12px] text-[#929292]">
                        Waiting for leaders to bid.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {bidding?.phase === "finished" && (
              <div className="mt-5 border border-[#DEF767]/40 bg-[#DEF767]/10 px-4 py-3 text-center font-mono text-[11px] uppercase tracking-[0.14em] text-[#DEF767]">
                Auction finished. All members have been assigned.
              </div>
            )}
          </div>

          <div className="flex min-h-[260px] flex-col items-center justify-center border border-[#2e2e2e] bg-[#101010] p-4 sm:min-h-[320px] xl:min-h-[560px] 2xl:min-h-[640px]">
            <div className="mb-5 text-center">
              <Joystick className="mx-auto text-[#DEF767]" size={34} />
              <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.18em] text-[#5b5b5b]">
                Draw Lever
              </p>
            </div>

            <button
              type="button"
              disabled={isBusy || isRolling || hasActiveAuction || bidding?.phase === "finished"}
              onClick={pullLever}
              className="relative h-48 w-20 disabled:opacity-40 sm:h-60 sm:w-24 xl:h-80 xl:w-28"
              aria-label="Pull jackpot lever to draw next member"
            >
              <span className="absolute left-1/2 top-0 h-full w-5 -translate-x-1/2 rounded-full border border-[#2e2e2e] bg-[#181818]" />

              <span
                className={`absolute left-1/2 grid h-16 w-16 -translate-x-1/2 place-items-center rounded-full border border-[#DEF767]/60 bg-[#181818] text-[#DEF767] shadow-[0_0_30px_rgba(222,247,103,0.18)] transition-all duration-300 sm:h-20 sm:w-20 xl:h-24 xl:w-24 ${
                  leverPulled ? "top-[70%]" : "top-4"
                }`}
              >
                <Zap size={30} />
              </span>

              <span className="absolute bottom-0 left-1/2 h-10 w-28 -translate-x-1/2 border border-[#2e2e2e] bg-[#181818]" />
            </button>

            <button
              type="button"
              disabled={isBusy || isRolling || hasActiveAuction || bidding?.phase === "finished"}
              onClick={pullLever}
              className="mt-6 w-full border border-[rgba(222,247,103,0.5)] bg-[#181818] px-4 py-3.5 font-mono text-[11px] uppercase tracking-[0.14em] text-[#DEF767] disabled:opacity-40"
            >
              {isRolling ? "Rolling..." : "Pull Lever"}
            </button>

            <button
              type="button"
              disabled={isBusy || isRolling || !hasActiveAuction || !hasValidBid}
              onClick={onClose}
              className="mt-3 w-full border border-[#ff6a6a]/60 bg-[#181818] px-4 py-3.5 font-mono text-[11px] uppercase tracking-[0.14em] text-[#ff6a6a] disabled:opacity-40"
            >
              {isBusy ? "Closing..." : "Sold"}
            </button>

            {hasActiveAuction && !hasValidBid && (
              <p className="mt-3 text-center text-[11px] leading-5 text-[#5b5b5b]">
                A valid leader bid is required before the host can mark this member as sold.
              </p>
            )}
          </div>
        </div>

        <div className="mt-6 grid gap-3 md:grid-cols-3 xl:gap-5">
          <div className="border border-[#2e2e2e] bg-[#111] p-4">
            <Crown className="text-[#DEF767]" size={18} />
            <p className="mt-3 font-mono text-[9px] uppercase tracking-[0.14em] text-[#5b5b5b]">
              Current Bidder
            </p>
            <p className="mt-1 font-sans text-xl uppercase text-white">
              {currentBid?.leaderName || "Awaiting Bid"}
            </p>
          </div>

          <div className="border border-[#2e2e2e] bg-[#111] p-4 xl:p-6">
            <Gavel className="text-[#ff6a6a]" size={18} />
            <p className="mt-3 font-mono text-[9px] uppercase tracking-[0.14em] text-[#5b5b5b]">
              Auction Status
            </p>
            <p className="mt-1 font-sans text-xl uppercase text-white">
              {hasActiveAuction ? "Live" : bidding?.phase === "finished" ? "Closed" : "Idle"}
            </p>
          </div>

          <div className="border border-[#2e2e2e] bg-[#111] p-4">
            <Users className="text-[#929292]" size={18} />
            <p className="mt-3 font-mono text-[9px] uppercase tracking-[0.14em] text-[#5b5b5b]">
              Members Remaining
            </p>
            <p className="mt-1 font-sans text-xl uppercase text-white">
              {availableEntries.length}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}


function HostControls({
  bidding,
  isBusy,
  onDraw,
  onClose,
}: {
  bidding: any;
  isBusy: boolean;
  onDraw: () => void;
  onClose: () => void;
}) {
  const hasActiveAuction = bidding?.phase === "auction" && bidding?.currentNominee;
  // const hasValidBid = Number(bidding?.currentBid?.amount || 0) > 0;
  const hasValidBid =
    Number(bidding?.currentBid?.amount || 0) > 0 &&
    !!bidding?.currentBid?.leaderUserId &&
    (!!bidding?.currentBid?.teamId ||
    !!bidding?.leaders?.[bidding?.currentBid?.leaderUserId]?.teamId);
  return (
    <section className="border border-[#2e2e2e] bg-[#171717]/70 p-4">
      <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#5b5b5b]">
        Host Controls
      </p>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <button
          type="button"
          disabled={isBusy || hasActiveAuction || bidding?.phase === "finished"}
          onClick={onDraw}
          className="border border-[rgba(222,247,103,0.5)] bg-[#181818] py-3.5 font-mono text-[11px] uppercase tracking-[0.14em] text-[#DEF767] disabled:opacity-40"
        >
          {isBusy ? "Drawing..." : "Draw Next Member"}
        </button>

        <button
          type="button"
          disabled={isBusy || !hasActiveAuction || !hasValidBid}
          onClick={onClose}
          className="border border-[#ff6a6a]/60 bg-[#181818] py-3.5 font-mono text-[11px] uppercase tracking-[0.14em] text-[#ff6a6a] disabled:opacity-40"
        >
          {isBusy ? "Closing..." : "Close / Sold"}
        </button>
      </div>

      {!hasValidBid && hasActiveAuction && (
        <p className="mt-3 text-[11px] text-[#5b5b5b]">
          A bid must be placed before the host can close this auction.
        </p>
      )}
    </section>
  );
}

function LeaderControls({
  myLeader,
  currentBid,
  currentNominee,
  bidAmount,
  setBidAmount,
  currentRequiredBid,
  isBusy,
  onPlaceBid,
}: {
  myLeader: any;
  currentBid: any;
  currentNominee: any;
  bidAmount: string;
  setBidAmount: (value: string) => void;
  currentRequiredBid: number;
  isBusy: boolean;
  onPlaceBid: (amount?: number) => void;
}) {
  const isHighest = currentBid?.leaderUserId === myLeader?.userId;
  const tokensLeft = Number(myLeader?.tokensLeft || 0);

  return (
    <section className="border border-[#2e2e2e] bg-[#171717]/70 p-4">
      <div className="flex items-center gap-2">
        <Coins size={15} className="text-[#DEF767]" />
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#5b5b5b]">
          Leader Bid Console
        </p>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-px border border-[#2e2e2e] bg-[#2e2e2e]">
        <div className="bg-[#181818] p-3">
          <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-[#5b5b5b]">Tokens Left</p>
          <p className="mt-1 font-sans text-xl text-[#DEF767]">{formatTokens(tokensLeft)}</p>
        </div>
        <div className="bg-[#181818] p-3">
          <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-[#5b5b5b]">Spent</p>
          <p className="mt-1 font-sans text-xl text-white">{formatTokens(myLeader?.spent)}</p>
        </div>
      </div>

      {isHighest && (
        <div className="mt-4 border border-[#DEF767]/40 bg-[#DEF767]/10 px-3 py-2 font-mono text-[10px] uppercase tracking-[0.12em] text-[#DEF767]">
          You are currently the highest bidder.
        </div>
      )}

      <div className="mt-4 space-y-3">
        <input
          type="number"
          value={bidAmount}
          onChange={(event) => setBidAmount(event.target.value)}
          placeholder={`MIN ${formatTokens(currentRequiredBid)}`}
          disabled={!currentNominee || isBusy}
          className="w-full border border-[#2e2e2e] bg-[#181818] px-4 py-3 font-mono text-sm text-white outline-none placeholder:text-[#5b5b5b]"
        />

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {[50_000, 100_000, 250_000].map((increment) => (
            <button
              key={increment}
              type="button"
              disabled={!currentNominee || isBusy}
              onClick={() => onPlaceBid(Number(currentBid?.amount || 0) + increment)}
              className="border border-[#2e2e2e] bg-[#181818] py-2 font-mono text-[10px] uppercase tracking-[0.12em] text-[#929292] disabled:opacity-40"
            >
              +{formatTokens(increment)}
            </button>
          ))}

          <button
            type="button"
            disabled={!currentNominee || isBusy || tokensLeft <= 0}
            onClick={() => onPlaceBid(tokensLeft)}
            className="border border-[#2e2e2e] bg-[#181818] py-2 font-mono text-[10px] uppercase tracking-[0.12em] text-[#929292] disabled:opacity-40"
          >
            All In
          </button>
        </div>

        <button
          type="button"
          disabled={!currentNominee || isBusy}
          onClick={() => onPlaceBid()}
          className="w-full border border-[rgba(222,247,103,0.5)] bg-[#181818] py-3.5 font-mono text-[11px] uppercase tracking-[0.14em] text-[#DEF767] disabled:opacity-40"
        >
          {isBusy ? "Placing Bid..." : "Place Bid"}
        </button>
      </div>
    </section>
  );
}

function SpectatorPanel({
  amCurrentNominee,
  soldToMe,
  currentNominee,
}: {
  amCurrentNominee: boolean;
  soldToMe: any;
  currentNominee: any;
}) {
  return (
    <section className="border border-[#2e2e2e] bg-[#171717]/70 p-4">
      <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#5b5b5b]">
        Spectator Feed
      </p>

      <div className="mt-3 border border-[#2e2e2e] bg-[#181818] p-4">
        {soldToMe ? (
          <>
            <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-[#DEF767]">
              Assigned to Team
            </p>
            <p className="mt-2 text-[13px] leading-5 text-[#929292]">
              You were won by <span className="text-white">{soldToMe.leaderName}</span> and are now part of{" "}
              <span className="text-white">{soldToMe.teamName}</span>.
            </p>
          </>
        ) : amCurrentNominee ? (
          <>
            <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-[#ff6a6a]">
              You are being bid on
            </p>
            <p className="mt-2 text-[13px] leading-5 text-[#929292]">
              Leaders are placing bids for your team assignment.
            </p>
          </>
        ) : currentNominee ? (
          <>
            <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-[#929292]">
              Watching auction
            </p>
            <p className="mt-2 text-[13px] leading-5 text-[#929292]">
              Current member on bid: <span className="text-white">{currentNominee.name}</span>.
            </p>
          </>
        ) : (
          <>
            <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-[#929292]">
              Waiting
            </p>
            <p className="mt-2 text-[13px] leading-5 text-[#929292]">
              Waiting for the host to draw the next member.
            </p>
          </>
        )}
      </div>
    </section>
  );
}

function LeaderBoard({
  leaders,
  currentLeaderId,
}: {
  leaders: any[];
  currentLeaderId?: string | null;
}) {
  return (
    <section className="border border-[#2e2e2e] bg-[#171717]/70 p-4">
      <div className="flex items-center gap-2">
        <Trophy size={15} className="text-[#DEF767]" />
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#5b5b5b]">
          Leader Wallets
        </p>
      </div>

      <div className="mt-4 space-y-2">
        {leaders.map((leader) => {
          const isCurrent = currentLeaderId === leader.userId;
          const leaderPhoto = getProfilePicture(leader)
          
          return (
            <div
              key={leader.userId}
              className={`border p-3 ${
                isCurrent
                  ? "border-[#DEF767]/50 bg-[#DEF767]/10"
                  : "border-[#2e2e2e] bg-[#181818]"
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                
                
                {leaderPhoto ? (
                  <img
                    src={leaderPhoto}
                    alt={`${leader.name || 'Leader'} profile`}
                    className="h-10 w-10 rounded-full border border-[#2e2e2e] object-cover"
                  />
                ) : (
                  <div className="grid h-10 w-10 place-items-center rounded-full border border-[#2e2e2e] bg-[#111] font-mono text-[11px] uppercase text-[#929292]">
                    {getInitials(leader.name)}
                  </div>
                )}

                <div>
                  <p className="font-sans text-sm uppercase tracking-[0.04em] text-white">
                    {leader.name}
                  </p>
                  <p className="mt-1 font-mono text-[9px] uppercase tracking-[0.12em] text-[#5b5b5b]">
                    {leader.teamName}
                  </p>
                </div>



                <div className="text-right">
                  <p className="font-mono text-[10px] text-[#DEF767]">
                    {formatTokens(leader.tokensLeft)}
                  </p>
                  <p className="mt-1 font-mono text-[9px] text-[#5b5b5b]">
                    spent {formatTokens(leader.spent)}
                  </p>
                </div>
              </div>
            </div>
          );
        })}

        {leaders.length === 0 && (
          <p className="text-[12px] text-[#5b5b5b]">No leaders loaded.</p>
        )}
      </div>
    </section>
  );
}

function BiddingStats({ entries, sold }: { entries: any[]; sold: any[] }) {
  const soldCount = sold.length;
  const total = entries.length;
  const remaining = entries.filter((entry) => !entry.sold).length;

  return (
    <section className="grid grid-cols-3 gap-px border border-[#2e2e2e] bg-[#2e2e2e]">
      <div className="bg-[#171717]/70 p-3 text-center">
        <Users className="mx-auto text-[#5b5b5b]" size={16} />
        <p className="mt-2 font-mono text-[9px] uppercase tracking-[0.12em] text-[#5b5b5b]">Total</p>
        <p className="mt-1 font-sans text-xl text-white">{total}</p>
      </div>
      <div className="bg-[#171717]/70 p-3 text-center">
        <Gavel className="mx-auto text-[#5b5b5b]" size={16} />
        <p className="mt-2 font-mono text-[9px] uppercase tracking-[0.12em] text-[#5b5b5b]">Sold</p>
        <p className="mt-1 font-sans text-xl text-white">{soldCount}</p>
      </div>
      <div className="bg-[#171717]/70 p-3 text-center">
        <Radio className="mx-auto text-[#5b5b5b]" size={16} />
        <p className="mt-2 font-mono text-[9px] uppercase tracking-[0.12em] text-[#5b5b5b]">Left</p>
        <p className="mt-1 font-sans text-xl text-white">{remaining}</p>
      </div>
    </section>
  );
}

function BidLogs({ logs }: { logs: string[] }) {
  return (
    <section className="border border-[#2e2e2e] bg-[#171717]/70 p-4">
      <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#5b5b5b]">
        Auction Logs
      </p>

      <div className="mt-3 max-h-44 space-y-2 overflow-auto pr-1">
        {logs.slice(0, 12).map((log, index) => (
          <div
            key={`${log}-${index}`}
            className="border border-[#2e2e2e] bg-[#181818] px-3 py-2 font-mono text-[10px] uppercase tracking-[0.08em] text-[#929292]"
          >
            {log}
          </div>
        ))}

        {logs.length === 0 && (
          <p className="text-[12px] text-[#5b5b5b]">No bidding logs yet.</p>
        )}
      </div>
    </section>
  );
}
