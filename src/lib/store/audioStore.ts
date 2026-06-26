import { create } from "zustand"

interface AudioStore {
  audioFiles: Record<string, string>
  setAudioFile: (eventId: string, url: string) => void
  clearAudioFile: (eventId: string) => void
}

export const useAudioStore = create<AudioStore>((set) => ({
  audioFiles: {},
  setAudioFile: (eventId, url) =>
    set((s) => ({ audioFiles: { ...s.audioFiles, [eventId]: url } })),
  clearAudioFile: (eventId) =>
    set((s) => {
      const next = { ...s.audioFiles }
      if (next[eventId]) URL.revokeObjectURL(next[eventId])
      delete next[eventId]
      return { audioFiles: next }
    }),
}))
