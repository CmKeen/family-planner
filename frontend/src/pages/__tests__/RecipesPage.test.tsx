import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import userEvent from '@testing-library/user-event';
import RecipesPage from '../RecipesPage';
import * as api from '@/lib/api';

// Mock the API
vi.mock('@/lib/api', () => ({
  recipeAPI: {
    getAll: vi.fn(),
    getById: vi.fn(),
    toggleFavorite: vi.fn()
  }
}));

const mockRecipes = [
  {
    id: 'recipe-1',
    name: 'Poulet rôti',
    description: 'Délicieux poulet rôti avec des herbes',
    prepTime: 15,
    cookTime: 45,
    servings: 4,
    category: 'Viandes',
    tags: ['Casher', 'Sans gluten'],
    isFavorite: true,
    kosherCategory: 'meat',
    ingredients: [],
    instructions: []
  },
  {
    id: 'recipe-2',
    name: 'Pâtes tomates basilic',
    description: 'Pâtes italiennes classiques',
    prepTime: 5,
    cookTime: 15,
    servings: 4,
    category: 'Pâtes',
    tags: ['Végan', 'Express'],
    isFavorite: false,
    ingredients: [],
    instructions: []
  },
  {
    id: 'recipe-3',
    name: 'Saumon grillé',
    description: 'Saumon avec légumes',
    prepTime: 10,
    cookTime: 20,
    servings: 2,
    category: 'Poissons',
    tags: ['Casher parve', 'Sans gluten'],
    isFavorite: false,
    ingredients: [],
    instructions: []
  }
];

const mockDetailedRecipe = {
  ...mockRecipes[0],
  ingredients: [
    { id: 'ing-1', name: 'Poulet', quantity: 1, unit: 'kg' },
    { id: 'ing-2', name: 'Herbes de Provence', quantity: 2, unit: 'cuillères à soupe' }
  ],
  instructions: [
    { id: 'inst-1', stepNumber: 1, description: 'Préchauffer le four à 200°C' },
    { id: 'inst-2', stepNumber: 2, description: 'Assaisonner le poulet' },
    { id: 'inst-3', stepNumber: 3, description: 'Cuire au four pendant 45 minutes' }
  ]
};

describe('RecipesPage', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false }
      }
    });

    vi.mocked(api.recipeAPI.getAll).mockResolvedValue({
      data: { data: { recipes: mockRecipes } }
    } as any);

    vi.mocked(api.recipeAPI.getById).mockResolvedValue({
      data: { data: { recipe: mockDetailedRecipe } }
    } as any);
  });

  const renderWithProviders = () => {
    return render(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <RecipesPage />
        </BrowserRouter>
      </QueryClientProvider>
    );
  };

  it('should render loading state initially', () => {
    vi.mocked(api.recipeAPI.getAll).mockImplementation(
      () => new Promise(() => {})
    );

    renderWithProviders();
    expect(screen.getByText(/chargement des recettes/i)).toBeInTheDocument();
  });

  it('should render recipe catalog', async () => {
    renderWithProviders();

    await waitFor(() => {
      expect(screen.getByText('Poulet rôti')).toBeInTheDocument();
      expect(screen.getByText('Pâtes tomates basilic')).toBeInTheDocument();
      expect(screen.getByText('Saumon grillé')).toBeInTheDocument();
    });
  });

  it('should display search bar', () => {
    renderWithProviders();

    const searchInput = screen.getByPlaceholderText(/rechercher une recette/i);
    expect(searchInput).toBeInTheDocument();
  });

  it('should display category tabs', () => {
    renderWithProviders();

    expect(screen.getByRole('tab', { name: /toutes/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /viandes/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /poissons/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /pâtes/i })).toBeInTheDocument();
  });

  it('should display filter button', () => {
    renderWithProviders();

    expect(screen.getByRole('button', { name: /afficher les filtres/i })).toBeInTheDocument();
  });

  it('should show filters when filter button is clicked', async () => {
    const user = userEvent.setup();
    renderWithProviders();

    const filterButton = screen.getByRole('button', { name: /afficher les filtres/i });
    await user.click(filterButton);

    await waitFor(() => {
      expect(screen.getByText(/temps maximum/i)).toBeInTheDocument();
      expect(screen.getByText(/régimes alimentaires/i)).toBeInTheDocument();
    });
  });

  it('should display recipe cards with basic info', async () => {
    renderWithProviders();

    await waitFor(() => {
      expect(screen.getByText('Poulet rôti')).toBeInTheDocument();
    });

    // Check for cooking time
    expect(screen.getByText(/60 min/)).toBeInTheDocument(); // 15 + 45

    // Check for servings
    expect(screen.getByText(/4 parts/)).toBeInTheDocument();

    // Check for category badges
    expect(screen.getByText('Viandes')).toBeInTheDocument();
    expect(screen.getByText('Pâtes')).toBeInTheDocument();
  });

  it('should display favorite hearts', async () => {
    renderWithProviders();

    await waitFor(() => {
      const hearts = screen.getAllByRole('button');
      expect(hearts.length).toBeGreaterThan(0);
    });
  });

  it('should open recipe detail dialog when recipe is clicked', async () => {
    const user = userEvent.setup();
    renderWithProviders();

    await waitFor(() => {
      expect(screen.getByText('Poulet rôti')).toBeInTheDocument();
    });

    // Click on the recipe card
    const recipeCard = screen.getByText('Poulet rôti').closest('div[role="region"]') ||
                      screen.getByText('Poulet rôti');

    await user.click(recipeCard);

    await waitFor(() => {
      // Dialog should open with detailed recipe info
      expect(screen.getAllByText('Poulet rôti').length).toBeGreaterThan(1);
    });
  });

  it('should display ingredients in detail dialog', async () => {
    const user = userEvent.setup();
    renderWithProviders();

    await waitFor(() => {
      expect(screen.getByText('Poulet rôti')).toBeInTheDocument();
    });

    const recipeCard = screen.getByText('Poulet rôti');
    await user.click(recipeCard);

    await waitFor(() => {
      expect(screen.getByText(/ingrédients/i)).toBeInTheDocument();
      expect(screen.getByText(/1 kg poulet/i)).toBeInTheDocument();
      expect(screen.getByText(/2 cuillères à soupe herbes de provence/i)).toBeInTheDocument();
    });
  });

  it('should display instructions in detail dialog', async () => {
    const user = userEvent.setup();
    renderWithProviders();

    await waitFor(() => {
      expect(screen.getByText('Poulet rôti')).toBeInTheDocument();
    });

    const recipeCard = screen.getByText('Poulet rôti');
    await user.click(recipeCard);

    await waitFor(() => {
      expect(screen.getByText(/instructions/i)).toBeInTheDocument();
      expect(screen.getByText(/préchauffer le four à 200°c/i)).toBeInTheDocument();
      expect(screen.getByText(/assaisonner le poulet/i)).toBeInTheDocument();
      expect(screen.getByText(/cuire au four pendant 45 minutes/i)).toBeInTheDocument();
    });
  });

  it('should filter recipes by search query', async () => {
    const user = userEvent.setup();
    renderWithProviders();

    await waitFor(() => {
      expect(screen.getByText('Poulet rôti')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText(/rechercher une recette/i);
    await user.type(searchInput, 'Poulet');

    // API should be called with search parameter
    await waitFor(() => {
      expect(api.recipeAPI.getAll).toHaveBeenCalledWith(
        expect.objectContaining({ search: 'Poulet' })
      );
    });
  });

  it('should filter by category when tab is clicked', async () => {
    const user = userEvent.setup();
    renderWithProviders();

    await waitFor(() => {
      expect(screen.getByRole('tab', { name: /viandes/i })).toBeInTheDocument();
    });

    const viandesTab = screen.getByRole('tab', { name: /viandes/i });
    await user.click(viandesTab);

    await waitFor(() => {
      expect(api.recipeAPI.getAll).toHaveBeenCalledWith(
        expect.objectContaining({ category: 'Viandes' })
      );
    });
  });

  it('should display recipe tags', async () => {
    renderWithProviders();

    await waitFor(() => {
      expect(screen.getByText('Casher')).toBeInTheDocument();
      expect(screen.getByText('Sans gluten')).toBeInTheDocument();
      expect(screen.getByText('Végan')).toBeInTheDocument();
      expect(screen.getByText('Express')).toBeInTheDocument();
    });
  });

  it('should show "no recipes found" message when no results', async () => {
    vi.mocked(api.recipeAPI.getAll).mockResolvedValue({
      data: { data: { recipes: [] } }
    } as any);

    renderWithProviders();

    await waitFor(() => {
      expect(screen.getByText(/aucune recette trouvée/i)).toBeInTheDocument();
    });
  });

  it('should display recipe descriptions', async () => {
    renderWithProviders();

    await waitFor(() => {
      expect(screen.getByText(/délicieux poulet rôti avec des herbes/i)).toBeInTheDocument();
      expect(screen.getByText(/pâtes italiennes classiques/i)).toBeInTheDocument();
    });
  });

  it('should show kosher category badge when applicable', async () => {
    renderWithProviders();

    await waitFor(() => {
      expect(screen.getByText(/casher meat/i)).toBeInTheDocument();
    });
  });

  it('should display dietary filter checkboxes', async () => {
    const user = userEvent.setup();
    renderWithProviders();

    const filterButton = screen.getByRole('button', { name: /afficher les filtres/i });
    await user.click(filterButton);

    await waitFor(() => {
      expect(screen.getByLabelText(/végétarien/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/végan/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/sans gluten/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/casher/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/halal/i)).toBeInTheDocument();
    });
  });

  it('should have reset filters button', async () => {
    const user = userEvent.setup();
    renderWithProviders();

    const filterButton = screen.getByRole('button', { name: /afficher les filtres/i });
    await user.click(filterButton);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /réinitialiser les filtres/i })).toBeInTheDocument();
    });
  });
});
