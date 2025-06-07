import React, { useState, useEffect, useRef } from 'react';

// Main App Component
function App() {
  // --- STATES ---
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [activeView, setActiveView] = useState('auth');
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const chatMessagesEndRef = useRef(null);

  // User auth states
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  const [loginError, setLoginError] = useState('');
  const [signupError, setSignupError] = useState('');
  const [isSigningUp, setIsSigningUp] = useState(false);

  // Account page state
  const [linkedAccounts, setLinkedAccounts] = useState([
    { id: '1', name: 'Nandini', email: 'nandueduka@gmail.com', status: 'active' },
    { id: '2', name: 'NANDINI N.', email: '1ms22is085@msrit.edu', status: 'signed out' },
  ]);

  // FinCompare Module states
  const [fileA, setFileA] = useState(null);
  const [fileB, setFileB] = useState(null);
  const [preference, setPreference] = useState('loan');
  const [comparisonResult, setComparisonResult] = useState(null);
  const [isComparing, setIsComparing] = useState(false);

  // Language Toggle state
  const [language, setLanguage] = useState('en'); // 'en' or 'kn'

  const handleLanguageToggle = () => {
    setLanguage((prevLang) => (prevLang === 'en' ? 'kn' : 'en'));
  };

  useEffect(() => {
    if (isLoggedIn) {
      setActiveView('chat');
    } else {
      setActiveView('auth');
    }
  }, [isLoggedIn]);

  useEffect(() => {
    chatMessagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);
  
  const getTimestamp = () => {
    const now = new Date();
    return now.toLocaleDateString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true
    });
  };

  // --- API HANDLER FOR THE CHAT ---
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!inputMessage.trim()) return;

    const currentInput = inputMessage;
    const userMsg = {
      id: crypto.randomUUID(),
      text: currentInput,
      sender: 'user',
      timestamp: getTimestamp(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputMessage('');
    setIsSending(true);

    try {
      const response = await fetch('http://127.0.0.1:8000/api/chat/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: username || "guest_user",
          message: currentInput,
          sender: "user",
        }),
      });

      if (!response.ok) {
        throw new Error(`API Error: ${response.statusText}`);
      }
      
      const botMsgData = await response.json();
      const botMsg = {
        id: botMsgData.id || crypto.randomUUID(),
        text: botMsgData.message,
        sender: 'bot',
        timestamp: getTimestamp(),
      };
      setMessages((prev) => [...prev, botMsg]);

    } catch (error) {
      console.error("Failed to send message:", error);
      const errorMsg = {
        id: crypto.randomUUID(),
        text: "Sorry, the backend server is not responding. Please make sure it's running.",
        sender: 'bot',
        timestamp: getTimestamp(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsSending(false);
    }
  };

  // --- API HANDLER FOR FinCompare MODULE ---
  const handleCompareSubmit = async () => {
    if (!fileA || !fileB) {
      alert("Please upload both Document A and Document B.");
      return;
    }
    setIsComparing(true);
    setComparisonResult(null);
    const formData = new FormData();
    formData.append('file1', fileA);
    formData.append('file2', fileB);
    formData.append('product_type', preference);

    try {
      const response = await fetch('http://127.0.0.1:8000/compare/', {
        method: 'POST',
        body: formData,
      });
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();
      setComparisonResult(data);
    } catch (error) {
      console.error("Error during document comparison:", error);
      setComparisonResult({ error: "Failed to compare documents. Is the backend server running?" });
    } finally {
      setIsComparing(false);
    }
  };

  // --- ORIGINAL HANDLERS ---
  const handleLogin = (e) => { e.preventDefault(); setLoginError(''); if (username === 'user' && password === 'password') { setIsLoggedIn(true); setActiveView('chat'); } else { setLoginError('Invalid username or password.'); } };
  const handleSignup = (e) => { e.preventDefault(); setSignupError(''); if (username && email && password) { console.log(`Attempting signup for: ${username}, ${email}`); setIsLoggedIn(true); setActiveView('chat'); } else { setSignupError('Please fill in all fields.'); } };
  const handleSignOut = () => { setIsLoggedIn(false); setUsername(''); setPassword(''); setEmail(''); setMessages([]); setActiveView('auth'); setIsSigningUp(false); };
  const handleLinkedAccountSignIn = (accountId) => { setLinkedAccounts(prevAccounts => prevAccounts.map(acc => acc.id === accountId ? { ...acc, status: 'active' } : acc)); };
  const handleLinkedAccountRemove = (accountId) => { setLinkedAccounts(prevAccounts => prevAccounts.filter(acc => acc.id !== accountId)); };
  const handleClearHistory = () => { setMessages([]); };
  const handleVoiceInput = () => { console.log('Simulating voice input...'); };

  // --- RENDER FUNCTION ---
  const renderContent = () => {
    if (!isLoggedIn) {
      return (
        <div className="flex flex-col items-center justify-center h-full p-6 bg-gray-100">
          <div className="bg-white p-8 rounded-xl shadow-lg w-full max-w-md border border-gray-200">
            <h2 className="text-3xl font-bold text-gray-800 mb-6 text-center">{isSigningUp ? 'Join Finease' : 'Welcome Back!'}</h2>
            {loginError && <p className="text-red-500 text-sm text-center mb-4">{loginError}</p>}
            {signupError && <p className="text-red-500 text-sm text-center mb-4">{signupError}</p>}
            {isSigningUp ? (
              <form onSubmit={handleSignup} className="space-y-4">
                <div><label htmlFor="signup-username" className="block text-gray-700 text-sm font-semibold mb-2">Username:</label><input type="text" id="signup-username" className="w-full p-3 border border-gray-300 rounded-lg" placeholder="Choose a username" value={username} onChange={(e) => setUsername(e.target.value)} required /></div>
                <div><label htmlFor="signup-email" className="block text-gray-700 text-sm font-semibold mb-2">Email:</label><input type="email" id="signup-email" className="w-full p-3 border border-gray-300 rounded-lg" placeholder="Enter your email" value={email} onChange={(e) => setEmail(e.target.value)} required /></div>
                <div><label htmlFor="signup-password" className="block text-gray-700 text-sm font-semibold mb-2">Password:</label><input type="password" id="signup-password" className="w-full p-3 border border-gray-300 rounded-lg" placeholder="Create a password" value={password} onChange={(e) => setPassword(e.target.value)} required /></div>
                <button type="submit" className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-4 rounded-lg">Sign Up</button>
              </form>
            ) : (
              <form onSubmit={handleLogin} className="space-y-4">
                <div><label htmlFor="username" className="block text-gray-700 text-sm font-semibold mb-2">Username/Email:</label><input type="text" id="username" className="w-full p-3 border border-gray-300 rounded-lg" placeholder="Enter your username or email" value={username} onChange={(e) => setUsername(e.target.value)} required /></div>
                <div><label htmlFor="password" className="block text-gray-700 text-sm font-semibold mb-2">Password:</label><input type="password" id="password" className="w-full p-3 border border-gray-300 rounded-lg" placeholder="Enter your password" value={password} onChange={(e) => setPassword(e.target.value)} required /></div>
                <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg">Login</button>
              </form>
            )}
            <p className="text-center text-gray-500 text-sm mt-6">{isSigningUp ? "Already have an account?" : "Don't have an account?"}{' '}<button type="button" className="text-blue-600 hover:underline" onClick={() => { setIsSigningUp(!isSigningUp); setLoginError(''); setSignupError(''); setUsername(''); setPassword(''); setEmail(''); }}>{isSigningUp ? 'Log In' : 'Sign Up'}</button></p>
            {!isSigningUp && (<p className="text-center text-gray-500 text-sm mt-2">Hint: Use username "user" and password "password" to log in.</p>)}
          </div>
        </div>
      );
    }

    switch (activeView) {
      case 'compare':
        return (
          <div className="p-6 bg-white rounded-lg shadow-inner h-full overflow-y-auto">
            <h2 className="text-3xl font-bold text-gray-800 mb-6">{language === 'en' ? 'Compare Financial Documents' : 'ಹಣಕಾಸು ದಾಖಲೆಗಳನ್ನು ಹೋಲಿಕೆ ಮಾಡಿ'}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div><label className="block text-gray-700 text-sm font-semibold mb-2">{language === 'en' ? 'Document A' : 'ಡಾಕ್ಯುಮೆಂಟ್ ಎ'}</label><input type="file" onChange={(e) => setFileA(e.target.files[0])} className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"/></div>
              <div><label className="block text-gray-700 text-sm font-semibold mb-2">{language === 'en' ? 'Document B' : 'ಡಾಕ್ಯುಮೆಂಟ್ ಬಿ'}</label><input type="file" onChange={(e) => setFileB(e.target.files[0])} className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-green-50 file:text-green-700 hover:file:bg-green-100"/></div>
            </div>
            <div className="mb-6"><label htmlFor="product_type" className="block text-gray-700 text-sm font-semibold mb-2">{language === 'en' ? 'Select Product Type:' : 'ಉತ್ಪನ್ನದ ಪ್ರಕಾರವನ್ನು ಆಯ್ಕೆಮಾಡಿ:'}</label><select id="product_type" value={preference} onChange={(e) => setPreference(e.target.value)} className="w-full p-3 border border-gray-300 rounded-lg"><option value="loan">{language === 'en' ? 'Loan' : 'ಸಾಲ'}</option><option value="fd">{language === 'en' ? 'Fixed Deposit (FD)' : 'ಸ್ಥಿರ ಠೇವಣಿ (ಎಫ್‌ಡಿ)'}</option></select></div>
            <button onClick={handleCompareSubmit} disabled={isComparing} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg shadow-md transition duration-200 disabled:bg-gray-400">{isComparing ? (language === 'en' ? 'Comparing...' : 'ಹೋಲಿಸಲಾಗುತ್ತಿದೆ...') : (language === 'en' ? 'Compare Documents' : 'ದಾಖಲೆಗಳನ್ನು ಹೋಲಿಕೆ ಮಾಡಿ')}</button>
            {comparisonResult && (<div className="mt-8 p-4 bg-gray-50 rounded-lg border"><h3 className="text-xl font-bold mb-4">{language === 'en' ? 'Comparison Result' : 'ಹೋಲಿಕೆ ಫಲಿತಾಂಶ'}</h3><pre className="bg-gray-900 text-white p-4 rounded-md overflow-x-auto"><code>{JSON.stringify(comparisonResult, null, 2)}</code></pre></div>)}
          </div>
        );
      case 'history':
        return (
            <div className="flex flex-col items-center justify-start h-full p-6 text-gray-700 bg-white rounded-lg shadow-inner overflow-y-auto">
              <h2 className="text-3xl font-bold text-gray-800 mb-6 mt-4">{language === 'en' ? 'Your Chat History' : 'ನಿಮ್ಮ ಚಾಟ್ ಇತಿಹಾಸ'}</h2>
              <div className="w-full max-w-3xl bg-gray-50 p-6 rounded-xl shadow-md border border-gray-200 mb-4">
                <div className="flex justify-end items-center mb-4">
                  <button className="bg-red-500 hover:bg-red-600 text-white py-2 px-4 rounded-lg shadow transition duration-200 ease-in-out" onClick={handleClearHistory}>{language === 'en' ? 'Clear History' : 'ಇತಿಹಾಸ ಅಳಿಸಿ'}</button>
                </div>
                {messages.length === 0 ? (<p className="text-lg text-gray-500 text-center py-8">{language === 'en' ? 'No chat history available. Start a conversation!' : 'ಚಾಟ್ ಇತಿಹಾಸ ಲಭ್ಯವಿಲ್ಲ. ಸಂಭಾಷಣೆ ಪ್ರಾರಂಭಿಸಿ!'}</p>) : (
                  <div className="overflow-y-auto max-h-[calc(100vh-300px)] custom-scrollbar">
                    <div className="mb-6"><p className="text-md font-semibold text-gray-700 mb-2">{language === 'en' ? 'Today' : 'ಇಂದು'}</p>{messages.filter(msg => new Date(msg.timestamp).toDateString() === new Date().toDateString()).map((msg) => (<div key={msg.id} className={`mb-4 last:mb-0 ${msg.sender === 'user' ? 'text-right' : 'text-left'}`}><div className={`inline-block p-3 rounded-lg max-w-[80%] ${msg.sender === 'user' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'}`}><p className="text-sm font-medium mb-1">{msg.text}</p><span className="text-xs text-gray-500">{new Date(msg.timestamp).toLocaleTimeString()}</span></div></div>))}</div>
                  </div>
                )}
              </div>
            </div>
          );
      case 'account':
        return (
          <div className="flex flex-col items-center justify-start h-full p-6 text-gray-700 bg-gray-100 rounded-lg shadow-inner overflow-y-auto">
            <div className="bg-white p-8 rounded-xl shadow-lg w-full max-w-md border border-gray-200">
              <div className="flex items-center space-x-4 pb-6 border-b border-gray-200 mb-6">
                <div className="w-16 h-16 rounded-full bg-blue-500 flex items-center justify-center text-white text-3xl font-bold">F</div>
                <div>
                  <h3 className="text-xl font-semibold text-gray-800">{language === 'en' ? 'Hi, Finease User!' : 'ನಮಸ್ಕಾರ, ಫಿನೀಸ್ ಬಳಕೆದಾರರೇ!'}</h3>
                  <p className="text-gray-600">finease.user@example.com</p>
                  <button className="mt-2 text-blue-600 hover:underline text-sm" onClick={() => console.log('Simulating account management...')}>{language === 'en' ? 'Manage your Finease Account' : 'ನಿಮ್ಮ ಫಿನೀಸ್ ಖಾತೆಯನ್ನು ನಿರ್ವಹಿಸಿ'}</button>
                </div>
              </div>
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">{language === 'en' ? 'Other Accounts' : 'ಇತರ ಖಾತೆಗಳು'}</h3>
                <div className="space-y-4">
                  {linkedAccounts.map(account => (<div key={account.id} className="flex items-center justify-between p-3 bg-gray-100 rounded-lg border border-gray-200"><div className="flex items-center space-x-3"><div className="w-10 h-10 rounded-full bg-purple-500 flex items-center justify-center text-white font-bold text-lg">{account.name.charAt(0)}</div><div><p className="font-medium text-gray-800">{account.name}</p><p className="text-sm text-gray-600">{account.email}</p></div></div><div className="flex space-x-2">{account.status === 'signed out' ? (<button className="bg-blue-500 hover:bg-blue-600 text-white text-sm py-1 px-3 rounded-lg" onClick={() => handleLinkedAccountSignIn(account.id)}>{language === 'en' ? 'Sign in' : 'ಸೈನ್ ಇನ್ ಮಾಡಿ'}</button>) : (<span className="text-green-600 text-sm font-semibold">{language === 'en' ? 'Active' : 'ಸಕ್ರಿಯ'}</span>)}<button className="bg-red-500 hover:bg-red-600 text-white text-sm py-1 px-3 rounded-lg" onClick={() => handleLinkedAccountRemove(account.id)}>{language === 'en' ? 'Remove' : 'ತೆಗೆದುಹಾಕಿ'}</button></div></div>))}
                </div>
              </div>
              <div className="space-y-3 pt-6 border-t border-gray-200">
                <button className="w-full flex items-center justify-center bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-3 px-4 rounded-lg"><i className="fas fa-plus mr-2"></i> {language === 'en' ? 'Add another account' : 'ಇನ್ನೊಂದು ಖಾತೆ ಸೇರಿಸಿ'}</button>
                <button className="w-full flex items-center justify-center bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-3 px-4 rounded-lg" onClick={() => handleSignOut()}><i className="fas fa-sign-out-alt mr-2"></i> {language === 'en' ? 'Sign out of all accounts' : 'ಎಲ್ಲಾ ಖಾತೆಗಳಿಂದ ಸೈನ್ ಔಟ್ ಮಾಡಿ'}</button>
              </div>
            </div>
          </div>
        );
      case 'chat':
      default:
        return (
          <div className="flex flex-col h-full bg-gray-50">
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {messages.length === 0 && (
                <div className="text-center text-gray-500 mt-20">
                  <p className="text-3xl font-bold mb-4 text-gray-700">{language === 'en' ? 'Welcome to Finease!' : 'ಫಿನೀಸ್‌ಗೆ ಸುಸ್ವಾಗತ!'}</p>
                  <p className="text-lg text-gray-600">{language === 'en' ? 'Your AI financial assistant. How can I help you today?' : 'ನಿಮ್ಮ AI ಆರ್ಥಿಕ ಸಹಾಯಕ. ಇಂದು ನಾನು ನಿಮಗೆ ಹೇಗೆ ಸಹಾಯ ಮಾಡಬಹುದು?'}</p>
                </div>
              )}
              {messages.map((msg) => (
                <div key={msg.id} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-2xl p-4 rounded-xl shadow-md ${ msg.sender === 'user' ? 'bg-blue-600 text-white rounded-br-none' : 'bg-gray-200 text-gray-800 rounded-bl-none' }`}>
                    {msg.text}
                  </div>
                </div>
              ))}
              <div ref={chatMessagesEndRef} />
            </div>
            <form onSubmit={handleSendMessage} className="p-4 bg-white border-t border-gray-200 shadow-lg">
              <div className="flex items-center space-x-4 max-w-3xl mx-auto">
                <input type="text" value={inputMessage} onChange={(e) => setInputMessage(e.target.value)} className="flex-1 p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder={language === 'en' ? 'Ask a financial question...' : 'ಆರ್ಥಿಕ ಪ್ರಶ್ನೆಯನ್ನು ಕೇಳಿ...'} disabled={isSending} />
                <button type="button" onClick={handleVoiceInput} className="bg-purple-600 hover:bg-purple-700 text-white p-3 rounded-lg shadow-md" title="Voice Input" disabled={isSending}><i className="fas fa-microphone text-xl"></i></button>
                <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-lg shadow-md disabled:bg-gray-400" disabled={isSending || !inputMessage.trim()}>
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l.649-.186.936-2.807a1 1 0 00-.186-1.019l-.353-.353A1 1 0 019 11.414V15a1 1 0 001 1h.01a1 1 0 001-1v-3.586a1 1 0 01.293-.707l.353-.353a1 1 0 001.169-1.409l-7-14z"></path></svg>
                </button>
              </div>
            </form>
          </div>
        );
    }
  };

  return (
    <div className="flex h-screen bg-gray-900 font-inter overflow-hidden">
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
      <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.3/css/all.min.css" />
      <div className="w-64 bg-gray-900 text-white flex flex-col shadow-2xl rounded-r-xl">
        <div className="p-6 text-3xl font-extrabold text-center text-blue-400 border-b border-gray-700">Finease</div>
        <nav className="flex-1 p-4 space-y-3">
          {isLoggedIn && (
            <>
              <button className="w-full text-left py-3 px-4 rounded-lg flex items-center bg-gray-700 hover:bg-gray-600 text-white" onClick={() => { setMessages([]); setActiveView('chat'); }}><i className="fas fa-plus text-xl mr-3"></i> <span className="text-lg">{language === 'en' ? 'New chat' : 'ಹೊಸ ಚಾಟ್'}</span></button>
              
              <button
                onClick={handleLanguageToggle}
                className="w-full text-left py-2 px-4 rounded-lg flex items-center justify-center font-semibold text-lg bg-gray-600 hover:bg-gray-500 text-white my-2"
              >
                <i className="fas fa-language text-xl mr-2"></i>
                {language === 'en' ? 'ಕನ್ನಡ' : 'English'}
              </button>

              <button className={`w-full text-left py-3 px-4 rounded-lg flex items-center transition-colors ${activeView === 'chat' ? 'bg-blue-700 text-white' : 'hover:bg-gray-700 text-gray-300'}`} onClick={() => setActiveView('chat')}><i className="fas fa-comment-dots text-xl mr-3"></i> <span className="text-lg">{language === 'en' ? 'Chat' : 'ಚಾಟ್'}</span></button>
              <button className={`w-full text-left py-3 px-4 rounded-lg flex items-center transition-colors ${activeView === 'compare' ? 'bg-blue-700 text-white' : 'hover:bg-gray-700 text-gray-300'}`} onClick={() => setActiveView('compare')}><i className="fas fa-balance-scale-right text-xl mr-3"></i> <span className="text-lg">{language === 'en' ? 'Compare' : 'ಹೋಲಿಕೆ'}</span></button>
              <button className={`w-full text-left py-3 px-4 rounded-lg flex items-center transition-colors ${activeView === 'history' ? 'bg-blue-700 text-white' : 'hover:bg-gray-700 text-gray-300'}`} onClick={() => setActiveView('history')}><i className="fas fa-history text-xl mr-3"></i> <span className="text-lg">{language === 'en' ? 'History' : 'ಇತಿಹಾಸ'}</span></button>
              <button className={`w-full text-left py-3 px-4 rounded-lg flex items-center transition-colors hover:bg-gray-700 text-gray-300`} onClick={() => setActiveView('account')}><i className="fas fa-user-circle text-xl mr-3"></i> <span className="text-lg">{language === 'en' ? 'Account' : 'ಖಾತೆ'}</span></button>
            </>
          )}
        </nav>
        <div className="p-4 border-t border-gray-700">
          <button className={`w-full text-left py-3 px-4 rounded-lg flex items-center justify-center font-semibold text-lg ${isLoggedIn ? 'bg-red-700 hover:bg-red-800' : 'bg-green-700 hover:bg-green-800'} text-white`} onClick={isLoggedIn ? handleSignOut : () => setActiveView('auth')}>
            <i className={`fas ${isLoggedIn ? 'fa-sign-out-alt' : 'fa-sign-in-alt'} mr-3`}></i>{isLoggedIn ? (language === 'en' ? 'Sign Out' : 'ಸೈನ್ ಔಟ್') : (language === 'en' ? 'Login' : 'ಲಾಗಿನ್')}
          </button>
        </div>
      </div>
      <div className="flex-1 flex flex-col bg-gray-100 rounded-l-xl overflow-hidden">{renderContent()}</div>
    </div>
  );
}

export default App;
