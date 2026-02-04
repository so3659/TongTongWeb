import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { XMarkIcon, PaperAirplaneIcon } from '@heroicons/react/24/outline';

const MessageModal = ({ isOpen, onClose, receiverId, receiverName, senderId, isAnonymous: initialAnonymous = false, postId = null }) => {
  const [content, setContent] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(initialAnonymous);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setIsAnonymous(initialAnonymous);
  }, [initialAnonymous, isOpen]);

  if (!isOpen) return null;

  const handleSend = async (e) => {
    e.preventDefault();
    if (!content.trim()) return;
    setLoading(true);

    try {
      // 0. Check Block Status
      const { data: blockCheck, error: blockError } = await supabase
        .from('user_blocks')
        .select('id')
        .eq('blocker_id', receiverId)
        .eq('blocked_id', senderId)
        .maybeSingle();
      
      if (blockError) throw blockError;
      if (blockCheck) throw new Error('상대방이 쪽지 수신을 차단했습니다.');

      // 1. Determine Room Logic
      
      let targetRoomPostId = null;
      let targetIsAnonymousRoom = false;
      let targetInitAnonymous = false; // New key for Target's Anonymity

      // Case 4: Real (Author/Commenter) - Real (Sender) -> General DM
      // Reuses existing General DM room regardless of post
      if (!isAnonymous && !initialAnonymous) {
          targetRoomPostId = null;
          targetIsAnonymousRoom = false;
          targetInitAnonymous = false;
      } else {
          // Case 1, 2, 3: Any Anonymous interaction -> Post-Bound Room
          targetRoomPostId = postId;
          
          // Use BOTH Sender's anonymity AND Target's anonymity to differentiate rooms
          // Sender Anon -> is_anonymous = true
          // Target Anon -> target_is_anonymous = true
          targetIsAnonymousRoom = isAnonymous;
          targetInitAnonymous = initialAnonymous;
      }

      // 2. Find existing room where I was the initiator with the SAME anonymity choice
      // Note: Requires 'target_is_anonymous' column in chat_rooms table
      const { data: myOwnedRooms } = await supabase
        .from('chat_participants')
        .select('room_id, chat_rooms!inner(is_anonymous, related_post_id, created_at, target_is_anonymous)')
        .eq('user_id', senderId)
        .is('left_at', null);

      let roomId = null;
      if (myOwnedRooms && myOwnedRooms.length > 0) {
        // Filter: Must match postId, is_anonymous, AND target_is_anonymous
        const matchedRoom = myOwnedRooms.find(r => 
          r.chat_rooms.related_post_id == targetRoomPostId && 
          r.chat_rooms.is_anonymous === targetIsAnonymousRoom &&
          // Handle legacy rooms where target_is_anonymous might be null (treat as false/match if targetInit is false?)
          // For strict separation, we compare equality.
          (r.chat_rooms.target_is_anonymous === targetInitAnonymous || (!r.chat_rooms.target_is_anonymous && !targetInitAnonymous))
        );

        if (matchedRoom) {
          // Check if the other person is also in THIS specific room
          const { data: partner } = await supabase
            .from('chat_participants')
            .select('user_id')
            .eq('room_id', matchedRoom.room_id)
            .eq('user_id', receiverId)
            .is('left_at', null) 
            .maybeSingle();
          
          if (partner) {
            roomId = matchedRoom.room_id;
          }
        }
      }

      // 3. Create NEW Room if no exact match found
      if (!roomId) {
        const { data: newRoom, error: roomError } = await supabase
          .from('chat_rooms')
          .insert({ 
            is_anonymous: targetIsAnonymousRoom,
            related_post_id: targetRoomPostId,
            target_is_anonymous: targetInitAnonymous // Insert new field
          })
          .select()
          .single();
        if (roomError) throw roomError;
        roomId = newRoom.id;
        await supabase.from('chat_participants').insert([
          { room_id: roomId, user_id: senderId },
          { room_id: roomId, user_id: receiverId }
        ]);
      } 

      // 4. Send Message
      const { error } = await supabase.from('messages').insert({
        sender_id: senderId,
        receiver_id: receiverId,
        content: content,
        room_id: roomId,
        is_anonymous: isAnonymous
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
          <div className="flex justify-between items-center mb-4">
            <div className="text-sm text-slate-600">
              받는 사람: <span className="font-bold text-slate-900">{receiverName}</span>
            </div>
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input 
                type="checkbox" 
                className="w-4 h-4 text-brand-600 rounded"
                checked={isAnonymous}
                onChange={e => setIsAnonymous(e.target.checked)}
              />
              <span className="text-xs text-slate-500 font-medium">익명으로 보내기</span>
            </label>
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