"use client";
import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

// Updated interface to match the backend 'book_sloy' table
interface BlockedSlot {
  date: string; // YYYY-MM-DD
  time: string | null; // HH:MM or null for all-day
}

interface AdminCalendarProps {
  currentMonth: Date;
  selectedDate: Date;
  onMonthChange: (newMonth: Date) => void;
  onDateClick: (date: Date) => void;
  blockedSlots: BlockedSlot[];
}

const AdminCalendar: React.FC<AdminCalendarProps> = ({
  currentMonth,
  selectedDate,
  onMonthChange,
  onDateClick,
  blockedSlots,
}) => {
  const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const days: (Date | null)[] = [];

    for (let i = 0; i < firstDay.getDay(); i++) {
      days.push(null);
    }
    for (let i = 1; i <= lastDay.getDate(); i++) {
      days.push(new Date(year, month, i));
    }
    return days;
  };

  const days = getDaysInMonth(currentMonth);

  const formatDateToYYYYMMDD = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  // CORRECTED: This function now reliably checks if a given day has ANY blocked slots.
  const isDayBlocked = (date: Date): boolean => {
    if (!date) return false;
    const dateString = formatDateToYYYYMMDD(date);
    return blockedSlots.some(
      (blocked) => blocked.date.substring(0, 10) === dateString
    );
  };

  return (
    <div className="bg-white p-4 rounded-lg border">
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() =>
            onMonthChange(
              new Date(
                currentMonth.getFullYear(),
                currentMonth.getMonth() - 1,
                1
              )
            )
          }
          className="p-2 rounded-full hover:bg-gray-100"
        >
          <ChevronLeft size={20} />
        </button>
        <h3 className="font-semibold text-lg">
          {currentMonth.toLocaleString("default", {
            month: "long",
            year: "numeric",
          })}
        </h3>
        <button
          onClick={() =>
            onMonthChange(
              new Date(
                currentMonth.getFullYear(),
                currentMonth.getMonth() + 1,
                1
              )
            )
          }
          className="p-2 rounded-full hover:bg-gray-100"
        >
          <ChevronRight size={20} />
        </button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-sm text-gray-500">
        {daysOfWeek.map((day) => (
          <div key={day} className="font-medium">
            {day}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1 mt-2">
        {days.map((day, index) => {
          if (!day) return <div key={`empty-${index}`}></div>;

          const isSelected = day.toDateString() === selectedDate.toDateString();
          const hasBlock = isDayBlocked(day);

          return (
            <button
              key={index}
              onClick={() => onDateClick(day)}
              className={`p-1 h-16 flex flex-col items-center justify-center rounded-lg transition-colors ${
                isSelected ? "bg-cyan-600 text-white" : "hover:bg-gray-100"
              }`}
            >
              <span className="text-sm font-medium">{day.getDate()}</span>
              {/* CORRECTED: Show a single red dot if any slot on this day is blocked */}
              {hasBlock && (
                <div
                  className="w-1.5 h-1.5 bg-red-500 rounded-full mt-1"
                  title="This day has blocked slots"
                ></div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default AdminCalendar;
