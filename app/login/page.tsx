"use client";
import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Eye, EyeOff, Plus, Check } from "lucide-react";
import Field from "@/components/Field";
import { useAuth } from "@/context/token-context";
import Link from "next/link";
import { useRouter } from "next/navigation";

import {
    autoJoinRoomFromRedirect,
    getSafeRedirectFromUrl,
} from "@/lib/room-invite";


type LoginForm = {
    email: string;
    password: string;
    remember: boolean;
};

type LoginErrors = Partial<Record<keyof LoginForm, string> & { general?: string }>;

const initialLoginForm: LoginForm = {
    email: "",
    password: "",
    remember: false,
};

function validateEmail(email: string) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

    function getErrorMessage(error: unknown, fallback: string) {
        if (error instanceof Error && error.message) return error.message;
        if (typeof error === "string") return error;
        return fallback;
    }  


function validateLogin(form: LoginForm): LoginErrors {
    const errors: LoginErrors = {};

      

    if (!form.email.trim()) errors.email = "Email is required.";
    else if (!validateEmail(form.email)) errors.email = "Enter a valid email address.";

    if (!form.password) errors.password = "Password is required.";
    else if (form.password.length < 8) errors.password = "Password must be at least 8 characters.";

    return errors;
}

export default function UXISMLoginPage() {
    const [form, setForm] = useState<LoginForm>(initialLoginForm);
    const [errors, setErrors] = useState<LoginErrors>({});
    const [showPassword, setShowPassword] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [loading, setLoading] = useState(false);
    const auth = useAuth();

    const router = useRouter();
    const [registerHref, setRegisterHref] = useState("/register");

    useEffect(() => {
        if (typeof window === "undefined") return;

        const params = new URLSearchParams(window.location.search);
        const redirect = params.get("redirect");

        setRegisterHref(
            redirect
                ? `/register?redirect=${encodeURIComponent(redirect)}`
                : "/register"
        );
    }, []);

    function updateField<K extends keyof LoginForm>(key: K, value: LoginForm[K]) {
        const nextForm = { ...form, [key]: value };
        setForm(nextForm);
        setErrors((prevErrors) => ({ 
            ...prevErrors, 
            [key]: undefined,
            general: undefined,
             }));
    }

    async function submitLogin(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();

        const nextErrors = validateLogin(form);
        setErrors(nextErrors);
        if (Object.keys(nextErrors).length > 0) return;

        if (!auth?.login) {
            setErrors({
                general: "Authentication service is not ready. Please refresh and try again.",
            });
            return;
        }

        setLoading(true);
        setErrors({});

        try {
            await auth.login({
                email: form.email.trim(),
                password: form.password,
            });

            // window.location.href = "/dashboard";
            const redirectPath = getSafeRedirectFromUrl("/dashboard");

            try {
                await autoJoinRoomFromRedirect(redirectPath);
            } catch (joinError) {
                setErrors({
                    general:
                        joinError instanceof Error
                            ? joinError.message
                            : "Login worked, but joining the room failed.",
                });
                return;
            }

            router.replace(redirectPath);
        } catch (error) {
            setErrors({
                general: getErrorMessage(error, "Login failed. Please check your credentials and try again."),
            });
        } finally {
            setLoading(false);
        }
    }

    return (
        <main className="min-h-screen overflow-hidden bg-[#181818] text-white selection:bg-[#ff6a6a] selection:text-[#171717]">
            <div className="pointer-events-none fixed inset-0 opacity-25 [background-image:radial-gradient(#5b5b5b_1px,transparent_1px)] [background-size:18px_18px]" />

            <div className="pointer-events-none fixed left-4 top-4 h-5 w-5 border-l border-t border-[#5b5b5b]" />
            <div className="pointer-events-none fixed right-4 top-4 h-5 w-5 border-r border-t border-[#5b5b5b]" />
            <div className="pointer-events-none fixed bottom-4 left-4 h-5 w-5 border-b border-l border-[#5b5b5b]" />
            <div className="pointer-events-none fixed bottom-4 right-4 h-5 w-5 border-b border-r border-[#5b5b5b]" />

            <div className="pointer-events-none fixed left-1/2 top-[-130px] h-[340px] w-[340px] -translate-x-1/2 rounded-full bg-[radial-gradient(circle_at_30%_30%,#46B1FF,transparent_35%),radial-gradient(circle_at_70%_40%,#A259FF,transparent_35%),radial-gradient(circle_at_50%_70%,#ff6a6a,transparent_38%),radial-gradient(circle_at_80%_80%,#DEF767,transparent_30%)] opacity-30 blur-3xl" />

            <section className="relative z-10 mx-auto grid min-h-screen w-full max-w-5xl px-5 py-8 md:px-10 lg:grid-cols-[1fr_160px] lg:gap-8">
                <div className="flex min-h-[calc(100vh-64px)] flex-col lg:max-w-[75%]">
                    <header className="space-y-8">
                        <div className="flex items-start justify-between gap-6">
                            <div>
                                <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-[#5b5b5b]">UXISM / LOGIN / 2026</p>
                                <h1 className="mt-3 max-w-[10ch] font-sans text-[40px] uppercase leading-[0.92] tracking-[0.02em] text-white sm:text-[56px]">Welcome to UXISM</h1>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <div className="h-px w-full bg-[#2e2e2e]" />
                            <div className="h-px w-1/2 bg-[#DEF767]" />
                            <div className="flex items-center justify-between font-mono text-[11px] uppercase tracking-[0.14em] text-[#5b5b5b]">
                                <span>credentials check</span>
                                <span>AUTH</span>
                            </div>
                        </div>
                    </header>
                    <div>
                        <AnimatePresence mode="wait">
                            {!submitted ? (
                                <motion.form key="login-form" onSubmit={submitLogin} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -14 }} transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }} className="space-y-8">
                                    <div>
                                        <h2 className="mt-2 font-sans text-2xl uppercase tracking-[0.04em] text-white">Login</h2>
                                    </div>

                                    <div className="space-y-4">
                                        <Field label="Email" error={errors.email}>
                                            <input id="login-email" value={form.email} onChange={(event) => updateField("email", event.target.value)} placeholder="name@domain.com" className="uxism-input" autoComplete="email" />
                                        </Field>

                                        <Field label="Password" error={errors.password}>
                                            <div className="flex border border-[#2e2e2e] bg-[#171717] focus-within:border-[rgba(222,247,103,0.5)]">
                                                <input id="login-password" value={form.password} onChange={(event) => updateField("password", event.target.value)} placeholder="Minimum 8 characters" className="uxism-input border-0" type={showPassword ? "text" : "password"} autoComplete="current-password" />
                                                <button type="button" onClick={() => setShowPassword((value) => !value)} className="grid w-14 place-items-center border-l border-[#2e2e2e] text-[#929292] active:bg-[#ff6a6a] active:text-[#171717]" aria-label={showPassword ? "Hide password" : "Show password"}>
                                                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                                </button>
                                            </div>
                                        </Field>
                                        {errors.general && (
                                            <motion.div
                                                role="alert"
                                                initial={{ opacity: 0, y: -6 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                className="border border-[#ff6a6a]/30 bg-[#ff6a6a]/5 px-4 py-3 font-mono text-[11px] uppercase tracking-[0.1em] text-[#ff6a6a]"
                                            >
                                                <span className="mr-2 opacity-50">AUTH ERROR:</span>
                                                {errors.general}
                                            </motion.div>
                                        )}
                                    </div>

                                    <div className="flex items-center justify-between gap-4 border-y border-[#2e2e2e] py-4">
                                        <button type="button" onClick={() => updateField("remember", !form.remember)} className="flex items-center gap-3 text-left">
                                            <span className={`grid h-5 w-5 place-items-center border ${form.remember ? "border-[#ff6a6a] bg-[#ff6a6a] text-[#171717]" : "border-[#5b5b5b] text-transparent"}`}>
                                                <Check size={13} />
                                            </span>
                                            <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-[#929292]">Stay Logged in</span>
                                        </button>

                                        <button type="button" className="font-mono text-[11px] uppercase tracking-[0.14em] text-[#5b5b5b] active:text-[#DEF767]">
                                            Forgot key?
                                        </button>
                                    </div>

                                    <footer className="flex items-center justify-between gap-3 border-t border-[#2e2e2e] pt-5">
                                        <Link
                                            // href="/register"
                                            href={registerHref}
                                            className="grid h-11 place-items-center border border-[#2e2e2e] px-4 font-mono text-[11px] uppercase tracking-[0.14em] text-[#929292] transition-colors active:border-[rgba(222,247,103,0.5)] active:text-[#DEF767]"
                                        >
                                            Create account
                                        </Link>
                                        <button
                                        type="submit"
                                        disabled={loading}
                                        className={`flex h-11 items-center gap-2 px-5 font-mono text-[11px] uppercase tracking-[0.14em] text-[#171717] transition-opacity disabled:cursor-not-allowed disabled:opacity-60 ${
                                            loading ? "bg-[#c6bbbb]" : "bg-[#ff6a6a]"
                                        }`}
                                    >
                                        {loading ? "Checking..." : "Login"} {!loading && <ArrowRight size={15} />}
                                    </button>
                                    </footer>
                                </motion.form>
                            ) : (
                                <motion.div key="success" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} className="border border-[#2e2e2e] bg-[#171717] p-6">
                                    <div className="grid h-10 w-10 place-items-center rounded-[24px] border border-[rgba(222,247,103,0.5)] text-[#DEF767]">
                                        <Check size={18} />
                                    </div>
                                    <h2 className="mt-6 font-sans text-2xl uppercase tracking-[0.04em] text-white">Access Captured</h2>
                                    <p className="mt-3 max-w-md text-[13px] leading-6 text-[#929292]">Login payload is ready. Replace the console log with your backend authentication request.</p>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>
            </section>

            <style jsx global>{`
                .uxism-input {
                    width: 100%;
                    height: 54px;
                    border: 1px solid #2e2e2e;
                    background: #171717;
                    padding: 0 16px;
                    color: #ffffff;
                    font-size: 13px;
                    line-height: 1.5;
                    outline: none;
                }

                .uxism-input::placeholder {
                    color: #5b5b5b;
                }

                .uxism-input:focus {
                    border-color: rgba(222, 247, 103, 0.5);
                }
            `}</style>
        </main>
    );
}
