import {
    AlertTriangle,
    Ban,
    Car,
    Flame,
    HelpCircle,
    Megaphone,
    Skull,
    XCircle,
} from "lucide-react";

export const getCrimeIcon = (type: string) => {
    switch (type) {
        case "Fire":
            return <Flame className="h-5 w-5 text-orange-500" />;
        case "Theft":
        case "Robbery":
        case "Burglary":
            return <AlertTriangle className="h-5 w-5 text-red-500" />;
        case "Accident":
            return <Car className="h-5 w-5 text-blue-500" />;
        case "Drugs":
            return <Skull className="h-5 w-5 text-purple-500" />;
        case "Vandalism":
            return <XCircle className="h-5 w-5 text-yellow-600" />;
        case "Assault":
            return <Ban className="h-5 w-5 text-red-700" />;
        case "Noise":
            return <Megaphone className="h-5 w-5 text-cyan-500" />;
        default:
            return <HelpCircle className="h-5 w-5 text-slate-400" />;
    }
};
