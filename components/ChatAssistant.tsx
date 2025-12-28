import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Loader2 } from 'lucide-react';
import { chatWithProcessAnalyst } from '../services/geminiService';
import { ChatMessage } from '../types';

interface ChatAssistantProps {
  messages: ChatMessage[];
  onUpdateMessages: (newMessages: ChatMessage[]) => void;
}

const ChatAssistant: React.FC<ChatAssistantProps> = ({ messages, onUpdateMessages }) => {
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const handleSend = async () => {
    if (!input.trim()) return;
    
    const userMsg = input;
    setInput('');
    const updatedHistory: ChatMessage[] = [...messages, { role: 'user', text: userMsg }];
    onUpdateMessages(updatedHistory);
    setIsTyping(true);

    const response = await chatWithProcessAnalyst(updatedHistory, userMsg);
    
    onUpdateMessages([...updatedHistory, { role: 'model', text: response }]);
    setIsTyping(false);
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 rounded-xl overflow-hidden border border-slate-200 shadow-sm">
        <div className="bg-indigo-600 p-4 text-white flex items-center gap-2">
            <Bot size={20} />
            <h3 className="font-semibold">Analyst Assistant</h3>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-4" ref={scrollRef}>
            {messages.map((m, i) => (
                <div key={i} className={`flex gap-3 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${m.role === 'user' ? 'bg-slate-200 text-slate-600' : 'bg-indigo-100 text-indigo-600'}`}>
                        {m.role === 'user' ? <User size={16} /> : <Bot size={16} />}
                    </div>
                    <div className={`max-w-[80%] p-3 rounded-2xl text-sm leading-relaxed ${
                        m.role === 'user' 
                        ? 'bg-indigo-600 text-white rounded-tr-none' 
                        : 'bg-white border border-slate-200 text-slate-700 rounded-tl-none shadow-sm'
                    }`}>
                        {m.text}
                    </div>
                </div>
            ))}
            {isTyping && (
                <div className="flex gap-3">
                    <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center">
                        <Loader2 size={16} className="animate-spin" />
                    </div>
                    <div className="bg-white border border-slate-200 p-3 rounded-2xl rounded-tl-none shadow-sm">
                        <span className="text-slate-400 text-xs">Analyst is thinking...</span>
                    </div>
                </div>
            )}
        </div>

        <div className="p-3 bg-white border-t border-slate-200">
            <div className="relative">
                <input 
                    type="text" 
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                    placeholder="Ask about root causes..."
                    className="w-full pl-4 pr-12 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
                />
                <button 
                    onClick={handleSend}
                    disabled={isTyping || !input.trim()}
                    className="absolute right-2 top-2 p-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:hover:bg-indigo-600 transition-colors"
                >
                    <Send size={16} />
                </button>
            </div>
        </div>
    </div>
  );
};

export default ChatAssistant;