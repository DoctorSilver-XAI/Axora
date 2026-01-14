import { DEFAULT_AGE_RANGE } from "../config.js";

export const ageRanges = [
    { value: "18-25", label: "18-25 ans", min: 18, max: 25 },
    { value: "45-50", label: "45-50 ans", min: 45, max: 50 },
    { value: "60-65", label: "60-65 ans", min: 60, max: 65 },
    { value: "70-75", label: "70-75 ans", min: 70, max: 75 }
];

export function populateAgeSelect(select) {
    if (!select) return;
    select.innerHTML = "";
    ageRanges.forEach((range) => {
        const option = document.createElement("option");
        option.value = range.value;
        option.textContent = range.label;
        if (range.value === DEFAULT_AGE_RANGE) {
            option.selected = true;
        }
        select.appendChild(option);
    });
    if (!select.value) {
        select.value = DEFAULT_AGE_RANGE;
    }
}

export function detectAgeBucket(text = "") {
    if (!text) return null;
    const matches = [...text.matchAll(/(\d{2})\s*ans/gi)];
    if (!matches.length) return null;
    const ages = matches
        .map((m) => parseInt(m[1], 10))
        .filter((n) => !Number.isNaN(n));
    const match = ages.find((age) => ageRanges.some((range) => age >= range.min && age <= range.max));
    if (!match) return null;
    const bucket = ageRanges.find((range) => match >= range.min && match <= range.max);
    return bucket?.value || null;
}

export function applyAgeSelection(select, bucket) {
    if (!select || !bucket) return;
    const exists = ageRanges.some((range) => range.value === bucket);
    if (!exists) return;
    if (select.value === bucket) return;
    select.value = bucket;
    select.dispatchEvent(new Event("change"));
}
