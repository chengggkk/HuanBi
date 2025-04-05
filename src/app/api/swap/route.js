// pages/api/executeSwap.js
const { SDK, HashLock, PrivateKeyProviderConnector, NetworkEnum } = require("@1inch/cross-chain-sdk");
const { Web3 } = require('web3');
const { solidityPackedKeccak256, randomBytes } = require('ethers');

// Function to generate random bytes32 for secrets
function getRandomBytes32() {
    return '0x' + Buffer.from(randomBytes(32)).toString('hex');
}

export default async function handler(req, res) {
    // Only allow POST requests
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        // Get environment variables
        const makerPrivateKey = process.env.WALLET_KEY;
        const nodeUrl = process.env.RPC_URL;
        const devPortalApiKey = process.env.DEV_PORTAL_KEY;

        // Validate environment variables
        if (!makerPrivateKey || !nodeUrl || !devPortalApiKey) {
            return res.status(500).json({ 
                success: false, 
                error: "Server configuration error. Missing required environment variables." 
            });
        }

        // Extract parameters from request body
        const { 
            sourceChain, 
            destinationChain, 
            sourceToken, 
            destinationToken, 
            amount,
            walletAddress
        } = req.body;

        // Validate input parameters
        if (!sourceChain || !destinationChain || !sourceToken || !destinationToken || !amount) {
            return res.status(400).json({ 
                success: false, 
                error: "Missing required parameters" 
            });
        }

        // Initialize web3 and blockchain provider
        const web3Instance = new Web3(nodeUrl);
        const blockchainProvider = new PrivateKeyProviderConnector(makerPrivateKey, web3Instance);

        // Initialize 1inch SDK
        const sdk = new SDK({
            url: 'https://api.1inch.dev/fusion-plus',
            authKey: devPortalApiKey,
            blockchainProvider
        });

        // Extract and adjust amount (accounting for decimals)
        // This assumes the amount is already in the correct format
        const adjustedAmount = amount;

        // Configure swap parameters
        const params = {
            srcChainId: sourceChain,
            dstChainId: destinationChain,
            srcTokenAddress: sourceToken,
            dstTokenAddress: destinationToken,
            amount: adjustedAmount,
            enableEstimate: true,
            walletAddress: walletAddress || process.env.WALLET_ADDRESS
        };

        // Get quote
        console.log("Requesting quote from 1inch API...");
        const quote = await sdk.getQuote(params);
        
        // Generate secrets and hashes
        const secretsCount = quote.getPreset().secretsCount;
        const secrets = Array.from({ length: secretsCount }).map(() => getRandomBytes32());
        const secretHashes = secrets.map(x => HashLock.hashSecret(x));

        // Create hash lock
        const hashLock = secretsCount === 1
            ? HashLock.forSingleFill(secrets[0])
            : HashLock.forMultipleFills(
                secretHashes.map((secretHash, i) =>
                    solidityPackedKeccak256(['uint64', 'bytes32'], [i, secretHash.toString()])
                )
            );

        console.log("Received quote from 1inch API. Placing order...");

        // Place order
        const quoteResponse = await sdk.placeOrder(quote, {
            walletAddress: params.walletAddress,
            hashLock,
            secretHashes
        });

        const orderHash = quoteResponse.orderHash;
        console.log(`Order successfully placed with hash: ${orderHash}`);

        // Set up a monitoring mechanism for the order (in a real production app)
        // Here we'll just return success and the order hash
        // Note: In production, you'd set up a background task/worker to monitor and submit secrets
        
        // Start monitoring for fills (detached from the request)
        const monitorOrder = async () => {
            let isCompleted = false;
            let transactionHash = null;
            
            try {
                const pollingInterval = setInterval(async () => {
                    try {
                        console.log(`Polling for fills for order: ${orderHash}`);
                        
                        // Check order status
                        const order = await sdk.getOrderStatus(orderHash);
                        if (order.status === 'executed') {
                            console.log(`Order ${orderHash} is complete.`);
                            isCompleted = true;
                            clearInterval(pollingInterval);
                            return;
                        }
                        
                        // Check for fills ready to accept secrets
                        const fillsObject = await sdk.getReadyToAcceptSecretFills(orderHash);
                        
                        if (fillsObject.fills && fillsObject.fills.length > 0) {
                            fillsObject.fills.forEach(async fill => {
                                try {
                                    const result = await sdk.submitSecret(orderHash, secrets[fill.idx]);
                                    console.log(`Fill order found! Secret submitted for index ${fill.idx}`);
                                    transactionHash = result.transactionHash || "Unknown";
                                } catch (error) {
                                    console.error(`Error submitting secret for index ${fill.idx}:`, error);
                                }
                            });
                        }
                    } catch (error) {
                        console.error(`Error polling order ${orderHash}:`, error);
                    }
                }, 5000);

                // Stop polling after 10 minutes max
                setTimeout(() => {
                    if (!isCompleted) {
                        console.log(`Polling timed out for order ${orderHash}.`);
                        clearInterval(pollingInterval);
                    }
                }, 10 * 60 * 1000);
            } catch (error) {
                console.error(`Error in monitoring process for order ${orderHash}:`, error);
            }
        };

        // Start the monitoring in background (not waiting for it)
        monitorOrder().catch(err => console.error("Background monitoring error:", err));

        // Return success to the client
        return res.status(200).json({
            success: true,
            message: "Order successfully placed and monitoring started",
            orderHash: orderHash
        });

    } catch (error) {
        console.error("Swap execution error:", error);
        
        // Provide detailed error information
        return res.status(500).json({
            success: false,
            error: error.message || "An unexpected error occurred",
            details: error.response?.data || error.stack
        });
    }
}