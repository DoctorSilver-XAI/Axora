import { OPENAI_CONFIG } from "../config.js";
import { getActivePrompt } from "../components/promptManager.js";

function buildImageDataUrl(imageBase64) {
    const raw = typeof imageBase64 === "string" ? imageBase64.trim() : "";
    if (!raw) return null;
    return raw.startsWith("data:")
        ? raw
        : `data:image/png;base64,${raw}`;
}

function sanitizeJson(text) {
    // Handle cases where the model returns code fences or trailing text.
    const fenced = text.match(/```(?:json)?\\n?([\\s\\S]*?)```/i);
    const candidate = fenced ? fenced[1] : text;
    const firstBrace = candidate.indexOf("{");
    const lastBrace = candidate.lastIndexOf("}");
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
        return candidate.slice(firstBrace, lastBrace + 1);
    }
    return null;
}

export async function generatePPP(imageBase64, notes, ageRange) {
    let apiKey = "";
    try {
        apiKey = localStorage.getItem("openaiApiKey") || "";
    } catch (e) { /* ignore */ }

    if (!apiKey) {
        apiKey = OPENAI_CONFIG.API_KEY;
    }

    if (!apiKey || apiKey === "YOUR_API_KEY_HERE") {
        throw new Error("Clé API OpenAI manquante. Veuillez la renseigner dans les 'Paramètres IA'.");
    }

    const systemPrompt = getActivePrompt();
    const hasImageInput = typeof imageBase64 === "string" && imageBase64.trim() !== "";
    const imageUrl = hasImageInput ? buildImageDataUrl(imageBase64) : null;
    const userText = `Tranche d'âge: ${ageRange || "non précisée"}\nNotes d'entretien: ${notes || "Aucune note fournie."}`;
    const hasImage = Boolean(imageUrl);

    const messages = [{ role: "system", content: systemPrompt }];
    if (hasImage) {
        messages.push({
            role: "user",
            content: [
                { type: "text", text: userText },
                { type: "image_url", image_url: { url: imageUrl } }
            ]
        });
    } else {
        messages.push({ role: "user", content: userText });
    }

    const body = {
        model: OPENAI_CONFIG.MODEL,
        max_tokens: OPENAI_CONFIG.MAX_TOKENS,
        response_format: { type: "json_object" },
        messages
    };

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`
        },
        body: JSON.stringify(body)
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Appel OpenAI échoué (${response.status}): ${errorText}`);
    }

    const json = await response.json();
    const content = json?.choices?.[0]?.message?.content;

    if (!content) {
        throw new Error("Réponse OpenAI vide ou inattendue.");
    }

    const cleaned = sanitizeJson(content);
    if (!cleaned) {
        throw new Error(`Impossible de parser le JSON retourné par OpenAI: contenu non JSON (${content?.slice?.(0, 160) || "vide"})`);
    }

    try {
        return JSON.parse(cleaned);
    } catch (err) {
        throw new Error(`Impossible de parser le JSON retourné par OpenAI: ${err.message} — extrait: ${cleaned.slice(0, 160)}`);
    }
}
