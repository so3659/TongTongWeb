import React, { createContext, useState, useEffect, useContext } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from './AuthContext';

const BlockContext = createContext();

export const BlockProvider = ({ children }) => {
  const { user } = useAuth();
  const [blockedIds, setBlockedIds] = useState(new Set());
  const [blockedUsers, setBlockedUsers] = useState([]); // Detailed info for management list

  useEffect(() => {
    if (user) fetchBlocks();
    else {
      setBlockedIds(new Set());
      setBlockedUsers([]);
    }
  }, [user]);

  const fetchBlocks = async () => {
    // Fetch blocks with blocked user profile
    const { data, error } = await supabase
      .from('user_blocks')
      .select(`
        id,
        blocked_id,
        blocked_user:blocked_id (
          nickname,
          avatar_url
        )
      `)
      .eq('blocker_id', user.id);

    if (error) {
      console.error('Error fetching blocks:', error);
      return;
    }

    const ids = new Set(data.map(b => b.blocked_id));
    setBlockedIds(ids); // Set state with new Set
    setBlockedUsers(data.map(b => ({
      id: b.id, 
      blockedId: b.blocked_id,
      nickname: b.blocked_user?.nickname || '알 수 없음',
      avatar_url: b.blocked_user?.avatar_url
    })));
  };

  const blockUser = async (targetId) => {
    if (!user) return alert('로그인이 필요합니다.');
    if (targetId === user.id) return alert('자신을 차단할 수 없습니다.');
    if (blockedIds.has(targetId)) return alert('이미 차단한 유저입니다.');

    if (!confirm('이 유저를 차단하시겠습니까? 게시글, 댓글, 쪽지가 모두 숨겨집니다.')) return;

    const { error } = await supabase
      .from('user_blocks')
      .insert({ blocker_id: user.id, blocked_id: targetId });

    if (error) {
      alert('차단 실패: ' + error.message);
    } else {
      // Logic: Leave existing chat rooms with this user
      // Find rooms where both are participants
      const { data: myRooms } = await supabase
        .from('chat_participants')
        .select('room_id')
        .eq('user_id', user.id);
      
      if (myRooms && myRooms.length > 0) {
        for (const room of myRooms) {
           const { data: partner } = await supabase
             .from('chat_participants')
             .select('user_id')
             .eq('room_id', room.room_id)
             .eq('user_id', targetId)
             .maybeSingle();
           
           if (partner) {
             // Found shared room, leave it
             await supabase
               .from('chat_participants')
               .update({ left_at: new Date().toISOString() })
               .eq('room_id', room.room_id)
               .eq('user_id', user.id);
           }
        }
      }

      alert('차단되었습니다. 기존 대화방에서도 나갑니다.');
      await fetchBlocks(); 
    }
  };

  const unblockUser = async (targetId) => {
    // targetId can be blocked_id or block relationship id depending on context.
    // For management list, we likely use relationship ID or blocked_id.
    // Let's assume we delete by blocked_id for consistency in API.
    
    const { error } = await supabase
      .from('user_blocks')
      .delete()
      .eq('blocker_id', user.id)
      .eq('blocked_id', targetId);

    if (error) {
      alert('차단 해제 실패: ' + error.message);
    } else {
      fetchBlocks();
    }
  };

  // Helper to check filtering
  const isBlocked = (authorId) => blockedIds.has(authorId);

  return (
    <BlockContext.Provider value={{ blockedIds, blockedUsers, blockUser, unblockUser, isBlocked, fetchBlocks }}>
      {children}
    </BlockContext.Provider>
  );
};

export const useBlock = () => useContext(BlockContext);
