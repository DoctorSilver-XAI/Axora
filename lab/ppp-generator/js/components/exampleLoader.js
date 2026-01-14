import { detectAgeBucket } from "../utils/age.js";

const EXAMPLE_PATH = "exemples/exemple_DP_VK.PNG";
const preloadNotes =
    "Réalisation PPP pour M. Vignaud Karl, 63 ans, reçu ce 26/11 en post-hospit cardio. Revue complète de la polymédication avec explications ciblées sur les statines et la gestion du risque thromboembolique pour verrouiller l'observance du traitement anti-arythmique et hypotenseur. J'ai détaillé les signes d'alerte cliniques nécessitant un avis médical, notamment la prise de poids rapide ou la bradycardie, et insisté sur les mesures hygiéno-diététiques comme la limitation stricte du sel. Mise en place effective du sevrage tabagique : délivrance dispositif transdermique 21mg associé aux formes orales pour les pics de craving. Le patient repart avec un protocole d'ajustement des doses et une stratégie comportementale pour gérer les envies impérieuses.";

function ensureToday(pppDateField) {
    if (!pppDateField || pppDateField.textContent.trim()) return;
    const now = new Date();
    const dd = String(now.getDate()).padStart(2, "0");
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    const yyyy = now.getFullYear();
    pppDateField.textContent = `${dd}/${mm}/${yyyy}`;
}

async function toDataUrl(response) {
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(new Error("Lecture de l'exemple échouée."));
        reader.readAsDataURL(blob);
    });
}

export function initExampleLoader({ initUpload, initNotes, onApplyAge, patientNameField, pppDateField }) {
    let upload = null;
    let notes = null;

    const ensureUploadInstance = () => {
        if (!upload) upload = initUpload?.();
        return upload;
    };
    const ensureNotesInstance = () => {
        if (!notes) notes = initNotes?.();
        return notes;
    };

    const loadVKExample = async () => {
        try {
            const response = await fetch(EXAMPLE_PATH);
            if (!response.ok) {
                throw new Error("Impossible de charger l'exemple (fichier introuvable).");
            }
            const dataUrl = await toDataUrl(response);
            ensureUploadInstance()?.setImage?.(typeof dataUrl === "string" ? dataUrl : "", "Exemple DP Karl Vignaud");
            ensureNotesInstance()?.setNotes?.(preloadNotes);
            if (patientNameField) {
                patientNameField.textContent = "Vignaud Karl";
            }
            onApplyAge?.(detectAgeBucket(preloadNotes));
            ensureToday(pppDateField);
        } catch (err) {
            console.error(err);
            alert(err.message || "Impossible de charger l'exemple VK.");
        }
    };

    return { loadVKExample };
}
