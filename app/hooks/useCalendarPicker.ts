"use client";

import { useState } from 'react';

export type ViewMode = 'day' | 'week' | 'month';

export function useCalendarPicker() {
  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [isOpen, setIsOpen] = useState(false);
  
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [currentGridMonth, setCurrentGridMonth] = useState<number>(new Date().getMonth());
  const [currentGridYear, setCurrentGridYear] = useState<number>(new Date().getFullYear());

  const months = [
    "January", "February", "March", "April", "May", "June", 
    "July", "August", "September", "October", "November", "December"
  ];

  const changeMonthGrid = (direction: 'next' | 'prev') => {
    if (direction === 'next') {
      if (currentGridMonth === 11) {
        setCurrentGridMonth(0);
        setCurrentGridYear(prev => prev + 1);
      } else {
        setCurrentGridMonth(prev => prev + 1);
      }
    } else {
      if (currentGridMonth === 0) {
        setCurrentGridMonth(11);
        setCurrentGridYear(prev => prev - 1);
      } else {
        setCurrentGridMonth(prev => prev - 1);
      }
    }
  };

  const getDaysInMonthGrid = (month: number, year: number) => {
    const date = new Date(year, month, 1);
    const days = [];
    const startDayIndex = date.getDay();
    
    for (let i = 0; i < startDayIndex; i++) {
      days.push(null);
    }
    
    const totalDays = new Date(year, month + 1, 0).getDate();
    for (let d = 1; d <= totalDays; d++) {
      days.push(new Date(year, month, d));
    }
    return days;
  };

  const gridDays = getDaysInMonthGrid(currentGridMonth, currentGridYear);

  const isDateActive = (date: Date | null) => {
    if (!date) return false;
    
    if (viewMode === 'day') {
      return date.toDateString() === selectedDate.toDateString();
    }
    
    if (viewMode === 'week') {
      const startOfWeek = new Date(selectedDate);
      startOfWeek.setDate(selectedDate.getDate() - selectedDate.getDay());
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);
      
      return date >= startOfWeek && date <= endOfWeek;
    }
    
    if (viewMode === 'month') {
      return date.getMonth() === selectedDate.getMonth() && date.getFullYear() === selectedDate.getFullYear();
    }
    return false;
  };

  const getFormattedDisplayLabel = () => {
    if (viewMode === 'day') {
      return selectedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }
    if (viewMode === 'week') {
      const start = new Date(selectedDate);
      start.setDate(selectedDate.getDate() - selectedDate.getDay());
      const end = new Date(start);
      end.setDate(start.getDate() + 6);
      return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
    }
    return `${months[selectedDate.getMonth()]} ${selectedDate.getFullYear()}`;
  };

  return {
    viewMode,
    setViewMode,
    isOpen,
    setIsOpen,
    selectedDate,
    setSelectedDate,
    currentGridMonth,
    currentGridYear,
    setCurrentGridYear,
    months,
    gridDays,
    changeMonthGrid,
    isDateActive,
    getFormattedDisplayLabel,
  };
}