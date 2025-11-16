import React, { useState, useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { GoogleGenAI, Chat } from "@google/genai";

// Declare Chart and Chart plugins to avoid TypeScript errors with CDN-loaded scripts
declare const Chart: any;
declare const zoomPlugin: any;

const App = () => {
    const [symbol, setSymbol] = useState('');
    const [loading, setLoading] = useState(false);
    const [stockData, setStockData] = useState(null);
    const [error, setError] = useState('');
    const [suggestions, setSuggestions] = useState<{ symbol: string, name: string }[]>([]);
    const [isSuggestionsVisible, setIsSuggestionsVisible] = useState(false);
    const chartRef = useRef(null);
    const chartInstanceRef = useRef(null);

    // Chatbot state
    const [isChatOpen, setIsChatOpen] = useState(false);
    const [chatHistory, setChatHistory] = useState<{ role: 'user' | 'model', text: string }[]>([]);
    const [chatInput, setChatInput] = useState('');
    const [isBotLoading, setIsBotLoading] = useState(false);
    const chatSessionRef = useRef<Chat | null>(null);
    const chatBodyRef = useRef<HTMLDivElement | null>(null);

    // Mock data based on the PRD
    const mockStockData = {
        symbol: "RELIANCE.NS",
        name: "Reliance Industries Ltd",
        recommendation: "BUY",
        confidence: 85,
        rawScore: 0.85,
        price: "₹2950.50",
        change: "+₹25.10 (0.86%)",
        indicators: [
            { name: "RSI (14)", value: "68.2", signal: "Bullish" },
            { name: "MACD", value: "Positive Crossover", signal: "Bullish" },
            { name: "SMA 20/50", value: "Golden Cross", signal: "Bullish" },
            { name: "EMA (10/20)", value: "Above", signal: "Bullish" },
            { name: "Volume", value: "1.2x Avg", signal: "Strong" },
            { name: "ATR (14)", value: "45.30", signal: "High Volatility" }
        ],
        riskNotes: "ATR suggests a stop-loss around ₹2905.20.",
        positionSizing: "Consider allocating 3-5% of portfolio due to high volatility."
    };
    
    // Mock list of stocks for autocomplete
    const mockSymbolList = [
        { symbol: 'ADANIENT.NS', name: 'Adani Enterprises Ltd' },
        { symbol: 'ADANIPORTS.NS', name: 'Adani Ports and Special Economic Zone Ltd' },
        { symbol: 'APOLLOHOSP.NS', name: 'Apollo Hospitals Enterprise Ltd' },
        { symbol: 'ASIANPAINT.NS', name: 'Asian Paints Ltd' },
        { symbol: 'AXISBANK.NS', name: 'Axis Bank Ltd' },
        { symbol: 'BAJAJ-AUTO.NS', name: 'Bajaj Auto Ltd' },
        { symbol: 'BAJFINANCE.NS', name: 'Bajaj Finance Ltd' },
        { symbol: 'BAJAJFINSV.NS', name: 'Bajaj Finserv Ltd' },
        { symbol: 'BPCL.NS', name: 'Bharat Petroleum Corporation Ltd' },
        { symbol: 'BHARTIARTL.NS', name: 'Bharti Airtel Ltd' },
        { symbol: 'BRITANNIA.NS', name: 'Britannia Industries Ltd' },
        { symbol: 'CIPLA.NS', name: 'Cipla Ltd' },
        { symbol: 'COALINDIA.NS', name: 'Coal India Ltd' },
        { symbol: 'DIVISLAB.NS', name: 'Divi\'s Laboratories Ltd' },
        { symbol: 'DRREDDY.NS', name: 'Dr. Reddy\'s Laboratories Ltd' },
        { symbol: 'EICHERMOT.NS', name: 'Eicher Motors Ltd' },
        { symbol: 'GRASIM.NS', name: 'Grasim Industries Ltd' },
        { symbol: 'HCLTECH.NS', name: 'HCL Technologies Ltd' },
        { symbol: 'HDFCBANK.NS', name: 'HDFC Bank Ltd' },
        { symbol: 'HDFCLIFE.NS', name: 'HDFC Life Insurance Company Ltd' },
        { symbol: 'HEROMOTOCO.NS', name: 'Hero MotoCorp Ltd' },
        { symbol: 'HINDALCO.NS', name: 'Hindalco Industries Ltd' },
        { symbol: 'HINDUNILVR.NS', name: 'Hindustan Unilever Ltd' },
        { symbol: 'ICICIBANK.NS', name: 'ICICI Bank Ltd' },
        { symbol: 'ITC.NS', name: 'ITC Ltd' },
        { symbol: 'INDUSINDBK.NS', name: 'IndusInd Bank Ltd' },
        { symbol: 'INFY.NS', name: 'Infosys Ltd' },
        { symbol: 'JSWSTEEL.NS', name: 'JSW Steel Ltd' },
        { symbol: 'KOTAKBANK.NS', name: 'Kotak Mahindra Bank Ltd' },
        { symbol: 'LTIM.NS', name: 'LTIMindtree Ltd' },
        { symbol: 'LT.NS', name: 'Larsen & Toubro Ltd' },
        { symbol: 'M&M.NS', name: 'Mahindra & Mahindra Ltd' },
        { symbol: 'MARUTI.NS', name: 'Maruti Suzuki India Ltd' },
        { symbol: 'NTPC.NS', name: 'NTPC Ltd' },
        { symbol: 'NESTLEIND.NS', name: 'Nestle India Ltd' },
        { symbol: 'ONGC.NS', name: 'Oil & Natural Gas Corporation Ltd' },
        { symbol: 'POWERGRID.NS', name: 'Power Grid Corporation of India Ltd' },
        { symbol: 'RELIANCE.NS', name: 'Reliance Industries Ltd' },
        { symbol: 'SBILIFE.NS', name: 'SBI Life Insurance Company Ltd' },
        { symbol: 'SBIN.NS', name: 'State Bank of India' },
        { symbol: 'SHRIRAMFIN.NS', name: 'Shriram Finance Ltd' },
        { symbol: 'SUNPHARMA.NS', name: 'Sun Pharmaceutical Industries Ltd' },
        { symbol: 'TCS.NS', name: 'Tata Consultancy Services Ltd' },
        { symbol: 'TATACONSUM.NS', name: 'Tata Consumer Products Ltd' },
        { symbol: 'TATAMOTORS.NS', name: 'Tata Motors Ltd' },
        { symbol: 'TATASTEEL.NS', name: 'Tata Steel Ltd' },
        { symbol: 'TECHM.NS', name: 'Tech Mahindra Ltd' },
        { symbol: 'TITAN.NS', name: 'Titan Company Ltd' },
        { symbol: 'ULTRACEMCO.NS', name: 'UltraTech Cement Ltd' },
        { symbol: 'WIPRO.NS', name: 'Wipro Ltd' },
    ];


    const marketOverview = {
        topGainers: [{ symbol: 'TATASTEEL.NS', price: '₹180.20', change: '+5.2%' }, { symbol: 'WIPRO.NS', price: '₹450.80', change: '+4.1%' }],
        topLosers: [{ symbol: 'HDFCBANK.NS', price: '₹1500.50', change: '-2.8%' }, { symbol: 'INFY.NS', price: '₹1420.00', change: '-2.2%' }],
        volumeSpikes: [{ symbol: 'ADANIPORTS.NS', vol: '3.5x' }, { symbol: 'ITC.NS', vol: '2.8x' }]
    };

    // Effect to initialize chatbot
    useEffect(() => {
        const initChat = () => {
            try {
                const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
                chatSessionRef.current = ai.chats.create({
                    model: 'gemini-2.5-flash',
                    config: {
                        systemInstruction: 'You are a helpful and friendly stock market assistant specializing in the Indian market (NSE & BSE). Explain financial concepts clearly and concisely. Do not give direct financial advice, but you can provide data-driven explanations and analysis based on public information. When a user asks about a stock, you can talk about its fundamentals, recent news, or technical indicators in general terms.',
                    },
                });
                setChatHistory([{
                    role: 'model',
                    text: 'Hello! How can I help you with the Indian stock market today?'
                }]);
            } catch (e) {
                console.error("Failed to initialize chatbot:", e);
                setChatHistory([{
                    role: 'model',
                    text: 'Sorry, the chat assistant could not be initialized.'
                }]);
            }
        };
        initChat();
    }, []);

    // Effect to scroll chat to the bottom
    useEffect(() => {
        if (chatBodyRef.current) {
            chatBodyRef.current.scrollTop = chatBodyRef.current.scrollHeight;
        }
    }, [chatHistory]);

    useEffect(() => {
        if (stockData && chartRef.current) {
            if (chartInstanceRef.current) {
                chartInstanceRef.current.destroy();
            }
            const ctx = chartRef.current.getContext('2d');
            const labels = Array.from({ length: 90 }, (_, i) => {
                const d = new Date();
                d.setDate(d.getDate() - (89 - i));
                return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            });
            const priceData = Array.from({ length: 90 }, () => 2800 + Math.random() * 300);

            chartInstanceRef.current = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: labels,
                    datasets: [{
                        label: `${stockData.symbol} Price (₹)`,
                        data: priceData,
                        borderColor: '#3b82f6',
                        backgroundColor: 'rgba(59, 130, 246, 0.1)',
                        borderWidth: 2,
                        tension: 0.1,
                        pointRadius: 0,
                        pointHoverRadius: 5,
                        fill: true,
                    }]
                },
                options: {
                    responsive: true, maintainAspectRatio: false, interaction: { intersect: false, mode: 'index' },
                    scales: {
                        x: { ticks: { color: '#94a3b8' }, grid: { color: '#334155' } },
                        y: { ticks: { color: '#94a3b8', callback: (value) => `₹${value.toFixed(2)}` }, grid: { color: '#334155' } }
                    },
                    plugins: {
                        legend: { labels: { color: '#e2e8f0' } },
                        tooltip: { backgroundColor: '#1e293b', titleColor: '#e2e8f0', bodyColor: '#cbd5e1', borderColor: '#334155', borderWidth: 1, },
                        zoom: { pan: { enabled: true, mode: 'xy' }, zoom: { wheel: { enabled: true }, pinch: { enabled: true }, mode: 'xy' } }
                    }
                }
            });
        }
        return () => { if (chartInstanceRef.current) { chartInstanceRef.current.destroy(); } };
    }, [stockData]);


    const handleSearch = (e) => {
        e.preventDefault();
        if (!symbol) { setError("Please enter a stock symbol or name."); return; }
        setIsSuggestionsVisible(false); setLoading(true); setError(''); setStockData(null);
        setTimeout(() => {
            const searchTerm = symbol.trim().toLowerCase();
            const foundStock = mockSymbolList.find(s => 
                s.symbol.toLowerCase() === searchTerm ||
                s.name.toLowerCase() === searchTerm ||
                s.symbol.toLowerCase().includes(searchTerm) ||
                s.name.toLowerCase().includes(searchTerm)
            );
            if (foundStock) { setStockData({ ...mockStockData, symbol: foundStock.symbol, name: foundStock.name }); } 
            else { setError(`No data found for "${symbol}". Please check the symbol or name.`); }
            setLoading(false);
        }, 1500);
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setSymbol(value);
        if (value.length > 0) {
            const filtered = mockSymbolList.filter(stock =>
                stock.symbol.toLowerCase().includes(value.toLowerCase()) ||
                stock.name.toLowerCase().includes(value.toLowerCase())
            ).slice(0, 10);
            setSuggestions(filtered);
            setIsSuggestionsVisible(filtered.length > 0);
        } else {
            setSuggestions([]);
            setIsSuggestionsVisible(false);
        }
    };
    
    const handleSuggestionClick = (selectedSymbol: string) => {
        setSymbol(selectedSymbol);
        setIsSuggestionsVisible(false);
    };

    const handleChatSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!chatInput.trim() || isBotLoading || !chatSessionRef.current) return;
        
        const userMessage = { role: 'user' as const, text: chatInput };
        setChatHistory(prev => [...prev, userMessage]);
        setChatInput('');
        setIsBotLoading(true);

        try {
            const stream = await chatSessionRef.current.sendMessageStream({ message: chatInput });
            
            let botResponse = '';
            setChatHistory(prev => [...prev, { role: 'model', text: botResponse }]);

            for await (const chunk of stream) {
                botResponse += chunk.text;
                setChatHistory(prev => {
                    const newHistory = [...prev];
                    newHistory[newHistory.length - 1].text = botResponse;
                    return newHistory;
                });
            }
        } catch (err) {
            console.error(err);
            setChatHistory(prev => {
                 const newHistory = [...prev];
                 const lastMessage = newHistory[newHistory.length - 1];
                 if(lastMessage.role === 'model'){
                    lastMessage.text = "Sorry, I encountered an error. Please try again.";
                 }
                 return newHistory;
            });
        } finally {
            setIsBotLoading(false);
        }
    };

    const getRecommendationClass = (rec) => {
        if (rec === 'BUY') return 'recommendation-buy';
        if (rec === 'SELL') return 'recommendation-sell';
        return 'recommendation-hold';
    };

    return (
        <div className="min-h-screen container mx-auto p-4 md:p-8 font-sans">
            <header className="text-center mb-8">
                <h1 className="text-4xl md:text-5xl font-bold text-white">
                    <i className="fas fa-chart-line mr-3 text-blue-500"></i>Indian Stock Analyzer
                </h1>
                <p className="text-slate-400 mt-2">Actionable insights for NSE & BSE stocks.</p>
            </header>

            <main>
                <form onSubmit={handleSearch} className="card p-6 mb-8 max-w-2xl mx-auto">
                    <label htmlFor="stock-search" className="block text-lg font-medium mb-2">Search Stock Symbol</label>
                    <div className="flex flex-col sm:flex-row gap-4">
                        <div className="relative w-full">
                            <input
                                id="stock-search" type="text" value={symbol} onChange={handleInputChange}
                                onFocus={() => { if(symbol && suggestions.length > 0) setIsSuggestionsVisible(true) }}
                                onBlur={() => setTimeout(() => setIsSuggestionsVisible(false), 200)}
                                placeholder="e.g., RELIANCE.NS or Reliance Industries"
                                className="w-full px-4 py-2 rounded-md bg-slate-800 border border-slate-600 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                aria-label="Stock Symbol Search" autoComplete="off"
                            />
                            {isSuggestionsVisible && suggestions.length > 0 && (
                                <ul className="absolute z-10 w-full mt-1 bg-slate-700 border border-slate-600 rounded-md shadow-lg max-h-60 overflow-y-auto">
                                    {suggestions.map((stock) => (
                                        <li key={stock.symbol} className="px-4 py-3 hover:bg-slate-600 cursor-pointer" onMouseDown={() => handleSuggestionClick(stock.symbol)}>
                                            <div className="font-bold text-slate-100">{stock.symbol}</div>
                                            <div className="text-sm text-slate-400">{stock.name}</div>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                        <button type="submit" disabled={loading} className="btn-primary font-bold py-2 px-6 rounded-md disabled:bg-slate-500 disabled:cursor-not-allowed">
                            {loading ? <><i className="fas fa-spinner fa-spin mr-2"></i>Analyzing...</> : <><i className="fas fa-search mr-2"></i>Analyze</>}
                        </button>
                    </div>
                </form>

                {error && <div className="text-center text-red-400 p-4 card max-w-2xl mx-auto mb-8">{error}</div>}

                {stockData && (
                    <div id="analysis-dashboard" className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        <div className="lg:col-span-1 space-y-8">
                            <div className="card p-6 text-center">
                                <h2 className="text-2xl font-bold">{stockData.symbol}</h2>
                                <p className="text-slate-400">{stockData.name}</p>
                                <p className="text-4xl font-bold my-4">{stockData.price}</p>
                                <p className={`text-lg font-bold ${stockData.change.startsWith('+') ? 'text-green-400' : 'text-red-400'}`}>{stockData.change}</p>
                                <div className={`mt-4 p-4 rounded-lg text-3xl font-extrabold ${getRecommendationClass(stockData.recommendation)}`}>{stockData.recommendation}</div>
                            </div>
                            <div className="card p-6">
                                <h3 className="text-xl font-semibold mb-3">Confidence Score</h3>
                                <div className="w-full bg-slate-700 rounded-full h-6">
                                    <div className="bg-blue-500 h-6 rounded-full text-center text-white font-bold text-sm leading-6" style={{ width: `${stockData.confidence}%` }}
                                        aria-valuenow={stockData.confidence} aria-valuemin="0" aria-valuemax="100" role="progressbar">
                                        {stockData.confidence}%
                                    </div>
                                </div>
                                <p className="text-slate-400 text-sm mt-2 text-center">Based on {stockData.indicators.length} technical indicators.</p>
                            </div>
                            <div className="card p-6">
                                <h3 className="text-xl font-semibold mb-3"><i className="fas fa-shield-alt mr-2 text-yellow-500"></i>Risk Analysis</h3>
                                <p className="text-slate-300 mb-2"><span className="font-semibold">Risk Note:</span> {stockData.riskNotes}</p>
                                <p className="text-slate-300"><span className="font-semibold">Sizing Hint:</span> {stockData.positionSizing}</p>
                            </div>
                        </div>
                        <div className="lg:col-span-2 space-y-8">
                           <div className="card p-6">
                                <h3 className="text-xl font-semibold mb-4"><i className="fas fa-cogs mr-2 text-slate-400"></i>Indicator Breakdown</h3>
                                <div className="space-y-3">
                                    {stockData.indicators.map((indicator, index) => (
                                        <div key={index} className="flex justify-between items-center p-3 bg-slate-800 rounded-md">
                                            <div>
                                                <p className="font-semibold">{indicator.name}</p>
                                                <p className="text-sm text-slate-400">{indicator.value}</p>
                                            </div>
                                            <span className={`px-3 py-1 text-sm font-bold rounded-full ${ indicator.signal.toLowerCase().includes('bullish') || indicator.signal.toLowerCase().includes('strong') ? 'bg-green-500/20 text-green-300' : indicator.signal.toLowerCase().includes('bearish') || indicator.signal.toLowerCase().includes('weak') ? 'bg-red-500/20 text-red-300' : 'bg-slate-500/20 text-slate-300' }`}>
                                                {indicator.signal}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                             <div className="card p-6">
                                <h3 className="text-xl font-semibold mb-4"><i className="fas fa-chart-area mr-2 text-slate-400"></i>Price Chart (90 Days)</h3>
                                <div className="relative h-96"><canvas ref={chartRef}></canvas></div>
                             </div>
                        </div>
                    </div>
                )}
                
                <div id="market-overview" className="mt-12">
                     <h2 className="text-3xl font-bold text-center mb-8">Market Overview</h2>
                     <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                         <div className="card p-6">
                             <h3 className="text-xl font-semibold mb-4 text-green-400"><i className="fas fa-arrow-trend-up mr-2"></i>Top Gainers</h3>
                             <ul className="space-y-2">{marketOverview.topGainers.map((stock, i) => (<li key={i} className="flex justify-between text-slate-300"><span className="font-bold">{stock.symbol}</span><span>{stock.price} <span className="text-green-400">({stock.change})</span></span></li>))}</ul>
                         </div>
                         <div className="card p-6">
                             <h3 className="text-xl font-semibold mb-4 text-red-400"><i className="fas fa-arrow-trend-down mr-2"></i>Top Losers</h3>
                             <ul className="space-y-2">{marketOverview.topLosers.map((stock, i) => (<li key={i} className="flex justify-between text-slate-300"><span className="font-bold">{stock.symbol}</span><span>{stock.price} <span className="text-red-400">({stock.change})</span></span></li>))}</ul>
                         </div>
                         <div className="card p-6">
                             <h3 className="text-xl font-semibold mb-4 text-blue-400"><i className="fas fa-bolt mr-2"></i>Volume Spikes</h3>
                             <ul className="space-y-2">{marketOverview.volumeSpikes.map((stock, i) => (<li key={i} className="flex justify-between text-slate-300"><span className="font-bold">{stock.symbol}</span><span className="font-semibold text-blue-400">{stock.vol} volume</span></li>))}</ul>
                         </div>
                     </div>
                 </div>
            </main>

            {/* Chatbot */}
            <div className="fixed bottom-6 right-6 z-20">
                <button onClick={() => setIsChatOpen(!isChatOpen)} className="w-16 h-16 bg-blue-600 rounded-full text-white flex items-center justify-center shadow-lg hover:bg-blue-700 transition-transform transform hover:scale-110" aria-label="Toggle Chat">
                    <i className={`fas ${isChatOpen ? 'fa-times' : 'fa-comment-dots'} text-2xl`}></i>
                </button>
            </div>

            {isChatOpen && (
                <div className="fixed bottom-24 right-6 w-full max-w-md h-[70vh] max-h-[600px] bg-slate-800 border border-slate-600 rounded-lg shadow-2xl flex flex-col z-20">
                    <header className="p-4 bg-slate-900 border-b border-slate-600 flex justify-between items-center rounded-t-lg">
                        <h3 className="text-lg font-bold"><i className="fas fa-robot mr-2"></i>Stock Market Assistant</h3>
                        <button onClick={() => setIsChatOpen(false)} className="text-slate-400 hover:text-white">&times;</button>
                    </header>
                    <div ref={chatBodyRef} className="flex-1 p-4 overflow-y-auto space-y-4">
                        {chatHistory.map((msg, index) => (
                           <div key={index} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                               <div className={`max-w-xs md:max-w-md p-3 rounded-lg ${msg.role === 'user' ? 'chat-bubble-user' : 'chat-bubble-model'}`}>
                                   <p className="text-sm whitespace-pre-wrap">{msg.text}</p>
                               </div>
                           </div>
                        ))}
                        {isBotLoading && (
                            <div className="flex justify-start">
                                <div className="max-w-xs md:max-w-md p-3 rounded-lg chat-bubble-model">
                                    <div className="typing-indicator"><span></span><span></span><span></span></div>
                                </div>
                            </div>
                        )}
                    </div>
                    <form onSubmit={handleChatSubmit} className="p-4 bg-slate-900 border-t border-slate-600 rounded-b-lg">
                        <div className="flex items-center">
                            <input
                                type="text"
                                value={chatInput}
                                onChange={(e) => setChatInput(e.target.value)}
                                placeholder="Ask about a stock or concept..."
                                className="w-full px-4 py-2 rounded-md bg-slate-700 border border-slate-500 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                disabled={isBotLoading}
                                autoComplete="off"
                            />
                            <button type="submit" disabled={isBotLoading || !chatInput.trim()} className="ml-3 btn-primary p-2 rounded-full w-10 h-10 flex-shrink-0 disabled:bg-slate-500 disabled:cursor-not-allowed">
                                <i className="fas fa-paper-plane"></i>
                            </button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
};

const container = document.getElementById('root');
const root = createRoot(container);
root.render(<App />);