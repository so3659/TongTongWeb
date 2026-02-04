import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Bars3Icon, XMarkIcon, EnvelopeIcon, BellIcon } from '@heroicons/react/24/outline';
import { UserCircleIcon } from '@heroicons/react/24/solid';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabaseClient';

const Navbar = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();
  const { user, signOut } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [notiCount, setNotiCount] = useState(0);
  const [userProfile, setUserProfile] = useState(null);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Real-time Counts & Profile
  useEffect(() => {
    if (!user) {
      setUserProfile(null);
      return;
    }

    const fetchCountsAndProfile = async () => {
      // 1. Messages Count
      const { count: msgCount } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('receiver_id', user.id)
        .eq('is_read', false);
      setUnreadCount(msgCount || 0);

      // 2. Notifications Count
      const { count: nNotiCount } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('recipient_id', user.id)
        .eq('is_read', false);
      setNotiCount(nNotiCount || 0);

      // 3. User Profile
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('avatar_url, nickname')
        .eq('id', user.id)
        .single();
      
      if (error) console.error('Navbar Profile Fetch Error:', error);
      else setUserProfile(profile);
    };

    fetchCountsAndProfile();

    const msgSub = supabase
      .channel('unread-messages')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages', filter: `receiver_id=eq.${user.id}` }, fetchCountsAndProfile)
      .subscribe();

    const notiSub = supabase
      .channel('unread-notifications')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications', filter: `recipient_id=eq.${user.id}` }, fetchCountsAndProfile)
      .subscribe();

    // Profile Change Subscription
    const profileSub = supabase
      .channel('profile-changes')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'profiles', filter: `id=eq.${user.id}` }, (payload) => {
        console.log('Profile updated realtime:', payload.new);
        setUserProfile(payload.new);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(msgSub);
      supabase.removeChannel(notiSub);
      supabase.removeChannel(profileSub);
    };
  }, [user]);

  const navLinks = [
    { name: '홈', path: '/' },
    { name: '소개', path: '/about' },
    { name: '서포터즈', path: '/supporters' },
    { name: '게시판', path: '/board' },
    { name: '일정', path: '/calendar' },
  ];

  return (
    <>
      <nav 
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          isScrolled || isMobileMenuOpen 
            ? 'bg-white/80 backdrop-blur-md shadow-sm py-3' 
            : 'bg-transparent py-5'
        }`}
      >
        <div className="max-w-7xl mx-auto px-6 flex justify-between items-center">
          {/* Logo */}
          <Link to="/" className="group">
            <span className={`font-display font-bold text-2xl tracking-tighter transition-colors ${isScrolled ? 'text-slate-900' : 'text-slate-900'}`}>
              TongTong
            </span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <Link 
                key={link.name} 
                to={link.path}
                className={`relative font-medium text-sm transition-colors hover:text-brand-600 ${
                  location.pathname === link.path ? 'text-brand-600 font-bold' : 'text-slate-600'
                }`}
              >
                {link.name}
                {location.pathname === link.path && (
                  <motion.div 
                    layoutId="underline"
                    className="absolute -bottom-1 left-0 right-0 h-0.5 bg-brand-600 rounded-full"
                  />
                )}
              </Link>
            ))}
            
            {/* Auth Section */}
            {user ? (
              <div className="flex items-center gap-2 pl-4 border-l border-slate-200">
                {/* Notification Bell */}
                <Link to="/notifications" className="relative p-2 text-slate-500 hover:text-brand-600 transition-colors group">
                  <BellIcon className="w-6 h-6" />
                  {notiCount > 0 && (
                    <span className="absolute top-1 right-1 flex h-4 min-w-[1rem] px-1 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white ring-2 ring-white">
                      {notiCount > 99 ? '99+' : notiCount}
                    </span>
                  )}
                </Link>

                {/* Message Icon */}
                <Link to="/messages" className="relative p-2 text-slate-500 hover:text-brand-600 transition-colors group">
                  <EnvelopeIcon className="w-6 h-6" />
                  {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 flex h-4 min-w-[1rem] px-1 items-center justify-center rounded-full bg-brand-500 text-[10px] font-bold text-white ring-2 ring-white">
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                  )}
                </Link>

                {/* Profile Avatar */}
                <Link to="/mypage" className="relative group">
                  <div className="w-9 h-9 rounded-full bg-slate-100 border border-slate-200 overflow-hidden shadow-sm group-hover:ring-2 ring-brand-200 transition-all flex items-center justify-center">
                    {userProfile?.avatar_url ? (
                      <img src={userProfile.avatar_url} alt="profile" className="w-full h-full object-cover" />
                    ) : (
                      <UserCircleIcon className="w-full h-full text-slate-300" />
                    )}
                  </div>
                </Link>
              </div>
            ) : (
              <Link to="/mypage" className="px-5 py-2.5 bg-slate-900 text-white text-sm font-medium rounded-full hover:bg-slate-800 transition shadow-lg shadow-slate-900/20 active:scale-95">
                로그인
              </Link>
            )}
          </div>

          {/* Mobile Menu & Icons */}
          <div className="flex md:hidden items-center gap-1">
            {user && (
              <>
                {/* Notification Bell */}
                <Link 
                  to="/notifications" 
                  className="relative p-2 text-slate-500 hover:text-brand-600 transition-colors"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <BellIcon className="w-6 h-6" />
                  {notiCount > 0 && (
                    <span className="absolute top-1.5 right-1.5 flex h-4 min-w-[1rem] px-1 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white ring-2 ring-white">
                      {notiCount > 99 ? '99+' : notiCount}
                    </span>
                  )}
                </Link>

                {/* Message Icon */}
                <Link 
                  to="/messages" 
                  className="relative p-2 text-slate-500 hover:text-brand-600 transition-colors"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <EnvelopeIcon className="w-6 h-6" />
                  {unreadCount > 0 && (
                    <span className="absolute top-1.5 right-1.5 flex h-4 min-w-[1rem] px-1 items-center justify-center rounded-full bg-brand-500 text-[10px] font-bold text-white ring-2 ring-white">
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                  )}
                </Link>
              </>
            )}

            <button 
              className="p-2 text-slate-600"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              {isMobileMenuOpen ? <XMarkIcon className="w-6 h-6" /> : <Bars3Icon className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed inset-0 z-40 bg-white pt-24 px-6 md:hidden flex flex-col"
          >
            {/* Mobile Auth Profile */}
            {user && (
              <div className="flex items-center gap-4 mb-8 p-4 bg-slate-50 rounded-2xl">
                <div className="w-12 h-12 rounded-full bg-white border border-slate-200 overflow-hidden flex items-center justify-center">
                  {userProfile?.avatar_url ? (
                    <img src={userProfile.avatar_url} alt="profile" className="w-full h-full object-cover" />
                  ) : (
                    <UserCircleIcon className="w-full h-full text-slate-300" />
                  )}
                </div>
                <div>
                  <p className="font-bold text-slate-900">{userProfile?.nickname || user.email.split('@')[0]}</p>
                  <p className="text-xs text-slate-500">{user.email}</p>
                </div>
              </div>
            )}

            <div className="flex flex-col gap-6 flex-1">
              {navLinks.map((link) => (
                <Link 
                  key={link.name} 
                  to={link.path}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="text-2xl font-bold text-slate-800 hover:text-brand-600 transition"
                >
                  {link.name}
                </Link>
              ))}
              
              <hr className="border-slate-100 my-2" />
              
              {user ? (
                <>
                  <Link 
                    to="/mypage"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="text-lg font-medium text-slate-600"
                  >
                    마이페이지
                  </Link>
                  <button 
                    onClick={() => { signOut(); setIsMobileMenuOpen(false); }}
                    className="text-lg font-medium text-red-500 text-left mt-auto pb-8"
                  >
                    로그아웃
                  </button>
                </>
              ) : (
                <Link 
                  to="/mypage"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="text-lg font-medium text-slate-500"
                >
                  로그인 / 회원가입
                </Link>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default Navbar;
