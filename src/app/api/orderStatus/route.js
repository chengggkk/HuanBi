// pages/api/orderStatus.js
const { SDK, PrivateKeyProviderConnector, NetworkEnum } = require("@1inch/cross-chain-sdk");
const { Web3 } = require('web3');

export default async function handler(req, res) {
    // Only allow GET requests
    if (req.method !== 'GET') {
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
                error: "Server configuration error. Missing required environment variables." 
            });
        }

        // Get order hash from query parameters
        const { orderHash } = req.query;

        if (!orderHash) {
            return res.status(400).json({ error: "Missing order hash parameter" });
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

        // Get order status
        const orderStatus = await sdk.getOrderStatus(orderHash);
        
        // Get any fills that are ready to have secrets submitted
        const fillsResponse = await sdk.getReadyToAcceptSecretFills(orderHash).catch(() => ({ fills: [] }));
        
        // Construct response with status information
        const response = {
            status: orderStatus.status,
            message: "Order status check successful",
            fills: fillsResponse.fills?.length || 0,
            readyForSecrets: fillsResponse.fills?.length > 0
        };
        
        // Include additional info based on status
        if (orderStatus.status === 'executed') {
            response.message = "Order has been successfully executed";
            response.transactionHash = orderStatus.transactionHash || null;
        } else if (orderStatus.status === 'failed') {
            response.message = "Order execution failed";
        } else if (fillsResponse.fills?.length > 0) {
            response.message = `Ready to submit secrets for ${fillsResponse.fills.length} fill(s)`;
        } else {
            response.message = "Waiting for fills...";
        }

        // Return the status information
        return res.status(200).json(response);
        
    } catch (error) {
        console.error("Order status check error:", error);
        
        // Return error information
        return res.status(500).json({
            error: "Failed to check order status",
            message: error.message,
            details: error.response?.data || error.stack
        });
    }
}