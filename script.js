// Telegram Web App setup
const tg = window.Telegram.WebApp;
tg.ready(); // Initialize the app
tg.expand(); // Make it full-screen

// TON Connect (simple wallet connection)
const connectButton = document.getElementById('connectButton');
const status = document.getElementById('status');

connectButton.addEventListener('click', () => {
    status.textContent = "Connecting to TON wallet...";
    // Simulate wallet connection (TON Connect SDK would go here)
    setTimeout(() => {
        status.textContent = "Wallet connected! You’re onboarded.";
    }, 2000);
});
