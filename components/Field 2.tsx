export default function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
    return (
        <label className="block space-y-2">
            <span className="flex items-center justify-between font-mono text-[11px] uppercase tracking-[0.14em] text-[#5b5b5b]">{label}</span>
            {children}
            {error && <span className="block text-[12px] leading-5 text-[#ff6a6a]">{error}</span>}
        </label>
    );
}
