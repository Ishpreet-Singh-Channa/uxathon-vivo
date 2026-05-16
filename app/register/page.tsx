"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { useAuth } from "@/context/token-context";
import { UserPlus, ShieldCheck, Zap, Briefcase, Mail, Lock, Phone, Cpu } from "lucide-react";

export default function RegisterPage() {
    const { register } = useAuth();
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);

        const formData = new FormData(e.currentTarget);
        const name = formData.get("name") as string;
        const email = formData.get("email") as string;
        const password = formData.get("password") as string;
        const phone = formData.get("phone") as string;
        const company = formData.get("company") as string;
        const skillsRaw = formData.get("skills") as string;

        try {
            await register({
                name,
                email,
                password,
                phone,
                company,
                skills: skillsRaw
                    .split(",")
                    .map((s) => s.trim())
                    .filter(Boolean),
            });
            window.location.href = "/dashboard";
        } catch (err: Error | unknown) {
            setError((err as Error).message || "Registration protocol failed.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <main className="relative min-h-screen overflow-hidden bg-[#181818] text-white selection:bg-[#ff6a6a] selection:text-[#171717]">
            {/* UXISM Background System */}
            <div className="pointer-events-none fixed inset-0 z-0">
                <div className="absolute inset-0 opacity-20 [background-image:radial-gradient(#5b5b5b_1px,transparent_1px)] [background-size:24px_24px]" />

                {/* Spectral Blob - Emotional Counterweight */}
                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-[600px] w-[600px] bg-[radial-gradient(circle,rgba(222,247,103,0.05)_0%,rgba(255,106,106,0.03)_50%,transparent_100%)] blur-[100px]" />

                {/* Technical Drawing Markers */}
                <div className="absolute left-8 top-8 h-6 w-6 border-l border-t border-[#5b5b5b]/40" />
                <div className="absolute right-8 top-8 h-6 w-6 border-r border-t border-[#5b5b5b]/40" />
                <div className="absolute left-8 bottom-8 h-6 w-6 border-l border-b border-[#5b5b5b]/40" />
                <div className="absolute right-8 bottom-8 h-6 w-6 border-r border-b border-[#5b5b5b]/40" />

                {/* Center Crosshair */}
                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-8 w-8 opacity-20">
                    <div className="absolute left-1/2 top-0 h-full w-[1px] bg-[#5b5b5b]" />
                    <div className="absolute left-0 top-1/2 h-[1px] w-full bg-[#5b5b5b]" />
                </div>
            </div>

            <header className="relative z-20 flex items-center justify-between border-b border-[#2e2e2e] bg-[#181818]/80 px-6 py-5 backdrop-blur-md">
                <div className="flex flex-col">
                    <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#5b5b5b]">Identity Node</p>
                    <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-[#929292]">SECURE CONNECTION</p>
                </div>
                <div className="hidden sm:flex flex-col items-end">
                    <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#5b5b5b]">Registration Node</p>
                    <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-[#929292]">V1.0.4</p>
                </div>
            </header>

            <section className="relative z-10 flex min-h-[calc(100-80px)] flex-col items-center justify-center px-6 py-20">
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="w-full max-w-lg">
                    <div className="mb-10 text-center sm:text-left">
                        <h1 className="font-serif text-4xl uppercase tracking-tight text-white mb-3">
                            Join <span className="text-[#ff6a6a]">UXISM</span>
                        </h1>
                        <p className="font-mono text-[12px] uppercase tracking-[0.2em] text-[#5b5b5b]">Establish your identity in the network.</p>
                    </div>

                    <form onSubmit={handleSubmit} className="group relative">
                        {/* Unified Slab Construction */}
                        <div className="border border-[#2e2e2e] bg-[#171717] divide-y divide-[#2e2e2e]">
                            <RegisterInput label="Full Name" name="name" type="text" placeholder="J. DOE" icon={<UserPlus size={16} />} required />
                            <RegisterInput label="Email Address" name="email" type="email" placeholder="YOU@DOMAIN.EXT" icon={<Mail size={16} />} required />
                            <RegisterInput label="Access Key" name="password" type="password" placeholder="••••••••" icon={<Lock size={16} />} required />
                            <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-[#2e2e2e]">
                                <RegisterInput label="Signal Node" name="phone" type="tel" placeholder="+1 000 000 0000" icon={<Phone size={16} />} required />
                                <RegisterInput label="Affiliation" name="company" type="text" placeholder="CORPORATION / ORG" icon={<Briefcase size={16} />} required />
                            </div>
                            <RegisterInput label="Core Competencies" name="skills" type="text" placeholder="UI, UX, NEXT.JS, SYSTEMS (COMMA SEPARATED)" icon={<Cpu size={16} />} required />
                        </div>

                        {error && (
                            <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="mt-6 border border-[#ff6a6a]/30 bg-[#ff6a6a]/5 px-4 py-3 font-mono text-[11px] uppercase tracking-[0.1em] text-[#ff6a6a]">
                                <span className="mr-2 opacity-50">ERROR:</span> {error}
                            </motion.div>
                        )}

                        <div className="mt-8 flex flex-col gap-4">
                            <button type="submit" disabled={isLoading} className="relative group flex h-14 w-full items-center justify-center overflow-hidden bg-[#ff6a6a] transition-all hover:bg-[#ff4d4d] disabled:opacity-50">
                                <span className="relative z-10 flex items-center gap-3 font-mono text-[12px] uppercase tracking-[0.2em] text-[#171717]">
                                    {isLoading ? (
                                        <div className="h-4 w-4 animate-spin border-2 border-[#171717] border-t-transparent rounded-full" />
                                    ) : (
                                        <>
                                            Initialize Protocol
                                            <ShieldCheck size={18} />
                                        </>
                                    )}
                                </span>
                            </button>

                            <p className="text-center font-mono text-[10px] uppercase tracking-[0.15em] text-[#5b5b5b]">
                                By initializing, you agree to the <span className="text-[#929292]">System Terms</span>
                            </p>
                        </div>
                    </form>
                </motion.div>
            </section>

            {/* Right Rail - Reserved for FABs only as per UXISM Law */}
            <div className="fixed right-0 top-0 bottom-0 w-[25%] pointer-events-none z-30 hidden lg:block">
                <div className="absolute right-8 bottom-8 flex flex-col gap-4 pointer-events-auto">
                    <button className="h-10 w-10 border border-[#5b5b5b] bg-[#181818] text-[#5b5b5b] hover:border-[#DEF767] hover:text-[#DEF767] transition-all flex items-center justify-center">
                        <Zap size={18} />
                    </button>
                </div>
            </div>

            {/* Footer Status Bar */}
            <footer className="fixed bottom-0 left-0 right-0 z-20 flex h-8 items-center justify-between border-t border-[#2e2e2e] bg-[#181818] px-6">
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                        <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#DEF767]" />
                        <span className="font-mono text-[9px] uppercase tracking-[0.1em] text-[#929292]">ENCRYPTION ACTIVE</span>
                    </div>
                </div>
                <div className="font-mono text-[9px] uppercase tracking-[0.1em] text-[#5b5b5b]">COORD: REGISTER_FLOW_V1.0</div>
            </footer>
        </main>
    );
}

function RegisterInput({ label, name, type, placeholder, icon, required }: { label: string; name: string; type: string; placeholder: string; icon: React.ReactNode; required?: boolean }) {
    return (
        <div className="relative group/field px-6 py-5 hover:bg-[#1a1a1a] transition-colors">
            <label className="block font-mono text-[10px] uppercase tracking-[0.2em] text-[#5b5b5b] mb-3 group-focus-within/field:text-[#DEF767] transition-colors">{label}</label>
            <div className="relative flex items-center gap-4">
                <div className="text-[#5b5b5b] group-focus-within/field:text-[#DEF767] transition-colors">{icon}</div>
                <input name={name} type={type} required={required} placeholder={placeholder} className="w-full bg-transparent font-mono text-[13px] text-white outline-none placeholder:text-[#2e2e2e]" />
            </div>
            {/* Focus Indicator Accent */}
            <div className="absolute left-0 top-0 bottom-0 w-[2px] bg-[#DEF767] scale-y-0 group-focus-within/field:scale-y-100 transition-transform duration-300 origin-top" />
        </div>
    );
}
