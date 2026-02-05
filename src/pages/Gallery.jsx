import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { XMarkIcon, PhotoIcon } from '@heroicons/react/24/outline';
import { supabase } from '../lib/supabaseClient';

const ITEMS_PER_PAGE = 12;

const Gallery = () => {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);
  const [selectedImage, setSelectedImage] = useState(null);
  const observer = useRef();

  const lastElementRef = useCallback(node => {
    if (loading) return;
    if (observer.current) observer.current.disconnect();
    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore) {
        setPage(prevPage => prevPage + 1);
      }
    });
    if (node) observer.current.observe(node);
  }, [loading, hasMore]);

  const fetchActivities = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('club_activities')
        .select('*')
        .order('created_at', { ascending: false })
        .range(page * ITEMS_PER_PAGE, (page + 1) * ITEMS_PER_PAGE - 1);

      if (error) throw error;

      if (data) {
        setActivities(prev => {
          // 중복 방지: 기존 데이터에 없는 ID만 추가
          const newItems = data.filter(item => !prev.some(p => p.id === item.id));
          return [...prev, ...newItems];
        });
        if (data.length < ITEMS_PER_PAGE) {
          setHasMore(false);
        }
      }
    } catch (error) {
      console.error('Error fetching activities:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActivities();
  }, [page]);

  return (
    <div className="pt-32 pb-20 px-6 max-w-7xl mx-auto">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-16"
      >
        <h1 className="text-4xl md:text-5xl font-display font-bold text-slate-900 mb-4">Activity Gallery</h1>
        <p className="text-slate-500 text-lg">통통의 즐거운 활동 기록들을 확인해보세요.</p>
      </motion.div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {activities.map((activity, index) => (
          <motion.div
            key={activity.id}
            ref={index === activities.length - 1 ? lastElementRef : null}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: (index % ITEMS_PER_PAGE) * 0.05 }}
            className="group cursor-pointer"
            onClick={() => setSelectedImage(activity)}
          >
            <div className="relative aspect-square overflow-hidden rounded-2xl bg-slate-100 shadow-sm border border-slate-100 group-hover:shadow-xl transition-all duration-500">
              <img 
                src={activity.image_url} 
                alt={activity.title}
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-6">
                <h3 className="text-white font-bold text-lg translate-y-4 group-hover:translate-y-0 transition-transform duration-300">
                  {activity.title}
                </h3>
              </div>
            </div>
            <div className="mt-3 md:hidden">
              <h3 className="font-bold text-slate-800">{activity.title}</h3>
            </div>
          </motion.div>
        ))}
      </div>

      {loading && (
        <div className="flex justify-center mt-12">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-brand-500"></div>
        </div>
      )}

      {!hasMore && activities.length > 0 && (
        <p className="text-center text-slate-400 mt-20 font-medium">모든 활동 사진을 불러왔습니다.</p>
      )}

      {activities.length === 0 && !loading && (
        <div className="text-center py-20 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
          <PhotoIcon className="w-16 h-16 text-slate-200 mx-auto mb-4" />
          <p className="text-slate-400 font-medium">등록된 활동 사진이 없습니다.</p>
        </div>
      )}

      {/* Lightbox */}
      <AnimatePresence>
        {selectedImage && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4"
            onClick={() => setSelectedImage(null)}
          >
            <button className="absolute top-6 right-6 text-white/70 hover:text-white transition-colors p-2">
              <XMarkIcon className="w-10 h-10" />
            </button>
            <div className="max-w-5xl w-full flex flex-col items-center gap-6" onClick={e => e.stopPropagation()}>
              <motion.img 
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                src={selectedImage.image_url} 
                alt={selectedImage.title} 
                className="max-h-[80vh] object-contain rounded-lg shadow-2xl"
              />
              <div className="text-center">
                <h2 className="text-white text-2xl font-bold mb-2">{selectedImage.title}</h2>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Gallery;
