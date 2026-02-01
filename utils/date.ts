export const formatDateToYMD = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const parseYMDToLocalDate = (dateString: string): Date => {
  if (!dateString) {
    return new Date();
  }

  const normalized = dateString.split('T')[0].split(' ')[0];
  const [year, month, day] = normalized.split('-').map(Number);
  if (!year || !month || !day) {
    const parsed = new Date(dateString);
    return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
  }

  return new Date(year, month - 1, day, 12, 0, 0, 0);
};
