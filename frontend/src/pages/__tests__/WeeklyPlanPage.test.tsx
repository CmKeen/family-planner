import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import userEvent from '@testing-library/user-event';
import WeeklyPlanPage from '../WeeklyPlanPage';
import * as weeklyPlanAPI from '@/lib/api';

// Mock the API
vi.mock('@/lib/api', () => ({
  weeklyPlanAPI: {
    getById: vi.fn(),
    swapMeal: vi.fn(),
    adjustPortions: vi.fn(),
    lockMeal: vi.fn(),
    validate: vi.fn()
  },
  recipeAPI: {
    getAll: vi.fn()
  }
}));

const mockPlanData = {
  id: 'plan-1',
  weekNumber: 1,
  year: 2024,
  status: 'DRAFT',
  meals: [
    {
      id: 'meal-1',
      dayOfWeek: 'MONDAY',
      mealType: 'LUNCH',
      recipe: {
        id: 'recipe-1',
        name: 'Poulet rôti',
        prepTime: 15,
        cookTime: 45,
        category: 'Viandes',
        tags: ['Casher', 'Sans gluten']
      },
      portions: 4,
      isLocked: false,
      isFavorite: true
    },
    {
      id: 'meal-2',
      dayOfWeek: 'MONDAY',
      mealType: 'DINNER',
      recipe: {
        id: 'recipe-2',
        name: 'Pâtes tomates basilic',
        prepTime: 5,
        cookTime: 15,
        category: 'Pâtes',
        tags: ['Végan', 'Express']
      },
      portions: 4,
      isLocked: false,
      isFavorite: false
    }
  ]
};

const mockRecipes = [
  {
    id: 'recipe-3',
    name: 'Saumon grillé',
    prepTime: 10,
    cookTime: 20,
    category: 'Poissons',
    tags: ['Casher parve']
  }
];

describe('WeeklyPlanPage', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false }
      }
    });

    vi.mocked(weeklyPlanAPI.weeklyPlanAPI.getById).mockResolvedValue({
      data: { data: { plan: mockPlanData } }
    } as any);

    vi.mocked(weeklyPlanAPI.recipeAPI.getAll).mockResolvedValue({
      data: { data: { recipes: mockRecipes } }
    } as any);
  });

  const renderWithProviders = (component: React.ReactElement) => {
    return render(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <Routes>
            <Route path="/weekly-plan/:planId" element={component} />
          </Routes>
        </BrowserRouter>
      </QueryClientProvider>
    );
  };

  it('should render loading state initially', () => {
    vi.mocked(weeklyPlanAPI.weeklyPlanAPI.getById).mockImplementation(
      () => new Promise(() => {}) // Never resolves
    );

    renderWithProviders(<WeeklyPlanPage />);
    expect(screen.getByText(/chargement du plan/i)).toBeInTheDocument();
  });

  it('should render weekly plan with meals', async () => {
    window.history.pushState({}, '', '/weekly-plan/plan-1');
    renderWithProviders(<WeeklyPlanPage />);

    await waitFor(() => {
      expect(screen.getByText(/semaine 1 - 2024/i)).toBeInTheDocument();
    });

    expect(screen.getByText('Poulet rôti')).toBeInTheDocument();
    expect(screen.getByText('Pâtes tomates basilic')).toBeInTheDocument();
    expect(screen.getByText('Lundi')).toBeInTheDocument();
  });

  it('should display correct stats', async () => {
    window.history.pushState({}, '', '/weekly-plan/plan-1');
    renderWithProviders(<WeeklyPlanPage />);

    await waitFor(() => {
      expect(screen.getByText(/semaine 1/i)).toBeInTheDocument();
    });

    // Total time: 15+45+5+15 = 80 min = 1h (rounded)
    expect(screen.getByText(/1h/i)).toBeInTheDocument();

    // 1 favorite
    expect(screen.getByText(/1/)).toBeInTheDocument();

    // 1 novelty
    expect(screen.getByText(/1/)).toBeInTheDocument();
  });

  it('should show validate button for draft plan', async () => {
    window.history.pushState({}, '', '/weekly-plan/plan-1');
    renderWithProviders(<WeeklyPlanPage />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /valider le plan/i })).toBeInTheDocument();
    });
  });

  it('should show shopping list button for validated plan', async () => {
    const validatedPlan = { ...mockPlanData, status: 'VALIDATED' };
    vi.mocked(weeklyPlanAPI.weeklyPlanAPI.getById).mockResolvedValue({
      data: { data: { plan: validatedPlan } }
    } as any);

    window.history.pushState({}, '', '/weekly-plan/plan-1');
    renderWithProviders(<WeeklyPlanPage />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /voir la liste de courses/i })).toBeInTheDocument();
    });
  });

  it('should display meal tags', async () => {
    window.history.pushState({}, '', '/weekly-plan/plan-1');
    renderWithProviders(<WeeklyPlanPage />);

    await waitFor(() => {
      expect(screen.getByText('Casher')).toBeInTheDocument();
      expect(screen.getByText('Sans gluten')).toBeInTheDocument();
      expect(screen.getByText('Végan')).toBeInTheDocument();
      expect(screen.getByText('Express')).toBeInTheDocument();
    });
  });

  it('should show meal type badges', async () => {
    window.history.pushState({}, '', '/weekly-plan/plan-1');
    renderWithProviders(<WeeklyPlanPage />);

    await waitFor(() => {
      expect(screen.getByText('Déjeuner')).toBeInTheDocument();
      expect(screen.getByText('Dîner')).toBeInTheDocument();
    });
  });

  it('should display favorite heart icon', async () => {
    window.history.pushState({}, '', '/weekly-plan/plan-1');
    renderWithProviders(<WeeklyPlanPage />);

    await waitFor(() => {
      const hearts = screen.getAllByTestId(/heart/i);
      expect(hearts.length).toBeGreaterThan(0);
    });
  });

  it('should display cooking and prep time', async () => {
    window.history.pushState({}, '', '/weekly-plan/plan-1');
    renderWithProviders(<WeeklyPlanPage />);

    await waitFor(() => {
      // 15+45 = 60 min
      expect(screen.getByText(/60 min/)).toBeInTheDocument();
      // 5+15 = 20 min
      expect(screen.getByText(/20 min/)).toBeInTheDocument();
    });
  });

  it('should display portion count', async () => {
    window.history.pushState({}, '', '/weekly-plan/plan-1');
    renderWithProviders(<WeeklyPlanPage />);

    await waitFor(() => {
      const portions = screen.getAllByText(/4 portions/i);
      expect(portions.length).toBeGreaterThan(0);
    });
  });

  it('should have action buttons for each meal', async () => {
    window.history.pushState({}, '', '/weekly-plan/plan-1');
    renderWithProviders(<WeeklyPlanPage />);

    await waitFor(() => {
      const swapButtons = screen.getAllByRole('button', { name: /échanger/i });
      expect(swapButtons.length).toBeGreaterThan(0);

      const portionButtons = screen.getAllByRole('button', { name: /portions/i });
      expect(portionButtons.length).toBeGreaterThan(0);
    });
  });

  it('should open swap dialog when swap button is clicked', async () => {
    const user = userEvent.setup();
    window.history.pushState({}, '', '/weekly-plan/plan-1');
    renderWithProviders(<WeeklyPlanPage />);

    await waitFor(() => {
      expect(screen.getByText('Poulet rôti')).toBeInTheDocument();
    });

    const swapButtons = screen.getAllByRole('button', { name: /échanger/i });
    await user.click(swapButtons[0]);

    await waitFor(() => {
      expect(screen.getByText(/échanger la recette/i)).toBeInTheDocument();
    });
  });

  it('should open portion dialog when portions button is clicked', async () => {
    const user = userEvent.setup();
    window.history.pushState({}, '', '/weekly-plan/plan-1');
    renderWithProviders(<WeeklyPlanPage />);

    await waitFor(() => {
      expect(screen.getByText('Poulet rôti')).toBeInTheDocument();
    });

    const portionButtons = screen.getAllByRole('button', { name: /portions/i });
    await user.click(portionButtons[0]);

    await waitFor(() => {
      expect(screen.getByText(/ajuster les portions/i)).toBeInTheDocument();
    });
  });

  it('should display back button', async () => {
    window.history.pushState({}, '', '/weekly-plan/plan-1');
    renderWithProviders(<WeeklyPlanPage />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /retour/i })).toBeInTheDocument();
    });
  });

  it('should render all 7 days of the week', async () => {
    const fullWeekPlan = {
      ...mockPlanData,
      meals: [
        'MONDAY',
        'TUESDAY',
        'WEDNESDAY',
        'THURSDAY',
        'FRIDAY',
        'SATURDAY',
        'SUNDAY'
      ].flatMap((day) => [
        {
          id: `${day}-lunch`,
          dayOfWeek: day,
          mealType: 'LUNCH',
          recipe: mockPlanData.meals[0].recipe,
          portions: 4,
          isLocked: false,
          isFavorite: true
        },
        {
          id: `${day}-dinner`,
          dayOfWeek: day,
          mealType: 'DINNER',
          recipe: mockPlanData.meals[1].recipe,
          portions: 4,
          isLocked: false,
          isFavorite: false
        }
      ])
    };

    vi.mocked(weeklyPlanAPI.weeklyPlanAPI.getById).mockResolvedValue({
      data: { data: { plan: fullWeekPlan } }
    } as any);

    window.history.pushState({}, '', '/weekly-plan/plan-1');
    renderWithProviders(<WeeklyPlanPage />);

    await waitFor(() => {
      expect(screen.getByText('Lundi')).toBeInTheDocument();
      expect(screen.getByText('Mardi')).toBeInTheDocument();
      expect(screen.getByText('Mercredi')).toBeInTheDocument();
      expect(screen.getByText('Jeudi')).toBeInTheDocument();
      expect(screen.getByText('Vendredi')).toBeInTheDocument();
      expect(screen.getByText('Samedi')).toBeInTheDocument();
      expect(screen.getByText('Dimanche')).toBeInTheDocument();
    });
  });
});
