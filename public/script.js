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
                checkWallet();
            },
            onError: (error) => {
                status.textContent = "Dynamic error: " + error.message;
            }
        });

        // Buy button: Fiat-to-TON via Dynamic
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

        // Fetch STON.fi pools for trading pairs
        async function fetchStonFiPools() {
            try {
                const response = await fetch('https://api.ston.fi/v1/pools');
                const data = await response.json();
                return data.pools; // Array of pool objects
            } catch (error) {
                status.textContent = "Failed to fetch STON.fi pools: " + error.message;
                return [];
            }
        }

        // Populate trade pair dropdown
        fetchStonFiPools().then(pools => {
            const select = document.getElementById('tradePair');
            pools.forEach(pool => {
                const option = document.createElement('option');
                option.value = `${pool.token0_address},${pool.token1_address},${pool.pool_address}`;
                option.textContent = `${pool.token0_symbol}/${pool.token1_symbol}`;
                select.appendChild(option);
            });
        });

        // Trade button: STON.fi swap
        document.getElementById('tradeButton').addEventListener('click', async () => {
            if (!tonConnect.connected) {
                status.textContent = "Please connect your TON wallet first.";
                await tonConnect.connect({ universalLink: 'https://app.tonkeeper.com/ton-connect' });
            }
            if (tonConnect.connected) {
                const [tokenIn, tokenOut, poolAddress] = document.getElementById('tradePair').value.split(',');
                const amount = document.getElementById('tradeAmount').value || "1"; // Default 1 TON
                const amountInNano = Math.floor(amount * 1e9); // Convert to nanoTON

                status.textContent = "Simulating swap on STON.fi...";
                try {
                    // Simulate swap to get expected output
                    const simResponse = await fetch(`https://api.ston.fi/v1/swap/simulate?token_in=${tokenIn}&token_out=${tokenOut}&amount_in=${amountInNano}`);
                    const simData = await simResponse.json();
                    const amountOutMin = Math.floor(simData.amount_out * 0.95); // 5% slippage tolerance

                    // Construct swap transaction
                    const tx = {
                        validUntil: Math.floor(Date.now() / 1000) + 60, // 1 minute
                        messages: [
                            {
                                address: "EQD-ajvWV8TGrXCvLfqfO3-pqsbmgvVB89T5oJ-SsH9vG-Av", // STON.fi Router V1
                                amount: amountInNano.toString(),
                                payload: Buffer.from(
                                    "te6ccgEBAQEAAgAAAA==" + // Base64-encoded swap opcode (placeholder)
                                    "6664de2a" + // Swap opcode in hex
                                    tokenIn.slice(2) + // Remove "EQ" prefix
                                    tokenOut.slice(2) + // Remove "EQ" prefix
                                    amountOutMin.toString(16).padStart(16, '0'), // Hex amount out min
                                    "hex"
                                ).toString('base64')
                            }
                        ]
                    };

                    const result = await tonConnect.sendTransaction(tx);
                    status.textContent = `Swap successful! Got ${simData.amount_out / 1e9} ${simData.token_out_symbol}. Tx: ${result.boc}`;
                } catch (error) {
                    status.textContent = "Swap failed: " + error.message;
                }
            }
        });

        // Check wallet connection on load
        function checkWallet() {
            if (tonConnect.connected) {
                status.textContent = "Wallet connected: " + tonConnect.account.address;
            }
        }
        checkWallet();
    })
    .catch(error => {
        status.textContent = "Failed to load config: " + error.message;
    });
