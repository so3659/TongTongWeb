import React, { useState, useRef, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { PhotoIcon, XMarkIcon, PaperClipIcon, DocumentIcon } from '@heroicons/react/24/outline';

const CATEGORIES = ['자유', '연습실', '맛집', '번개', '기타', '공지'];

const PostWrite = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  
  const [formData, setFormData] = useState({
    title: '',
    category: '자유',
    content: '',
    is_anonymous: false
  });

  const [files, setFiles] = useState([]); // Images
  const [previewUrls, setPreviewUrls] = useState([]);
  const fileInputRef = useRef(null);

  const [attachments, setAttachments] = useState([]); // General Files
  const attachmentInputRef = useRef(null);

  useEffect(() => {
    if (user) checkRole();
  }, [user]);

  const checkRole = async () => {
    const { data } = await supabase.from('profiles').select('role').eq('id', user.id).single();
    if (data?.role === 'admin' || data?.role === 'master') {
      setIsAdmin(true);
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

  // Image Logic (Existing)
  const handleFileChange = (e) => {
    const selectedFiles = Array.from(e.target.files);
    if (selectedFiles.length + files.length > 10) {
      alert('이미지는 최대 10장까지 업로드 가능합니다.');
      return;
    }
    const newFiles = [...files, ...selectedFiles];
    setFiles(newFiles);
    const newPreviews = selectedFiles.map(file => URL.createObjectURL(file));
    setPreviewUrls(prev => [...prev, ...newPreviews]);
  };

  const removeImage = (index) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
    setPreviewUrls(prev => {
      URL.revokeObjectURL(prev[index]);
      return prev.filter((_, i) => i !== index);
    });
  };

  // Attachment Logic (New)
  const handleAttachmentChange = (e) => {
    const selectedFiles = Array.from(e.target.files);
    
    // Validate Count
    if (selectedFiles.length + attachments.length > 1) {
      alert('첨부파일은 최대 1개까지만 가능합니다.');
      return;
    }

    // Validate Size (5MB)
    const validFiles = selectedFiles.filter(file => {
      if (file.size > 5 * 1024 * 1024) {
        alert(`${file.name} 파일이 5MB를 초과하여 제외되었습니다.`);
        return false;
      }
      return true;
    });

    setAttachments(prev => [...prev, ...validFiles]);
  };

  const removeAttachment = (index) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const uploadImages = async () => {
    const uploadedUrls = [];
    for (const file of files) {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `${user.id}/${fileName}`;
      
      const { error } = await supabase.storage.from('post-images').upload(filePath, file);
      if (error) throw error;
      
      const { data } = supabase.storage.from('post-images').getPublicUrl(filePath);
      uploadedUrls.push(data.publicUrl);
    }
    return uploadedUrls;
  };

  const uploadAttachments = async () => {
    const uploadedMetadata = [];
    for (const file of attachments) {
      const fileExt = file.name.split('.').pop();
      // Use random name for storage path to avoid encoding issues with Korean names
      const randomName = `${Date.now()}_${Math.random().toString(36).substring(2, 9)}.${fileExt}`;
      const filePath = `${user.id}/${randomName}`;

      const { error } = await supabase.storage.from('post-attachments').upload(filePath, file);
      if (error) throw error;

      const { data } = supabase.storage.from('post-attachments').getPublicUrl(filePath);
      
      uploadedMetadata.push({
        name: file.name, // Preserve original name for display
        url: data.publicUrl,
        size: file.size
      });
    }
    return uploadedMetadata;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user) {
      alert('로그인이 필요합니다.');
      return;
    }
    if (formData.category === '공지' && !isAdmin) {
      alert('권한이 없습니다.');
      return;
    }
    setLoading(true);

    try {
      // 1. Upload Images
      let mediaUrls = [];
      if (files.length > 0) mediaUrls = await uploadImages();

      // 2. Upload Attachments
      let attachmentData = [];
      if (attachments.length > 0) attachmentData = await uploadAttachments();

      // 3. Insert Post
      const { error } = await supabase
        .from('posts')
        .insert([
          {
            author_id: user.id,
            title: formData.title,
            category: formData.category,
            content: formData.content,
            is_anonymous: formData.is_anonymous,
            media_urls: mediaUrls,
            attachments: attachmentData
          }
        ]);

      if (error) throw error;
      
      navigate('/board');
    } catch (error) {
      alert('게시글 작성 실패: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 pt-32 pb-20">
      <h1 className="text-2xl font-bold text-slate-900 mb-6">게시글 작성</h1>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Category & Anonymity */}
        <div className="flex flex-col sm:flex-row gap-4 justify-between sm:items-center">
          <div className="flex gap-4 items-center">
            <label className="text-sm font-medium text-slate-700">카테고리</label>
            <select 
              className="p-2 rounded-lg border border-slate-300 bg-white focus:ring-2 focus:ring-brand-500 outline-none"
              value={formData.category}
              onChange={handleCategoryChange}
            >
              {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
            </select>
          </div>
          
          <label className="flex items-center gap-2 cursor-pointer select-none p-2 rounded hover:bg-slate-100 transition">
            <input 
              type="checkbox" 
              className="w-4 h-4 text-brand-600 rounded focus:ring-brand-500"
              checked={formData.is_anonymous}
              onChange={e => setFormData({...formData, is_anonymous: e.target.checked})}
            />
            <span className="text-sm text-slate-700">익명으로 작성</span>
          </label>
        </div>

        {/* Title */}
        <div>
           <input 
             type="text" 
             placeholder="제목을 입력하세요"
             className="w-full text-lg px-4 py-3 rounded-xl border border-slate-300 focus:border-brand-500 focus:ring-2 focus:ring-brand-200 outline-none transition"
             value={formData.title}
             onChange={e => setFormData({...formData, title: e.target.value})}
             required
           />
        </div>

        {/* Editor (Textarea for now) */}
        <div className="relative">
          <textarea 
            placeholder="내용을 자유롭게 작성해주세요. (매너 있는 대화 부탁드립니다!)"
            className="w-full h-80 px-4 py-4 rounded-xl border border-slate-300 focus:border-brand-500 focus:ring-2 focus:ring-brand-200 outline-none transition resize-none"
            value={formData.content}
            onChange={e => setFormData({...formData, content: e.target.value})}
            required
          />
          {/* Upload Buttons */}
          <div className="absolute bottom-4 left-4 flex gap-2">
            {/* Image Upload */}
            <input 
              type="file" 
              accept="image/*" 
              multiple 
              className="hidden" 
              ref={fileInputRef}
              onChange={handleFileChange}
            />
            <button 
              type="button" 
              onClick={() => fileInputRef.current.click()}
              className="p-2 text-slate-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition" 
              title="사진 첨부"
            >
              <PhotoIcon className="w-6 h-6" />
            </button>

            {/* File Upload */}
            <input 
              type="file" 
              multiple 
              className="hidden" 
              ref={attachmentInputRef}
              onChange={handleAttachmentChange}
            />
            <button 
              type="button" 
              onClick={() => attachmentInputRef.current.click()}
              className="p-2 text-slate-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition" 
              title="파일 첨부"
            >
              <PaperClipIcon className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Image Previews */}
        {previewUrls.length > 0 && (
          <div className="flex gap-3 overflow-x-auto pb-2">
            {previewUrls.map((url, idx) => (
              <div key={idx} className="relative w-24 h-24 flex-shrink-0 rounded-lg overflow-hidden border border-slate-200 group">
                <img src={url} alt="preview" className="w-full h-full object-cover" />
                <button 
                  type="button"
                  onClick={() => removeImage(idx)}
                  className="absolute top-1 right-1 bg-black/50 text-white rounded-full p-0.5 hover:bg-red-500 transition opacity-0 group-hover:opacity-100"
                >
                  <XMarkIcon className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* File List */}
        {attachments.length > 0 && (
          <div className="bg-slate-50 rounded-xl p-4 space-y-2">
            <h4 className="text-sm font-bold text-slate-700 mb-2">첨부파일 ({attachments.length})</h4>
            {attachments.map((file, idx) => (
              <div key={idx} className="flex items-center justify-between bg-white p-2 rounded-lg border border-slate-200 text-sm">
                <div className="flex items-center gap-2 truncate">
                  <DocumentIcon className="w-4 h-4 text-slate-400" />
                  <span className="truncate">{file.name}</span>
                  <span className="text-xs text-slate-400">({(file.size / 1024 / 1024).toFixed(2)} MB)</span>
                </div>
                <button 
                  type="button" 
                  onClick={() => removeAttachment(idx)}
                  className="text-slate-400 hover:text-red-500 transition"
                >
                  <XMarkIcon className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="flex justify-end gap-3">
          <button 
            type="button" 
            onClick={() => navigate(-1)}
            className="px-6 py-3 rounded-xl text-slate-600 font-medium hover:bg-slate-100 transition"
          >
            취소
          </button>
          <button 
            type="submit" 
            disabled={loading}
            className="btn-primary"
          >
            {loading ? '업로드 중...' : '등록하기'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default PostWrite;
