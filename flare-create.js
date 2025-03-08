document.getElementById("flareForm").addEventListener("submit", async function (event) {
    event.preventDefault();

    // Get logged-in Hive user
    const hiveUser = localStorage.getItem("hiveUser");
    if (!hiveUser) {
        alert("You must log in first!");
        return;
    }

    // Get flare details from the form
    const flareName = document.getElementById("flareName").value.trim();
    const maxParticipants = parseInt(document.getElementById("maxParticipants").value);

    // Validate input fields
    if (flareName.length < 3) {
        alert("Flare name must be at least 3 characters long.");
        return;
    }

    if (isNaN(maxParticipants) || maxParticipants < 2 || maxParticipants > 10) {
        alert("Max Participants must be between 2 and 10.");
        return;
    }

    // Generate a unique Flare ID
    const flareId = "flare_" + Date.now();

    // Check if a Flare with the same name already exists
    const existingFlares = await fetchExistingFlares();
    if (existingFlares.some(flare => flare.name.toLowerCase() === flareName.toLowerCase())) {
        alert("A Flare with this name already exists. Choose a different name.");
        return;
    }

    // Prepare the flare data
    const flareData = {
        flare_id: flareId,
        host: hiveUser,
        name: flareName,
        max_participants: maxParticipants,
        participants: [],
        created_at: new Date().toISOString()
    };

    // Store flare on Hive using Custom JSON transaction
    hive_keychain.requestCustomJSON(
        hiveUser,
        "flare_create", // Custom JSON operation name
        "active", // Requires active authority
        JSON.stringify(flareData),
        "Creating a new Flare",
        function (response) {
            if (response.success) {
                alert("Flare successfully created on Hive!");
                window.location.href = "flares.html"; // Redirect to flares page
            } else {
                alert("Error creating flare: " + response.message);
            }
        }
    );
});

// Function to fetch existing flares to check for duplicate names
async function fetchExistingFlares() {
    try {
        const response = await fetch("https://api.hive.blog", {
            method: "POST",
            body: JSON.stringify({
                jsonrpc: "2.0",
                method: "condenser_api.get_account_history",
                params: ["flarechain", -1, 100], // Use the correct Hive account
                id: 1
            }),
            headers: { "Content-Type": "application/json" }
        });

        const data = await response.json();
        const transactions = data.result;

        // Get Flare creation transactions
        return transactions
            .map(tx => tx[1])
            .filter(tx => tx.op[0] === "custom_json" && tx.op[1].id === "flare_create")
            .map(tx => JSON.parse(tx.op[1].json));
    } catch (error) {
        console.error("Error fetching existing flares:", error);
        return [];
    }
}
