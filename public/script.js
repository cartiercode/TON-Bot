console.log("JANE script loaded");

const tg = window.Telegram.WebApp;
tg.ready();
tg.expand();

const status = document.getElementById('status') || document.createElement('p');
if (!document.getElementById('status')) document.body.appendChild(status);

console.log("TON Connect SDK loaded:", typeof TonConnect);
console.log("Dynamic SDK loaded:", typeof DynamicSDK);

// TON Connect setup
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
                status.textContent = "Connected via Dynamic! Ready to buy or trade.";
                checkWallet();
            },
            onError: (error) => {
                status.textContent = "Dynamic error: " + error.message;
            }
        });

        // Buy button
        const buyButton = document.getElementById('buyButton');
        if (buyButton) {
            buyButton.addEventListener('click', async () => {
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
        }

        // Fetch STON.fi pools
        async function fetchStonFiPools() {
            try {
                const response = await fetch('https://api.ston.fi/v1/pools');
                const data = await response.json();
                return data.pools;
            } catch (error) {
                status.textContent = "Failed to fetch STON.fi pools: " + error.message;
                return [];
            }
        }

        // Populate trade pair dropdown
        fetchStonFiPools().then(pools => {
            const select = document.getElementById('tradePair');
            if (select) {
                pools.forEach(pool => {
                    const option = document.createElement('option');
                    option.value = `${pool.token0_address},${pool.token1_address},${pool.pool_address}`;
                    option.textContent = `${pool.token0_symbol}/${pool.token1_symbol}`;
                    select.appendChild(option);
                });
            }
        });

        // Trade button
        const tradeButton = document.getElementById('tradeButton');
        if (tradeButton) {
            tradeButton.addEventListener('click', async () => {
                if (!tonConnect.connected) {
                    status.textContent = "Please connect your TON wallet first.";
                    await tonConnect.connect({ universalLink: 'https://app.tonkeeper.com/ton-connect' });
                }
                if (tonConnect.connected) {
                    const [tokenIn, tokenOut, poolAddress] = document.getElementById('tradePair').value.split(',');
                    const amount = document.getElementById('tradeAmount').value || "1";
                    const amountInNano = Math.floor(amount * 1e9);

                    status.textContent = "Simulating swap on STON.fi...";
                    try {
                        const simResponse = await fetch(`https://api.ston.fi/v1/swap/simulate?token_in=${tokenIn}&token_out=${tokenOut}&amount_in=${amountInNano}`);
                        const simData = await simResponse.json();
                        const amountOutMin = Math.floor(simData.amount_out * 0.95);

                        const tx = {
                            validUntil: Math.floor(Date.now() / 1000) + 60,
                            messages: [
                                {
                                    address: "EQD-ajvWV8TGrXCvLfqfO3-pqsbmgvVB89T5oJ-SsH9vG-Av",
                                    amount: amountInNano.toString(),
                                    payload: Buffer.from(
                                        "te6ccgEBAQEAAgAAAA==" +
                                        "6664de2a" +
                                        tokenIn.slice(2) +
                                        tokenOut.slice(2) +
                                        amountOutMin.toString(16).padStart(16, '0'),
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
        }

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
