const tg = window.Telegram.WebApp;
tg.ready();
tg.expand();

const status = document.getElementById('status');

// TON Connect setup for wallet interactions
const tonConnect = new TonConnect.TonConnect({
    manifestUrl: 'https://raw.githubusercontent.com/cartiercode/TON-Bot/main/tonconnect-manifest.json'
});

// Fetch Dynamic API key from the server to keep it secure
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

        // Buy button: Use Dynamic for fiat-to-TON purchase, handling KYC for you
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

        // Trade button: Placeholder for STON.fi swaps (replace with actual values)
        const routerAddress = 'EQ...'; // Replace with STON.fi router contract address from [docs.ston.fi](https://docs.ston.fi)
        const routerAbi = {
            // Replace with actual ABI from STON.fi's documentation
        };
        const routerContract = tonConnect.getContract({
            address: routerAddress,
            abi: routerAbi
        });

        document.getElementById('tradeButton').addEventListener('click', async () => {
            if (!tonConnect.connected) {
                status.textContent = "Please connect your TON wallet first.";
                await tonConnect.connect({ universalLink: 'https://app.tonkeeper.com/ton-connect' });
            }
            if (tonConnect.connected) {
                const amountIn = 1000000000; // 1 TON in nanoTON, adjust as needed
                const path = ['tokenA', 'tokenB']; // Replace with actual token addresses from STON.fi
                const amountOutMin = 0; // Minimum amount to receive, adjust for slippage
                const deadline = Math.floor(Date.now() / 1000) + 60; // 1 minute from now

                try {
                    const { transaction } = await routerContract.run('swap', {
                        amountIn,
                        path,
                        amountOutMin,
                        deadline
                    });
                    const result = await tonConnect.sendTransaction(transaction);
                    status.textContent = "Swap successful! Tx: " + result.boc;
                } catch (error) {
                    status.textContent = "Swap failed: " + error.message;
                }
            }
        });

        // Check wallet connection on load
        if (tonConnect.connected) {
            status.textContent = "Wallet connected: " + tonConnect.account.address;
        }
    })
    .catch(error => {
        status.textContent = "Failed to load config: " + error.message;
    });
