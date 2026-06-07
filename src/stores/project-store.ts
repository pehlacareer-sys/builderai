import { create } from 'zustand'
import { api } from '@/lib/api'

export interface ProjectFile {
  id: string
  path: string
  content: string
  language: string | null
  createdAt: string
  updatedAt: string
}

export interface Project {
  id: string
  name: string
  description: string | null
  framework: string
  template: string | null
  status: string
  deployUrl: string | null
  userId: string
  files: ProjectFile[]
  createdAt: string
  updatedAt: string
}

interface ProjectState {
  projects: Project[]
  currentProject: Project | null
  currentFile: ProjectFile | null
  files: ProjectFile[]
  isLoading: boolean
  error: string | null

  loadProjects: () => Promise<void>
  createProject: (name: string, description?: string, framework?: string) => Promise<Project>
  selectProject: (projectId: string) => Promise<void>
  updateProject: (id: string, updates: Record<string, string>) => Promise<void>
  deleteProject: (id: string) => Promise<void>
  selectFile: (fileOrId: string | ProjectFile) => void
  updateFile: (projectId: string, fileId: string, updates: Record<string, string>) => Promise<void>
  addGeneratedFiles: (projectId: string, files: Array<{ path: string; content: string; language: string }>) => Promise<void>
  refreshFiles: () => Promise<void>
  restoreVersion: (projectId: string, versionId: string) => Promise<{ restoredVersion: number; backupVersion: number; filesRestored: number }>
  clearCurrentProject: () => void
  clearError: () => void
}

export const useProjectStore = create<ProjectState>((set, get) => ({
  projects: [],
  currentProject: null,
  currentFile: null,
  files: [],
  isLoading: false,
  error: null,

  loadProjects: async () => {
    set({ isLoading: true })
    try {
      const projects = await api.getProjects()
      set({ projects, isLoading: false })
    } catch (error: any) {
      set({ error: error.message, isLoading: false })
    }
  },

  createProject: async (name, description, framework) => {
    set({ isLoading: true })
    try {
      const project = await api.createProject(name, description, framework)
      set((state) => ({
        projects: [project, ...state.projects],
        isLoading: false,
      }))
      return project
    } catch (error: any) {
      set({ error: error.message, isLoading: false })
      throw error
    }
  },

  selectProject: async (projectId) => {
    set({ isLoading: true })
    try {
      const project = await api.getProject(projectId)
      const files = await api.getProjectFiles(projectId)
      set({
        currentProject: project,
        files,
        currentFile: files.length > 0 ? files[0] : null,
        isLoading: false,
      })
    } catch (error: any) {
      set({ error: error.message, isLoading: false })
    }
  },

  updateProject: async (id, updates) => {
    try {
      const updated = await api.updateProject(id, updates)
      set((state) => ({
        currentProject: state.currentProject?.id === id ? updated : state.currentProject,
        projects: state.projects.map((p) => (p.id === id ? updated : p)),
      }))
    } catch (error: any) {
      set({ error: error.message })
    }
  },

  deleteProject: async (id) => {
    try {
      await api.deleteProject(id)
      set((state) => ({
        projects: state.projects.filter((p) => p.id !== id),
        currentProject: state.currentProject?.id === id ? null : state.currentProject,
        files: state.currentProject?.id === id ? [] : state.files,
        currentFile: state.currentProject?.id === id ? null : state.currentFile,
      }))
    } catch (error: any) {
      set({ error: error.message })
    }
  },

  selectFile: (fileOrId) => {
    const file = typeof fileOrId === 'string'
      ? get().files.find((f) => f.id === fileOrId)
      : fileOrId
    if (file) {
      set({ currentFile: file })
    }
  },

  updateFile: async (projectId, fileId, updates) => {
    try {
      const updated = await api.updateFile(projectId, fileId, updates)
      set((state) => ({
        files: state.files.map((f) => (f.id === fileId ? { ...f, ...updated } : f)),
        currentFile: state.currentFile?.id === fileId ? { ...state.currentFile, ...updated } : state.currentFile,
      }))
    } catch (error: any) {
      set({ error: error.message })
    }
  },

  addGeneratedFiles: async (projectId, newFiles) => {
    try {
      const upsertedFiles = await Promise.all(
        newFiles.map((file) => api.upsertFile(projectId, file.path, file.content, file.language))
      )
      set((state) => {
        const updatedFiles = [...state.files]
        for (const newFile of upsertedFiles) {
          const existingIdx = updatedFiles.findIndex((f) => f.path === newFile.path)
          if (existingIdx >= 0) {
            updatedFiles[existingIdx] = newFile
          } else {
            updatedFiles.push(newFile)
          }
        }
        return { files: updatedFiles }
      })
    } catch (error: any) {
      set({ error: error.message })
    }
  },

  refreshFiles: async () => {
    const { currentProject } = get()
    if (!currentProject) return
    try {
      const files = await api.getProjectFiles(currentProject.id)
      set({ files })
    } catch (error: any) {
      set({ error: error.message })
    }
  },

  restoreVersion: async (projectId, versionId) => {
    set({ isLoading: true })
    try {
      const result = await api.restoreVersion(projectId, versionId)
      // Refresh files to reflect the restored state
      const files = await api.getProjectFiles(projectId)
      set({
        files,
        currentFile: files.length > 0 ? files[0] : null,
        isLoading: false,
      })
      return result
    } catch (error: any) {
      set({ error: error.message, isLoading: false })
      throw error
    }
  },

  clearCurrentProject: () => {
    set({ currentProject: null, files: [], currentFile: null })
  },

  clearError: () => set({ error: null }),
}))
