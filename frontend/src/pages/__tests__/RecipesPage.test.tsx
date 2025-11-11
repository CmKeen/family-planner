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
    title: 'Poulet rôti',
    titleEn: 'Roasted Chicken',
    description: 'Délicieux poulet rôti avec des herbes',
    descriptionEn: 'Delicious roasted chicken with herbs',
    prepTime: 15,
    cookTime: 45,
    totalTime: 60,
    servings: 4,
    category: 'Viandes',
    mealType: ['DINNER'],
    vegetarian: false,
    vegan: false,
    glutenFree: true,
    halalFriendly: false,
    isFavorite: true,
    kosherCategory: 'meat',
    ingredients: [],
    instructions: []
  },
  {
    id: 'recipe-2',
    title: 'Pâtes tomates basilic',
    titleEn: 'Tomato Basil Pasta',
    description: 'Pâtes italiennes classiques',
    descriptionEn: 'Classic Italian pasta',
    prepTime: 5,
    cookTime: 15,
    totalTime: 20,
    servings: 4,
    category: 'Pâtes',
    mealType: ['LUNCH', 'DINNER'],
    vegetarian: true,
    vegan: true,
    glutenFree: false,
    halalFriendly: true,
    isFavorite: false,
    ingredients: [],
    instructions: []
  },
  {
    id: 'recipe-3',
    title: 'Saumon grillé',
    titleEn: 'Grilled Salmon',
    description: 'Saumon avec légumes',
    descriptionEn: 'Salmon with vegetables',
    prepTime: 10,
    cookTime: 20,
    totalTime: 30,
    servings: 2,
    category: 'Poissons',
    mealType: ['DINNER'],
    vegetarian: false,
    vegan: false,
    glutenFree: true,
    halalFriendly: false,
    isFavorite: false,
    kosherCategory: 'parve',
    ingredients: [],
    instructions: []
  }
];

const mockDetailedRecipe = {
  ...mockRecipes[0],
  ingredients: [
    { id: 'ing-1', name: 'Poulet', nameEn: 'Chicken', quantity: 1, unit: 'kg', category: 'viande' },
    { id: 'ing-2', name: 'Herbes de Provence', nameEn: 'Herbs de Provence', quantity: 2, unit: 'cuillères à soupe', category: 'epice' }
  ],
  instructions: [
    { id: 'inst-1', stepNumber: 1, text: 'Préchauffer le four à 200°C', textEn: 'Preheat oven to 200°C' },
    { id: 'inst-2', stepNumber: 2, text: 'Assaisonner le poulet', textEn: 'Season the chicken' },
    { id: 'inst-3', stepNumber: 3, text: 'Cuire au four pendant 45 minutes', textEn: 'Bake for 45 minutes' }
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

    // Wait for recipes to load
    await waitFor(() => {
      expect(screen.getAllByText('Poulet rôti')[0]).toBeInTheDocument();
    }, { timeout: 3000 });

    // Verify all recipes are rendered
    expect(screen.getAllByText('Pâtes tomates basilic')[0]).toBeInTheDocument();
    expect(screen.getAllByText('Saumon grillé')[0]).toBeInTheDocument();
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
      expect(screen.getAllByText('Poulet rôti')[0]).toBeInTheDocument();
    });

    // Check for cooking time
    expect(screen.getAllByText(/60 min/)[0]).toBeInTheDocument(); // 15 + 45

    // Check for servings
    expect(screen.getAllByText(/4 parts/)[0]).toBeInTheDocument();

    // Check for category badges
    expect(screen.getAllByText('Viandes')[0]).toBeInTheDocument();
    expect(screen.getAllByText('Pâtes')[0]).toBeInTheDocument();
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
      expect(screen.getAllByText('Poulet rôti')[0]).toBeInTheDocument();
    });

    // Click on the recipe card
    const recipeCard = screen.getAllByText('Poulet rôti')[0].closest('div[role="region"]') ||
                      screen.getAllByText('Poulet rôti')[0];

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
      expect(screen.getAllByText('Poulet rôti')[0]).toBeInTheDocument();
    });

    const recipeCard = screen.getAllByText('Poulet rôti')[0];
    await user.click(recipeCard);

    await waitFor(() => {
      expect(screen.getAllByText(/ingrédients/i)[0]).toBeInTheDocument();
      expect(screen.getAllByText(/1 kg poulet/i)[0]).toBeInTheDocument();
      expect(screen.getAllByText(/2 cuillères à soupe herbes de provence/i)[0]).toBeInTheDocument();
    });
  });

  it('should display instructions in detail dialog', async () => {
    const user = userEvent.setup();
    renderWithProviders();

    await waitFor(() => {
      expect(screen.getAllByText('Poulet rôti')[0]).toBeInTheDocument();
    });

    const recipeCard = screen.getAllByText('Poulet rôti')[0];
    await user.click(recipeCard);

    await waitFor(() => {
      expect(screen.getAllByText(/instructions/i)[0]).toBeInTheDocument();
      expect(screen.getAllByText(/préchauffer le four à 200°c/i)[0]).toBeInTheDocument();
      expect(screen.getAllByText(/assaisonner le poulet/i)[0]).toBeInTheDocument();
      expect(screen.getAllByText(/cuire au four pendant 45 minutes/i)[0]).toBeInTheDocument();
    });
  });

  it('should filter recipes by search query', async () => {
    const user = userEvent.setup();
    renderWithProviders();

    await waitFor(() => {
      expect(screen.getAllByText('Poulet rôti')[0]).toBeInTheDocument();
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
        expect.objectContaining({ category: 'viande' })
      );
    });
  });

  it('should display recipe tags', async () => {
    renderWithProviders();

    await waitFor(() => {
      // Check for mealType badges
      expect(screen.getAllByText('DINNER')[0]).toBeInTheDocument();
      expect(screen.getAllByText('LUNCH')[0]).toBeInTheDocument();
      // Check for categories
      expect(screen.getAllByText('Viandes')[0]).toBeInTheDocument();
      expect(screen.getAllByText('Pâtes')[0]).toBeInTheDocument();
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
      expect(screen.getAllByText(/casher meat/i)[0]).toBeInTheDocument();
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
