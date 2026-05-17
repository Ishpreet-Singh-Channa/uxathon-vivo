"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Gavel, Gamepad2, MessageCircle, User, Users } from "lucide-react";

const bottomNavItems = [
    { label: "My Team", href: "/myteam", icon: Users, enabled: true },
    { label: "Bidding", href: null, icon: Gavel, enabled: false },
    { label: "Games", href: "/games", icon: Gamepad2, enabled: true },
    { label: "Live Chat", href: "/live", icon: MessageCircle, enabled: true },
];

export default function DashboardPage() {
    const pathname = usePathname();

    return (
        <main className="relative flex min-h-screen flex-col overflow-hidden bg-[#181818] text-white selection:bg-[#ff6a6a] selection:text-[#171717]">
            <div className="pointer-events-none fixed inset-0 opacity-25 [background-image:radial-gradient(#5b5b5b_1px,transparent_1px)] [background-size:18px_18px]" />

            <header className="relative z-20 flex shrink-0 items-center justify-between border-b border-[#2e2e2e] bg-[#181818]/95 px-5 py-4 backdrop-blur-[2px]">
                <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-[#929292] sm:text-[12px]">
                    UXISM<span className="text-[#5b5b5b]">/</span>UXATHON
                </p>

                <Link
                    href="/profile"
                    aria-label="Open profile"
                    className="grid h-10 w-10 place-items-center rounded-[24px] border border-[#5b5b5b] bg-[#181818] text-[#929292] active:border-[rgba(222,247,103,0.5)] active:text-[#DEF767]"
                >
                    <User size={18} aria-hidden />
                </Link>
            </header>

            <section className="relative z-10 flex flex-1 items-center justify-center px-5 pb-28 pt-8">
                <p className="max-w-[22ch] text-center font-mono text-[11px] uppercase leading-[1.6] tracking-[0.14em] text-[#5b5b5b] sm:text-[12px]">
                    UXATHON'26
                </p>
            </section>

            <nav
                aria-label="Dashboard navigation"
                className="fixed bottom-0 left-0 right-0 z-20 border-t border-[#2e2e2e] bg-[#181818]/95 backdrop-blur-[2px] pb-[max(0.75rem,env(safe-area-inset-bottom))]"
            >
                <ul className="grid grid-cols-4">
                    {bottomNavItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = item.href && pathname === item.href;

                        if (!item.enabled) {
                            return (
                                <li key={item.label}>
                                    <span
                                        className="flex flex-col items-center gap-1.5 px-1 py-3 text-[#5b5b5b]"
                                        aria-disabled="true"
                                    >
                                        <Icon size={18} aria-hidden />
                                        <span className="font-mono text-[9px] uppercase tracking-[0.1em] sm:text-[10px]">
                                            {item.label}
                                        </span>
                                    </span>
                                </li>
                            );
                        }

                        return (
                            <li key={item.label}>
                                <Link
                                    href={item.href}
                                    className={`flex flex-col items-center gap-1.5 px-1 py-3 transition-colors ${isActive
                                        ? "text-[#ff6a6a]"
                                        : "text-[#929292] active:text-[#DEF767]"
                                        }`}
                                    aria-current={isActive ? "page" : undefined}
                                >
                                    <Icon size={18} aria-hidden />
                                    <span className="font-mono text-[9px] uppercase tracking-[0.1em] sm:text-[10px]">
                                        {item.label}
                                    </span>
                                </Link>
                            </li>
                        );
                    })}
                </ul>
            </nav>
        </main>
    );
}
