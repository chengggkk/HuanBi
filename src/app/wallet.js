"use client"
import { useEffect, useState, useRef } from "react";
import style from "./css/wallet.module.css";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faArrowRightArrowLeft, faArrowRight } from '@fortawesome/free-solid-svg-icons';
import { MiniKit, VerifyCommandInput, VerificationLevel } from '@worldcoin/minikit-js';

export default function Wallet({ closeWallet }) {
  const [isVisible, setIsVisible] = useState(false);
  const [worldID, setWorldID] = useState(null);
  const modalRef = useRef(null);

  useEffect(() => {
    // When component mounts, trigger animation
    setTimeout(() => {
      setIsVisible(true);
    }, 10);

    // Add event listener to close wallet when clicking outside
    document.addEventListener('mousedown', handleClickOutside);
    
    // Cleanup the event listener on component unmount
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

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

  const handleConnect = async () => {
    try {
      if (!MiniKit.isInstalled()) {
        console.log("MiniKit not installed");
        return;
      }

      const verifyPayload = {
        action: 'wallet-connect', // Your action ID from Developer Portal
        verification_level: VerificationLevel.Orb,
      };

      const { finalPayload } = await MiniKit.commandsAsync.verify(verifyPayload);
      
      if (finalPayload.status === 'error') {
        console.log('Error payload', finalPayload);
        return;
      }

      // Set worldID if verification successful
      setWorldID(finalPayload.nullifier_hash);
      
      // You might want to send this to your backend for verification
      console.log("Verification successful!", finalPayload);
    } catch (error) {
      console.error("Error connecting wallet:", error);
    }
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
        
        {worldID ? (
          <>
            <p className={style.account}>0xxxxxxxxx</p>
            <div className={style.money}>$12.05</div>
            <div className={style.actions}>
              <div>
                <button><FontAwesomeIcon icon={faArrowRightArrowLeft} /></button>
                <p>Swap</p>
              </div>
              <div>
                <button><FontAwesomeIcon icon={faArrowRight}/></button>
                <p>Send</p>
              </div>
            </div>
          </>
        ) : (
          <div className={style.connectContainer} style={{ 
            flex: '1',
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'center',
            width: '100%'
          }}>
            <button className={style.connectButton} onClick={handleConnect}>
              Connect World ID
            </button>
          </div>
        )}
      </div>
    </div>
  );
}