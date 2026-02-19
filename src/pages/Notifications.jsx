import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { BellIcon, ChatBubbleLeftEllipsisIcon } from '@heroicons/react/24/outline';

const Notifications = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) fetchNotifications();
  }, [user]);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select(`
          *,
          sender:sender_id (nickname, avatar_url),
          post:target_post_id (title)
        `)
        .eq('recipient_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setNotifications(data || []);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleNotificationClick = async (noti) => {
    // 1. Mark as read
    if (!noti.is_read) {
      await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', noti.id);
    }
    // 2. Navigate to post
    navigate(`/board/${noti.target_post_id}`);
  };

  if (!user) return <div className="text-center py-40">로그인이 필요합니다.</div>;

  return (
    <div className="max-w-3xl mx-auto px-4 pt-32 pb-20">
      <div className="flex items-center gap-3 mb-8">
        <BellIcon className="w-8 h-8 text-brand-600" />
        <h1 className="text-3xl font-bold text-slate-900">알림 마당</h1>
      </div>

      <div className="space-y-4">
        {loading ? (
          <div className="text-center py-20 text-slate-400">로딩중...</div>
        ) : notifications.length === 0 ? (
          <div className="text-center py-20 text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
            새로운 알림이 없습니다.
          </div>
        ) : (
          notifications.map(noti => (
            <div 
              key={noti.id}
              onClick={() => handleNotificationClick(noti)}
              className={`p-5 rounded-xl border cursor-pointer transition flex gap-4 items-start ${
                noti.is_read 
                  ? 'bg-white border-slate-100 hover:border-slate-300' 
                  : 'bg-brand-50/30 border-brand-100 hover:bg-brand-50/50'
              }`}
            >
              <div className={`mt-1 p-2 rounded-full flex-shrink-0 ${noti.is_read ? 'bg-slate-100 text-slate-400' : 'bg-brand-100 text-brand-600'}`}>
                <ChatBubbleLeftEllipsisIcon className="w-5 h-5" />
              </div>
              
              <div className="flex-1 min-w-0">
                <p className="text-sm text-slate-800 leading-relaxed">
                  <span className="font-bold">
                    {noti.is_anonymous ? '익명의 회원' : (noti.sender?.nickname || '알 수 없음')}
                  </span>님이 
                  회원님의 {noti.type === 'COMMENT' ? '게시글' : '댓글'}에 
                  {noti.type === 'COMMENT' ? ' 댓글' : ' 답글'}을 남겼습니다.
                </p>
                <p className="text-xs text-slate-500 mt-1 truncate">
                  게시글: {noti.post?.title}
                </p>
                <p className="text-xs text-slate-400 mt-2">
                  {format(new Date(noti.created_at), 'yyyy.MM.dd HH:mm')}
                </p>
              </div>
              
              {!noti.is_read && (
                <div className="mt-2 w-2 h-2 rounded-full bg-red-500 flex-shrink-0" />
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default Notifications;
