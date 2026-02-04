import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { UserCircleIcon, ArrowRightIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';

const PastExecutives = () => {
  const navigate = useNavigate();
  const [groupedExecs, setGroupedExecs] = useState({});
  const [generations, setGenerations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const { data } = await supabase
        .from('club_executives')
        .select('*')
        .eq('is_current', false)
        .order('generation', { ascending: false });

      if (data) {
        // Group by generation
        const groups = {};
        const rolePriority = { '회장': 1, '부회장': 2, '총무': 3 };

        data.forEach(item => {
          if (!groups[item.generation]) groups[item.generation] = [];
          groups[item.generation].push(item);
        });

        // Sort members inside each generation
        Object.keys(groups).forEach(gen => {
          groups[gen].sort((a, b) => {
            const pA = rolePriority[a.role] || 4;
            const pB = rolePriority[b.role] || 4;
            return pA - pB;
          });
        });

        setGroupedExecs(groups);
        setGenerations(Object.keys(groups).sort((a, b) => b - a));
      }
      setLoading(false);
    };
    fetchData();
  }, []);

  return (
    <div className="pt-32 pb-20 px-6 max-w-6xl mx-auto">
      <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-slate-500 hover:text-slate-900 mb-8 transition">
        <ArrowRightIcon className="w-4 h-4 rotate-180" />
        돌아가기
      </button>

      <h1 className="text-3xl md:text-4xl font-display font-bold text-slate-900 mb-16 text-center">
        History of Leadership
      </h1>

      <div className="space-y-20">
        {loading ? (
          <div className="text-center py-20 text-slate-400">로딩중...</div>
        ) : generations.length > 0 ? (
          generations.map(gen => (
            <section key={gen} className="relative">
              <div className="flex items-center gap-4 mb-8">
                <span className="text-2xl font-bold text-brand-600 bg-brand-50 px-4 py-1 rounded-lg">
                  제 {gen}기
                </span>
                <div className="h-px bg-slate-200 flex-1"></div>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-8 justify-center">
                {groupedExecs[gen].map((person, idx) => (
                  <motion.div 
                    key={person.id}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: idx * 0.05 }}
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
                    <span className="text-slate-500 font-medium text-sm">{person.role}</span>
                  </motion.div>
                ))}
              </div>
            </section>
          ))
        ) : (
          <div className="text-center py-20 text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
            등록된 역대 임원진 데이터가 없습니다.
          </div>
        )}
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


export default PastExecutives;
