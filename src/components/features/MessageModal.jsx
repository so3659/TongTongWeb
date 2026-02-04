import React, { useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { XMarkIcon, PaperAirplaneIcon } from '@heroicons/react/24/outline';

const MessageModal = ({ isOpen, onClose, receiverId, receiverName, senderId, isAnonymous = false }) => {
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSend = async (e) => {
    e.preventDefault();
    if (!content.trim()) return;
    setLoading(true);

    try {
      // 0. Check Block Status (Has receiver blocked me?)
      const { data: blockCheck, error: blockError } = await supabase
        .from('user_blocks')
        .select('id')
        .eq('blocker_id', receiverId)
        .eq('blocked_id', senderId)
        .maybeSingle(); // Use maybeSingle to avoid error on no rows
      
      if (blockError) throw blockError;
      
      if (blockCheck) {
        throw new Error('상대방이 쪽지 수신을 차단했습니다.');
      }

      // 1. Find existing ACTIVE room where BOTH are participants
      const { data: myRooms } = await supabase
        .from('chat_participants')
        .select('room_id, chat_rooms!inner(is_anonymous)')
        .eq('user_id', senderId)
        .eq('chat_rooms.is_anonymous', isAnonymous)
        .is('left_at', null);

      let roomId = null;

      if (myRooms && myRooms.length > 0) {
        for (const r of myRooms) {
          // Check if partner is ALSO active in this room
          const { data: partner } = await supabase
            .from('chat_participants')
            .select('user_id')
            .eq('room_id', r.room_id)
            .eq('user_id', receiverId)
            .is('left_at', null) 
            .maybeSingle();
          
          if (partner) {
            roomId = r.room_id;
            break;
          }
        }
      }

      // 2. Create NEW Room if no shared active room found
      if (!roomId) {
        const { data: newRoom, error: roomError } = await supabase
          .from('chat_rooms')
          .insert({ is_anonymous: isAnonymous })
          .select()
          .single();
        
        if (roomError) throw roomError;
        roomId = newRoom.id;

        // Add Participants
        await supabase.from('chat_participants').insert([
          { room_id: roomId, user_id: senderId },
          { room_id: roomId, user_id: receiverId }
        ]);
      } 

      // 3. Send Message
      const { error } = await supabase.from('messages').insert({
        sender_id: senderId,
        receiver_id: receiverId,
        content: content,
        room_id: roomId
      });

      if (error) throw error;
      
      alert('쪽지를 전송했습니다.');
      setContent('');
      onClose();
    } catch (error) {
      console.error(error);
      alert('전송 실패: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-fade-in-up">
        <div className="flex justify-between items-center p-4 border-b border-slate-100 bg-slate-50">
          <h3 className="font-bold text-slate-800 flex items-center gap-2">
            <PaperAirplaneIcon className="w-5 h-5 text-brand-500" />
            쪽지 보내기
          </h3>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-slate-200 transition">
            <XMarkIcon className="w-5 h-5 text-slate-500" />
          </button>
        </div>
        
        <form onSubmit={handleSend} className="p-6">
          <div className="mb-4 text-sm text-slate-600">
            받는 사람: <span className="font-bold text-slate-900">{receiverName}</span>
          </div>
          
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="내용을 입력하세요..."
            className="w-full h-32 p-3 rounded-xl border border-slate-200 focus:border-brand-500 focus:ring-2 focus:ring-brand-100 outline-none resize-none mb-4 text-sm"
            required
          />
          
          <button 
            type="submit" 
            disabled={loading}
            className="w-full btn-primary flex justify-center items-center gap-2 py-2.5"
          >
            {loading ? '전송 중...' : '보내기'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default MessageModal;