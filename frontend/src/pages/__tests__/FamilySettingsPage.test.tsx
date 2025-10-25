import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import FamilySettingsPage from '../FamilySettingsPage';

// Mock the API
vi.mock('@/lib/api', () => ({
  familyAPI: {
    getAll: vi.fn(() => Promise.resolve({
      data: {
        data: {
          families: [
            {
              id: '1',
              name: 'Test Family',
              members: [
                { id: '1', name: 'John Doe', role: 'ADMIN', userId: 'user-1', user: { email: 'john@example.com' } }
              ]
            }
          ]
        }
      }
    })),
    addMember: vi.fn()
  },
  invitationAPI: {
    send: vi.fn(),
    getReceived: vi.fn(),
    getSent: vi.fn()
  }
}));

// Mock i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: 'en' }
  })
}));

// Mock toast hook
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn()
  })
}));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false },
    mutations: { retry: false }
  }
});

describe('FamilySettingsPage', () => {
  it('renders family settings title', async () => {
    render(
      <BrowserRouter>
        <QueryClientProvider client={queryClient}>
          <FamilySettingsPage />
        </QueryClientProvider>
      </BrowserRouter>
    );

    expect(screen.getByText('family.settings')).toBeInTheDocument();
  });

  it('displays invite member and add member buttons', async () => {
    render(
      <BrowserRouter>
        <QueryClientProvider client={queryClient}>
          <FamilySettingsPage />
        </QueryClientProvider>
      </BrowserRouter>
    );

    expect(screen.getByText('family.actions.inviteMember')).toBeInTheDocument();
    expect(screen.getByText('family.actions.addMember')).toBeInTheDocument();
  });
});
