import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';
import { format } from 'date-fns';
import { ArrowLeftIcon, HandThumbUpIcon, ChatBubbleLeftIcon, EllipsisHorizontalIcon, TrashIcon, PencilIcon, ArrowUturnRightIcon, PaperAirplaneIcon, NoSymbolIcon, PaperClipIcon } from '@heroicons/react/24/outline';
import { HandThumbUpIcon as HandThumbUpIconSolid } from '@heroicons/react/24/solid';
import MessageModal from '../components/features/MessageModal';
import { useBlock } from '../context/BlockContext';

const CommentItem = ({ comment, user, postAuthorId, anonymousMap, onDelete, onReply, onLike, onMessage, onBlock, likedComments, depth = 0 }) => {
  const [isReplying, setIsReplying] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [isAnonymousReply, setIsAnonymousReply] = useState(false);
  
  const isLiked = likedComments.has(comment.id);
  const isAuthor = user && user.id === comment.author_id;

  // Determine Display Name
  let displayName = comment.profiles?.nickname;
  if (comment.is_anonymous) {
    if (comment.author_id === postAuthorId) {
      displayName = '익명(작성자)';
    } else {
      displayName = anonymousMap[comment.author_id] || '익명';
    }
  }

  const handleReplySubmit = (e) => {
    e.preventDefault();
    if (!replyText.trim()) return;
    onReply(comment.id, replyText, isAnonymousReply);
    setReplyText('');
    setIsReplying(false);
    setIsAnonymousReply(false);
  };

  return (
    <div className={`flex gap-3 group ${depth > 0 ? 'ml-12 mt-3' : 'mt-6'}`}>
      {depth > 0 && <ArrowUturnRightIcon className="w-4 h-4 text-slate-300 -ml-6 mt-2" />}
      
      <div className={`w-8 h-8 rounded-full border flex-shrink-0 flex items-center justify-center text-xs font-bold overflow-hidden
        ${comment.is_anonymous ? 'bg-slate-100 border-slate-200 text-slate-500' : 'bg-white border-slate-200 text-slate-500'}`}>
        {!comment.is_anonymous && comment.profiles?.avatar_url ? (
          <img src={comment.profiles.avatar_url} alt="avatar" className="w-full h-full object-cover" />
        ) : (
          <span>{comment.is_anonymous ? '익' : comment.profiles?.nickname?.[0]}</span>
        )}
      </div>
      
      <div className="flex-1">
        <div className="flex items-baseline gap-2 mb-1">
          <span className={`font-bold text-sm ${comment.is_anonymous && comment.author_id === postAuthorId ? 'text-brand-600' : 'text-slate-900'}`}>
            {displayName}
          </span>
          <span className="text-xs text-slate-400">
            {format(new Date(comment.created_at), 'MM.dd HH:mm')}
          </span>
        </div>
        
        <p className="text-sm text-slate-700 leading-relaxed bg-white p-3 rounded-tr-xl rounded-br-xl rounded-bl-xl shadow-sm inline-block border border-slate-100 min-w-[200px]">
          {comment.content}
        </p>

        {/* Comment Actions */}
        <div className="flex items-center gap-3 mt-1 ml-1 text-xs text-slate-400 font-medium">
          <button 
            onClick={() => onLike(comment)}
            className={`flex items-center gap-1 hover:text-brand-600 transition ${isLiked ? 'text-brand-600' : ''}`}
          >
            {isLiked ? <HandThumbUpIconSolid className="w-3.5 h-3.5" /> : <HandThumbUpIcon className="w-3.5 h-3.5" />}
            <span>{comment.like_count || 0}</span>
          </button>
          
          <button onClick={() => setIsReplying(!isReplying)} className="hover:text-slate-600 transition">
            답글달기
          </button>

          {!isAuthor && (
            <button onClick={() => onMessage(comment.author_id, displayName, comment.is_anonymous)} className="hover:text-brand-600 transition" title="쪽지 보내기">
              <PaperAirplaneIcon className="w-3.5 h-3.5" />
            </button>
          )}

          {!isAuthor && (
            <button onClick={() => onBlock(comment.author_id)} className="hover:text-red-500 transition" title="차단하기">
              <NoSymbolIcon className="w-3.5 h-3.5" />
            </button>
          )}
          
          {isAuthor && (
            <button onClick={() => onDelete(comment.id)} className="hover:text-red-500 transition">
              삭제
            </button>
          )}
        </div>

        {/* Reply Form */}
        {isReplying && (
          <form onSubmit={handleReplySubmit} className="mt-3">
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder="답글을 입력하세요..."
                className="flex-1 px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-brand-500"
                autoFocus
              />
              <button 
                type="submit"
                className="px-3 py-2 bg-slate-900 text-white text-xs font-bold rounded-lg hover:bg-slate-700"
              >
                등록
              </button>
            </div>
            <label className="flex items-center gap-1.5 cursor-pointer select-none">
              <input 
                type="checkbox" 
                className="w-3.5 h-3.5 text-slate-900 rounded border-slate-300 focus:ring-slate-900"
                checked={isAnonymousReply}
                onChange={(e) => setIsAnonymousReply(e.target.checked)}
              />
              <span className="text-xs text-slate-500">익명으로 작성</span>
            </label>
          </form>
        )}
      </div>
    </div>
  );
};

const PostDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { blockUser, isBlocked } = useBlock();
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState('');
  const [isAnonymousComment, setIsAnonymousComment] = useState(false);
  
  const [hasLiked, setHasLiked] = useState(false);
  const [likedComments, setLikedComments] = useState(new Set()); 
  const viewCounted = useRef(false);

  // Message Modal State
  const [messageModalOpen, setMessageModalOpen] = useState(false);
  const [messageTarget, setMessageTarget] = useState({ id: '', name: '', isAnonymous: false });

  const handleOpenMessage = (receiverId, receiverName, isAnonymous = false) => {
    if (!user) return alert('로그인이 필요합니다.');
    setMessageTarget({ id: receiverId, name: receiverName, isAnonymous });
    setMessageModalOpen(true);
  };

  useEffect(() => {
    fetchPostDetail();
  }, [id, user]);
  
  // Logic to generate Anonymous Aliases (익명1, 익명2...)
  const generateAnonymousMap = (comments, postAuthorId) => {
    const map = {};
    let count = 1;
    
    // Sort by creation time to ensure consistent numbering order
    comments.forEach(comment => {
      if (comment.is_anonymous && comment.author_id !== postAuthorId) {
        if (!map[comment.author_id]) {
          map[comment.author_id] = `익명${count++}`;
        }
      }
    });
    return map;
  };

  const anonymousMap = post ? generateAnonymousMap(comments, post.author_id) : {};

  const fetchPostDetail = async () => {
    setLoading(true);
    try {
      // 1. Fetch Post
      const { data: postData, error: postError } = await supabase
        .from('posts')
        .select(`*, profiles(nickname, avatar_url)`)
        .eq('id', id)
        .single();
      if (postError) throw postError;

      // 2. Fetch Comments
      const { data: commentsData, error: commentsError } = await supabase
        .from('comments')
        .select(`*, profiles(nickname, avatar_url)`)
        .eq('post_id', id)
        .order('created_at', { ascending: true });
      if (commentsError) throw commentsError;

      // 3. Fetch Likes (Post & Comments)
      if (user) {
        const { data: postLike } = await supabase
          .from('post_likes')
          .select('*')
          .eq('post_id', id)
          .eq('user_id', user.id)
          .maybeSingle();
        setHasLiked(!!postLike);

        const { data: commentLikes } = await supabase
          .from('comment_likes')
          .select('comment_id')
          .eq('user_id', user.id)
          .in('comment_id', commentsData.map(c => c.id));
        
        if (commentLikes) {
          setLikedComments(new Set(commentLikes.map(l => l.comment_id)));
        }
      }

      // 4. Increment View
      if (!viewCounted.current) {
        await supabase.rpc('increment_view_count', { post_id: id });
        viewCounted.current = true;
      }

      setPost(postData);
      setComments(commentsData || []);

    } catch (error) {
      console.error('Error fetching post:', error);
      // navigate('/board'); 
    } finally {
      setLoading(false);
    }
  };

  const handleLike = async () => {
    if (!user) return alert('로그인이 필요합니다.');
    
    const previousHasLiked = hasLiked;
    setHasLiked(!previousHasLiked);
    setPost(prev => ({ ...prev, like_count: previousHasLiked ? prev.like_count - 1 : prev.like_count + 1 }));

    try {
      if (previousHasLiked) {
        await supabase.from('post_likes').delete().eq('post_id', id).eq('user_id', user.id);
      } else {
        await supabase.from('post_likes').insert({ post_id: id, user_id: user.id });
      }
    } catch (error) {
      setHasLiked(previousHasLiked);
      alert('오류가 발생했습니다.');
    }
  };

  const handleCommentLike = async (comment) => {
    if (!user) return alert('로그인이 필요합니다.');
    
    const isLiked = likedComments.has(comment.id);
    const newLikedComments = new Set(likedComments);
    if (isLiked) newLikedComments.delete(comment.id);
    else newLikedComments.add(comment.id);
    
    setLikedComments(newLikedComments);
    
    // Optimistic Update Comment Count in List
    setComments(prev => prev.map(c => 
      c.id === comment.id 
        ? { ...c, like_count: isLiked ? (c.like_count - 1) : (c.like_count + 1) } 
        : c
    ));

    try {
      if (isLiked) {
        await supabase.from('comment_likes').delete().eq('comment_id', comment.id).eq('user_id', user.id);
      } else {
        await supabase.from('comment_likes').insert({ comment_id: comment.id, user_id: user.id });
      }
    } catch (error) {
      setLikedComments(likedComments); // Revert
      console.error(error);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('정말 삭제하시겠습니까?')) return;
    const { error } = await supabase.from('posts').delete().eq('id', id);
    if (!error) navigate('/board');
  };

  const handleCommentDelete = async (commentId) => {
    if (!window.confirm('댓글을 삭제하시겠습니까?')) return;
    const { error } = await supabase.from('comments').delete().eq('id', commentId);
    if (!error) {
      setComments(prev => prev.filter(c => c.id !== commentId && c.parent_id !== commentId));
    }
  };

  const handleCommentSubmit = async (e, parentId = null, content = commentText, isAnonymous = isAnonymousComment) => {
    if (e) e.preventDefault();
    if (!user) return alert('로그인이 필요합니다.');
    if (!content.trim()) return;

    const { data, error } = await supabase.from('comments').insert({
      post_id: id,
      author_id: user.id,
      content: content,
      parent_id: parentId,
      is_anonymous: isAnonymous
    }).select(`*, profiles(nickname, avatar_url)`).single();

    if (!error && data) {
      setComments(prev => [...prev, data]);
      if (!parentId) {
        setCommentText(''); // Clear main input
        setIsAnonymousComment(false); // Reset checkbox
      }
    } else {
      alert('댓글 작성 실패: ' + error.message);
    }
  };

  if (loading) return <div className="text-center py-40">로딩중...</div>;
  if (!post) return null;

  const isAuthor = user && user.id === post.author_id;
  
  const rootComments = comments.filter(c => !c.parent_id && !isBlocked(c.author_id));
  const getReplies = (parentId) => comments.filter(c => c.parent_id === parentId && !isBlocked(c.author_id));

  return (
    <div className="max-w-3xl mx-auto px-4 pt-32 pb-20">
      <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-slate-500 hover:text-slate-900 mb-6 transition">
        <ArrowLeftIcon className="w-4 h-4" />
        목록으로
      </button>

      <article className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden mb-8">
        <div className="p-6 md:p-8">
          <div className="flex justify-between items-center mb-4">
            <span className="text-brand-600 font-bold bg-brand-50 px-3 py-1 rounded-full text-xs">
              {post.category}
            </span>
            <span className="text-slate-400 text-sm">
              {format(new Date(post.created_at), 'yyyy.MM.dd HH:mm')}
            </span>
          </div>

          <h1 className="text-2xl md:text-3xl font-bold text-slate-900 mb-6 leading-tight">
            {post.title}
          </h1>

          <div className="flex items-center justify-between border-b border-slate-100 pb-6 mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center text-slate-400 overflow-hidden">
                {/* Avatar Rendering Logic with Anonymous Check */}
                {!post.is_anonymous && post.profiles?.avatar_url ? (
                  <img src={post.profiles.avatar_url} alt="avatar" className="w-full h-full object-cover" />
                ) : (
                  <span className="font-bold text-sm">
                     {post.is_anonymous ? '익' : post.profiles?.nickname?.[0]}
                  </span>
                )}
              </div>
              <div>
                <p className="font-bold text-slate-900 text-sm">
                  {post.is_anonymous ? '익명' : post.profiles?.nickname}
                </p>
                <p className="text-xs text-slate-400">조회 {post.view_count}</p>
              </div>
            </div>

            {isAuthor && (
              <div className="flex gap-2">
                <button className="p-2 text-slate-400 hover:text-brand-600 hover:bg-brand-50 rounded-full transition">
                  <PencilIcon className="w-5 h-5" />
                </button>
                <button onClick={handleDelete} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-full transition">
                  <TrashIcon className="w-5 h-5" />
                </button>
              </div>
            )}
          </div>

          <div className="prose prose-slate max-w-none mb-10 whitespace-pre-wrap leading-relaxed text-slate-700">
            {post.content}
          </div>

          {/* Attachments Section */}
          {post.attachments && post.attachments.length > 0 && (
            <div className="mb-8 space-y-2">
              <h4 className="text-sm font-bold text-slate-900 mb-2 flex items-center gap-2">
                <PaperClipIcon className="w-4 h-4" />
                첨부파일 <span className="text-slate-400 font-normal">{post.attachments.length}</span>
              </h4>
              <div className="grid gap-2 sm:grid-cols-2">
                {post.attachments.map((file, idx) => (
                  <a 
                    key={idx}
                    href={file.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between p-3 rounded-xl border border-slate-200 hover:border-brand-300 hover:bg-brand-50/30 transition group"
                  >
                    <div className="flex items-center gap-3 overflow-hidden">
                      <div className="p-2 bg-slate-100 rounded-lg text-slate-500 group-hover:bg-white group-hover:text-brand-500 transition">
                        <PaperClipIcon className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-700 truncate group-hover:text-brand-700 transition">{file.name}</p>
                        <p className="text-xs text-slate-400">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                      </div>
                    </div>
                  </a>
                ))}
              </div>
            </div>
          )}

          {post.media_urls && post.media_urls.length > 0 && (
             <div className="grid grid-cols-1 gap-4 mb-8">
                {post.media_urls.map((url, idx) => (
                  <img key={idx} src={url} alt={`attachment-${idx}`} className="rounded-xl w-full object-cover max-h-[500px]" />
                ))}
             </div>
          )}

          <div className="flex justify-start gap-3">
             <button 
               onClick={handleLike}
               className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border transition group ${
                 hasLiked 
                   ? 'border-brand-500 bg-brand-50 text-brand-600' 
                   : 'border-slate-200 text-slate-500 hover:border-brand-200 hover:text-brand-600 hover:bg-brand-50'
               }`}
             >
               {hasLiked ? <HandThumbUpIconSolid className="w-4 h-4" /> : <HandThumbUpIcon className="w-4 h-4 group-hover:scale-110 transition-transform" />}
               <span className="text-sm font-bold">{post.like_count}</span>
             </button>

             {!isAuthor && (
                <>
                  <button 
                    onClick={() => handleOpenMessage(post.author_id, post.is_anonymous ? '익명' : post.profiles?.nickname, post.is_anonymous)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-slate-200 text-slate-500 hover:border-brand-200 hover:text-brand-600 hover:bg-brand-50 transition group"
                    title="작성자에게 쪽지 보내기"
                  >
                    <PaperAirplaneIcon className="w-4 h-4 group-hover:rotate-12 transition-transform" />
                    <span className="text-sm font-bold">쪽지</span>
                  </button>
                  <button
                    onClick={() => blockUser(post.author_id)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-slate-200 text-slate-500 hover:border-red-200 hover:text-red-600 hover:bg-red-50 transition group"
                    title="이 사용자 차단하기"
                  >
                    <NoSymbolIcon className="w-4 h-4" />
                    <span className="text-sm font-bold">차단</span>
                  </button>
                </>
             )}
          </div>
        </div>
      </article>

      <section className="bg-slate-50 rounded-2xl p-6 md:p-8 border border-slate-200/50">
        <h3 className="font-bold text-slate-900 mb-6 flex items-center gap-2">
          <ChatBubbleLeftIcon className="w-5 h-5" />
          댓글 <span className="text-brand-600">{comments.filter(c => !isBlocked(c.author_id)).length}</span>
        </h3>

        <div className="space-y-1 mb-10">
           {rootComments.map(comment => (
             <React.Fragment key={comment.id}>
               <CommentItem 
                 comment={comment} 
                 user={user} 
                 postAuthorId={post.author_id}
                 anonymousMap={anonymousMap}
                 onDelete={handleCommentDelete} 
                 onReply={(id, text, isAnon) => handleCommentSubmit(null, id, text, isAnon)}
                 onLike={handleCommentLike}
                 onMessage={handleOpenMessage}
                 onBlock={blockUser}
                 likedComments={likedComments}
               />
               {getReplies(comment.id).map(reply => (
                 <CommentItem 
                   key={reply.id} 
                   comment={reply} 
                   user={user} 
                   postAuthorId={post.author_id}
                   anonymousMap={anonymousMap}
                   onDelete={handleCommentDelete} 
                   onReply={(id, text, isAnon) => handleCommentSubmit(null, comment.id, text, isAnon)}
                   onLike={handleCommentLike}
                   onMessage={handleOpenMessage}
                   onBlock={blockUser}
                   likedComments={likedComments}
                   depth={1}
                 />
               ))}
             </React.Fragment>
           ))}
           {comments.length === 0 && <p className="text-center text-slate-400 text-sm py-4">첫 번째 댓글을 남겨보세요!</p>}
        </div>

        <form onSubmit={(e) => handleCommentSubmit(e)} className="relative">
          <textarea
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            placeholder={user ? "댓글을 입력하세요..." : "로그인이 필요합니다."}
            disabled={!user}
            className="w-full p-4 pr-24 rounded-xl border border-slate-200 focus:border-brand-500 focus:ring-2 focus:ring-brand-100 outline-none resize-none h-24 text-sm disabled:bg-slate-100"
          />
          <div className="absolute bottom-3 right-3 flex items-center gap-3">
             <label className="flex items-center gap-1.5 cursor-pointer select-none">
                <input 
                  type="checkbox" 
                  className="w-3.5 h-3.5 text-slate-900 rounded border-slate-300 focus:ring-slate-900"
                  checked={isAnonymousComment}
                  onChange={(e) => setIsAnonymousComment(e.target.checked)}
                />
                <span className="text-xs text-slate-500">익명</span>
             </label>
            <button 
              type="submit"
              disabled={!user || !commentText.trim()}
              className="px-4 py-1.5 bg-brand-600 text-white text-xs font-bold rounded-lg hover:bg-brand-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition"
            >
              등록
            </button>
          </div>
        </form>
      </section>

      {/* Message Modal */}
      <MessageModal 
        isOpen={messageModalOpen} 
        onClose={() => setMessageModalOpen(false)}
        receiverId={messageTarget.id}
        receiverName={messageTarget.name}
        senderId={user?.id}
        isAnonymous={messageTarget.isAnonymous}
      />
    </div>
  );
};

export default PostDetail;