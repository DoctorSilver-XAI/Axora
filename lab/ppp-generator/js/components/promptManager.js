import { SYSTEM_PROMPT } from "../data/prompts.js";

const PROMPT_STORAGE_KEY = "pppCustomPrompt";
const API_KEY_STORAGE_KEY = "openaiApiKey";

export function getDefaultPrompt() {
    return SYSTEM_PROMPT;
}

export function getActivePrompt() {
    try {
        const custom = localStorage.getItem(PROMPT_STORAGE_KEY);
        if (custom && custom.trim()) return custom;
    } catch (err) {
        // ignore storage errors
    }
    return SYSTEM_PROMPT;
}

export function getSavedApiKey() {
    try {
        return localStorage.getItem(API_KEY_STORAGE_KEY) || "";
    } catch (err) {
        return "";
    }
}

export function savePrompt(value = "") {
    try {
        const v = value.trim();
        if (v) {
            localStorage.setItem(PROMPT_STORAGE_KEY, v);
        } else {
            localStorage.removeItem(PROMPT_STORAGE_KEY);
        }
    } catch (err) {
        console.error("Impossible de sauvegarder le prompt personnalisé", err);
    }
}

export function saveApiKey(value = "") {
    try {
        const v = value.trim();
        if (v) {
            localStorage.setItem(API_KEY_STORAGE_KEY, v);
        } else {
            localStorage.removeItem(API_KEY_STORAGE_KEY);
        }
    } catch (err) {
        console.error("Impossible de sauvegarder la clé API", err);
    }
}

export function resetPrompt() {
    try {
        localStorage.removeItem(PROMPT_STORAGE_KEY);
    } catch (err) {
        console.error("Impossible de réinitialiser le prompt", err);
    }
}

export function initPromptUI() {
    const panel = document.getElementById("promptPanel");
    const toggleBtn = document.getElementById("promptToggle");
    const textarea = document.getElementById("promptTextarea");
    const apiKeyInput = document.getElementById("apiKeyInput");
    const saveBtn = document.getElementById("promptSave");
    const resetBtn = document.getElementById("promptReset");
    const closeBtn = document.getElementById("promptClose");

    const fillInputs = () => {
        if (textarea) {
            textarea.value = getActivePrompt();
        }
        if (apiKeyInput) {
            apiKeyInput.value = getSavedApiKey();
        }
    };

    const openPanel = () => {
        if (panel) panel.hidden = false;
        fillInputs();
        if (textarea) textarea.focus();
    };

    const closePanel = () => {
        if (panel) panel.hidden = true;
    };

    if (toggleBtn) {
        toggleBtn.addEventListener("click", openPanel);
    }

    if (saveBtn) {
        saveBtn.addEventListener("click", () => {
            if (textarea) savePrompt(textarea.value || "");
            if (apiKeyInput) saveApiKey(apiKeyInput.value || "");
            closePanel();
        });
    }

    if (resetBtn && textarea) {
        resetBtn.addEventListener("click", () => {
            resetPrompt();
            textarea.value = getDefaultPrompt();
        });
    }

    if (closeBtn) {
        closeBtn.addEventListener("click", closePanel);
    }
}
