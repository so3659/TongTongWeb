import React, { useEffect, useState, useRef } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../context/AuthContext';
import { useBlock } from '../../context/BlockContext'; // Import useBlock
import { useNavigate } from 'react-router-dom';
import { ArrowLeftIcon, UserCircleIcon } from '@heroicons/react/24/outline';

const BlockedList = () => {
  const { user } = useAuth();
  const { unblockUser } = useBlock(); // Use context unblock
  const navigate = useNavigate();
  const [blockedUsers, setBlockedUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const PAGE_SIZE = 10;

  const observer = useRef();
  const lastElementRef = (node) => {
    if (loading) return;
    if (observer.current) observer.current.disconnect();
    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore) {
        setPage(prev => prev + 1);
      }
    });
    if (node) observer.current.observe(node);
  };

  useEffect(() => {
    if (user) {
      fetchBlockedUsers(0, true);
    }
  }, [user]);

  useEffect(() => {
    if (page > 0 && user) {
      fetchBlockedUsers(page, false);
    }
  }, [page]);

  const fetchBlockedUsers = async (pageNumber, isReset) => {
    setLoading(true);
    try {
      const from = pageNumber * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;
      
      const { data } = await supabase
        .from('user_blocks')
        .select(`
          id,
          blocked_id,
          blocked_user:blocked_id (
            nickname,
            avatar_url
          )
        `)
        .eq('blocker_id', user.id)
        .range(from, to);
        
      const formattedBlocks = (data || []).map(b => ({
        id: b.id, 
        blockedId: b.blocked_id,
        nickname: b.blocked_user?.nickname || '알 수 없음',
        avatar_url: b.blocked_user?.avatar_url
      }));
      
      setBlockedUsers(prev => isReset ? formattedBlocks : [...prev, ...formattedBlocks]);
      setHasMore(formattedBlocks.length === PAGE_SIZE);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleUnblock = async (blockedId) => {
    await unblockUser(blockedId); // Call context logic to delete from DB
    setBlockedUsers(prev => prev.filter(b => b.blockedId !== blockedId)); // Update local UI
  };

  return (
    <div className="max-w-3xl mx-auto px-4 pt-32 pb-20">
      <div className="flex items-center gap-3 mb-8">
        <button onClick={() => navigate('/mypage')} className="p-2 hover:bg-slate-100 rounded-full transition">
          <ArrowLeftIcon className="w-5 h-5 text-slate-500" />
        </button>
        <h1 className="text-2xl font-bold text-slate-900">차단 관리</h1>
      </div>

      <div className="space-y-4">
        {blockedUsers.length > 0 ? blockedUsers.map((block, idx) => {
          const isLast = idx === blockedUsers.length - 1;
          return (
            <div 
              ref={isLast ? lastElementRef : null}
              key={block.id} 
              className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm flex items-center justify-between hover:bg-slate-50 transition"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-slate-200 overflow-hidden flex items-center justify-center text-slate-400">
                  {block.avatar_url ? (
                    <img src={block.avatar_url} alt="profile" className="w-full h-full object-cover" />
                  ) : (
                    <UserCircleIcon className="w-full h-full" />
                  )}
                </div>
                <span className="font-bold text-slate-900">{block.nickname}</span>
              </div>
              <button 
                onClick={() => handleUnblock(block.blockedId)}
                className="px-3 py-1.5 text-xs font-bold text-slate-500 border border-slate-200 rounded-lg hover:text-red-600 hover:border-red-200 transition"
              >
                차단 해제
              </button>
            </div>
          );
        }) : (
          !loading && <div className="text-center py-20 text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200">차단한 유저가 없습니다.</div>
        )}
        
        {loading && (
          <div className="text-center py-10">
            <div className="inline-block animate-spin rounded-full h-6 w-6 border-4 border-brand-100 border-t-brand-500"></div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BlockedList;
