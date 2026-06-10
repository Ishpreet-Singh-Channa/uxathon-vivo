"use client";

import Link from "next/link";
import { ArrowLeft, Brain, Shapes, Sparkles, Zap, type LucideIcon } from "lucide-react";
import { BottomNav } from "@/components/BottomNav";

type Game = {
  id: string;
  title: string;
  description: string;
  meta: string;
  href: string;
  icon: LucideIcon;
};

const games: Game[] = [
  {
    id: "chimp",
    title: "Chimp Test",
    description: "Memorize numbered tiles, then select them in order.",
    meta: "memory / spatial",
    href: "/games/chimp",
    icon: Brain,
  },
  {
    id: "number-memory",
    title: "Number Memory",
    description: "Recall increasingly long number sequences.",
    meta: "memory / digits",
    href: "/games/number-memory",
    icon: Shapes,
  },
  {
    id: "sequence-memory",
    title: "Sequence Memory",
    description: "Watch the pattern and reproduce it.",
    meta: "memory / sequence",
    href: "/games/sequence-memory",
    icon: Zap,
  },
  {
    id: "reaction-time",
    title: "Reaction Time",
    description: "Wait for the signal and respond fast.",
    meta: "reflex / speed",
    href: "/games/reaction-time",
    icon: Sparkles,
  },
];

export default function GamesPage() {
  return (
    <main className="relative flex min-h-screen flex-col overflow-hidden bg-[#181818] pb-24 text-white selection:bg-[#ff6a6a] selection:text-[#171717]">
      <div className="pointer-events-none fixed inset-0 opacity-25 [background-image:radial-gradient(#5b5b5b_1px,transparent_1px)] [background-size:18px_18px]" />

      <header className="relative z-20 flex shrink-0 items-center justify-between border-b border-[#2e2e2e] bg-[#181818]/95 px-5 py-4">
        <Link
          href="/dashboard"
          className="flex h-10 items-center gap-2 border border-[#2e2e2e] px-4 font-mono text-[11px] uppercase tracking-[0.14em] text-[#929292] active:border-[rgba(222,247,103,0.5)] active:text-[#DEF767]"
        >
          <ArrowLeft size={14} aria-hidden />
          Dashboard
        </Link>
      </header>

      <section className="relative z-10 mx-auto flex w-full max-w-3xl flex-1 flex-col px-5 py-8">
        <div className="mb-8">
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-[#5b5b5b]">
            UXATHON / HUMAN BENCHMARKING
          </p>
          <h1 className="mt-3 font-sans text-[32px] uppercase leading-[0.95] tracking-[0.02em] text-white">
            Games
          </h1>
        </div>

        <div className="border border-[#2e2e2e]">
          {games.map((game) => {
            const Icon = game.icon;

            return (
              <Link
                key={game.id}
                href={game.href}
                className="grid min-h-[90px] grid-cols-[auto_1fr_auto] items-center gap-4 border-b border-[#2e2e2e] bg-[#181818] px-4 py-4 text-left last:border-b-0 active:bg-[#ff6a6a] active:text-[#171717]"
              >
                <span className="grid h-11 w-11 place-items-center border border-[#2e2e2e]">
                  <Icon size={20} aria-hidden />
                </span>
                <span className="min-w-0">
                  <span className="block font-sans text-[16px] uppercase tracking-[0.04em]">
                    {game.title}
                  </span>
                  <span className="mt-1 block font-mono text-[10px] uppercase tracking-[0.14em] opacity-70">
                    {game.meta}
                  </span>
                  <span className="mt-2 block text-[12px] leading-5 text-[#929292]">
                    {game.description}
                  </span>
                </span>
                <span className="font-mono text-[16px]">+</span>
              </Link>
            );
          })}
        </div>
      </section>

      <BottomNav />
    </main>
  );
}
