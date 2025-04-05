import React, { useState, useEffect } from 'react';
import { Heart } from 'lucide-react';
import style from '../css/game.module.css';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faRotateRight, faTrophy } from '@fortawesome/free-solid-svg-icons';

// 卡片圖案 - 使用圖片路徑而非表情符號
const CARD_SYMBOLS = [
  '/photo/1.png',
  '/photo/2.png',
  '/photo/3.png',
  '/photo/4.png',
  '/photo/5.png',
  '/photo/6.png',
  '/photo/7.png',
  '/photo/8.png'
];

const MemoryGame = () => {
  // 遊戲狀態
  const [cards, setCards] = useState([]);
  const [flippedIndices, setFlippedIndices] = useState([]);
  const [matchedPairs, setMatchedPairs] = useState([]);
  const [lives, setLives] = useState(3);
  const [gameStarted, setGameStarted] = useState(false);
  const [initialShow, setInitialShow] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [gameWon, setGameWon] = useState(false);

  // 初始化遊戲
  const initializeGame = () => {
    // 創建包含所有符號的卡片（每個符號出現兩次）
    const initialCards = [...CARD_SYMBOLS, ...CARD_SYMBOLS].map((symbol, index) => ({
      id: index,
      symbol,
      flipped: false,
      matched: false
    }));

    // 隨機排序卡片
    const shuffledCards = [...initialCards].sort(() => Math.random() - 0.5);

    setCards(shuffledCards);
    setFlippedIndices([]);
    setMatchedPairs([]);
    setLives(3);
    setGameOver(false);
    setGameWon(false);
    setGameStarted(true);
    setInitialShow(true);

    // 初始展示所有卡片1秒
    setTimeout(() => {
      setInitialShow(false);
    }, 10000);
  };

  // 處理卡片點擊
  const handleCardClick = (index) => {
    // 如果遊戲結束或卡片已翻開/已匹配，則忽略點擊
    if (
      gameOver ||
      flippedIndices.includes(index) ||
      matchedPairs.includes(cards[index].symbol) ||
      flippedIndices.length === 2 ||
      initialShow
    ) {
      return;
    }

    // 翻開卡片
    const newFlippedIndices = [...flippedIndices, index];
    setFlippedIndices(newFlippedIndices);

    // 如果翻開了兩張卡片，檢查是否匹配
    if (newFlippedIndices.length === 2) {
      const firstCardIndex = newFlippedIndices[0];
      const secondCardIndex = newFlippedIndices[1];

      if (cards[firstCardIndex].symbol === cards[secondCardIndex].symbol) {
        // 匹配成功
        setMatchedPairs([...matchedPairs, cards[firstCardIndex].symbol]);
        setFlippedIndices([]);
      } else {
        // 匹配失敗，減少生命值並在短暫延遲後翻回卡片
        const newLives = lives - 1;
        setLives(newLives);

        // 檢查遊戲是否結束
        if (newLives === 0) {
          setGameOver(true);
        }

        // 1秒後翻回卡片
        setTimeout(() => {
          setFlippedIndices([]);
        }, 1000);
      }
    }
  };

  // 檢查遊戲勝利條件
  useEffect(() => {
    if (gameStarted && matchedPairs.length === CARD_SYMBOLS.length) {
      setGameWon(true);
    }
  }, [matchedPairs, gameStarted]);

  // 卡片是否顯示正面
  const isCardShowing = (index, symbol) => {
    return (
      initialShow ||
      flippedIndices.includes(index) ||
      matchedPairs.includes(symbol) ||
      gameWon // 確保遊戲獲勝時所有卡片都顯示正面
    );
  };

  const returnHome = () => {
    setGameStarted(false);
  }

  // 添加即時通關功能
  const instantWin = () => {
    // 設置所有卡片對應的符號為匹配成功
    const allPairs = [...new Set(cards.map(card => card.symbol))];
    setMatchedPairs(allPairs);
    setGameWon(true);
  };

  return (
    <div className={style.main}>
      {!gameStarted && (
        <div className={style.nonStart}>
          <div className={style.title}>Taiwanese Flavor Memory Game</div>

          <div className={style.startBtContainer}>
            <button
              onClick={initializeGame}
              disabled={initialShow}
            >
              Start
            </button>
          </div>

          <div className={style.rule}>
            <h2>Game Rules:</h2>
            <p>
              1.At the start of the game, all cards will be revealed for 1 second.<br /><br />
              2.Flip two cards at a time. If the patterns match, they will remain face-up.<br /><br />
              3.If the patterns do not match, the cards will be flipped back, and you will lose one life.<br /><br />
              4.You have a total of three lives. Your goal is to match all the cards.
            </p>
          </div>
        </div>
      )}

      {/* 生命值和重新開始按鈕 */}
      {gameStarted && (
        <div className={style.gameStart}>
          <div className={style.startUp}>
            <div className="flex">
              {[...Array(3)].map((_, i) => (
                <Heart
                  key={i}
                  size={24}
                  className="mr-1"
                  fill={i < lives ? "red" : "none"}
                  color={i < lives ? "red" : "gray"}
                />
              ))}
            </div>
            <div className="flex gap-2">
              {/* 添加即時通關按鈕 */}
              <button
                onClick={instantWin}
                className={style.instantWin}
                disabled={gameOver || gameWon}
                title="Instant Win"
              >
                <FontAwesomeIcon icon={faTrophy} />
              </button>
              <button
                onClick={initializeGame}
                className={style.restart}
                disabled={initialShow}
              >
                <FontAwesomeIcon icon={faRotateRight} />
              </button>
            </div>
          </div>

          {/* 卡片網格 */}
          <div className={style.cardGrid}>
            {cards.map((card, index) => (
              <div
                key={card.id}
                className={style.cardContainer}
              >
                <div
                  onClick={() => handleCardClick(index)}
                  className={`${style.card} ${isCardShowing(index, card.symbol) ? style.flipped : ""}`}
                >
                  {/* 卡片正面 - 使用圖片而非文字 */}
                  <div className={style.cardFront}>
                    <img 
                      src={card.symbol} 
                      alt="Card" 
                      className={style.cardImage} 
                    />
                  </div>

                  {/* 卡片背面 */}
                  <div className={`${style.cardBack} ${(!gameOver && !gameWon && !initialShow && !flippedIndices.includes(index) && !matchedPairs.includes(card.symbol))
                    ? style.cardBackHover
                    : ""
                    }`}>
                      <img src="/photo/ethlogo2.png" alt="Card Back" className={style.cardImage}></img>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* 遊戲狀態顯示 */}
          {gameWon && (
            <div className={style.end}>
              <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4 w-full text-center">
                Congratulations!<br/> You have successfully matched all the cards
              </div>
              <button onClick={returnHome}>
                Return to Home
              </button>
            </div>
          )}

          {gameOver && !gameWon && (
            <div className={style.end}>
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4 w-full text-center">
                Game Over!<br/>You have used up all your lives.
              </div>
              <button onClick={returnHome}>
                Return to Home
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default MemoryGame;