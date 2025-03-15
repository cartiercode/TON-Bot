const tg = window.Telegram.WebApp;
tg.ready();
tg.expand();

const status = document.getElementById('status');

// TON Connect setup
const tonConnect = new TonConnect.TonConnect({
    manifestUrl: 'https://raw.githubusercontent.com/your-username/telegram-mini-app/main/tonconnect-manifest.json'
});

// Dynamic.xyz setup
const dynamic = new DynamicSDK.Dynamic({
    environmentId: 'b2e3607f-f050-42e7-9d12-8674008ecdc2',
    apiKey: 'dyn_dpyt96L5ND5aHW6h9svzn1NmH5MUbRcg0LUSEA6UVSYhRQgjNh0TgNAi',
    walletConnectors: ['ton'], // TON-only per Telegram rules
    onAuthSuccess: (auth) => {
        status.textContent = "Connected via Dynamic! Ready to buy or trade.";
    },
    onError: (error) => {
        status.textContent = "Dynamic error: " + error.message;
    }
});

// Buy button (Fiat-to-TON via Dynamic)
document.getElementById('buyButton').addEventListener('click', async () => {
    status.textContent = "Opening fiat-to-crypto purchase...";
    try {
        if (!tonConnect.connected) {
            await tonConnect.connect({ universalLink: 'https://app.tonkeeper.com/ton-connect' });
        }
        if (tonConnect.connected) {
            status.textContent = "TON wallet connected. Launching Dynamic widget...";
            dynamic.openWidget('fiat-to-crypto', {
                destinationChain: 'ton',
                destinationToken: 'TON',
                walletAddress: tonConnect.account.address
            });
        } else {
            status.textContent = "Please connect your TON wallet first.";
        }
    } catch (error) {
        status.textContent = "Error: " + error.message;
    }
});

// Trade button (TON-to-JETTON simulation)
document.getElementById('tradeButton').addEventListener('click', async () => {
    if (!tonConnect.connected) {
        status.textContent = "Please connect your TON wallet first.";
        await tonConnect.connect({ universalLink: 'https://app.tonkeeper.com/ton-connect' });
    }
    if (tonConnect.connected) {
        status.textContent = "Initiating trade: 1 TON to JETTON...";
        try {
            const tx = {
                validUntil: Math.floor(Date.now() / 1000) + 60, // 1 min validity
                messages: [
                    {
                        address: "EQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAM9c", // Dummy JETTON address
                        amount: "1000000000", // 1 TON in nanoTON
                        payload: "te6ccgEBAQEAAgAAAA==" // Minimal payload
                    }
                ]
            };
            const result = await tonConnect.sendTransaction(tx);
            status.textContent = "Trade successful! Tx: " + result.boc;
        } catch (error) {
            status.textContent = "Trade failed: " + error.message;
        }
    }
});

// Check TON wallet connection on load
if (tonConnect.connected) {
    status.textContent = "Wallet connected: " + tonConnect.account.address;
}
