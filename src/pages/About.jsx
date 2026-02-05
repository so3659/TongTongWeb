import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { UserCircleIcon, ArrowRightIcon, CheckCircleIcon } from '@heroicons/react/24/solid';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { supabase } from '../lib/supabaseClient';

const About = () => {
  const [executives, setExecutives] = useState([]);
  const [history, setHistory] = useState([]);
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentGen, setCurrentGen] = useState(16); // Default
  const [selectedImage, setSelectedImage] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch Current Executives
        const { data: execData } = await supabase
          .from('club_executives')
          .select('*')
          .eq('is_current', true);
        
        if (execData && execData.length > 0) {
          // Sort Logic: 회장(1) -> 부회장(2) -> 총무(3) -> 기타(4)
          const priority = { '회장': 1, '부회장': 2, '총무': 3 };
          const sortedExecs = [...execData].sort((a, b) => {
            const pA = priority[a.role] || 4;
            const pB = priority[b.role] || 4;
            return pA - pB;
          });
          setExecutives(sortedExecs);

          // Calculate max generation
          const maxGen = Math.max(...execData.map(e => e.generation));
          setCurrentGen(maxGen);
        }

        // Fetch History
        const { data: histData } = await supabase
          .from('club_history')
          .select('*')
          .order('event_date', { ascending: false }); 
        
        if (histData) setHistory(histData);

        // Fetch Random Activities (using RPC for better performance/randomness)
        const { data: actData, error: rpcError } = await supabase
          .rpc('get_random_activities', { limit_count: 8 });
        
        if (!rpcError && actData) {
          setActivities(actData);
        } else {
          // Fallback: If RPC fails, fetch latest 8
          const { data: fallbackData } = await supabase
            .from('club_activities')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(8);
          if (fallbackData) setActivities(fallbackData);
        }

      } catch (error) {
        console.error('Error fetching about data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  return (
    <div className="pt-32 pb-20 px-6 max-w-5xl mx-auto">
      
      {/* 1. Executives */}
      <section className="mb-32 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <span className="text-brand-600 font-bold tracking-widest uppercase text-sm mb-2 block">Leadership</span>
          <h1 className="text-3xl md:text-4xl font-display font-bold text-slate-900 mb-12">
            제 {currentGen}기 임원진을 소개합니다
          </h1>
        </motion.div>

        {loading ? (
          <div className="text-center py-10">로딩중...</div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 justify-center">
            {executives.length > 0 ? executives.map((person, idx) => (
              <motion.div 
                key={person.id}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.1 }}
                className="flex flex-col items-center"
              >
                <div 
                  className={`w-24 h-24 md:w-32 md:h-32 rounded-full bg-slate-100 mb-4 overflow-hidden border-4 border-white shadow-lg flex items-center justify-center relative group ${person.image_url ? 'cursor-pointer' : ''}`}
                  onClick={() => person.image_url && setSelectedImage(person.image_url)}
                >
                  {person.image_url ? (
                    <>
                      <img src={person.image_url} alt={person.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                      <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <span className="text-white text-xs font-bold bg-black/30 px-2 py-1 rounded-full backdrop-blur-sm">View</span>
                      </div>
                    </>
                  ) : (
                    <UserCircleIcon className="w-full h-full text-slate-300" />
                  )}
                </div>
                <h3 className="font-bold text-slate-900 text-lg">{person.name}</h3>
                <span className="text-brand-600 font-medium text-sm">{person.role}</span>
              </motion.div>
            )) : <p className="col-span-full text-slate-400">등록된 임원진이 없습니다.</p>}
          </div>
        )}

        <div className="mt-12">
          <Link 
            to="/about/past-executives"
            className="inline-flex items-center gap-2 text-slate-500 hover:text-slate-900 font-medium transition group"
          >
            역대 임원진 보러가기
            <ArrowRightIcon className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
      </section>

      {/* 2. Activity Preview */}
      <section className="mb-32">
        <div className="flex justify-between items-end mb-10">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">활동 미리보기</h2>
          </div>
          <Link 
            to="/gallery"
            className="text-brand-600 font-bold text-sm hover:underline flex items-center gap-1"
          >
            전체 보기
            <ArrowRightIcon className="w-4 h-4" />
          </Link>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="aspect-square bg-slate-100 animate-pulse rounded-2xl" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {activities.length > 0 ? activities.map((act, idx) => (
              <motion.div
                key={act.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.05 }}
                className="group relative aspect-square overflow-hidden rounded-2xl bg-slate-100 cursor-pointer"
                onClick={() => setSelectedImage(act.image_url)}
              >
                <img 
                  src={act.image_url} 
                  alt={act.title} 
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" 
                />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-4">
                  <p className="text-white text-xs font-bold truncate">{act.title}</p>
                </div>
              </motion.div>
            )) : (
              <div className="col-span-full py-20 text-center bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
                <p className="text-slate-400 font-medium">등록된 활동 사진이 없습니다.</p>
              </div>
            )}
          </div>
        )}
      </section>

      {/* 3. History Timeline */}
      <section className="mb-32 max-w-3xl mx-auto">
        <h2 className="text-2xl font-bold text-slate-900 mb-10 text-center">우리가 걸어온 길</h2>
        <div className="relative border-l-2 border-slate-200 ml-4 md:ml-0 space-y-10">
          {history.length > 0 ? history.map((item, idx) => (
            <motion.div 
              key={item.id}
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="relative pl-8 md:pl-0 md:flex gap-10 items-start group"
            >
              <div className="absolute left-[-5px] top-1 w-3 h-3 rounded-full bg-white border-2 border-brand-500 z-10 group-hover:scale-125 transition-transform" />
              
              <div className="md:w-32 md:text-right flex-shrink-0">
                <span className="text-brand-600 font-bold text-xl">{item.event_date.split('-')[0]}</span>
                <p className="text-xs text-slate-400">{item.event_date}</p>
              </div>
              
              <div className="flex-1 pb-2">
                <h3 className="text-lg font-bold text-slate-800 mb-1">{item.title}</h3>
                <p className="text-slate-500 text-sm leading-relaxed whitespace-pre-wrap">
                  {item.description?.split(/(https?:\/\/[^\s]+)/g).map((part, i) => 
                    part.match(/^https?:\/\//) ? (
                      <a key={i} href={part} target="_blank" rel="noopener noreferrer" className="text-brand-600 hover:underline break-all">
                        {part}
                      </a>
                    ) : part
                  )}
                </p>
              </div>
            </motion.div>
          )) : <p className="pl-8 text-slate-400">등록된 연혁이 없습니다.</p>}
        </div>
      </section>

      {/* 3. Connect (Existing) */}
      <div className="text-center mb-16 pt-16 border-t border-slate-100">
        <h1 className="text-3xl md:text-4xl font-display font-bold text-slate-900 mb-6">
          Connect with <span className="text-brand-600">TongTong</span>
        </h1>
        <p className="text-slate-600 text-lg max-w-2xl mx-auto">
          통통은 온라인과 오프라인에서 활발하게 소통하고 있습니다.<br/>
          공식 SNS와 커뮤니티에서 더 많은 이야기를 만나보세요.
        </p>
      </div>
      
      <div className="grid md:grid-cols-2 gap-8 mb-20">
        {/* Instagram Card */}
        <motion.a 
          href="https://www.instagram.com/t_tong.official/" 
          target="_blank" 
          rel="noopener noreferrer"
          whileHover={{ y: -8 }}
          className="group block relative overflow-hidden rounded-3xl bg-white shadow-xl hover:shadow-2xl transition-all duration-300 border border-slate-100"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-purple-500 via-pink-500 to-orange-500 opacity-0 group-hover:opacity-10 transition-opacity duration-300" />
          
          <div className="p-10 flex flex-col h-full relative z-10">
            <div className="w-16 h-16 bg-gradient-to-tr from-yellow-400 via-red-500 to-purple-600 rounded-2xl flex items-center justify-center text-white mb-6 shadow-md group-hover:scale-110 transition-transform duration-300">
               <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
            </div>
            
            <h3 className="text-2xl font-bold text-slate-900 mb-1">Instagram</h3>
            <p className="text-slate-500 font-medium mb-6">@t_tong.official</p>
            
            <div className="mt-auto">
              <p className="text-slate-600 mb-4 leading-relaxed">
                공연 사진, 뒤풀이 영상, 동아리방 일상 등<br/>
                통통의 가장 <span className="font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-500 to-pink-500">힙한 순간</span>들을 확인하세요.
              </p>
              <span className="inline-flex items-center text-pink-600 font-bold group-hover:underline">
                팔로우 하러가기 →
              </span>
            </div>
          </div>
        </motion.a>

        {/* Naver Cafe Card */}
        <motion.a 
          href="https://cafe.naver.com/tongtongkhu" 
          target="_blank" 
          rel="noopener noreferrer"
          whileHover={{ y: -8 }}
          className="group block relative overflow-hidden rounded-3xl bg-white shadow-xl hover:shadow-2xl transition-all duration-300 border border-slate-100"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-green-400 to-green-600 opacity-0 group-hover:opacity-10 transition-opacity duration-300" />
          
          <div className="p-10 flex flex-col h-full relative z-10">
            <div className="w-16 h-16 bg-[#03C75A] rounded-2xl flex items-center justify-center text-white mb-6 shadow-md group-hover:scale-110 transition-transform duration-300">
               <span className="font-black text-3xl">N</span>
            </div>
            
            <h3 className="text-2xl font-bold text-slate-900 mb-1">Naver Cafe</h3>
            <p className="text-slate-500 font-medium mb-6">cafe.naver.com/tongtongkhu</p>
            
            <div className="mt-auto">
              <p className="text-slate-600 mb-4 leading-relaxed">
                악보 아카이브, 정기 모임 공지, 활동 후기 등<br/>
                통통의 <span className="font-bold text-green-600">깊이 있는 정보</span>가 모여있는 곳입니다.
              </p>
              <span className="inline-flex items-center text-green-600 font-bold group-hover:underline">
                가입 하러가기 →
              </span>
            </div>
          </div>
        </motion.a>
      </div>

      {/* Image Lightbox */}
      <AnimatePresence>
        {selectedImage && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4 cursor-pointer"
            onClick={() => setSelectedImage(null)}
          >
            <button className="absolute top-6 right-6 text-white/70 hover:text-white transition">
              <XMarkIcon className="w-8 h-8" />
            </button>
            <motion.img 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              src={selectedImage} 
              alt="Full Size" 
              className="max-w-full max-h-screen object-contain rounded-lg shadow-2xl"
              onClick={(e) => e.stopPropagation()} 
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default About;