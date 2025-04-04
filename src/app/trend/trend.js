import React, { useState, useEffect } from "react";
// import Chart from "react-apexcharts";
import dynamic from "next/dynamic"; // 動態載入 Chart，避免 SSR 問題
import style from '../css/trend.module.css';

const Chart = dynamic(() => import("react-apexcharts"), { ssr: false });

export default function MainTrend() {
  const [priceData, setPriceData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedCrypto, setSelectedCrypto] = useState("bitcoin");
  const [timeframe, setTimeframe] = useState("1");
  const [latestPrice, setLatestPrice] = useState(null);
  const [priceChange, setPriceChange] = useState(null);
  const [hoveredData, setHoveredData] = useState(null); // 初始化 hover 狀態

  // 浮動程度的樣式
  const UDStyle = {
    backgroundColor: priceChange >= 0 ? "#16A34A" : "#DC2626", // bg-green-600 / bg-red-600
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(
          `https://api.coingecko.com/api/v3/coins/${selectedCrypto}/market_chart?vs_currency=usd&days=${timeframe}`
        );

        if (!response.ok) {
          // 獲取數據失敗
          throw new Error("Failed to retrieve data.");
        }

        const data = await response.json();
        const formattedData = data.prices.map((item, index, arr) => {
          if (index < 3) return null;
          return {
            x: new Date(item[0]),
            y: [
              arr[index - 3][1], // 開盤價
              Math.max(arr[index - 2][1], arr[index - 1][1], item[1]), // 最高價
              Math.min(arr[index - 2][1], arr[index - 1][1], item[1]), // 最低價
              item[1], // 收盤價
            ],
          };
        }).filter(Boolean);

        setPriceData([{ data: formattedData }]);

        if (formattedData.length > 0) {
          const latest = formattedData[formattedData.length - 1].y[3]; // 收盤價
          setLatestPrice(latest);
          const first = formattedData[0].y[3]; // 開盤價
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

  const options = {
    chart: {
      type: "candlestick",
      height: 350,
      // 顯示圖中之點選內容
      events: {
        dataPointSelection: function (event, chartContext, config) {
          const { dataPointIndex } = config;
          if (dataPointIndex !== undefined && priceData[0]?.data[dataPointIndex]) {
            const selectedPoint = priceData[0].data[dataPointIndex];
            const price = selectedPoint.y;
            setHoveredData({
              date: new Date(selectedPoint.x).toLocaleString("zh-TW", { 
                year: "numeric", month: "2-digit", day: "2-digit",
                hour: "2-digit", minute: "2-digit", second: "2-digit" // 加入秒級顯示
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
      // K線圖示例
      text: "Candlestick Chart",
      align: "left",
    },
    xaxis: {
      type: "datetime",
    },
    yaxis: {
      labels: {
        formatter: (value) => value.toFixed(2), // 限制小數點後兩位
      },
    },
    tooltip: { enabled: false }, // 取消內建 tooltip
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('zh-TW', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(price);
  };

  return (
    <div className="p-4 max-w-2xl mx-auto ml-100" style={{ marginLeft: "10px" }}>
      <div className={`${style.SelectContainer}`}>
      <div className={`${style.SelectleftItem}`}>
        {/* className="mb-4" */}
        {/* 選擇加密貨幣 */}
        <label className="block text-sm font-medium text-gray-700 mb-1"><b>Cryptocurrency</b> </label>
        <select
          className={`${style.selectStyle}`}
        >
          {/* className="w-full p-2 border border-gray-300 rounded-full bg-white" */}
          <option value="bitcoin">Bitcoin (BTC)</option>
          <option value="ethereum">Ethereum (ETH)</option>
          <option value="binancecoin">Binance Coin (BNB)</option>
          <option value="solana">Solana (SOL)</option>
          <option value="dogecoin">Dogecoin (DOGE)</option>
          <option value="cardano">Cardano (ADA)</option>
        </select>
      </div>

      <div className={`${style.SelectrightItem}`}>
        {/* 時間範圍 */}
        <label className="block text-sm font-medium text-gray-700 mb-1"><b>Date Range</b> </label>
        <select
          className={`${style.selectStyle}`}
          value={timeframe}
          onChange={(e) => setTimeframe(e.target.value)}
        >
          {/* className="w-full p-2 border border-gray-300 rounded-md bg-white" */}
          <option value="1">1 day</option>
          <option value="7">7 days</option>
          <option value="30">30 days</option>
          <option value="90">90 days</option>
          <option value="365">1 year</option>
          <option value="max">All</option>
        </select>
      </div>
      </div>
      {latestPrice && (
        <div className="flex flex-wrap items-center gap-4 mb-2">
          <div className={`${style.titleContainer}`}>
          <div className={`${style.leftItem}`}>
            {/* className="text-xl font-bold" */}
            {formatPrice(latestPrice)}
          </div>
          {priceChange !== null && (
            <div className={`${style.rightItem}`} style={UDStyle}>
               {/* className={`text-sm font-medium ${priceChange >= 0 ? 'text-green-600' : 'text-red-600'}`} */}
              {priceChange >= 0 ? '+' : '-'} {Math.abs(priceChange).toFixed(2)}%
            </div>
          )}
          </div>
          <div className="text-sm text-gray-500" style={{color:'#555', fontweight: 'bold'}}>
            Past {timeframe === 'max' ? 'Maximum Time' : timeframe === '365' ? '1 year' : `${timeframe} day`}
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          <p>{error}</p>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <p className="text-gray-500">Loading...</p>
        </div>
      ) : (
        <Chart options={options} series={priceData} type="candlestick" height={400} style={{backgroundColor:"#f5f5f5", padding: "10px", borderRadius: "5px", marginRight:"10px"}} />
      )}

      {/* <div className="mt-4 text-xs text-gray-500"> */}
      <div style={{ background: "#f5f5f5", padding: "10px", borderRadius: "5px", marginRight:"10px", marginLeft:"0px" }}>
        <h3>📊 Data</h3>
        {hoveredData ? (
          <div className="flex justify-center items-center h-64">
            <p>📅&ensp;Date: {hoveredData.date}</p>
            <p>&ensp;&ensp;&ensp; Opening Price: ${hoveredData.open}</p>
            <p>&ensp;&ensp;&ensp; High Price: ${hoveredData.high}</p>
            <p>&ensp;&ensp;&ensp; Low Price: ${hoveredData.low}</p>
            <p>&ensp;&ensp;&ensp; Closing Price: ${hoveredData.close}</p>
          </div>
        ) : (
          <p>Please move the mouse over the chart to view data.</p>
          // 請將滑鼠移動到圖表上查看數據
        )}
      </div>

      <div className="mt-4 text-xs text-gray-500">
        <p>Data Source: CoinGecko API • Automatically updates every minute.</p>
        {/* 資料來源: CoinGecko API • 自動每分鐘更新 */}
      </div>

      <div className={`${style.BTitleContainer}`} >
        <div className={`${style.BLeftItem}`} >
          {/* 買進 */}
          <button className={`${style.BuyButton}`}>Buy</button>
        </div>
        <div className={`${style.BRightItem}`} >
          {/* 賣出 */}
          <button className={`${style.SellOffButton}`}>Sell Off</button>
        </div>
      </div>
    </div>
  );
};

