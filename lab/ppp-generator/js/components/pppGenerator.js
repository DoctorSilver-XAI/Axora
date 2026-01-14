import { DEFAULT_AGE_RANGE, themes } from "../config.js";
import { templates } from "../data/templates.js";

function hexToRgb(hex) {
    const normalized = hex.replace("#", "");
    const bigint = parseInt(normalized.length === 3 ? normalized.split("").map((c) => c + c).join("") : normalized, 16);
    const r = (bigint >> 16) & 255;
    const g = (bigint >> 8) & 255;
    const b = bigint & 255;
    return { r, g, b };
}

function mixWithWhite(hex, amount = 0.2) {
    const { r, g, b } = hexToRgb(hex);
    const mix = (channel) => Math.round(channel + (255 - channel) * amount);
    return `rgb(${mix(r)}, ${mix(g)}, ${mix(b)})`;
}

function withAlpha(hex, alpha) {
    const { r, g, b } = hexToRgb(hex);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function setEditableTargets() {
    document.querySelectorAll(".grid .column .lines li, .follow-line").forEach((el) => {
        el.setAttribute("contenteditable", "true");
        el.setAttribute("aria-label", "Zone de saisie");
    });
}

function applyTheme(ageRange, ageLabel) {
    const theme = themes[ageRange] || themes[DEFAULT_AGE_RANGE];
    if (!theme) return;

    const root = document.documentElement;
    root.style.setProperty("--primary-color", theme.primaryColor);
    root.style.setProperty("--accent-color", theme.accentColor);
    root.style.setProperty("--bg-color", theme.backgroundColor);

    const accent = theme.accentColor;
    root.style.setProperty("--accent-shadow", withAlpha(accent, 0.2));
    root.style.setProperty("--dotted", withAlpha(accent, 0.55));

    if (ageLabel) {
        ageLabel.textContent = `${ageRange} ans`;
    }
}

function fillColumn(columnIndex, items = []) {
    const column = document.querySelectorAll(".grid .column")[columnIndex];
    if (!column) return;

    const lines = column.querySelectorAll(".lines li");
    let lastFilledIndex = -1;

    // 1. Remplir le contenu et repérer la dernière ligne utilisée
    lines.forEach((line, index) => {
        const text = items[index] || "";
        line.textContent = text;
        if (text.trim() !== "") {
            lastFilledIndex = index;
        }
    });

    // 2. Masquer les lignes excédentaires (garder 2 lignes vides buffer)
    const threshold = lastFilledIndex + 2;
    lines.forEach((line, index) => {
        if (index <= threshold) {
            line.style.display = "";
        } else {
            line.style.display = "none";
        }
    });
}

function fillFollow(items = []) {
    const lines = document.querySelectorAll(".follow-line");
    let lastFilledIndex = -1;

    lines.forEach((line, index) => {
        const text = items[index] || "";
        line.textContent = text;
        if (text.trim() !== "") {
            lastFilledIndex = index;
        }
    });

    const threshold = lastFilledIndex + 2; // Garde au moins 2 lignes si possible, ou tout ce qu'il y a
    lines.forEach((line, index) => {
        if (index <= threshold) {
            line.style.display = "";
        } else {
            line.style.display = "none";
        }
    });
}

function clearAll() {
    document.querySelectorAll(".grid .column .lines li").forEach((line) => {
        line.textContent = "";
        line.style.display = ""; // Réafficher toutes les lignes
    });
    document.querySelectorAll(".follow-line").forEach((line) => {
        line.textContent = "";
        line.style.display = ""; // Réafficher toutes les lignes
    });
}

function applyTemplate(ageRange) {
    const data = templates[ageRange];
    if (!data) return;

    fillColumn(0, data.priorities);
    fillColumn(1, data.freins);
    fillColumn(2, data.conseils);
    fillColumn(3, data.ressources);
    fillFollow(data.suivi || []);
}

export function fillFromAI(data) {
    if (!data) return;
    const toPlain = (value) => {
        if (typeof value !== "string") return "";
        try {
            const parser = new DOMParser();
            const doc = parser.parseFromString(value, "text/html");
            return doc.body.textContent || "";
        } catch (err) {
            return value.replace(/<[^>]*>/g, "");
        }
    };
    const sanitizeList = (list = []) =>
        list.map((item) => {
            const plain = toPlain(item).replace(/—/g, "-");
            return plain
                .replace(/\s*•\s*/g, "\n• ")
                .trim();
        });

    const priorities = [
        ...(data.priorities || []),
        ...(data.vaccins_depistages || [])
    ];

    fillColumn(0, sanitizeList(priorities));
    fillColumn(1, sanitizeList(data.freins || []));
    fillColumn(2, sanitizeList(data.conseils || []));
    fillColumn(3, sanitizeList(data.ressources || []));
    fillFollow(sanitizeList(data.suivi || []));
}

export function initPPPGenerator() {
    const ageSelect = document.getElementById("ageRange");
    const ageLabel = document.querySelector(".age");
    const fillButton = document.getElementById("fillExample");
    const clearButton = document.getElementById("clearExample");

    if (!ageSelect) return;

    setEditableTargets();

    const initialAge = ageSelect.value || DEFAULT_AGE_RANGE;
    ageSelect.value = initialAge;
    applyTheme(initialAge, ageLabel);

    ageSelect.addEventListener("change", (event) => {
        applyTheme(event.target.value, ageLabel);
    });

    if (fillButton) {
        fillButton.addEventListener("click", () => {
            applyTemplate(ageSelect.value || DEFAULT_AGE_RANGE);
        });
    }

    if (clearButton) {
        clearButton.addEventListener("click", () => {
            clearAll();
        });
    }
}
