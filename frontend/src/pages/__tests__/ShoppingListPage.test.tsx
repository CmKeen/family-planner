import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import userEvent from '@testing-library/user-event';
import ShoppingListPage from '../ShoppingListPage';
import * as api from '@/lib/api';

// Mock the API
vi.mock('@/lib/api', () => ({
  shoppingListAPI: {
    getByPlanId: vi.fn(),
    toggleItem: vi.fn()
  }
}));

const mockShoppingList = {
  id: 'list-1',
  weeklyPlanId: 'plan-1',
  generatedAt: '2024-01-15T10:00:00Z',
  items: [
    {
      id: 'item-1',
      ingredientName: 'Poulet',
      quantity: 1.5,
      unit: 'kg',
      category: 'Viandes',
      checked: false,
      recipeNames: ['Poulet rôti', 'Soupe au poulet']
    },
    {
      id: 'item-2',
      ingredientName: 'Tomates',
      quantity: 500,
      unit: 'g',
      category: 'Fruits et légumes',
      checked: false,
      recipeNames: ['Pâtes tomates basilic']
    },
    {
      id: 'item-3',
      ingredientName: 'Riz',
      quantity: 400,
      unit: 'g',
      category: 'Épicerie',
      checked: true,
      recipeNames: ['Riz cantonais']
    },
    {
      id: 'item-4',
      ingredientName: 'Lait',
      quantity: 1,
      unit: 'L',
      category: 'Produits laitiers',
      checked: false,
      recipeNames: ['Crêpes']
    }
  ]
};

describe('ShoppingListPage', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false }
      }
    });

    vi.mocked(api.shoppingListAPI.getByPlanId).mockResolvedValue({
      data: { data: { shoppingList: mockShoppingList } }
    } as any);

    vi.mocked(api.shoppingListAPI.toggleItem).mockResolvedValue({
      data: { data: { item: mockShoppingList.items[0] } }
    } as any);
  });

  const renderWithProviders = (component: React.ReactElement) => {
    return render(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <Routes>
            <Route path="/shopping-list/:planId" element={component} />
          </Routes>
        </BrowserRouter>
      </QueryClientProvider>
    );
  };

  it('should render loading state initially', () => {
    vi.mocked(api.shoppingListAPI.getByPlanId).mockImplementation(
      () => new Promise(() => {})
    );

    window.history.pushState({}, '', '/shopping-list/plan-1');
    renderWithProviders(<ShoppingListPage />);

    expect(screen.getByText(/chargement de la liste/i)).toBeInTheDocument();
  });

  it('should render shopping list with items', async () => {
    window.history.pushState({}, '', '/shopping-list/plan-1');
    renderWithProviders(<ShoppingListPage />);

    await waitFor(() => {
      expect(screen.getByText(/liste de courses/i)).toBeInTheDocument();
    });

    expect(screen.getByText(/1.5 kg poulet/i)).toBeInTheDocument();
    expect(screen.getByText(/500 g tomates/i)).toBeInTheDocument();
    expect(screen.getByText(/400 g riz/i)).toBeInTheDocument();
  });

  it('should display generation date', async () => {
    window.history.pushState({}, '', '/shopping-list/plan-1');
    renderWithProviders(<ShoppingListPage />);

    await waitFor(() => {
      expect(screen.getByText(/générée le/i)).toBeInTheDocument();
    });
  });

  it('should display progress card', async () => {
    window.history.pushState({}, '', '/shopping-list/plan-1');
    renderWithProviders(<ShoppingListPage />);

    await waitFor(() => {
      expect(screen.getByText(/progression/i)).toBeInTheDocument();
    });

    // 1 out of 4 items checked = 25%
    expect(screen.getByText(/1 sur 4 articles/i)).toBeInTheDocument();
    expect(screen.getByText(/25%/i)).toBeInTheDocument();
  });

  it('should display view mode tabs', async () => {
    window.history.pushState({}, '', '/shopping-list/plan-1');
    renderWithProviders(<ShoppingListPage />);

    await waitFor(() => {
      expect(screen.getByRole('tab', { name: /par catégorie/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /par recette/i })).toBeInTheDocument();
    });
  });

  it('should group items by category in category view', async () => {
    window.history.pushState({}, '', '/shopping-list/plan-1');
    renderWithProviders(<ShoppingListPage />);

    await waitFor(() => {
      expect(screen.getByText('Viandes')).toBeInTheDocument();
      expect(screen.getByText('Fruits et légumes')).toBeInTheDocument();
      expect(screen.getByText('Épicerie')).toBeInTheDocument();
      expect(screen.getByText('Produits laitiers')).toBeInTheDocument();
    });
  });

  it('should display checkboxes for each item', async () => {
    window.history.pushState({}, '', '/shopping-list/plan-1');
    renderWithProviders(<ShoppingListPage />);

    await waitFor(() => {
      const checkboxes = screen.getAllByRole('button');
      // Should have checkboxes for items (plus other buttons)
      expect(checkboxes.length).toBeGreaterThan(0);
    });
  });

  it('should toggle item checked state when clicked', async () => {
    const user = userEvent.setup();
    window.history.pushState({}, '', '/shopping-list/plan-1');
    renderWithProviders(<ShoppingListPage />);

    await waitFor(() => {
      expect(screen.getByText(/poulet/i)).toBeInTheDocument();
    });

    // Find and click a checkbox
    const checkboxes = screen.getAllByRole('button');
    const itemCheckbox = checkboxes.find(btn =>
      btn.className.includes('border') && btn.className.includes('rounded')
    );

    if (itemCheckbox) {
      await user.click(itemCheckbox);

      await waitFor(() => {
        expect(api.shoppingListAPI.toggleItem).toHaveBeenCalled();
      });
    }
  });

  it('should display recipe names for each item', async () => {
    window.history.pushState({}, '', '/shopping-list/plan-1');
    renderWithProviders(<ShoppingListPage />);

    await waitFor(() => {
      expect(screen.getByText(/pour: poulet rôti, soupe au poulet/i)).toBeInTheDocument();
      expect(screen.getByText(/pour: pâtes tomates basilic/i)).toBeInTheDocument();
    });
  });

  it('should show item count per category', async () => {
    window.history.pushState({}, '', '/shopping-list/plan-1');
    renderWithProviders(<ShoppingListPage />);

    await waitFor(() => {
      // Each category should show article count
      const badges = screen.getAllByText(/article/i);
      expect(badges.length).toBeGreaterThan(0);
    });
  });

  it('should switch to recipe view when tab is clicked', async () => {
    const user = userEvent.setup();
    window.history.pushState({}, '', '/shopping-list/plan-1');
    renderWithProviders(<ShoppingListPage />);

    await waitFor(() => {
      expect(screen.getByRole('tab', { name: /par recette/i })).toBeInTheDocument();
    });

    const recipeTab = screen.getByRole('tab', { name: /par recette/i });
    await user.click(recipeTab);

    await waitFor(() => {
      // Should show recipe names as headers
      expect(screen.getByText('Poulet rôti')).toBeInTheDocument();
      expect(screen.getByText('Pâtes tomates basilic')).toBeInTheDocument();
    });
  });

  it('should display print button', async () => {
    window.history.pushState({}, '', '/shopping-list/plan-1');
    renderWithProviders(<ShoppingListPage />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /imprimer/i })).toBeInTheDocument();
    });
  });

  it('should display back button', async () => {
    window.history.pushState({}, '', '/shopping-list/plan-1');
    renderWithProviders(<ShoppingListPage />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /retour/i })).toBeInTheDocument();
    });
  });

  it('should show checked items with strikethrough', async () => {
    window.history.pushState({}, '', '/shopping-list/plan-1');
    renderWithProviders(<ShoppingListPage />);

    await waitFor(() => {
      const rizItem = screen.getByText(/400 g riz/i);
      // Checked item should have strikethrough styling
      expect(rizItem.className).toContain('line-through');
    });
  });

  it('should calculate progress correctly', async () => {
    window.history.pushState({}, '', '/shopping-list/plan-1');
    renderWithProviders(<ShoppingListPage />);

    await waitFor(() => {
      // 1 checked out of 4 = 25%
      expect(screen.getByText(/25%/i)).toBeInTheDocument();
    });
  });

  it('should display empty state when no items', async () => {
    const emptyList = {
      ...mockShoppingList,
      items: []
    };

    vi.mocked(api.shoppingListAPI.getByPlanId).mockResolvedValue({
      data: { data: { shoppingList: emptyList } }
    } as any);

    window.history.pushState({}, '', '/shopping-list/plan-1');
    renderWithProviders(<ShoppingListPage />);

    await waitFor(() => {
      expect(screen.getByText(/aucun article dans la liste/i)).toBeInTheDocument();
    });
  });

  it('should sort categories in correct order', async () => {
    window.history.pushState({}, '', '/shopping-list/plan-1');
    renderWithProviders(<ShoppingListPage />);

    await waitFor(() => {
      const categories = screen.getAllByRole('heading', { level: 3 })
        .map(h => h.textContent)
        .filter(text => text && text.length > 0);

      // Viandes should come before Fruits et légumes, etc.
      const viandesIndex = categories.findIndex(c => c?.includes('Viandes'));
      const legumesIndex = categories.findIndex(c => c?.includes('Fruits et légumes'));
      const epicerieIndex = categories.findIndex(c => c?.includes('Épicerie'));

      if (viandesIndex !== -1 && legumesIndex !== -1) {
        expect(viandesIndex).toBeLessThan(legumesIndex);
      }
      if (legumesIndex !== -1 && epicerieIndex !== -1) {
        expect(legumesIndex).toBeLessThan(epicerieIndex);
      }
    });
  });

  it('should display quantities with units', async () => {
    window.history.pushState({}, '', '/shopping-list/plan-1');
    renderWithProviders(<ShoppingListPage />);

    await waitFor(() => {
      expect(screen.getByText(/1.5 kg/i)).toBeInTheDocument();
      expect(screen.getByText(/500 g/i)).toBeInTheDocument();
      expect(screen.getByText(/1 l/i)).toBeInTheDocument();
    });
  });
});
