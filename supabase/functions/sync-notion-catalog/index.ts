import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NotionPage {
    id: string;
    properties: Record<string, any>;
}

serve(async (req) => {
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        const notionToken = Deno.env.get("NOTION_API_TOKEN");
        const databaseId = Deno.env.get("NOTION_DATABASE_ID");
        const pharmacyId = Deno.env.get("PHARMACY_ID") || "b115ea8f-c9d2-49b7-98e7-123d1f5217bb";

        if (!notionToken || !databaseId) {
            throw new Error("Missing NOTION_API_TOKEN or NOTION_DATABASE_ID environment variables.");
        }

        const supabase = createClient(
            Deno.env.get("SUPABASE_URL")!,
            Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
        );

        // Query ALL pages from Notion database
        const notionResponse = await fetch(
            `https://api.notion.com/v1/databases/${databaseId}/query`,
            {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${notionToken}`,
                    "Notion-Version": "2022-06-28",
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({}),
            }
        );

        if (!notionResponse.ok) {
            const errorText = await notionResponse.text();
            throw new Error(`Notion API error: ${notionResponse.status} - ${errorText}`);
        }

        const notionData = await notionResponse.json();
        const pages: NotionPage[] = notionData.results;
        const notionPageIds = new Set(pages.map(p => p.id));

        let syncedCount = 0;
        let errorCount = 0;
        let deletedCount = 0;
        const errors: string[] = [];

        // Helper functions
        const getText = (prop: any): string | null => {
            if (!prop) return null;
            if (prop.type === "title") return prop.title?.[0]?.plain_text || null;
            if (prop.type === "rich_text") return prop.rich_text?.map((t: any) => t.plain_text).join("") || null;
            if (prop.type === "select") return prop.select?.name || null;
            if (prop.type === "number") return String(prop.number) || null;
            if (prop.type === "url") return prop.url || null;
            if (prop.type === "email") return prop.email || null;
            if (prop.type === "phone_number") return prop.phone_number || null;
            if (prop.type === "checkbox") return prop.checkbox ? "Oui" : "Non";
            return null;
        };

        const getMultiSelect = (prop: any): string[] => {
            if (!prop || prop.type !== "multi_select") return [];
            return prop.multi_select?.map((s: any) => s.name) || [];
        };

        const getRelations = (prop: any): string[] => {
            if (!prop || prop.type !== "relation") return [];
            return prop.relation?.map((r: any) => r.id) || [];
        };

        // Process each Notion page
        for (const page of pages) {
            try {
                const props = page.properties;

                // Get product name
                const productName = getText(props["Name"]) || getText(props["Nom"]) || "Sans nom";

                // Build comprehensive product data from ALL Notion columns
                // Mapping Notion columns -> Supabase catalog_products columns
                const productData: Record<string, any> = {
                    notion_page_id: page.id,
                    pharmacy_id: pharmacyId,
                    nom: productName,
                    last_synced_at: new Date().toISOString(),

                    // Basic info
                    laboratoire: getText(props["Laboratoire"]),

                    // Classification  
                    categorie: getText(props["Catégorie thérapeutique"]) || getText(props["Catégorie"]),

                    // Clinical data - THE GOLD for RAG!
                    indications: getText(props["Indications"]),
                    contre_indications: getText(props["Contre-indications"]),
                    precautions: getText(props["Points de vigilance"]),
                    interactions: getText(props["Interactions"]),
                    posologie_usuelle: getText(props["Posologie"]),

                    // Expert knowledge
                    notes_internes: [
                        getText(props["Conseils comptoir"]),
                        getText(props["Effets indésirables"]) ? `Effets indésirables: ${getText(props["Effets indésirables"])}` : null,
                    ].filter(Boolean).join("\n\n"),

                    // Active ingredients
                    dci_principale: getText(props["Principes actifs"]),

                    // Tags from multi-select
                    tags: [
                        ...getMultiSelect(props["Public cible"]),
                        ...getMultiSelect(props["Catégorie thérapeutique"]),
                    ].filter(Boolean),
                };

                // Build embedding_text for RAG - concatenate ALL relevant text
                const embeddingParts = [
                    `Produit: ${productName}`,
                    productData.laboratoire ? `Laboratoire: ${productData.laboratoire}` : null,
                    productData.categorie ? `Catégorie: ${productData.categorie}` : null,
                    productData.dci_principale ? `Principes actifs: ${productData.dci_principale}` : null,
                    productData.indications ? `Indications: ${productData.indications}` : null,
                    productData.contre_indications ? `Contre-indications: ${productData.contre_indications}` : null,
                    productData.precautions ? `Points de vigilance: ${productData.precautions}` : null,
                    productData.interactions ? `Interactions: ${productData.interactions}` : null,
                    productData.posologie_usuelle ? `Posologie: ${productData.posologie_usuelle}` : null,
                    getText(props["Conseils comptoir"]) ? `Conseils comptoir: ${getText(props["Conseils comptoir"])}` : null,
                    getText(props["Effets indésirables"]) ? `Effets indésirables: ${getText(props["Effets indésirables"])}` : null,
                    getText(props["Référence"]) ? `Référence: ${getText(props["Référence"])}` : null,
                    getMultiSelect(props["Public cible"]).length > 0 ? `Public cible: ${getMultiSelect(props["Public cible"]).join(", ")}` : null,
                    // Related products for context
                    getText(props["Produits complémentaires"]) ? `Produits complémentaires: ${getText(props["Produits complémentaires"])}` : null,
                    getText(props["Alternatives"]) ? `Alternatives: ${getText(props["Alternatives"])}` : null,
                ].filter(Boolean);

                productData.embedding_text = embeddingParts.join("\n");

                // Clean up null values
                Object.keys(productData).forEach(key => {
                    if (productData[key] === null || productData[key] === undefined || productData[key] === "") {
                        delete productData[key];
                    }
                });

                const { error: upsertError } = await supabase
                    .from("catalog_products")
                    .upsert(productData, {
                        onConflict: "notion_page_id",
                        ignoreDuplicates: false
                    });

                if (upsertError) {
                    errors.push(`${productName}: ${upsertError.message}`);
                    errorCount++;
                } else {
                    syncedCount++;
                }
            } catch (pageError) {
                errors.push(`Page ${page.id}: ${(pageError as Error).message}`);
                errorCount++;
            }
        }

        // Hard Sync: Delete products no longer in Notion
        const { data: supabaseProducts, error: fetchError } = await supabase
            .from("catalog_products")
            .select("id, notion_page_id, nom")
            .eq("pharmacy_id", pharmacyId)
            .not("notion_page_id", "is", null);

        if (!fetchError && supabaseProducts) {
            for (const product of supabaseProducts) {
                if (product.notion_page_id && !notionPageIds.has(product.notion_page_id)) {
                    const { error: deleteError } = await supabase
                        .from("catalog_products")
                        .delete()
                        .eq("id", product.id);

                    if (deleteError) {
                        errors.push(`Delete ${product.nom}: ${deleteError.message}`);
                    } else {
                        deletedCount++;
                    }
                }
            }
        }

        return new Response(
            JSON.stringify({
                success: syncedCount > 0 || deletedCount > 0,
                message: `Full Sync completed with RAG-ready data`,
                stats: {
                    total: pages.length,
                    synced: syncedCount,
                    deleted: deletedCount,
                    errors: errorCount
                },
                sampleEmbeddingText: pages.length > 0 ? `First product embedding text length: ${pages[0] ? "Ready for vectorization" : "N/A"}` : undefined,
                errorDetails: errors.length > 0 ? errors.slice(0, 5) : undefined,
            }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    } catch (error) {
        return new Response(
            JSON.stringify({ success: false, error: (error as Error).message }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
});
