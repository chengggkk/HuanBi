import React, { useState, useEffect } from "react";
import { SDK, NetworkEnum, HashLock } from "@1inch/cross-chain-sdk";
import Web3 from 'web3';
import { 
    ethers,
    solidityPackedKeccak256, 
    randomBytes, 
    Contract, 
    Wallet
} from 'ethers';

// API Proxy configuration
const PROXY_BASE_URL = 'https://1inchproxy-kcj2.vercel.app/api';

// Network and token configuration
const NETWORKS = {
    "ETHEREUM": 1,
    "ARBITRUM": 42161,
    "COINBASE": 8453
};

// Token configuration with decimals
const TOKENS = {
    "1": {  // Ethereum
        "USDC": {
            address: "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
            decimals: 6
        },
        "ETH": {
            address: "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2",
            decimals: 18
        }
    },
    "42161": {  // Arbitrum
        "USDC": {
            address: "0xff970a61a04b1ca14834a43f5de4533ebddb5cc8",
            decimals: 6
        },
        "ETH": {
            address: "0x82af49447d8a07e3bd95bd0d56f35241523fbab1",
            decimals: 18
        }
    },
    "8453": {  // Base (Coinbase)
        "USDC": {
            address: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
            decimals: 6
        },
        "ETH": {
            address: "0x4200000000000000000000000000000000000006",
            decimals: 18
        }
    }
};

// ERC20 token approval ABI
const ERC20_ABI = [
    {
        "constant": false,
        "inputs": [
            { "name": "spender", "type": "address" },
            { "name": "amount", "type": "uint256" }
        ],
        "name": "approve",
        "outputs": [{ "name": "", "type": "bool" }],
        "payable": false,
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "constant": true,
        "inputs": [
            { "name": "owner", "type": "address" }
        ],
        "name": "balanceOf",
        "outputs": [{ "name": "", "type": "uint256" }],
        "payable": false,
        "stateMutability": "view",
        "type": "function"
    }
];

// 1inch Aggregation Router V5 address
const INCH_ROUTER = '0x111111125421ca6dc452d289314280a0f8842a65';

function FusionSwap() {
    // State management
    const [web3, setWeb3] = useState(null);
    const [walletAddress, setWalletAddress] = useState(null);
    const [walletConnected, setWalletConnected] = useState(false);
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState("");
    const [error, setError] = useState("");
    const [txHash, setTxHash] = useState("");
    const [orderStatus, setOrderStatus] = useState("");
    const [orderHash, setOrderHash] = useState("");
    const [isPolling, setIsPolling] = useState(false);

    // Swap configuration state
    const [sourceChain, setSourceChain] = useState("ETHEREUM");
    const [destinationChain, setDestinationChain] = useState("ARBITRUM");
    const [sourceToken, setSourceToken] = useState("USDC");
    const [destinationToken, setDestinationToken] = useState("ETH");
    const [amount, setAmount] = useState("0.5");
    
    // Monitoring state
    const [monitoringProgress, setMonitoringProgress] = useState("");

    // Initialize wallet and web3
    useEffect(() => {
        const initializeWallet = async () => {
            try {
                if (window.ethereum) {
                    // Initialize web3
                    const web3Instance = new Web3(window.ethereum);
                    setWeb3(web3Instance);
                    
                    // Request accounts
                    const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
                    if (accounts && accounts.length > 0) {
                        setWalletAddress(accounts[0]);
                        setWalletConnected(true);
                    }
                    
                    // Setup event listener for account changes
                    window.ethereum.on('accountsChanged', (accounts) => {
                        if (accounts.length > 0) {
                            setWalletAddress(accounts[0]);
                            setWalletConnected(true);
                        } else {
                            setWalletAddress(null);
                            setWalletConnected(false);
                        }
                    });
                } else {
                    setError("Ethereum wallet not detected. Please install MetaMask.");
                }
            } catch (err) {
                setError(`Wallet initialization failed: ${err.message}`);
            }
        };

        initializeWallet();
        
        // Cleanup listener on unmount
        return () => {
            if (window.ethereum && window.ethereum.removeListener) {
                window.ethereum.removeListener('accountsChanged', () => {});
            }
        };
    }, []);

    // Function to approve token spending
    const approveToken = async (tokenAddress, decimals) => {
        try {
            setStatus("Approving token spending...");
            
            const tokenContract = new web3.eth.Contract(ERC20_ABI, tokenAddress);
            
            // Maximum approval amount (uint256 max)
            const maxApproval = '115792089237316195423570985008687907853269984665640564039457584007913129639935';
            
            // Send approval transaction
            const tx = await tokenContract.methods
                .approve(INCH_ROUTER, maxApproval)
                .send({ from: walletAddress });
            
            setStatus(`Token approved! Transaction hash: ${tx.transactionHash}`);
            setTxHash(tx.transactionHash);
            
            return tx.transactionHash;
        } catch (err) {
            console.error("Token approval error:", err);
            throw new Error(`Token approval failed: ${err.message}`);
        }
    };

    // Execute the node script directly 
    const executeNodeScript = async () => {
        try {
            setLoading(true);
            setError("");
            setTxHash("");
            setOrderHash("");
            setOrderStatus("");
            setStatus("Preparing to execute swap via Node.js...");
            
            // Get network and token details
            const srcChainId = NETWORKS[sourceChain];
            const dstChainId = NETWORKS[destinationChain];
            
            const srcTokenInfo = TOKENS[srcChainId][sourceToken];
            const dstTokenInfo = TOKENS[dstChainId][destinationToken];
            
            // Calculate amount with correct decimals
            const decimals = srcTokenInfo.decimals;
            const amountFloat = parseFloat(amount);
            if (isNaN(amountFloat)) {
                throw new Error("Invalid amount");
            }
            
            const adjustedAmount = (BigInt(Math.floor(amountFloat * (10 ** decimals)))).toString();
            
            // First approve the token if needed (for ERC20 tokens)
            if (sourceToken !== "ETH") {
                await approveToken(srcTokenInfo.address, decimals);
                setStatus("Token approved. Executing swap via Node.js...");
            }
            
            // Make request to the Node.js backend
            const response = await fetch('/api/swap', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    sourceChain: srcChainId,
                    destinationChain: dstChainId,
                    sourceToken: srcTokenInfo.address,
                    destinationToken: dstTokenInfo.address,
                    amount: adjustedAmount,
                    walletAddress: walletAddress
                })
            });
            
            const result = await response.json();
            
            if (result.success) {
                setStatus(`Node script executed successfully! Order hash: ${result.orderHash}`);
                setOrderHash(result.orderHash);
                
                // Start polling for order status
                setIsPolling(true);
                pollOrderStatus(result.orderHash);
            } else {
                throw new Error(result.error || "Unknown error occurred");
            }
            
        } catch (err) {
            console.error("Node execution error:", err);
            setError(`Failed to execute Node script: ${err.message}`);
        } finally {
            setLoading(false);
        }
    };
    
    // Poll for order status
    const pollOrderStatus = async (hash) => {
        let pollingInterval;
        
        try {
            // Setup polling interval
            pollingInterval = setInterval(async () => {
                try {
                    const response = await fetch(`/api/orderStatus?orderHash=${hash}`);
                    
                    if (!response.ok) {
                        // Just log errors but continue polling
                        console.error("Error fetching order status:", await response.text());
                        return;
                    }
                    
                    const data = await response.json();
                    
                    // Update status
                    setOrderStatus(data.status);
                    setMonitoringProgress(data.message || "Monitoring order...");
                    
                    // If transaction hash is available, set it
                    if (data.transactionHash) {
                        setTxHash(data.transactionHash);
                    }
                    
                    // If order is complete, stop polling
                    if (data.status === 'executed' || data.status === 'failed' || data.status === 'cancelled') {
                        setIsPolling(false);
                        clearInterval(pollingInterval);
                        
                        if (data.status === 'executed') {
                            setStatus(`Order complete! Transaction hash: ${data.transactionHash || "Available soon"}`);
                        } else {
                            setStatus(`Order ${data.status}. Please check details on the blockchain explorer.`);
                        }
                    }
                } catch (error) {
                    console.error("Status polling error:", error);
                    // Continue polling even if there's an error
                }
            }, 5000);
            
            // Set a timeout to stop polling after 10 minutes
            setTimeout(() => {
                if (pollingInterval) {
                    clearInterval(pollingInterval);
                    setIsPolling(false);
                    setStatus("Polling stopped after timeout. Check status on blockchain explorer.");
                }
            }, 10 * 60 * 1000);
        } catch (error) {
            console.error("Error setting up polling:", error);
            if (pollingInterval) {
                clearInterval(pollingInterval);
            }
            setIsPolling(false);
        }
    };

    return (
        <div style={{ 
            maxWidth: "450px", 
            margin: "0 auto", 
            padding: "20px", 
            textAlign: "center",
            fontFamily: "Arial, sans-serif",
            backgroundColor: "#f5f5f5",
            borderRadius: "8px",
            boxShadow: "0 4px 6px rgba(0,0,0,0.1)"
        }}>
            <h2 style={{ color: "#333", marginBottom: "20px" }}>1inch Fusion+ Cross-Chain Swap</h2>

            {/* Error Display */}
            {error && (
                <div style={{ 
                    backgroundColor: "#ffebee", 
                    color: "#c62828", 
                    padding: "10px", 
                    marginBottom: "15px",
                    borderRadius: "4px",
                    border: "1px solid #ef9a9a"
                }}>
                    {error}
                </div>
            )}

            {/* Status Display */}
            {status && (
                <div style={{ 
                    backgroundColor: "#e3f2fd", 
                    color: "#1565c0", 
                    padding: "10px", 
                    marginBottom: "15px",
                    borderRadius: "4px",
                    border: "1px solid #90caf9"
                }}>
                    {status}
                </div>
            )}

            {/* Monitoring Progress Display */}
            {isPolling && monitoringProgress && (
                <div style={{ 
                    backgroundColor: "#f9fbe7", 
                    color: "#827717", 
                    padding: "10px", 
                    marginBottom: "15px",
                    borderRadius: "4px",
                    border: "1px solid #dce775"
                }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <div style={{ 
                            width: "20px", 
                            height: "20px", 
                            borderRadius: "50%", 
                            border: "3px solid #827717",
                            borderTopColor: "transparent",
                            animation: "spin 1s linear infinite",
                            marginRight: "10px"
                        }}></div>
                        {monitoringProgress}
                    </div>
                    <style jsx>{`
                        @keyframes spin {
                            0% { transform: rotate(0deg); }
                            100% { transform: rotate(360deg); }
                        }
                    `}</style>
                </div>
            )}

            {/* Transaction Hash Display */}
            {txHash && (
                <div style={{ 
                    backgroundColor: "#e8f5e9", 
                    color: "#2e7d32", 
                    padding: "10px", 
                    marginBottom: "15px",
                    borderRadius: "4px",
                    border: "1px solid #a5d6a7",
                    wordBreak: "break-all"
                }}>
                    <strong>Transaction Hash:</strong><br />
                    {txHash}
                </div>
            )}

            {/* Order Hash Display */}
            {orderHash && (
                <div style={{ 
                    backgroundColor: "#fff3e0", 
                    color: "#e65100", 
                    padding: "10px", 
                    marginBottom: "15px",
                    borderRadius: "4px",
                    border: "1px solid #ffcc80",
                    wordBreak: "break-all"
                }}>
                    <strong>Order Hash:</strong><br />
                    {orderHash}
                    {orderStatus && (
                        <div style={{ marginTop: "5px" }}>
                            <strong>Status:</strong> {orderStatus}
                        </div>
                    )}
                </div>
            )}

            <div style={{ 
                backgroundColor: "white", 
                padding: "15px", 
                borderRadius: "6px",
                marginBottom: "15px"
            }}>
                {/* Source Chain Selection */}
                <div style={{ marginBottom: "15px" }}>
                    <label style={{ display: "block", marginBottom: "5px", fontWeight: "bold", color: "#555", textAlign: "left" }}>Source Chain</label>
                    <select
                        value={sourceChain}
                        onChange={(e) => setSourceChain(e.target.value)}
                        style={{ 
                            width: "100%", 
                            padding: "10px", 
                            borderRadius: "4px",
                            border: "1px solid #ddd"
                        }}
                        disabled={loading}
                    >
                        {Object.keys(NETWORKS).map(network => (
                            <option key={network} value={network}>{network}</option>
                        ))}
                    </select>
                </div>

                {/* Source Token Selection */}
                <div style={{ marginBottom: "15px" }}>
                    <label style={{ display: "block", marginBottom: "5px", fontWeight: "bold", color: "#555", textAlign: "left" }}>Source Token</label>
                    <select
                        value={sourceToken}
                        onChange={(e) => setSourceToken(e.target.value)}
                        style={{ 
                            width: "100%", 
                            padding: "10px", 
                            borderRadius: "4px",
                            border: "1px solid #ddd"
                        }}
                        disabled={loading}
                    >
                        {Object.keys(TOKENS[NETWORKS[sourceChain]]).map(token => (
                            <option key={token} value={token}>{token}</option>
                        ))}
                    </select>
                </div>

                {/* Amount Input */}
                <div style={{ marginBottom: "15px" }}>
                    <label style={{ display: "block", marginBottom: "5px", fontWeight: "bold", color: "#555", textAlign: "left" }}>Amount</label>
                    <div style={{ position: "relative" }}>
                        <input
                            type="text"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            style={{ 
                                width: "100%", 
                                padding: "10px", 
                                borderRadius: "4px",
                                border: "1px solid #ddd",
                                boxSizing: "border-box"
                            }}
                            placeholder="Enter amount"
                            disabled={loading}
                        />
                        <span style={{ 
                            position: "absolute", 
                            right: "10px", 
                            top: "50%", 
                            transform: "translateY(-50%)",
                            color: "#666"
                        }}>
                            {sourceToken}
                        </span>
                    </div>
                </div>

                {/* Destination Chain Selection */}
                <div style={{ marginBottom: "15px" }}>
                    <label style={{ display: "block", marginBottom: "5px", fontWeight: "bold", color: "#555", textAlign: "left" }}>Destination Chain</label>
                    <select
                        value={destinationChain}
                        onChange={(e) => setDestinationChain(e.target.value)}
                        style={{ 
                            width: "100%", 
                            padding: "10px", 
                            borderRadius: "4px",
                            border: "1px solid #ddd"
                        }}
                        disabled={loading}
                    >
                        {Object.keys(NETWORKS).map(network => (
                            <option key={network} value={network}>{network}</option>
                        ))}
                    </select>
                </div>

                {/* Destination Token Selection */}
                <div style={{ marginBottom: "15px" }}>
                    <label style={{ display: "block", marginBottom: "5px", fontWeight: "bold", color: "#555", textAlign: "left" }}>Destination Token</label>
                    <select
                        value={destinationToken}
                        onChange={(e) => setDestinationToken(e.target.value)}
                        style={{ 
                            width: "100%", 
                            padding: "10px", 
                            borderRadius: "4px",
                            border: "1px solid #ddd"
                        }}
                        disabled={loading}
                    >
                        {Object.keys(TOKENS[NETWORKS[destinationChain]]).map(token => (
                            <option key={token} value={token}>{token}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Execute Swap Button */}
            <button
                onClick={executeNodeScript}
                disabled={loading || !walletConnected}
                style={{
                    width: "100%",
                    padding: "14px",
                    backgroundColor: (loading || !walletConnected) ? "#cccccc" : "#2e7d32",
                    color: "white",
                    border: "none",
                    borderRadius: "5px",
                    cursor: (loading || !walletConnected) ? "not-allowed" : "pointer",
                    fontWeight: "bold",
                    fontSize: "16px",
                    transition: "background-color 0.3s ease"
                }}
            >
                {loading ? "Processing..." : "Execute Cross-Chain Swap"}
            </button>

            {/* Wallet Connection Status */}
            <div style={{ marginTop: "15px", fontSize: "14px", color: "#666" }}>
                {walletConnected ? (
                    <div>
                        <span>Connected: </span>
                        <span style={{ fontWeight: "bold" }}>
                            {walletAddress.substring(0, 6)}...{walletAddress.substring(38)}
                        </span>
                    </div>
                ) : (
                    <div style={{ color: "#d32f2f" }}>
                        <span>Wallet not connected</span>
                    </div>
                )}
            </div>
        </div>
    );
}

export default FusionSwap;