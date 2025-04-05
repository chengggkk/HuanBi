import React, { useState, useEffect } from "react";
import Web3 from 'web3';
import { ethers } from 'ethers';

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
const INCH_ROUTER = '0x1111111254fb6c44bac0bed2854e76f90643097d'; // Updated to correct router address

function FusionSwap() {
    // State management
    const [web3, setWeb3] = useState(null);
    const [walletAddress, setWalletAddress] = useState(null);
    const [walletConnected, setWalletConnected] = useState(false);
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState("");
    const [txHash, setTxHash] = useState("");
    const [orderStatus, setOrderStatus] = useState("");
    const [orderHash, setOrderHash] = useState("");
    const [isPolling, setIsPolling] = useState(false);
    const [isMobile, setIsMobile] = useState(false);
    const [pendingAction, setPendingAction] = useState(null);
    const [pendingApproval, setPendingApproval] = useState(null);

    // Swap configuration state
    const [sourceChain, setSourceChain] = useState("ETHEREUM");
    const [destinationChain, setDestinationChain] = useState("ARBITRUM");
    const [sourceToken, setSourceToken] = useState("USDC");
    const [destinationToken, setDestinationToken] = useState("ETH");
    const [amount, setAmount] = useState("0.5");

    // Monitoring state
    const [monitoringProgress, setMonitoringProgress] = useState("");

    // Check if on mobile device
    useEffect(() => {
        const checkMobile = () => {
            const userAgent = navigator.userAgent || navigator.vendor || window.opera;
            return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
        };

        setIsMobile(checkMobile());
    }, []);

    // Check for pending actions after returning from wallet redirect
    useEffect(() => {
        const checkPendingActions = async () => {
            try {
                // Check for pending swap action
                const pendingActionData = localStorage.getItem('pendingSwapAction');
                if (pendingActionData) {
                    // Clear the pending action flag
                    localStorage.removeItem('pendingSwapAction');

                    // If we have ethereum and we're connected, continue with the action
                    if (window.ethereum && walletConnected) {
                        // Give a moment for the wallet to fully initialize
                        setTimeout(() => {
                            executeNodeScript();
                        }, 1000);
                    }
                }

                // Check for pending approval action
                const pendingApprovalData = localStorage.getItem('pendingApproval');
                if (pendingApprovalData) {
                    try {
                        const approvalData = JSON.parse(pendingApprovalData);
                        if (approvalData && approvalData.tokenAddress && approvalData.decimals) {
                            // Clear the pending approval flag
                            localStorage.removeItem('pendingApproval');

                            // If we have ethereum and we're connected, continue with the approval
                            if (window.ethereum && walletConnected) {
                                // Give a moment for the wallet to fully initialize
                                setTimeout(async () => {
                                    await approveToken(approvalData.tokenAddress, approvalData.decimals);
                                    
                                    // After approval, check if we need to continue with swap
                                    if (approvalData.continueWithSwap) {
                                        executeNodeScript();
                                    }
                                }, 1000);
                            }
                        }
                    } catch (error) {
                        console.error("Error parsing pending approval data:", error);
                        localStorage.removeItem('pendingApproval');
                    }
                }
            } catch (err) {
                console.warn("Error checking pending actions:", err);
            }
        };

        if (walletConnected) {
            checkPendingActions();
        }
    }, [walletConnected]);

    // Initialize wallet and web3
    useEffect(() => {
        const initializeWallet = async () => {
            try {
                // First, check localStorage for a saved wallet address
                let savedAddress = null;

                try {
                    savedAddress = localStorage.getItem('walletAddress');
                } catch (e) {
                    console.warn("Could not access localStorage:", e);
                }

                if (savedAddress) {
                    console.log("Found saved wallet address:", savedAddress);
                    setWalletAddress(savedAddress);
                    setWalletConnected(true);

                    // Initialize web3 if ethereum is available
                    if (window.ethereum) {
                        const web3Instance = new Web3(window.ethereum);
                        setWeb3(web3Instance);

                        // Try to request accounts to verify the connection
                        try {
                            const accounts = await window.ethereum.request({
                                method: 'eth_accounts', // Use eth_accounts instead of eth_requestAccounts to avoid prompts
                            });

                            if (accounts && accounts.length > 0) {
                                // Update with the current account (might be different from saved)
                                setWalletAddress(accounts[0]);
                                try {
                                    localStorage.setItem('walletAddress', accounts[0]);
                                } catch (e) {
                                    console.warn("Could not update localStorage:", e);
                                }
                            }
                        } catch (error) {
                            // If requesting accounts fails, we still use the saved address
                            console.log("Could not request accounts, using saved address");
                        }
                    } else {
                        // If ethereum is not available but we have a saved address,
                        // create a read-only web3 instance using Infura
                        try {
                            const readOnlyProvider = `https://mainnet.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161`; // Public key
                            const web3Instance = new Web3(new Web3.providers.HttpProvider(readOnlyProvider));
                            setWeb3(web3Instance);
                        } catch (error) {
                            console.error("Failed to initialize read-only web3:", error);
                        }
                    }
                } else if (window.ethereum) {
                    // If no saved address but ethereum is available
                    try {
                        const web3Instance = new Web3(window.ethereum);
                        setWeb3(web3Instance);

                        // Check if ethereum is already connected
                        const accounts = await window.ethereum.request({
                            method: 'eth_accounts'
                        });

                        if (accounts && accounts.length > 0) {
                            setWalletAddress(accounts[0]);
                            setWalletConnected(true);
                            try {
                                localStorage.setItem('walletAddress', accounts[0]);
                            } catch (e) {
                                console.warn("Could not update localStorage:", e);
                            }
                        }

                        // Setup event listener for account changes
                        window.ethereum.on('accountsChanged', (accounts) => {
                            if (accounts && accounts.length > 0) {
                                setWalletAddress(accounts[0]);
                                setWalletConnected(true);
                                try {
                                    localStorage.setItem('walletAddress', accounts[0]);
                                } catch (e) {
                                    console.warn("Could not update localStorage:", e);
                                }
                            } else {
                                setWalletAddress(null);
                                setWalletConnected(false);
                                try {
                                    localStorage.removeItem('walletAddress');
                                } catch (e) {
                                    console.warn("Could not remove from localStorage:", e);
                                }
                            }
                        });
                    } catch (error) {
                        console.error("Error initializing with ethereum provider:", error);
                    }
                }
            } catch (err) {
                console.error("Wallet initialization failed:", err);
                // Don't show frontend errors
            }
        };

        initializeWallet();

        // Set up visibility change event listener to reinitialize on tab focus
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                initializeWallet();
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);

        // Cleanup listeners on unmount
        return () => {
            if (window.ethereum) {
                window.ethereum.removeListener('accountsChanged', () => { });
                window.ethereum.removeListener('chainChanged', () => { });
            }
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, [isMobile]);

    // Redirect to MetaMask app
    const redirectToMetaMask = (action = 'connect', data = null) => {
        if (isMobile) {
            try {
                // Store action type in localStorage
                if (action === 'swap') {
                    localStorage.setItem('pendingSwapAction', 'true');
                } else if (action === 'approve' && data) {
                    localStorage.setItem('pendingApproval', JSON.stringify(data));
                }

                // Create MetaMask deep link
                const currentHost = window.location.host;
                const currentPath = window.location.pathname;
                const metaMaskDeepLink = `https://metamask.app.link/dapp/${currentHost}${currentPath}`;

                // Redirect to MetaMask
                window.location.href = metaMaskDeepLink;

                // Set status after a delay in case the redirect doesn't happen
                setTimeout(() => {
                    setStatus("Opening MetaMask...");
                }, 500);
                
                return true;
            } catch (error) {
                console.error("Error redirecting to MetaMask app:", error);
                setStatus("Please open in a wallet browser");
                return false;
            }
        }
        return false;
    };

    // Ensure wallet is connected
    const ensureWalletConnected = async () => {
        // If already connected, return true
        if (walletConnected && walletAddress) {
            return true;
        }

        // If on mobile and MetaMask is not directly available, redirect
        if (isMobile && !window.ethereum) {
            redirectToMetaMask('connect');
            return false;
        }

        // Try to connect using ethereum provider
        if (window.ethereum) {
            try {
                const accounts = await window.ethereum.request({
                    method: 'eth_requestAccounts'
                });

                if (accounts && accounts.length > 0) {
                    setWalletAddress(accounts[0]);
                    setWalletConnected(true);

                    try {
                        localStorage.setItem('walletAddress', accounts[0]);
                    } catch (e) {
                        console.warn("Could not update localStorage:", e);
                    }

                    // Initialize web3 if not already done
                    if (!web3) {
                        const web3Instance = new Web3(window.ethereum);
                        setWeb3(web3Instance);
                    }

                    setStatus("Wallet connected");
                    return true;
                }
            } catch (error) {
                console.error("Error connecting wallet:", error);
                setStatus("Could not connect wallet");
                return false;
            }
        } else {
            setStatus("No wallet detected");
            return false;
        }

        return false;
    };

    // Connect wallet manually
    const connectWallet = async () => {
        try {
            if (!window.ethereum) {
                if (isMobile) {
                    // On mobile without a wallet, try to redirect to wallet app
                    redirectToMetaMask('connect');
                    return;
                }

                // On desktop without ethereum provider, show minimal guidance
                setStatus("Please install MetaMask to connect");
                return;
            }

            try {
                const accounts = await window.ethereum.request({
                    method: 'eth_requestAccounts'
                });

                if (accounts && accounts.length > 0) {
                    setWalletAddress(accounts[0]);
                    setWalletConnected(true);
                    try {
                        localStorage.setItem('walletAddress', accounts[0]);
                    } catch (e) {
                        console.warn("Could not update localStorage:", e);
                    }

                    // Initialize web3 if not already done
                    if (!web3) {
                        const web3Instance = new Web3(window.ethereum);
                        setWeb3(web3Instance);
                    }

                    setStatus("Wallet connected");
                }
            } catch (error) {
                console.error("Error requesting accounts:", error);
                setStatus("Could not connect wallet");
            }
        } catch (err) {
            console.error("Error connecting wallet:", err);
            // Don't show detailed errors
            setStatus("Connection failed");
        }
    };

    // Disconnect wallet
    const disconnectWallet = () => {
        setWalletAddress(null);
        setWalletConnected(false);
        try {
            localStorage.removeItem('walletAddress');
            localStorage.removeItem('pendingSwapAction');
            localStorage.removeItem('pendingApproval');
        } catch (e) {
            console.warn("Could not remove from localStorage:", e);
        }
        setStatus("Wallet disconnected");
    };

    // Function to approve token spending - with better error handling and mobile redirection
    const approveToken = async (tokenAddress, decimals, continueWithSwap = true) => {
        if (!walletConnected || !web3) {
            const connected = await ensureWalletConnected();
            if (!connected) {
                return null;
            }
        }

        try {
            setStatus("Approving token spending...");

            // If on mobile and using dapp browser (not MetaMask app), redirect to MetaMask
            if (isMobile && !window.ethereum?.isMetaMask) {
                // Store approval data for when we return
                const redirected = redirectToMetaMask('approve', {
                    tokenAddress,
                    decimals,
                    continueWithSwap
                });
                if (redirected) {
                    return null; // We'll complete this when we return from MetaMask
                }
            }

            // Create contract instance
            const tokenContract = new web3.eth.Contract(ERC20_ABI, tokenAddress);

            // Maximum approval amount (uint256 max)
            const maxApproval = '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff';

            // Send approval transaction with proper gas parameters
            const tx = await tokenContract.methods
                .approve(INCH_ROUTER, maxApproval)
                .send({
                    from: walletAddress,
                    gasLimit: web3.utils.toHex(100000), // Explicit gas limit
                });

            setStatus(`Token approved! Transaction hash: ${tx.transactionHash}`);
            setTxHash(tx.transactionHash);

            return tx.transactionHash;
        } catch (err) {
            console.error("Token approval error:", err);
            // Return null instead of throwing an error
            setStatus("Token approval failed - please try again");
            return null;
        }
    };

    // Execute the node script directly 
    const executeNodeScript = async () => {
        // First ensure wallet is connected
        const isConnected = await ensureWalletConnected();
        if (!isConnected) {
            return; // Don't proceed if wallet connection failed or is pending
        }

        try {
            setLoading(true);
            setTxHash("");
            setOrderHash("");
            setOrderStatus("");
            setStatus("Preparing to execute swap...");

            // Get network and token details
            const srcChainId = NETWORKS[sourceChain];
            const dstChainId = NETWORKS[destinationChain];

            const srcTokenInfo = TOKENS[srcChainId][sourceToken];
            const dstTokenInfo = TOKENS[dstChainId][destinationToken];

            // Calculate amount with correct decimals
            const decimals = srcTokenInfo.decimals;
            const amountFloat = parseFloat(amount);
            if (isNaN(amountFloat)) {
                setStatus("Please enter a valid amount");
                setLoading(false);
                return;
            }

            // Convert to BigInt and back to string to avoid scientific notation
            const adjustedAmount = (BigInt(Math.floor(amountFloat * (10 ** decimals)))).toString();

            // First approve the token if needed (for ERC20 tokens)
            if (sourceToken !== "ETH") {
                const approvalHash = await approveToken(srcTokenInfo.address, decimals);
                if (!approvalHash) {
                    // If approval failed or is pending due to redirect, stop the execution
                    setLoading(false);
                    return;
                }
                setStatus("Token approved. Executing swap...");
            }

            // If we're on mobile in a non-MetaMask browser, redirect to MetaMask app
            if (isMobile && !window.ethereum?.isMetaMask) {
                const redirected = redirectToMetaMask('swap');
                if (redirected) {
                    setLoading(false);
                    return;
                }
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

            // Handle non-200 responses
            if (!response.ok) {
                setStatus("Swap request failed - please try again");
                setLoading(false);
                return;
            }

            const result = await response.json();

            if (result.success) {
                setStatus(`Order created! Monitoring status...`);
                setOrderHash(result.orderHash);

                // Start polling for order status
                setIsPolling(true);
                pollOrderStatus(result.orderHash);
            } else {
                setStatus("Swap failed - please try again");
            }

        } catch (err) {
            console.error("Node execution error:", err);
            setStatus("Swap execution failed - please try again");
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
                    setStatus("Monitoring stopped. Check status on blockchain explorer.");
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

            {/* Wallet Connection Status & Buttons */}
            <div style={{
                backgroundColor: "white",
                padding: "15px",
                borderRadius: "6px",
                marginBottom: "15px",
                display: "flex",
                flexDirection: "column",
                alignItems: "center"
            }}>
                {walletConnected ? (
                    <>
                        <div style={{
                            backgroundColor: "#e8f5e9",
                            color: "#2e7d32",
                            padding: "10px 15px",
                            borderRadius: "4px",
                            width: "100%",
                            marginBottom: "10px",
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center"
                        }}>
                            <span>Connected: <strong>{walletAddress.substring(0, 6)}...{walletAddress.substring(38)}</strong></span>
                            <button
                                onClick={disconnectWallet}
                                style={{
                                    backgroundColor: "#ef5350",
                                    color: "white",
                                    border: "none",
                                    borderRadius: "4px",
                                    padding: "5px 10px",
                                    cursor: "pointer",
                                    fontSize: "12px"
                                }}
                            >
                                Disconnect
                            </button>
                        </div>
                    </>
                ) : (
                    <>
                        <button
                            onClick={connectWallet}
                            style={{
                                width: "100%",
                                padding: "12px",
                                backgroundColor: "#1976d2",
                                color: "white",
                                border: "none",
                                borderRadius: "5px",
                                cursor: "pointer",
                                fontWeight: "bold",
                                fontSize: "16px",
                                marginBottom: "10px"
                            }}
                        >
                            Connect Wallet
                        </button>

                        {isMobile && (
                            <p style={{ fontSize: "12px", color: "#666", margin: "5px 0 0" }}>
                                You'll be redirected to your wallet app
                            </p>
                        )}
                    </>
                )}
            </div>

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
                disabled={loading}
                style={{
                    width: "100%",
                    padding: "14px",
                    backgroundColor: loading ? "#cccccc" : "#2e7d32",
                    color: "white",
                    border: "none",
                    borderRadius: "5px",
                    cursor: loading ? "not-allowed" : "pointer",
                    fontWeight: "bold",
                    fontSize: "16px",
                    transition: "background-color 0.3s ease"
                }}
            >
                {loading ? "Processing..." : "Execute Cross-Chain Swap"}
            </button>

            {/* Mobile guidance text */}
            {isMobile && !walletConnected && (
                <p style={{
                    fontSize: "12px",
                    color: "#666",
                    margin: "10px 0 0",
                    fontStyle: "italic"
                }}>
                    When you click the swap button, you'll be prompted to connect your wallet
                </p>
            )}

            {/* Mobile guidance for token approval */}
            {isMobile && walletConnected && sourceToken !== "ETH" && (
                <p style={{
                    fontSize: "12px",
                    color: "#666",
                    margin: "10px 0 0",
                    fontStyle: "italic"
                }}>
                    You may be redirected to MetaMask to approve token spending
                </p>
            )}
        </div>
    );
}

export default FusionSwap;