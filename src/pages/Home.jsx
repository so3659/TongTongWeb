import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRightIcon, MegaphoneIcon, CalendarDaysIcon } from '@heroicons/react/24/outline';
import logo from '../assets/image/통통로고 검정.png';
import { supabase } from '../lib/supabaseClient';
import { format, endOfMonth, differenceInDays, startOfDay } from 'date-fns';

const Home = () => {
  const [notices, setNotices] = useState([]);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const today = new Date();
        const start = startOfDay(today).toISOString();
        const end = endOfMonth(today).toISOString();

        // 1. Fetch Top 3 Notices
        const { data: noticesData } = await supabase
          .from('posts')
          .select('id, title, created_at, category')
          .eq('category', '공지')
          .order('created_at', { ascending: false })
          .limit(3);

        // 2. Fetch This Month's Schedules
        const { data: schedulesData } = await supabase
          .from('schedules')
          .select('*')
          .gte('start_date', start)
          .lte('start_date', end)
          .order('start_date', { ascending: true })
          .limit(3);

        if (noticesData) setNotices(noticesData);
        if (schedulesData) setEvents(schedulesData);

      } catch (error) {
        console.error('Failed to fetch home data', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const getDDay = (dateStr) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const target = new Date(dateStr);
    target.setHours(0, 0, 0, 0);
    const diff = differenceInDays(target, today);
    
    if (diff === 0) return 'Today';
    if (diff < 0) return 'End';
    return `D-${diff}`;
  };

  return (
    <div className="pb-20">
      {/* Hero Section */}
      <section className="relative pt-32 pb-20 px-6 overflow-hidden">
        {/* Background Decorative Blobs */}
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-96 h-96 bg-brand-100 rounded-full blur-3xl opacity-50 -z-10 animate-pulse" />
        <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-80 h-80 bg-blue-100 rounded-full blur-3xl opacity-50 -z-10" />

        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8 }}
            className="mb-8 relative inline-block"
          >
            <div className="w-40 h-40 md:w-56 md:h-56 bg-white rounded-[2rem] shadow-glass flex items-center justify-center mx-auto p-6 rotate-3 hover:rotate-0 transition-all duration-500">
              <img src={logo} alt="TongTong Logo" className="w-full h-full object-contain" />
            </div>
            {/* Decorative music notes could go here */}
          </motion.div>

          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-4xl md:text-6xl font-display font-bold text-slate-900 mb-6 tracking-tight leading-tight"
          >
            너와 나, 통기타로 통하다.<br />
            <span className="text-brand-600 relative">
              통통
              <svg className="absolute w-full h-3 -bottom-1 left-0 text-brand-200 -z-10" viewBox="0 0 100 10" preserveAspectRatio="none">
                <path d="M0 5 Q 50 10 100 5" stroke="currentColor" strokeWidth="8" fill="none" />
              </svg>
            </span>
          </motion.h1>

          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-lg md:text-xl text-slate-600 mb-10 max-w-xl mx-auto leading-relaxed"
          >
            경희대학교 중앙 통기타 동아리 통통입니다.<br/>
            초보자부터 실력자까지, 기타를 사랑하는 누구나 환영합니다.
          </motion.p>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="flex flex-col sm:flex-row justify-center gap-4"
          >
            <Link to="/about" className="btn-primary flex items-center justify-center gap-2 group">
              동아리 소개 보러가기
              <ArrowRightIcon className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link to="/board" className="btn-secondary">
              게시판 구경하기
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Info Cards Grid */}
      <section className="max-w-6xl mx-auto px-6 mt-10">
        <div className="grid md:grid-cols-2 gap-6">
          {/* Notice Card */}
          <motion.div 
            whileHover={{ y: -5 }}
            className="glass-panel p-8 relative overflow-hidden group min-h-[300px]"
          >
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <MegaphoneIcon className="w-24 h-24 text-brand-600" />
            </div>
            
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <MegaphoneIcon className="w-6 h-6 text-brand-500" />
                주요 공지사항
              </h3>
              <button 
                onClick={() => navigate('/board', { state: { category: '공지' } })}
                className="text-xs font-bold text-slate-400 hover:text-brand-600 cursor-pointer transition-colors relative z-10"
              >
                더보기 +
              </button>
            </div>
            
            {loading ? (
              <div className="animate-pulse space-y-4">
                <div className="h-6 bg-slate-100 rounded w-3/4"></div>
                <div className="h-6 bg-slate-100 rounded w-1/2"></div>
                <div className="h-6 bg-slate-100 rounded w-2/3"></div>
              </div>
            ) : notices.length > 0 ? (
              <ul className="space-y-4">
                {notices.map((notice) => (
                  <li 
                    key={notice.id} 
                    onClick={() => navigate(`/board/${notice.id}`)}
                    className="flex items-start justify-between group/item cursor-pointer relative z-10"
                  >
                    <div className="flex-1 pr-4">
                      <span className="inline-block px-2 py-0.5 text-xs font-bold bg-brand-50 text-brand-600 rounded mr-2 group-hover/item:bg-brand-100 transition-colors">
                        공지
                      </span>
                      <span className="text-slate-700 font-medium group-hover/item:text-brand-700 transition-colors line-clamp-1">
                        {notice.title}
                      </span>
                    </div>
                    <span className="text-sm text-slate-400 whitespace-nowrap">
                      {format(new Date(notice.created_at), 'MM.dd')}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="text-center py-10 text-slate-400 text-sm">
                등록된 공지사항이 없습니다.
              </div>
            )}
          </motion.div>

          {/* Activity Preview / Calendar Card */}
          <motion.div 
            whileHover={{ y: -5 }}
            className="glass-panel p-8 relative overflow-hidden group min-h-[300px]"
          >
             <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <CalendarDaysIcon className="w-24 h-24 text-blue-600" />
            </div>

            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <CalendarDaysIcon className="w-6 h-6 text-blue-500" />
                이번 달 활동 ({format(new Date(), 'M월')})
              </h3>
              <button 
                onClick={() => navigate('/calendar', { state: { date: new Date().toISOString() } })}
                className="text-xs font-bold text-slate-400 hover:text-blue-600 cursor-pointer transition-colors relative z-10"
              >
                더보기 +
              </button>
            </div>

            {loading ? (
               <div className="animate-pulse space-y-4">
                 <div className="h-16 bg-slate-100 rounded-lg"></div>
                 <div className="h-16 bg-slate-100 rounded-lg"></div>
               </div>
            ) : events.length > 0 ? (
              <div className="space-y-4">
                {events.map((event) => (
                  <div 
                    key={event.id} 
                    onClick={() => navigate('/calendar', { state: { date: event.start_date } })}
                    className="flex gap-4 items-center p-3 rounded-lg hover:bg-white/50 transition border border-transparent hover:border-slate-100 cursor-pointer relative z-10"
                  >
                    <div className="flex-shrink-0 w-14 h-14 bg-blue-50 rounded-xl flex flex-col items-center justify-center text-blue-600">
                      <span className="text-xs font-bold text-blue-400 uppercase">{getDDay(event.start_date)}</span>
                      <span className="text-xl font-bold leading-none">{format(new Date(event.start_date), 'd')}</span>
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-800 line-clamp-1">{event.title}</h4>
                      <div className="flex items-center gap-2 text-sm text-slate-500">
                        <span>{format(new Date(event.start_date), 'HH:mm')}</span>
                        {event.location && <span className="text-slate-300">|</span>}
                        {event.location && <span className="truncate max-w-[120px]">{event.location}</span>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-10 text-slate-400 text-sm">
                이번 달 예정된 활동이 없습니다.
              </div>
            )}
          </motion.div>
        </div>
      </section>
    </div>
  );
};

export default Home;