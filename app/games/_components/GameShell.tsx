"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowLeft, Gavel, Gamepad2, MessageCircle, User, Users } from "lucide-react";
import React, { useState, useEffect } from "react";
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
  variant?: "default" | "wide" | "stage";
};

export function GameShell({ meta, title, description, children, variant = "default", }: GameShellProps) {
  const pathname = usePathname();

  const [activeRoomCode, setActiveRoomCode] = useState<string | null>(null);

  useEffect(() => {
    const roomMatch = pathname?.match(/^\/room\/([A-Z0-9]+)/i);
    if (roomMatch) {
      const code = roomMatch[1].toUpperCase();
      setActiveRoomCode(code);
      localStorage.setItem('active-room-code', code);
    } else {
      const saved = localStorage.getItem('active-room-code');
      if (saved) {
        setActiveRoomCode(saved);
      }
    }
  }, [pathname]);

  const shellWidthClass =
  variant === "stage"
    ? "max-w-[1800px] px-3 sm:px-6 lg:px-10 xl:px-14"
    : variant === "wide"
      ? "max-w-7xl px-4 sm:px-6 lg:px-8"
      : "max-w-lg px-5";

  return (
    <main className="relative flex min-h-screen flex-col overflow-hidden bg-[#181818] text-white selection:bg-[#ff6a6a] selection:text-[#171717]">
      <PageDecor />

      <section className="relative z-10 mx-auto flex w-full max-w-lg flex-1 flex-col px-5 pb-28 pt-6 ${shellWidthClass}">
        <Link
          href="/dashboard"
          className="mb-6 inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.14em] text-[#929292] active:text-[#DEF767]"
        >
          <ArrowLeft size={14} aria-hidden />
          Dashboard
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
