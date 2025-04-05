"use client"
import { useState, useEffect } from "react";
import style from "./css/navbar.module.css";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faNewspaper, faChartLine, faGamepad } from '@fortawesome/free-solid-svg-icons';

// Wagmi imports
import { WagmiProvider, createConfig, http } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { mainnet } from 'wagmi/chains';
import { injected, metaMask, walletConnect, coinbaseWallet } from 'wagmi/connectors';

import Wallet from './wallet';
import MainNews from './News/mainNews';
import MainTrend from './trend/trend_index';
import MainGame from './game/game';
import DailyNews from './News/dailyNews';

import MiniKitProvider from './minikit_provider'
// Remove the direct WalletConnectModal import and initialization
// import { WalletConnectModal } from '@walletconnect/modal';
// const modal = new WalletConnectModal({...});

// Create a walletConnect connector with your project ID
// Add a fallback project ID or handle the case when it's missing
const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID;

// Create wagmi config with additional safety checks
const config = createConfig({
  chains: [mainnet],
  transports: {
    [mainnet.id]: http(),
  },
  connectors: [
    // Only add connectors that are available
    ...(typeof metaMask === 'function' ? [metaMask()] : []),
    ...(typeof walletConnect === 'function' && projectId ? [walletConnect({ 
      projectId,
      showQrModal: true,
      // Add metadata for walletConnect
      metadata: {
        name: "huanbi",
        description: "My App using WalletConnect",
        url: "https://a90c-111-235-226-130.ngrok-free.app/",
        icons: ["https://your-app-domain.com/icon.png"]
      }
    })] : []),
    ...(typeof coinbaseWallet === 'function' ? [coinbaseWallet({ appName: 'Your App Name' })] : []),
    ...(typeof injected === 'function' ? [injected()] : []),
  ].filter(Boolean), // Filter out any undefined connectors
});

// Create the Query Client
const queryClient = new QueryClient();

export default function Home() {
  const [showWallet, setShowWallet] = useState(false);
  const [currentPage, setCurrentPage] = useState("news");

  const handleOpenWallet = () => {
    setShowWallet(true);
  };

  const handleCloseWallet = () => {
    setShowWallet(false);
  };

  const renderContent = () => {
    switch (currentPage) {
      case "news":
        return <DailyNews />;
      case "trend":
        return <MainTrend />;
      case "game":
        return <MainGame />;
      default:
        return <DailyNews />;
    }
  };

  // Create a modified config that avoids client-side references in SSR
  const [wagmiConfig, setWagmiConfig] = useState(null);
  
  useEffect(() => {
    // Initialize wagmi config on the client side to avoid issues with SSR
    const clientConfig = createConfig({
      chains: [mainnet],
      transports: {
        [mainnet.id]: http(),
      },
      connectors: [
        ...(typeof metaMask === 'function' ? [metaMask()] : []),
        ...(typeof walletConnect === 'function' && projectId ? [walletConnect({ 
          projectId,
          showQrModal: true,
          metadata: {
            name: "huanbi",
            description: "My App using WalletConnect",
            url: "https://a90c-111-235-226-130.ngrok-free.app/",
            icons: ["https://your-app-domain.com/icon.png"]
          }
        })] : []),
        ...(typeof coinbaseWallet === 'function' ? [coinbaseWallet({ appName: 'Your App Name' })] : []),
        ...(typeof injected === 'function' ? [injected()] : []),
      ].filter(Boolean),
    });
    
    setWagmiConfig(clientConfig);
  }, []);

  // Only render with WagmiProvider when the config is ready (client-side)
  if (!wagmiConfig) {
    return <div>Loading...</div>;
  }

  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <AppContent 
          showWallet={showWallet}
          handleCloseWallet={handleCloseWallet}
          handleOpenWallet={handleOpenWallet}
          currentPage={currentPage}
          setCurrentPage={setCurrentPage}
          renderContent={renderContent}
        />
      </QueryClientProvider>
    </WagmiProvider>
  );
}

// Separate component to use Wagmi hooks
function AppContent({ 
  showWallet, 
  handleCloseWallet, 
  handleOpenWallet, 
  currentPage, 
  setCurrentPage,
  renderContent
}) {
  const [isVerified, setIsVerified] = useState(false);
  const [verificationData, setVerificationData] = useState(null);
  const [walletStatus, setWalletStatus] = useState("Connect Wallet");

  return (
    <MiniKitProvider>
    <main>
      <div className={style.topNav}>
        <div className={style.topNavContainer}>
          <div className={style.logo}><img src="/photo/logo.png" alt="Logo" /></div>
          <div className={style.websitename}>
            <span onClick={handleOpenWallet}>
              {walletStatus}
            </span>
          </div>
          <div className={style.wallet}>
            <div className={style.walletButton}>
              <img
                src="/photo/wallet.png"
                onClick={handleOpenWallet}
                className={style.walletIcon}
                alt="Wallet"
              />
            </div>
          </div>
        </div>
      </div>

      {showWallet && (
        <Wallet 
          closeWallet={handleCloseWallet} 
          isVerified={isVerified} 
          verificationData={verificationData}
          setWalletStatus={setWalletStatus}
          setIsVerified={setIsVerified}
          setVerificationData={setVerificationData}
        />
      )}


      <div className={style.main}>
        {renderContent()}
      </div>

      <div className={style.bottomNav}>
        <div className={style.iconContainer}>
          <div
            className={currentPage === "news" ? style.choose : style.nochoose}
            onClick={() => setCurrentPage("news")}
          >
            <FontAwesomeIcon icon={faNewspaper}
            className={currentPage === "news" ? style.chooseicon : style.nochooseicon} />
          </div>
          <div
            className={currentPage === "trend" ? style.choose : style.nochoose}
            onClick={() => setCurrentPage("trend")}
          >
            <FontAwesomeIcon icon={faChartLine} 
            className={currentPage === "trend" ? style.chooseicon : style.nochooseicon} />
          </div>
          <div
            className={currentPage === "game" ? style.choose : style.nochoose}
            onClick={() => setCurrentPage("game")}
          >
            <FontAwesomeIcon icon={faGamepad} 
            className={currentPage === "game" ? style.chooseicon : style.nochooseicon} />
          </div>
        </div>
      </div>
    </main>
    </MiniKitProvider>
  );
}