import React, { useState } from "react";

function ChatbotTab({ language }) {
  const [messages, setMessages] = useState([
    { sender: "bot", text: language === "en" ? "Hello! How can I help you with finance today?" : "ಹಲೋ! ನಾನು ನಿಮಗೆ ಹಣಕಾಸು ಸಂಬಂಧಿತ ಸಹಾಯವನ್ನು ಹೇಗೆ ಮಾಡಬಹುದು?" }
  ]);
  const [input, setInput] = useState("");

  // Placeholder: Replace with Dialogflow API call
  const sendMessage = async () => {
    if (!input.trim()) return;
    setMessages([...messages, { sender: "user", text: input }]);
    setInput("");
    // Simulate bot reply
    setTimeout(() => {
      setMessages(msgs => [...msgs, { sender: "bot", text: language === "en" ? "This is a sample response." : "ಇದು ಮಾದರಿ ಪ್ರತಿಕ್ರಿಯೆ." }]);
    }, 800);
  };

  return (
    <div className="chatbot-tab">
      <div className="chat-window">
        {messages.map((msg, idx) => (
          <div key={idx} className={`chat-message ${msg.sender}`}>
            {msg.text}
          </div>
        ))}
      </div>
      <div className="chat-input-row">
        <input
          type="text"
          placeholder={language === "en" ? "Type your question..." : "ನಿಮ್ಮ ಪ್ರಶ್ನೆಯನ್ನು ನಮೂದಿಸಿ..."}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === "Enter" && sendMessage()}
        />
        <button onClick={sendMessage}>
          {language === "en" ? "Send" : "ಕಳುಹಿಸಿ"}
        </button>
      </div>
    </div>
  );
}

export default ChatbotTab;
