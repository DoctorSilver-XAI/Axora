export const DEFAULT_AGE_RANGE = "45-50";

export const OPENAI_CONFIG = {
    // IMPORTANT: Configurez votre clé API OpenAI ici ou via une variable d'environnement
    // Ne commitez JAMAIS votre vraie clé API dans le code source
    API_KEY: "",
    MODEL: "gpt-4o",
    MAX_TOKENS: 2000
};

export const themes = {
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
