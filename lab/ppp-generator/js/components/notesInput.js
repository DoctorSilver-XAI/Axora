export function initNotesInput() {
    const textarea = document.getElementById("notesTextarea");

    if (textarea) {
        // Force plain-text paste to avoid weird formatting and ensure paste works everywhere.
        textarea.addEventListener("paste", (event) => {
            event.preventDefault();
            const text = event.clipboardData?.getData("text/plain");
            const selectionStart = textarea.selectionStart || textarea.value.length;
            const selectionEnd = textarea.selectionEnd || textarea.value.length;
            const value = textarea.value;
            const newValue = `${value.slice(0, selectionStart)}${text}${value.slice(selectionEnd)}`;
            textarea.value = newValue;
            const cursor = selectionStart + (text?.length || 0);
            textarea.setSelectionRange(cursor, cursor);
        });
    }

    return {
        getNotes: () => textarea?.value?.trim() || "",
        setNotes: (value = "") => {
            if (textarea) textarea.value = value;
        }
    };
}
