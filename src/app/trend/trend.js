// Update imports to include HashLock
import React, { useState, useEffect } from "react";
import dynamic from "next/dynamic"; // Dynamic import for Chart to avoid SSR issues
import axios from "axios";
import { SDK, NetworkEnum, HashLock } from "@1inch/cross-chain-sdk";
// Import ethers - try to be compatible with v6
import { ethers } from "ethers";
import FusionSwap from "./fusionswap"; // Import our simplified component


// Import the Chart component dynamically to avoid SSR issues
const Chart = dynamic(() => import("react-apexcharts"), { ssr: false });

// Token addresses by chain ID
// 1: Ethereum, 56: BSC, 137: Polygon, 43114: Avalanche, 42161: Arbitrum, 10: Optimism, 250: Fantom, 100: Gnosis
const TOKEN_ADDRESSES_BY_CHAIN = {
  // Ethereum (1)
  "1": {
    "USDC": "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
    "DAI": "0x6b175474e89094c44da98b954eedeac495271d0f",
    "ETH": "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2", // WETH
    "BTC": "0x2260fac5e5542a773aa44fbcfedf7c193bc2c599", // WBTC
    "USDT": "0xdac17f958d2ee523a2206206994597c13d831ec7",
    "BNB": "0xB8c77482e45F1F44dE1745F52C74426C631bDD52",
    "DOGE": "0x4206931337dc273a630d328da6441786bfad668f",
    "ADA": "0x8a108eac367f2e233cefda1d9fc8f9fad123a0e1"
  },
  // BSC (56)
  "56": {
    "USDC": "0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d",
    "DAI": "0x1af3f329e8be154074d8769d1ffa4ee058b1dbc3",
    "ETH": "0x2170ed0880ac9a755fd29b2688956bd959f933f8", // WETH on BSC
    "BTC": "0x7130d2a12b9bcbfae4f2634d864a1ee1ce3ead9c", // BTCB
    "USDT": "0x55d398326f99059ff775485246999027b3197955", // BSC-USD
    "BNB": "0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c", // WBNB
    "DOGE": "0xba2ae424d960c26247dd6c32edc70b295c744c43",
    "ADA": "0x3ee2200efb3400fabb9aacf31297cbdd1d435d47"
  },
  // Polygon (137)
  "137": {
    "USDC": "0x2791bca1f2de4661ed88a30c99a7a9449aa84174",
    "DAI": "0x8f3cf7ad23cd3cadbd9735aff958023239c6a063",
    "ETH": "0x7ceb23fd6bc0add59e62ac25578270cff1b9f619", // WETH on Polygon
    "BTC": "0x1bfd67037b42cf73acf2047067bd4f2c47d9bfd6", // WBTC on Polygon
    "USDT": "0xc2132d05d31c914a87c6611c10748aeb04b58e8f",
    "BNB": "0x3BA4c387f786bFEE076A58914F5Bd38d668B42c3",
    "DOGE": "0xb7ddc6414bf4f5515b52d8bdd69973ae205ff101",
    "ADA": "0xda1e53e088023fe4d1dc5a418581748f953a88c9"
  },
  // Arbitrum (42161)
  "42161": {
    "USDC": "0xff970a61a04b1ca14834a43f5de4533ebddb5cc8",
    "DAI": "0xda10009cbd5d07dd0cecc66161fc93d7c9000da1",
    "ETH": "0x82af49447d8a07e3bd95bd0d56f35241523fbab1", // WETH on Arbitrum
    "BTC": "0x2f2a2543b76a4166549f7aab2e75bef0aefc5b0f", // WBTC on Arbitrum
    "USDT": "0xfd086bc7cd5c481dcc9c85ebe478a1c0b69fcbb9",
    "BNB": "0x20865e63b111b2649ef829ec220536c82c58ad7b",
    "DOGE": "0xc4b5a88ea2a2860d4700818d69e9e9b0f4f3f4df",
    "ADA": "0xae48c91df1fe419994ffda27da09d5ac1c451057"
  },
  // Optimism (10)
  "10": {
    "USDC": "0x7f5c764cbc14f9669b88837ca1490cca17c31607",
    "DAI": "0xda10009cbd5d07dd0cecc66161fc93d7c9000da1",
    "ETH": "0x4200000000000000000000000000000000000006", // WETH on Optimism
    "BTC": "0x68f180fcce6836688e9084f035309e29bf0a2095", // WBTC on Optimism
    "USDT": "0x94b008aa00579c1307b0ef2c499ad98a8ce58e58",
    "BNB": "0x4200000000000000000000000000000000000006" // Use ETH as fallback since BNB might not exist on Optimism
  },
  // Avalanche (43114)
  "43114": {
    "USDC": "0xb97ef9ef8734c71904d8002f8b6bc66dd9c48a6e",
    "DAI": "0xd586e7f844cea2f87f50152665bcbc2c279d8d70",
    "ETH": "0x49d5c2bdffac6ce2bfdb6640f4f80f226bc10bab", // WETH on Avalanche
    "BTC": "0x50b7545627a5162f82a992c33b87adc75187b218", // WBTC on Avalanche
    "USDT": "0x9702230a8ea53601f5cd2dc00fdbc13d4df4a8c7",
    "BNB": "0x264c1383ea520f73dd837f915ef3a732e204a493"
  },
  // Fantom (250)
  "250": {
    "USDC": "0x04068da6c83afcfa0e13ba15a6696662335d5b75",
    "DAI": "0x8d11ec38a3eb5e956b052f67da8bdc9bef8abf3e",
    "ETH": "0x74b23882a30290451a17c44f4f05243b6b58c76d", // WETH on Fantom
    "BTC": "0x321162cd933e2be498cd2267a90534a804051b11", // WBTC on Fantom
    "USDT": "0x049d68029688eabf473097a2fc38ef61633a3c7a",
    "BNB": "0xd67de0e0a0fd7b15dc8348bb9be742f3c5850454"
  },
  // Gnosis (100)
  "100": {
    "USDC": "0xddafbb505ad214d7b80b1f830fccc89b60fb7a83",
    "DAI": "0xe91d153e0b41518a2ce8dd3d7944fa863463a97d", // xDAI on Gnosis
    "ETH": "0x6a023ccd1ff6f2045c3309768ead9e68f978f6e1", // WETH on Gnosis
    "BTC": "0x8e5bbbb09ed1ebde8674cda39a0c169401db4252", // WBTC on Gnosis
    "USDT": "0x4ecaba5870353805a9f068101a40e0f32ed605c6"
  }
};
// Default to Ethereum token addresses for backwards compatibility
const TOKEN_ADDRESSES = TOKEN_ADDRESSES_BY_CHAIN["1"];

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
        formatter: function (value, timestamp) {
          // Custom formatting based on timeframe
          const date = new Date(timestamp);
          if (timeframe === "5m" || timeframe === "15m" || timeframe === "1h") {
            return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          } else if (timeframe === "4h" || timeframe === "1d") {
            return `${date.getMonth() + 1}/${date.getDate()} ${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`;
          } else {
            return `${date.getMonth() + 1}/${date.getDate()}`;
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

      {/* Swap Interface - Using our simplified component */}
      <div style={{ border: '1px solid #e0e0e0', padding: '10px' }}>
        <FusionSwap />
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