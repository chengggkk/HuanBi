// 1. Create a WalletConnect configuration file
// src/config/walletConfig.js
export const walletConnectConfig = {
    projectId: "14995ff2a544d3f7fc84005cbdfcba47", // Replace with your actual WalletConnect project ID
    chains: [1, 42161, 8453], // Ethereum, Arbitrum, Base (Coinbase)
    // This metadata will show when connecting via WalletConnect
    metadata: {
      name: "huanbi",
      description: "Cross-chain swaps using 1inch Fusion",
      url: "https://a90c-111-235-226-130.ngrok-free.app/",
      icons: ["https://your-website.com/icon.png"]
    }
  };
  
  // 2. Update your Wagmi configuration where you set up the web3 providers
  // For example in _app.js or a provider component
  import { createConfig, configureChains } from 'wagmi';
  import { mainnet, arbitrum, base } from 'wagmi/chains';
  import { MetaMaskConnector } from 'wagmi/connectors/metaMask';
  import { WalletConnectConnector } from 'wagmi/connectors/walletConnect';
  import { CoinbaseWalletConnector } from 'wagmi/connectors/coinbaseWallet';
  import { publicProvider } from 'wagmi/providers/public';
  import { WALLET_CONFIG } from './config/walletConfig';
  
  // Configure chains & providers
  const { chains, publicClient } = configureChains(
    [mainnet, arbitrum, base],
    [publicProvider()]
  );
  
  // Set up connectors
  const connectors = [
    new MetaMaskConnector({ chains }),
    new WalletConnectConnector({
      chains,
      options: {
        projectId: WALLET_CONFIG.projectId,
        metadata: WALLET_CONFIG.metadata,
      },
    }),
    new CoinbaseWalletConnector({
      chains,
      options: {
        appName: WALLET_CONFIG.metadata.name,
      },
    }),
  ];
  
  // Create config
  const config = createConfig({
    autoConnect: true,
    connectors,
    publicClient,
  });
  
  // Then wrap your app with WagmiConfig using this config