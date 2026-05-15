"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { toPng } from "html-to-image";
import { ArrowLeft, Download, Pencil, Save, X } from "lucide-react";
import Field from "@/components/Field";

const PROFILE_STORAGE_KEY = "uxathon-player-profile";

type PlayerProfile = {
    name: string;
    email: string;
    phone: string;
    company: string;
    skills: string;
    avatarUrl: string;
};

const emptyProfile: PlayerProfile = {
    name: "",
    email: "",
    phone: "",
    company: "",
    skills: "",
    avatarUrl: "",
};

function loadProfile(): PlayerProfile {
    if (typeof window === "undefined") return emptyProfile;
    try {
        const raw = localStorage.getItem(PROFILE_STORAGE_KEY);
        if (!raw) return emptyProfile;
        return { ...emptyProfile, ...JSON.parse(raw) };
    } catch {
        return emptyProfile;
    }
}

function getInitials(name: string) {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return "UX";
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

function parseSkills(skills: string) {
    return skills
        .split(",")
        .map((skill) => skill.trim())
        .filter(Boolean);
}

export default function ProfilePage() {
    const cardRef = useRef<HTMLDivElement>(null);
    const [profile, setProfile] = useState<PlayerProfile>(emptyProfile);
    const [draft, setDraft] = useState<PlayerProfile>(emptyProfile);
    const [isEditing, setIsEditing] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);
    const [hydrated, setHydrated] = useState(false);

    useEffect(() => {
        const saved = loadProfile();
        setProfile(saved);
        setDraft(saved);
        setHydrated(true);
    }, []);

    function startEditing() {
        setDraft(profile);
        setIsEditing(true);
    }

    function cancelEditing() {
        setDraft(profile);
        setIsEditing(false);
    }

    function saveProfile() {
        const next = {
            ...draft,
            name: draft.name.trim(),
            email: draft.email.trim(),
            phone: draft.phone.trim(),
            company: draft.company.trim(),
            skills: draft.skills.trim(),
            avatarUrl: draft.avatarUrl.trim(),
        };
        localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(next));
        setProfile(next);
        setDraft(next);
        setIsEditing(false);
    }

    function updateDraft<K extends keyof PlayerProfile>(key: K, value: PlayerProfile[K]) {
        setDraft((prev) => ({ ...prev, [key]: value }));
    }

    async function downloadCard() {
        if (!cardRef.current || isDownloading) return;
        setIsDownloading(true);
        try {
            const dataUrl = await toPng(cardRef.current, {
                cacheBust: true,
                pixelRatio: 2,
                backgroundColor: "#171717",
            });
            const link = document.createElement("a");
            link.download = "uxathon-player-card.png";
            link.href = dataUrl;
            link.click();
        } catch {
            console.error("Failed to export player card");
        } finally {
            setIsDownloading(false);
        }
    }

    const display = isEditing ? draft : profile;
    const skillTags = parseSkills(display.skills);
    const initials = getInitials(display.name);

    const inputClass =
        "w-full border border-[#2e2e2e] bg-[#181818] px-3 py-2.5 text-[13px] text-white outline-none placeholder:text-[#5b5b5b] focus:border-[rgba(222,247,103,0.5)]";

    return (
        <main className="relative min-h-screen overflow-hidden bg-[#181818] text-white selection:bg-[#ff6a6a] selection:text-[#171717]">
            <div className="pointer-events-none fixed inset-0 opacity-25 [background-image:radial-gradient(#5b5b5b_1px,transparent_1px)] [background-size:18px_18px]" />

            <header className="relative z-20 flex items-center justify-between border-b border-[#2e2e2e] bg-[#181818]/95 px-5 py-4 backdrop-blur-[2px]">
                <Link
                    href="/dashboard"
                    className="flex h-10 items-center gap-2 border border-[#2e2e2e] px-4 font-mono text-[11px] uppercase tracking-[0.14em] text-[#929292] active:border-[rgba(222,247,103,0.5)] active:text-[#DEF767]"
                >
                    <ArrowLeft size={14} aria-hidden />
                    Dashboard
                </Link>
                <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-[#5b5b5b]">Profile</p>
            </header>

            <section className="relative z-10 mx-auto flex w-full max-w-md flex-col gap-6 px-5 py-8">
                {!hydrated ? (
                    <p className="text-center font-mono text-[11px] uppercase tracking-[0.14em] text-[#5b5b5b]">
                        Loading profile…
                    </p>
                ) : (
                    <>
                        <div
                            ref={cardRef}
                            className="border border-[#2e2e2e] bg-[#171717] px-6 py-8"
                            aria-label="Player card"
                        >
                            <div className="flex flex-col items-center">
                                {display.avatarUrl ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img
                                        src={display.avatarUrl}
                                        alt=""
                                        className="h-24 w-24 rounded-full border border-[#2e2e2e] object-cover"
                                    />
                                ) : (
                                    <div className="grid h-24 w-24 place-items-center rounded-full border border-[#2e2e2e] bg-[#181818] font-serif text-[28px] uppercase tracking-[0.04em] text-[#ff6a6a]">
                                        {initials}
                                    </div>
                                )}

                                <p className="mt-4 font-mono text-[10px] uppercase tracking-[0.18em] text-[#5b5b5b]">
                                    UXATHON / PLAYER CARD
                                </p>
                            </div>

                            <dl className="mt-8 space-y-5">
                                {isEditing ? (
                                    <>
                                        <Field label="Avatar URL">
                                            <input
                                                type="url"
                                                value={draft.avatarUrl}
                                                onChange={(e) => updateDraft("avatarUrl", e.target.value)}
                                                placeholder="https://…"
                                                className={inputClass}
                                            />
                                        </Field>
                                        <Field label="Name">
                                            <input
                                                type="text"
                                                value={draft.name}
                                                onChange={(e) => updateDraft("name", e.target.value)}
                                                placeholder="Your name"
                                                className={inputClass}
                                            />
                                        </Field>
                                        <Field label="Email">
                                            <input
                                                type="email"
                                                value={draft.email}
                                                onChange={(e) => updateDraft("email", e.target.value)}
                                                placeholder="you@company.com"
                                                className={inputClass}
                                            />
                                        </Field>
                                        <Field label="Phone number">
                                            <input
                                                type="tel"
                                                value={draft.phone}
                                                onChange={(e) => updateDraft("phone", e.target.value)}
                                                placeholder="+1 000 000 0000"
                                                className={inputClass}
                                            />
                                        </Field>
                                        <Field label="Company">
                                            <input
                                                type="text"
                                                value={draft.company}
                                                onChange={(e) => updateDraft("company", e.target.value)}
                                                placeholder="Company name"
                                                className={inputClass}
                                            />
                                        </Field>
                                        <Field label="Skills">
                                            <input
                                                type="text"
                                                value={draft.skills}
                                                onChange={(e) => updateDraft("skills", e.target.value)}
                                                placeholder="UX Research, Figma, Prototyping"
                                                className={inputClass}
                                            />
                                        </Field>
                                    </>
                                ) : (
                                    <>
                                        <ProfileRow label="Name" value={display.name} />
                                        <ProfileRow label="Email" value={display.email} />
                                        <ProfileRow label="Phone number" value={display.phone} />
                                        <ProfileRow label="Company" value={display.company} />
                                        <div>
                                            <dt className="font-mono text-[11px] uppercase tracking-[0.14em] text-[#5b5b5b]">
                                                Skills
                                            </dt>
                                            <dd className="mt-2">
                                                {skillTags.length > 0 ? (
                                                    <ul className="flex flex-wrap gap-2">
                                                        {skillTags.map((skill) => (
                                                            <li
                                                                key={skill}
                                                                className="border border-[#2e2e2e] px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.1em] text-[#929292]"
                                                            >
                                                                {skill}
                                                            </li>
                                                        ))}
                                                    </ul>
                                                ) : (
                                                    <p className="text-[13px] text-[#5b5b5b]">—</p>
                                                )}
                                            </dd>
                                        </div>
                                    </>
                                )}
                            </dl>
                        </div>

                        <div className="flex flex-col gap-3 sm:flex-row">
                            {isEditing ? (
                                <>
                                    <button
                                        type="button"
                                        onClick={saveProfile}
                                        className="flex h-11 flex-1 items-center justify-center gap-2 bg-[#ff6a6a] font-mono text-[11px] uppercase tracking-[0.14em] text-[#171717]"
                                    >
                                        <Save size={14} aria-hidden />
                                        Save
                                    </button>
                                    <button
                                        type="button"
                                        onClick={cancelEditing}
                                        className="flex h-11 flex-1 items-center justify-center gap-2 border border-[#2e2e2e] font-mono text-[11px] uppercase tracking-[0.14em] text-[#929292] active:border-[rgba(222,247,103,0.5)] active:text-[#DEF767]"
                                    >
                                        <X size={14} aria-hidden />
                                        Cancel
                                    </button>
                                </>
                            ) : (
                                <button
                                    type="button"
                                    onClick={startEditing}
                                    className="flex h-11 flex-1 items-center justify-center gap-2 border border-[#2e2e2e] font-mono text-[11px] uppercase tracking-[0.14em] text-[#929292] active:border-[rgba(222,247,103,0.5)] active:text-[#DEF767]"
                                >
                                    <Pencil size={14} aria-hidden />
                                    Edit
                                </button>
                            )}

                            <button
                                type="button"
                                onClick={downloadCard}
                                disabled={isDownloading || isEditing}
                                className="flex h-11 flex-1 items-center justify-center gap-2 border border-[rgba(222,247,103,0.5)] font-mono text-[11px] uppercase tracking-[0.14em] text-[#DEF767] disabled:cursor-not-allowed disabled:opacity-40"
                            >
                                <Download size={14} aria-hidden />
                                {isDownloading ? "Exporting…" : "Download PNG"}
                            </button>
                        </div>
                    </>
                )}
            </section>
        </main>
    );
}

function ProfileRow({ label, value }: { label: string; value: string }) {
    return (
        <div>
            <dt className="font-mono text-[11px] uppercase tracking-[0.14em] text-[#5b5b5b]">{label}</dt>
            <dd className="mt-1.5 text-[13px] leading-[1.5] text-white">{value.trim() || "—"}</dd>
        </div>
    );
}
