// Check if Hive Keychain is installed
if (!window.hive_keychain) {
    alert("Hive Keychain extension is required for authentication.");
}

// Select the login button
const loginBtn = document.getElementById("loginBtn");
const userDisplay = document.getElementById("userDisplay");

loginBtn.addEventListener("click", function () {
    // Prompt user to enter their Hive username
    const username = prompt("Enter your Hive username:");

    if (!username) return;

    // Request login signature from Hive Keychain
    hive_keychain.requestSignBuffer(
        username, 
        "Flare Authentication", 
        "posting",
        function (response) {
            if (response.success) {
                alert("Logged in successfully!");
                loginBtn.style.display = "none";
                userDisplay.style.display = "block";
                userDisplay.textContent = `Logged in as @${username}`;
                localStorage.setItem("hiveUser", username);
            } else {
                alert("Login failed: " + response.message);
            }
        }
    );
});

// Auto-load user session
window.onload = function () {
    const savedUser = localStorage.getItem("hiveUser");
    if (savedUser) {
        loginBtn.style.display = "none";
        userDisplay.style.display = "block";
        userDisplay.textContent = `Logged in as @${savedUser}`;
    }
};
