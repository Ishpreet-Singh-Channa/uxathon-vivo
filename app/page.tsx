import Link from "next/link";
import { ArrowRight } from "lucide-react";

export default function HomePage() {
    return (
        <main className="relative min-h-screen overflow-hidden bg-[#181818] text-white selection:bg-[#ff6a6a] selection:text-[#171717]">
            <div className="pointer-events-none fixed inset-0 opacity-25 [background-image:radial-gradient(#5b5b5b_1px,transparent_1px)] [background-size:18px_18px]" />

            <div className="pointer-events-none fixed left-4 top-4 h-5 w-5 border-l border-t border-[#5b5b5b] sm:left-6 sm:top-6" />
            <div className="pointer-events-none fixed right-4 top-4 h-5 w-5 border-r border-t border-[#5b5b5b] sm:right-6 sm:top-6" />
            <div className="pointer-events-none fixed bottom-4 left-4 h-5 w-5 border-b border-l border-[#5b5b5b] sm:bottom-6 sm:left-6" />
            <div className="pointer-events-none fixed bottom-4 right-4 h-5 w-5 border-b border-r border-[#5b5b5b] sm:bottom-6 sm:right-6" />

            <div className="pointer-events-none fixed left-1/2 top-[-130px] h-[min(340px,80vw)] w-[min(340px,80vw)] -translate-x-1/2 rounded-full bg-[radial-gradient(circle_at_30%_30%,#46B1FF,transparent_35%),radial-gradient(circle_at_70%_40%,#A259FF,transparent_35%),radial-gradient(circle_at_50%_70%,#ff6a6a,transparent_38%),radial-gradient(circle_at_80%_80%,#DEF767,transparent_30%)] opacity-30 blur-3xl" />

            <section className="relative z-10 flex min-h-screen items-center justify-center px-5">
                <div className="flex w-full max-w-md flex-col items-center text-center">
                    <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-[#5b5b5b]">UXISM / SPLASH / 2026</p>

                    <h1 className="mt-4 font-sans text-[clamp(2.5rem,12vw,4.5rem)] uppercase leading-[0.92] tracking-[0.02em] text-white">
                        UXATHON&apos;26
                    </h1>

                    <p className="mt-4 max-w-[28ch] text-[13px] leading-[1.5] text-[#929292]">
                        Edge AI experience lab. Enter the dashboard to begin.
                    </p>

                    <Link
                        href="/dashboard"
                        className="mt-8 flex h-11 w-full max-w-[240px] items-center justify-center gap-2 bg-[#ff6a6a] px-5 font-mono text-[11px] uppercase tracking-[0.14em] text-[#171717] sm:w-auto sm:min-w-[200px]"
                    >
                        Go to Dashboard
                        <ArrowRight size={14} aria-hidden />
                    </Link>
                </div>
            </section>
        </main>
    );
}
