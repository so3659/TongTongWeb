import React, { useEffect, useState, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { PaperAirplaneIcon, UserCircleIcon } from '@heroicons/react/24/solid';
import { EllipsisHorizontalIcon } from '@heroicons/react/24/outline';

const Messages = () => {
  const { user } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [activeChatUser, setActiveChatUser] = useState(null); 
  const [myProfile, setMyProfile] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [isPartnerLeft, setIsPartnerLeft] = useState(false);
  const scrollRef = useRef();

  // 1. Fetch Conversations & My Profile
  useEffect(() => {
    if (user) {
      fetchConversations();
      fetchMyProfile();
    }
  }, [user]);

  // Sync activeChatUser with the latest data from conversations list
  useEffect(() => {
    if (activeChatUser && conversations.length > 0) {
      const updated = conversations.find(c => c.roomId === activeChatUser.roomId);
      if (updated) setActiveChatUser(updated);
    }
  }, [conversations]);

  const fetchMyProfile = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('nickname, avatar_url')
      .eq('id', user.id)
      .single();
    if (data) setMyProfile(data);
  };

  // 2. Realtime Subscription
  useEffect(() => {
    if (!user) return;
    const subscription = supabase
      .channel('public:messages')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
        fetchConversations(); 
        
        if (activeChatUser && (payload.new.room_id === activeChatUser.roomId)) {
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
  }, [activeChatUser?.roomId]); // Only track roomId change to avoid loops

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
            related_post_id,
            target_is_anonymous,
            posts:related_post_id (title, author_id, is_anonymous),
            messages (
              content,
              created_at,
              is_read,
              sender_id,
              is_anonymous
            )
          )
        `)
        .eq('user_id', user.id)
        .is('left_at', null);

      if (error) throw error;

      // Fetch "Real" status for these rooms directly to avoid nested query limits/sorting issues
      const myRoomIds = myRooms.map(r => r.room_id);
      let realSendersByRoom = {};
      
      if (myRoomIds.length > 0) {
        const { data: realData } = await supabase
          .from('messages')
          .select('room_id, sender_id')
          .in('room_id', myRoomIds)
          .eq('is_anonymous', false)
          .neq('sender_id', user.id);

        if (realData) {
          realData.forEach(m => {
            if (!realSendersByRoom[m.room_id]) realSendersByRoom[m.room_id] = new Set();
            realSendersByRoom[m.room_id].add(m.sender_id);
          });
        }
      }

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
        const sortedMessages = [...roomMessages].sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
        const lastMessage = sortedMessages[sortedMessages.length - 1];
        const firstMessage = sortedMessages[0];

        const postInfo = Array.isArray(room.posts) ? room.posts[0] : room.posts;

        let displayUser = {
          id: partnerData.user_id,
          nickname: partnerData.profiles?.nickname,
          avatar_url: partnerData.profiles?.avatar_url
        };

        const initiatorId = firstMessage?.sender_id;
        const iAmInitiator = initiatorId === user.id;

        // --- CORE ANONYMITY LOGIC ---
        
        // 1. My Anonymity (for sending replies)
        const myMessages = roomMessages.filter(m => m.sender_id === user.id);
        const iSentAnon = myMessages.some(m => m.is_anonymous);
        const iSentReal = myMessages.some(m => !m.is_anonymous);
        
        let amIAnonymous = false;
        if (iSentAnon) amIAnonymous = true;
        else if (iSentReal) amIAnonymous = false;
        else {
          // If haven't sent any message yet, use room/context default
          amIAnonymous = iAmInitiator ? room.is_anonymous : (room.related_post_id && !(postInfo?.author_id === user.id && !postInfo?.is_anonymous));
        }

        // 2. Partner's Anonymity (for Sidebar/Header Display)
        const partnerMessages = roomMessages.filter(m => m.sender_id === partnerData.user_id);
        const partnerSentAnon = partnerMessages.some(m => m.is_anonymous);
        
        // Check real status from the separate query (authoritative source)
        const partnerSentReal = realSendersByRoom[item.room_id]?.has(partnerData.user_id);
        
        // Context-based protection
        const partnerIsAnonAuthor = room.related_post_id && postInfo?.author_id === partnerData.user_id && postInfo?.is_anonymous;
        const partnerIsAnonCommenter = room.related_post_id && partnerData.user_id !== postInfo?.author_id;

        const targetIsAnon = room.target_is_anonymous;
        let isPartnerAnonymous = false;
        
        if (targetIsAnon === false && iAmInitiator) {
          isPartnerAnonymous = false; // Target is explicitly Real
        } else if (partnerSentReal) {
          isPartnerAnonymous = false; // Revealed by real message
        } else if (partnerSentAnon || partnerIsAnonAuthor) {
          isPartnerAnonymous = true; // Stay anonymous
        } else if (partnerIsAnonCommenter) {
          isPartnerAnonymous = true; // Initial protection for commenter
        } else {
          // Fallback to room initiator choice
          isPartnerAnonymous = !iAmInitiator ? room.is_anonymous : false;
        }

        const unreadCount = roomMessages.filter(m => m.sender_id !== user.id && !m.is_read).length;

        return {
          roomId: item.room_id,
          isPartnerAnonymous, 
          targetIsAnonymous: room.target_is_anonymous, // Add this field
          amIAnonymous,
          relatedPost: postInfo,
          relatedPostId: room.related_post_id,
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
    const { data: myPart } = await supabase
      .from('chat_participants')
      .select('visible_from')
      .eq('room_id', roomId)
      .eq('user_id', user.id)
      .single();
    
    const visibleFrom = myPart?.visible_from || '1970-01-01';

    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('room_id', roomId)
      .gte('created_at', visibleFrom) 
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
      room_id: activeChatUser.roomId,
      is_anonymous: activeChatUser.amIAnonymous
    };
    setMessages(prev => [...prev, tempMsg]);

    const { error } = await supabase.from('messages').insert({
      sender_id: user.id,
      receiver_id: activeChatUser.user.id,
      content: text,
      room_id: activeChatUser.roomId,
      is_anonymous: activeChatUser.amIAnonymous
    });

    if (error) {
      alert('전송 실패');
      setMessages(prev => prev.filter(m => m.id !== tempMsg.id));
    } else {
      fetchConversations();
    }
  };

  if (!user) return <div className="text-center py-40">로그인이 필요합니다.</div>;

  const firstMessage = messages.length > 0 ? messages[0] : null;
  // Fallback: If no messages, assume I am initiator if I just created it? 
  // Ideally we need room creator info, but usually empty room implies I created it via modal.
  // However, for rendering bubbles, messages exist.
  const iAmInitiator = firstMessage ? firstMessage.sender_id === user.id : true; 

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
                      {!c.isPartnerAnonymous && c.user.avatar_url ? (
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
                      <h3 className="font-bold text-slate-900 text-sm truncate">
                        {c.isPartnerAnonymous ? '익명' : (c.user.nickname || '알 수 없음')}
                      </h3>
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
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 text-lg">
                        {activeChatUser.isPartnerAnonymous ? '익명' : activeChatUser.user.nickname}
                      </span>
                      {activeChatUser.isPartnerAnonymous && <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">익명</span>}
                    </div>
                  </div>
                </div>
                <button onClick={handleLeaveChat} className="text-slate-400 hover:text-red-500 transition" title="채팅방 나가기">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-4" ref={scrollRef}>
                {activeChatUser.relatedPost && (
                  <div className="text-center my-6">
                    <span className="text-[11px] text-slate-500 bg-slate-100 px-4 py-1.5 rounded-full border border-slate-200/50">
                      게시글 <span className="font-bold text-slate-700">{activeChatUser.relatedPost.title}</span> 을 통해 시작된 쪽지입니다
                    </span>
                  </div>
                )}
                {messages.map((msg, idx) => {
                  const isMe = msg.sender_id === user.id;
                  const isMsgAnonymous = msg.is_anonymous;
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
                      
                      {/* Logic to determine if this bubble belongs to the Target User (who should be Real in Real-Target Room) */}
                      {/* If isMe: I am target if I am NOT initiator. */}
                      {/* If !isMe: Partner is target if I AM initiator. */}
                      {(() => {
                        const isTargetUser = isMe ? !iAmInitiator : iAmInitiator;
                        const shouldShowReal = !isMsgAnonymous || (activeChatUser.targetIsAnonymous === false && isTargetUser);

                        return (
                          <div className={`flex items-end gap-2 ${isMe ? 'justify-end' : 'justify-start'}`}>
                            {!isMe && (
                              <div className="w-8 h-8 rounded-full bg-slate-200 flex-shrink-0 overflow-hidden mb-1">
                                {shouldShowReal && activeChatUser.user.avatar_url ? (
                                  <img src={activeChatUser.user.avatar_url} alt="avatar" className="w-full h-full object-cover" />
                                ) : (
                                  <UserCircleIcon className="w-full h-full text-slate-400" />
                                )}
                              </div>
                            )}

                            <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                              <span className="text-[10px] text-slate-400 mb-1 font-medium px-1">
                                {isMe 
                                  ? (shouldShowReal ? myProfile?.nickname : '익명')
                                  : (shouldShowReal ? activeChatUser.user.nickname : '익명')
                                }
                              </span>
                              <div className="flex items-end gap-2">
                                {isMe && (
                                  <div className="flex flex-col items-end text-[10px] text-slate-400">
                                    <span className={msg.is_read ? 'text-brand-500 font-bold' : ''}>
                                      {msg.is_read ? '읽음' : '1'}
                                    </span>
                                    <span>{format(new Date(msg.created_at), 'HH:mm')}</span>
                                  </div>
                                )}
                                
                                <div className={`max-w-[200px] md:max-w-[300px] rounded-2xl px-4 py-2.5 text-sm leading-relaxed shadow-sm ${
                                  isMe 
                                    ? 'bg-brand-600 text-white rounded-tr-none' 
                                    : 'bg-white text-slate-800 border border-slate-100 rounded-tl-none'
                                }`}>
                                  {msg.content}
                                </div>

                                {!isMe && (
                                  <div className="text-[10px] text-slate-400">
                                    <span>{format(new Date(msg.created_at), 'HH:mm')}</span>
                                  </div>
                                )}
                              </div>
                            </div>

                            {isMe && (
                              <div className="w-8 h-8 rounded-full bg-slate-200 flex-shrink-0 overflow-hidden mb-1">
                                {shouldShowReal && myProfile?.avatar_url ? (
                                  <img src={myProfile.avatar_url} alt="my avatar" className="w-full h-full object-cover" />
                                ) : (
                                  <UserCircleIcon className="w-full h-full text-slate-400" />
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })()}
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