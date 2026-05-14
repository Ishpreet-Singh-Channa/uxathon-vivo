"use client";
import { useAuth } from "@/context/token-context";
export default function Home() {
    const auth = useAuth();

    const handleSubmit = () => {
        const email = (document.getElementById("input-email") as HTMLInputElement).value || null;
        const password = (document.getElementById("input-password") as HTMLInputElement).value;
        const phone = (document.getElementById("input-phone") as HTMLInputElement).value || null;

        auth?.login({ email: email || undefined, password, phone: phone || undefined }).then(() => (window.location.href = "/dashboard"));
    };

    return (
        <div>
            <label className="text-white" htmlFor="input-email">
                Email:
            </label>
            <input id="input-email" type="email" /> <br />
            <label className="text-white" htmlFor="input-password">
                Password:
            </label>
            <input id="input-password" type="password" /> <br />
            <label className="text-white" htmlFor="input-phone">
                Phone:
            </label>
            <input id="input-phone" type="tel" /> <br />
            <button id="submit-button" onClick={handleSubmit}>
                Submit
            </button>
        </div>
    );
}
