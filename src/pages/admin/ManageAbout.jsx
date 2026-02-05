import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { TrashIcon, PencilIcon, PlusIcon, PhotoIcon } from '@heroicons/react/24/outline';

const ManageAbout = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  
  // Data State
  const [executives, setExecutives] = useState([]);
  const [histories, setHistories] = useState([]);
  const [adminList, setAdminList] = useState([]);
  const [activities, setActivities] = useState([]);

  // Pagination States
  const [execPage, setExecPage] = useState(0);
  const [hasMoreExecs, setHasMoreExecs] = useState(true);
  const [loadingExecs, setLoadingExecs] = useState(false);
  const execObserver = useRef();

  const [histPage, setHistPage] = useState(0);
  const [hasMoreHists, setHasMoreHists] = useState(true);
  const [loadingHists, setLoadingHists] = useState(false);
  const histObserver = useRef();

  const [adminPage, setAdminPage] = useState(0);
  const [hasMoreAdmins, setHasMoreAdmins] = useState(true);
  const [loadingAdmins, setLoadingAdmins] = useState(false);
  const adminObserver = useRef();

  const [activityPage, setActivityPage] = useState(0);
  const [hasMoreActivities, setHasMoreActivities] = useState(true);
  const [loadingActivities, setLoadingActivities] = useState(false);
  const activityObserver = useRef();

  const ITEMS_PER_PAGE = 15;

  // Form State
  const [activeTab, setActiveTab] = useState('executives'); 
  const [editingId, setEditingId] = useState(null); 
  const [adminEmail, setAdminEmail] = useState('');
  
  const [execForm, setExecForm] = useState({ generation: 16, name: '', role: '', is_current: true, image_url: null });
  const [historyForm, setHistoryForm] = useState({ event_date: '', title: '', description: '' });
  const [activityForm, setActivityForm] = useState({ title: '', image_url: null });
  
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    checkMaster();
  }, [user]);

  const checkMaster = async () => {
    if (!user) { navigate('/'); return; }
    const { data } = await supabase.from('profiles').select('role').eq('id', user.id).single();
    
    if (data?.role !== 'master') {
      alert('접근 권한이 없습니다. (마스터 전용)');
      navigate('/');
    } else {
      setIsAdmin(true);
      fetchAllData();
    }
  };

  const fetchAllData = async () => {
    setLoading(true);
    // Reset all
    setExecPage(0); setExecutives([]); setHasMoreExecs(true);
    setHistPage(0); setHistories([]); setHasMoreHists(true);
    setAdminPage(0); setAdminList([]); setHasMoreAdmins(true);
    setActivityPage(0); setActivities([]); setHasMoreActivities(true);

    await Promise.all([
      fetchExecutives(0, true),
      fetchHistories(0, true),
      fetchAdmins(0, true),
      fetchActivities(0, true)
    ]);
    setLoading(false);
  };

  // 1. Executives Fetch
  const fetchExecutives = async (page, reset = false) => {
    setLoadingExecs(true);
    try {
      const { data, error } = await supabase
        .from('club_executives')
        .select('*')
        .order('generation', { ascending: false })
        .range(page * ITEMS_PER_PAGE, (page + 1) * ITEMS_PER_PAGE - 1);
      if (error) throw error;
      if (data) {
        setExecutives(prev => reset ? data : [...prev, ...data.filter(d => !prev.some(p => p.id === d.id))]);
        if (data.length < ITEMS_PER_PAGE) setHasMoreExecs(false);
      }
    } finally { setLoadingExecs(false); }
  };

  // 2. History Fetch
  const fetchHistories = async (page, reset = false) => {
    setLoadingHists(true);
    try {
      const { data, error } = await supabase
        .from('club_history')
        .select('*')
        .order('event_date', { ascending: false })
        .range(page * ITEMS_PER_PAGE, (page + 1) * ITEMS_PER_PAGE - 1);
      if (error) throw error;
      if (data) {
        setHistories(prev => reset ? data : [...prev, ...data.filter(d => !prev.some(p => p.id === d.id))]);
        if (data.length < ITEMS_PER_PAGE) setHasMoreHists(false);
      }
    } finally { setLoadingHists(false); }
  };

  // 3. Admins Fetch
  const fetchAdmins = async (page, reset = false) => {
    setLoadingAdmins(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'admin')
        .range(page * ITEMS_PER_PAGE, (page + 1) * ITEMS_PER_PAGE - 1);
      if (error) throw error;
      if (data) {
        setAdminList(prev => reset ? data : [...prev, ...data.filter(d => !prev.some(p => p.id === d.id))]);
        if (data.length < ITEMS_PER_PAGE) setHasMoreAdmins(false);
      }
    } finally { setLoadingAdmins(false); }
  };

  // 4. Activities Fetch
  const fetchActivities = async (page, reset = false) => {
    setLoadingActivities(true);
    try {
      const { data, error } = await supabase
        .from('club_activities')
        .select('*')
        .order('created_at', { ascending: false })
        .range(page * ITEMS_PER_PAGE, (page + 1) * ITEMS_PER_PAGE - 1);
      if (error) throw error;
      if (data) {
        setActivities(prev => reset ? data : [...prev, ...data.filter(d => !prev.some(p => p.id === d.id))]);
        if (data.length < ITEMS_PER_PAGE) setHasMoreActivities(false);
      }
    } finally { setLoadingActivities(false); }
  };

  // Observers
  const createObserver = (loading, hasMore, setPage, fetchFn) => (node) => {
    if (loading) return;
    const observerRef = fetchFn === fetchExecutives ? execObserver : 
                        fetchFn === fetchHistories ? histObserver : 
                        fetchFn === fetchAdmins ? adminObserver : activityObserver;
    
    if (observerRef.current) observerRef.current.disconnect();
    observerRef.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore) {
        setPage(prev => {
          const nextPage = prev + 1;
          fetchFn(nextPage);
          return nextPage;
        });
      }
    });
    if (node) observerRef.current.observe(node);
  };

  const lastExecRef = createObserver(loadingExecs, hasMoreExecs, setExecPage, fetchExecutives);
  const lastHistRef = createObserver(loadingHists, hasMoreHists, setHistPage, fetchHistories);
  const lastAdminRef = createObserver(loadingAdmins, hasMoreAdmins, setAdminPage, fetchAdmins);
  const lastActivityRef = createObserver(loadingActivities, hasMoreActivities, setActivityPage, fetchActivities);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleEditClick = (item, type) => {
    setEditingId(item.id);
    if (type === 'exec') {
      setExecForm({ ...item });
      setImagePreview(item.image_url);
      setImageFile(null); 
    } else if (type === 'history') {
      setHistoryForm({ ...item });
    } else if (type === 'activity') {
      setActivityForm({ ...item });
      setImagePreview(item.image_url);
      setImageFile(null);
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setExecForm({ generation: 16, name: '', role: '', is_current: true, image_url: null });
    setHistoryForm({ event_date: '', title: '', description: '' });
    setActivityForm({ title: '', image_url: null });
    setImageFile(null);
    setImagePreview(null);
  };

  const handleExecSubmit = async (e) => {
    e.preventDefault();
    let imageUrl = execForm.image_url;

    if (imageFile) {
      const fileName = `exec_${Date.now()}_${imageFile.name}`;
      const { data, error } = await supabase.storage.from('executive-images').upload(fileName, imageFile);
      if (error) return alert('이미지 업로드 실패');
      const { data: urlData } = supabase.storage.from('executive-images').getPublicUrl(fileName);
      imageUrl = urlData.publicUrl;
    }

    const payload = { ...execForm, image_url: imageUrl };
    let error;

    if (editingId) {
      const { error: updateError } = await supabase.from('club_executives').update(payload).eq('id', editingId);
      error = updateError;
    } else {
      const { error: insertError } = await supabase.from('club_executives').insert(payload);
      error = insertError;
    }

    if (error) alert('저장 실패: ' + error.message);
    else {
      alert(editingId ? '수정되었습니다.' : '등록되었습니다.');
      handleCancelEdit();
      fetchData();
    }
  };

  const handleActivitySubmit = async (e) => {
    e.preventDefault();
    let imageUrl = activityForm.image_url;

    if (imageFile) {
      // 파일명에서 한글 및 특수문자 제거 (안정성 확보)
      const cleanFileName = imageFile.name.replace(/[^\x00-\x7F]/g, '');
      const fileName = `activity_${Date.now()}_${cleanFileName || 'image'}`;
      
      const { data, error: uploadError } = await supabase.storage
        .from('activity-images')
        .upload(fileName, imageFile, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        console.error('Upload Error Details:', uploadError);
        return alert(`이미지 업로드 실패: ${uploadError.message} (버킷 존재 여부를 확인해주세요)`);
      }

      const { data: urlData } = supabase.storage.from('activity-images').getPublicUrl(fileName);
      imageUrl = urlData.publicUrl;
    } else if (!imageUrl) {
      return alert('이미지를 선택해주세요.');
    }

    const payload = { title: activityForm.title, image_url: imageUrl };
    let error;

    if (editingId) {
      const { error: updateError } = await supabase.from('club_activities').update(payload).eq('id', editingId);
      error = updateError;
    } else {
      const { error: insertError } = await supabase.from('club_activities').insert(payload);
      error = insertError;
    }

    if (error) alert('저장 실패: ' + error.message);
    else {
      alert(editingId ? '수정되었습니다.' : '등록되었습니다.');
      handleCancelEdit();
      fetchData();
    }
  };

  const handleHistorySubmit = async (e) => {
    e.preventDefault();
    let error;

    if (editingId) {
      const { error: updateError } = await supabase.from('club_history').update(historyForm).eq('id', editingId);
      error = updateError;
    } else {
      const { error: insertError } = await supabase.from('club_history').insert(historyForm);
      error = insertError;
    }

    if (error) alert('저장 실패: ' + error.message);
    else {
      alert(editingId ? '수정되었습니다.' : '등록되었습니다.');
      handleCancelEdit();
      fetchData();
    }
  };

  const handleAddAdmin = async (e) => {
    e.preventDefault();
    if (!adminEmail.trim()) return;

    try {
      const { data: targetUser } = await supabase
        .from('profiles')
        .select('id, role')
        .eq('email', adminEmail)
        .maybeSingle();

      if (!targetUser) {
        alert('존재하지 않는 이메일입니다.');
        return;
      }

      if (targetUser.role === 'admin') {
        alert('이미 관리자 권한을 가진 유저입니다.');
        return;
      }

      const { error } = await supabase
        .from('profiles')
        .update({ role: 'admin' })
        .eq('id', targetUser.id);

      if (error) throw error;

      alert(`${adminEmail} 님에게 관리자 권한을 부여했습니다.`);
      setAdminEmail('');
      fetchData();
    } catch (error) {
      alert('오류 발생: ' + error.message);
    }
  };

  const handleRevokeAdmin = async (id) => {
    if (id === user.id) return alert('자기 자신의 관리자 권한은 해제할 수 없습니다.');
    if (!confirm('관리자 권한을 해제하시겠습니까?')) return;

    const { error } = await supabase
      .from('profiles')
      .update({ role: 'member' })
      .eq('id', id);

    if (error) alert('해제 실패: ' + error.message);
    else fetchData();
  };

  const handleDelete = async (table, id) => {
    if (!confirm('정말 삭제하시겠습니까?')) return;
    await supabase.from(table).delete().eq('id', id);
    fetchData();
  };

  if (!isAdmin) return null;

  return (
    <div className="pt-32 pb-20 px-6 max-w-6xl mx-auto">
      <h1 className="text-3xl font-display font-bold text-slate-900 mb-8">About 페이지 관리 (CMS)</h1>
      
      <div className="flex gap-2 mb-8 border-b border-slate-200 overflow-x-auto pb-1 scrollbar-hide whitespace-nowrap">
        <button 
          onClick={() => setActiveTab('executives')}
          className={`px-4 md:px-6 py-3 font-bold transition flex-shrink-0 ${activeTab === 'executives' ? 'text-brand-600 border-b-2 border-brand-600' : 'text-slate-400 hover:text-slate-600'}`}
        >
          임원진 관리
        </button>
        <button 
          onClick={() => setActiveTab('history')}
          className={`px-4 md:px-6 py-3 font-bold transition flex-shrink-0 ${activeTab === 'history' ? 'text-brand-600 border-b-2 border-brand-600' : 'text-slate-400 hover:text-slate-600'}`}
        >
          연혁 관리
        </button>
        <button 
          onClick={() => setActiveTab('admins')}
          className={`px-4 md:px-6 py-3 font-bold transition flex-shrink-0 ${activeTab === 'admins' ? 'text-brand-600 border-b-2 border-brand-600' : 'text-slate-400 hover:text-slate-600'}`}
        >
          관리자 관리
        </button>
        <button 
          onClick={() => setActiveTab('gallery')}
          className={`px-4 md:px-6 py-3 font-bold transition flex-shrink-0 ${activeTab === 'gallery' ? 'text-brand-600 border-b-2 border-brand-600' : 'text-slate-400 hover:text-slate-600'}`}
        >
          활동 사진 관리
        </button>
      </div>

      {activeTab === 'executives' && (
        <div className="grid md:grid-cols-3 gap-8">
          <div className="md:col-span-1">
            <div className="bg-white p-6 rounded-2xl shadow-lg border border-slate-100 sticky top-32">
              <h3 className="font-bold text-lg mb-6 flex items-center gap-2">
                {editingId ? <PencilIcon className="w-5 h-5 text-brand-500" /> : <PlusIcon className="w-5 h-5 text-brand-500" />}
                {editingId ? '임원진 수정' : '임원진 등록'}
              </h3>
              <form onSubmit={handleExecSubmit} className="space-y-4">
                <div className="flex gap-2">
                  <input type="number" placeholder="기수" className="w-1/3 p-3 rounded-xl border border-slate-200 focus:border-brand-500 outline-none text-sm" 
                    value={execForm.generation} onChange={e => setExecForm({...execForm, generation: e.target.value})} required />
                  <input type="text" placeholder="이름" className="flex-1 p-3 rounded-xl border border-slate-200 focus:border-brand-500 outline-none text-sm" 
                    value={execForm.name} onChange={e => setExecForm({...execForm, name: e.target.value})} required />
                </div>
                <input type="text" placeholder="직책 (예: 회장)" className="w-full p-3 rounded-xl border border-slate-200 focus:border-brand-500 outline-none text-sm" 
                  value={execForm.role} onChange={e => setExecForm({...execForm, role: e.target.value})} required />
                
                <div className="relative">
                  <input 
                    type="file" 
                    accept="image/*" 
                    ref={fileInputRef} 
                    className="hidden" 
                    onChange={handleImageChange} 
                  />
                  <div 
                    onClick={() => fileInputRef.current.click()}
                    className="w-full h-40 bg-slate-50 border-2 border-dashed border-slate-200 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:bg-slate-100 transition group"
                  >
                    {imagePreview ? (
                      <img src={imagePreview} alt="Preview" className="w-full h-full object-cover rounded-xl" />
                    ) : (
                      <>
                        <PhotoIcon className="w-8 h-8 text-slate-300 group-hover:text-slate-400 mb-2" />
                        <span className="text-xs text-slate-400">프로필 사진 업로드</span>
                      </>
                    )}
                  </div>
                </div>

                <label className="flex items-center gap-3 p-3 border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-50 transition">
                  <input 
                    type="checkbox" 
                    className="w-5 h-5 text-brand-600 rounded focus:ring-brand-500 border-gray-300"
                    checked={execForm.is_current} 
                    onChange={e => setExecForm({...execForm, is_current: e.target.checked})} 
                  />
                  <span className="text-sm font-medium text-slate-700">현재 활동 중 (Current)</span>
                </label>

                <div className="flex gap-2 pt-2">
                  {editingId && (
                    <button type="button" onClick={handleCancelEdit} className="flex-1 py-3 text-slate-500 font-bold bg-slate-100 rounded-xl hover:bg-slate-200 transition">
                      취소
                    </button>
                  )}
                  <button type="submit" className="flex-1 py-3 bg-brand-600 text-white font-bold rounded-xl hover:bg-brand-700 transition shadow-lg shadow-brand-500/20">
                    {editingId ? '수정하기' : '등록하기'}
                  </button>
                </div>
              </form>
            </div>
          </div>

          <div className="md:col-span-2 space-y-3">
            {executives.map((item, index) => (
              <div 
                key={item.id} 
                ref={index === executives.length - 1 ? lastExecRef : null}
                className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex justify-between items-center group hover:border-brand-200 transition"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-slate-100 overflow-hidden border border-slate-200">
                    {item.image_url && <img src={item.image_url} alt="" className="w-full h-full object-cover" />}
                  </div>
                  <div>
                    <p className="font-bold text-slate-900 text-lg flex items-center gap-2">
                      {item.generation}기 {item.name}
                      {item.is_current && <span className="text-[10px] bg-brand-100 text-brand-600 px-2 py-0.5 rounded-full font-bold">CURRENT</span>}
                    </p>
                    <p className="text-sm text-slate-500 font-medium">{item.role}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => handleEditClick(item, 'exec')} className="p-2 text-slate-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition">
                    <PencilIcon className="w-5 h-5" />
                  </button>
                  <button onClick={() => handleDelete('club_executives', item.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition">
                    <TrashIcon className="w-5 h-5" />
                  </button>
                </div>
              </div>
            ))}
            {loadingExecs && (
              <div className="flex justify-center py-4">
                <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-brand-500"></div>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'history' && (
        <div className="grid md:grid-cols-3 gap-8">
          <div className="md:col-span-1">
            <div className="bg-white p-6 rounded-2xl shadow-lg border border-slate-100 sticky top-32">
              <h3 className="font-bold text-lg mb-6 flex items-center gap-2">
                {editingId ? <PencilIcon className="w-5 h-5 text-brand-500" /> : <PlusIcon className="w-5 h-5 text-brand-500" />}
                {editingId ? '연혁 수정' : '연혁 등록'}
              </h3>
              <form onSubmit={handleHistorySubmit} className="space-y-4">
                <input type="date" className="w-full p-3 rounded-xl border border-slate-200 focus:border-brand-500 outline-none text-sm" 
                  value={historyForm.event_date} onChange={e => setHistoryForm({...historyForm, event_date: e.target.value})} required />
                <input type="text" placeholder="사건 제목" className="w-full p-3 rounded-xl border border-slate-200 focus:border-brand-500 outline-none text-sm" 
                  value={historyForm.title} onChange={e => setHistoryForm({...historyForm, title: e.target.value})} required />
                <textarea placeholder="상세 내용" className="w-full p-3 rounded-xl border border-slate-200 focus:border-brand-500 outline-none text-sm h-32 resize-none" 
                  value={historyForm.description} onChange={e => setHistoryForm({...historyForm, description: e.target.value})} />
                
                <div className="flex gap-2 pt-2">
                  {editingId && (
                    <button type="button" onClick={handleCancelEdit} className="flex-1 py-3 text-slate-500 font-bold bg-slate-100 rounded-xl hover:bg-slate-200 transition">
                      취소
                    </button>
                  )}
                  <button type="submit" className="flex-1 py-3 bg-brand-600 text-white font-bold rounded-xl hover:bg-brand-700 transition shadow-lg shadow-brand-500/20">
                    {editingId ? '수정하기' : '등록하기'}
                  </button>
                </div>
              </form>
            </div>
          </div>
          <div className="md:col-span-2 space-y-3">
            {histories.map((item, index) => (
              <div 
                key={item.id} 
                ref={index === histories.length - 1 ? lastHistRef : null}
                className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm flex justify-between items-start group hover:border-brand-200 transition"
              >
                <div>
                  <p className="font-bold text-brand-600 mb-1">{item.event_date}</p>
                  <h4 className="font-bold text-slate-900 text-lg mb-1">{item.title}</h4>
                  <p className="text-sm text-slate-500 leading-relaxed whitespace-pre-wrap">
                    {item.description?.split(/(https?:\/\/[^\s]+)/g).map((part, i) => 
                      part.match(/^https?:\/\//) ? (
                        <a key={i} href={part} target="_blank" rel="noopener noreferrer" className="text-brand-600 hover:underline break-all">
                          {part}
                        </a>
                      ) : part
                    )}
                  </p>
                </div>
                <div className="flex gap-2 flex-shrink-0 ml-4">
                  <button onClick={() => handleEditClick(item, 'history')} className="p-2 text-slate-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition">
                    <PencilIcon className="w-5 h-5" />
                  </button>
                  <button onClick={() => handleDelete('club_history', item.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition">
                    <TrashIcon className="w-5 h-5" />
                  </button>
                </div>
              </div>
            ))}
            {loadingHists && (
              <div className="flex justify-center py-4">
                <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-brand-500"></div>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'admins' && (
        <div className="grid md:grid-cols-3 gap-8">
          <div className="md:col-span-1">
            <div className="bg-white p-6 rounded-2xl shadow-lg border border-slate-100 sticky top-32">
              <h3 className="font-bold text-lg mb-6">관리자 추가</h3>
              <form onSubmit={handleAddAdmin} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">이메일 주소</label>
                  <input 
                    type="email" 
                    placeholder="user@example.com" 
                    className="w-full p-3 rounded-xl border border-slate-200 focus:border-brand-500 focus:ring-2 focus:ring-brand-100 outline-none text-sm" 
                    value={adminEmail} 
                    onChange={e => setAdminEmail(e.target.value)} 
                    required 
                  />
                  <p className="text-xs text-slate-400">
                    * 이미 가입된 유저의 이메일을 입력해야 합니다.
                  </p>
                </div>
                <button type="submit" className="w-full bg-brand-600 text-white py-3 rounded-xl font-bold hover:bg-brand-700 transition shadow-lg shadow-brand-500/20">
                  권한 부여
                </button>
              </form>
            </div>
          </div>
          <div className="md:col-span-2 space-y-3">
            <h3 className="font-bold text-lg mb-4">현재 관리자 목록</h3>
            {adminList.map((admin, index) => (
              <div 
                key={admin.id} 
                ref={index === adminList.length - 1 ? lastAdminRef : null}
                className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm flex justify-between items-center group hover:border-brand-200 transition"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-slate-100 overflow-hidden border border-slate-200">
                    {admin.avatar_url ? (
                      <img src={admin.avatar_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-400 font-bold">
                        {admin.nickname ? admin.nickname[0] : 'U'}
                      </div>
                    )}
                  </div>
                  <div>
                    <p className="font-bold text-slate-900">{admin.nickname || '닉네임 없음'}</p>
                    <p className="text-sm text-slate-500">{admin.email}</p>
                  </div>
                </div>
                {admin.id !== user.id && (
                  <button 
                    onClick={() => handleRevokeAdmin(admin.id)} 
                    className="px-3 py-1.5 text-xs font-bold text-red-500 border border-red-200 rounded-lg hover:bg-red-50 transition"
                  >
                    권한 해제
                  </button>
                )}
              </div>
            ))}
            {loadingAdmins && (
              <div className="flex justify-center py-4">
                <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-brand-500"></div>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'gallery' && (
        <div className="grid md:grid-cols-3 gap-8">
          <div className="md:col-span-1">
            <div className="bg-white p-6 rounded-2xl shadow-lg border border-slate-100 sticky top-32">
              <h3 className="font-bold text-lg mb-6 flex items-center gap-2">
                {editingId ? <PencilIcon className="w-5 h-5 text-brand-500" /> : <PlusIcon className="w-5 h-5 text-brand-500" />}
                {editingId ? '활동 사진 수정' : '활동 사진 등록'}
              </h3>
              <form onSubmit={handleActivitySubmit} className="space-y-4">
                <input type="text" placeholder="제목 (예: 2024 정기공연)" className="w-full p-3 rounded-xl border border-slate-200 focus:border-brand-500 outline-none text-sm" 
                  value={activityForm.title} onChange={e => setActivityForm({...activityForm, title: e.target.value})} required />
                
                <div className="relative">
                  <input 
                    type="file" 
                    accept="image/*" 
                    ref={fileInputRef} 
                    className="hidden" 
                    onChange={handleImageChange} 
                  />
                  <div 
                    onClick={() => fileInputRef.current.click()}
                    className="w-full h-48 bg-slate-50 border-2 border-dashed border-slate-200 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:bg-slate-100 transition group"
                  >
                    {imagePreview ? (
                      <img src={imagePreview} alt="Preview" className="w-full h-full object-cover rounded-xl" />
                    ) : (
                      <>
                        <PhotoIcon className="w-8 h-8 text-slate-300 group-hover:text-slate-400 mb-2" />
                        <span className="text-xs text-slate-400">활동 사진 업로드</span>
                      </>
                    )}
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  {editingId && (
                    <button type="button" onClick={handleCancelEdit} className="flex-1 py-3 text-slate-500 font-bold bg-slate-100 rounded-xl hover:bg-slate-200 transition">
                      취소
                    </button>
                  )}
                  <button type="submit" className="flex-1 py-3 bg-brand-600 text-white font-bold rounded-xl hover:bg-brand-700 transition shadow-lg shadow-brand-500/20">
                    {editingId ? '수정하기' : '등록하기'}
                  </button>
                </div>
              </form>
            </div>
          </div>

          <div className="md:col-span-2 space-y-3">
            <div className="grid grid-cols-2 gap-4">
              {activities.map((item, index) => (
                <div 
                  key={item.id} 
                  ref={index === activities.length - 1 ? lastActivityRef : null}
                  className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm group hover:border-brand-200 transition"
                >
                  <div className="relative aspect-video rounded-lg overflow-hidden mb-3">
                    <img src={item.image_url} alt="" className="w-full h-full object-cover" />
                    <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => handleEditClick(item, 'activity')} className="p-1.5 bg-white/90 text-slate-600 hover:text-brand-600 rounded-lg shadow-sm transition">
                        <PencilIcon className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDelete('club_activities', item.id)} className="p-1.5 bg-white/90 text-slate-600 hover:text-red-600 rounded-lg shadow-sm transition">
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <h4 className="font-bold text-slate-800 truncate px-1">{item.title}</h4>
                </div>
              ))}
            </div>
            {loadingActivities && (
              <div className="flex justify-center py-4">
                <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-brand-500"></div>
              </div>
            )}
            {activities.length === 0 && !loadingActivities && (
              <p className="text-center py-10 text-slate-400">등록된 활동 사진이 없습니다.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ManageAbout;