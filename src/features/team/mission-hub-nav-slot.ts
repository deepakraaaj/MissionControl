import { createContext, useContext } from 'react';

/**
 * Host element (in the app top bar) that the unified mission hub portals its
 * back button + tab strip into. Null when no slot is available — the hub then
 * renders its navigation inline instead.
 */
export const MissionHubNavSlotContext = createContext<HTMLElement | null>(null);

export function useMissionHubNavSlot() {
  return useContext(MissionHubNavSlotContext);
}
