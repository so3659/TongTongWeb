import React, { useEffect, useState, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';
import { format } from 'date-fns';
import { PaperAirplaneIcon, UserCircleIcon } from '@heroicons/react/24/solid';
import { EllipsisHorizontalIcon } from '@heroicons/react/24/outline';

const Messages = () => {
  const { user } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [activeChatUser, setActiveChatUser] = useState(null); 
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [isPartnerLeft, setIsPartnerLeft] = useState(false);
  const scrollRef = useRef();

  // 1. Fetch Conversations
  useEffect(() => {
    if (user) fetchConversations();
  }, [user]);

  // 2. Realtime Subscription
  useEffect(() => {
    if (!user) return;
    const subscription = supabase
      .channel('public:messages')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
        fetchConversations(); 
        
        // If the message is for current active chat
        if (activeChatUser && (payload.new.room_id === activeChatUser.roomId)) {
          // IMPORTANT: Only add if sender is NOT me to prevent duplication with Optimistic UI
          if (payload.new.sender_id !== user.id) {
            setMessages(prev => [...prev, payload.new]);
            if (payload.new.receiver_id === user.id) {
               markAsRead(payload.new.id);
            }
          }
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [user, activeChatUser]);

  // 3. Scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // 4. Fetch Chat History when activeChatUser changes
  useEffect(() => {
    if (activeChatUser) {
      fetchChatHistory(activeChatUser.roomId);
      markAllAsRead(activeChatUser.roomId);
      checkPartnerStatus(activeChatUser.roomId);
    }
  }, [activeChatUser]);

  const checkPartnerStatus = async (roomId) => {
    const { data } = await supabase
      .from('chat_participants')
      .select('left_at')
      .eq('room_id', roomId)
      .neq('user_id', user.id)
      .single();
    
    setIsPartnerLeft(!!data?.left_at);
  };

  const fetchConversations = async () => {
    setLoading(true);
    try {
      const { data: myRooms, error } = await supabase
        .from('chat_participants')
        .select(`
          room_id,
          chat_rooms (
            is_anonymous,
            messages (
              content,
              created_at,
              is_read,
              sender_id
            )
          )
        `)
        .eq('user_id', user.id)
        .is('left_at', null);

      if (error) throw error;

      const formattedConversations = await Promise.all(myRooms.map(async (item) => {
        const room = item.chat_rooms;
        const { data: partnerData } = await supabase
          .from('chat_participants')
          .select('user_id, profiles(nickname, avatar_url)')
          .eq('room_id', item.room_id)
          .neq('user_id', user.id)
          .maybeSingle();
        
        if (!partnerData) return null;

        const roomMessages = room.messages || [];
        roomMessages.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        const lastMessage = roomMessages[0];

        let displayUser = {
          id: partnerData.user_id,
          nickname: partnerData.profiles?.nickname,
          avatar_url: partnerData.profiles?.avatar_url
        };

        if (room.is_anonymous) {
          displayUser.nickname = '익명';
          displayUser.avatar_url = null;
        }

        const unreadCount = roomMessages.filter(m => m.sender_id !== user.id && !m.is_read).length;

        return {
          roomId: item.room_id,
          isAnonymous: room.is_anonymous,
          user: displayUser,
          lastMessage: lastMessage || { content: '대화가 없습니다.', created_at: new Date().toISOString() },
          unreadCount
        };
      }));

      const validConversations = formattedConversations
        .filter(c => c !== null)
        .sort((a, b) => new Date(b.lastMessage.created_at) - new Date(a.lastMessage.created_at));

      setConversations(validConversations);
    } catch (error) {
      console.error('Error fetching conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchChatHistory = async (roomId) => {
    // 1. Get my visibility scope
    const { data: myPart } = await supabase
      .from('chat_participants')
      .select('visible_from')
      .eq('room_id', roomId)
      .eq('user_id', user.id)
      .single();
    
    const visibleFrom = myPart?.visible_from || '1970-01-01';

    // 2. Fetch messages within scope
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('room_id', roomId)
      .gte('created_at', visibleFrom) // Only show messages after I joined/re-joined
      .order('created_at', { ascending: true });

    if (!error) setMessages(data || []);
  };

  const markAsRead = async (messageId) => {
    await supabase.from('messages').update({ is_read: true }).eq('id', messageId);
  };

  const markAllAsRead = async (roomId) => {
    await supabase
      .from('messages')
      .update({ is_read: true })
      .eq('room_id', roomId)
      .eq('receiver_id', user.id)
      .eq('is_read', false);
      
    setConversations(prev => prev.map(c => 
      c.roomId === roomId ? { ...c, unreadCount: 0 } : c
    ));
  };

  const handleLeaveChat = async () => {
    if (!activeChatUser || !confirm('채팅방을 나가시겠습니까? 대화 목록에서 사라집니다.')) return;
    
    const { error } = await supabase
      .from('chat_participants')
      .update({ left_at: new Date().toISOString() })
      .eq('room_id', activeChatUser.roomId)
      .eq('user_id', user.id);

    if (!error) {
      setActiveChatUser(null);
      fetchConversations();
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!inputText.trim() || !activeChatUser) return;

    // Check Block Status (Has receiver blocked me?)
    const { data: blockCheck } = await supabase
      .from('user_blocks')
      .select('id')
      .eq('blocker_id', activeChatUser.user.id)
      .eq('blocked_id', user.id)
      .maybeSingle();
    
    if (blockCheck) {
      alert('상대방이 쪽지 수신을 차단했습니다.');
      return;
    }

    const text = inputText;
    setInputText(''); 

    const tempMsg = {
      id: Date.now(),
      sender_id: user.id,
      content: text,
      created_at: new Date().toISOString(),
      is_read: false,
      room_id: activeChatUser.roomId
    };
    setMessages(prev => [...prev, tempMsg]);

    const { error } = await supabase.from('messages').insert({
      sender_id: user.id,
      receiver_id: activeChatUser.user.id,
      content: text,
      room_id: activeChatUser.roomId
    });

    if (error) {
      alert('전송 실패');
      setMessages(prev => prev.filter(m => m.id !== tempMsg.id));
    } else {
      fetchConversations();
    }
  };

  if (!user) return <div className="text-center py-40">로그인이 필요합니다.</div>;

  return (
    <div className="max-w-6xl mx-auto px-4 pt-32 pb-20 h-[calc(100vh-80px)]">
      <div className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden h-full flex">
        
        {/* Left: List */}
        <div className={`w-full md:w-80 border-r border-slate-200 flex flex-col ${activeChatUser ? 'hidden md:flex' : 'flex'}`}>
          <div className="p-4 border-b border-slate-100 bg-slate-50">
            <h2 className="font-bold text-slate-800">대화 목록</h2>
          </div>
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="p-4 text-center text-slate-400">로딩중...</div>
            ) : conversations.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-sm">대화 내역이 없습니다.</div>
            ) : (
              conversations.map((c) => (
                <div 
                  key={c.roomId}
                  onClick={() => setActiveChatUser(c)}
                  className={`p-4 flex items-center gap-3 cursor-pointer hover:bg-slate-50 transition border-b border-slate-50 ${activeChatUser?.roomId === c.roomId ? 'bg-brand-50 hover:bg-brand-50' : ''}`}
                >
                  <div className="relative">
                    <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center text-slate-500 overflow-hidden">
                      {c.user.avatar_url ? (
                        <img src={c.user.avatar_url} alt="avatar" className="w-full h-full object-cover" />
                      ) : (
                        <UserCircleIcon className="w-full h-full" />
                      )}
                    </div>
                    {c.unreadCount > 0 && (
                      <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                        {c.unreadCount}
                      </span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-baseline mb-0.5">
                      <h3 className="font-bold text-slate-900 text-sm truncate">{c.user.nickname || '알 수 없음'}</h3>
                      <span className="text-[10px] text-slate-400">{format(new Date(c.lastMessage.created_at), 'MM.dd')}</span>
                    </div>
                    <p className={`text-xs truncate ${c.unreadCount > 0 ? 'font-bold text-slate-800' : 'text-slate-500'}`}>
                      {c.lastMessage.content}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right: Window */}
        <div className={`flex-1 flex flex-col bg-slate-50/50 ${!activeChatUser ? 'hidden md:flex' : 'flex'}`}>
          {activeChatUser ? (
            <>
              <div className="p-4 bg-white border-b border-slate-200 flex items-center justify-between shadow-sm z-10">
                <div className="flex items-center gap-3">
                  <button onClick={() => setActiveChatUser(null)} className="md:hidden p-1 -ml-2 text-slate-500">
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                  </button>
                  <div className="flex flex-col">
                    <span className="font-bold text-slate-900 text-lg flex items-center gap-2">
                      {activeChatUser.user.nickname}
                      {activeChatUser.isAnonymous && <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">익명</span>}
                    </span>
                  </div>
                </div>
                <button onClick={handleLeaveChat} className="text-slate-400 hover:text-red-500 transition" title="채팅방 나가기">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-4" ref={scrollRef}>
                {messages.map((msg, idx) => {
                  const isMe = msg.sender_id === user.id;
                  const showDate = idx === 0 || format(new Date(messages[idx-1].created_at), 'yyyy-MM-dd') !== format(new Date(msg.created_at), 'yyyy-MM-dd');
                  
                  return (
                    <React.Fragment key={msg.id}>
                      {showDate && (
                        <div className="text-center my-4">
                          <span className="text-xs text-slate-400 bg-slate-100 px-3 py-1 rounded-full">
                            {format(new Date(msg.created_at), 'yyyy년 M월 d일')}
                          </span>
                        </div>
                      )}
                      <div className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[70%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed shadow-sm ${
                          isMe 
                            ? 'bg-brand-600 text-white rounded-tr-none' 
                            : 'bg-white text-slate-800 border border-slate-100 rounded-tl-none'
                        }`}>
                          {msg.content}
                        </div>
                        <div className={`flex flex-col justify-end ml-2 text-[10px] text-slate-400 ${isMe ? 'order-first mr-2 ml-0 items-end' : ''}`}>
                          <span>{format(new Date(msg.created_at), 'HH:mm')}</span>
                          {isMe && (
                            <span className={msg.is_read ? 'text-brand-500 font-bold' : ''}>
                              {msg.is_read ? '읽음' : '1'}
                            </span>
                          )}
                        </div>
                      </div>
                    </React.Fragment>
                  );
                })}
                {isPartnerLeft && (
                  <div className="flex justify-center my-4">
                    <span className="text-xs text-slate-500 bg-slate-200/60 px-4 py-1.5 rounded-full">
                      상대방이 채팅방을 나갔습니다.
                    </span>
                  </div>
                )}
              </div>

              <form onSubmit={handleSendMessage} className="p-4 bg-white border-t border-slate-200">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    placeholder={isPartnerLeft ? "상대방이 나가서 메시지를 보낼 수 없습니다." : "메시지를 입력하세요..."}
                    disabled={!inputText.trim() && isPartnerLeft || isPartnerLeft}
                    className="flex-1 px-4 py-3 rounded-full bg-slate-100 border-transparent focus:bg-white focus:border-brand-500 focus:ring-2 focus:ring-brand-100 outline-none text-sm transition disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                  <button 
                    type="submit" 
                    disabled={!inputText.trim() || isPartnerLeft}
                    className="p-3 rounded-full bg-brand-600 text-white hover:bg-brand-700 disabled:bg-slate-300 transition shadow-lg shadow-brand-500/30"
                  >
                    <PaperAirplaneIcon className="w-5 h-5" />
                  </button>
                </div>
              </form>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-slate-400 flex-col gap-4">
              <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center">
                <PaperAirplaneIcon className="w-10 h-10 text-slate-300" />
              </div>
              <p>대화 상대를 선택해주세요.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Messages;