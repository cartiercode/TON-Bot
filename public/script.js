const tg = window.Telegram.WebApp;
tg.ready();
tg.expand();

const status = document.getElementById('status');
const tonConnect = new TonConnect.TonConnect({
    manifestUrl: 'https://raw.githubusercontent.com/cartiercode/TON-Bot/main/tonconnect-manifest.json'
});

// Fetch Dynamic API key
fetch('/api/config')
    .then(response => response.json())
    .then(config => {
        const dynamic = new DynamicSDK.Dynamic({
            environmentId: 'b2e3607f-f050-42e7-9d12-8674008ecdc2',
            apiKey: config.dynamicApiKey,
            walletConnectors: ['ton'],
            onAuthSuccess: (auth) => {
                status.textContent = "JANE is now your TON wallet!";
                checkWallet();
            },
            onError: (error) => status.textContent = "Error: " + error.message
        });

        // Buy button
        document.getElementById('buyButton').addEventListener('click', async () => {
            status.textContent = "Opening fiat-to-TON purchase...";
            if (!tonConnect.connected) await tonConnect.connect({ universalLink: 'https://app.tonkeeper.com/ton-connect' });
            if (tonConnect.connected) {
                dynamic.openWidget('fiat-to-crypto', {
                    destinationChain: 'ton',
                    destinationToken: 'TON',
                    walletAddress: tonConnect.account.address
                });
                status.textContent = "Purchase TON with fiat!";
            } else {
                status.textContent = "Please connect your wallet.";
            }
        });

        // Check wallet status
        function checkWallet() {
            if (tonConnect.connected) {
                status.textContent = `Wallet connected: ${tonConnect.account.address}`;
            }
        }
        checkWallet();
    })
    .catch(error => status.textContent = "Config error: " + error.message);
