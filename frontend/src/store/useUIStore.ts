import { create } from 'zustand'

type UIState = {
  sidebarOpen: boolean
  resourceViewerOpen: boolean
  toggleSidebar: () => void
  setSidebarOpen: (sidebarOpen: boolean) => void
  openResourceViewer: () => void
  closeResourceViewer: () => void
}

export const useUIStore = create<UIState>((set) => ({
  sidebarOpen: false,
  resourceViewerOpen: false,
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
  openResourceViewer: () => set({ resourceViewerOpen: true }),
  closeResourceViewer: () => set({ resourceViewerOpen: false }),
}))
