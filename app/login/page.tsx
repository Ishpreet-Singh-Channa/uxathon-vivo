"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, Check, Mail } from "lucide-react";
import { useRouter } from "next/navigation";
import Field from "@/components/Field";
import { useAuth } from "@/context/token-context";

type LoginStep = "email" | "otp";

function validateEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === "string") return error;
  return fallback;
}

export default function LoginPage() {
  const auth = useAuth();
  const router = useRouter();
  const [step, setStep] = useState<LoginStep>("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(false);

  async function submitEmail(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setNotice("");

    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) {
      setError("Email is required.");
      return;
    }
    if (!validateEmail(normalizedEmail)) {
      setError("Enter a valid email address.");
      return;
    }

    setLoading(true);
    try {
      await auth.sendOtp(normalizedEmail);
      setEmail(normalizedEmail);
      setStep("otp");
      setNotice("OTP sent. Please check your email.");
    } catch (err) {
      setError(getErrorMessage(err, "Could not send OTP."));
    } finally {
      setLoading(false);
    }
  }

  async function submitOtp(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (!/^\d{6}$/.test(otp.trim())) {
      setError("Enter the 6 digit OTP.");
      return;
    }

    setLoading(true);
    try {
      await auth.verifyOtp(email, otp.trim());
      router.replace("/dashboard");
    } catch (err) {
      setError(getErrorMessage(err, "Login failed."));
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
        <div className="flex min-h-[calc(100vh-64px)] flex-col justify-center lg:max-w-[75%]">
          <header className="space-y-8">
            <div>
              <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-[#5b5b5b]">
                UXISM / LOGIN / OTP
              </p>
              <h1 className="mt-3 max-w-[10ch] font-sans text-[40px] uppercase leading-[0.92] tracking-[0.02em] text-white sm:text-[56px]">
                Welcome to UXISM
              </h1>
            </div>

            <div className="space-y-2">
              <div className="h-px w-full bg-[#2e2e2e]" />
              <div className="h-px w-1/2 bg-[#DEF767]" />
              <div className="flex items-center justify-between font-mono text-[11px] uppercase tracking-[0.14em] text-[#5b5b5b]">
                <span>{step === "email" ? "email check" : "otp check"}</span>
                <span>AUTH</span>
              </div>
            </div>
          </header>

          <motion.div
            key={step}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            className="mt-10"
          >
            {step === "email" ? (
              <form onSubmit={submitEmail} className="space-y-7">
                <div>
                  <h2 className="font-sans text-2xl uppercase tracking-[0.04em] text-white">
                    Login
                  </h2>
                  <p className="mt-2 max-w-md text-[13px] leading-6 text-[#929292]">
                    Enter your email and we will send a one time code.
                  </p>
                </div>

                <Field label="Email" error={error}>
                  <input
                    id="login-email"
                    value={email}
                    onChange={(event) => {
                      setEmail(event.target.value);
                      setError("");
                    }}
                    placeholder="name@domain.com"
                    className="uxism-input"
                    autoComplete="email"
                    inputMode="email"
                  />
                </Field>

                <button
                  type="submit"
                  disabled={loading}
                  className="flex h-11 items-center gap-2 bg-[#ff6a6a] px-5 font-mono text-[11px] uppercase tracking-[0.14em] text-[#171717] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? "Sending..." : "Send OTP"}
                  {!loading && <Mail size={15} />}
                </button>
              </form>
            ) : (
              <form onSubmit={submitOtp} className="space-y-7">
                <div>
                  <h2 className="font-sans text-2xl uppercase tracking-[0.04em] text-white">
                    Enter OTP
                  </h2>
                  <p className="mt-2 max-w-md text-[13px] leading-6 text-[#929292]">
                    Code sent to {email}.
                  </p>
                </div>

                {notice && (
                  <div className="flex items-center gap-2 border border-[rgba(222,247,103,0.5)] bg-[#171717] px-4 py-3 font-mono text-[11px] uppercase tracking-[0.1em] text-[#DEF767]">
                    <Check size={14} />
                    {notice}
                  </div>
                )}

                <Field label="One Time Password" error={error}>
                  <input
                    id="login-otp"
                    value={otp}
                    onChange={(event) => {
                      setOtp(event.target.value.replace(/\D/g, "").slice(0, 6));
                      setError("");
                    }}
                    placeholder="123456"
                    className="uxism-input text-center font-mono text-[18px] tracking-[0.32em]"
                    autoComplete="one-time-code"
                    inputMode="numeric"
                    maxLength={6}
                  />
                </Field>

                <footer className="flex items-center justify-between gap-3 border-t border-[#2e2e2e] pt-5">
                  <button
                    type="button"
                    onClick={() => {
                      setStep("email");
                      setOtp("");
                      setError("");
                      setNotice("");
                    }}
                    className="h-11 border border-[#2e2e2e] px-4 font-mono text-[11px] uppercase tracking-[0.14em] text-[#929292] active:border-[rgba(222,247,103,0.5)] active:text-[#DEF767]"
                  >
                    Change Email
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex h-11 items-center gap-2 bg-[#ff6a6a] px-5 font-mono text-[11px] uppercase tracking-[0.14em] text-[#171717] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {loading ? "Checking..." : "Login"}
                    {!loading && <ArrowRight size={15} />}
                  </button>
                </footer>
              </form>
            )}
          </motion.div>
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
