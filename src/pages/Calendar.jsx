import React, { useState, useEffect } from 'react';
import Calendar from 'react-calendar';
import { format, isSameDay, parseISO } from 'date-fns';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';
import { useLocation } from 'react-router-dom';
import { PlusIcon, MapPinIcon, TrashIcon, PencilIcon } from '@heroicons/react/24/outline';
import 'react-calendar/dist/Calendar.css';
import '../styles/calendar.css';

const EVENT_COLORS = {
  '공연': 'bg-red-500',
  '정기모임': 'bg-blue-500',
  '번개': 'bg-yellow-500',
  '기타': 'bg-gray-500',
};

const CalendarPage = () => {
  const { user } = useAuth();
  const location = useLocation();
  const initialDate = location.state?.date ? parseISO(location.state.date) : new Date();
  const [date, setDate] = useState(initialDate);
  const [schedules, setSchedules] = useState([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState(null);
  const [loading, setLoading] = useState(true);

  // Form State
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    start_date: '',
    start_time: '18:00',
    event_type: '정기모임',
    location: ''
  });

  useEffect(() => {
    fetchSchedules();
    checkAdmin();
  }, []);

  const checkAdmin = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();
    if (data?.role === 'admin' || data?.role === 'master') setIsAdmin(true);
  };

  const fetchSchedules = async () => {
    const { data, error } = await supabase
      .from('schedules')
      .select('*')
      .order('start_date', { ascending: true });
    
    if (error) console.error(error);
    else setSchedules(data || []);
    setLoading(false);
  };

  const handleOpenAddModal = () => {
    setEditingSchedule(null);
    setFormData({
      title: '',
      description: '',
      start_date: format(date, 'yyyy-MM-dd'),
      start_time: '18:00',
      event_type: '정기모임',
      location: ''
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (schedule) => {
    setEditingSchedule(schedule);
    const startDate = parseISO(schedule.start_date);
    setFormData({
      title: schedule.title,
      description: schedule.description || '',
      start_date: format(startDate, 'yyyy-MM-dd'),
      start_time: format(startDate, 'HH:mm'),
      event_type: schedule.event_type,
      location: schedule.location || ''
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user) return alert('로그인이 필요합니다.');

    const startDateTime = new Date(`${formData.start_date}T${formData.start_time}`);
    const endDateTime = new Date(startDateTime.getTime() + 2 * 60 * 60 * 1000);

    const payload = {
      title: formData.title,
      description: formData.description,
      start_date: startDateTime.toISOString(),
      end_date: endDateTime.toISOString(),
      event_type: formData.event_type,
      location: formData.location,
    };

    let error;
    if (editingSchedule) {
      const { error: updateError } = await supabase
        .from('schedules')
        .update(payload)
        .eq('id', editingSchedule.id);
      error = updateError;
    } else {
      const { error: insertError } = await supabase
        .from('schedules')
        .insert([{ ...payload, created_by: user.id }]);
      error = insertError;
    }

    if (error) {
      alert('일정 처리 실패: ' + error.message);
    } else {
      fetchSchedules();
      setIsModalOpen(false);
      setEditingSchedule(null);
    }
  };

  const handleDelete = async (schedule) => {
    const isOwner = user && user.id === schedule.created_by;
    if (!isAdmin && !isOwner) {
      alert('삭제 권한이 없습니다.');
      return;
    }

    if (!window.confirm('일정을 삭제하시겠습니까?')) return;
    const { error } = await supabase.from('schedules').delete().eq('id', schedule.id);
    if (!error) fetchSchedules();
    else alert('삭제 실패: ' + error.message);
  };

  // Custom Tile Content (Dots)
  const tileContent = ({ date, view }) => {
    if (view === 'month') {
      const daySchedules = schedules.filter(s => isSameDay(parseISO(s.start_date), date));
      if (daySchedules.length > 0) {
        return (
          <div className="flex gap-1 justify-center mt-1">
            {daySchedules.slice(0, 3).map((s, i) => (
              <div key={i} className={`w-1.5 h-1.5 rounded-full ${EVENT_COLORS[s.event_type]}`} />
            ))}
          </div>
        );
      }
    }
  };

  const selectedDaySchedules = schedules.filter(s => isSameDay(parseISO(s.start_date), date));

  return (
    <div className="max-w-6xl mx-auto px-4 pt-32 pb-20">
      <div className="flex justify-between items-end mb-8">
        <div>
          <h1 className="text-3xl font-display font-bold text-slate-900 mb-2">통통 캘린더</h1>
          <p className="text-slate-500">동아리의 주요 일정을 확인하세요.</p>
        </div>
        {user && (
          <button 
            onClick={handleOpenAddModal}
            className="btn-primary flex items-center gap-2 text-sm px-4 py-2"
          >
            <PlusIcon className="w-4 h-4" />
            일정 추가
          </button>
        )}
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Left: Calendar */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <Calendar 
            onChange={setDate} 
            value={date} 
            tileContent={tileContent}
            formatDay={(locale, date) => format(date, 'd')}
            calendarType="gregory"
            className="w-full border-none"
          />
        </div>

        {/* Right: Schedule List */}
        <div className="lg:col-span-1">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 h-full">
            <h2 className="text-xl font-bold text-slate-900 mb-4 border-b pb-2">
              {format(date, 'M월 d일')} 일정
            </h2>
            
            {selectedDaySchedules.length > 0 ? (
              <div className="space-y-4">
                {selectedDaySchedules.map(schedule => (
                  <div key={schedule.id} className="relative pl-4 border-l-4 border-brand-200 py-1">
                    <div className={`absolute left-[-4px] top-2 w-1 h-full rounded-full ${EVENT_COLORS[schedule.event_type].replace('bg-', 'bg-opacity-100 ')}`} />
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <span className={`text-xs font-bold text-white px-2 py-0.5 rounded-full mb-1 inline-block ${EVENT_COLORS[schedule.event_type]}`}>
                          {schedule.event_type}
                        </span>
                        <h3 className="font-bold text-slate-800">{schedule.title}</h3>
                        <p className="text-sm text-slate-500 mt-1">{schedule.description}</p>
                        {schedule.location && (
                          <div className="flex items-center gap-1 text-xs text-slate-400 mt-2">
                            <MapPinIcon className="w-3 h-3" />
                            {schedule.location}
                          </div>
                        )}
                        <p className="text-xs text-slate-400 mt-1">
                          {format(parseISO(schedule.start_date), 'HH:mm')}
                        </p>
                      </div>
                      {(isAdmin || (user && user.id === schedule.created_by)) && (
                        <div className="flex gap-1">
                          <button onClick={() => handleOpenEditModal(schedule)} className="text-slate-400 hover:text-brand-600 p-1">
                            <PencilIcon className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleDelete(schedule)} className="text-slate-400 hover:text-red-600 p-1">
                            <TrashIcon className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-slate-400 text-center py-10">등록된 일정이 없습니다.</p>
            )}
          </div>
        </div>
      </div>

      {/* Schedule Modal (Add/Edit) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <h3 className="text-xl font-bold mb-4">{editingSchedule ? '일정 수정' : '새 일정 추가'}</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <input 
                type="text" placeholder="일정 제목" required 
                className="w-full p-3 border rounded-lg"
                value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})}
              />
              <div className="flex gap-2">
                <input 
                  type="date" required 
                  className="w-full p-3 border rounded-lg"
                  value={formData.start_date} onChange={e => setFormData({...formData, start_date: e.target.value})}
                />
                <input 
                  type="time" required 
                  className="w-full p-3 border rounded-lg"
                  value={formData.start_time} onChange={e => setFormData({...formData, start_time: e.target.value})}
                />
              </div>
              <select 
                className="w-full p-3 border rounded-lg"
                value={formData.event_type} onChange={e => setFormData({...formData, event_type: e.target.value})}
              >
                <option value="정기모임">정기모임</option>
                <option value="공연">공연</option>
                <option value="번개">번개</option>
                <option value="기타">기타</option>
              </select>
              <input 
                type="text" placeholder="장소" 
                className="w-full p-3 border rounded-lg"
                value={formData.location} onChange={e => setFormData({...formData, location: e.target.value})}
              />
              <textarea 
                placeholder="상세 내용" 
                className="w-full p-3 border rounded-lg resize-none h-24"
                value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})}
              />
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-slate-500">취소</button>
                <button type="submit" className="px-4 py-2 bg-brand-600 text-white rounded-lg">
                  {editingSchedule ? '저장하기' : '추가하기'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CalendarPage;
