import { DEFAULT_AGE_RANGE, themes } from '../data/ppp/config';

// --- Color Utils ---

function hexToRgb(hex: string): { r: number; g: number; b: number } {
    const normalized = hex.replace("#", "");
    const bigint = parseInt(normalized.length === 3 ? normalized.split("").map((c) => c + c).join("") : normalized, 16);
    const r = (bigint >> 16) & 255;
    const g = (bigint >> 8) & 255;
    const b = bigint & 255;
    return { r, g, b };
}

export function withAlpha(hex: string, alpha: number): string {
    const { r, g, b } = hexToRgb(hex);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function getThemeStyles(ageRange: string) {
    const theme = themes[ageRange] || themes[DEFAULT_AGE_RANGE];
    return {
        '--primary-color': theme.primaryColor,
        '--accent-color': theme.accentColor,
        '--bg-color': theme.backgroundColor,
        '--accent-shadow': withAlpha(theme.accentColor, 0.2),
        '--dotted': withAlpha(theme.accentColor, 0.55),
    } as React.CSSProperties;
}


// --- Age Detection Utils ---

export const ageRanges = [
    { value: "18-25", label: "18-25 ans", min: 18, max: 25 },
    { value: "45-50", label: "45-50 ans", min: 45, max: 50 },
    { value: "60-65", label: "60-65 ans", min: 60, max: 65 },
    { value: "70-75", label: "70-75 ans", min: 70, max: 75 }
];

export function detectAgeBucket(text: string = ""): string | null {
    if (!text) return null;
    const matches = [...text.matchAll(/(\d{2})\s*ans/gi)];
    if (!matches.length) return null;

    const ages = matches
        .map((m) => parseInt(m[1], 10))
        .filter((n) => !Number.isNaN(n));

    // Find first age that falls into any defined bucket
    const match = ages.find((age) => ageRanges.some((range) => age >= range.min && age <= range.max));
    if (!match) return null;

    // Return the bucket value
    const bucket = ageRanges.find((range) => match >= range.min && match <= range.max);
    return bucket?.value || null;
}


// --- Text & JSON Utils ---

export function sanitizeJson(text: string): string | null {
    // Handle cases where the model returns code fences or trailing text.
    const fenced = text.match(/```(?:json)?\n?([\s\S]*?)```/i);
    const candidate = fenced ? fenced[1] : text;
    const firstBrace = candidate.indexOf("{");
    const lastBrace = candidate.lastIndexOf("}");
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
        return candidate.slice(firstBrace, lastBrace + 1);
    }
    return null;
}

export function sanitizeList(list: string[] = []): string[] {
    const toPlain = (value: any) => {
        if (typeof value !== "string") return "";
        try {
            const parser = new DOMParser();
            const doc = parser.parseFromString(value, "text/html");
            return doc.body.textContent || "";
        } catch (err) {
            return value.replace(/<[^>]*>/g, "");
        }
    };

    return list.map((item) => {
        const plain = toPlain(item).replace(/—/g, "-");
        return plain
            .replace(/\s*•\s*/g, "\n• ")
            .trim();
    });
}
