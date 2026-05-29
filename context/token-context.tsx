"use client";
import { createContext, useContext, useState, ReactNode, useEffect } from "react";

type LoginInput = {
    phone?: string;
    email?: string;
    password: string;
};

type RegisterInput = {
    name: string;
    email: string;
    password: string;
    phone: string;
    company: string;
    skills: string[];
    image?: string;
};

type LoginResponse = {
    data: {
        "jwt-token": string;
        "refresh-token": string;
    };
};

type JwtPayload = {
    exp?: number;
    iat?: number;
    sub?: string;
    [key: string]: unknown;
};

type AuthContextType = {
    login: (input: LoginInput) => Promise<void>;

    getJwt: () => string | null;
    getRefreshToken: () => string | null;
    getData: () => JwtPayload | null;

    logout: () => void;
    register: (input: RegisterInput) => Promise<void>;
};

const AuthContext = createContext<AuthContextType | null>(null);

const JWT_KEY = "jwt-token";
const REFRESH_KEY = "refresh-token";

export function AuthProvider({ children }: { children: ReactNode }) {
    const [, setRefresh] = useState(0);
    const [refreshInterval, setRefreshInterval] = useState<NodeJS.Timeout | null>(null);

    const _startRefreshInterval = (delay: number) => {
        if (refreshInterval) clearInterval(refreshInterval);
        const interval = setTimeout(() => refresh(), delay);
        setRefreshInterval(interval);
    };

    const login = async (input: LoginInput) => {
        const response = await fetch(process.env.NEXT_PUBLIC_BACKEND_URL + "/users/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(input),
        });
        if (!response.ok) throw new Error("Login failed");
        const data: LoginResponse = await response.json();
        console.log("Login successful, received tokens:", data);
        localStorage.setItem(JWT_KEY, data.data["jwt-token"]);
        localStorage.setItem(REFRESH_KEY, data.data["refresh-token"]);
        if (typeof window !== "undefined") {
        localStorage.setItem(JWT_KEY, data.data["jwt-token"]);
        localStorage.setItem(REFRESH_KEY, data.data["refresh-token"]);
    }
        setRefresh((v) => v + 1);
        _startRefreshInterval(1000 * 60); // every one minute
    };

    const register = async (input: RegisterInput) => {
        const response = await fetch(process.env.NEXT_PUBLIC_BACKEND_URL + "/users/", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(input),
        });
        if (!response.ok) throw new Error("Registration failed");
        console.log("in token-context.tsx response:", response)
        const data = await response.json();
        console.log("in token-context.tsx data:", data)

        localStorage.setItem(JWT_KEY, data.data["jwt-token"]);
        localStorage.setItem(REFRESH_KEY, data.data["refresh-token"]);
        setRefresh((v) => v + 1);
        _startRefreshInterval(1000 * 60); // every one minute
    };

    // const getJwt = () => localStorage.getItem(JWT_KEY);
    const getJwt = () => {
    if (typeof window === "undefined") return null;
    return localStorage.getItem(JWT_KEY);
};
    // const getRefreshToken = () => localStorage.getItem(REFRESH_KEY);
    const getRefreshToken = () => {
    if (typeof window === "undefined") return null;
    return localStorage.getItem(REFRESH_KEY);
};
    const getData = (): JwtPayload | null => {
        const token = getJwt();
        if (!token) return null;
        try {
            const payload = token.split(".")[1];
            const decoded = atob(payload);
            return JSON.parse(decoded);
        } catch {
            return null;
        }
    };


    // const refresh = async () => {
    //     const refreshToken = getRefreshToken();
    //     if (!refreshToken) return;
    //     const response = await fetch(process.env.NEXT_PUBLIC_BACKEND_URL + "/users/refresh-token", {
    //         method: "POST",
    //         headers: { "Content-Type": "application/json" },
    //         body: JSON.stringify({ refresh_token: refreshToken }),
    //     });
    //     if (!response.ok) {
    //         logout();
    //         return;
    //     }
    //     const data: LoginResponse = await response.json();
    //     localStorage.setItem(JWT_KEY, data.data["jwt-token"]);
    //     localStorage.setItem(REFRESH_KEY, data.data["refresh-token"]);
    //     setRefresh((v) => v + 1);
    //     _startRefreshInterval(1000 * 60); // every one minute
    // };

    const refresh = async () => {
        // 1. Isolate the core logic
        const performRefresh = async () => {
            // IMPORTANT: We call getRefreshToken() INSIDE the lock.
            // This ensures that if another tab just finished refreshing the token, 
            // this tab will grab the newly updated token from localStorage, 
            // rather than using a stale one.
            const refreshToken = getRefreshToken();
            if (!refreshToken) return;

            const response = await fetch(process.env.NEXT_PUBLIC_BACKEND_URL + "/users/refresh-token", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ refresh_token: refreshToken }),
            });

            if (!response.ok) {
                logout();
                return;
            }

            const data: LoginResponse = await response.json();

            localStorage.setItem(JWT_KEY, data.data["jwt-token"]);
            localStorage.setItem(REFRESH_KEY, data.data["refresh-token"]);
            setRefresh((v) => v + 1);
            _startRefreshInterval(1000 * 60); // every one minute
        };

        // 2. Wrap execution using the exact same lock name as your register/login functions
        if (navigator.locks) {
            await navigator.locks.request("auth-lock", async () => {
                await performRefresh();
            });
        } else {
            // Fallback for unsupported browsers
            console.warn("Web Locks API not supported. Running refresh without a lock.");
            await performRefresh();
        }
    };



    const logout = () => {
        localStorage.removeItem(JWT_KEY);
        localStorage.removeItem(REFRESH_KEY);
        setRefresh((v) => v + 1);
    };

    useEffect(() => {
        console.log("AuthProvider mounted");
        if (getRefreshToken()) refresh();
    }, []);

    return (
        <AuthContext.Provider
            value={{
                login,
                register,
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
