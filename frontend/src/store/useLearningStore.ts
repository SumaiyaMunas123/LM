import { create } from 'zustand'

type LearningState = {
  selectedGradeId: string | null
  selectedModuleId: string | null
  selectedUnitId: string | null
  setGrade: (gradeId: string | null) => void
  setModule: (moduleId: string | null) => void
  setUnit: (unitId: string | null) => void
  clearSelection: () => void
}

export const useLearningStore = create<LearningState>((set) => ({
  selectedGradeId: null,
  selectedModuleId: null,
  selectedUnitId: null,
  setGrade: (selectedGradeId) => set({ selectedGradeId, selectedModuleId: null, selectedUnitId: null }),
  setModule: (selectedModuleId) => set((state) => ({ ...state, selectedModuleId, selectedUnitId: null })),
  setUnit: (selectedUnitId) => set((state) => ({ ...state, selectedUnitId })),
  clearSelection: () => set({ selectedGradeId: null, selectedModuleId: null, selectedUnitId: null }),
}))
