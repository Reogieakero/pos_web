export type ViewMode = 'day' | 'week' | 'month';

export function getDateRange(selectedDate: Date, viewMode: ViewMode): { start: Date; end: Date } {
  const start = new Date(selectedDate);
  const end = new Date(selectedDate);

  if (viewMode === 'day') {
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);
  } else if (viewMode === 'week') {
    start.setDate(selectedDate.getDate() - selectedDate.getDay());
    start.setHours(0, 0, 0, 0);
    end.setDate(start.getDate() + 6);
    end.setHours(23, 59, 59, 999);
  } else {
    start.setDate(1);
    start.setHours(0, 0, 0, 0);
    end.setMonth(end.getMonth() + 1, 0);
    end.setHours(23, 59, 59, 999);
  }

  return { start, end };
}