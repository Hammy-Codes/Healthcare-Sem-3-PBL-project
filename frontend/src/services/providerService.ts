
import { mockProviders } from './mockdata'
import type { Provider } from '../types/healthcare'

// Synthetic provider data for the frontend demo only.
export const providerService = {
  async searchProviders(specialty?: string): Promise<Provider[]> {
    // Simulate a short loading delay.
    await new Promise((resolve) => setTimeout(resolve, 400))

    if (!specialty || specialty === 'All specialties') {
      return mockProviders
    }

    return mockProviders.filter(
      (provider) =>
        provider.specialty.toLowerCase() === specialty.toLowerCase(),
    )
  },
}
