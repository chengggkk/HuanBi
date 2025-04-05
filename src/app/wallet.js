"use client"
import { useEffect, useState, useRef } from "react";
import style from "./css/wallet.module.css";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowRightArrowLeft, faArrowRight, faSpinner } from '@fortawesome/free-solid-svg-icons';
import { useAccount, useBalance, useDisconnect, useConnect } from "wagmi";
import { MiniKit, VerifyCommandInput, VerificationLevel, ResponseEvent } from '@worldcoin/minikit-js';

export default function Wallet({ 
  closeWallet, 
  isVerified, 
  verificationData,
  setWalletStatus,
  setIsVerified,
  setVerificationData
}) {
  const [isVisible, setIsVisible] = useState(false);
  const [tokenBalances, setTokenBalances] = useState([]);
  const [isLoadingBalances, setIsLoadingBalances] = useState(false);
  const [balanceError, setBalanceError] = useState(null);
  const [usdcBalance, setUsdcBalance] = useState("0.00");
  const [isVerifying, setIsVerifying] = useState(false);
  const modalRef = useRef(null);
  const [isMobile, setIsMobile] = useState(false);
  
  // Use Wagmi hooks
  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();
  const { connect, connectors, isPending, error: connectError } = useConnect();
  
  // Get USDC balance
  const { data: usdcBalanceData, isLoading: isLoadingUsdcBalance } = useBalance({
    address: address,
    token: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', // USDC contract address
    enabled: !!address,
  });

  // Initialize and check if the World ID MiniKit is available
  const [isMiniKitAvailable, setIsMiniKitAvailable] = useState(false);

  // Verify with World ID - updated implementation based on documentation
  const handleVerify = async () => {
    if (!isMiniKitAvailable) {
      console.log("World ID MiniKit is not available");
      return;
    }

    try {
      setIsVerifying(true);

      // Create verification payload based on the documentation
      const verifyPayload = {
        action: 'verify', // Replace with your action ID from Developer Portal
        verification_level: VerificationLevel.Orb, // Or VerificationLevel.Device
      };

      // Send the verify command
      MiniKit.commands.verify(verifyPayload);
      
      // Subscription is handled in the useEffect
    } catch (error) {
      console.error("Error initiating verification:", error);
      setIsVerifying(false);
    }
  };

  // Verify proof on backend
  const verifyProofOnBackend = async (payload, action, signal) => {
    try {
      const response = await fetch('/api/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          payload,
          action,
          signal,
        }),
      });

      const result = await response.json();
      
      if (result.status === 200) {
        console.log("Verification successful on backend");
        return true;
      } else {
        console.error("Backend verification failed:", result);
        return false;
      }
    } catch (error) {
      console.error("Error verifying with backend:", error);
      return false;
    }
  };

  useEffect(() => {
    // Check if World ID MiniKit is available
    const checkMiniKit = () => {
      try {
        if (typeof MiniKit === 'undefined') {
          console.log("MiniKit is not defined");
          return false;
        }
        
        if (typeof MiniKit.isInstalled === 'function') {
          return MiniKit.isInstalled();
        } else {
          console.log("MiniKit.isInstalled is not a function");
          return false;
        }
      } catch (error) {
        console.log("Error checking MiniKit availability:", error);
        return false;
      }
    };
    
    const isMiniKitAvailableResult = checkMiniKit();
    setIsMiniKitAvailable(isMiniKitAvailableResult);

    // Subscribe to MiniAppVerifyAction response event
    if (isMiniKitAvailableResult) {
      MiniKit.subscribe(ResponseEvent.MiniAppVerifyAction, async (response) => {
        if (response.status === 'error') {
          console.error('Verification error:', response);
          setIsVerifying(false);
          return;
        }

        // On successful verification
        if (response.status === 'success') {
          // Create verification result object
          const verificationResult = {
            nullifierHash: response.nullifier_hash,
            merkleRoot: response.merkle_root,
            proof: response.proof,
            verificationLevel: response.verification_level,
          };
          
          // Verify the proof on backend
          const isVerified = await verifyProofOnBackend(
            response, 
            'voting-action', // Must match the action ID used in the verify command
            address // Signal used in the verify command
          );
          
          if (isVerified) {
            // Update verification status
            setIsVerified(true);
            setVerificationData(verificationResult);
            setWalletStatus("✅ Verified Human");
          }
          
          setIsVerifying(false);
        }
      });
    }

    // Check if the user is on a mobile device
    const checkMobile = () => {
      return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    };
    
    setIsMobile(checkMobile());
    
    // When component mounts, trigger animation
    setTimeout(() => {
      setIsVisible(true);
    }, 10);

    // Add event listener to close wallet when clicking outside
    document.addEventListener('mousedown', handleClickOutside);
    
    // Cleanup the event listener and subscription on component unmount
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      if (isMiniKitAvailableResult) {
        MiniKit.unsubscribe(ResponseEvent.MiniAppVerifyAction);
      }
    };
  }, [address]);

  // Initialize wallet from localStorage
  useEffect(() => {
    // Check for saved wallet address
    const savedWalletAddress = localStorage.getItem('walletAddress');
    
    // If there's a saved wallet address and we're not connected
    if (savedWalletAddress && !isConnected) {
      // Try to reconnect with the appropriate connector
      const connector = connectors.find(c => c.ready);
      if (connector) {
        connect({ connector });
      }
    }
  }, [connect, connectors, isConnected]);

  // Update wallet status in parent component
  useEffect(() => {
    if (isConnected && address) {
      setWalletStatus(isVerified 
        ? "✅ Verified Human" 
        : `🦊 ${formatAddress(address)}`
      );
      localStorage.setItem('walletAddress', address);
    } else {
      setWalletStatus("Connect Wallet");
      // Clear the stored wallet address if disconnected
      localStorage.removeItem('walletAddress');
    }
  }, [isConnected, address, isVerified, setWalletStatus]);

  // Update USDC balance when data changes
  useEffect(() => {
    if (usdcBalanceData) {
      setUsdcBalance(parseFloat(usdcBalanceData.formatted).toFixed(2));
    }
  }, [usdcBalanceData]);

  // Auto trigger verification when wallet opens (if connected and not verified)
  useEffect(() => {
    // Only attempt verification if:
    // 1. Wallet is visible (opened)
    // 2. The user is connected
    // 3. The user is not already verified
    // 4. MiniKit is available
    // 5. Not currently verifying
    if (isVisible && isConnected && address && !isVerified && isMiniKitAvailable && !isVerifying) {
      console.log("Auto-triggering verification");
      handleVerify();
    }
  }, [isVisible, isConnected, address, isVerified, isMiniKitAvailable]);

  // Fetch token balances when wallet address changes
  useEffect(() => {
    const fetchBalances = async () => {
      if (!address) return;
      
      setIsLoadingBalances(true);
      setBalanceError(null);
      
      try {
        const response = await fetch(`https://1inchproxy-kcj2-q9s6yhmet-chengggkks-projects.vercel.app/api/balance?walletaddress=${address}`);
        
        if (!response.ok) {
          throw new Error(`Failed to fetch balances: ${response.status}`);
        }
        
        const data = await response.json();
        
        // Process the data to find non-zero balances
        if (data && typeof data === 'object') {
          const nonZeroBalances = Object.entries(data)
            .filter(([_, balance]) => balance !== "0")
            .map(([tokenAddress, balance]) => {
              // Check if this is USDC
              const isUSDC = tokenAddress.toLowerCase() === "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48";
              
              // Convert balance to a readable format
              let formattedBalance;
              if (isUSDC) {
                // USDC has 6 decimals
                formattedBalance = (Number(balance) / 1_000_000).toFixed(2);
                // We'll use Wagmi's balance data instead of this
              } else {
                // For other tokens (simplified display)
                formattedBalance = balance;
              }
              
              return {
                tokenAddress,
                balance: formattedBalance,
                isUSDC
              };
            });
          
          setTokenBalances(nonZeroBalances);
        } else {
          console.error("Invalid balance data received:", data);
          setBalanceError("Invalid balance data received");
        }
      } catch (err) {
        console.error("Error fetching balances:", err);
        setBalanceError(err.message);
      } finally {
        setIsLoadingBalances(false);
      }
    };
    
    if (address) {
      fetchBalances();
    }
  }, [address]);

  const handleClickOutside = (event) => {
    // Check if click is outside the wallet modal
    if (modalRef.current && !modalRef.current.contains(event.target)) {
      handleClose();
    }
  };

  const handleClose = () => {
    setIsVisible(false); // Trigger slide-down animation

    // Wait for animation to end before actually closing Modal
    setTimeout(() => {
      closeWallet();
    }, 300); // This time should equal CSS transition time
  };

  const handleDisconnect = () => {
    disconnect();
    localStorage.removeItem('walletAddress'); // Clear from localStorage when disconnecting
  };

  // Connect to wallet
  const handleConnect = (connector) => {
    if (connector) {
      connect({ connector });
    } else {
      console.error("No valid connector provided");
    }
  };

  // Format the wallet address for display
  const formatAddress = (address) => {
    if (!address) return "";
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  };

  // Format the nullifier hash for verification
  const formatNullifierHash = (hash) => {
    if (!hash) return "";
    return `${hash.substring(0, 6)}...${hash.substring(hash.length - 4)}`;
  };

  return (
    <div className={`${style.overlay} ${isVisible ? style.show : ""}`}>
      <div
        ref={modalRef}
        className={`${style.walletModal} ${isVisible ? style.show : style.slideDown}`}
        style={{ display: 'flex', flexDirection: 'column' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={style.title}>My Wallet</div>
        
        {isConnected ? (
          <>
            <div className={style.userInfo}>
              {address && (
                <p className={style.account}>{formatAddress(address)}</p>
              )}
              
              {!address && isVerified && verificationData && (
                <p className={style.account}>{formatNullifierHash(verificationData.nullifierHash)}</p>
              )}
              
              {isVerified && verificationData && (
                <p className={style.verified}>✅ Verified Human</p>
              )}
              
            </div>
            
            <div className={style.money}>
              {isLoadingUsdcBalance || isLoadingBalances ? (
                <span>Loading balances... <FontAwesomeIcon icon={faSpinner} spin /></span>
              ) : (
                `$${usdcBalance}`
              )}
            </div>
            
            {balanceError && (
              <div className={style.errorMessage} style={{ color: 'red', fontSize: '14px', textAlign: 'center' }}>
                {balanceError}
              </div>
            )}
            
            {!isVerified && isMiniKitAvailable && (
              <button 
                onClick={handleVerify}
                className={style.verifyButton}
                style={{
                  marginTop: '15px',
                  padding: '8px 12px',
                  background: '#4CAF50',
                  color: 'white',
                  border: 'none',
                  borderRadius: '5px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px'
                }}
                disabled={isVerifying}
              >
                {isVerifying ? (
                  <>
                    <FontAwesomeIcon icon={faSpinner} spin />
                    Verifying...
                  </>
                ) : (
                  <>
                    Verify with World ID
                  </>
                )}
              </button>
            )}
            
            <button 
              onClick={handleDisconnect}
              className={style.disconnectButton}
              style={{
                marginTop: '15px',
                padding: '8px 12px',
                background: '#f44336',
                color: 'white',
                border: 'none',
                borderRadius: '5px',
                cursor: 'pointer'
              }}
            >
              Disconnect Wallet
            </button>
            
          </>
        ) : (
          <div className={style.connectContainer} style={{ 
            flex: '1',
            display: 'flex', 
            flexDirection: 'column',
            justifyContent: 'center', 
            alignItems: 'center',
            width: '100%',
            gap: '12px'
          }}>
            {/* Custom wallet connection buttons */}
            <div className={style.connectorButtons} style={{ 
              display: 'flex', 
              flexDirection: 'column', 
              gap: '10px',
              width: '100%',
              maxWidth: '280px'
            }}>
              {connectors && connectors.length > 0 ? (
                connectors.map((connector) => (
                  connector ? (
                    <button
                      key={connector.uid || Math.random().toString()}
                      onClick={() => handleConnect(connector)}
                      disabled={isPending}
                      className={style.connectButton}
                      style={{ 
                        padding: '12px', 
                        width: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px'
                      }}
                    >
                      {isPending ? (
                        <FontAwesomeIcon icon={faSpinner} spin />
                      ) : null}
                      
                      {connector.name === 'MetaMask' && '🦊 '}
                      {connector.name === 'Coinbase Wallet' && '📱 '}
                      {connector.name === 'WalletConnect' && '🔗 '}
                      
                      Connect with {connector.name || 'Wallet'}
                    </button>
                  ) : null
                ))
              ) : (
                <p>No wallet connectors available</p>
              )}
            </div>
            
            {connectError && (
              <p className={style.errorMessage} style={{ 
                color: 'red', 
                fontSize: '14px', 
                textAlign: 'center',
                marginTop: '10px'
              }}>
                {connectError.message}
              </p>
            )}
            
            <p className={style.connectMessage} style={{ 
              fontSize: '14px', 
              textAlign: 'center', 
              marginTop: '10px',
              color: '#666'
            }}>
              Connect your wallet to continue
            </p>
          </div>
        )}

        {isMiniKitAvailable && !isConnected && (
          <div style={{ 
            marginTop: '20px', 
            textAlign: 'center',
            padding: '10px',
            border: '1px solid #e0e0e0',
            borderRadius: '5px',
            backgroundColor: '#f9f9f9'
          }}>
            <p style={{ marginBottom: '10px', fontSize: '14px' }}>
              World ID verification is available
            </p>
            <p style={{ fontSize: '12px', color: '#666' }}>
              Connect your wallet first to verify with World ID
            </p>
          </div>
        )}
      </div>
    </div>
  );
}