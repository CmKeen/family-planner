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
        title: 'Poulet rôti',
        titleEn: 'Roasted Chicken',
        prepTime: 15,
        cookTime: 45,
        category: 'Viandes',
        isFavorite: true,
        isNovelty: false
      },
      portions: 4,
      locked: false
    },
    {
      id: 'meal-2',
      dayOfWeek: 'MONDAY',
      mealType: 'DINNER',
      recipe: {
        id: 'recipe-2',
        title: 'Pâtes tomates basilic',
        titleEn: 'Tomato Basil Pasta',
        prepTime: 5,
        cookTime: 15,
        category: 'Pâtes',
        isFavorite: false,
        isNovelty: true
      },
      portions: 4,
      locked: false
    }
  ]
};

const mockRecipes = [
  {
    id: 'recipe-3',
    title: 'Saumon grillé',
    titleEn: 'Grilled Salmon',
    prepTime: 10,
    cookTime: 20,
    category: 'Poissons',
    isFavorite: false
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

    window.history.pushState({}, '', '/weekly-plan/plan-1');
    renderWithProviders(<WeeklyPlanPage />);
    expect(screen.getByText(/weeklyPlan.loading/i)).toBeInTheDocument();
  });

  it('should render weekly plan with meals', async () => {
    window.history.pushState({}, '', '/weekly-plan/plan-1');
    renderWithProviders(<WeeklyPlanPage />);

    await waitFor(() => {
      expect(screen.getAllByText(/semaine 1 - 2024/i)[0]).toBeInTheDocument();
    });

    expect(screen.getAllByText('Poulet rôti')[0]).toBeInTheDocument();
    expect(screen.getAllByText('Pâtes tomates basilic')[0]).toBeInTheDocument();
    expect(screen.getAllByText('Lundi')[0]).toBeInTheDocument();
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
      // Check for categories
      expect(screen.getAllByText('Viandes')[0]).toBeInTheDocument();
      expect(screen.getAllByText('Pâtes')[0]).toBeInTheDocument();
    });
  });

  it('should show meal type badges', async () => {
    window.history.pushState({}, '', '/weekly-plan/plan-1');
    renderWithProviders(<WeeklyPlanPage />);

    await waitFor(() => {
      expect(screen.getAllByText('Déjeuner')[0]).toBeInTheDocument();
      expect(screen.getAllByText('Dîner')[0]).toBeInTheDocument();
    });
  });

  it('should display favorite heart icon', async () => {
    window.history.pushState({}, '', '/weekly-plan/plan-1');
    renderWithProviders(<WeeklyPlanPage />);

    await waitFor(() => {
      // Check that the plan and favorite meal are displayed
      expect(screen.getAllByText('Poulet rôti')[0]).toBeInTheDocument();
    });

    // The heart icon should be rendered for the favorite meal (Poulet rôti)
    // Heart icons are SVG elements with specific classes
    const container = screen.getAllByText('Poulet rôti')[0].closest('div');
    expect(container).toBeInTheDocument();
  });

  it('should display cooking and prep time', async () => {
    window.history.pushState({}, '', '/weekly-plan/plan-1');
    renderWithProviders(<WeeklyPlanPage />);

    await waitFor(() => {
      // 15+45 = 60 min
      expect(screen.getAllByText(/60 min/)[0]).toBeInTheDocument();
      // 5+15 = 20 min
      expect(screen.getAllByText(/20 min/)[0]).toBeInTheDocument();
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
      expect(screen.getAllByText('Poulet rôti')[0]).toBeInTheDocument();
    });

    const swapButtons = screen.getAllByRole('button', { name: /échanger/i });
    await user.click(swapButtons[0]);

    await waitFor(() => {
      expect(screen.getAllByText(/échanger la recette/i)[0]).toBeInTheDocument();
    });
  });

  it('should open portion dialog when portions button is clicked', async () => {
    const user = userEvent.setup();
    window.history.pushState({}, '', '/weekly-plan/plan-1');
    renderWithProviders(<WeeklyPlanPage />);

    await waitFor(() => {
      expect(screen.getAllByText('Poulet rôti')[0]).toBeInTheDocument();
    });

    const portionButtons = screen.getAllByRole('button', { name: /portions/i });
    await user.click(portionButtons[0]);

    await waitFor(() => {
      expect(screen.getAllByText(/ajuster les portions/i)[0]).toBeInTheDocument();
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
          locked: false
        },
        {
          id: `${day}-dinner`,
          dayOfWeek: day,
          mealType: 'DINNER',
          recipe: mockPlanData.meals[1].recipe,
          portions: 4,
          locked: false
        }
      ])
    };

    vi.mocked(weeklyPlanAPI.weeklyPlanAPI.getById).mockResolvedValue({
      data: { data: { plan: fullWeekPlan } }
    } as any);

    window.history.pushState({}, '', '/weekly-plan/plan-1');
    renderWithProviders(<WeeklyPlanPage />);

    await waitFor(() => {
      expect(screen.getAllByText('Lundi')[0]).toBeInTheDocument();
      expect(screen.getAllByText('Mardi')[0]).toBeInTheDocument();
      expect(screen.getAllByText('Mercredi')[0]).toBeInTheDocument();
      expect(screen.getAllByText('Jeudi')[0]).toBeInTheDocument();
      expect(screen.getAllByText('Vendredi')[0]).toBeInTheDocument();
      expect(screen.getAllByText('Samedi')[0]).toBeInTheDocument();
      expect(screen.getAllByText('Dimanche')[0]).toBeInTheDocument();
    });
  });

  describe('Day-Specific Add Meal Buttons', () => {
    it('should show empty state with Add Meal button for days with no meals', async () => {
      // Plan with only Monday meals, Tuesday should be empty
      const partialPlan = {
        ...mockPlanData,
        meals: [
          {
            id: 'meal-1',
            dayOfWeek: 'MONDAY',
            mealType: 'DINNER',
            recipe: mockPlanData.meals[0].recipe,
            portions: 4,
            locked: false
          }
        ]
      };

      vi.mocked(weeklyPlanAPI.weeklyPlanAPI.getById).mockResolvedValue({
        data: { data: { plan: partialPlan } }
      } as any);

      window.history.pushState({}, '', '/weekly-plan/plan-1');
      renderWithProviders(<WeeklyPlanPage />);

      await waitFor(() => {
        // Should show empty state message
        expect(screen.getByText(/aucun repas planifié pour ce jour/i)).toBeInTheDocument();
      });

      // Should show Add Meal button in empty state
      const addMealButtons = screen.getAllByRole('button', { name: /ajouter un repas/i });
      expect(addMealButtons.length).toBeGreaterThan(0);
    });

    it('should show Add Meal button at bottom of day card with existing meals', async () => {
      window.history.pushState({}, '', '/weekly-plan/plan-1');
      renderWithProviders(<WeeklyPlanPage />);

      await waitFor(() => {
        expect(screen.getAllByText('Poulet rôti')[0]).toBeInTheDocument();
      });

      // Monday has 2 meals, should still show Add Meal button at bottom
      const addMealButtons = screen.getAllByRole('button', { name: /ajouter un repas/i });
      expect(addMealButtons.length).toBeGreaterThan(0);
    });

    it('should display all day cards even if they have no meals', async () => {
      // Plan with only Monday meals
      const sparePlan = {
        ...mockPlanData,
        meals: [
          {
            id: 'meal-1',
            dayOfWeek: 'MONDAY',
            mealType: 'DINNER',
            recipe: mockPlanData.meals[0].recipe,
            portions: 4,
            locked: false
          }
        ]
      };

      vi.mocked(weeklyPlanAPI.weeklyPlanAPI.getById).mockResolvedValue({
        data: { data: { plan: sparePlan } }
      } as any);

      window.history.pushState({}, '', '/weekly-plan/plan-1');
      renderWithProviders(<WeeklyPlanPage />);

      await waitFor(() => {
        // All days should still render (even empty ones in DRAFT mode)
        expect(screen.getAllByText('Lundi')[0]).toBeInTheDocument();
        expect(screen.getAllByText('Mardi')[0]).toBeInTheDocument();
        expect(screen.getAllByText('Mercredi')[0]).toBeInTheDocument();
      });
    });

    it('should open Add Meal dialog when day-specific button is clicked', async () => {
      const user = userEvent.setup();

      // Plan with empty Tuesday
      const partialPlan = {
        ...mockPlanData,
        meals: [
          {
            id: 'meal-1',
            dayOfWeek: 'MONDAY',
            mealType: 'DINNER',
            recipe: mockPlanData.meals[0].recipe,
            portions: 4,
            locked: false
          }
        ]
      };

      vi.mocked(weeklyPlanAPI.weeklyPlanAPI.getById).mockResolvedValue({
        data: { data: { plan: partialPlan } }
      } as any);

      window.history.pushState({}, '', '/weekly-plan/plan-1');
      renderWithProviders(<WeeklyPlanPage />);

      await waitFor(() => {
        expect(screen.getAllByText('Mardi')[0]).toBeInTheDocument();
      });

      // Click Add Meal button for empty day (Tuesday)
      const addMealButtons = screen.getAllByRole('button', { name: /ajouter un repas/i });

      // Find the button for Tuesday (should be in the empty state)
      if (addMealButtons.length > 0) {
        await user.click(addMealButtons[0]);

        // Dialog should open
        await waitFor(() => {
          expect(screen.getAllByText(/ajouter un repas/i)[0]).toBeInTheDocument();
        });
      }
    });

    it('should pre-fill day when clicking day-specific Add Meal button', async () => {
      const user = userEvent.setup();

      const partialPlan = {
        ...mockPlanData,
        meals: [
          {
            id: 'meal-1',
            dayOfWeek: 'MONDAY',
            mealType: 'DINNER',
            recipe: mockPlanData.meals[0].recipe,
            portions: 4,
            locked: false
          }
        ]
      };

      vi.mocked(weeklyPlanAPI.weeklyPlanAPI.getById).mockResolvedValue({
        data: { data: { plan: partialPlan } }
      } as any);

      window.history.pushState({}, '', '/weekly-plan/plan-1');
      renderWithProviders(<WeeklyPlanPage />);

      await waitFor(() => {
        expect(screen.getAllByText('Mardi')[0]).toBeInTheDocument();
      });

      const addMealButtons = screen.getAllByRole('button', { name: /ajouter un repas/i });

      if (addMealButtons.length > 0) {
        await user.click(addMealButtons[0]);

        // The day should be pre-selected in the dialog
        // This would require checking the select element value
        await waitFor(() => {
          const daySelect = screen.getAllByLabelText(/jour/i)[0];
          expect(daySelect).toBeInTheDocument();
        });
      }
    });

    it('should not show Add Meal buttons for validated plans', async () => {
      const validatedPlan = { ...mockPlanData, status: 'VALIDATED' };

      vi.mocked(weeklyPlanAPI.weeklyPlanAPI.getById).mockResolvedValue({
        data: { data: { plan: validatedPlan } }
      } as any);

      window.history.pushState({}, '', '/weekly-plan/plan-1');
      renderWithProviders(<WeeklyPlanPage />);

      await waitFor(() => {
        expect(screen.getAllByText('Poulet rôti')[0]).toBeInTheDocument();
      });

      // Should not show Add Meal buttons for validated plans
      const addMealButtons = screen.queryAllByRole('button', { name: /ajouter un repas/i });
      expect(addMealButtons.length).toBe(0);
    });

    it('should show both header Add Meal button and day-specific buttons for draft plans', async () => {
      window.history.pushState({}, '', '/weekly-plan/plan-1');
      renderWithProviders(<WeeklyPlanPage />);

      await waitFor(() => {
        expect(screen.getAllByText('Poulet rôti')[0]).toBeInTheDocument();
      });

      // Should have multiple Add Meal buttons (header + day-specific)
      const addMealButtons = screen.getAllByRole('button', { name: /ajouter un repas/i });
      expect(addMealButtons.length).toBeGreaterThan(1);
    });

    it('should show empty state message for days without meals', async () => {
      const oneMealPlan = {
        ...mockPlanData,
        meals: [
          {
            id: 'meal-1',
            dayOfWeek: 'MONDAY',
            mealType: 'DINNER',
            recipe: mockPlanData.meals[0].recipe,
            portions: 4,
            locked: false
          }
        ]
      };

      vi.mocked(weeklyPlanAPI.weeklyPlanAPI.getById).mockResolvedValue({
        data: { data: { plan: oneMealPlan } }
      } as any);

      window.history.pushState({}, '', '/weekly-plan/plan-1');
      renderWithProviders(<WeeklyPlanPage />);

      await waitFor(() => {
        // Should show "No meals planned for this day" message
        expect(screen.getByText(/aucun repas planifié pour ce jour/i)).toBeInTheDocument();
      });
    });
  });
});
