import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const UpdatePassword = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [isRecovery, setIsRecovery] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    // Check if we are in recovery mode (from email link)
    const checkRecovery = async () => {
      // 1. Check URL fragment for access_token (Supabase puts session info here)
      if (window.location.hash.includes('access_token')) {
        setIsRecovery(true);
        return;
      }

      // 2. Check for PASSWORD_RECOVERY event
      const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
        if (event === 'PASSWORD_RECOVERY') {
          setIsRecovery(true);
        }
      });

      // 3. Fallback check session
      const { data: { session } } = await supabase.auth.getSession();
      if (session && !user && !window.location.hash.includes('access_token')) {
         // This might be a normal login, handled by AuthContext
      }

      return () => subscription.unsubscribe();
    };

    checkRecovery();
  }, [user]);

  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setMessage({ type: 'error', text: '새 비밀번호가 일치하지 않습니다.' });
      return;
    }
    
    setLoading(true);
    setMessage(null);

    try {
      // Only require current password if NOT in recovery mode and user is logged in
      if (user && !isRecovery) {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: user.email,
          password: currentPassword
        });
        if (signInError) throw new Error('현재 비밀번호가 일치하지 않습니다.');
      }

      // Explicitly check if session exists before updating
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('인증 세션을 찾을 수 없습니다. 링크가 만료되었거나 유효하지 않습니다.');
      }

      const { error } = await supabase.auth.updateUser({
        password: password
      });

      if (error) throw error;

      alert('비밀번호가 성공적으로 변경되었습니다. 다시 로그인해주세요.');
      await supabase.auth.signOut();
      navigate('/mypage'); 
    } catch (error) {
      console.error('Update password error:', error);
      setMessage({ type: 'error', text: '변경 실패: ' + error.message });
    } finally {
      setLoading(false);
    }
  };

  if (authLoading && !isRecovery) return <div className="pt-40 text-center">로딩 중...</div>;

  return (
    <div className="pt-32 pb-20 px-6 max-w-md mx-auto">
      <div className="text-center mb-10">
        <h1 className="text-2xl font-bold text-slate-900 mb-2">비밀번호 변경</h1>
        <p className="text-slate-500 text-sm">
          {isRecovery ? '새로운 비밀번호를 설정해주세요.' : '현재 비밀번호 확인 후 새 비밀번호를 설정하세요.'}
        </p>
      </div>

      <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100">
        <form onSubmit={handleUpdatePassword} className="space-y-5">
          {/* Show Current Password field only if NOT in recovery mode */}
          {!isRecovery && user && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">현재 비밀번호</label>
              <input
                type="password"
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-brand-500 focus:ring-2 focus:ring-brand-200 outline-none transition"
                placeholder="현재 사용 중인 비밀번호"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">새 비밀번호</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-brand-500 focus:ring-2 focus:ring-brand-200 outline-none transition"
              placeholder="••••••••"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">비밀번호 확인</label>
            <input
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-brand-500 focus:ring-2 focus:ring-brand-200 outline-none transition"
              placeholder="••••••••"
            />
          </div>

          {message && (
            <div className={`p-3 rounded-lg text-sm ${message.type === 'success' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
              {message.text}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full btn-primary flex justify-center"
          >
            {loading ? '변경 중...' : '비밀번호 변경'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default UpdatePassword;
