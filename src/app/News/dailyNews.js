import { useEffect, useState } from 'react';
import NewsDetail from './newsDetail';
import NewsSummary from './newsSummary';
import style from '../css/dailynews.module.css';

export default function DailyNews({ setSummary }) {
  const [articles, setArticles] = useState([]);
  const [selectedArticle, setSelectedArticle] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const articlesPerPage = 10;

  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL;

  console.log("API_BASE_URL:", API_BASE_URL);  // 這裡確認是否正確設置

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
        const headlines = (data.articles || []).map(article => article.title);
        
        // 確保請求的 URL 正確
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
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
  };

  // 分頁邏輯
  const totalPages = Math.ceil(articles.length / articlesPerPage);
  const indexOfLastArticle = currentPage * articlesPerPage;
  const indexOfFirstArticle = indexOfLastArticle - articlesPerPage;
  const currentArticles = articles.slice(indexOfFirstArticle, indexOfLastArticle);

  const goToPage = (page) => {
    if (page < 1 || page > totalPages) return;
    setCurrentPage(page);
  };

  return (
    <main>
      <div className={style.grid}>
        {currentArticles.map((article, index) => (
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

      {/* 分頁控制按鈕 */}
      <div className={style.pagination}>
        <button onClick={() => goToPage(currentPage - 1)} disabled={currentPage === 1}>上一頁</button>
        {[...Array(totalPages)].map((_, i) => (
          <button
            key={i}
            className={currentPage === i + 1 ? style.activePage : ''}
            onClick={() => goToPage(i + 1)}
          >
            {i + 1}
          </button>
        ))}
        <button onClick={() => goToPage(currentPage + 1)} disabled={currentPage === totalPages}>下一頁</button>
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
