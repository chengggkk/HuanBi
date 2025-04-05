import React, { useState, useEffect } from "react";
import dynamic from "next/dynamic"; // Dynamic import for Chart to avoid SSR issues
import { SDK, NetworkEnum } from "@1inch/cross-chain-sdk";
import { FusionSDK } from "@1inch/fusion-sdk";
import axios from "axios";

// Import the Chart component dynamically to avoid SSR issues
const Chart = dynamic(() => import("react-apexcharts"), { ssr: false });

// Token addresses
const TOKEN_ADDRESSES = {
  "USDC": "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48", // Always token0
  "DAI": "0x6b175474e89094c44da98b954eedeac495271d0f",
  "ETH": "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2", // WETH
  "BTC": "0x2260fac5e5542a773aa44fbcfedf7c193bc2c599", // WBTC
  "USDT": "0xdac17f958d2ee523a2206206994597c13d831ec7",
  "BNB": "0xB8c77482e45F1F44dE1745F52C74426C631bDD52",
  "SOL": "0x5aafdfc53af748b410accda106fb0b0a71b67303", // Wrapped SOL on Ethereum
  "DOGE": "0x4206931337dc273a630d328da6441786bfad668f",
  "ADA": "0x8a108eac367f2e233cefda1d9fc8f9fad123a0e1"
};

// Period mapping in seconds
const PERIOD_MAPPING = {
  "5m": "300",
  "15m": "900",
  "1h": "3600",
  "4h": "14400",
  "1d": "86400",
  "1w": "604800"
};

export default function MobileCryptoInterface() {
  // Chart state
  const [priceData, setPriceData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedCrypto, setSelectedCrypto] = useState("ETH");
  const [timeframe, setTimeframe] = useState("1d");
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
  const [sdk, setSDK] = useState(null);
  const [walletAddress, setWalletAddress] = useState(null);
  const TEST_WALLET_ADDRESS = "0x742d35Cc6634C0532925a3b844Bc454e4438f44e";

  // Conversion state
  const [cryptoPrices, setCryptoPrices] = useState({});
  const [payValueUSD, setPayValueUSD] = useState(0);
  const [receiveValueUSD, setReceiveValueUSD] = useState(0);
  const [conversionLoading, setConversionLoading] = useState(false);

  // Fetch price data from 1inch API for the selected cryptocurrency chart
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        const token0 = TOKEN_ADDRESSES[selectedCrypto];
        const period = PERIOD_MAPPING[timeframe];
        
        if (!token0) {
          throw new Error("Invalid token selection");
        }

        // Use our custom API endpoint that proxies to 1inch
        const response = await axios.get(
          `https://1inchproxy-kcj2-paaxgqpwh-chengggkks-projects.vercel.app/api/chart?token0=${token0}&period=${period}`
        );

        if (!response.data || !response.data.data) {
          throw new Error("Failed to retrieve data or invalid response format");
        }

        // Format the candle data for ApexCharts
        const formattedData = response.data.data.map(item => ({
          x: new Date(item.time * 1000), // Convert UNIX timestamp to JavaScript Date
          y: [
            item.open,   // Open
            item.high,   // High
            item.low,    // Low
            item.close   // Close
          ]
        }));

        setPriceData([{ data: formattedData }]);

        if (formattedData.length > 0) {
          const latest = formattedData[formattedData.length - 1].y[3]; // Closing price
          setLatestPrice(latest);
          const first = formattedData[0].y[0]; // Opening price
          setPriceChange(((latest - first) / first) * 100);
        }

        setLoading(false);
      } catch (err) {
        console.error("Error fetching chart data:", err);
        setError(err.message);
        setLoading(false);
      }
    };

    fetchData();
    const intervalId = setInterval(fetchData, 60000); // Refresh every minute
    return () => clearInterval(intervalId);
  }, [selectedCrypto, timeframe]);

  // Fetch prices for all currencies for swap conversion
  useEffect(() => {
    const fetchCryptoPrices = async () => {
      try {
        setConversionLoading(true);
        
        // Get prices for all tokens vs USDC using our 1inch API endpoint
        const priceData = {};
        
        // For efficiency, we'll fetch a small set of currencies
        const currencies = ["ETH", "BTC", "DAI", "USDT", "BNB", "SOL"];
        
        // USDC is our base token, so we set its price to 1
        priceData["USDC"] = { price: 1 };
        
        for (const currency of currencies) {
          if (currency !== "USDC") {
            try {
              const token0 = TOKEN_ADDRESSES[currency];
              const period = "86400"; // Use daily data for pricing
              
              const response = await axios.get(
                `https://1inchproxy-kcj2-paaxgqpwh-chengggkks-projects.vercel.app/api/chart?token0=${token0}&period=${period}`
              );
              
              if (response.data && response.data.data && response.data.data.length > 0) {
                // Get the latest price
                const latestDataPoint = response.data.data[response.data.data.length - 1];
                priceData[currency] = { price: latestDataPoint.close };
              }
            } catch (error) {
              console.error(`Error fetching price for ${currency}:`, error);
            }
          }
        }
        
        setCryptoPrices(priceData);
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
      const payPrice = cryptoPrices[payCurrency]?.price;
      const receivePrice = cryptoPrices[receiveCurrency]?.price;
      
      if (payPrice && receivePrice) {
        const payUsdValue = parseFloat(payAmount) * payPrice;
        const newReceiveAmount = (payUsdValue / receivePrice).toFixed(8);
        
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
      const payPrice = cryptoPrices[payCurrency]?.price;
      const receivePrice = cryptoPrices[receiveCurrency]?.price;
      
      if (payPrice && receivePrice) {
        const receiveUsdValue = parseFloat(newReceiveAmount) * receivePrice;
        const newPayAmount = (receiveUsdValue / payPrice).toFixed(8);
        
        setPayValueUSD(receiveUsdValue);
        setReceiveValueUSD(receiveUsdValue);
        setPayAmount(newPayAmount);
      }
    }
  };

  useEffect(() => {
    const initSDK = async () => {
      try {
        // Note: Replace 'YOUR_AUTH_KEY' with actual 1inch API key
        const fusionSDK = new FusionSDK({
          url: "https://api.1inch.dev/fusion-plus",
          authKey: process.env.NEXT_PUBLIC_INCH_API_KEY
        });
        setSDK(fusionSDK);
      } catch (error) {
        console.error("Failed to initialize SDK:", error);
      }
    };

    const connectTestWallet = () => {
      // Simulate wallet connection with test wallet
      setWalletAddress(TEST_WALLET_ADDRESS);
      setWalletConnected(true);
      console.log("Connected with test wallet:", TEST_WALLET_ADDRESS);
    };

    initSDK();
    connectTestWallet();
  }, []);

  // Swap function
  const handleSwap = async () => {
    if (!walletConnected || !sdk) {
      alert("Wallet connection failed!");
      return;
    }

    try {
      // Validate swap amounts and currencies
      if (!payAmount || !receiveAmount) {
        alert("Please enter swap amounts");
        return;
      }

      // Log swap details for development
      console.log("Swap Details:", {
        fromCurrency: payCurrency,
        toCurrency: receiveCurrency,
        fromAmount: payAmount,
        toAmount: receiveAmount,
        walletAddress: walletAddress
      });

      alert(`Simulated Swap from ${payAmount} ${payCurrency} to ${receiveAmount} ${receiveCurrency}`);
    } catch (error) {
      console.error("Swap simulation failed:", error);
      alert(`Swap failed: ${error.message}`);
    }
  };

  // Chart options
  const options = {
    chart: {
      type: "candlestick",
      height: 350,
      toolbar: {
        show: false
      },
      background: '#f8fafc', // Light blue background like in the image
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
    plotOptions: {
      candlestick: {
        colors: {
          upward: '#22c55e', // Green color for upward candles
          downward: '#ef4444' // Red color for downward candles
        },
        wick: {
          useFillColor: true,
        }
      }
    },
    annotations: {
      yaxis: [
        {
          y: latestPrice,
          borderColor: '#f43f5e',
          label: {
            borderColor: '#f43f5e',
            style: {
              color: '#fff',
              background: '#f43f5e'
            },
            text: latestPrice ? latestPrice.toFixed(4) : ''
          }
        }
      ],
    },
    xaxis: {
      type: "datetime",
      labels: {
        formatter: function(value, timestamp) {
          // Custom formatting based on timeframe
          const date = new Date(timestamp);
          if (timeframe === "5m" || timeframe === "15m" || timeframe === "1h") {
            return date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
          } else if (timeframe === "4h" || timeframe === "1d") {
            return `${date.getMonth()+1}/${date.getDate()} ${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`;
          } else {
            return `${date.getMonth()+1}/${date.getDate()}`;
          }
        }
      },
      axisBorder: {
        show: true,
        color: '#78909c'
      },
      axisTicks: {
        show: true,
        color: '#78909c'
      }
    },
    yaxis: {
      labels: {
        formatter: (value) => value.toFixed(2),
        style: {
          colors: '#64748b'
        }
      },
      tooltip: {
        enabled: true
      }
    },
    grid: {
      borderColor: '#e0e0e0',
      row: {
        colors: ['transparent', 'transparent'],
        opacity: 0.5
      }
    },
    tooltip: {
      enabled: true,
      custom: ({ seriesIndex, dataPointIndex, w }) => {
        const data = w.globals.initialSeries[seriesIndex].data[dataPointIndex];
        const o = data.y[0].toFixed(4);
        const h = data.y[1].toFixed(4);
        const l = data.y[2].toFixed(4);
        const c = data.y[3].toFixed(4);
        const date = new Date(data.x).toLocaleString();
        
        return `
          <div class="apexcharts-tooltip-candlestick" style="padding: 8px; background: #fff; border: 1px solid #ccc;">
            <div>${date}</div>
            <div>Open: ${o}</div>
            <div>High: ${h}</div>
            <div>Low: ${l}</div>
            <div>Close: ${c}</div>
          </div>
        `;
      }
    }
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
          <option value="ETH">Ethereum (ETH)</option>
          <option value="BTC">Bitcoin (BTC)</option>
          <option value="BNB">Binance Coin (BNB)</option>
          <option value="SOL">Solana (SOL)</option>
          <option value="DAI">DAI</option>
          <option value="USDT">USDT</option>
        </select>

        <select
          style={{ padding: '5px', fontSize: '14px', width: '48%' }}
          value={timeframe}
          onChange={(e) => setTimeframe(e.target.value)}
        >
          <option value="5m">5 minutes</option>
          <option value="15m">15 minutes</option>
          <option value="1h">1 hour</option>
          <option value="4h">4 hours</option>
          <option value="1d">1 day</option>
          <option value="1w">1 week</option>
        </select>
      </div>

      {/* Price Display */}
      {latestPrice && (
        <div style={{ padding: '0 10px', marginBottom: '5px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '20px', fontWeight: 'bold' }}>
              ${latestPrice.toFixed(4)}
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
          height: '250px', 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center',
          backgroundColor: '#f8fafc'
        }}>
          <p>Loading chart data...</p>
        </div>
      ) : (
        <div style={{ marginBottom: '10px', backgroundColor: '#f8fafc', padding: '5px' }}>
          <Chart 
            options={options} 
            series={priceData} 
            type="candlestick" 
            height={300} 
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
              <option value="ETH">ETH</option>
              <option value="BTC">BTC</option>
              <option value="USDC">USDC</option>
              <option value="BNB">BNB</option>
              <option value="SOL">SOL</option>
              <option value="DAI">DAI</option>
              <option value="USDT">USDT</option>
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
            <option value="ETH">ETH</option>
            <option value="BTC">BTC</option>
            <option value="BNB">BNB</option>
            <option value="SOL">SOL</option>
            <option value="DAI">DAI</option>
            <option value="USDT">USDT</option>
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
                  1 {payCurrency} = {
                    cryptoPrices[payCurrency] && cryptoPrices[receiveCurrency] ? 
                    (cryptoPrices[payCurrency].price / cryptoPrices[receiveCurrency].price).toFixed(6) : 
                    "..."
                  } {receiveCurrency}
                </div>
              </>
            )
          )}
        </div>

        {/* Action Buttons */}
        <div style={{ marginBottom: '15px' }}>
        <button 
        onClick={handleSwap}
        disabled={!walletConnected}
        style={{ 
          width: '100%', 
          padding: '10px', 
          fontSize: '16px',
          backgroundColor: walletConnected ? '#3498db' : '#cccccc',
          color: 'white',
          border: 'none',
          marginBottom: '10px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: '4px',
          cursor: walletConnected ? 'pointer' : 'not-allowed'
        }}
      >
        {walletConnected ? 'SWAP!' : 'Connect Wallet'}
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