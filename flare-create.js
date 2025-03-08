document.getElementById("flareForm").addEventListener("submit", function (event) {
    event.preventDefault();

    // Get logged-in Hive user
    const hiveUser = localStorage.getItem("hiveUser");
    if (!hiveUser) {
        alert("You must log in first!");
        return;
    }

    // Get flare details from the form
    const flareName = document.getElementById("flareName").value;
    const maxParticipants = parseInt(document.getElementById("maxParticipants").value);

    // Generate a unique Flare ID
    const flareId = "flare_" + Date.now();

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
