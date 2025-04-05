// app/data-service/market-updates/route.js
import { NextResponse } from 'next/server';

/**
 * This route is deliberately named to avoid ad blockers
 * that might block routes with "api", "news", or "crypto" in the URL
 */
export async function GET() {
  try {
    // Use the News API directly with API key
    const API_KEY = process.env.NEWS_API_KEY || '63be5a783b9e43879fe815bc139a77d9';
    
    // Get yesterday's date
    const date = new Date();
    date.setDate(date.getDate() - 1);
    const fromDate = date.toISOString().split('T')[0];
    
    // Construct the URL using the NewsAPI format - note we're adding words that won't trigger blockers
    const url = `https://newsapi.org/v2/everything?q=(digital+assets+AND+blockchain)&from=${fromDate}&sortBy=publishedAt&language=en&domains=coindesk.com,cointelegraph.com,cryptoslate.com&excludeDomains=npmjs.com,github.com,medium.com&apiKey=${API_KEY}`;
    
    console.log('Fetching data from News API');
    
    // Make the request with a timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);
    
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'NextJS-Application'
      }
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      throw new Error(`API returned ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    // Return the data
    return NextResponse.json(data);
    
  } catch (error) {
    console.error('Market updates fetch error:', error);
    
    // Return mock data with error message
    return NextResponse.json({
      status: 'error',
      message: error.message || 'Failed to fetch market updates',
      articles: generateMockArticles()
    });
  }
}

/**
 * Generate mock articles when the API fails
 */
function generateMockArticles() {
  return [
    {
      title: "Bitcoin Finds Support After Market Fluctuations",
      publishedAt: new Date().toISOString(),
      urlToImage: null,
      source: { name: "Market Updates" },
      url: "#",
      description: "Bitcoin has established a new support level following recent market activity."
    },
    {
      title: "Ethereum Development Activity Reaches Record High",
      publishedAt: new Date().toISOString(),
      urlToImage: null,
      source: { name: "Market Updates" },
      url: "#",
      description: "Developer activity on the Ethereum network continues to grow despite market volatility."
    },
    {
      title: "New Regulatory Framework Proposed for Digital Assets",
      publishedAt: new Date().toISOString(),
      urlToImage: null,
      source: { name: "Market Updates" },
      url: "#",
      description: "Regulatory bodies are considering new frameworks to address the growing blockchain market."
    }
  ];
}