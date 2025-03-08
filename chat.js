const closeFlareBtn = document.getElementById("closeFlareBtn");
const chatBox = document.getElementById("chatBox");
const messageInput = document.getElementById("messageInput");
const sendBtn = document.getElementById("sendBtn");

const urlParams = new URLSearchParams(window.location.search);
const flareId = urlParams.get("flare_id");
const hiveUser = localStorage.getItem("hiveUser");
let chatLog = [];

if (!flareId || !hiveUser) {
    alert("Invalid session. Please log in.");
    window.location.href = "index.html";
}

// Check if the user is the host
async function checkHost() {
    try {
        const response = await fetch("https://api.hive.blog", {
            method: "POST",
            body: JSON.stringify({
                jsonrpc: "2.0",
                method: "condenser_api.get_account_history",
                params: ["flarechain", -1, 100], // Use correct Hive account
                id: 1
            }),
            headers: { "Content-Type": "application/json" }
        });

        const data = await response.json();
        const transactions = data.result;

        // Find the Flare creation transaction
        const flare = transactions
            .map(tx => tx[1])
            .find(tx => tx.op[0] === "custom_json" && tx.op[1].id === "flare_create" && JSON.parse(tx.op[1].json).flare_id === flareId);

        if (flare) {
            const flareData = JSON.parse(flare.op[1].json);
            if (flareData.host === hiveUser) {
                closeFlareBtn.style.display = "block"; // Show close button for the host
            }
        }
    } catch (error) {
        console.error("Error checking host:", error);
    }
}

// Close the Flare manually
closeFlareBtn.addEventListener("click", function () {
    const closeData = {
        flare_id: flareId,
        status: "closed",
        closed_by: hiveUser,
        timestamp: new Date().toISOString()
    };

    hive_keychain.requestCustomJSON(
        hiveUser,
        "flare_close",
        "active",
        JSON.stringify(closeData),
        "Closing the Flare",
        function (response) {
            if (response.success) {
                alert("Flare closed successfully!");
                window.location.href = "flares.html"; // Redirect to Flare list
            } else {
                alert("Error closing Flare: " + response.message);
            }
        }
    );
});

// Fetch past messages from Hive & IPFS
async function fetchMessages() {
    try {
        const response = await fetch("https://api.hive.blog", {
            method: "POST",
            body: JSON.stringify({
                jsonrpc: "2.0",
                method: "condenser_api.get_account_history",
                params: ["flarechain", -1, 100], // Use correct Hive account
                id: 1
            }),
            headers: { "Content-Type": "application/json" }
        });

        const data = await response.json();
        const transactions = data.result;

        // Get all chat logs stored on Hive
        const ipfsHashes = transactions
            .map(tx => tx[1])
            .filter(tx => tx.op[0] === "custom_json" && tx.op[1].id === "flare_ipfs")
            .map(tx => JSON.parse(tx.op[1].json))
            .filter(log => log.flare_id === flareId)
            .map(log => log.ipfs_hash);

        // Fetch each IPFS-stored chat log
        chatBox.innerHTML = "";
        for (const hash of ipfsHashes) {
            const ipfsMessages = await fetch(`https://gateway.pinata.cloud/ipfs/${hash}`).then(res => res.json());
            ipfsMessages.forEach(msg => displayMessage(msg.sender, msg.message));
        }
    } catch (error) {
        console.error("Error fetching messages:", error);
    }
}

// Display a message in the chat
function displayMessage(sender, message) {
    const messageElement = document.createElement("p");
    messageElement.innerHTML = `<strong>${sender}:</strong> ${message}`;
    chatBox.appendChild(messageElement);
}

// Send message
sendBtn.addEventListener("click", function () {
    const messageText = messageInput.value.trim();
    if (!messageText) return;

    const messageData = {
        flare_id: flareId,
        sender: hiveUser,
        message: messageText,
        timestamp: new Date().toISOString()
    };

    chatLog.push(messageData);
    displayMessage(hiveUser, messageText);
    messageInput.value = "";

    // Every 5 messages, store the log on IPFS
    if (chatLog.length >= 5) {
        uploadToIPFS(chatLog);
        chatLog = [];
    }
});

// Upload chat logs to IPFS via Pinata
async function uploadToIPFS(messages) {
    const PINATA_API_KEY = "YOUR_PINATA_API_KEY";
    const PINATA_SECRET_API_KEY = "YOUR_PINATA_SECRET";

    try {
        const response = await fetch("https://api.pinata.cloud/pinning/pinJSONToIPFS", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "pinata_api_key": PINATA_API_KEY,
                "pinata_secret_api_key": PINATA_SECRET_API_KEY
            },
            body: JSON.stringify({
                pinataContent: messages
            })
        });

        const result = await response.json();
        const ipfsHash = result.IpfsHash; // Get IPFS Hash

        // Store the IPFS hash on Hive
        storeIpfsHashOnHive(ipfsHash);
    } catch (error) {
        console.error("Error uploading to IPFS via Pinata:", error);
    }
}

// Store IPFS hash on Hive Blockchain
function storeIpfsHashOnHive(ipfsHash) {
    const logData = {
        flare_id: flareId,
        ipfs_hash: ipfsHash,
        timestamp: new Date().toISOString()
    };

    hive_keychain.requestCustomJSON(
        hiveUser,
        "flare_ipfs",
        "active",
        JSON.stringify(logData),
        "Storing Chat Log on Hive",
        function (response) {
            if (response.success) {
                console.log("Chat log stored on Hive with IPFS hash:", ipfsHash);
            } else {
                alert("Failed to store chat log: " + response.message);
            }
        }
    );
}

// Auto-Remove Expired Flares
async function autoRemoveExpiredFlare() {
    try {
        const response = await fetch("https://api.hive.blog", {
            method: "POST",
            body: JSON.stringify({
                jsonrpc: "2.0",
                method: "condenser_api.get_account_history",
                params: ["flarechain", -1, 100], // Use correct Hive account
                id: 1
            }),
            headers: { "Content-Type": "application/json" }
        });

        const data = await response.json();
        const transactions = data.result;

        const flare = transactions
            .map(tx => tx[1])
            .find(tx => tx.op[0] === "custom_json" && tx.op[1].id === "flare_create" && JSON.parse(tx.op[1].json).flare_id === flareId);

        if (flare) {
            const flareData = JSON.parse(flare.op[1].json);
            const createdTime = new Date(flareData.created_at);
            const now = new Date();
            const diffMinutes = (now - createdTime) / (1000 * 60);

            if (flareData.status !== "closed" && diffMinutes > 10) {
                closeFlareBtn.click();
            }
        }
    } catch (error) {
        console.error("Error checking Flare expiration:", error);
    }
}

// Fetch messages every 10 seconds
setInterval(fetchMessages, 10000);
setInterval(autoRemoveExpiredFlare, 60000); // Check expiration every 60 sec
fetchMessages();
checkHost();
