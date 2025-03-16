const tg = window.Telegram.WebApp;
tg.ready();
tg.expand();

const status = document.getElementById('status');

// TON Connect setup
const tonConnect = new TonConnect.TonConnect({
    manifestUrl: 'https://raw.githubusercontent.com/cartiercode/TON-Bot/main/tonconnect-manifest.json'
});

// Fetch Dynamic API key from server
fetch('/api/config')
    .then(response => response.json())
    .then(config => {
        const dynamic = new DynamicSDK.Dynamic({
            environmentId: 'b2e3607f-f050-42e7-9d12-8674008ecdc2',
            apiKey: config.dynamicApiKey,
            walletConnectors: ['ton'],
            onAuthSuccess: (auth) => {
                status.textContent = "Connected via Dynamic! Ready to buy or trade.";
            },
            onError: (error) => {
                status.textContent = "Dynamic error: " + error.message;
            }
        });

        // Buy button
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
    })
    .catch(error => {
        status.textContent = "Failed to load config: " + error.message;
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
                validUntil: Math.floor(Date.now() / 1000) + 60,
                messages: [
                    {
                        address: "EQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAM9c",
                        amount: "1000000000",
                        payload: "te6ccgEBAQEAAgAAAA=="
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
