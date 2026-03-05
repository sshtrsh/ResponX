import { Search, X } from "lucide-react";

interface SearchBarProps {
    value: string;
    onChange: (value: string) => void;
}

export function SearchBar({ value, onChange }: SearchBarProps) {
    return (
        <div className="mb-5 flex items-center gap-3">
            <div className="flex flex-1 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 shadow-sm focus-within:border-slate-400 focus-within:ring-2 focus-within:ring-slate-100 transition">
                <Search className="h-4 w-4 text-slate-300 shrink-0" />
                <input
                    type="text"
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder="Search by location, reporter, or incident type…"
                    className="w-full bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-300"
                />
                {value && (
                    <button onClick={() => onChange("")} className="text-slate-300 hover:text-slate-500 transition">
                        <X size={14} />
                    </button>
                )}
            </div>
        </div>
    );
}
