console.log("JANE script loaded");

const tg = window.Telegram.WebApp;
tg.ready();
tg.expand();

const status = document.getElementById('status') || document.createElement('p');
if (!document.getElementById('status')) document.body.appendChild(status);

let attempts = 0;
const maxAttempts = 50;

function waitForTonConnect(callback) {
    if (typeof TonConnect !== 'undefined') {
        console.log("TON Connect SDK loaded:", typeof TonConnect);
        callback();
    } else if (attempts < maxAttempts) {
        attempts++;
        console.log("Waiting for TON Connect... Attempt:", attempts);
        setTimeout(() => waitForTonConnect(callback), 100);
    } else {
        status.textContent = "Error: TON Connect not loaded after 5 seconds. Please reload.";
    }
}

waitForTonConnect(() => {
    const tonConnect = new TonConnect.TonConnect({
        manifestUrl: 'https://raw.githubusercontent.com/cartiercode/TON-Bot/main/tonconnect-manifest.json'
    });

    const buyButton = document.getElementById('buyButton');
    if (buyButton) {
        buyButton.addEventListener('click', async () => {
            status.textContent = "Connecting wallet for fiat purchase...";
            try {
                if (!tonConnect.connected) {
                    await tonConnect.connect({ universalLink: 'https://app.tonkeeper.com/ton-connect' });
                }
                if (tonConnect.connected) {
                    status.textContent = "Wallet connected. Opening Tonkeeper to buy TON...";
                    tg.openLink('https://app.tonkeeper.com/ton-connect?buy');
                } else {
                    status.textContent = "Please connect your TON wallet first.";
                }
            } catch (error) {
                status.textContent = "Error: " + error.message;
            }
        });
    }

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
});
