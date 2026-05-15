import Link from "next/link";

export default function DashboardPage() {
    return (
        <div>
            <h1>Dashboard</h1>
            <ul>
                <li>
                    <Link href="/live">Go to Live Page</Link>
                </li>
                <li>
                    <Link href="/profile">Go to Profile Page</Link>
                </li>
            </ul>
        </div>
    );
}
