import React, { useState, useEffect, useRef } from 'react';
import { Character, Message } from '../types';
import { createChatSession, sendMessageToCharacter } from '../services/geminiService';
import { Send, Image as ImageIcon, Phone, MoreVertical, ChevronLeft, Smile, RefreshCw, Mic, MicOff, Trash2 } from 'lucide-react';

interface ChatInterfaceProps {
  character: Character;
  onBack: () => void;
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({ character, onBack }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const chatSessionRef = useRef<any>(null); // Ref to hold the GenAI Chat Session
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const [showOptions, setShowOptions] = useState(false);

  // Initialize chat session on mount
  useEffect(() => {
    if (!chatSessionRef.current) {
        const savedKey = `chat_history_${character.id}`;
        const saved = localStorage.getItem(savedKey);
        let historyMessages: Message[] = [];

        if (saved) {
            try {
                historyMessages = JSON.parse(saved);
            } catch (e) {
                console.error("Failed to parse chat history", e);
                localStorage.removeItem(savedKey);
            }
        }
        
        // If it's a new chat (no history), create the initial greeting
        // We add this to the history passed to the model so the model knows it started the conversation
        if (historyMessages.length === 0) {
            const initialGreeting: Message = {
                id: 'init-1',
                role: 'model',
                text: `Hey! I'm so happy you're here. I'm ${character.name}. How are you feeling today?`,
                timestamp: Date.now()
            };
            historyMessages = [initialGreeting];
        }

        setMessages(historyMessages);
        chatSessionRef.current = createChatSession(character, historyMessages);
    }

    // Cleanup speech recognition on unmount
    return () => {
        if (recognitionRef.current) {
            recognitionRef.current.stop();
        }
    };
  }, [character]);

  // Persist messages to local storage whenever they change
  useEffect(() => {
    if (messages.length > 0) {
        localStorage.setItem(`chat_history_${character.id}`, JSON.stringify(messages));
    }
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, character.id, isTyping]);

  const handleSendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!inputText.trim() || isTyping) return;

    const userMessage: Message = {
        id: crypto.randomUUID(),
        role: 'user',
        text: inputText,
        timestamp: Date.now()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setIsTyping(true);

    try {
        const responseText = await sendMessageToCharacter(chatSessionRef.current, userMessage.text);
        
        const botMessage: Message = {
            id: crypto.randomUUID(),
            role: 'model',
            text: responseText,
            timestamp: Date.now()
        };
        setMessages(prev => [...prev, botMessage]);
    } catch (err) {
        console.error(err);
    } finally {
        setIsTyping(false);
    }
  };

  const clearHistory = () => {
    if (confirm("Are you sure you want to clear the chat history? This cannot be undone.")) {
        localStorage.removeItem(`chat_history_${character.id}`);
        setMessages([]);
        setShowOptions(false);
        
        // Re-initialize chat session
        const initialGreeting: Message = {
            id: crypto.randomUUID(),
            role: 'model',
            text: `Hey! I'm so happy you're here. I'm ${character.name}. How are you feeling today?`,
            timestamp: Date.now()
        };
        
        // Create new session with just the greeting in history
        chatSessionRef.current = createChatSession(character, [initialGreeting]);
        setMessages([initialGreeting]);
    }
  };

  const toggleVoiceInput = () => {
    if (isRecording) {
      recognitionRef.current?.stop();
      setIsRecording(false);
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Voice input is not supported in this browser.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => setIsRecording(true);
    
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setInputText(prev => (prev ? prev + ' ' : '') + transcript);
    };

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error', event.error);
      setIsRecording(false);
    };

    recognition.onend = () => {
      setIsRecording(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
  };

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-0 md:p-6">
      
      {/* Mobile/Full Container */}
      <div className="w-full h-screen md:h-[800px] md:max-w-4xl bg-slate-900 md:rounded-3xl shadow-2xl overflow-hidden flex flex-col relative border border-white/5">
        
        {/* Header */}
        <div className="h-20 bg-slate-900/80 backdrop-blur-xl border-b border-white/5 flex items-center justify-between px-6 absolute top-0 w-full z-20">
            <div className="flex items-center gap-4">
                <button onClick={onBack} className="md:hidden text-slate-400 hover:text-white">
                    <ChevronLeft className="w-6 h-6" />
                </button>
                <div className="relative">
                    <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-rose-500/50 shadow-lg shadow-rose-500/20">
                        <img src={character.avatarUrl || 'https://picsum.photos/200'} alt={character.name} className="w-full h-full object-cover" />
                    </div>
                    <div className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 rounded-full border-2 border-slate-900"></div>
                </div>
                <div>
                    <h2 className="text-white font-bold text-lg">{character.name}</h2>
                    <p className="text-rose-400 text-xs font-medium uppercase tracking-wider">{character.relationshipType}</p>
                </div>
            </div>
            
            <div className="flex items-center gap-3 text-slate-400 relative">
                <button className="p-2 hover:bg-white/5 rounded-full transition-colors hidden sm:block">
                    <Phone className="w-5 h-5" />
                </button>
                <button 
                  onClick={() => setShowOptions(!showOptions)}
                  className="p-2 hover:bg-white/5 rounded-full transition-colors"
                >
                    <MoreVertical className="w-5 h-5" />
                </button>

                {/* Dropdown Menu */}
                {showOptions && (
                    <div className="absolute top-12 right-0 bg-slate-800 border border-white/10 rounded-xl shadow-xl z-50 w-48 overflow-hidden animate-fade-in">
                        <button 
                            onClick={clearHistory}
                            className="w-full text-left px-4 py-3 text-red-400 hover:bg-white/5 flex items-center gap-2 text-sm font-medium transition-colors"
                        >
                            <Trash2 className="w-4 h-4" />
                            Clear History
                        </button>
                    </div>
                )}
            </div>
        </div>

        {/* Chat Area */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 pt-24 pb-24 space-y-6 scroll-smooth">
            {messages.map((msg) => (
                <div 
                    key={msg.id} 
                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                    {msg.role === 'model' && (
                         <div className="w-8 h-8 rounded-full overflow-hidden border border-white/10 mr-3 mt-auto hidden sm:block">
                            <img src={character.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                        </div>
                    )}
                    
                    <div className={`max-w-[85%] sm:max-w-[70%] group relative`}>
                         <div className={`
                            p-4 rounded-2xl shadow-sm text-sm leading-relaxed
                            ${msg.role === 'user' 
                                ? 'bg-gradient-to-br from-rose-500 to-violet-600 text-white rounded-br-none' 
                                : 'bg-slate-800/80 text-slate-200 border border-white/5 rounded-bl-none'}
                        `}>
                            {msg.text}
                        </div>
                        <span className={`text-[10px] text-slate-500 mt-1 absolute -bottom-5 ${msg.role === 'user' ? 'right-1' : 'left-1'}`}>
                            {formatTime(msg.timestamp)}
                        </span>
                    </div>
                </div>
            ))}
            
            {isTyping && (
                 <div className="flex justify-start animate-fade-in">
                    <div className="w-8 h-8 rounded-full overflow-hidden border border-white/10 mr-3 mt-auto hidden sm:block">
                        <img src={character.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                    </div>
                    <div className="bg-slate-800/80 border border-white/5 p-4 rounded-2xl rounded-bl-none flex gap-1 items-center h-12">
                        <div className="w-2 h-2 bg-slate-500 rounded-full animate-bounce delay-0"></div>
                        <div className="w-2 h-2 bg-slate-500 rounded-full animate-bounce delay-100"></div>
                        <div className="w-2 h-2 bg-slate-500 rounded-full animate-bounce delay-200"></div>
                    </div>
                 </div>
            )}
            <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="h-20 bg-slate-900 border-t border-white/5 p-4 absolute bottom-0 w-full z-20 backdrop-blur-md">
            <form onSubmit={handleSendMessage} className="max-w-3xl mx-auto relative flex items-center gap-3">
                <button type="button" className="p-2 text-slate-400 hover:text-rose-400 transition-colors hidden sm:block">
                    <ImageIcon className="w-5 h-5" />
                </button>
                <button 
                    type="button" 
                    onClick={toggleVoiceInput}
                    className={`p-2 transition-all ${isRecording ? 'text-rose-500 animate-pulse scale-110' : 'text-slate-400 hover:text-rose-400'}`}
                    title="Voice Input"
                >
                    {isRecording ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                </button>
                <div className="flex-1 relative">
                    <input 
                        type="text" 
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                        placeholder={isRecording ? "Listening..." : `Message ${character.name}...`}
                        className={`w-full bg-slate-800/50 border border-slate-700 rounded-full py-3 px-5 pr-12 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-rose-500/50 transition-all ${isRecording ? 'border-rose-500/50 bg-rose-500/5' : ''}`}
                    />
                    <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-yellow-400 transition-colors">
                        <Smile className="w-5 h-5" />
                    </button>
                </div>
                <button 
                    type="submit" 
                    disabled={!inputText.trim() || isTyping}
                    className="p-3 bg-rose-500 text-white rounded-full hover:bg-rose-600 disabled:opacity-50 disabled:hover:bg-rose-500 transition-all shadow-lg shadow-rose-500/20 active:scale-95"
                >
                    <Send className="w-5 h-5" />
                </button>
            </form>
        </div>

      </div>
    </div>
  );
};

export default ChatInterface;