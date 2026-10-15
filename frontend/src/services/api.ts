
const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000'

let accessToken: string | null = null

export function setAccessToken(token: string | null): void {
  accessToken = token
}

export class ApiError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

type RequestOptions = Omit<RequestInit, 'headers'> & {
  headers?: HeadersInit
}

export async function apiRequest<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const url = `${API_BASE_URL.replace(/\/$/, '')}/${path.replace(/^\//, '')}`

  const headers = new Headers(options.headers)
  headers.set('Accept', 'application/json')

  if (options.body) {
    headers.set('Content-Type', 'application/json')
  }

  if (accessToken) {
    headers.set('Authorization', `Bearer ${accessToken}`)
  }

  const response = await fetch(url, {
    ...options,
    headers,
  })

  if (!response.ok) {
    let message = `Request failed with status ${response.status}`

    try {
      const data: unknown = await response.json()

      if (
        typeof data === 'object' &&
        data !== null &&
        'detail' in data &&
        typeof data.detail === 'string'
      ) {
        message = data.detail
      }
    } catch {
      // Keep the default error message for non-JSON responses.
    }

    throw new ApiError(message, response.status)
  }

  if (response.status === 204) {
    return undefined as T
  }

  return (await response.json()) as T
}
