import React, { useState, useEffect, useRef } from 'react';

// Main App Component
function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false); // State for login status
  // activeView controls which main content section is currently displayed: 'chat', 'history', 'account', or 'auth' (for login/signup).
  const [activeView, setActiveView] = useState('auth'); // Default to 'auth' view if not logged in
  const [messages, setMessages] = useState([]); // State to store chat messages
  const [inputMessage, setInputMessage] = useState(''); // State for the chat input field
  const [username, setUsername] = useState(''); // State for login/signup username
  const [password, setPassword] = useState(''); // State for login/signup password
  const [email, setEmail] = useState(''); // State for signup email
  const [loginError, setLoginError] = useState(''); // State for login error messages
  const [signupError, setSignupError] = useState(''); // State for signup error messages
  const [isSigningUp, setIsSigningUp] = useState(false); // State to toggle between login and signup forms
  const chatMessagesEndRef = useRef(null); // Ref for scrolling to the bottom of chat

  // New states for Gemini API integration and upload handling
  const [selectedFiles, setSelectedFiles] = useState([]); // Changed to an array for multiple files
  const [isGettingAdvice, setIsGettingAdvice] = useState(false); // Loading state for financial advice
  const [isSendingMessage, setIsSendingMessage] = useState(false); // Loading state for sending general messages
  const [isAutoExplaining, setIsAutoExplaining] = useState(false); // New loading state for automatic explanation

  // Removed messageIdCounter state as crypto.randomUUID() will be used for keys


  // Dummy user accounts for the account management view
  const [linkedAccounts, setLinkedAccounts] = useState([
    { id: '1', name: 'Nandini', email: 'nandueduka@gmail.com', status: 'active' },
    { id: '2', name: 'NANDINI N.', email: '1ms22is085@msrit.edu', status: 'signed out' },
  ]);

  // Scroll to the latest message whenever messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Set initial view based on login status
  useEffect(() => {
    if (isLoggedIn) {
      setActiveView('chat'); // Go to chat if already logged in
    } else {
      setActiveView('auth'); // Go to auth (login/signup) if not logged in
    }
  }, [isLoggedIn]);

  const scrollToBottom = () => {
    chatMessagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Helper function to get a formatted timestamp
  const getTimestamp = () => {
    const now = new Date();
    return now.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });
  };

  // --- Gemini API Call Function ---
  const callGeminiAPI = async (prompt) => {
    const apiKey = ""; // Canvas will automatically provide the API key at runtime
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

    try {
      let chatHistory = [];
      chatHistory.push({ role: "user", parts: [{ text: prompt }] });
      const payload = { contents: chatHistory };

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const result = await response.json();
      if (result.candidates && result.candidates.length > 0 &&
          result.candidates[0].content && result.candidates[0].content.parts &&
          result.candidates[0].content.parts.length > 0) {
        return result.candidates[0].content.parts[0].text;
      } else {
        console.error("Unexpected Gemini API response structure:", result);
        return "No response from AI.";
      }
    } catch (error) {
      console.error("Error calling Gemini API:", error);
      return `Failed to get AI response: ${error.message}`;
    }
  };

  // --- Handlers for Gemini API Features ---

  const handleGetFinancialAdvice = async (userMessage) => {
    setIsGettingAdvice(true);
    const prompt = `Based on the following query, provide financial advice or insights. If the query is not financial, politely state that you can only provide financial advice. Query: "${userMessage}"`;

    // Generate a unique ID for the advice message using crypto.randomUUID()
    const adviceMessageId = crypto.randomUUID();

    setMessages((prevMessages) => [
      ...prevMessages,
      { id: adviceMessageId, text: "Finease is generating financial advice...", sender: 'ai', timestamp: getTimestamp(), isTyping: true },
    ]);

    try {
      const advice = await callGeminiAPI(prompt);
      // Update the temporary AI message with the actual advice
      setMessages((prevMessages) =>
        prevMessages.map((msg) =>
          msg.id === adviceMessageId ? { ...msg, text: advice, isTyping: false } : msg
        )
      );
    } catch (error) {
      setMessages((prevMessages) =>
        prevMessages.map((msg) =>
          msg.id === adviceMessageId ? { ...msg, text: `Error getting advice: ${error.message}`, isTyping: false } : msg
        )
      );
    } finally {
      setIsGettingAdvice(false);
    }
  };


  // Handle sending a message (now combines input and staged files)
  const handleSendMessage = async (e) => {
    e.preventDefault();

    const hasInputMessage = inputMessage.trim() !== '';
    const hasSelectedFiles = selectedFiles.length > 0;

    if (!hasInputMessage && !hasSelectedFiles) {
      return; // Nothing to send
    }

    setIsSendingMessage(true); // Indicate that a message is being sent
    let promptToSend = '';
    const currentUserMessage = inputMessage; // Capture current input message for user display

    let combinedFileContent = '';
    if (hasSelectedFiles) {
      combinedFileContent = selectedFiles.map(file => file.simulatedContent).join('\n\n--- End of Document ---\n\n');
    }

    // Determine if it's a word explanation request
    let isWordExplanationRequest = false;
    let termToExplain = '';
    const explainKeywords = ['explain', 'what is', 'define'];
    const lowerCaseUserMsg = currentUserMessage.toLowerCase();

    for (const keyword of explainKeywords) {
        if (lowerCaseUserMsg.startsWith(keyword + ' ')) {
            termToExplain = currentUserMessage.substring(keyword.length).trim();
            isWordExplanationRequest = true;
            break;
        } else if (lowerCaseUserMsg.includes(` ${keyword} `)) {
            const parts = lowerCaseUserMsg.split(new RegExp(`\\s${keyword}\\s`));
            if (parts.length > 1) {
                termToExplain = parts[1].trim();
                isWordExplanationRequest = true;
                break;
            }
        }
    }

    // Add user message to chat here with unique ID
    const userMessageId = crypto.randomUUID();
    setMessages((prevMessages) => [
      ...prevMessages,
      { id: userMessageId, text: currentUserMessage, sender: 'user', timestamp: getTimestamp() },
    ]);
    
    setInputMessage(''); // Clear input immediately after capturing it

    // Construct the prompt based on available data
    if (hasSelectedFiles) {
      if (isWordExplanationRequest && termToExplain) {
        promptToSend = `Explain the term "${termToExplain}" as it is used or implied in the following document content:\n\n"${combinedFileContent}"\n\nIf the term is not directly in the document, explain it generally in a financial context. Keep the explanation concise.`;
      } else if (hasInputMessage) {
        // User provided a query and files
        promptToSend = `Given the following document content:\n\n"${combinedFileContent}"\n\nAnd the user's question: "${currentUserMessage}"\n\nPlease provide a relevant response.`;
      } else {
        // Only files were staged, user clicked send without typing (auto-explain)
        promptToSend = `Provide a brief overview of the key information contained in the following combined document content: "${combinedFileContent}"`;
        setIsAutoExplaining(true);
      }
    } else {
      // No files, just user message (regular chat)
      promptToSend = `Provide financial advice or insights based on this query: "${currentUserMessage}". If the query is not financial, politely state that you can only provide financial advice.`;
    }

    // Add a temporary AI message with a typing indicator
    const aiResponseId = crypto.randomUUID(); // Use crypto.randomUUID() for unique ID
    setMessages((prevMessages) => [
      ...prevMessages,
      { id: aiResponseId, text: "Finease is thinking...", sender: 'ai', timestamp: getTimestamp(), isTyping: true },
    ]);

    try {
      const aiResponse = await callGeminiAPI(promptToSend);
      setMessages((prevMessages) => {
        const newMessages = [...prevMessages];
        const aiMessageIndex = newMessages.findIndex(msg => msg.id === aiResponseId);
        if (aiMessageIndex !== -1) {
          newMessages[aiMessageIndex] = {
            ...newMessages[aiMessageIndex],
            text: aiResponse,
            isTyping: false,
            hasAdviceButton: hasInputMessage && !isWordExplanationRequest,
            userQueryForAdvice: currentUserMessage,
            isWordExplanation: isWordExplanationRequest
          };
        }
        return newMessages;
      });
    } catch (error) {
      setMessages((prevMessages) => {
        const newMessages = [...prevMessages];
        const aiMessageIndex = newMessages.findIndex(msg => msg.id === aiResponseId);
        if (aiMessageIndex !== -1) {
          newMessages[aiMessageIndex] = { ...newMessages[aiMessageIndex], text: `Error: ${error.message}`, isTyping: false };
        }
        return newMessages;
      });
    } finally {
      setIsSendingMessage(false);
      setIsAutoExplaining(false); // Reset auto-explaining state
      setSelectedFiles([]); // Clear selected files after they have been processed by send button
    }
  };

  // Handle file upload (only stages files, does not trigger AI immediately)
  const handleFileUpload = async (event) => {
    const files = Array.from(event.target.files);
    if (files.length > 0) {
      const newSelectedFiles = [];
      const uploadedFileNames = [];
      let combinedSimulatedContent = '';

      for (const file of files) {
        const fileExtension = file.name.split('.').pop().toUpperCase();
        // Simulate file content. In a real app, you'd extract text from file here.
        // For images, this would involve an OCR library to get text from images.
        const simulatedContent = `This is a comprehensive financial report for the fiscal year 2023. Key highlights include a 15% increase in revenue driven by strong performance in the tech sector, and a 10% growth in net profit. The investment portfolio saw a 8% return, with significant gains in renewable energy stocks. Future projections indicate continued expansion into emerging markets and a focus on sustainable investments. Risk factors include market volatility and geopolitical uncertainties. The report also details executive compensation and corporate social responsibility initiatives.`;

        newSelectedFiles.push({
          name: file.name,
          type: fileExtension,
          simulatedContent: simulatedContent,
        });
        uploadedFileNames.push(file.name);
        combinedSimulatedContent += simulatedContent + '\n\n'; // Combine content
      }

      setSelectedFiles(newSelectedFiles); // Stage the files

      // Add a single AI message that acts as the combined file card, informing user about staged files
      const fileCardMessageId = crypto.randomUUID(); // Use crypto.randomUUID() for unique ID

      setMessages((prevMessages) => [
        ...prevMessages,
        {
          id: fileCardMessageId,
          sender: 'ai', // This is still considered an 'ai' message as it's system feedback
          timestamp: getTimestamp(),
          type: 'file_attachment', // Custom type for file display
          fileDetails: {
            names: uploadedFileNames, // Store all names
            types: newSelectedFiles.map(f => f.type), // Store all types
            simulatedContent: combinedSimulatedContent, // Store combined content
          },
          text: `Files uploaded: ${uploadedFileNames.join(', ')}. Type your question and click send.`,
        },
      ]);

      event.target.value = null; // Clear the file input so same file can be uploaded again
    }
  };

  // Function to clear all selected files and input message
  const clearSelectedFiles = () => {
    setSelectedFiles([]);
    setInputMessage(''); // Also clear the input message when clearing files
  };

  // Handle simulated login
  const handleLogin = (e) => {
    e.preventDefault();
    setLoginError(''); // Clear previous errors
    // Simulate a login attempt
    if (username === 'user' && password === 'password') { // Simple hardcoded credentials
      setIsLoggedIn(true);
      setActiveView('chat'); // Redirect to chat after successful login
      setMessages([]); // Clear messages for a fresh start
    } else {
      setLoginError('Invalid username or password.');
    }
  };

  // Handle simulated signup
  const handleSignup = (e) => {
    e.preventDefault();
    setSignupError(''); // Clear previous errors
    // Simulate a signup attempt
    if (username && email && password) { // Basic validation
      // In a real app, you'd send these to a backend to create a new user
      console.log(`Attempting signup for: ${username}, ${email}`);
      setIsLoggedIn(true);
      setActiveView('chat'); // Redirect to chat after successful signup
      setMessages([]); // Clear messages for a fresh start
    } else {
      setSignupError('Please fill in all fields.');
    }
  };

  // Handle sign out
  const handleSignOut = () => {
    setIsLoggedIn(false);
    setUsername('');
    setPassword('');
    setEmail(''); // Clear email on sign out
    setMessages([]); // Clear messages on sign out
    setActiveView('auth'); // Redirect to auth page (login/signup)
    setIsSigningUp(false); // Ensure it defaults to login view
  };

  // Handle voice input simulation (integrated into the chat input area)
  const handleVoiceInput = () => {
    // In a real application, this would initiate speech recognition.
    console.log('Simulating voice input... This would typically show a listening indicator and process speech.');
  };

  // Handle clearing chat history (simulated)
  const handleClearHistory = () => {
    // Replaced window.confirm with a console log and direct action.
    console.log("User confirmed clearing chat history.");
    setMessages([]);
    console.log("Chat history cleared!");
  };

  // Handle simulated sign in for a linked account
  const handleLinkedAccountSignIn = (accountId) => {
    setLinkedAccounts(prevAccounts =>
      prevAccounts.map(acc => acc.id === accountId ? { ...acc, status: 'active' } : acc)
    );
    console.log(`Simulating sign in for account ID: ${accountId}`);
  };

  // Handle simulated remove for a linked account
  const handleLinkedAccountRemove = (accountId) => {
    // Replaced window.confirm with a console log and direct action.
    console.log(`User confirmed removal of account ID: ${accountId}`);
    setLinkedAccounts(prevAccounts => prevAccounts.filter(acc => acc.id !== accountId));
    console.log(`Simulating removal of account ID: ${accountId}`);
  };

  // This function conditionally renders the active view based on the 'activeView' state.
  // Only the selected view's content is displayed, effectively "hiding" the others.
  const renderContent = () => {
    if (!isLoggedIn) {
      return (
        <div className="flex flex-col items-center justify-center h-full p-6 bg-gray-100">
          <div className="bg-white p-8 rounded-xl shadow-lg w-full max-w-md border border-gray-200">
            <h2 className="text-3xl font-bold text-gray-800 mb-6 text-center">
              {isSigningUp ? 'Join Finease' : 'Welcome Back!'}
            </h2>
            {loginError && <p className="text-red-500 text-sm text-center mb-4">{loginError}</p>}
            {signupError && <p className="text-red-500 text-sm text-center mb-4">{signupError}</p>}

            {isSigningUp ? (
              // Signup Form
              <form onSubmit={handleSignup} className="space-y-4">
                <div>
                  <label htmlFor="signup-username" className="block text-gray-700 text-sm font-semibold mb-2">Username:</label>
                  <input
                    type="text"
                    id="signup-username"
                    className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-inter"
                    placeholder="Choose a username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label htmlFor="signup-email" className="block text-gray-700 text-sm font-semibold mb-2">Email:</label>
                  <input
                    type="email"
                    id="signup-email"
                    className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-inter"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label htmlFor="signup-password" className="block text-gray-700 text-sm font-semibold mb-2">Password:</label>
                  <input
                    type="password"
                    id="signup-password"
                    className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-inter"
                    placeholder="Create a password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
                <button
                  type="submit"
                  className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-4 rounded-lg shadow-md transition duration-200 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-green-400 focus:ring-opacity-75"
                >
                  Sign Up
                </button>
              </form>
            ) : (
              // Login Form
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label htmlFor="username" className="block text-gray-700 text-sm font-semibold mb-2">Username/Email:</label>
                  <input
                    type="text"
                    id="username"
                    className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-inter"
                    placeholder="Enter your username or email"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label htmlFor="password" className="block text-gray-700 text-sm font-semibold mb-2">Password:</label>
                  <input
                    type="password"
                    id="password"
                    className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-inter"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
                <button
                  type="submit"
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg shadow-md transition duration-200 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-opacity-75"
                >
                  Login
                </button>
              </form>
            )}

            <p className="text-center text-gray-500 text-sm mt-6">
              {isSigningUp ? "Already have an account?" : "Don't have an account?"}{' '}
              <button
                type="button" // Important: use type="button" to prevent form submission
                className="text-blue-600 hover:underline"
                onClick={() => {
                  setIsSigningUp(!isSigningUp);
                  setLoginError(''); // Clear errors when switching view
                  setSignupError('');
                  setUsername('');
                  setPassword('');
                  setEmail('');
                }}
              >
                {isSigningUp ? 'Log In' : 'Sign Up'}
              </button>
            </p>
            {!isSigningUp && (
              <p className="text-center text-gray-500 text-sm mt-2">
                Hint: Use username "user" and password "password" to log in.
              </p>
            )}
          </div>
        </div>
      );
    }

    // Render content based on activeView only if logged in
    switch (activeView) {
      case 'history':
        return (
          <div className="flex flex-col items-center justify-start h-full p-6 text-gray-700 bg-white rounded-lg shadow-inner overflow-y-auto">
            <h2 className="text-3xl font-bold text-gray-800 mb-6 mt-4">Your Chat History</h2>
            <div className="w-full max-w-3xl bg-gray-50 p-6 rounded-xl shadow-md border border-gray-200 mb-4">
              <div className="flex justify-end items-center mb-4"> {/* Changed to justify-end */}
                {/* Removed search input field */}
                <button
                  className="bg-red-500 hover:bg-red-600 text-white py-2 px-4 rounded-lg shadow transition duration-200 ease-in-out"
                  onClick={handleClearHistory}
                >
                  Clear History
                </button>
              </div>
              {messages.length === 0 ? (
                <p className="text-lg text-gray-500 text-center py-8">No chat history available. Start a conversation!</p>
              ) : (
                <div className="overflow-y-auto max-h-[calc(100vh-300px)] custom-scrollbar"> {/* Added custom-scrollbar class */}
                  {/* Chat History Grouping */}
                  <div className="mb-6">
                    <p className="text-md font-semibold text-gray-700 mb-2">Today</p>
                    {messages.filter(msg => new Date(msg.timestamp).toDateString() === new Date().toDateString()).map((msg) => (
                      <div key={msg.id} className={`mb-4 last:mb-0 ${msg.sender === 'user' ? 'text-right' : 'text-left'}`}>
                        <div className={`inline-block p-3 rounded-lg max-w-[80%] ${msg.sender === 'user' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'}`}>
                          <p className="text-sm font-medium mb-1">{msg.text}</p>
                          <span className="text-xs text-gray-500">{msg.timestamp}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mb-6">
                    <p className="text-md font-semibold text-gray-700 mb-2">Previous 7 Days</p>
                    {/* Filter for messages within last 7 days but not today */}
                    {messages.filter(msg => {
                      const msgDate = new Date(msg.timestamp);
                      const today = new Date();
                      const sevenDaysAgo = new Date();
                      sevenDaysAgo.setDate(today.getDate() - 7);
                      return msgDate >= sevenDaysAgo && msgDate < today;
                    }).map((msg) => (
                      <div key={msg.id} className={`mb-4 last:mb-0 ${msg.sender === 'user' ? 'text-right' : 'text-left'}`}>
                        <div className={`inline-block p-3 rounded-lg max-w-[80%] ${msg.sender === 'user' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'}`}>
                          <p className="text-sm font-medium mb-1">{msg.text}</p>
                          <span className="text-xs text-gray-500">{msg.timestamp}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mb-6">
                    <p className="text-md font-semibold text-gray-700 mb-2">Previous 30 Days</p>
                    {/* Filter for messages within last 30 days but not last 7 days */}
                    {messages.filter(msg => {
                      const msgDate = new Date(msg.timestamp);
                      const sevenDaysAgo = new Date();
                      sevenDaysAgo.setDate(new Date().getDate() - 7);
                      const thirtyDaysAgo = new Date();
                      thirtyDaysAgo.setDate(new Date().getDate() - 30);
                      return msgDate >= thirtyDaysAgo && msgDate < sevenDaysAgo;
                    }).map((msg) => (
                      <div key={msg.id} className={`mb-4 last:mb-0 ${msg.sender === 'user' ? 'text-right' : 'text-left'}`}>
                        <div className={`inline-block p-3 rounded-lg max-w-[80%] ${msg.sender === 'user' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'}`}>
                          <p className="text-sm font-medium mb-1">{msg.text}</p>
                          <span className="text-xs text-gray-500">{msg.timestamp}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      case 'account':
        return (
          <div className="flex flex-col items-center justify-start h-full p-6 text-gray-700 bg-gray-100 rounded-lg shadow-inner overflow-y-auto">
            <div className="bg-white p-8 rounded-xl shadow-lg w-full max-w-md border border-gray-200">
              {/* Top section: Current User */}
              <div className="flex items-center space-x-4 pb-6 border-b border-gray-200 mb-6">
                <div className="w-16 h-16 rounded-full bg-blue-500 flex items-center justify-center text-white text-3xl font-bold">
                  F
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-gray-800">Hi, Finease User!</h3>
                  <p className="text-gray-600">finease.user@example.com</p>
                  <button
                    className="mt-2 text-blue-600 hover:underline text-sm"
                    onClick={() => console.log('Simulating Google Account management page...')}
                  >
                    Manage your Finease Account
                  </button>
                </div>
              </div>

              {/* Other accounts section */}
              <div className="mb-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold text-gray-800">Other Accounts</h3>
                  {/* Placeholder for expand/collapse icon */}
                  <i className="fas fa-chevron-up text-gray-500 cursor-pointer"></i>
                </div>
                <div className="space-y-4">
                  {linkedAccounts.map(account => (
                    <div key={account.id} className="flex items-center justify-between p-3 bg-gray-100 rounded-lg border border-gray-200">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 rounded-full bg-purple-500 flex items-center justify-center text-white font-bold text-lg">
                          {account.name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-medium text-gray-800">{account.name}</p>
                          <p className="text-sm text-gray-600">{account.email}</p>
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        {account.status === 'signed out' ? (
                          <button
                            className="bg-blue-500 hover:bg-blue-600 text-white text-sm py-1 px-3 rounded-lg transition duration-200"
                            onClick={() => handleLinkedAccountSignIn(account.id)}
                          >
                            Sign in
                          </button>
                        ) : (
                          <span className="text-green-600 text-sm font-semibold">Active</span>
                        )}
                        <button
                          className="bg-red-500 hover:bg-red-600 text-white text-sm py-1 px-3 rounded-lg transition duration-200"
                          onClick={() => handleLinkedAccountRemove(account.id)}
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Add another account / Sign out of all accounts */}
              <div className="space-y-3 pt-6 border-t border-gray-200">
                <button
                  className="w-full flex items-center justify-center bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-3 px-4 rounded-lg shadow-sm transition duration-200 ease-in-out"
                  onClick={() => console.log('Simulating adding another account flow...')}
                >
                  <i className="fas fa-plus mr-2"></i> Add another account
                </button>
                <button
                  className="w-full flex items-center justify-center bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-3 px-4 rounded-lg shadow-sm transition duration-200 ease-in-out"
                  onClick={() => handleSignOut()} // Reuses the existing sign out logic
                >
                  <i className="fas fa-sign-out-alt mr-2"></i> Sign out of all accounts
                </button>
              </div>
            </div>
          </div>
        );
      case 'chat':
      default: // 'chat' is the default view when logged in
        return (
          <div className="flex flex-col h-full bg-gray-50">
            {/* Chat Messages Area */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gray-50">
              {messages.length === 0 && (
                <div className="text-center text-gray-500 mt-20">
                  <p className="text-3xl font-bold mb-4 text-gray-700">Welcome to Finease!</p>
                  <p className="text-lg text-gray-600">Your AI financial assistant. How can I help you today?</p>
                  <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4 max-w-xl mx-auto">
                    <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 text-gray-700 text-left cursor-pointer hover:bg-gray-100 transition" onClick={() => setInputMessage('What are the current market trends?')}>
                      "What are the current market trends?"
                    </div>
                    <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 text-gray-700 text-left cursor-pointer hover:bg-gray-100 transition" onClick={() => setInputMessage('Explain compound interest.')}>
                      "Explain compound interest."
                    </div>
                    <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 text-gray-700 text-left cursor-pointer hover:bg-gray-100 transition" onClick={() => setInputMessage('Help me create a budget.')}>
                      "Help me create a budget."
                    </div>
                    <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 text-gray-700 text-left cursor-pointer hover:bg-gray-100 transition" onClick={() => setInputMessage('What is a good investment strategy for beginners?')}>
                      "What is a good investment strategy for beginners?"
                    </div>
                  </div>
                </div>
              )}
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {/* Conditionally render file attachment details or regular message content */}
                  {msg.type === 'file_attachment' ? (
                    <div className="max-w-2xl p-4 rounded-xl shadow-md bg-gray-200 text-gray-800 rounded-bl-none">
                      <div className="flex items-center space-x-3 mb-3">
                        <i className="fas fa-file-alt text-2xl text-blue-500"></i> {/* File icon */}
                        <div>
                          <p className="font-semibold text-lg">
                            {msg.fileDetails.names.join(', ')} {/* Display all file names */}
                          </p>
                          <span className="text-sm text-gray-600">
                            {msg.fileDetails.types.join(', ')} {/* Display all file types */}
                          </span>
                        </div>
                      </div>
                      <p className="mb-4">{msg.text}</p> {/* Displaying the text from the message object */}
                    </div>
                  ) : (
                    <div
                      className={`max-w-2xl p-4 rounded-xl shadow-md ${
                        msg.sender === 'user'
                          ? 'bg-blue-600 text-white rounded-br-none'
                          : 'bg-gray-200 text-gray-800 rounded-bl-none'
                      }`}
                    >
                      {msg.text}
                      {msg.isTyping && ( // Simple typing indicator for AI messages
                          <span className="ml-2 animate-pulse">...</span>
                      )}
                       {msg.hasAdviceButton && !msg.isWordExplanation && ( // Only show advice button if not a word explanation
                        <button
                          className="mt-2 ml-2 bg-green-500 hover:bg-green-600 text-white text-sm py-1 px-3 rounded-lg shadow transition duration-200"
                          onClick={() => handleGetFinancialAdvice(msg.userQueryForAdvice)}
                          disabled={isGettingAdvice}
                        >
                          {isGettingAdvice ? 'Getting Advice...' : 'Get Financial Advice ✨'}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ))}
              <div ref={chatMessagesEndRef} /> {/* Scroll target */}
            </div>

            {/* Chat Input Area */}
            <form onSubmit={handleSendMessage} className="p-4 bg-white border-t border-gray-200 shadow-lg">
              <div className="flex items-center space-x-4 max-w-3xl mx-auto">
                {/* File Upload Button */}
                <label htmlFor="file-upload" className="cursor-pointer bg-orange-500 hover:bg-orange-600 text-white p-3 rounded-lg shadow-md transition duration-200 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:ring-opacity-75">
                  <i className="fas fa-upload text-xl"></i>
                  <input
                    id="file-upload"
                    type="file"
                    multiple // Added multiple attribute here
                    className="hidden"
                    onChange={handleFileUpload} // This now directly triggers the AI response
                  />
                </label>

                <input
                  type="text"
                  value={inputMessage} // Input message is always controlled by inputMessage state
                  onChange={(e) => setInputMessage(e.target.value)}
                  className="flex-1 p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-inter text-lg"
                  placeholder={selectedFiles.length > 0 ? "Type your question about the files..." : "Ask anything"}
                  disabled={isSendingMessage || isAutoExplaining || isGettingAdvice} // Disable input during AI processing
                />
                {selectedFiles.length > 0 && ( // Show clear button only if files are selected
                  <button
                    type="button"
                    onClick={clearSelectedFiles} // Updated to clearSelectedFiles
                    className="text-red-500 hover:text-red-700 text-xl p-2 rounded-full"
                    title="Clear selected files"
                  >
                    <i className="fas fa-times"></i>
                  </button>
                )}
                <button
                  type="button" // Changed to type="button" to prevent form submission
                  onClick={handleVoiceInput}
                  className="bg-purple-600 hover:bg-purple-700 text-white p-3 rounded-lg shadow-md transition duration-200 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:ring-opacity-75"
                  title="Voice Input"
                  disabled={isSendingMessage || isAutoExplaining || isGettingAdvice}
                >
                  <i className="fas fa-microphone text-xl"></i>
                </button>
                <button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-lg shadow-md transition duration-200 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-opacity-75"
                  title="Send Message"
                  disabled={(!inputMessage.trim() && selectedFiles.length === 0) || isSendingMessage || isAutoExplaining || isGettingAdvice} // Disable send button if nothing to send or AI is busy
                >
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                    <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l.649-.186.936-2.807a1 1 0 00-.186-1.019l-.353-.353A1 1 0 019 11.414V15a1 1 0 001 1h.01a1 1 0 001-1v-3.586a1 1 0 01.293-.707l.353-.353a1 1 0 001.169-1.409l-7-14z"></path>
                  </svg>
                </button>
              </div>
              <div className="text-center text-gray-500 text-sm mt-2">
                + Tools {/* Added "+ Tools" text */}
              </div>
            </form>
          </div>
        );
    }
  };

  return (
    <div className="flex h-screen bg-gray-900 font-inter overflow-hidden">
      {/* Tailwind CSS CDN and Font Awesome are expected to be in public/index.html */}
      {/* Google Fonts - Inter is expected to be in public/index.1html */}
      {/* Added CDN links directly for ease of preview in Canvas */}
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
      <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.3/css/all.min.css" />
      <script src="https://cdn.tailwindcss.com"></script>
      <style>
        {`
        body {
          font-family: 'Inter', sans-serif;
          margin: 0;
          overflow: hidden; /* Prevent body scroll */
        }
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #e0e0e0; /* Light gray track */
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #bdbdbd; /* Medium gray thumb */
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #9e9e9e; /* Darker gray on hover */
        }
        `}
      </style>

      {/* Sidebar */}
      <div className="w-64 bg-gray-900 text-white flex flex-col shadow-2xl rounded-r-xl">
        <div className="p-6 text-3xl font-extrabold text-center text-blue-400 border-b border-gray-700">
          Finease amli
        </div>
        <nav className="flex-1 p-4 space-y-3">
          {/* New chat button at the top of the nav */}
          {isLoggedIn && (
            <button
              className="w-full text-left py-3 px-4 rounded-lg transition duration-200 ease-in-out flex items-center bg-gray-700 hover:bg-gray-600 text-white shadow-md mb-4"
              onClick={() => {
                setMessages([]); // Start a new chat
                setSelectedFiles([]); // Clear any selected files
                setInputMessage(''); // Clear input
                setActiveView('chat'); // Ensure we are on the chat view
              }}
            >
              <i className="fas fa-plus text-xl mr-3"></i> <span className="text-lg">New chat</span>
            </button>
          )}

          {/* Removed Search chats input */}

          {/* Main navigation links */}
          {isLoggedIn && (
            <>
              <button
                className={`w-full text-left py-3 px-4 rounded-lg transition duration-200 ease-in-out flex items-center ${
                  activeView === 'chat' ? 'bg-blue-700 text-white shadow-lg' : 'hover:bg-gray-700 text-gray-300'
                }`}
                onClick={() => setActiveView('chat')}
              >
                <i className="fas fa-comment-dots text-xl mr-3"></i> <span className="text-lg">Chat</span>
              </button>
              <button
                className={`w-full text-left py-3 px-4 rounded-lg transition duration-200 ease-in-out flex items-center ${
                  activeView === 'history' ? 'bg-blue-700 text-white shadow-lg' : 'hover:bg-gray-700 text-gray-300'
                }`}
                onClick={() => setActiveView('history')}
              >
                <i className="fas fa-history text-xl mr-3"></i> <span className="text-lg">History</span>
              </button>
              <button
                className="w-full text-left py-3 px-4 rounded-lg transition duration-200 ease-in-out flex items-center"
                onClick={() => setActiveView('account')}
              >
                <i className="fas fa-user-circle text-xl mr-3"></i> <span className="text-lg">Account</span>
              </button>
            </>
          )}
        </nav>
        <div className="p-4 border-t border-gray-700">
          {/* Login/Sign Out button */}
          <button
            className={`w-full text-left py-3 px-4 rounded-lg transition duration-200 ease-in-out flex items-center justify-center font-semibold text-lg shadow-md ${
              isLoggedIn ? 'bg-red-700 hover:bg-red-800' : 'bg-green-700 hover:bg-green-800'
            } text-white`}
            onClick={isLoggedIn ? handleSignOut : () => setActiveView('auth')} // If logged out, clicking "Login" button goes to auth view
          >
            <i className={`fas ${isLoggedIn ? 'fa-sign-out-alt' : 'fa-sign-in-alt'} mr-3`}></i>
            {isLoggedIn ? 'Sign Out' : 'Login'}
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col bg-gray-100 rounded-l-xl overflow-hidden">
        {renderContent()}
      </div>
    </div>
  );
}

export default App;