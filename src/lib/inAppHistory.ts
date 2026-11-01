// TanStack Router numbers its history entries (__TSR_index, 0 = the first page the app loaded).
// history.length can't tell: it counts pages from before the app too
export const hasInAppHistory = () => {
  const index = (window.history.state as { __TSR_index?: unknown } | null)?.__TSR_index;
  return typeof index === 'number' && index > 0;
};
