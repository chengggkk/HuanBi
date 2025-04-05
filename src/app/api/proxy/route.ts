import { NextResponse } from 'next/server';

export async function GET() {
  const url = `https://1inchproxy-kcj2-65hnvbkxe-chengggkks-projects.vercel.app/api?token0=0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2&token1=0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48&period=1W`;

  try {
    // Add headers for authentication if required
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        // Add any necessary authentication headers
        // For example:
        // 'Authorization': `Bearer ${process.env.INCH_API_TOKEN}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });
    
    // Check response status and handle different scenarios
    if (response.status === 401) {
      return NextResponse.json({ 
        error: 'Authentication failed', 
        details: 'Unauthorized access to the 1inch proxy API' 
      }, { status: 401 });
    }

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`HTTP error! status: ${response.status}, body: ${errorBody}`);
    }
    
    const data = await response.json();

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching from 1inch proxy:', error);
    
    // Differentiate between different types of errors
    if (error instanceof TypeError) {
      return NextResponse.json({ 
        error: 'Network error', 
        details: error.message 
      }, { status: 500 });
    }

    return NextResponse.json({ 
      error: 'Failed to fetch data', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}