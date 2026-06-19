export class ApiError extends Error {
  status: number
  payload: unknown

  constructor(status: number, message: string, payload: unknown) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.payload = payload
  }
}

export class ApiClient {
  apiUrl: string
  credential?: string

  constructor(apiUrl: string, credential?: string) {
    this.apiUrl = apiUrl.replace(/\/+$/, '')
    this.credential = credential
  }

  withCredential(credential: string) {
    return new ApiClient(this.apiUrl, credential)
  }

  async request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const headers = new Headers(init.headers)
    if (init.body && !headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json')
    }
    if (this.credential) {
      headers.set('Authorization', `Bearer ${this.credential}`)
    }

    const response = await fetch(`${this.apiUrl}${path}`, {
      ...init,
      headers,
    })

    if (response.status === 204) {
      return undefined as T
    }

    const contentType = response.headers.get('Content-Type') || ''
    const payload = contentType.includes('application/json') ? await response.json() : await response.text()

    if (!response.ok) {
      const message =
        typeof payload === 'object' && payload && 'detail' in payload ? String(payload.detail) : response.statusText
      throw new ApiError(response.status, message, payload)
    }

    return payload as T
  }
}
