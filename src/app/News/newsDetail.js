
import style from '../css/dailynews.module.css';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCircleRight } from '@fortawesome/free-solid-svg-icons';

export default function NewsDetail({ article }) {
  return (
    <div>
      <div className={style.modalTop}>
        <h2 className={style.modalTitle}>{article.title}</h2>
        <div className={style.modalTitleMain}>
          <div className={style.modalAuthor}> {article.author || 'Unknown'}</div >
          <div className={style.modalAuthor}>
            {new Date(article.publishedAt).toLocaleString('zh-TW', {
              year: 'numeric',
              month: 'numeric',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
              hour12: false
            })}
          </div >
        </div>
        <img className={style.modalImg} src={article.urlToImage || 'https://via.placeholder.com/300'} alt="news" style={{ maxWidth: '100%' }} />
      </div>

      <p className={style.modalDes}>{article.description || 'No description available.'}</p>
      {/* <p><strong>Content:</strong> {article.content || 'No content available.'}</p> */}
      <div className={style.modalBottom}>
        <a className={style.modalGo} href={article.url} target="_blank" rel="noopener noreferrer">
          Read Full Article  <FontAwesomeIcon icon={faCircleRight} /></a>
      </div>

    </div>
  );
}
