import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../context/AuthContext';
import { motion } from 'framer-motion';
import { UserCircleIcon, ArrowRightOnRectangleIcon, CameraIcon, PencilIcon, CheckIcon, XMarkIcon, DocumentTextIcon, ChatBubbleLeftRightIcon, NoSymbolIcon, ChevronRightIcon, LockClosedIcon, UserMinusIcon, Cog6ToothIcon } from '@heroicons/react/24/outline';
import { useNavigate } from 'react-router-dom';

const MyPageMain = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  
  // Profile State
  const [profile, setProfile] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [newNickname, setNewNickname] = useState('');
  const fileInputRef = useRef(null);

  // Withdrawal State
  const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState(false);
  const [withdrawPassword, setWithdrawPassword] = useState('');

  useEffect(() => {
    if (user) {
      fetchProfile();
    }
  }, [user]);

  const fetchProfile = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();
    if (data) {
      setProfile(data);
      setNewNickname(data.nickname);
    }
  };

  const handleProfileImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}_${Date.now()}.${fileExt}`;
      const filePath = fileName; 

      const { error: uploadError } = await supabase.storage
        .from('profile-images')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from('profile-images')
        .getPublicUrl(filePath);

      const publicUrl = `${data.publicUrl}?t=${Date.now()}`;

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', user.id);

      if (updateError) throw updateError;

      if (profile?.avatar_url) {
        try {
          const oldUrl = new URL(profile.avatar_url);
          const pathParts = oldUrl.pathname.split('/profile-images/');
          if (pathParts.length > 1) {
            await supabase.storage.from('profile-images').remove([pathParts[1]]);
          }
        } catch (err) { console.error(err); }
      }

      setProfile(prev => ({ ...prev, avatar_url: publicUrl }));
      alert('프로필 사진이 변경되었습니다.');
    } catch (error) {
      alert('이미지 업로드 실패: ' + error.message);
    }
  };

  const handleNicknameUpdate = async () => {
    if (!newNickname.trim()) return;
    if (newNickname.length < 2 || newNickname.length > 10) {
      alert('닉네임은 2~10자 사이여야 합니다.');
      return;
    }
    try {
      const { data: existing } = await supabase
        .from('profiles')
        .select('id')
        .eq('nickname', newNickname)
        .neq('id', user.id)
        .maybeSingle();

      if (existing) return alert('이미 사용 중인 닉네임입니다.');

      const { error } = await supabase
        .from('profiles')
        .update({ nickname: newNickname })
        .eq('id', user.id);

      if (error) throw error;
      
      setIsEditing(false);
      fetchProfile();
    } catch (error) {
      alert('닉네임 변경 실패: ' + error.message);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const handleWithdraw = async (e) => {
    e.preventDefault();
    if (!withdrawPassword) return;
    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: withdrawPassword
      });
      if (signInError) throw new Error('비밀번호가 일치하지 않습니다.');

      const { error: rpcError } = await supabase.rpc('withdraw_user');
      if (rpcError) throw rpcError;

      alert('회원 탈퇴가 완료되었습니다.');
      await signOut();
      navigate('/');
    } catch (error) {
      alert('탈퇴 실패: ' + error.message);
    } finally {
      setWithdrawPassword('');
      setIsWithdrawModalOpen(false);
    }
  };

  if (!user) return null;

  return (
    <div className="pt-32 pb-20 px-6 max-w-xl mx-auto">
      {/* Profile Section */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8 flex flex-col items-center text-center mb-8">
        <div className="relative group mb-6">
          <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-slate-50 shadow-inner bg-slate-100 flex items-center justify-center">
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt="profile" className="w-full h-full object-cover" />
            ) : (
              <UserCircleIcon className="w-full h-full text-slate-300" />
            )}
          </div>
          <button 
            onClick={() => fileInputRef.current.click()}
            className="absolute bottom-0 right-0 p-2 bg-slate-900 text-white rounded-full shadow-lg hover:bg-brand-600 transition opacity-0 group-hover:opacity-100"
          >
            <CameraIcon className="w-5 h-5" />
          </button>
          <input 
            type="file" 
            ref={fileInputRef} 
            className="hidden" 
            accept="image/*"
            onChange={handleProfileImageUpload}
          />
        </div>

        <div className="mb-8 w-full">
          {isEditing ? (
            <div className="flex items-center gap-2 justify-center">
              <input 
                type="text" 
                value={newNickname}
                onChange={(e) => setNewNickname(e.target.value)}
                className="px-3 py-1 border border-slate-300 rounded text-center w-full max-w-[150px]"
              />
              <button onClick={handleNicknameUpdate} className="text-green-600"><CheckIcon className="w-5 h-5" /></button>
              <button onClick={() => setIsEditing(false)} className="text-red-500"><XMarkIcon className="w-5 h-5" /></button>
            </div>
          ) : (
            <h2 className="text-2xl font-bold text-slate-900 flex items-center justify-center gap-2">
              {profile?.nickname || user.email.split('@')[0]}
              <button onClick={() => setIsEditing(true)} className="text-slate-400 hover:text-brand-600">
                <PencilIcon className="w-4 h-4" />
              </button>
            </h2>
          )}
          <p className="text-sm text-slate-500 mt-1">{user.email}</p>
        </div>

        <button 
          onClick={handleSignOut}
          className="w-full px-4 py-2 border border-slate-200 rounded-xl text-slate-500 hover:bg-slate-50 hover:text-red-600 transition flex items-center justify-center gap-2 text-sm font-medium mb-3"
        >
          <ArrowRightOnRectangleIcon className="w-4 h-4" />
          로그아웃
        </button>

        <button 
          onClick={() => navigate('/update-password')}
          className="w-full px-4 py-2 border border-slate-200 rounded-xl text-slate-500 hover:bg-slate-50 hover:text-brand-600 transition flex items-center justify-center gap-2 text-sm font-medium mb-3"
        >
          <LockClosedIcon className="w-4 h-4" />
          비밀번호 변경
        </button>

        <button 
          onClick={() => setIsWithdrawModalOpen(true)}
          className="w-full px-4 py-2 border border-slate-200 rounded-xl text-slate-500 hover:bg-slate-50 hover:text-red-600 transition flex items-center justify-center gap-2 text-sm font-medium"
        >
          <UserMinusIcon className="w-4 h-4" />
          회원 탈퇴
        </button>
      </div>

      {/* Menu Buttons */}
      <div className="space-y-3">
        <button 
          onClick={() => navigate('/mypage/posts')}
          className="w-full bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between hover:bg-slate-50 transition group"
        >
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
              <DocumentTextIcon className="w-6 h-6" />
            </div>
            <span className="font-bold text-slate-700 group-hover:text-blue-600 transition">내가 쓴 글</span>
          </div>
          <ChevronRightIcon className="w-5 h-5 text-slate-300 group-hover:text-blue-600 transition" />
        </button>

        <button 
          onClick={() => navigate('/mypage/comments')}
          className="w-full bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between hover:bg-slate-50 transition group"
        >
          <div className="flex items-center gap-4">
            <div className="p-3 bg-green-50 text-green-600 rounded-xl">
              <ChatBubbleLeftRightIcon className="w-6 h-6" />
            </div>
            <span className="font-bold text-slate-700 group-hover:text-green-600 transition">내가 쓴 댓글</span>
          </div>
          <ChevronRightIcon className="w-5 h-5 text-slate-300 group-hover:text-green-600 transition" />
        </button>

        <button 
          onClick={() => navigate('/mypage/blocks')}
          className="w-full bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between hover:bg-slate-50 transition group"
        >
          <div className="flex items-center gap-4">
            <div className="p-3 bg-red-50 text-red-600 rounded-xl">
              <NoSymbolIcon className="w-6 h-6" />
            </div>
            <span className="font-bold text-slate-700 group-hover:text-red-600 transition">차단 관리</span>
          </div>
          <ChevronRightIcon className="w-5 h-5 text-slate-300 group-hover:text-red-600 transition" />
        </button>

        {profile?.role === 'master' && (
          <button 
            onClick={() => navigate('/admin/manage-about')}
            className="w-full bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between hover:bg-slate-50 transition group"
          >
            <div className="flex items-center gap-4">
              <div className="p-3 bg-slate-100 text-slate-600 rounded-xl">
                <Cog6ToothIcon className="w-6 h-6" />
              </div>
              <span className="font-bold text-slate-700 group-hover:text-slate-900 transition">마스터 대시보드</span>
            </div>
            <ChevronRightIcon className="w-5 h-5 text-slate-300 group-hover:text-slate-900 transition" />
          </button>
        )}
      </div>

      {/* Withdrawal Modal */}
      {isWithdrawModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl p-6 animate-fade-in-up">
            <h3 className="text-lg font-bold text-slate-900 mb-2">회원 탈퇴</h3>
            <p className="text-sm text-slate-500 mb-4">
              탈퇴 시 계정 정보가 삭제되며 복구할 수 없습니다. 계속하시려면 비밀번호를 입력해주세요.
            </p>
            <form onSubmit={handleWithdraw}>
              <input
                type="password"
                value={withdrawPassword}
                onChange={(e) => setWithdrawPassword(e.target.value)}
                placeholder="비밀번호 입력"
                className="w-full p-3 rounded-xl border border-slate-200 focus:border-red-500 focus:ring-2 focus:ring-red-100 outline-none mb-4 text-sm"
                required
              />
              <div className="flex gap-2">
                <button 
                  type="button" 
                  onClick={() => setIsWithdrawModalOpen(false)}
                  className="flex-1 py-2.5 text-slate-500 font-bold rounded-xl hover:bg-slate-100 transition"
                >
                  취소
                </button>
                <button 
                  type="submit"
                  className="flex-1 py-2.5 bg-red-500 text-white font-bold rounded-xl hover:bg-red-600 transition shadow-lg shadow-red-500/30"
                >
                  탈퇴하기
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyPageMain;