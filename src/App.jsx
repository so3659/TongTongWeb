import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import React, { Suspense, useState, useRef, useEffect } from 'react';
import Navbar from './components/layout/Navbar';
import { MusicalNoteIcon, PauseIcon } from '@heroicons/react/24/solid';
import bgMusic from './assets/audio/tong_music.mp3';

// Lazy loading pages for performance
const Home = React.lazy(() => import('./pages/Home'));
const About = React.lazy(() => import('./pages/About'));
const Board = React.lazy(() => import('./pages/Board'));
const PostWrite = React.lazy(() => import('./pages/PostWrite'));
const PostEdit = React.lazy(() => import('./pages/PostEdit'));
const PostDetail = React.lazy(() => import('./pages/PostDetail'));
const Calendar = React.lazy(() => import('./pages/Calendar'));
const Messages = React.lazy(() => import('./pages/Messages'));
const Notifications = React.lazy(() => import('./pages/Notifications'));
const UpdatePassword = React.lazy(() => import('./pages/UpdatePassword'));
const Supporters = React.lazy(() => import('./pages/Supporters'));
const PastExecutives = React.lazy(() => import('./pages/about/PastExecutives'));
const ManageAbout = React.lazy(() => import('./pages/admin/ManageAbout'));

// MyPage Sub-pages
const MyPage = React.lazy(() => import('./pages/MyPage')); // Auth Wrapper & Main
const MyPosts = React.lazy(() => import('./pages/mypage/MyPosts'));
const MyComments = React.lazy(() => import('./pages/mypage/MyComments'));
const BlockedList = React.lazy(() => import('./pages/mypage/BlockedList'));

// Placeholders for other pages
const Chat = () => <div className="pt-32 text-center text-2xl font-bold text-slate-300">채팅 (Coming Soon)</div>;

function App() {
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef(null);

  useEffect(() => {
    audioRef.current = new Audio(bgMusic);
    audioRef.current.loop = true;
    audioRef.current.volume = 0.5; // Set reasonable volume

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  const togglePlay = () => {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play().catch(error => {
        console.error("Audio play failed:", error);
        // Handle autoplay policy errors if needed
      });
    }
    setIsPlaying(!isPlaying);
  };

  return (
    <Router>
      <div className="min-h-screen bg-slate-50 font-sans selection:bg-brand-200 selection:text-brand-900">
        <Navbar />

        <main className="relative z-0">
          <Suspense fallback={
            <div className="flex items-center justify-center h-screen text-brand-500">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-current"></div>
            </div>
          }>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/about" element={<About />} />
              <Route path="/about/past-executives" element={<PastExecutives />} />
              <Route path="/supporters" element={<Supporters />} />
              <Route path="/admin/manage-about" element={<ManageAbout />} />
              <Route path="/board" element={<Board />} />
              <Route path="/board/write" element={<PostWrite />} />
              <Route path="/board/:id" element={<PostDetail />} />
              <Route path="/board/:id/edit" element={<PostEdit />} />
              <Route path="/calendar" element={<Calendar />} />
              <Route path="/messages" element={<Messages />} />
              <Route path="/notifications" element={<Notifications />} />
              <Route path="/update-password" element={<UpdatePassword />} />
              <Route path="/chat" element={<Chat />} />
              
              {/* MyPage Routes (Order matters: specific first) */}
              <Route path="/mypage/posts" element={<MyPosts />} />
              <Route path="/mypage/comments" element={<MyComments />} />
              <Route path="/mypage/blocks" element={<BlockedList />} />
              <Route path="/mypage" element={<MyPage />} />
            </Routes>
          </Suspense>
        </main>
        
        {/* Floating Music Player (Enhanced) */}
        <div className="fixed bottom-6 right-6 z-40">
           <button 
             onClick={togglePlay}
             className="flex items-center gap-3 bg-white/90 backdrop-blur-md px-4 py-3 rounded-full shadow-2xl border border-white/50 hover:scale-105 transition-transform group"
           >
             <div className={`w-10 h-10 bg-slate-900 rounded-full flex items-center justify-center text-brand-400 ${isPlaying ? 'animate-spin-slow' : ''}`}>
               {isPlaying ? <PauseIcon className="w-5 h-5" /> : <MusicalNoteIcon className="w-5 h-5" />}
             </div>
             <div className="text-left hidden md:block">
               <p className="text-xs text-slate-500 font-medium">{isPlaying ? 'Now Playing' : 'Music Off'}</p>
               <p className="text-sm font-bold text-slate-800">TongTong Theme</p>
             </div>
           </button>
        </div>
      </div>
    </Router>
  );
}

export default App;