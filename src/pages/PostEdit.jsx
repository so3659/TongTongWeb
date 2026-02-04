import React, { useState, useRef, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { PhotoIcon, XMarkIcon, PaperClipIcon, DocumentIcon, ArrowLeftIcon } from '@heroicons/react/24/outline';

const CATEGORIES = ['자유', '연습실', '맛집', '번개', '기타', '공지'];

const PostEdit = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  
  const [formData, setFormData] = useState({
    title: '',
    category: '자유',
    content: '',
    is_anonymous: false
  });

  // Existing files from DB
  const [existingImages, setExistingImages] = useState([]);
  const [existingAttachments, setExistingAttachments] = useState([]);
  
  // New files to upload
  const [newImages, setNewImages] = useState([]);
  const [newPreviewUrls, setNewPreviewUrls] = useState([]);
  const imageInputRef = useRef(null);

  const [newAttachments, setNewAttachments] = useState([]);
  const attachmentInputRef = useRef(null);

  // Files marked for deletion from storage
  const [filesToDelete, setFilesToDelete] = useState([]);

  useEffect(() => {
    if (user) {
      checkRole();
      fetchPost();
    }
  }, [user, id]);

  const checkRole = async () => {
    const { data } = await supabase.from('profiles').select('role').eq('id', user.id).single();
    if (data?.role === 'admin' || data?.role === 'master') {
      setIsAdmin(true);
    }
  };

  const fetchPost = async () => {
    try {
      const { data, error } = await supabase
        .from('posts')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) throw error;
      if (data.author_id !== user.id) {
        alert('수정 권한이 없습니다.');
        navigate('/board');
        return;
      }

      setFormData({
        title: data.title,
        category: data.category,
        content: data.content,
        is_anonymous: data.is_anonymous
      });
      setExistingImages(data.media_urls || []);
      setExistingAttachments(data.attachments || []);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching post:', error);
      alert('게시글을 불러올 수 없습니다.');
      navigate('/board');
    }
  };

  const handleCategoryChange = (e) => {
    const newCat = e.target.value;
    if (newCat === '공지' && !isAdmin) {
      alert('공지사항은 관리자만 작성할 수 있습니다.');
      return;
    }
    setFormData({ ...formData, category: newCat });
  };

  // Image Logic
  const handleImageChange = (e) => {
    const selectedFiles = Array.from(e.target.files);
    if (selectedFiles.length + newImages.length + existingImages.length > 10) {
      alert('이미지는 최대 10장까지 가능합니다.');
      return;
    }
    setNewImages(prev => [...prev, ...selectedFiles]);
    const newPreviews = selectedFiles.map(file => URL.createObjectURL(file));
    setNewPreviewUrls(prev => [...prev, ...newPreviews]);
  };

  const removeExistingImage = (url) => {
    setExistingImages(prev => prev.filter(item => item !== url));
    setFilesToDelete(prev => [...prev, { url, bucket: 'post-images' }]);
  };

  const removeNewImage = (index) => {
    setNewImages(prev => prev.filter((_, i) => i !== index));
    setNewPreviewUrls(prev => {
      URL.revokeObjectURL(prev[index]);
      return prev.filter((_, i) => i !== index);
    });
  };

  // Attachment Logic
  const handleAttachmentChange = (e) => {
    const selectedFiles = Array.from(e.target.files);
    if (selectedFiles.length + newAttachments.length + existingAttachments.length > 1) {
      alert('첨부파일은 최대 1개까지만 가능합니다.');
      return;
    }
    const validFiles = selectedFiles.filter(file => file.size <= 5 * 1024 * 1024);
    if (validFiles.length < selectedFiles.length) {
      alert('5MB를 초과하는 파일은 제외되었습니다.');
    }
    setNewAttachments(prev => [...prev, ...validFiles]);
  };

  const removeExistingAttachment = (file) => {
    setExistingAttachments(prev => prev.filter(item => item.url !== file.url));
    setFilesToDelete(prev => [...prev, { url: file.url, bucket: 'post-attachments' }]);
  };

  const removeNewAttachment = (index) => {
    setNewAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const uploadFiles = async () => {
    const uploadedImages = [];
    const uploadedAttachments = [];

    // 1. Upload New Images
    for (const file of newImages) {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `${user.id}/${fileName}`;
      const { error } = await supabase.storage.from('post-images').upload(filePath, file);
      if (error) throw error;
      const { data } = supabase.storage.from('post-images').getPublicUrl(filePath);
      uploadedImages.push(data.publicUrl);
    }

    // 2. Upload New Attachments
    for (const file of newAttachments) {
      const fileExt = file.name.split('.').pop();
      const randomName = `${Date.now()}_${Math.random().toString(36).substring(2, 9)}.${fileExt}`;
      const filePath = `${user.id}/${randomName}`;
      const { error } = await supabase.storage.from('post-attachments').upload(filePath, file);
      if (error) throw error;
      const { data } = supabase.storage.from('post-attachments').getPublicUrl(filePath);
      uploadedAttachments.push({
        name: file.name,
        url: data.publicUrl,
        size: file.size
      });
    }

    return { uploadedImages, uploadedAttachments };
  };

  const cleanupStorage = async () => {
    for (const file of filesToDelete) {
      const path = file.url.split(`/${file.bucket}/`)[1];
      if (path) {
        await supabase.storage.from(file.bucket).remove([path]);
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const { uploadedImages, uploadedAttachments } = await uploadFiles();

      const finalImages = [...existingImages, ...uploadedImages];
      const finalAttachments = [...existingAttachments, ...uploadedAttachments];

      const { error } = await supabase
        .from('posts')
        .update({
          title: formData.title,
          category: formData.category,
          content: formData.content,
          is_anonymous: formData.is_anonymous,
          media_urls: finalImages,
          attachments: finalAttachments,
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      if (error) throw error;

      await cleanupStorage();
      
      alert('게시글이 수정되었습니다.');
      navigate(`/board/${id}`);
    } catch (error) {
      console.error('Update failed:', error);
      alert('수정 실패: ' + error.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="text-center py-40">로딩중...</div>;

  return (
    <div className="max-w-3xl mx-auto px-4 pt-32 pb-20">
      <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-slate-500 hover:text-slate-900 mb-6 transition">
        <ArrowLeftIcon className="w-4 h-4" />
        돌아가기
      </button>

      <h1 className="text-2xl font-bold text-slate-900 mb-6">게시글 수정</h1>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="flex flex-col sm:flex-row gap-4 justify-between sm:items-center">
          <div className="flex gap-4 items-center">
            <label className="text-sm font-medium text-slate-700">카테고리</label>
            <select 
              className="p-2 rounded-lg border border-slate-300 bg-white"
              value={formData.category}
              onChange={handleCategoryChange}
            >
              {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
            </select>
          </div>
        </div>

        <input 
          type="text" 
          placeholder="제목"
          className="w-full text-lg px-4 py-3 rounded-xl border border-slate-300 outline-none focus:border-brand-500 transition"
          value={formData.title}
          onChange={e => setFormData({...formData, title: e.target.value})}
          required
        />

        <div className="relative">
          <textarea 
            placeholder="내용을 작성해주세요."
            className="w-full h-80 px-4 py-4 rounded-xl border border-slate-300 outline-none focus:border-brand-500 transition resize-none"
            value={formData.content}
            onChange={e => setFormData({...formData, content: e.target.value})}
            required
          />
          <div className="absolute bottom-4 left-4 flex gap-2">
            <input type="file" accept="image/*" multiple className="hidden" ref={imageInputRef} onChange={handleImageChange} />
            <button type="button" onClick={() => imageInputRef.current.click()} className="p-2 text-slate-400 hover:text-brand-600 rounded-lg transition" title="사진 추가">
              <PhotoIcon className="w-6 h-6" />
            </button>

            <input type="file" multiple className="hidden" ref={attachmentInputRef} onChange={handleAttachmentChange} />
            <button type="button" onClick={() => attachmentInputRef.current.click()} className="p-2 text-slate-400 hover:text-brand-600 rounded-lg transition" title="파일 추가">
              <PaperClipIcon className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Media Previews */}
        {(existingImages.length > 0 || newPreviewUrls.length > 0) && (
          <div className="flex gap-3 overflow-x-auto pb-2">
            {existingImages.map((url, idx) => (
              <div key={`exist-${idx}`} className="relative w-24 h-24 flex-shrink-0 rounded-lg overflow-hidden border group">
                <img src={url} alt="existing" className="w-full h-full object-cover" />
                <button type="button" onClick={() => removeExistingImage(url)} className="absolute top-1 right-1 bg-black/50 text-white rounded-full p-0.5 hover:bg-red-500 opacity-0 group-hover:opacity-100 transition">
                  <XMarkIcon className="w-4 h-4" />
                </button>
              </div>
            ))}
            {newPreviewUrls.map((url, idx) => (
              <div key={`new-${idx}`} className="relative w-24 h-24 flex-shrink-0 rounded-lg overflow-hidden border border-brand-200 group">
                <img src={url} alt="new" className="w-full h-full object-cover" />
                <div className="absolute top-1 left-1 bg-brand-500 text-white text-[10px] px-1 rounded">New</div>
                <button type="button" onClick={() => removeNewImage(idx)} className="absolute top-1 right-1 bg-black/50 text-white rounded-full p-0.5 hover:bg-red-500 opacity-0 group-hover:opacity-100 transition">
                  <XMarkIcon className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Attachment List */}
        {(existingAttachments.length > 0 || newAttachments.length > 0) && (
          <div className="bg-slate-50 rounded-xl p-4 space-y-2">
            {existingAttachments.map((file, idx) => (
              <div key={`exist-file-${idx}`} className="flex items-center justify-between bg-white p-2 rounded-lg border border-slate-200 text-sm">
                <div className="flex items-center gap-2 truncate text-slate-600">
                  <DocumentIcon className="w-4 h-4" />
                  <span className="truncate">{file.name}</span>
                </div>
                <button type="button" onClick={() => removeExistingAttachment(file)} className="text-slate-400 hover:text-red-500 transition">
                  <XMarkIcon className="w-4 h-4" />
                </button>
              </div>
            ))}
            {newAttachments.map((file, idx) => (
              <div key={`new-file-${idx}`} className="flex items-center justify-between bg-white p-2 rounded-lg border border-brand-200 text-sm">
                <div className="flex items-center gap-2 truncate text-brand-700">
                  <DocumentIcon className="w-4 h-4" />
                  <span className="truncate">{file.name}</span>
                  <span className="text-[10px] bg-brand-100 px-1 rounded">New</span>
                </div>
                <button type="button" onClick={() => removeNewAttachment(idx)} className="text-slate-400 hover:text-red-500 transition">
                  <XMarkIcon className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="flex justify-end gap-3">
          <button type="button" onClick={() => navigate(-1)} className="px-6 py-3 rounded-xl text-slate-600 font-medium hover:bg-slate-100 transition">취소</button>
          <button type="submit" disabled={submitting} className="btn-primary">{submitting ? '수정 중...' : '수정 완료'}</button>
        </div>
      </form>
    </div>
  );
};

export default PostEdit;