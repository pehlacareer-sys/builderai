// API helper functions for the frontend

const API_BASE = '/api'

interface FetchOptions extends RequestInit {
  token?: string
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
    const { token: optToken, ...fetchOptions } = options
    const token = optToken || this.getToken()

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(fetchOptions.headers as Record<string, string>),
    }

    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }

    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...fetchOptions,
      headers,
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.error || `HTTP ${response.status}`)
    }

    return data
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

  // Validate
  async validateProject(projectId: string) {
    const data = await this.fetch<{ success: boolean; data: any[] }>(`/projects/${projectId}/validate`, {
      method: 'POST',
    })
    return data.data
  }
}

export const api = new ApiClient()
