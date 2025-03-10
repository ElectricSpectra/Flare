import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js';
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js';
import { getFirestore, collection, doc, setDoc, getDoc, onSnapshot, deleteDoc, addDoc, query, orderBy, getDocs } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';

// ✅ Firebase Configuration
const firebaseConfig = {
    apiKey: "AIzaSyA8O1KIihIzvBhVHpRnX4kBUidK-rb2bdg",
    authDomain: "flare-f9dce.firebaseapp.com",
    projectId: "flare-f9dce",
    storageBucket: "flare-f9dce.firebasestorage.app",
    messagingSenderId: "1005665913123",
    appId: "1:1005665913123:web:a3540eeff8611180e22496",
    measurementId: "G-266KJX4FG4"
};

// ✅ Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// ✅ Google Sign-In
if (document.getElementById("google-login")) {
    document.getElementById("google-login").addEventListener("click", async () => {
        try {
            const provider = new GoogleAuthProvider();
            const result = await signInWithPopup(auth, provider);
            localStorage.setItem("user", JSON.stringify(result.user));
            window.location.href = "home.html"; // ✅ Redirect to Home Page
        } catch (error) {
            console.error("Login Failed:", error.message);
            alert("Login failed. Please try again.");
        }
    });

    onAuthStateChanged(auth, (user) => {
        if (user) {
            localStorage.setItem("user", JSON.stringify(user));
            window.location.href = "home.html";
        }
    });
}

// ✅ Get User from Local Storage
const user = JSON.parse(localStorage.getItem("user"));
if (!user && window.location.pathname !== "/index.html") {
    window.location.href = "index.html";
}

// ✅ Get Flare ID from URL
const urlParams = new URLSearchParams(window.location.search);
const flareId = urlParams.get("flareId");

// ✅ Function to Generate Random Names
function generateRandomName() {
    const adjectives = ["Shadow", "Cyber", "Frost", "Blue", "Scarlet", "Thunder", "Echo", "Mystic", "Phantom", "Iron"];
    const animals = ["Tiger", "Wolf", "Falcon", "Eagle", "Fox", "Hawk", "Panther", "Dragon", "Lynx", "Cobra"];
    return `${adjectives[Math.floor(Math.random() * adjectives.length)]}${animals[Math.floor(Math.random() * animals.length)]}`;
}

// =============================================================
// ✅ Flare Creation
// =============================================================
if (document.getElementById("create-flare")) {
    document.getElementById("create-flare").addEventListener("click", async () => {
        const topic = prompt("Enter Flare Topic:");
        const maxParticipants = prompt("Enter Max Participants (2-10):");
        const anonymousChat = confirm("Enable anonymous chatting? (Click OK for Yes, Cancel for No)");

        if (topic && maxParticipants) {
            const flareRef = doc(collection(db, "flares"));
            await setDoc(flareRef, {
                id: flareRef.id,
                topic: topic,
                host: user.displayName,
                maxParticipants: parseInt(maxParticipants),
                anonymous: anonymousChat,
                createdAt: new Date()
            });
            
            // ✅ Ensure the host is added to `users` collection immediately
            const usersRef = collection(flareRef, "users");
            let hostName = user.displayName;
            if (anonymousChat) {
                hostName = generateRandomName();
            }
            await setDoc(doc(usersRef, user.uid), { name: hostName });
            
            

            window.location.href = `chat.html?flareId=${flareRef.id}`;
        }
    });

    // ✅ Load Active Flares
    onSnapshot(query(collection(db, "flares"), orderBy("createdAt", "desc")), (snapshot) => {
        const flareList = document.getElementById("flare-list");
        flareList.innerHTML = ""; // Clear the list

        snapshot.docs.forEach((doc) => {
            const flare = doc.data();
            const flareDiv = document.createElement("div");
            flareDiv.classList.add("flare-item");
            flareDiv.innerHTML = `
                <h3>${flare.topic}</h3>
                <p>Host: ${flare.host}</p>
                <p>Anonymous Chat: ${flare.anonymous ? "Enabled" : "Disabled"}</p>
                <button onclick="joinFlare('${flare.id}')">Join</button>
            `;
            flareList.appendChild(flareDiv);
        });
    });

    window.joinFlare = (flareId) => {
        window.location.href = `chat.html?flareId=${flareId}`;
    };
}

// =============================================================
// ✅ Delete Flare When `users` is Empty
// =============================================================
async function deleteFlare(flareRef, usersRef, messagesRef) {
    await new Promise(resolve => setTimeout(resolve, 5000)); // ✅ Wait 5 seconds before checking

    const usersSnapshot = await getDocs(usersRef);
    if (usersSnapshot.empty) {
        console.log("🔥 No users left. Deleting entire Flare:", flareId);


        const messagesSnapshot = await getDocs(messagesRef);
        messagesSnapshot.forEach(async (messageDoc) => {
            await deleteDoc(messageDoc.ref);
        });

        await deleteDoc(flareRef);
        console.log("🔥 Flare completely deleted:", flareId);
        window.location.href = "home.html";
    }
}

// =============================================================
// ✅ Join Flare & Handle Messages
// =============================================================
if (flareId) {
    const flareRef = doc(db, "flares", flareId);
    const messagesRef = collection(flareRef, "messages");
    const usersRef = collection(flareRef, "users");

    // ✅ Fetch Flare Settings & Assign Name
    getDoc(flareRef).then(async (docSnap) => {
        if (docSnap.exists()) {
            const flareData = docSnap.data();
            window.isAnonymous = flareData.anonymous;

            let displayName = user.displayName;
            if (flareData.anonymous) {
                const userDoc = await getDoc(doc(usersRef, user.uid));
                if (!userDoc.exists()) {
                    displayName = generateRandomName();
                    await setDoc(doc(usersRef, user.uid), { name: displayName });
                } else {
                    displayName = userDoc.data().name;
                }
            }

            // ✅ Store the assigned name
            window.displayName = displayName;
        }
    });

    // ✅ Load Active Users
    onSnapshot(usersRef, async (snapshot) => {
        const usersOnline = document.getElementById("users-online");
        usersOnline.innerHTML = `<h3>🔥 Users Online:</h3>`;
        snapshot.docs.forEach(doc => {
            usersOnline.innerHTML += `<p>${doc.data().name}</p>`;
        });
    
        // ✅ Only check deletion when users are already in the Flare
        if (snapshot.size > 0) {
            console.log("✅ Flare is active with users.");
        } else {
            console.log("⏳ Checking if Flare should be deleted...");
            await deleteFlare(flareRef, usersRef, messagesRef);
        }
    });
    

    // ✅ Load Messages in Real-Time
    onSnapshot(query(messagesRef, orderBy("timestamp")), (snapshot) => {
        const chatBox = document.getElementById("chat-box");
        chatBox.innerHTML = "";
        snapshot.docs.forEach(doc => {
            chatBox.innerHTML += `<p><strong>${doc.data().user}:</strong> ${doc.data().text}</p>`;
        });
    });

    // ✅ Send Message
    document.getElementById("send-message").addEventListener("click", async () => {
        const message = document.getElementById("message-input").value.trim();
        if (message) {
            await addDoc(messagesRef, {
                user: window.displayName,
                text: message,
                timestamp: new Date()
            });

            document.getElementById("message-input").value = "";
        }
    });

    // ✅ Leave Flare
    document.getElementById("leave-flare").addEventListener("click", async () => {
        await deleteDoc(doc(usersRef, user.uid));
        await deleteFlare(flareRef, usersRef, messagesRef);
        window.location.href = "home.html";
    });
}
