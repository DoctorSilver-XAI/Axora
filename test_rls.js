const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_ANON_KEY;

if (!url || !key) {
    console.error("❌ Missing SUPABASE_URL or SUPABASE_ANON_KEY in environment");
    process.exit(1);
}

console.log(`Testing connection to: ${url}`);

async function run() {
    try {
        const headers = {
            'apikey': key,
            'Authorization': `Bearer ${key}`,
            'Content-Type': 'application/json'
        };

        // 1. Fetch Conversations
        console.log("\n1. Fetching conversations...");
        const resConv = await fetch(`${url}/rest/v1/conversations?select=*&limit=5`, { headers });

        if (!resConv.ok) {
            console.error(`❌ Error fetching conversations: ${resConv.status} ${resConv.statusText}`);
            console.error(await resConv.text());
        } else {
            const convs = await resConv.json();
            console.log(`✅ Conversations found: ${Array.isArray(convs) ? convs.length : 'Not an array'}`);
            console.log(JSON.stringify(convs, null, 2));

            // 2. Fetch Messages (if conv exists)
            if (Array.isArray(convs) && convs.length > 0) {
                const convId = convs[0].id; // Use snake_case or whatever comes back
                // Note: DB returns whatever columns exist
                console.log(`\n2. Fetching messages for conversation ${convId}...`);
                const resMsg = await fetch(`${url}/rest/v1/messages?conversation_id=eq.${convId}&select=*`, { headers });

                if (!resMsg.ok) {
                    console.error(`❌ Error fetching messages: ${resMsg.status} ${resMsg.statusText}`);
                } else {
                    const msgs = await resMsg.json();
                    console.log(`✅ Messages found: ${Array.isArray(msgs) ? msgs.length : 'Not an array'}`);
                    console.log(JSON.stringify(msgs, null, 2));
                }
            }
        }
    } catch (e) {
        console.error("❌ Exception:", e);
    }
}

run();
