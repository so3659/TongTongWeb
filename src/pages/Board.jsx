import React, { useEffect, useState, useRef, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { PencilSquareIcon, ChatBubbleLeftIcon, EyeIcon, HandThumbUpIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { MegaphoneIcon, FunnelIcon } from '@heroicons/react/24/solid';
import { format } from 'date-fns';
import { useBlock } from '../context/BlockContext'; // Import useBlock

const CATEGORIES = ['전체', '공지', '자유', '연습실', '맛집', '번개', '아이돌', '기타'];
const PAGE_SIZE = 10;

const PostList = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { blockedIds } = useBlock(); // Get blocked IDs
  const [pinnedNotices, setPinnedNotices] = useState([]);
  const [posts, setPosts] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  
  // Filters State
  const [selectedCategory, setSelectedCategory] = useState(location.state?.category || '전체');
  const [sortBy, setSortBy] = useState('latest'); // 'latest' | 'likes'
  const [searchKeyword, setSearchKeyword] = useState('');
  const [searchInput, setSearchInput] = useState(''); // Input value state

  // Sync category from URL search params
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const catParam = params.get('category');
    if (catParam && CATEGORIES.includes(catParam)) {
      setSelectedCategory(catParam);
    }
  }, [location.search]);

  // Infinite Scroll Observer
  const observer = useRef();
  const lastPostElementRef = useCallback(node => {
    if (loading) return;
    if (observer.current) observer.current.disconnect();
    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore) {
        setPage(prevPage => prevPage + 1);
      }
    });
    if (node) observer.current.observe(node);
  }, [loading, hasMore]);

  // 0. Disable Browser Scroll Restoration
  useEffect(() => {
    if ('scrollRestoration' in history) {
      history.scrollRestoration = 'manual';
    }
    return () => {
      if ('scrollRestoration' in history) {
        history.scrollRestoration = 'auto';
      }
    };
  }, []);

  // Scroll Restoration Logic
  useEffect(() => {
    const savedScroll = sessionStorage.getItem('board_scroll_pos');
    if (savedScroll && posts.length > 0) {
      // Use requestAnimationFrame or timeout to ensure DOM layout
      setTimeout(() => {
        const yPos = parseInt(savedScroll);
        window.scrollTo({ top: yPos, behavior: 'auto' }); // 'auto' allows instant jump
        
        // Only clear if we actually scrolled near the target (optional check)
        // Or just clear it.
        sessionStorage.removeItem('board_scroll_pos');
        sessionStorage.removeItem('board_page');
        sessionStorage.removeItem('board_filters');
      }, 100);
    }
  }, [posts]);

  // 1. Initial Load & Filter Change (Reset List or Restore)
  useEffect(() => {
    fetchPinnedNotices();

    const savedScroll = sessionStorage.getItem('board_scroll_pos');
    const savedPage = sessionStorage.getItem('board_page');
    const savedFiltersStr = sessionStorage.getItem('board_filters');

    // Check if we should restore
    let shouldRestore = false;
    if (savedScroll && savedPage && savedFiltersStr) {
      const savedFilters = JSON.parse(savedFiltersStr);
      if (
        savedFilters.category === selectedCategory &&
        savedFilters.sort === sortBy &&
        savedFilters.search === searchKeyword
      ) {
        shouldRestore = true;
      }
    }

    if (shouldRestore) {
      // RESTORE MODE: Fetch from 0 to target page
      const targetPage = parseInt(savedPage);
      const to = (targetPage + 1) * PAGE_SIZE - 1;
      
      setLoading(true);
      let query = supabase
        .from('posts')
        .select('*, profiles(nickname)', { count: 'exact' });

      // Apply Filters (Same as fetchPosts)
      if (selectedCategory !== '전체') query = query.eq('category', selectedCategory);
      if (searchKeyword) query = query.or(`title.ilike.%${searchKeyword}%,content.ilike.%${searchKeyword}%`);
      if (blockedIds.length > 0) query = query.not('author_id', 'in', `(${blockedIds.join(',')})`);

      // Sort
      if (sortBy === 'likes') {
        query = query.order('like_count', { ascending: false }).order('created_at', { ascending: false });
      } else {
        query = query.order('created_at', { ascending: false });
      }

      query.range(0, to)
        .then(({ data, count, error }) => {
          if (error) throw error;
          setPosts(data || []);
          setTotalCount(count || 0);
          setPage(targetPage); // Restore page number
          setHasMore((data || []).length === (targetPage + 1) * PAGE_SIZE); // Approximate check
        })
        .catch(err => console.error('Restoration error:', err))
        .finally(() => setLoading(false));

    } else {
      // NORMAL MODE
      sessionStorage.removeItem('board_scroll_pos'); // Clear valid trash
      sessionStorage.removeItem('board_page');
      sessionStorage.removeItem('board_filters');
      
      setPage(0);
      setHasMore(true);
      fetchPosts(0, true);
    }
  }, [selectedCategory, sortBy, searchKeyword, blockedIds]);

  // 2. Load More (Pagination)
  useEffect(() => {
    if (page > 0) {
      fetchPosts(page, false);
    }
  }, [page]);

  const fetchPinnedNotices = async () => {
    // Logic changed: Always fetch pinned notices regardless of search/filter
    // However, if we filter by a specific category other than 'Notice', maybe we still want to show them?
    // User Request: "Always show notices on top even when searching".
    
    // We keep them visible unless user specifically filters for a category that isn't 'All' or 'Notice' 
    // AND we want to respect the 'search' context. 
    // Actually, simply removing the conditional return allows them to be fetched always.
    
    // But typically, if I filter for 'Restaurant', I might not want general notices? 
    // Let's stick to the prompt: "Even when searching".
    
    // If category is not All/Notice, we might hide them? 
    // Let's assume 'Always' means literally always for now, or at least when searching.
    
    // Let's keep the category restriction (if I go to 'Practice Room', I only want practice room posts),
    // BUT allow 'searchKeyword' and 'sortBy'.
    
    if (selectedCategory !== '전체' && selectedCategory !== '공지') {
       setPinnedNotices([]);
       return;
    }

    const { data } = await supabase
      .from('posts')
      .select(`*, profiles(nickname)`)
      .eq('category', '공지')
      .order('created_at', { ascending: false })
      .limit(2);
    
    setPinnedNotices(data || []);
  };

  const fetchPosts = async (pageNumber, isReset, currentSearch = searchKeyword, currentCategory = selectedCategory) => {
    setLoading(true);
    try {
      const from = pageNumber * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      let query = supabase
        .from('posts')
        .select('*, profiles(nickname)', { count: 'exact' });

      // Apply Filters
      if (currentCategory !== '전체') {
        query = query.eq('category', currentCategory);
      }
      if (currentSearch) {
        query = query.or(`title.ilike.%${currentSearch}%,content.ilike.%${currentSearch}%`);
      }
      
      // Exclude blocked users' posts
      if (blockedIds.length > 0) {
        query = query.not('author_id', 'in', `(${blockedIds.join(',')})`);
      }

      // Sort Order
      if (sortBy === 'likes') {
        query = query.order('like_count', { ascending: false }).order('created_at', { ascending: false });
      } else {
        query = query.order('created_at', { ascending: false });
      }

      const { data, count, error } = await query.range(from, to);

      if (error) throw error;

      const newData = data || [];
      setPosts(prev => {
        if (isReset) return newData;
        // Dedup: Filter out posts that already exist in prev
        const existingIds = new Set(prev.map(p => p.id));
        const uniqueNewData = newData.filter(p => !existingIds.has(p.id));
        return [...prev, ...uniqueNewData];
      });
      setTotalCount(count || 0);
      setHasMore(newData.length === PAGE_SIZE);
    } catch (error) {
      console.error('Error fetching posts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePostClick = (postId) => {
    sessionStorage.setItem('board_scroll_pos', window.scrollY.toString());
    sessionStorage.setItem('board_page', page.toString());
    sessionStorage.setItem('board_filters', JSON.stringify({
      category: selectedCategory,
      sort: sortBy,
      search: searchKeyword
    }));
    navigate(`/board/${postId}`);
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setSearchKeyword(searchInput);
  };

  // Helper to strip HTML tags
  const getPreviewText = (htmlContent) => {
    if (!htmlContent) return '';
    return htmlContent.replace(/<[^>]*>?/gm, '');
  };

  const PostCard = React.forwardRef(({ post, isNotice }, ref) => {
    const navigate = useNavigate();
    const hasImage = post.media_urls && post.media_urls.length > 0;
    const thumbnail = hasImage ? post.media_urls[0] : null;

    return (
      <div 
        ref={ref}
        onClick={() => handlePostClick(post.id)}
        className="bg-white p-6 border-b md:border border-slate-200 md:rounded-lg hover:bg-slate-50 transition cursor-pointer flex flex-col h-full relative group"
      >
        {/* Top: Category & Meta */}
        <div className="flex justify-between items-start mb-2">
          <span className={`text-xs font-semibold ${isNotice ? 'text-brand-600' : 'text-slate-400'}`}>
            {isNotice ? '📢 공지' : post.category}
          </span>
          <span className="text-xs text-slate-400">
            {format(new Date(post.created_at), 'MM.dd')}
          </span>
        </div>

        {/* Title */}
        <h3 className="text-lg font-bold text-slate-900 mb-2 leading-tight group-hover:text-brand-600 transition-colors line-clamp-1">
          {post.title}
        </h3>

        {/* Middle: Content Preview & Thumbnail */}
        <div className="flex justify-between gap-4 mb-8 flex-1">
          <p className="text-sm text-slate-600 line-clamp-3 leading-relaxed break-all">
            {getPreviewText(post.content)}
          </p>
          
          {hasImage && (
            <div className="w-20 h-20 flex-shrink-0 rounded-lg overflow-hidden bg-slate-100 border border-slate-100">
              <img src={thumbnail} alt="thumbnail" className="w-full h-full object-cover" />
            </div>
          )}
        </div>

        {/* Bottom: Author & Stats */}
        <div className="flex items-center justify-between mt-auto text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <span className="font-medium text-slate-500 truncate max-w-[100px]">
              {post.is_anonymous ? '익명' : post.profiles?.nickname || '알 수 없음'}
            </span>
            <span className="w-0.5 h-2 bg-slate-200"></span>
            <span className="flex items-center gap-1"><EyeIcon className="w-3.5 h-3.5" /> {post.view_count}</span>
            <span className="flex items-center gap-1"><HandThumbUpIcon className="w-3.5 h-3.5" /> {post.like_count}</span>
          </div>

          <div className="flex items-center gap-1 text-slate-400">
            <ChatBubbleLeftIcon className="w-4 h-4" />
            <span className="font-medium">{post.comment_count || 0}</span>
          </div>
        </div>
      </div>
    );
  });

  return (
    <div className="max-w-5xl mx-auto px-4 pb-20 pt-32">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 border-b border-slate-200 pb-6 gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-slate-900 mb-2">통통 라운지</h1>
          <p className="text-slate-500">자유롭게 이야기하고 정보를 나누세요.</p>
        </div>
        <Link to="/board/write" className="btn-primary flex items-center gap-2 text-sm px-5 py-2.5 shadow-none rounded-full self-start md:self-auto">
          <PencilSquareIcon className="w-4 h-4" />
          글쓰기
        </Link>
      </div>

      {/* Controls: Search & Sort */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-6">
        {/* Category Filter */}
        <div className="flex gap-2 overflow-x-auto pb-2 w-full md:w-auto scrollbar-hide">
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-all duration-200 ${
                selectedCategory === cat 
                  ? 'bg-slate-900 text-white' 
                  : 'bg-white border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Right Controls */}
        <div className="flex w-full md:w-auto gap-2">
          {/* Search Bar */}
          <form onSubmit={handleSearch} className="relative flex-1 md:w-64">
            <input 
              type="text" 
              placeholder="제목, 내용 검색" 
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-full text-sm focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none transition"
            />
            <MagnifyingGlassIcon className="absolute left-3.5 top-2.5 w-4 h-4 text-slate-400" />
          </form>

          {/* Sort Dropdown */}
          <div className="relative">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="appearance-none pl-4 pr-10 py-2 bg-white border border-slate-200 rounded-full text-sm font-medium focus:ring-2 focus:ring-slate-900 outline-none cursor-pointer"
            >
              <option value="latest">최신순</option>
              <option value="likes">추천순</option>
            </select>
            <FunnelIcon className="absolute right-3 top-2.5 w-4 h-4 text-slate-400 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Post List Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-4 md:gap-y-6">
        
        {/* Pinned Notices */}
        {pinnedNotices.map(post => (
          <PostCard key={post.id} post={post} isNotice={true} />
        ))}

        {/* Regular Posts */}
        {posts.map((post, index) => {
          if (posts.length === index + 1) {
            return <PostCard ref={lastPostElementRef} key={post.id} post={post} isNotice={false} />;
          } else {
            return <PostCard key={post.id} post={post} isNotice={false} />;
          }
        })}

        {/* Loading & Empty States */}
        {loading && (
          <div className="col-span-full py-10 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-brand-100 border-t-brand-500"></div>
          </div>
        )}

        {!loading && posts.length === 0 && pinnedNotices.length === 0 && (
          <div className="col-span-full py-20 text-center bg-white rounded-xl border border-dashed border-slate-200">
            <p className="text-slate-400 mb-2">
              {searchKeyword ? `'${searchKeyword}'에 대한 검색 결과가 없습니다.` : '등록된 게시글이 없습니다.'}
            </p>
            {!searchKeyword && (
              <Link to="/board/write" className="text-brand-600 font-bold hover:underline text-sm">
                첫 번째 글을 작성해보세요!
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default PostList;
