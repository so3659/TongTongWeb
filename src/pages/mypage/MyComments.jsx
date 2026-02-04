import React, { useEffect, useState, useRef } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';

const MyComments = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [comments, setComments] = useState([]);
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
      fetchComments(0, true);
    }
  }, [user]);

  useEffect(() => {
    if (page > 0 && user) {
      fetchComments(page, false);
    }
  }, [page]);

  const fetchComments = async (pageNumber, isReset) => {
    setLoading(true);
    try {
      const from = pageNumber * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;
      
      const { data } = await supabase
        .from('comments')
        .select(`
          *,
          post:post_id (id, title)
        `)
        .eq('author_id', user.id)
        .order('created_at', { ascending: false })
        .range(from, to);
      
      const newData = data || [];
      setComments(prev => isReset ? newData : [...prev, ...newData]);
      setHasMore(newData.length === PAGE_SIZE);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 pt-32 pb-20">
      <div className="flex items-center gap-3 mb-8">
        <button onClick={() => navigate('/mypage')} className="p-2 hover:bg-slate-100 rounded-full transition">
          <ArrowLeftIcon className="w-5 h-5 text-slate-500" />
        </button>
        <h1 className="text-2xl font-bold text-slate-900">내가 쓴 댓글</h1>
      </div>

      <div className="space-y-4">
        {comments.length > 0 ? comments.map((comment, idx) => {
          const isLast = idx === comments.length - 1;
          return (
            <div 
              ref={isLast ? lastElementRef : null}
              key={comment.id} 
              onClick={() => navigate(`/board/${comment.post_id}`)}
              className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm hover:border-slate-300 hover:shadow-md transition cursor-pointer"
            >
              <p className="text-xs text-slate-400 mb-2">
                게시글: <span className="text-slate-600 font-bold">{comment.post?.title || '삭제된 게시글'}</span>
              </p>
              <p className="text-slate-800 font-medium mb-3 line-clamp-2 leading-relaxed">{comment.content}</p>
              <span className="text-xs text-slate-400">{format(new Date(comment.created_at), 'yyyy.MM.dd HH:mm')}</span>
            </div>
          );
        }) : (
          !loading && <div className="text-center py-20 text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200">작성한 댓글이 없습니다.</div>
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

export default MyComments;
