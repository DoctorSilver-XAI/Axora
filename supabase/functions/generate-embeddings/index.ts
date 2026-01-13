import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        const openaiKey = Deno.env.get("OPENAI_API_KEY");
        if (!openaiKey) {
            throw new Error("Missing OPENAI_API_KEY environment variable.");
        }

        const supabase = createClient(
            Deno.env.get("SUPABASE_URL")!,
            Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
        );

        // Get products that need embedding generation
        // (embedding is null but embedding_text is not)
        const { data: products, error: fetchError } = await supabase
            .from("catalog_products")
            .select("id, nom, embedding_text")
            .is("embedding", null)
            .not("embedding_text", "is", null)
            .limit(50); // Process in batches

        if (fetchError) {
            throw new Error(`Failed to fetch products: ${fetchError.message}`);
        }

        if (!products || products.length === 0) {
            return new Response(
                JSON.stringify({ success: true, message: "No products need embedding generation." }),
                { headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        let successCount = 0;
        let errorCount = 0;
        const errors: string[] = [];

        for (const product of products) {
            try {
                // Call OpenAI Embeddings API
                const embeddingResponse = await fetch("https://api.openai.com/v1/embeddings", {
                    method: "POST",
                    headers: {
                        "Authorization": `Bearer ${openaiKey}`,
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        model: "text-embedding-3-small",
                        input: product.embedding_text,
                    }),
                });

                if (!embeddingResponse.ok) {
                    const errorText = await embeddingResponse.text();
                    throw new Error(`OpenAI API error: ${embeddingResponse.status} - ${errorText}`);
                }

                const embeddingData = await embeddingResponse.json();
                const embedding = embeddingData.data[0].embedding;

                // Update product with embedding
                const { error: updateError } = await supabase
                    .from("catalog_products")
                    .update({
                        embedding: embedding,
                        embedding_updated_at: new Date().toISOString()
                    })
                    .eq("id", product.id);

                if (updateError) {
                    throw new Error(updateError.message);
                }

                successCount++;
            } catch (productError) {
                errors.push(`${product.nom}: ${(productError as Error).message}`);
                errorCount++;
            }
        }

        return new Response(
            JSON.stringify({
                success: successCount > 0,
                message: `Embedding generation completed`,
                stats: {
                    processed: products.length,
                    success: successCount,
                    errors: errorCount,
                },
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
