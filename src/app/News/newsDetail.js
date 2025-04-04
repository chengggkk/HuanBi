export default function NewsDetail({ article }) {
    return (
      <div>
        <h2>{article.title}</h2>
        <p><strong>Author:</strong> {article.author || 'Unknown'}</p>
        <p><strong>Published At:</strong> {new Date(article.publishedAt).toLocaleString()}</p>
        <img src={article.urlToImage || 'https://via.placeholder.com/300'} alt="news" style={{ maxWidth: '100%' }} />
        <p><strong>Description:</strong> {article.description || 'No description available.'}</p>
        <p><strong>Content:</strong> {article.content || 'No content available.'}</p>
        <a href={article.url} target="_blank" rel="noopener noreferrer" style={{ color: 'blue', textDecoration: 'underline' }}>Read Full Article</a>
      </div>
    );
  }
  