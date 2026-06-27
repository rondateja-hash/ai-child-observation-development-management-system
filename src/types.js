export function getChildAvatar(gender, name) {
    if (gender) {
        const g = gender.toLowerCase().trim();
        if (g === 'female' || g === 'girl') {
            return "https://images.unsplash.com/photo-1516627145497-ae6968895b74?w=150";
        }
    }
    if (name) {
        const lowerName = name.toLowerCase();
        if (lowerName.includes("sree") ||
            lowerName.includes("priya") ||
            lowerName.includes("sneha") ||
            lowerName.includes("teja") ||
            lowerName.includes("kalavathi") ||
            lowerName.includes("ronda") ||
            lowerName.includes("sheela") ||
            lowerName.includes("anitha")) {
            return "https://images.unsplash.com/photo-1516627145497-ae6968895b74?w=150";
        }
    }
    return "https://images.unsplash.com/photo-1503919545889-aef636e10ad4?w=150";
}
export function getUserAvatar(gender, name, role) {
    if (gender) {
        const g = gender.toLowerCase().trim();
        if (g === 'female') {
            return "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150";
        }
    }
    if (name) {
        const lowerName = name.toLowerCase();
        if (lowerName.includes("priya") ||
            lowerName.includes("sneha") ||
            lowerName.includes("teja") ||
            lowerName.includes("kalavathi") ||
            lowerName.includes("ronda") ||
            lowerName.includes("priti") ||
            lowerName.includes("sheela") ||
            lowerName.includes("anitha")) {
            return "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150";
        }
    }
    return "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150";
}
