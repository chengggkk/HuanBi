import { useEffect, useState } from 'react';
import NewsDetail from './newsDetail';
import NewsSummary from './newsSummary'
import style from '../css/dailynews.module.css';

export default function DailyNews({ setSummary }) {
  const [articles, setArticles] = useState([]);
  const [selectedArticle, setSelectedArticle] = useState(null);
  const [showModal, setShowModal] = useState(false); // 控制 Modal 是否顯示

  const today = new Date();
  const lastWeek = new Date();
  lastWeek.setDate(today.getDate() - 7);
  const fromDate = lastWeek.toISOString().split('T')[0];

  useEffect(() => {
    const API_KEY = '63be5a783b9e43879fe815bc139a77d9';
    const url = `https://newsapi.org/v2/everything?q=(Bitcoin AND Ethereum)&from=${fromDate}&sortBy=publishedAt&language=en&domains=coindesk.com,cointelegraph.com,cryptoslate.com&excludeDomains=npmjs.com,github.com,medium.com&apiKey=${API_KEY}`;

    fetch(url)
      .then(response => response.json())
      .then(data => {
        setArticles(data.articles || []);

        // 提取新聞標題
        const headlines = (data.articles || []).map(article => article.title);

        // 發送標題到後端請求摘要
        fetch("http://127.0.0.1:5000/generate-summary", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ headlines })
        })
          .then(res => res.json())
          .then(summaryData => setSummary(summaryData.summary || "No summary available"))
          .catch(err => console.error("Error fetching summary:", err));
      })
      .catch(error => console.error('Error fetching news:', error));
  }, []);

 const handleCardClick = (article) => {
    setSelectedArticle(article);
    setShowModal(true); // 顯示 Modal
  };

  const handleCloseModal = () => {
    setShowModal(false); // 隱藏 Modal
  };

  return (
    <main>
      <div className={style.grid}>
        {articles.map((article, index) => (
          <div key={index} className={style.card} onClick={() => handleCardClick(article)}>
            <div className={style.imageContainer}>
              <img src={article.urlToImage || 'https://via.placeholder.com/150'} alt="news" />
            </div>
            <div className={style.content}>
              <p className={style.date}>{new Date(article.publishedAt).toLocaleDateString()}</p>
              <h3 className={style.title}>{article.title}</h3>
            </div>
          </div>
        ))}
      </div>

      {/* 模態視窗 */}
      {showModal && (
        <div className={style.modalOverlay} onClick={handleCloseModal}>
          <div className={style.modalContent} onClick={(e) => e.stopPropagation()}>
            <button className={style.closeButton} onClick={handleCloseModal}>✖</button>
            <NewsDetail article={selectedArticle} />
          </div>
        </div>
      )}
    </main>
  );
}
