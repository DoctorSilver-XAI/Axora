import { initPPPGenerator, fillFromAI } from "./components/pppGenerator.js";
import { initImageUpload } from "./components/imageUpload.js";
import { initNotesInput } from "./components/notesInput.js";
import { initPromptUI } from "./components/promptManager.js";
import { generatePPP } from "./api/openai.js";
import { initExampleLoader } from "./components/exampleLoader.js";
import { populateAgeSelect, detectAgeBucket, applyAgeSelection } from "./utils/age.js";

document.addEventListener("DOMContentLoaded", () => {
    const toggleBtn = document.getElementById("toggleInputSection");
    const inputSection = document.getElementById("inputSection");
    const printButton = document.getElementById("printButton");
    const pharmacistSelect = document.getElementById("pharmacien");
    const pharmacistOutput = document.getElementById("pharmacienPrint");
    const pppDateField = document.getElementById("pppDate");
    const preloadVKButton = document.getElementById("preloadVK");
    const patientNameField = document.querySelector(".id-value[aria-label='Nom et prénom du patient']");
    const notesTextarea = document.getElementById("notesTextarea");
    const ageSelect = document.getElementById("ageRange");
    let upload = null;
    let notes = null;

    const ensureUpload = () => {
        if (!upload) upload = initImageUpload();
        return upload;
    };
    const ensureNotes = () => {
        if (!notes) notes = initNotesInput();
        return notes;
    };

    if (ageSelect) {
        populateAgeSelect(ageSelect);
    }

    // Force initial collapse in case of cached markup.
    if (inputSection) {
        inputSection.setAttribute("hidden", "hidden");
    }
    if (toggleBtn) {
        toggleBtn.setAttribute("aria-expanded", "false");
    }

    if (toggleBtn && inputSection) {
        toggleBtn.addEventListener("click", () => {
            const willShow = inputSection.hasAttribute("hidden");
            if (willShow) {
                inputSection.removeAttribute("hidden");
                toggleBtn.setAttribute("aria-expanded", "true");
                toggleBtn.textContent = "🔒 Masquer l'assistant PhiGenix 6.0";
                // Init modules on first open
                ensureUpload();
                ensureNotes();
            } else {
                inputSection.setAttribute("hidden", "hidden");
                toggleBtn.setAttribute("aria-expanded", "false");
                toggleBtn.textContent = "🤖 Ouvrir l'assistant PhiGenix 6.0";
            }
        });
    }

    if (printButton) {
        printButton.addEventListener("click", () => {
            const wasPreview = document.body.classList.contains("preview-mode");
            if (!wasPreview) {
                document.body.classList.add("preview-mode");
            }
            // Small timeout to allow render
            setTimeout(() => {
                window.print();
                if (!wasPreview) {
                    // Restore original state after print dialog closes
                    // Note: modern browsers pause JS during print dialog, so this runs after close
                    document.body.classList.remove("preview-mode");
                }
            }, 50);
        });
    }

    const syncPharmacist = () => {
        if (!pharmacistOutput) return;
        const selectedText = pharmacistSelect?.selectedOptions?.[0]?.textContent?.trim();
        const value = pharmacistSelect?.value?.trim();
        pharmacistOutput.textContent = value ? selectedText || value : "";
    };

    if (pharmacistSelect) {
        pharmacistSelect.addEventListener("change", syncPharmacist);
        syncPharmacist();
    }

    if (pppDateField && !pppDateField.textContent.trim()) {
        const now = new Date();
        const dd = String(now.getDate()).padStart(2, "0");
        const mm = String(now.getMonth() + 1).padStart(2, "0");
        const yyyy = now.getFullYear();
        pppDateField.textContent = `${dd}/${mm}/${yyyy}`;
    }

    // Always init PPP base UI (themes, editable lines)
    initPPPGenerator();
    initPromptUI();
    // Init upload/notes once so le reste de l'app peut les consommer
    ensureUpload();
    ensureNotes();

    const exampleLoader = initExampleLoader({
        initUpload: ensureUpload,
        initNotes: ensureNotes,
        onApplyAge: (bucket) => applyAgeSelection(ageSelect, bucket),
        patientNameField,
        pppDateField
    });

    if (preloadVKButton) {
        preloadVKButton.addEventListener("click", (event) => {
            event.preventDefault();
            exampleLoader.loadVKExample();
        });
    }

    if (notesTextarea) {
        notesTextarea.addEventListener("input", (event) => {
            const bucket = detectAgeBucket(event.target.value);
            applyAgeSelection(ageSelect, bucket);
        });
    }

    const generateBtn = document.getElementById("generateBtn");
    const loading = document.getElementById("loadingIndicator");
    const loadingProgress = document.getElementById("loadingProgressFill");
    let loadingTimer = null;

    if (generateBtn) {
        generateBtn.addEventListener("click", async () => {
            const imageBase64 = ensureUpload()?.getImageBase64?.();
            const notesValue = ensureNotes()?.getNotes?.() || "";
            const ageRange = ageSelect?.value || "";

            if (!imageBase64 && !notesValue) {
                alert("Ajoutez au moins une capture du dossier pharmaceutique ou des notes d'entretien.");
                return;
            }

            // Validation des champs obligatoires
            const patientNameEl = document.getElementById("patientName");
            const pharmacienEl = document.getElementById("pharmacien");
            let isValid = true;
            let firstInvalidEl = null;

            if (!patientNameEl || !patientNameEl.textContent.trim()) {
                isValid = false;
                patientNameEl?.classList.add("input-error");
                if (!firstInvalidEl) firstInvalidEl = patientNameEl;
            }

            if (!pharmacienEl || !pharmacienEl.value) {
                isValid = false;
                pharmacienEl?.classList.add("input-error");
                if (!firstInvalidEl) firstInvalidEl = pharmacienEl;
            }

            // Listeners pour nettoyer les erreurs
            patientNameEl?.addEventListener("input", () => patientNameEl.classList.remove("input-error"), { once: true });
            pharmacienEl?.addEventListener("change", () => pharmacienEl.classList.remove("input-error"), { once: true });

            if (!isValid) {
                if (firstInvalidEl) {
                    firstInvalidEl.scrollIntoView({ behavior: "smooth", block: "center" });
                    firstInvalidEl.focus();
                    // Petit délai pour l'animation shake si besoin de replay
                }
                return;
            }

            if (loading) loading.hidden = false;
            if (loadingProgress) {
                loadingProgress.style.width = "0%";
            }
            if (loadingTimer) {
                clearInterval(loadingTimer);
            }
            // Simulation de progression fluide et pseudo-réaliste par paliers.
            let progress = 5;
            const phases = [
                { target: 35, min: 2, max: 10, delayMin: 250, delayMax: 600 }, // départ: parfois rapide
                { target: 65, min: 1, max: 5, delayMin: 350, delayMax: 750 },  // milieu: plutôt lent
                { target: 92, min: 0.5, max: 4, delayMin: 300, delayMax: 650 } // fin: lente ou petits sursauts
            ];

            const step = () => {
                const phase = phases.find((p) => progress < p.target) || phases[phases.length - 1];
                const increment = phase.min + Math.random() * (phase.max - phase.min);
                progress = Math.min(progress + increment, phase.target);
                if (loadingProgress) {
                    loadingProgress.style.width = `${progress}%`;
                }
                if (progress < 92) {
                    const delay = phase.delayMin + Math.random() * (phase.delayMax - phase.delayMin);
                    loadingTimer = setTimeout(step, delay);
                }
            };
            loadingTimer = setTimeout(step, 250);
            generateBtn.disabled = true;

            try {
                // Affiche le loader pendant toute la durée de la requête.
                const aiData = await generatePPP(imageBase64, notesValue, ageRange);
                fillFromAI(aiData);
            } catch (err) {
                alert(err.message || "Une erreur est survenue pendant la génération du PPP.");
            } finally {
                if (loadingTimer) {
                    clearInterval(loadingTimer);
                    loadingTimer = null;
                }
                if (loadingProgress) {
                    loadingProgress.style.width = "100%";
                }
                generateBtn.disabled = false;
                if (loading) loading.hidden = true;
            }
        });
    }

    // Preview Mode Management
    const previewBtn = document.getElementById("previewBtn");
    const closePreviewBtn = document.getElementById("closePreviewBtn");

    if (previewBtn) {
        previewBtn.addEventListener("click", () => {
            document.body.classList.add("preview-mode");
        });
    }

    if (closePreviewBtn) {
        closePreviewBtn.addEventListener("click", () => {
            document.body.classList.remove("preview-mode");
        });
    }

    // Close preview on Escape key
    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape" && document.body.classList.contains("preview-mode")) {
            document.body.classList.remove("preview-mode");
        }
    });

});
