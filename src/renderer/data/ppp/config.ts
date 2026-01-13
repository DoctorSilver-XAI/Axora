export const DEFAULT_AGE_RANGE = "45-50";

export const OPENAI_CONFIG = {
    // Note: In a real secure app, API keys should not be hardcoded in frontend.
    // However, we are porting strictly from the legacy project which had this structure.
    API_KEY: "YOUR_API_KEY_HERE",
    MODEL: "gpt-4o",
    MAX_TOKENS: 2000
};

export const themes: Record<string, { primaryColor: string; accentColor: string; backgroundColor: string }> = {
    "18-25": {
        primaryColor: "#EBBF23", // Jaune Moutarde
        accentColor: "#EBBF23",
        backgroundColor: "#fff",
    },
    "45-50": {
        primaryColor: "#009689", // Vert Teal
        accentColor: "#009689",
        backgroundColor: "#fff",
    },
    "60-65": {
        primaryColor: "#C34A81", // Rose/Magenta
        accentColor: "#C34A81",
        backgroundColor: "#fff",
    },
    "70-75": {
        primaryColor: "#F2804A", // Orange Saumon
        accentColor: "#F2804A",
        backgroundColor: "#fff",
    }
};

// List of pharmacists for the dropdown (from original ppp-pharmacie)
export const PHARMACISTS = [
    "Clara El Rawadi",
    "Emma Cohen",
    "François Claron",
    "Gauthier Humbert",
    "Marjorie Lahaie",
    "Pierre Gil"
];

// Default pharmacy name
export const PHARMACY_NAME = "Grande Pharmacie de Tassigny";
