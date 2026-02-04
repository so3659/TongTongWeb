import React, { useEffect, useState, useRef } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';

const MyPosts = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [posts, setPosts] = useState([]);
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
      fetchPosts(0, true);
    }
  }, [user]);

  useEffect(() => {
    if (page > 0 && user) {
      fetchPosts(page, false);
    }
  }, [page]);

  const fetchPosts = async (pageNumber, isReset) => {
    setLoading(true);
    try {
      const from = pageNumber * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;
      
      const { data } = await supabase
        .from('posts')
        .select('*')
        .eq('author_id', user.id)
        .order('created_at', { ascending: false })
        .range(from, to);
      
      const newData = data || [];
      setPosts(prev => isReset ? newData : [...prev, ...newData]);
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
        <h1 className="text-2xl font-bold text-slate-900">내가 쓴 글</h1>
      </div>

      <div className="space-y-4">
        {posts.length > 0 ? posts.map((post, idx) => {
          const isLast = idx === posts.length - 1;
          return (
            <div 
              ref={isLast ? lastElementRef : null}
              key={post.id} 
              onClick={() => navigate(`/board/${post.id}`)}
              className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm hover:border-slate-300 hover:shadow-md transition cursor-pointer"
            >
              <div className="flex justify-between items-start mb-2">
                <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">{post.category}</span>
                <span className="text-xs text-slate-400">{format(new Date(post.created_at), 'yyyy.MM.dd')}</span>
              </div>
              <h3 className="font-bold text-slate-800 text-lg mb-3">{post.title}</h3>
              <div className="flex gap-3 text-xs text-slate-400">
                <span>조회 {post.view_count}</span>
                <span>좋아요 {post.like_count}</span>
              </div>
            </div>
          );
        }) : (
          !loading && <div className="text-center py-20 text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200">작성한 게시글이 없습니다.</div>
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

export default MyPosts;
