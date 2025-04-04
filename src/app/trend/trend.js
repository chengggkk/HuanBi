import React, { useState, useEffect } from "react";
import dynamic from "next/dynamic"; // Dynamic import for Chart to avoid SSR issues

// Import the Chart component dynamically to avoid SSR issues
const Chart = dynamic(() => import("react-apexcharts"), { ssr: false });

export default function MobileCryptoInterface() {
  // Chart state
  const [priceData, setPriceData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedCrypto, setSelectedCrypto] = useState("bitcoin");
  const [timeframe, setTimeframe] = useState("1");
  const [latestPrice, setLatestPrice] = useState(null);
  const [priceChange, setPriceChange] = useState(null);
  const [hoveredData, setHoveredData] = useState(null);
  
  // Swap state
  const [activeTab, setActiveTab] = useState("swap");
  const [payAmount, setPayAmount] = useState("1");
  const [receiveAmount, setReceiveAmount] = useState("");
  const [payCurrency, setPayCurrency] = useState("ETH");
  const [receiveCurrency, setReceiveCurrency] = useState("USDC");
  const [expiryDays, setExpiryDays] = useState("7 Days");
  const [walletConnected, setWalletConnected] = useState(false);
  
  // Conversion state
  const [cryptoPrices, setCryptoPrices] = useState({});
  const [payValueUSD, setPayValueUSD] = useState(0);
  const [receiveValueUSD, setReceiveValueUSD] = useState(0);
  const [conversionLoading, setConversionLoading] = useState(false);

  // Cryptocurrency ID mapping (CoinGecko IDs)
  const cryptoIdMap = {
    "BTC": "bitcoin",
    "ETH": "ethereum",
    "USDC": "usd-coin",
    "BNB": "binancecoin",
    "SOL": "solana",
    "DOGE": "dogecoin",
    "ADA": "cardano"
  };

  // Fetch price data for the selected cryptocurrency chart
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(
          `https://api.coingecko.com/api/v3/coins/${selectedCrypto}/market_chart?vs_currency=usd&days=${timeframe}`
        );

        if (!response.ok) {
          throw new Error("Failed to retrieve data.");
        }

        const data = await response.json();
        const formattedData = data.prices.map((item, index, arr) => {
          if (index < 3) return null;
          return {
            x: new Date(item[0]),
            y: [
              arr[index - 3][1], // Open
              Math.max(arr[index - 2][1], arr[index - 1][1], item[1]), // High
              Math.min(arr[index - 2][1], arr[index - 1][1], item[1]), // Low
              item[1], // Close
            ],
          };
        }).filter(Boolean);

        setPriceData([{ data: formattedData }]);

        if (formattedData.length > 0) {
          const latest = formattedData[formattedData.length - 1].y[3]; // Closing price
          setLatestPrice(latest);
          const first = formattedData[0].y[3]; // Opening price
          setPriceChange(((latest - first) / first) * 100);
        }

        setLoading(false);
      } catch (err) {
        setError(err.message);
        setLoading(false);
      }
    };

    fetchData();
    const intervalId = setInterval(fetchData, 60000);
    return () => clearInterval(intervalId);
  }, [selectedCrypto, timeframe]);

  // Fetch prices for all currencies in our swap dropdown
  useEffect(() => {
    const fetchCryptoPrices = async () => {
      try {
        setConversionLoading(true);
        const cryptoIds = Object.values(cryptoIdMap).join(',');
        const response = await fetch(
          `https://api.coingecko.com/api/v3/simple/price?ids=${cryptoIds}&vs_currencies=usd`
        );

        if (!response.ok) {
          throw new Error("Failed to retrieve price data.");
        }

        const data = await response.json();
        setCryptoPrices(data);
        setConversionLoading(false);
      } catch (err) {
        console.error("Error fetching crypto prices:", err);
        setConversionLoading(false);
      }
    };

    fetchCryptoPrices();
    const intervalId = setInterval(fetchCryptoPrices, 60000);
    return () => clearInterval(intervalId);
  }, []);

  // Calculate conversion when pay amount, pay currency, or receive currency changes
  useEffect(() => {
    if (Object.keys(cryptoPrices).length > 0 && !isNaN(parseFloat(payAmount))) {
      const payId = cryptoIdMap[payCurrency];
      const receiveId = cryptoIdMap[receiveCurrency];
      
      if (cryptoPrices[payId] && cryptoPrices[receiveId]) {
        const payUsdValue = parseFloat(payAmount) * cryptoPrices[payId].usd;
        const newReceiveAmount = (payUsdValue / cryptoPrices[receiveId].usd).toFixed(8);
        
        setPayValueUSD(payUsdValue);
        setReceiveValueUSD(payUsdValue); // Same USD value (minus fees in a real app)
        setReceiveAmount(newReceiveAmount);
      }
    }
  }, [payAmount, payCurrency, receiveCurrency, cryptoPrices]);

  // Update pay amount when receive amount is changed directly
  const handleReceiveAmountChange = (e) => {
    const newReceiveAmount = e.target.value;
    setReceiveAmount(newReceiveAmount);
    
    if (Object.keys(cryptoPrices).length > 0 && !isNaN(parseFloat(newReceiveAmount))) {
      const payId = cryptoIdMap[payCurrency];
      const receiveId = cryptoIdMap[receiveCurrency];
      
      if (cryptoPrices[payId] && cryptoPrices[receiveId]) {
        const receiveUsdValue = parseFloat(newReceiveAmount) * cryptoPrices[receiveId].usd;
        const newPayAmount = (receiveUsdValue / cryptoPrices[payId].usd).toFixed(8);
        
        setPayValueUSD(receiveUsdValue);
        setReceiveValueUSD(receiveUsdValue);
        setPayAmount(newPayAmount);
      }
    }
  };

  // Chart options
  const options = {
    chart: {
      type: "candlestick",
      height: 350,
      events: {
        dataPointSelection: function (event, chartContext, config) {
          const { dataPointIndex } = config;
          if (dataPointIndex !== undefined && priceData[0]?.data[dataPointIndex]) {
            const selectedPoint = priceData[0].data[dataPointIndex];
            const price = selectedPoint.y;
            setHoveredData({
              date: new Date(selectedPoint.x).toLocaleString("en-US", { 
                year: "numeric", month: "2-digit", day: "2-digit",
                hour: "2-digit", minute: "2-digit"
              }),
              open: price[0].toFixed(2),
              high: price[1].toFixed(2),
              low: price[2].toFixed(2),
              close: price[3].toFixed(2),
            });
          }
        },
      },
    },
    title: {
      text: "Candlestick Chart",
      align: "left",
    },
    xaxis: {
      type: "datetime",
    },
    yaxis: {
      labels: {
        formatter: (value) => value.toFixed(2),
      },
    },
    tooltip: { enabled: false },
  };

  // Switch currencies
  const handleSwitchCurrencies = () => {
    const tempCurrency = payCurrency;
    setPayCurrency(receiveCurrency);
    setReceiveCurrency(tempCurrency);
  };

  // Render the component
  return (
    <div style={{ fontFamily: 'Arial, sans-serif', maxWidth: '100%', margin: '0', padding: '0' }}>
      {/* Cryptocurrency and Timeframe Selection */}
      <div style={{ padding: '10px', display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
        <select
          style={{ padding: '5px', fontSize: '14px', width: '48%' }}
          value={selectedCrypto}
          onChange={(e) => setSelectedCrypto(e.target.value)}
        >
          <option value="bitcoin">Bitcoin (BTC)</option>
          <option value="ethereum">Ethereum (ETH)</option>
          <option value="binancecoin">Binance Coin (BNB)</option>
          <option value="solana">Solana (SOL)</option>
          <option value="dogecoin">Dogecoin (DOGE)</option>
          <option value="cardano">Cardano (ADA)</option>
        </select>

        <select
          style={{ padding: '5px', fontSize: '14px', width: '48%' }}
          value={timeframe}
          onChange={(e) => setTimeframe(e.target.value)}
        >
          <option value="1">1 day</option>
          <option value="7">7 days</option>
          <option value="30">30 days</option>
          <option value="90">90 days</option>
          <option value="365">1 year</option>
          <option value="max">All</option>
        </select>
      </div>

      {/* Price Display */}
      {latestPrice && (
        <div style={{ padding: '0 10px', marginBottom: '5px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '20px', fontWeight: 'bold' }}>
              ${latestPrice.toFixed(2)}
            </span>
            {priceChange !== null && (
              <span 
                style={{
                  padding: '3px 6px',
                  backgroundColor: priceChange >= 0 ? "#16A34A" : "#DC2626",
                  color: 'white',
                  borderRadius: '4px',
                  fontSize: '14px'
                }}
              >
                {priceChange >= 0 ? '+' : ''}{priceChange.toFixed(2)}%
              </span>
            )}
          </div>
        </div>
      )}

      {/* Chart */}
      {loading ? (
        <div style={{ 
          height: '200px', 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center',
          backgroundColor: '#f5f5f5'
        }}>
          <p>Loading...</p>
        </div>
      ) : (
        <div style={{ marginBottom: '10px' }}>
          <Chart 
            options={options} 
            series={priceData} 
            type="candlestick" 
            height={250} 
          />
        </div>
      )}

      {/* Swap Interface */}
      <div style={{ border: '1px solid #e0e0e0', padding: '10px' }}>
        {/* Tabs */}
        <div style={{ display: 'flex', marginBottom: '10px' }}>
          <div style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '10px' }}>
            Swap Currencies
          </div>
        </div>

        {/* Pay Section */}
        <div style={{ marginBottom: '15px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
            <span style={{ fontSize: '16px' }}>You pay</span>
            <span style={{ fontSize: '16px' }}>Balance: 0 MAX</span>
          </div>
          <input
            type="text"
            value={payAmount}
            onChange={(e) => setPayAmount(e.target.value)}
            style={{ 
              width: '100%', 
              padding: '8px', 
              fontSize: '16px', 
              marginBottom: '5px',
              boxSizing: 'border-box',
              border: '1px solid #ccc'
            }}
          />
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <select 
              value={payCurrency}
              onChange={(e) => setPayCurrency(e.target.value)}
              style={{ 
                padding: '5px', 
                fontSize: '16px',
                border: '1px solid #ccc',
                width: '30%'
              }}
            >
              <option value="BTC">BTC</option>
              <option value="ETH">ETH</option>
              <option value="USDC">USDC</option>
              <option value="BNB">BNB</option>
              <option value="SOL">SOL</option>
            </select>
            <button 
              onClick={handleSwitchCurrencies}
              style={{
                background: 'none',
                border: 'none',
                fontSize: '24px',
                cursor: 'pointer'
              }}
            >
              ⇅
            </button>
          </div>
          <div style={{ marginTop: '5px', fontSize: '14px', color: '#666' }}>
            {!conversionLoading && payValueUSD ? `~$${payValueUSD.toFixed(2)} USD` : "Loading..."}
          </div>
        </div>

        {/* Receive Section */}
        <div style={{ marginBottom: '15px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
            <span style={{ fontSize: '16px' }}>You receive</span>
            <span style={{ fontSize: '16px' }}>Balance: 0</span>
          </div>
          <input
            type="text"
            value={receiveAmount}
            onChange={handleReceiveAmountChange}
            style={{ 
              width: '100%', 
              padding: '8px', 
              fontSize: '16px', 
              marginBottom: '5px',
              boxSizing: 'border-box',
              border: '1px solid #ccc'
            }}
          />
          <select 
            value={receiveCurrency}
            onChange={(e) => setReceiveCurrency(e.target.value)}
            style={{ 
              padding: '5px', 
              fontSize: '16px',
              border: '1px solid #ccc',
              width: '30%'
            }}
          >
            <option value="USDC">USDC</option>
            <option value="BTC">BTC</option>
            <option value="ETH">ETH</option>
            <option value="BNB">BNB</option>
            <option value="SOL">SOL</option>
          </select>
          <div style={{ marginTop: '5px', fontSize: '14px', color: '#666' }}>
            {!conversionLoading && receiveValueUSD ? `~$${receiveValueUSD.toFixed(2)} USD` : "Loading..."}
          </div>
        </div>

        {/* Conversion Rate */}
        <div style={{ 
          marginBottom: '15px', 
          padding: '8px', 
          backgroundColor: '#f5f5f5', 
          borderRadius: '4px',
          fontSize: '14px'
        }}>
          {conversionLoading ? (
            "Loading conversion rates..."
          ) : (
            Object.keys(cryptoPrices).length > 0 && (
              <>
                <div>Exchange Rate:</div>
                <div style={{ fontWeight: 'bold' }}>
                  1 {payCurrency} = {cryptoPrices[cryptoIdMap[payCurrency]] && cryptoPrices[cryptoIdMap[receiveCurrency]] ? 
                    (cryptoPrices[cryptoIdMap[payCurrency]].usd / cryptoPrices[cryptoIdMap[receiveCurrency]].usd).toFixed(6) : 
                    "..."} {receiveCurrency}
                </div>
              </>
            )
          )}
        </div>

        {/* Action Buttons */}
        <div style={{ marginBottom: '15px' }}>
          <button style={{ 
            width: '100%', 
            padding: '10px', 
            fontSize: '16px',
            backgroundColor: '#3498db',
            color: 'white',
            border: 'none',
            marginBottom: '10px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '4px',
            cursor: 'pointer'
          }}>
            SWAP!
          </button>
        </div>
      </div>

      {/* Bottom Navigation */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-around', 
        padding: '10px',
        borderTop: '1px solid #ccc',
        position: 'fixed',
        bottom: '0',
        left: '0',
        right: '0',
        backgroundColor: 'white'
      }}>
        <div style={{ 
          display: 'flex', 
          flexDirection: 'column',
          alignItems: 'center',
          fontSize: '24px'
        }}>
          📰
        </div>
        <div style={{ 
          display: 'flex', 
          flexDirection: 'column',
          alignItems: 'center',
          fontSize: '24px'
        }}>
          📈
        </div>
        <div style={{ 
          display: 'flex', 
          flexDirection: 'column',
          alignItems: 'center',
          fontSize: '24px'
        }}>
          🎮
        </div>
      </div>
    </div>
  );
}