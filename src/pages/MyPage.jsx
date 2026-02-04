import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';
import { motion } from 'framer-motion';
import MyPageMain from './mypage/MyPageMain';

const MyPage = () => {
  const { user } = useAuth();
  
  // Auth Form State
  const [authLoading, setAuthLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [nickname, setNickname] = useState('');
  
  const [message, setMessage] = useState(null);
  const [errors, setErrors] = useState({});
  const [isNicknameVerified, setIsNicknameVerified] = useState(false);

  // Password Reset State
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState('');

  // Validation Logic
  useEffect(() => {
    const newErrors = {};
    // Email Regex
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (email && !emailRegex.test(email)) {
      newErrors.email = '올바른 이메일 형식이 아닙니다.';
    }

    // Password Match
    if (isSignUp && confirmPassword && password !== confirmPassword) {
      newErrors.confirmPassword = '비밀번호가 일치하지 않습니다.';
    }
    
    // Nickname Match
    if (isSignUp) {
      if (nickname && (nickname.length < 2 || nickname.length > 10)) {
        newErrors.nickname = '닉네임은 2~10자 사이여야 합니다.';
      } else if (nickname && !isNicknameVerified) {
        // newErrors.nickname = '닉네임 중복 확인이 필요합니다.';
      }
    }

    setErrors(newErrors);
  }, [email, password, confirmPassword, nickname, isSignUp, isNicknameVerified]);

  const checkNickname = async () => {
    if (!nickname.trim()) return;
    if (nickname.length < 2 || nickname.length > 10) {
      alert('닉네임은 2~10자 사이여야 합니다.');
      return;
    }
    try {
      const { data } = await supabase
        .from('profiles')
        .select('id')
        .eq('nickname', nickname)
        .maybeSingle();
      
      if (data) {
        setErrors(prev => ({ ...prev, nickname: '이미 사용 중인 닉네임입니다.' }));
        setIsNicknameVerified(false);
      } else {
        setErrors(prev => ({ ...prev, nickname: null }));
        setIsNicknameVerified(true);
        alert('사용 가능한 닉네임입니다.');
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!resetEmail) return;
    
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
        redirectTo: `${window.location.origin}/update-password`,
      });
      
      if (error) throw error;
      alert('비밀번호 재설정 링크를 이메일로 보냈습니다.');
      setIsResetModalOpen(false);
      setResetEmail('');
    } catch (error) {
      alert('이메일 전송 실패: ' + error.message);
    }
  };

  const handleAuth = async (e) => {
    e.preventDefault();
    if (Object.keys(errors).length > 0 && errors.email) return; // Basic check
    if (isSignUp && (password !== confirmPassword || !isNicknameVerified)) {
      if (!isNicknameVerified) setErrors(prev => ({ ...prev, nickname: '닉네임 중복 확인을 해주세요.' }));
      return;
    }

    setAuthLoading(true);
    setMessage(null);

    try {
      if (isSignUp) {
        // 1. Check Email Duplication (Active Users)
        const { data: existingUser } = await supabase
          .from('profiles')
          .select('id')
          .eq('email', email)
          .is('deleted_at', null)
          .maybeSingle();
        
        if (existingUser) {
          throw new Error('이미 가입된 이메일입니다. 로그인해주세요.');
        }

        // 2. Sign Up with Nickname Metadata
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: nickname, // Trigger will use this as nickname
            }
          }
        });
        
        if (error) throw error;
        setMessage({ type: 'success', text: '가입 확인 이메일을 발송했습니다! 메일함을 확인해주세요.' });
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
      }
    } catch (error) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setAuthLoading(false);
    }
  };

  // 1. Logged In: Show Main Dashboard
  if (user) {
    return <MyPageMain />;
  }

  // 2. Not Logged In: Show Login Form
  return (
    <div className="pt-32 pb-20 px-6 max-w-md mx-auto">
      <div className="text-center mb-10">
        <h1 className="text-3xl font-display font-bold text-slate-900 mb-2">
          {isSignUp ? '회원가입' : '로그인'}
        </h1>
        <p className="text-slate-500">
          통통 커뮤니티에 오신 것을 환영합니다.
        </p>
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-panel p-8"
      >
        <form onSubmit={handleAuth} className="space-y-4">
          {isSignUp && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">닉네임</label>
              <div className="flex flex-col gap-2">
                <input
                  type="text"
                  required
                  value={nickname}
                  onChange={(e) => { setNickname(e.target.value); setIsNicknameVerified(false); }}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-brand-500 focus:ring-2 focus:ring-brand-200 outline-none transition"
                  placeholder="닉네임 입력"
                />
                <button
                  type="button"
                  onClick={checkNickname}
                  disabled={isNicknameVerified || !nickname}
                  className={`w-full px-4 py-3 text-sm font-bold rounded-xl transition ${
                    isNicknameVerified 
                      ? 'bg-green-100 text-green-600 cursor-default' 
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {isNicknameVerified ? '확인됨' : '중복확인'}
                </button>
              </div>
              {errors.nickname && <p className="text-xs text-red-500 mt-1 ml-1">{errors.nickname}</p>}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">이메일</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={`w-full px-4 py-3 rounded-xl border focus:ring-2 outline-none transition ${
                errors.email ? 'border-red-300 focus:border-red-500 focus:ring-red-100' : 'border-slate-200 focus:border-brand-500 focus:ring-brand-200'
              }`}
              placeholder="name@example.com"
            />
            {errors.email && <p className="text-xs text-red-500 mt-1 ml-1">{errors.email}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">비밀번호</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-brand-500 focus:ring-2 focus:ring-brand-200 outline-none transition"
              placeholder="••••••••"
            />
          </div>

          {isSignUp && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">비밀번호 확인</label>
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className={`w-full px-4 py-3 rounded-xl border focus:ring-2 outline-none transition ${
                  errors.confirmPassword ? 'border-red-300 focus:border-red-500 focus:ring-red-100' : 'border-slate-200 focus:border-brand-500 focus:ring-brand-200'
                }`}
                placeholder="비밀번호 다시 입력"
              />
              {errors.confirmPassword && <p className="text-xs text-red-500 mt-1 ml-1">{errors.confirmPassword}</p>}
            </div>
          )}

          {message && (
            <div className={`p-3 rounded-lg text-sm ${message.type === 'success' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
              {message.text}
            </div>
          )}

          <button
            type="submit"
            disabled={authLoading}
            className="w-full btn-primary flex justify-center"
          >
            {authLoading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              isSignUp ? '가입하기' : '로그인'
            )}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-slate-500">
          {isSignUp ? '이미 계정이 있으신가요?' : '아직 계정이 없으신가요?'}
          <button
            onClick={() => { setIsSignUp(!isSignUp); setMessage(null); }}
            className="ml-2 font-bold text-brand-600 hover:underline"
          >
            {isSignUp ? '로그인' : '회원가입'}
          </button>
        </div>
        
        {!isSignUp && (
          <div className="mt-4 text-center">
            <button 
              onClick={() => setIsResetModalOpen(true)}
              className="text-xs text-slate-400 hover:text-slate-600 underline"
            >
              비밀번호를 잊으셨나요?
            </button>
          </div>
        )}
      </motion.div>

      {/* Password Reset Modal */}
      {isResetModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl p-6 animate-fade-in-up">
            <h3 className="text-lg font-bold text-slate-900 mb-2">비밀번호 재설정</h3>
            <p className="text-sm text-slate-500 mb-4">
              가입하신 이메일 주소를 입력하시면<br/>재설정 링크를 보내드립니다.
            </p>
            <form onSubmit={handleResetPassword}>
              <input
                type="email"
                value={resetEmail}
                onChange={(e) => setResetEmail(e.target.value)}
                placeholder="이메일 입력"
                className="w-full p-3 rounded-xl border border-slate-200 focus:border-brand-500 focus:ring-2 focus:ring-brand-100 outline-none mb-4 text-sm"
                required
              />
              <div className="flex gap-2">
                <button 
                  type="button" 
                  onClick={() => setIsResetModalOpen(false)}
                  className="flex-1 py-2.5 text-slate-500 font-bold rounded-xl hover:bg-slate-100 transition"
                >
                  취소
                </button>
                <button 
                  type="submit"
                  className="flex-1 py-2.5 bg-brand-600 text-white font-bold rounded-xl hover:bg-brand-700 transition shadow-lg shadow-brand-500/30"
                >
                  메일 발송
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyPage;
