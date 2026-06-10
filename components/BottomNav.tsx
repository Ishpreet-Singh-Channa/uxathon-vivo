"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Gamepad2, MessageCircle, Users, type LucideIcon } from "lucide-react";

const items: Array<{ label: string; href: string; icon: LucideIcon }> = [
  { label: "Team", href: "/myteam", icon: Users },
  { label: "Games", href: "/games", icon: Gamepad2 },
  { label: "Live Chat", href: "/live", icon: MessageCircle },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 grid h-16 grid-cols-3 border-t border-[#2e2e2e] bg-[#181818]/95 font-mono text-[10px] uppercase tracking-[0.12em]">
      {items.map((item) => {
        const Icon = item.icon;
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);

        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex flex-col items-center justify-center gap-1 ${
              active ? "bg-[#ff6a6a] text-[#171717]" : "text-[#929292] active:text-[#DEF767]"
            }`}
          >
            <Icon size={16} aria-hidden />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
