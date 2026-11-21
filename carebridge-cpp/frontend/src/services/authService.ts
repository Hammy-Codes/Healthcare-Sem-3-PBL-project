
import { apiRequest, setAccessToken } from './api'
import { API_ENDPOINTS } from './endpoints'
import type { User } from '../types/healthcare'

interface LoginResponse {
  access_token: string
  token_type: string
  expires_in: number
}

export async function login(email: string, password: string): Promise<User> {
  const result = await apiRequest<LoginResponse>(API_ENDPOINTS.auth.login, {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })

  setAccessToken(result.access_token)

  try {
    return await apiRequest<User>(API_ENDPOINTS.auth.me)
  } catch (error) {
    setAccessToken(null)
    throw error
  }
}

export function logout(): void {
  setAccessToken(null)
}
