"use client";
import { useAuth } from "@/context/token-context";
export default function Home() {
    const auth = useAuth();

    const handleSubmit = () => {
        console.log(auth?.getJwt()); // Example usage of the auth context

        const name = (document.getElementById("input-name") as HTMLInputElement).value;
        const email = (document.getElementById("input-email") as HTMLInputElement).value;
        const password = (document.getElementById("input-password") as HTMLInputElement).value;
        const phone = (document.getElementById("input-phone") as HTMLInputElement).value;
        const company = (document.getElementById("input-company") as HTMLInputElement).value;
        const skills = (document.getElementById("skills") as HTMLInputElement).value;

        auth?.register({ name, email, password, phone, company, skills: skills.split(",").map((s) => s.trim()) }).then(() => (window.location.href = "/dashboard"));
    };

    return (
        <div>
            <label htmlFor="input-name">Name:</label>
            <input id="input-name" type="text" /> <br />
            <label htmlFor="input-email">Email:</label>
            <input id="input-email" type="email" /> <br />
            <label htmlFor="input-password">Password:</label>
            <input id="input-password" type="password" /> <br />
            <label htmlFor="input-phone">Phone:</label>
            <input id="input-phone" type="tel" /> <br />
            <label htmlFor="input-company">Company:</label>
            <input id="input-company" type="text" /> <br />
            <input id="skills" type="text" placeholder="Enter your skills, e.g., JavaScript, Python" /> <br />
            <button id="submit-button" onClick={handleSubmit}>
                Submit
            </button>
        </div>
    );
}
