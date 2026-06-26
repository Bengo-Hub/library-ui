import { apiClient } from '@/lib/api/client';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

/** A library branch — the circulation context the user is logged into. */
export interface OutletInfo {
  id: string;
  code: string;
  name: string;
  use_case?: string;
  is_hq?: boolean;
  status?: string;
  default_warehouse_id?: string | null;
}

export const LIBRARY_SELECTED_BRANCH_KEY = 'library-selected-branch-id';

interface OutletState {
  /** The branch the user selected at login — their home context. */
  outlet: OutletInfo | null;
  /** HQ admin drill-down selection (overrides home branch for queries). */
  selectedOutletId: string | null;

  setOutlet: (outlet: OutletInfo | null) => void;
  setSelectedOutletId: (id: string | null) => void;
  clearOutlet: () => void;
}

export const useOutletStore = create<OutletState>()(
  persist(
    (set, get) => ({
      outlet: null,
      selectedOutletId: null,

      setOutlet: (outlet) => {
        set({ outlet });
        if (outlet?.id) {
          localStorage.setItem(LIBRARY_SELECTED_BRANCH_KEY, outlet.id);
          const { selectedOutletId } = get();
          if (!selectedOutletId) apiClient.setOutletID(outlet.id);
        } else {
          localStorage.removeItem(LIBRARY_SELECTED_BRANCH_KEY);
          apiClient.setOutletID(null);
        }
      },

      setSelectedOutletId: (id) => {
        set({ selectedOutletId: id });
        if (id) {
          apiClient.setOutletID(id);
        } else {
          const { outlet } = get();
          apiClient.setOutletID(outlet?.id ?? null);
        }
      },

      clearOutlet: () => {
        set({ outlet: null, selectedOutletId: null });
        localStorage.removeItem(LIBRARY_SELECTED_BRANCH_KEY);
        apiClient.setOutletID(null);
      },
    }),
    {
      name: 'library-branch-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ outlet: state.outlet }),
      onRehydrateStorage: () => (state) => {
        if (state?.outlet?.id) {
          apiClient.setOutletID(state.outlet.id);
        }
      },
    }
  )
);
