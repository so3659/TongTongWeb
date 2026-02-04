import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { UserCircleIcon, HeartIcon, StarIcon, XMarkIcon } from '@heroicons/react/24/solid';

const Supporters = () => {
  const [selectedImage, setSelectedImage] = useState(null);

  const credits = [
    { role: 'Lead Developer', name: '11기 김성욱 (전 총무)', imgUrl: 'https://tlecuwgddpolkczjhjzk.supabase.co/storage/v1/object/public/supporters/seonguk.jpg' },
    { role: 'Lead Illustrator', name: '11기 장윤정 (이먼진)', imgUrl: 'https://tlecuwgddpolkczjhjzk.supabase.co/storage/v1/object/public/executive-images/exec_1770123716772_yoon.jpg' },
    { role: 'Music Director', name: '12.5기 김태리', imgUrl: 'https://tlecuwgddpolkczjhjzk.supabase.co/storage/v1/object/public/executive-images/exec_1770117074087_teri.jpg' },
    { role: 'Ideation', name: '10기 권종우 (12기 회장)', imgUrl: 'https://tlecuwgddpolkczjhjzk.supabase.co/storage/v1/object/public/supporters/jongu.jpg' },
    { role: 'Ideation', name: '12.5기 신유진', imgUrl: 'https://tlecuwgddpolkczjhjzk.supabase.co/storage/v1/object/public/supporters/Ujin.jpg' },
  ];

  const specialSponsors = [
    { name: '최강한화우승', desc: 'Special Thanks', imgUrl: 'https://tlecuwgddpolkczjhjzk.supabase.co/storage/v1/object/public/supporters/sister.jpg' }, 
    { name: '유탄발사기', desc: 'Special Thanks', imgUrl: 'https://tlecuwgddpolkczjhjzk.supabase.co/storage/v1/object/public/supporters/hyo.jpg' },
    { name: '공군851일병임두빈', desc: 'Special Thanks', imgUrl: 'https://tlecuwgddpolkczjhjzk.supabase.co/storage/v1/object/public/supporters/dubin.png' },
    { name: '탕후루인', desc: 'Special Thanks', imgUrl: 'https://tlecuwgddpolkczjhjzk.supabase.co/storage/v1/object/public/supporters/uin.jpg' },
    { name: '최유빈', desc: 'Special Thanks', imgUrl: 'https://tlecuwgddpolkczjhjzk.supabase.co/storage/v1/object/public/supporters/yubin.jpg' },
    { name: '김태리 (Atlas)', desc: 'Special Thanks', imgUrl: 'https://tlecuwgddpolkczjhjzk.supabase.co/storage/v1/object/public/executive-images/exec_1770117074087_teri.jpg' },
  ];

  const generalSponsors = [
    { name: '11기 양경은 (12기 부회장)', imgUrl: 'https://tlecuwgddpolkczjhjzk.supabase.co/storage/v1/object/public/supporters/yang.jpg' },
    { name: '한무당', imgUrl: null },
    { name: '익명의 염소', imgUrl: null },
    { name: '안소연', imgUrl: null },
    { name: '전역하고 싶은 유승빈', imgUrl: null },
    { name: '허지원', imgUrl: null },
    { name: '마당발블림빙', imgUrl: null },
    { name: '이민주', imgUrl: null },
    { name: '윤석열', imgUrl: null },
    { name: '황재근패션연구소', imgUrl: null },
    { name: '통통화이팅', imgUrl: null },
    { name: '이준팔', imgUrl: null },
    { name: '민동댕동', imgUrl: null },
    { name: '정히히', imgUrl: 'https://tlecuwgddpolkczjhjzk.supabase.co/storage/v1/object/public/executive-images/exec_1770114994779_hee.jpg' },
    { name: '곽병민', imgUrl: null },
    { name: '의룡인', imgUrl: null }
  ];

  const ProductionCard = ({ name, role, imgUrl, delay = 0 }) => (
    <motion.div 
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay, duration: 0.5 }}
      whileHover={{ y: -5, transition: { duration: 0.2 } }}
      className="bg-white p-6 rounded-3xl shadow-lg border border-slate-100 flex flex-col items-center text-center relative overflow-hidden group"
    >
      <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-brand-400 to-purple-500" />
      
      <div 
        className={`w-24 h-24 rounded-full p-1 bg-gradient-to-tr from-brand-300 to-purple-300 mb-4 group-hover:scale-105 transition-transform duration-300 ${imgUrl ? 'cursor-pointer' : ''}`}
        onClick={() => imgUrl && setSelectedImage(imgUrl)}
      >
        <div className="w-full h-full rounded-full bg-white flex items-center justify-center text-slate-300 overflow-hidden relative">
           {imgUrl ? (
             <img src={imgUrl} alt={name} className="w-full h-full object-cover" />
           ) : (
             <UserCircleIcon className="w-20 h-20 text-slate-200" />
           )}
        </div>
      </div>
      
      <h3 className="font-display font-bold text-slate-900 text-xl mb-1">{name}</h3>
      <span className="text-xs font-bold text-transparent bg-clip-text bg-gradient-to-r from-brand-600 to-purple-600 uppercase tracking-widest">
        {role}
      </span>
    </motion.div>
  );

  const AvatarCard = ({ name, role, imgUrl, delay = 0 }) => (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay }}
      className="flex flex-col items-center text-center p-4"
    >
      <div 
        className={`w-20 h-20 rounded-full bg-slate-100 mb-4 flex items-center justify-center text-slate-300 shadow-sm border border-slate-50 overflow-hidden ${imgUrl ? 'cursor-pointer' : ''}`}
        onClick={() => imgUrl && setSelectedImage(imgUrl)}
      >
        {imgUrl ? (
          <img src={imgUrl} alt={name} className="w-full h-full object-cover" />
        ) : (
          <UserCircleIcon className="w-16 h-16" />
        )}
      </div>
      <h3 className="font-bold text-slate-900 text-base mb-1">{name}</h3>
      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
        {role}
      </span>
    </motion.div>
  );

  const HighlightCard = ({ name, role, imgUrl, delay = 0 }) => (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true }}
      transition={{ delay }}
      whileHover={{ y: -5 }}
      className="bg-white rounded-2xl shadow-md border border-slate-100 overflow-hidden group h-full flex flex-col"
    >
      <div 
        className={`h-48 bg-slate-200 flex items-center justify-center text-slate-400 group-hover:bg-brand-100 group-hover:text-brand-300 transition-colors relative overflow-hidden ${imgUrl ? 'cursor-pointer' : ''}`}
        onClick={() => imgUrl && setSelectedImage(imgUrl)}
      >
        {imgUrl ? (
          <img src={imgUrl} alt={name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
        ) : (
          <UserCircleIcon className="w-32 h-32" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
           {imgUrl && <span className="text-white text-xs font-bold bg-black/30 px-3 py-1 rounded-full backdrop-blur-sm border border-white/20">크게 보기</span>}
        </div>
      </div>
      <div className="p-6 text-center flex-1 flex flex-col justify-center">
        <h3 className="font-bold text-slate-900 text-xl mb-2">{name}</h3>
        <span className="text-sm font-medium text-slate-500 flex items-center justify-center gap-1">
          <HeartIcon className="w-4 h-4 text-red-400" />
          {role}
        </span>
      </div>
    </motion.div>
  );

  return (
    <div className="pt-32 pb-20 px-6 max-w-6xl mx-auto">
      <div className="text-center mb-20">
        <h1 className="text-4xl md:text-5xl font-display font-bold text-slate-900 mb-4">
          Supporters
        </h1>
        <p className="text-slate-500 text-lg">
          통통 웹사이트를 함께 만들어주신 소중한 분들입니다.
        </p>
      </div>

      {/* Core Team Credits */}
      <section className="mb-32">
        <h2 className="text-3xl font-bold text-slate-900 mb-12 text-center flex items-center justify-center gap-3">
          <StarIcon className="w-8 h-8 text-yellow-400" />
          Production Team
          <StarIcon className="w-8 h-8 text-yellow-400" />
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 justify-center max-w-5xl mx-auto">
          {credits.map((credit, idx) => (
            <ProductionCard key={idx} name={credit.name} role={credit.role} imgUrl={credit.imgUrl} delay={idx * 0.1} />
          ))}
        </div>
      </section>

      {/* Special Highlights */}
      <section className="mb-24 px-4 md:px-10">
        <h2 className="text-2xl font-bold text-slate-900 mb-10 text-center flex items-center justify-center gap-3">
          <HeartIcon className="w-6 h-6 text-red-500" />
          Special Thanks
          <HeartIcon className="w-6 h-6 text-red-500" />
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {specialSponsors.map((person, idx) => (
            <HighlightCard key={idx} name={person.name} role={person.desc} imgUrl={person.imgUrl} delay={idx * 0.1} />
          ))}
        </div>
      </section>

      {/* General Sponsors */}
      <section>
        <h2 className="text-2xl font-bold text-slate-900 mb-10 text-center">
          Sponsors
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6">
          {generalSponsors.map((person, idx) => (
            <AvatarCard key={idx} name={person.name} role="Sponsor" imgUrl={person.imgUrl} delay={idx * 0.05} />
          ))}
        </div>
        <p className="text-center text-slate-400 text-sm mt-16">
          그리고 언제나 통통을 응원해주시는 모든 부원 여러분 감사합니다.
        </p>
      </section>
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

export default Supporters;
