import React, { useState, useEffect, useRef } from 'react';
import { Order, OrderMessage } from '../../types';
import { useLanguage } from '../../hooks/useLanguage';
import {
  MessageSquare,
  Send,
  X,
  User,
  Bike,
  ShieldCheck,
  Clock,
  Sparkles,
} from 'lucide-react';

interface OrderChatModalProps {
  order: Order;
  currentUserRole: 'admin' | 'rider' | 'customer';
  currentUserName: string;
  currentUserPhone?: string;
  isOpen: boolean;
  onClose: () => void;
  onSendMessage: (orderId: string, text: string) => Promise<void>;
}

export const OrderChatModal: React.FC<OrderChatModalProps> = ({
  order,
  currentUserRole,
  currentUserName,
  currentUserPhone,
  isOpen,
  onClose,
  onSendMessage,
}) => {
  const { language } = useLanguage();
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const messages: OrderMessage[] = order.messages || [];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [isOpen, messages.length]);

  if (!isOpen) return null;

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim() || isSending) return;

    const textToSend = inputText.trim();
    setInputText('');
    setIsSending(true);

    try {
      const minAnim = new Promise((r) => setTimeout(r, 200));
      await onSendMessage(order.id, textToSend);
      await minAnim;
    } catch (err) {
      console.error('Failed to send message:', err);
    } finally {
      setIsSending(false);
    }
  };

  // Quick preset suggestions based on current role and language
  const quickSuggestions: Record<'admin' | 'rider' | 'customer', string[]> = {
    rider: language === 'bn' ? [
      'আমি পণ্য নিয়ে রওনা হয়েছি',
      'আপনার লোকেশনের কাছাকাছি আছি',
      'একটু ফোনে কথা বলতে পারবেন?',
      '৫ মিনিটের মধ্যে পৌঁছে যাচ্ছি',
    ] : [
      'On my way with your order',
      'Near your location',
      'Please check your phone call',
      'Arriving in 5 minutes',
    ],
    admin: language === 'bn' ? [
      'আপনার অর্ডারটি প্রস্তুত করা হচ্ছে',
      'রাইডারকে আপনার অর্ডারে অ্যাসাইন করা হয়েছে',
      'কোনো স্পেশাল নির্দেশনা থাকলে জানাতে পারেন',
    ] : [
      'Your order is being prepared',
      'A rider has been assigned to your order',
      'Please let us know if you have special requests',
    ],
    customer: language === 'bn' ? [
      'আমি বাসায় আছি, গেটে নক দিবেন',
      'কতক্ষণ লাগবে ভাইয়া?',
      'গেটের কাছে এসে কল দিন প্লিজ',
      'ক্যাশ টাকা রেডি আছে',
    ] : [
      'I am at home, please knock at the gate',
      'How much time will it take?',
      'Please call when near the gate',
      'Cash on delivery is ready',
    ],
  };

  const roleBadge = (role: 'admin' | 'rider' | 'customer', name: string) => {
    if (role === 'admin') {
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-emerald-100 text-emerald-900 px-2 py-0.5 rounded-full">
          <ShieldCheck className="w-3 h-3 text-emerald-700" />
          <span>{language === 'bn' ? 'এডমিন' : 'Admin'} ({name})</span>
        </span>
      );
    }
    if (role === 'rider') {
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-blue-100 text-blue-900 px-2 py-0.5 rounded-full">
          <Bike className="w-3 h-3 text-blue-700" />
          <span>{language === 'bn' ? 'রাইডার' : 'Rider'} ({name})</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-amber-100 text-amber-900 px-2 py-0.5 rounded-full">
        <User className="w-3 h-3 text-amber-700" />
        <span>{language === 'bn' ? 'গ্রাহক' : 'Customer'} ({name})</span>
      </span>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl max-w-lg w-full h-[600px] max-h-[90vh] shadow-2xl border border-slate-200 flex flex-col overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-slate-900 via-slate-800 to-emerald-950 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center text-emerald-400 shrink-0">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm sm:text-base text-white">
                  {language === 'bn' ? 'অর্ডার চ্যাট ও মেসেজ' : 'Order Live Chat'}
                </h3>
                <span className="font-mono text-xs text-emerald-300 font-bold bg-white/10 px-2 py-0.5 rounded-md">
                  #{order.id}
                </span>
              </div>
              <p className="text-[11px] text-slate-300 mt-0.5">
                {language === 'bn' ? 'গ্রাহক: ' : 'Customer: '}{order.customerName} ({order.customerPhone})
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Info banner about order participants */}
        <div className="bg-slate-50 border-b border-slate-200 px-4 py-2 text-[11px] text-slate-600 flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-slate-700">{language === 'bn' ? 'অংশগ্রহণকারী:' : 'Participants:'}</span>
            <span>{language === 'bn' ? 'এডমিন' : 'Admin'}</span> •{' '}
            <span>{order.riderName ? `${language === 'bn' ? 'রাইডার: ' : 'Rider: '}${order.riderName}` : (language === 'bn' ? 'রাইডার (অ্যাসাইন হলে)' : 'Rider (when assigned)')}</span> •{' '}
            <span>{language === 'bn' ? 'গ্রাহক' : 'Customer'}</span>
          </div>
          <span className="text-emerald-700 font-bold">
            {language === 'bn' ? 'আপনি: ' : 'You: '}
            {currentUserRole === 'admin'
              ? (language === 'bn' ? 'এডমিন' : 'Admin')
              : currentUserRole === 'rider'
              ? (language === 'bn' ? 'রাইডার' : 'Rider')
              : (language === 'bn' ? 'গ্রাহক' : 'Customer')}
          </span>
        </div>

        {/* Order Note Banner (if present) */}
        {order.notes && (
          <div className="bg-amber-50 border-b border-amber-200/80 px-4 py-2 text-xs text-amber-950 flex items-start gap-2 shrink-0">
            <span className="font-bold shrink-0 flex items-center gap-1 text-amber-900">
              📝 {language === 'bn' ? 'অর্ডারের নোট:' : 'Order Note:'}
            </span>
            <span className="font-medium italic">{order.notes}</span>
          </div>
        )}

        {/* Message Thread Body */}
        <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-slate-50/50">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-300 mb-2">
                <MessageSquare className="w-6 h-6" />
              </div>
              <p className="text-xs font-semibold text-slate-600">
                {language === 'bn' ? 'এই অর্ডারে এখনো কোনো মেসেজ দেওয়া হয়নি' : 'No messages in this order yet'}
              </p>
              <p className="text-[11px] text-slate-400 mt-1 max-w-xs">
                {language === 'bn'
                  ? 'ডেলিভারি বা পণ্য সংক্রান্ত যেকোনো বার্তা এখানে লিখুন। এডমিন, রাইডার ও গ্রাহক একে অপরের মেসেজ দেখতে ও উত্তর দিতে পারবেন।'
                  : 'Chat regarding delivery, items, or timing. Admin, Rider, and Customer can communicate in real-time.'}
              </p>
            </div>
          ) : (
            messages.map((msg) => {
              const isMine = msg.senderRole === currentUserRole;

              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${isMine ? 'items-end' : 'items-start'}`}
                >
                  <div className="flex items-center gap-1.5 mb-1 px-1">
                    {roleBadge(msg.senderRole, msg.senderName)}
                    <span className="text-[10px] text-slate-400 flex items-center gap-0.5 font-mono">
                      <Clock className="w-2.5 h-2.5" />
                      {new Date(msg.createdAt).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>

                  <div
                    className={`max-w-[85%] p-3 rounded-2xl text-xs sm:text-sm leading-relaxed shadow-2xs ${
                      isMine
                        ? 'bg-emerald-700 text-white rounded-tr-xs'
                        : msg.senderRole === 'admin'
                        ? 'bg-slate-900 text-white rounded-tl-xs'
                        : msg.senderRole === 'rider'
                        ? 'bg-blue-600 text-white rounded-tl-xs'
                        : 'bg-white border border-slate-200 text-slate-900 rounded-tl-xs'
                    }`}
                  >
                    <p className="whitespace-pre-wrap wrap-break-words">{msg.text}</p>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Quick Suggestion Chips */}
        <div className="px-3 pt-2 pb-1 bg-white border-t border-slate-100 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          <span className="text-[10px] font-bold text-slate-400 shrink-0 flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-amber-500" />
            {language === 'bn' ? 'দ্রুত পাঠান:' : 'Quick send:'}
          </span>
          {quickSuggestions[currentUserRole].map((sug, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => {
                setInputText(sug);
              }}
              className="text-[10px] font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 px-2.5 py-1 rounded-full whitespace-nowrap transition-colors shrink-0"
            >
              {sug}
            </button>
          ))}
        </div>

        {/* Chat Input Bar */}
        <form
          onSubmit={handleSend}
          className="p-3 sm:p-4 bg-white border-t border-slate-200 flex items-center gap-2"
        >
          <input
            type="text"
            placeholder={
              currentUserRole === 'customer'
                ? (language === 'bn' ? 'রাইডার বা এডমিনকে মেসেজ লিখুন...' : 'Write message to rider or admin...')
                : (language === 'bn' ? 'গ্রাহককে মেসেজ পাঠান...' : 'Send message to customer...')
            }
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            disabled={isSending}
            className="flex-1 p-2.5 sm:p-3 rounded-xl border border-slate-200 text-xs sm:text-sm focus:outline-hidden focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 bg-slate-50"
          />

          <button
            type="submit"
            disabled={!inputText.trim() || isSending}
            className="bg-emerald-700 hover:bg-emerald-800 disabled:opacity-40 text-white p-2.5 sm:p-3 rounded-xl transition-all shadow-xs flex items-center justify-center shrink-0 active:scale-95"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};
