import React, { useState, useEffect } from 'react';

export default function Transactions({ address, summary }) {
  const [transactions, setTransactions] = useState([]);
  const [filter, setFilter] = useState('all');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!address) return;

    const fetchTransactions = async () => {
      setIsLoading(true);
      setError(null);

      try {
        // Use your existing proxy endpoint
        const response = await fetch(`https://1inchproxy-kcj2-m1xuut4sf-chengggkks-projects.vercel.app/api?address=${address}`, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
          },
          
        });
        
        // For debugging
        console.log('Response status:', response.status);

        if (!response.ok) {
          const errorText = await response.text();
          console.error('Error response text:', errorText);
          throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
        }

        const data = await response.json();
        console.log('Received transaction data:', data);

        // Transform the data based on your proxy's response structure
        const transformedTransactions = Array.isArray(data.items) 
          ? data.items.map((item, index) => ({
              id: item.id || `tx-${index}`,
              date: item.details && item.details.timestamp 
                ? new Date(item.details.timestamp * 1000).toISOString().split('T')[0] 
                : 'Unknown date',
              type: item.type || (item.details && item.details.type) || 'Unknown type',
              status: 'Completed', // Default status
              txHash: item.details && item.details.txHash ? item.details.txHash : 'Unknown hash',
              // Additional fields that might be useful
              timestamp: item.details && item.details.timestamp ? item.details.timestamp : null
            }))
          : [];

        setTransactions(transformedTransactions);
      } catch (err) {
        console.error('Error fetching transactions:', err);
        setError(err.message);
        setTransactions([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTransactions();
  }, [address]);

  // Filter transactions based on status
  const filteredTransactions = transactions.filter(transaction => 
    filter === 'all' || transaction.status.toLowerCase() === filter
  );

  if (!address) {
    return (
      <div style={{
        textAlign: 'center',
        color: '#666',
        padding: '20px'
      }}>
        Please enter a wallet address to view transactions
      </div>
    );
  }

  if (isLoading) {
    return (
      <div style={{
        textAlign: 'center',
        color: '#666',
        padding: '20px'
      }}>
        Loading transactions...
      </div>
    );
  }

  if (error) {
    return (
      <div style={{
        textAlign: 'center',
        color: '#e74c3c',
        padding: '20px'
      }}>
        Error: {error}
        <p>Unable to fetch transactions. Please check the address and try again.</p>
      </div>
    );
  }

  return (
    <div style={{
      fontFamily: 'Arial, sans-serif',
      maxWidth: '600px',
      margin: '0 auto',
      padding: '20px'
    }}>


      {/* Transactions List */}
      {filteredTransactions.length === 0 ? (
        <div style={{
          textAlign: 'center',
          color: '#666',
          padding: '20px'
        }}>
          No transactions found
        </div>
      ) : (
        <div>
          {filteredTransactions.map((transaction) => (
            <div 
              key={transaction.id}
              style={{
                backgroundColor: '#e6f3e6',
                borderRadius: '8px',
                padding: '15px',
                marginBottom: '15px',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
              }}
            >
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginBottom: '10px'
              }}>
                <span style={{ fontWeight: 'bold' }}>
                  {transaction.type}
                </span>
                <span style={{
                  color: '#2ecc71',
                  fontWeight: 'bold'
                }}>
                  {transaction.status}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <div>
                  <div>
                    Transaction Hash: {' '}
                    <a 
                      href={`https://etherscan.io/tx/${transaction.txHash}`} 
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: '#3498db', textDecoration: 'none' }}
                    >
                      {transaction.txHash.substring(0, 10)}...
                    </a>
                  </div>
                  <div style={{ fontSize: '12px', color: '#666' }}>Date: {transaction.date}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Latest Summary Section */}
      {summary && (
        <div style={{
          marginTop: '20px',
          padding: '15px',
          backgroundColor: '#f0f0f0',
          borderRadius: '8px',
          textAlign: 'center'
        }}>
          <h3>Latest Transaction Summary</h3>
          <p>{summary}</p>
        </div>
      )}
    </div>
  );
}