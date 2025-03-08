document.addEventListener("DOMContentLoaded", function () {
    const flareList = document.getElementById("flareList");

    async function fetchFlares() {
        try {
            // Fetch the latest transactions from Hive
            const response = await fetch("https://api.hive.blog", {
                method: "POST",
                body: JSON.stringify({
                    jsonrpc: "2.0",
                    method: "condenser_api.get_account_history",
                    params: ["flarechain", -1, 100], // Use correct Hive account tracking flares
                    id: 1
                }),
                headers: { "Content-Type": "application/json" }
            });

            const data = await response.json();
            const transactions = data.result;

            // Get Flare creation transactions
            let flares = transactions
                .map(tx => tx[1])
                .filter(tx => tx.op[0] === "custom_json" && tx.op[1].id === "flare_create")
                .map(tx => JSON.parse(tx.op[1].json));

            // Get Flare closure transactions
            let closedFlares = transactions
                .map(tx => tx[1])
                .filter(tx => tx.op[0] === "custom_json" && tx.op[1].id === "flare_close")
                .map(tx => JSON.parse(tx.op[1].json).flare_id);

            // Filter out expired and closed Flares
            const now = new Date();
            flares = flares.filter(flare => {
                const flareTime = new Date(flare.created_at);
                const diffMinutes = (now - flareTime) / (1000 * 60);

                return !closedFlares.includes(flare.flare_id) && diffMinutes <= 10;
            });

            // Sort Flares by creation time (Newest first)
            flares.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

            // Clear old content
            flareList.innerHTML = "";

            if (flares.length === 0) {
                flareList.innerHTML = "<p>No active flares available.</p>";
                return;
            }

            // Display flares in the UI
            flares.forEach(flare => {
                const listItem = document.createElement("li");
                listItem.innerHTML = `
                    <span>🔥 ${flare.name} (Max: ${flare.max_participants})</span>
                    <a href="chat.html?flare_id=${flare.flare_id}" class="btn">Join</a>
                `;
                flareList.appendChild(listItem);
            });
        } catch (error) {
            console.error("❌ Error fetching flares:", error);
            flareList.innerHTML = "<p>⚠️ Failed to load flares. Please try again later.</p>";
        }
    }

    // Auto-refresh every 30 seconds to check for expired flares
    setInterval(fetchFlares, 30000);
    fetchFlares();
});
