// API helper functions for the frontend

import { toast } from 'sonner'

const API_BASE = '/api'

interface FetchOptions extends RequestInit {
  token?: string
  silent?: boolean // If true, don't show toast on error
}

// Track recent error toasts to avoid duplicates
const recentErrors = new Map<string, number>()
const ERROR_DEBOUNCE_MS = 3000

function showErrorToast(message: string) {
  const now = Date.now()
  const lastShown = recentErrors.get(message)
  if (lastShown && now - lastShown < ERROR_DEBOUNCE_MS) {
    return // Skip duplicate toast within debounce window
  }
  recentErrors.set(message, now)
  toast.error('Request Failed', {
    description: message,
    duration: 5000,
  })
  // Clean up old entries
  if (recentErrors.size > 20) {
    for (const [key, time] of recentErrors) {
      if (now - time > ERROR_DEBOUNCE_MS) {
        recentErrors.delete(key)
      }
    }
  }
}

class ApiClient {
  private token: string | null = null

  setToken(token: string | null) {
    this.token = token
    if (token) {
      localStorage.setItem('auth_token', token)
    } else {
      localStorage.removeItem('auth_token')
    }
  }

  getToken(): string | null {
    if (!this.token) {
      this.token = localStorage.getItem('auth_token')
    }
    return this.token
  }

  private async fetch<T>(endpoint: string, options: FetchOptions = {}): Promise<T> {
    const { token: optToken, silent, ...fetchOptions } = options
    const token = optToken || this.getToken()

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(fetchOptions.headers as Record<string, string>),
    }

    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }

    try {
      const response = await fetch(`${API_BASE}${endpoint}`, {
        ...fetchOptions,
        headers,
      })

      // Handle non-JSON responses gracefully
      let data: any
      try {
        data = await response.json()
      } catch {
        if (!response.ok) {
          const message = `Server error (${response.status})`
          if (!silent) showErrorToast(message)
          throw new Error(message)
        }
        return {} as T
      }

      if (!response.ok) {
        const message = data.error || `Request failed (${response.status})`
        if (!silent) showErrorToast(message)
        throw new Error(message)
      }

      return data
    } catch (error) {
      // Re-throw if already processed (our own errors)
      if (error instanceof Error && error.message.startsWith('Request failed') || 
          error instanceof Error && error.message.startsWith('Server error')) {
        throw error
      }
      // Network errors, CORS, etc.
      if (error instanceof TypeError) {
        const message = 'Network error — please check your connection'
        if (!silent) showErrorToast(message)
        throw new Error(message)
      }
      throw error
    }
  }

  // Auth
  async register(email: string, name: string, password: string) {
    const data = await this.fetch<{ success: boolean; data: { user: any; token: string } }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, name, password }),
    })
    return data.data
  }

  async login(email: string, password: string) {
    const data = await this.fetch<{ success: boolean; data: { user: any; token: string } }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    })
    return data.data
  }

  async getMe() {
    const data = await this.fetch<{ success: boolean; data: any }>('/auth/me')
    return data.data
  }

  // Projects
  async getProjects() {
    const data = await this.fetch<{ success: boolean; data: any[] }>('/projects')
    return data.data
  }

  async createProject(name: string, description?: string, framework?: string) {
    const data = await this.fetch<{ success: boolean; data: any }>('/projects', {
      method: 'POST',
      body: JSON.stringify({ name, description, framework }),
    })
    return data.data
  }

  async getProject(id: string) {
    const data = await this.fetch<{ success: boolean; data: any }>(`/projects/${id}`)
    return data.data
  }

  async updateProject(id: string, updates: Record<string, any>) {
    const data = await this.fetch<{ success: boolean; data: any }>(`/projects/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    })
    return data.data
  }

  async deleteProject(id: string) {
    await this.fetch(`/projects/${id}`, { method: 'DELETE' })
  }

  // Files
  async getProjectFiles(projectId: string) {
    const data = await this.fetch<{ success: boolean; data: any[] }>(`/projects/${projectId}/files`)
    return data.data
  }

  async upsertFile(projectId: string, path: string, content: string, language?: string) {
    const data = await this.fetch<{ success: boolean; data: any }>(`/projects/${projectId}/files`, {
      method: 'POST',
      body: JSON.stringify({ path, content, language }),
    })
    return data.data
  }

  async getFile(projectId: string, fileId: string) {
    const data = await this.fetch<{ success: boolean; data: any }>(`/projects/${projectId}/files/${fileId}`)
    return data.data
  }

  async updateFile(projectId: string, fileId: string, updates: Record<string, any>) {
    const data = await this.fetch<{ success: boolean; data: any }>(`/projects/${projectId}/files/${fileId}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    })
    return data.data
  }

  async deleteFile(projectId: string, fileId: string) {
    await this.fetch(`/projects/${projectId}/files/${fileId}`, { method: 'DELETE' })
  }

  // Conversations
  async getConversations(projectId: string) {
    const data = await this.fetch<{ success: boolean; data: any[] }>(`/projects/${projectId}/conversations`)
    return data.data
  }

  async createConversation(projectId: string, title?: string) {
    const data = await this.fetch<{ success: boolean; data: any }>(`/projects/${projectId}/conversations`, {
      method: 'POST',
      body: JSON.stringify({ title }),
    })
    return data.data
  }

  async getConversation(projectId: string, conversationId: string) {
    const data = await this.fetch<{ success: boolean; data: any }>(`/projects/${projectId}/conversations/${conversationId}`)
    return data.data
  }

  async deleteConversation(projectId: string, conversationId: string) {
    await this.fetch(`/projects/${projectId}/conversations/${conversationId}`, { method: 'DELETE' })
  }

  async addMessage(projectId: string, conversationId: string, role: string, content: string, metadata?: string) {
    const data = await this.fetch<{ success: boolean; data: any }>(`/projects/${projectId}/conversations/${conversationId}/messages`, {
      method: 'POST',
      body: JSON.stringify({ role, content, metadata }),
    })
    return data.data
  }

  // Memory
  async getMemory(projectId: string, type?: string) {
    const query = type ? `?type=${type}` : ''
    const data = await this.fetch<{ success: boolean; data: any[] }>(`/projects/${projectId}/memory${query}`)
    return data.data
  }

  async upsertMemory(projectId: string, type: string, key: string, value: string) {
    const data = await this.fetch<{ success: boolean; data: any }>(`/projects/${projectId}/memory`, {
      method: 'POST',
      body: JSON.stringify({ type, key, value }),
    })
    return data.data
  }

  async deleteMemory(projectId: string, type: string, key: string) {
    const data = await this.fetch<{ success: boolean; data: any }>(`/projects/${projectId}/memory`, {
      method: 'DELETE',
      body: JSON.stringify({ type, key }),
    })
    return data.data
  }

  // Versions
  async getVersions(projectId: string) {
    const data = await this.fetch<{ success: boolean; data: any[] }>(`/projects/${projectId}/versions`)
    return data.data
  }

  async createVersion(projectId: string, description?: string) {
    const data = await this.fetch<{ success: boolean; data: any }>(`/projects/${projectId}/versions`, {
      method: 'POST',
      body: JSON.stringify({ description }),
    })
    return data.data
  }

  async restoreVersion(projectId: string, versionId: string) {
    const data = await this.fetch<{ success: boolean; data: { restoredVersion: number; backupVersion: number; filesRestored: number } }>(`/projects/${projectId}/versions`, {
      method: 'PUT',
      body: JSON.stringify({ versionId }),
    })
    return data.data
  }

  // Validate
  async validateProject(projectId: string) {
    const data = await this.fetch<{ success: boolean; data: any }>(`/projects/${projectId}/validate`, {
      method: 'POST',
    })
    // Handle both { data: { summary, results } } and direct { summary, results } responses
    if (data?.data?.results) {
      return data.data
    }
    // Fallback: if data itself has results (unwrapped response)
    if (data?.results) {
      return data
    }
    // Fallback: if data.data is an array (legacy format)
    if (Array.isArray(data?.data)) {
      return { results: data.data, summary: null }
    }
    return { results: [], summary: null }
  }

  // Export project as ZIP
  async exportProject(projectId: string): Promise<void> {
    const token = this.getToken()
    const headers: Record<string, string> = {}
    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }

    const response = await fetch(`${API_BASE}/projects/${projectId}/export`, {
      method: 'GET',
      headers,
    })

    if (!response.ok) {
      let message = `Export failed (${response.status})`
      try {
        const data = await response.json()
        message = data.error || message
      } catch {
        // Ignore JSON parse error
      }
      showErrorToast(message)
      throw new Error(message)
    }

    const blob = await response.blob()

    // Extract filename from Content-Disposition header, or use default
    const contentDisposition = response.headers.get('Content-Disposition')
    let filename = 'project.zip'
    if (contentDisposition) {
      const match = contentDisposition.match(/filename="?([^"]+)"?/)
      if (match) {
        filename = match[1]
      }
    }

    // Trigger browser download
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }
}

export const api = new ApiClient()
