export function initImageUpload() {
    const uploadZone = document.getElementById("uploadZone");
    const fileInput = document.getElementById("imageInput");
    const preview = document.getElementById("imagePreview");
    let imageBase64 = "";

    function setPreview(dataUrl) {
        if (!preview) return;
        preview.src = dataUrl;
        preview.hidden = false;
        preview.removeAttribute("hidden");
        preview.style.display = "block";
    }

    function readFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = () => reject(new Error("Lecture de l'image échouée."));
            reader.readAsDataURL(file);
        });
    }

    async function handleFile(file) {
        if (!file) return;
        const looksLikeImage = file.type.startsWith("image/") || /\.(png|jpe?g|gif|webp|heic|heif)$/i.test(file.name || "");
        if (!looksLikeImage) {
            alert("Veuillez sélectionner une image valide.");
            return;
        }
        try {
            const dataUrl = await readFile(file);
            if (typeof dataUrl !== "string") {
                throw new Error("Format de fichier non supporté.");
            }
            imageBase64 = dataUrl;
            setPreview(dataUrl);
            if (preview) {
                preview.alt = file.name || "Aperçu de la capture";
            }
        } catch (err) {
            console.error(err);
            alert(err.message || "Impossible de charger l'image.");
        } finally {
            if (fileInput) {
                fileInput.value = "";
            }
        }
    }

    if (uploadZone && fileInput) {
        uploadZone.addEventListener("keydown", (event) => {
            if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                fileInput.click();
            }
        });

        uploadZone.addEventListener("dragover", (event) => {
            event.preventDefault();
            uploadZone.classList.add("dragover");
        });

        uploadZone.addEventListener("dragleave", () => {
            uploadZone.classList.remove("dragover");
        });

        uploadZone.addEventListener("drop", (event) => {
            event.preventDefault();
            uploadZone.classList.remove("dragover");
            const file = event.dataTransfer?.files?.[0] || event.dataTransfer?.items?.[0]?.getAsFile();
            handleFile(file);
        });
    }

    if (fileInput) {
        fileInput.addEventListener("change", (event) => {
            const file = event.target.files?.[0];
            handleFile(file);
        });
    }

    return {
        getImageBase64: () => imageBase64,
        setImage: (dataUrl, altText = "Aperçu de la capture") => {
            if (typeof dataUrl !== "string" || !dataUrl) return;
            imageBase64 = dataUrl;
            setPreview(dataUrl);
            if (preview) {
                preview.alt = altText;
            }
        }
    };
}
