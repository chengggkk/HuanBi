"use client"
import { useState } from "react";

import style from "./css/navbar.module.css";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faNewspaper, faChartLine, faGamepad, faWallet } from '@fortawesome/free-solid-svg-icons';

import Wallet from './wallet'

import MainNews from './News/mainNews'
import MainTrend from './trend/trend'
import MainGame from './game/game'




export default function Home() {
  const [showWallet, setShowWallet] = useState(false);

  const handleOpenWallet = () => {
    setShowWallet(true);
  };

  const handleCloseWallet = () => {
    // This function will be called after the animation completes
    setShowWallet(false);
  };
  ///////////////////////////////////////////////////////////////////////

  const [currentPage, setCurrentPage] = useState("news");
  const renderContent = () => {
    switch (currentPage) {
      case "news":
        return <MainNews />;
      case "trend":
        return <MainTrend />;
      case "game":
        return <MainGame />;
      default:
        return <MainNews />;
    }
  };


  return (
    <main>
      <div className={style.topNav}>
        <div className={style.topNavContainer}>
          <div className={style.logo}><img src="/photo/logo.png"></img></div>
          <div className={style.websitename}> </div>
          <div className={style.wallet}>
            <div className={style.walletButton}>
              <img
                src="/photo/wallet.png"
                onClick={handleOpenWallet}
                className={style.walletIcon}
              />
            </div>
          </div>
        </div>
      </div>

      {showWallet && <Wallet closeWallet={handleCloseWallet} />}

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
            className={currentPage === "trend" ? style.chooseicon : style.nochooseicon}  />
          </div>
          <div
            className={currentPage === "game" ? style.choose : style.nochoose}
            onClick={() => setCurrentPage("game")}
          >
            <FontAwesomeIcon icon={faGamepad} 
             className={currentPage === "game" ? style.chooseicon : style.nochooseicon}   />
          </div>

        </div>
      </div>
    </main>
  );
}