import { useState, useRef, useEffect } from "react";
import API from "../config";

export default function JesterAI() {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [messages, setMessages] = useState([
    { role: "assistant", content: "Hi! I'm Jester, your AI CI/CD assistant. How can I help you debug your pipeline today?" }
  ]);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isOpen]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim() || isTyping) return;
    
    const userMsg = input;
    const newMessages = [...messages, { role: "user", content: userMsg }];
    
    setMessages(newMessages);
    setInput("");
    setIsTyping(true);
    
    try {
      const response = await API.post("/api/chat", { messages: newMessages });
      setMessages(prev => [...prev, { role: "assistant", content: response.data.reply }]);
    } catch (err) {
      console.error(err);
      setMessages(prev => [...prev, { 
        role: "assistant", 
        content: "⚠️ " + (err.response?.data?.message || "Oops! I couldn't connect to the server. Make sure your GEMINI_API_KEY is configured!") 
      }]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
      {isOpen && (
        <div className="bg-[#0a0f1c]/90 backdrop-blur-2xl border border-white/10 rounded-[2rem] w-[calc(100vw-3rem)] sm:w-96 h-[500px] max-h-[75vh] mb-4 flex flex-col shadow-[0_8px_30px_rgb(0,0,0,0.6)] overflow-hidden transform origin-bottom-right transition-all animate-in fade-in slide-in-from-bottom-4 zoom-in-95 duration-200">
          {/* Header */}
          <div className="px-5 py-4 border-b border-white/10 bg-gradient-to-r from-cyan-500/10 to-indigo-500/10 flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-400 to-indigo-500 flex items-center justify-center shadow-[0_0_15px_rgba(6,182,212,0.5)]">
                <span className="text-lg">🃏</span>
              </div>
              <div>
                <h3 className="font-black text-sm text-slate-100 uppercase tracking-widest">Jester AI</h3>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-pulse shadow-[0_0_5px_rgba(6,182,212,0.8)]" />
                  <span className="text-[10px] font-bold text-cyan-400">Online</span>
                </div>
              </div>
            </div>
            <button 
              onClick={() => setIsOpen(false)}
              className="text-slate-400 hover:text-white p-1.5 rounded-full hover:bg-white/10 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4 scroll-smooth custom-scrollbar">
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[85%] rounded-[1.5rem] px-5 py-3 text-sm font-medium leading-relaxed ${
                  msg.role === "user" 
                    ? "bg-gradient-to-r from-indigo-500 to-cyan-500 text-white rounded-br-sm shadow-md" 
                    : "bg-white/5 backdrop-blur-md text-slate-200 rounded-bl-sm border border-white/10 shadow-sm"
                }`}>
                  {msg.content}
                </div>
              </div>
            ))}
            {isTyping && (
              <div className="flex justify-start">
                <div className="bg-white/5 border border-white/10 rounded-[1.5rem] rounded-bl-sm px-5 py-3.5 flex gap-1.5">
                  <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-bounce [animation-delay:-0.3s]" />
                  <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-bounce [animation-delay:-0.15s]" />
                  <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-bounce" />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-4 bg-black/20 border-t border-white/10">
            <form onSubmit={handleSend} className="relative flex items-center">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask Jester..."
                className="w-full bg-white/5 border border-white/10 rounded-2xl pl-5 pr-12 py-3.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors shadow-inner"
              />
              <button 
                type="submit"
                disabled={!input.trim() || isTyping}
                className="absolute right-2 p-2 bg-gradient-to-r from-indigo-500 to-cyan-500 hover:from-indigo-400 hover:to-cyan-400 disabled:opacity-50 disabled:grayscale text-white rounded-xl transition-all shadow-[0_0_10px_rgba(6,182,212,0.3)]"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" /></svg>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Toggle Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="group relative flex items-center justify-center w-14 h-14 md:w-16 md:h-16 bg-gradient-to-br from-cyan-400 to-indigo-500 text-white rounded-full shadow-[0_0_20px_rgba(6,182,212,0.4)] hover:shadow-[0_0_30px_rgba(6,182,212,0.6)] hover:scale-105 transition-all duration-300"
        >
          <span className="text-2xl md:text-3xl drop-shadow-md group-hover:animate-wiggle">🃏</span>
          
          {/* Notification Badge */}
          <span className="absolute top-0 right-0 flex h-3.5 w-3.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-cyan-500 border-2 border-[#0a0f1c]"></span>
          </span>
        </button>
      )}
    </div>
  );
}
