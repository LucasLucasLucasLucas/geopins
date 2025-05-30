let nextEventId = 1;
 
export const generateUniqueEventId = (prefix: string): string => {
  return `${prefix}-${nextEventId++}`.padStart(8, '0');
}; 