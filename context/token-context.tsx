"use client";
import { createContext, useContext, useState, ReactNode } from "react";
import { sendLoginOtp, verifyLoginOtp } from "@/lib/api";

type JwtPayload = {
    exp?: number;
    iat?: number;
    sub?: string;
    [key: string]: unknown;
};

type AuthContextType = {
    sendOtp: (email: string) => Promise<void>;
    verifyOtp: (email: string, otp: string) => Promise<void>;
    getJwt: () => string | null;
    getRefreshToken: () => string | null;
    getData: () => JwtPayload | null;
    logout: () => void;
};

const AuthContext = createContext<AuthContextType | null>(null);

const JWT_KEY = "jwt-token";
const REFRESH_KEY = "refresh-token";

export function AuthProvider({ children }: { children: ReactNode }) {
    const [, setRefresh] = useState(0);

    const sendOtp = async (email: string) => {
        await sendLoginOtp({ email });
    };

    const verifyOtp = async (email: string, otp: string) => {
        const tokens = await verifyLoginOtp({ email, otp });
        localStorage.setItem(JWT_KEY, tokens.jwtToken);
        // localStorage.setItem(REFRESH_KEY, tokens.refreshToken);
        setRefresh((v) => v + 1);
    };

    const getJwt = () => {
        if (typeof window === "undefined") return null;
        return localStorage.getItem(JWT_KEY);
    };

    const getRefreshToken = () => {
        if (typeof window === "undefined") return null;
        return localStorage.getItem(REFRESH_KEY);
    };

    const getData = (): JwtPayload | null => {
        const token = getJwt();
        if (!token) return null;
        try {
            const payload = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
            const decoded = atob(payload);
            return JSON.parse(decoded);
        } catch {
            return null;
        }
    };

    const logout = () => {
        localStorage.removeItem(JWT_KEY);
        localStorage.removeItem(REFRESH_KEY);
        setRefresh((v) => v + 1);
    };

    return (
        <AuthContext.Provider
            value={{
                sendOtp,
                verifyOtp,
                getJwt,
                getRefreshToken,
                getData,
                logout,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) throw new Error("useAuth must be used inside AuthProvider");
    return context;
}
