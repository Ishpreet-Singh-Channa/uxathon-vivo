// "use client";

// import React, { useState, useEffect } from "react";
// import { motion, AnimatePresence } from "framer-motion";

// export type TextEffect = "blur-reveal" | "masked-slide" | "highlight" | "marquee" | "scramble";
// export type FontType = "sans" | "sans" | "mono" | "display";

// interface AnimatedBannerProps {
//     text: string;
//     effect: TextEffect;
//     speed?: number; // Speed multiplier (e.g. 0.5x to 3x, default 1)
//     blurStrength?: number; // Blur strength in pixels (default 12)
//     font?: FontType; // Optional custom font family override
//     fontSize?: number; // Main heading font size override in pixels
//     repeat?: boolean; // Infinite repeat option for one-shot effects
// }

// const fontStyleMap: Record<FontType, string> = {
//     sans: "Georgia, sans",
//     sans: "system-ui, -apple-system, sans-sans",
//     mono: "var(--font-mono), Courier New, Courier, monospace",
//     display: 'Impact, Haettenschweiler, "Arial Narrow Bold", sans-sans'
// };

// export function AnimatedBanner({ text, effect, speed = 1, blurStrength = 12, font, fontSize, repeat = false }: AnimatedBannerProps) {
//     const animSpeed = Math.max(0.1, speed);
//     const animBlur = Math.max(0, blurStrength);

//     // Determine font family: use custom override if provided, otherwise default to effect preferences
//     const defaultFont: FontType = effect === "scramble" ? "mono" : effect === "blur-reveal" ? "sans" : "sans";
//     const selectedFont = fontStyleMap[font || defaultFont];

//     // Calculate Marquee Rotation Speed (duration in seconds)
//     const marqueeDuration = Math.max(1, 20 / animSpeed);

//     return (
//         <div 
//             className="w-full flex items-center justify-center overflow-hidden border border-[#2e2e2e] p-8 rounded min-h-[140px] relative"
//             style={{ backgroundColor: "var(--bg-inset)" }}
//         >
//             <AnimatePresence mode="wait">
//                 <motion.div
//                     key={`${text}-${effect}-${animSpeed}-${animBlur}-${selectedFont}`}
//                     initial={{ opacity: 0 }}
//                     animate={{ opacity: 1 }}
//                     exit={{ opacity: 0 }}
//                     transition={{ duration: 0.3 / animSpeed }}
//                     className="w-full flex justify-center items-center"
//                 >
//                     {/* 1. Apple-Style Blur Reveal */}
//                     {effect === "blur-reveal" && (
//                         <motion.h1
//                             initial={{ filter: `blur(${animBlur}px)`, opacity: 0, scale: 0.95 }}
//                             animate={{ filter: "blur(0px)", opacity: 1, scale: 1 }}
//                             transition={{ 
//                                 duration: 1.2 / animSpeed, 
//                                 ease: "easeOut",
//                                 repeat: repeat ? Infinity : 0,
//                                 repeatType: "reverse",
//                                 repeatDelay: 2
//                             }}
//                             className="text-2xl md:text-4xl lg:text-5xl font-bold tracking-tight text-white text-center"
//                             style={{ fontFamily: selectedFont, fontSize: fontSize ? `${fontSize}px` : undefined }}
//                         >
//                             {text}
//                         </motion.h1>
//                     )}

//                     {/* 2. Agency Masked Slide-Up */}
//                     {effect === "masked-slide" && (
//                         <div className="overflow-hidden py-2">
//                             <motion.h1
//                                 initial={{ y: "100%" }}
//                                 animate={{ y: "0%" }}
//                                 transition={{ 
//                                     duration: 0.9 / animSpeed, 
//                                     ease: [0.16, 1, 0.3, 1],
//                                     repeat: repeat ? Infinity : 0,
//                                     repeatType: "loop",
//                                     repeatDelay: 2
//                                 }}
//                                 className="text-2xl md:text-4xl lg:text-5xl font-black uppercase text-white text-center tracking-wide"
//                                 style={{ fontFamily: selectedFont, fontSize: fontSize ? `${fontSize}px` : undefined }}
//                             >
//                                 {text}
//                             </motion.h1>
//                         </div>
//                     )}

//                     {/* 3. SaaS Animated Highlight */}
//                     {effect === "highlight" && (
//                         <h1 className="text-2xl md:text-4xl lg:text-5xl font-bold text-white text-center" style={{ fontFamily: selectedFont, fontSize: fontSize ? `${fontSize}px` : undefined }}>
//                             <span className="relative inline-block px-4 py-1 text-black">
//                                 <motion.span
//                                     className="absolute inset-0 bg-[#DEF767] rounded"
//                                     initial={{ scaleX: 0 }}
//                                     animate={{ scaleX: 1 }}
//                                     style={{ originX: 0 }}
//                                     transition={{ 
//                                         duration: 0.9 / animSpeed, 
//                                         delay: 0.2 / animSpeed, 
//                                         ease: "easeInOut",
//                                         repeat: repeat ? Infinity : 0,
//                                         repeatType: "reverse",
//                                         repeatDelay: 2
//                                     }}
//                                 />
//                                 <span className="relative z-10">{text}</span>
//                             </span>
//                         </h1>
//                     )}

//                     {/* 4. Trendy Infinite Marquee */}
//                     {effect === "marquee" && (
//                         <div className="relative w-full overflow-hidden whitespace-nowrap py-4">
//                             <style>{`
//                                 @keyframes customMarquee {
//                                     0% { transform: translateX(0%); }
//                                     100% { transform: translateX(-50%); }
//                                 }
//                                 .animate-custom-marquee {
//                                     display: inline-block;
//                                     white-space: nowrap;
//                                 }
//                             `}</style>
//                             <div 
//                                 className="animate-custom-marquee"
//                                 style={{
//                                     animation: `customMarquee ${marqueeDuration}s linear infinite`
//                                 }}
//                             >
//                                 <span 
//                                     className="text-2xl md:text-4xl lg:text-5xl font-black uppercase text-[#DEF767] tracking-wider mx-4"
//                                     style={{ fontFamily: selectedFont, fontSize: fontSize ? `${fontSize}px` : undefined }}
//                                 >
//                                     {text} • {text} • {text} • {text} •
//                                 </span>
//                                 <span 
//                                     className="text-2xl md:text-4xl lg:text-5xl font-black uppercase text-[#DEF767] tracking-wider mx-4"
//                                     style={{ fontFamily: selectedFont, fontSize: fontSize ? `${fontSize}px` : undefined }}
//                                 >
//                                     {text} • {text} • {text} • {text} •
//                                 </span>
//                             </div>
//                         </div>
//                     )}

//                     {/* 5. Hacker Text Scramble / Decode */}
//                     {effect === "scramble" && (
//                         <h1 
//                             className="text-xl md:text-3xl lg:text-4xl font-mono text-[#DEF767] text-center tracking-wider"
//                             style={{ fontFamily: selectedFont, fontSize: fontSize ? `${fontSize}px` : undefined }}
//                         >
//                             <ScrambleText text={text} speed={animSpeed} repeat={repeat} />
//                         </h1>
//                     )}
//                 </motion.div>
//             </AnimatePresence>
//         </div>
//     );
// }

// function ScrambleText({ text, speed, repeat }: { text: string; speed: number; repeat?: boolean }) {
//     const [displayedText, setDisplayedText] = useState("");
//     const [triggerKey, setTriggerKey] = useState(0);
//     const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789@#$%-=!?";

//     useEffect(() => {
//         let isMounted = true;
//         let iterations = 0;
//         const intervalTime = Math.max(8, Math.round(25 / speed));

//         const interval = setInterval(() => {
//             if (!isMounted) return;

//             const result = text
//                 .split("")
//                 .map((char, index) => {
//                     if (index < iterations) {
//                         return text[index];
//                     }
//                     if (char === " ") return " ";
//                     return chars[Math.floor(Math.random() * chars.length)];
//                 })
//                 .join("");

//             setDisplayedText(result);

//             if (iterations >= text.length) {
//                 clearInterval(interval);
//                 if (repeat) {
//                     setTimeout(() => {
//                         if (isMounted) {
//                             setTriggerKey((prev) => prev + 1);
//                         }
//                     }, 3000);
//                 }
//             }
//             iterations += speed / 3.5; // Decode pace proportional to speed setting
//         }, intervalTime);

//         return () => {
//             isMounted = false;
//             clearInterval(interval);
//         };
//     }, [text, speed, triggerKey, repeat]);

//     return <span>{displayedText}</span>;
// }




"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

export type TextEffect = "blur-reveal" | "masked-slide" | "highlight" | "marquee" | "scramble";
export type FontType = "sans" | "sans" | "mono" | "display";

interface AnimatedBannerProps {
    text: string;
    effect: TextEffect;
    speed?: number; // Speed multiplier (e.g. 0.5x to 3x, default 1)
    blurStrength?: number; // Blur strength in pixels (default 12)
    font?: FontType; // Optional custom font family override
    fontSize?: number; // Main heading font size override in pixels
    repeat?: boolean; // Infinite repeat option for one-shot effects
    color?: string; // Custom text color hex code
}

const fontStyleMap: Record<FontType, string> = {
    // sans: "Georgia, sans",
    // sans: "var(--font-geist-sans), system-ui, sans-sans",
    sans: "system-ui, -apple-system, sans-sans",
    mono: "var(--font-mono), Courier New, Courier, monospace",
    display: 'Impact, Haettenschweiler, "Arial Narrow Bold", sans-sans'
};

export function AnimatedBanner({ text, effect, speed = 1, blurStrength = 12, font, fontSize, repeat = false, color = "#ffffff" }: AnimatedBannerProps) {
    const animSpeed = Math.max(0.1, speed);
    const animBlur = Math.max(0, blurStrength);
    console.log(color)
    // Determine font family: use custom override if provided, otherwise default to effect preferences
    const defaultFont: FontType = effect === "scramble" ? "mono" : effect === "blur-reveal" ? "sans" : "sans";
    const selectedFont = fontStyleMap[font || defaultFont];

    // Calculate Marquee Rotation Speed (duration in seconds)
    const marqueeDuration = Math.max(1, 20 / animSpeed);

    return (
        <div
            className="w-full flex items-center justify-center overflow-hidden border border-[#2e2e2e] p-8 rounded min-h-[140px] relative"
            style={{ backgroundColor: "var(--bg-inset)" }}
        >
            <AnimatePresence mode="wait">
                <motion.div
                    key={`${text}-${effect}-${animSpeed}-${animBlur}-${selectedFont}`}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 / animSpeed }}
                    className="w-full flex justify-center items-center"
                >
                    {/* 1. Apple-Style Blur Reveal */}
                    {effect === "blur-reveal" && (
                        <motion.h1
                            initial={{ filter: `blur(${animBlur}px)`, opacity: 0, scale: 0.95 }}
                            animate={{ filter: "blur(0px)", opacity: 1, scale: 1 }}
                            transition={{
                                duration: 1.2 / animSpeed,
                                ease: "easeOut",
                                repeat: repeat ? Infinity : 0,
                                repeatType: "reverse",
                                repeatDelay: 2
                            }}
                            className="text-2xl md:text-4xl lg:text-5xl font-bold tracking-tight text-white text-center"
                            style={{ fontFamily: selectedFont, fontSize: fontSize ? `${fontSize}px` : undefined, color: color }}
                        >
                            {text}
                        </motion.h1>
                    )}

                    {/* 2. Agency Masked Slide-Up */}
                    {effect === "masked-slide" && (
                        <div className="overflow-hidden py-2">
                            <motion.h1
                                initial={{ y: "100%" }}
                                animate={{ y: "0%" }}
                                transition={{
                                    duration: 0.9 / animSpeed,
                                    ease: [0.16, 1, 0.3, 1],
                                    repeat: repeat ? Infinity : 0,
                                    repeatType: "loop",
                                    repeatDelay: 2
                                }}
                                className="text-2xl md:text-4xl lg:text-5xl font-black uppercase text-white text-center tracking-wide"
                                style={{ fontFamily: selectedFont, fontSize: fontSize ? `${fontSize}px` : undefined, color: color }}
                            >
                                {text}
                            </motion.h1>
                        </div>
                    )}

                    {/* 3. SaaS Animated Highlight */}
                    {effect === "highlight" && (
                        <h1 className="text-2xl md:text-4xl lg:text-5xl font-bold text-white text-center" style={{ fontFamily: selectedFont, fontSize: fontSize ? `${fontSize}px` : undefined, color: color }}>
                            <span className="relative inline-block px-4 py-1 text-black">
                                <motion.span
                                    className="absolute inset-0 bg-[#DEF767] rounded"
                                    initial={{ scaleX: 0 }}
                                    animate={{ scaleX: 1 }}
                                    style={{ originX: 0 }}
                                    transition={{
                                        duration: 0.9 / animSpeed,
                                        delay: 0.2 / animSpeed,
                                        ease: "easeInOut",
                                        repeat: repeat ? Infinity : 0,
                                        repeatType: "reverse",
                                        repeatDelay: 2
                                    }}
                                />
                                <span className="relative z-10">{text}</span>
                            </span>
                        </h1>
                    )}

                    {/* 4. Trendy Infinite Marquee */}
                    {effect === "marquee" && (
                        <div className="relative w-full overflow-hidden whitespace-nowrap py-4">
                            <style>{`
                                @keyframes customMarquee {
                                    0% { transform: translateX(0%); }
                                    100% { transform: translateX(-50%); }
                                }
                                .animate-custom-marquee {
                                    display: inline-block;
                                    white-space: nowrap;
                                }
                            `}</style>
                            <div
                                className="animate-custom-marquee"
                                style={{
                                    animation: `customMarquee ${marqueeDuration}s linear infinite`
                                }}
                            >
                                <span
                                    className="text-2xl md:text-4xl lg:text-5xl font-black uppercase text-[#DEF767] tracking-wider mx-4"
                                    style={{ fontFamily: selectedFont, fontSize: fontSize ? `${fontSize}px` : undefined, color: color }}
                                >
                                    {text} • {text} • {text} • {text} •
                                </span>
                                <span
                                    className="text-2xl md:text-4xl lg:text-5xl font-black uppercase text-[#DEF767] tracking-wider mx-4"
                                    style={{ fontFamily: selectedFont, fontSize: fontSize ? `${fontSize}px` : undefined, color: color }}
                                >
                                    {text} • {text} • {text} • {text} •
                                </span>
                            </div>
                        </div>
                    )}

                    {/* 5. Hacker Text Scramble / Decode */}
                    {effect === "scramble" && (
                        <h1
                            className="text-xl md:text-3xl lg:text-4xl font-mono text-[#DEF767] text-center tracking-wider"
                            style={{ fontFamily: selectedFont, fontSize: fontSize ? `${fontSize}px` : undefined, color: color }}
                        >
                            <ScrambleText text={text} speed={animSpeed} repeat={repeat} />
                        </h1>
                    )}
                </motion.div>
            </AnimatePresence>
        </div>
    );
}

function ScrambleText({ text, speed, repeat }: { text: string; speed: number; repeat?: boolean }) {
    const [displayedText, setDisplayedText] = useState("");
    const [triggerKey, setTriggerKey] = useState(0);
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789@#$%-=!?";

    useEffect(() => {
        let isMounted = true;
        let iterations = 0;
        const intervalTime = Math.max(8, Math.round(25 / speed));

        const interval = setInterval(() => {
            if (!isMounted) return;

            const result = text
                .split("")
                .map((char, index) => {
                    if (index < iterations) {
                        return text[index];
                    }
                    if (char === " ") return " ";
                    return chars[Math.floor(Math.random() * chars.length)];
                })
                .join("");

            setDisplayedText(result);

            if (iterations >= text.length) {
                clearInterval(interval);
                if (repeat) {
                    setTimeout(() => {
                        if (isMounted) {
                            setTriggerKey((prev) => prev + 1);
                        }
                    }, 3000);
                }
            }
            iterations += speed / 3.5; // Decode pace proportional to speed setting
        }, intervalTime);

        return () => {
            isMounted = false;
            clearInterval(interval);
        };
    }, [text, speed, triggerKey, repeat]);

    return <span>{displayedText}</span>;
}
