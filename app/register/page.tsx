// "use client";

// import { useState } from "react";
// import Link from "next/link";
// import { motion } from "framer-motion";
// import { useAuth } from "@/context/token-context";
// import { UserPlus, ShieldCheck, Zap, Briefcase, Mail, Lock, Phone, Cpu } from "lucide-react";

// export default function RegisterPage() {
//     const { register } = useAuth();
//     const [isLoading, setIsLoading] = useState(false);
//     const [error, setError] = useState<string | null>(null);

//     const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
//         e.preventDefault();
//         setIsLoading(true);
//         setError(null);

//         const formData = new FormData(e.currentTarget);
//         const name = formData.get("name") as string;
//         const email = formData.get("email") as string;
//         const password = formData.get("password") as string;
//         const phone = formData.get("phone") as string;
//         const company = formData.get("company") as string;
//         const skillsRaw = formData.get("skills") as string;

//         try {
//             await register({
//                 name,
//                 email,
//                 password,
//                 phone,
//                 company,
//                 skills: skillsRaw
//                     .split(",")
//                     .map((s) => s.trim())
//                     .filter(Boolean),
//             });

//             // Null check for local player profile. If not present, save a dummy player profile using the registered credentials
//             const PROFILE_STORAGE_KEY = "uxathon-player-profile";
//             if (typeof window !== "undefined") {
//                 const existingProfile = localStorage.getItem(PROFILE_STORAGE_KEY);
//                 if (!existingProfile) {
//                     const dummyProfile = {
//                         name: name || "",
//                         email: email || "",
//                         phone: phone || "",
//                         company: company || "",
//                         skills: skillsRaw || "",
//                         avatarUrl: `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(name || "UX")}`,
//                     };
//                     localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(dummyProfile));
//                 }
//             }

//             window.location.href = "/dashboard";
//         } catch (err: Error | unknown) {
//             setError((err as Error).message || "Registration protocol failed.");
//         } finally {
//             setIsLoading(false);
//         }
//     };

//     return (
//         <main className="relative min-h-screen overflow-hidden bg-[#181818] text-white selection:bg-[#ff6a6a] selection:text-[#171717]">
//             {/* UXISM Background System */}
//             <div className="pointer-events-none fixed inset-0 z-0">
//                 <div className="absolute inset-0 opacity-20 [background-image:radial-gradient(#5b5b5b_1px,transparent_1px)] [background-size:24px_24px]" />

//                 {/* Spectral Blob - Emotional Counterweight */}
//                 <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-[600px] w-[600px] bg-[radial-gradient(circle,rgba(222,247,103,0.05)_0%,rgba(255,106,106,0.03)_50%,transparent_100%)] blur-[100px]" />

//                 {/* Technical Drawing Markers */}
//                 <div className="absolute left-8 top-8 h-6 w-6 border-l border-t border-[#5b5b5b]/40" />
//                 <div className="absolute right-8 top-8 h-6 w-6 border-r border-t border-[#5b5b5b]/40" />
//                 <div className="absolute left-8 bottom-8 h-6 w-6 border-l border-b border-[#5b5b5b]/40" />
//                 <div className="absolute right-8 bottom-8 h-6 w-6 border-r border-b border-[#5b5b5b]/40" />

//                 {/* Center Crosshair */}
//                 <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-8 w-8 opacity-20">
//                     <div className="absolute left-1/2 top-0 h-full w-[1px] bg-[#5b5b5b]" />
//                     <div className="absolute left-0 top-1/2 h-[1px] w-full bg-[#5b5b5b]" />
//                 </div>
//             </div>

//             <header className="relative z-20 flex items-center justify-between border-b border-[#2e2e2e] bg-[#181818]/80 px-6 py-5 backdrop-blur-md">
//                 <div className="flex flex-col">
//                     <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#5b5b5b]">Identity Node</p>
//                     <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-[#929292]">SECURE CONNECTION</p>
//                 </div>
//                 <div className="hidden sm:flex flex-col items-end">
//                     <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#5b5b5b]">Registration Node</p>
//                     <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-[#929292]">V1.0.4</p>
//                 </div>
//             </header>

//             <section className="relative z-10 flex min-h-[calc(100-80px)] flex-col items-center justify-center px-6 py-20">
//                 <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="w-full max-w-lg">
//                     <div className="mb-10 text-center sm:text-left">
//                         <h1 className="font-sans text-4xl uppercase tracking-tight text-white mb-3">
//                             Join <span className="text-[#ff6a6a]">UXISM</span>
//                         </h1>
//                         <p className="font-mono text-[12px] uppercase tracking-[0.2em] text-[#5b5b5b]">Establish your identity in the network.</p>
//                     </div>

//                     <form onSubmit={handleSubmit} className="group relative">
//                         {/* Unified Slab Construction */}
//                         <div className="border border-[#2e2e2e] bg-[#171717] divide-y divide-[#2e2e2e]">
//                             <RegisterInput label="Full Name" name="name" type="text" placeholder="J. DOE" icon={<UserPlus size={16} />} required />
//                             <RegisterInput label="Email Address" name="email" type="email" placeholder="YOU@DOMAIN.EXT" icon={<Mail size={16} />} required />
//                             <RegisterInput label="Password" name="password" type="password" placeholder="••••••••" icon={<Lock size={16} />} required />
//                             <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-[#2e2e2e]">
//                                 <RegisterInput label="Phone Number" name="phone" type="tel" placeholder="987********" icon={<Phone size={16} />} required />
//                                 <RegisterInput label="Affiliation" name="company" type="text" placeholder="CORPORATION / ORG" icon={<Briefcase size={16} />} required />
//                             </div>
//                             <RegisterInput label="Skills" name="skills" type="text" placeholder="UI, UX...(COMMA SEPARATED)" icon={<Cpu size={16} />} required />
//                         </div>

//                         {error && (
//                             <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="mt-6 border border-[#ff6a6a]/30 bg-[#ff6a6a]/5 px-4 py-3 font-mono text-[11px] uppercase tracking-[0.1em] text-[#ff6a6a]">
//                                 <span className="mr-2 opacity-50">ERROR:</span> {error}
//                             </motion.div>
//                         )}

//                         <div className="mt-8 flex flex-col gap-4">
//                             <button type="submit" disabled={isLoading} className="relative group flex h-14 w-full items-center justify-center overflow-hidden bg-[#ff6a6a] transition-all hover:bg-[#ff4d4d] disabled:opacity-50">
//                                 <span className="relative z-10 flex items-center gap-3 font-mono text-[12px] uppercase tracking-[0.2em] text-[#171717]">
//                                     {isLoading ? (
//                                         <div className="h-4 w-4 animate-spin border-2 border-[#171717] border-t-transparent rounded-full" />
//                                     ) : (
//                                         <>
//                                             Initialize Protocol
//                                             <ShieldCheck size={18} />
//                                         </>
//                                     )}
//                                 </span>
//                             </button>

//                             <p className="text-center font-mono text-[10px] uppercase tracking-[0.15em] text-[#5b5b5b]">
//                                 By initializing, you agree to the <span className="text-[#929292]">System Terms</span>
//                             </p>
//                         </div>
//                     </form>
//                 </motion.div>
//             </section>

//             {/* Right Rail - Reserved for FABs only as per UXISM Law */}
//             <div className="fixed right-0 top-0 bottom-0 w-[25%] pointer-events-none z-30 hidden lg:block">
//                 <div className="absolute right-8 bottom-8 flex flex-col gap-4 pointer-events-auto">
//                     <button className="h-10 w-10 border border-[#5b5b5b] bg-[#181818] text-[#5b5b5b] hover:border-[#DEF767] hover:text-[#DEF767] transition-all flex items-center justify-center">
//                         <Zap size={18} />
//                     </button>
//                 </div>
//             </div>

//             {/* Footer Status Bar */}
//             <footer className="fixed bottom-0 left-0 right-0 z-20 flex h-8 items-center justify-between border-t border-[#2e2e2e] bg-[#181818] px-6">
//                 <div className="flex items-center gap-4">
//                     <div className="flex items-center gap-2">
//                         <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#DEF767]" />
//                         <span className="font-mono text-[9px] uppercase tracking-[0.1em] text-[#929292]">ENCRYPTION ACTIVE</span>
//                     </div>
//                 </div>
//                 <div className="font-mono text-[9px] uppercase tracking-[0.1em] text-[#5b5b5b]">COORD: REGISTER_FLOW_V1.0</div>
//             </footer>
//         </main>
//     );
// }

// function RegisterInput({ label, name, type, placeholder, icon, required }: { label: string; name: string; type: string; placeholder: string; icon: React.ReactNode; required?: boolean }) {
//     return (
//         <div className="relative group/field px-6 py-5 hover:bg-[#1a1a1a] transition-colors">
//             <label className="block font-mono text-[10px] uppercase tracking-[0.2em] text-[#5b5b5b] mb-3 group-focus-within/field:text-[#DEF767] transition-colors">{label}</label>
//             <div className="relative flex items-center gap-4">
//                 <div className="text-[#5b5b5b] group-focus-within/field:text-[#DEF767] transition-colors">{icon}</div>
//                 <input name={name} type={type} required={required} placeholder={placeholder} className="w-full bg-transparent font-mono text-[13px] text-white outline-none placeholder:text-[#2e2e2e]" />
//             </div>
//             {/* Focus Indicator Accent */}
//             <div className="absolute left-0 top-0 bottom-0 w-[2px] bg-[#DEF767] scale-y-0 group-focus-within/field:scale-y-100 transition-transform duration-300 origin-top" />
//         </div>
//     );
// }






"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { useAuth } from "@/context/token-context";
import {
    UserPlus, ShieldCheck, Zap, Briefcase,
    Mail, Lock, Phone, Cpu, Camera
} from "lucide-react";

export default function RegisterPage() {
    const { register } = useAuth();
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // New state for media upload
    const [avatarBase64, setAvatarBase64] = useState<string>("");
    const [avatarPreview, setAvatarPreview] = useState<string>("");
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Initialize random default avatar on mount
    useEffect(() => {
        const loadRandomAvatar = async () => {
            const randomNum = Math.floor(Math.random() * 20) + 1;
            const imagePath = `/profile_pic/profile_pic${randomNum}.png`;

            // Set preview immediately for UX
            setAvatarPreview(imagePath);

            try {
                // Fetch the default image and convert to base64
                const response = await fetch(imagePath);
                const blob = await response.blob();
                const reader = new FileReader();
                reader.onloadend = () => {
                    setAvatarBase64(reader.result as string);
                };
                reader.readAsDataURL(blob);
            } catch (err) {
                console.error("Failed to load default avatar sequence:", err);
            }
        };

        loadRandomAvatar();
    }, []);

    // Handle user uploading their own image
    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                const base64String = reader.result as string;
                setAvatarBase64(base64String);
                setAvatarPreview(base64String); // Update preview to uploaded image
            };
            reader.readAsDataURL(file);
        }
    };

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
                image: avatarBase64, // Passed to backend
            });

            // Null check for local player profile.
            const PROFILE_STORAGE_KEY = "uxathon-player-profile";
            if (typeof window !== "undefined") {
                const existingProfile = localStorage.getItem(PROFILE_STORAGE_KEY);
                if (!existingProfile) {
                    const dummyProfile = {
                        name: name || "",
                        email: email || "",
                        phone: phone || "",
                        company: company || "",
                        skills: skillsRaw || "",
                        // Use the base64 avatar for local storage as well
                        avatarUrl: avatarBase64 || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(name || "UX")}`,
                    };
                    localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(dummyProfile));
                }
            }

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
                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-[600px] w-[600px] bg-[radial-gradient(circle,rgba(222,247,103,0.05)_0%,rgba(255,106,106,0.03)_50%,transparent_100%)] blur-[100px]" />

                <div className="absolute left-8 top-8 h-6 w-6 border-l border-t border-[#5b5b5b]/40" />
                <div className="absolute right-8 top-8 h-6 w-6 border-r border-t border-[#5b5b5b]/40" />
                <div className="absolute left-8 bottom-8 h-6 w-6 border-l border-b border-[#5b5b5b]/40" />
                <div className="absolute right-8 bottom-8 h-6 w-6 border-r border-b border-[#5b5b5b]/40" />

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
                        <h1 className="font-sans text-4xl uppercase tracking-tight text-white mb-3">
                            Join <span className="text-[#ff6a6a]">UXISM</span>
                        </h1>
                        <p className="font-mono text-[12px] uppercase tracking-[0.2em] text-[#5b5b5b]">Establish your identity in the network.</p>
                    </div>

                    <form onSubmit={handleSubmit} className="group relative" suppressHydrationWarning>
                        {/* Unified Slab Construction */}
                        <div className="border border-[#2e2e2e] bg-[#171717] divide-y divide-[#2e2e2e]">

                            {/* Avatar Upload Sector */}
                            <div
                                className="relative group/avatar flex flex-col items-center justify-center px-6 py-8 cursor-pointer hover:bg-[#1a1a1a] transition-colors"
                                onClick={() => fileInputRef.current?.click()}
                            >
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    accept="image/png, image/jpeg, image/webp"
                                    className="hidden"
                                    onChange={handleImageUpload}
                                />

                                <div className="relative h-20 w-20 overflow-hidden rounded-none border border-[#2e2e2e] bg-[#1a1a1a] transition-colors group-hover/avatar:border-[#DEF767]">
                                    {avatarPreview ? (
                                        <img
                                            src={avatarPreview}
                                            alt="Identity Marker"
                                            className="h-full w-full object-cover opacity-80 group-hover/avatar:grayscale-0 group-hover/avatar:opacity-100 transition-all duration-500"
                                        />
                                    ) : (
                                        <div className="flex h-full w-full items-center justify-center">
                                            <Camera className="text-[#5b5b5b] group-hover/avatar:text-[#DEF767]" />
                                        </div>
                                    )}

                                    {/* Hover Overlay */}
                                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover/avatar:opacity-100 transition-opacity backdrop-blur-sm">
                                        <Camera size={20} className="text-[#DEF767]" />
                                    </div>

                                    {/* Crosshair accents on avatar */}
                                    <div className="absolute left-0 top-0 h-2 w-2 border-l border-t border-[#DEF767] opacity-0 group-hover/avatar:opacity-100 transition-opacity" />
                                    <div className="absolute right-0 bottom-0 h-2 w-2 border-r border-b border-[#DEF767] opacity-0 group-hover/avatar:opacity-100 transition-opacity" />
                                </div>

                                <p className="mt-4 font-mono text-[10px] uppercase tracking-[0.2em] text-[#5b5b5b] group-hover/avatar:text-[#DEF767] transition-colors">
                                    [ Override Visual Identity ]
                                </p>
                            </div>

                            <RegisterInput label="Full Name" name="name" type="text" placeholder="J. DOE" icon={<UserPlus size={16} />} required />
                            <RegisterInput label="Email Address" name="email" type="email" placeholder="YOU@DOMAIN.EXT" icon={<Mail size={16} />} required />
                            <RegisterInput label="Password" name="password" type="password" placeholder="••••••••" icon={<Lock size={16} />} required />
                            <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-[#2e2e2e]">
                                <RegisterInput label="Phone Number" name="phone" type="tel" placeholder="987********" icon={<Phone size={16} />} required />
                                <RegisterInput label="Affiliation" name="company" type="text" placeholder="CORPORATION / ORG" icon={<Briefcase size={16} />} required />
                            </div>
                            <RegisterInput label="Skills" name="skills" type="text" placeholder="UI, UX...(COMMA SEPARATED)" icon={<Cpu size={16} />} required />
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

            {/* Right Rail */}
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
