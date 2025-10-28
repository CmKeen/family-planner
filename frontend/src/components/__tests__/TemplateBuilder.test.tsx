import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import TemplateBuilder from '../TemplateBuilder';
import * as api from '@/lib/api';

// Mock the API
vi.mock('@/lib/api', () => ({
  mealTemplateAPI: {
    create: vi.fn(),
    update: vi.fn()
  }
}));

// Mock the toast hook
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn()
  })
}));

// Mock react-i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, params?: any) => {
      const translations: Record<string, string> = {
        'mealTemplates.builder.title': 'Schedule Builder',
        'mealTemplates.builder.step1': 'Schedule Details',
        'mealTemplates.builder.step2': 'Select Meals',
        'mealTemplates.builder.nameLabel': 'Schedule Name',
        'mealTemplates.builder.namePlaceholder': 'E.g., Gourmet Weekend',
        'mealTemplates.builder.descriptionLabel': 'Description (optional)',
        'mealTemplates.builder.descriptionPlaceholder': 'Describe your custom meal schedule',
        'mealTemplates.builder.selectMeals': 'Select days and meal types',
        'mealTemplates.builder.preview': `Preview: ${params?.count || 0} meals`,
        'mealTemplates.builder.cancel': 'Cancel',
        'mealTemplates.builder.save': 'Save Schedule',
        'mealTemplates.builder.saving': 'Saving...',
        'mealTemplates.builder.error': 'Error occurred',
        'weeklyPlan.mealTypes.breakfast': 'Breakfast',
        'weeklyPlan.mealTypes.lunch': 'Lunch',
        'weeklyPlan.mealTypes.dinner': 'Dinner',
        'weeklyPlan.mealTypes.snack': 'Snack',
        'days.monday': 'Monday',
        'days.tuesday': 'Tuesday',
        'days.wednesday': 'Wednesday',
        'days.thursday': 'Thursday',
        'days.friday': 'Friday',
        'days.saturday': 'Saturday',
        'days.sunday': 'Sunday'
      };
      return translations[key] || key;
    }
  })
}));

describe('TemplateBuilder', () => {
  const mockOnClose = vi.fn();
  const familyId = 'family-123';
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false }
      }
    });
    vi.clearAllMocks();
  });

  const renderComponent = (template?: any) => {
    return render(
      <QueryClientProvider client={queryClient}>
        <TemplateBuilder
          familyId={familyId}
          template={template}
          onClose={mockOnClose}
        />
      </QueryClientProvider>
    );
  };

  describe('Rendering', () => {
    it('should render the dialog with title', () => {
      renderComponent();
      expect(screen.getByRole('heading', { name: 'Schedule Builder' })).toBeInTheDocument();
    });

    it('should render form inputs', () => {
      renderComponent();
      expect(screen.getByLabelText('Schedule Name')).toBeInTheDocument();
      expect(screen.getByLabelText('Description (optional)')).toBeInTheDocument();
    });

    it('should render the visual grid with all days and meal types', () => {
      renderComponent();

      // Check day labels
      expect(screen.getByText('Monday')).toBeInTheDocument();
      expect(screen.getByText('Tuesday')).toBeInTheDocument();
      expect(screen.getByText('Wednesday')).toBeInTheDocument();
      expect(screen.getByText('Thursday')).toBeInTheDocument();
      expect(screen.getByText('Friday')).toBeInTheDocument();
      expect(screen.getByText('Saturday')).toBeInTheDocument();
      expect(screen.getByText('Sunday')).toBeInTheDocument();

      // Check meal type headers
      expect(screen.getByText('Breakfast')).toBeInTheDocument();
      expect(screen.getByText('Lunch')).toBeInTheDocument();
      expect(screen.getByText('Dinner')).toBeInTheDocument();
      expect(screen.getByText('Snack')).toBeInTheDocument();
    });

    it('should render action buttons', () => {
      renderComponent();
      expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Save Schedule' })).toBeInTheDocument();
    });

    it('should show initial meal counter as 0', () => {
      renderComponent();
      expect(screen.getByText('Preview: 0 meals')).toBeInTheDocument();
    });
  });

  describe('Create Mode', () => {
    it('should have empty form inputs when no template provided', () => {
      renderComponent();

      const nameInput = screen.getByLabelText('Schedule Name') as HTMLInputElement;
      const descInput = screen.getByLabelText('Description (optional)') as HTMLInputElement;

      expect(nameInput.value).toBe('');
      expect(descInput.value).toBe('');
    });
  });

  describe('Edit Mode', () => {
    it('should populate form with template data', () => {
      const template = {
        id: 'template-1',
        name: 'Weekend Special',
        description: 'Meals for weekend',
        schedule: [
          { dayOfWeek: 'SATURDAY', mealTypes: ['LUNCH', 'DINNER'] },
          { dayOfWeek: 'SUNDAY', mealTypes: ['LUNCH', 'DINNER'] }
        ]
      };

      renderComponent(template);

      const nameInput = screen.getByLabelText('Schedule Name') as HTMLInputElement;
      const descInput = screen.getByLabelText('Description (optional)') as HTMLInputElement;

      expect(nameInput.value).toBe('Weekend Special');
      expect(descInput.value).toBe('Meals for weekend');
    });
  });

  describe('Form Interactions', () => {
    it('should update name input when user types', async () => {
      const user = userEvent.setup();
      renderComponent();

      const nameInput = screen.getByLabelText('Schedule Name');
      await user.type(nameInput, 'My Custom Schedule');

      expect(nameInput).toHaveValue('My Custom Schedule');
    });

    it('should update description input when user types', async () => {
      const user = userEvent.setup();
      renderComponent();

      const descInput = screen.getByLabelText('Description (optional)');
      await user.type(descInput, 'Custom description');

      expect(descInput).toHaveValue('Custom description');
    });
  });

  describe('Grid Interactions', () => {
    it('should update meal counter when selecting a meal slot', async () => {
      const user = userEvent.setup();
      renderComponent();

      // Initial state
      expect(screen.getByText('Preview: 0 meals')).toBeInTheDocument();

      // Find and click a meal checkbox (there are many buttons, so we'll get all and click the first)
      const buttons = screen.getAllByRole('button');
      // Skip Close, Cancel, and Save buttons (last 3), get first grid button
      const firstGridButton = buttons[3]; // Adjust index as needed
      await user.click(firstGridButton);

      // Counter should update
      await waitFor(() => {
        expect(screen.getByText('Preview: 1 meals')).toBeInTheDocument();
      });
    });

    it('should decrement counter when deselecting a meal slot', async () => {
      const user = userEvent.setup();
      renderComponent();

      const buttons = screen.getAllByRole('button');
      const firstGridButton = buttons[3];

      // Select
      await user.click(firstGridButton);
      await waitFor(() => {
        expect(screen.getByText('Preview: 1 meals')).toBeInTheDocument();
      });

      // Deselect
      await user.click(firstGridButton);
      await waitFor(() => {
        expect(screen.getByText('Preview: 0 meals')).toBeInTheDocument();
      });
    });
  });

  describe('Form Submission', () => {
    it('should call create API when submitting new template', async () => {
      const user = userEvent.setup();
      const createMock = vi.mocked(api.mealTemplateAPI.create);
      createMock.mockResolvedValue({ data: { success: true } } as any);

      renderComponent();

      // Fill form
      await user.type(screen.getByLabelText('Schedule Name'), 'Test Template');
      await user.type(screen.getByLabelText('Description (optional)'), 'Test Description');

      // Select a meal (click first grid button)
      const buttons = screen.getAllByRole('button');
      await user.click(buttons[3]);

      // Submit
      await user.click(screen.getByRole('button', { name: 'Save Schedule' }));

      await waitFor(() => {
        expect(createMock).toHaveBeenCalledWith(
          familyId,
          expect.objectContaining({
            name: 'Test Template',
            description: 'Test Description',
            schedule: expect.any(Array)
          })
        );
      });
    });

    it('should call update API when editing existing template', async () => {
      const user = userEvent.setup();
      const updateMock = vi.mocked(api.mealTemplateAPI.update);
      updateMock.mockResolvedValue({ data: { success: true } } as any);

      const template = {
        id: 'template-1',
        name: 'Original Name',
        description: 'Original Description',
        schedule: []
      };

      renderComponent(template);

      // Modify name
      const nameInput = screen.getByLabelText('Schedule Name');
      await user.clear(nameInput);
      await user.type(nameInput, 'Updated Name');

      // Select a meal
      const buttons = screen.getAllByRole('button');
      await user.click(buttons[3]);

      // Submit
      await user.click(screen.getByRole('button', { name: 'Save Schedule' }));

      await waitFor(() => {
        expect(updateMock).toHaveBeenCalledWith(
          familyId,
          'template-1',
          expect.objectContaining({
            name: 'Updated Name',
            schedule: expect.any(Array)
          })
        );
      });
    });

    it('should call onClose after successful submission', async () => {
      const user = userEvent.setup();
      const createMock = vi.mocked(api.mealTemplateAPI.create);
      createMock.mockResolvedValue({ data: { success: true } } as any);

      renderComponent();

      await user.type(screen.getByLabelText('Schedule Name'), 'Test');
      const buttons = screen.getAllByRole('button');
      await user.click(buttons[3]); // Select a meal
      await user.click(screen.getByRole('button', { name: 'Save Schedule' }));

      await waitFor(() => {
        expect(mockOnClose).toHaveBeenCalled();
      });
    });

    it('should not submit if name is empty', async () => {
      const user = userEvent.setup();
      const createMock = vi.mocked(api.mealTemplateAPI.create);

      renderComponent();

      // Don't fill name, just select a meal and submit
      const buttons = screen.getAllByRole('button');
      await user.click(buttons[3]);
      await user.click(screen.getByRole('button', { name: 'Save Schedule' }));

      // Should not call API
      expect(createMock).not.toHaveBeenCalled();
    });

    it('should not submit if no meals selected', async () => {
      const user = userEvent.setup();
      const createMock = vi.mocked(api.mealTemplateAPI.create);

      renderComponent();

      // Fill name but don't select any meals
      await user.type(screen.getByLabelText('Schedule Name'), 'Test');
      await user.click(screen.getByRole('button', { name: 'Save Schedule' }));

      // Should not call API
      expect(createMock).not.toHaveBeenCalled();
    });

    it('should disable submit button while saving', async () => {
      const user = userEvent.setup();
      const createMock = vi.mocked(api.mealTemplateAPI.create);
      createMock.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 1000)));

      renderComponent();

      await user.type(screen.getByLabelText('Schedule Name'), 'Test');
      const buttons = screen.getAllByRole('button');
      await user.click(buttons[3]);

      const saveButton = screen.getByRole('button', { name: 'Save Schedule' });
      await user.click(saveButton);

      // Button should show "Saving..." text
      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Saving...' })).toBeInTheDocument();
      });
    });
  });

  describe('Cancel Functionality', () => {
    it('should call onClose when Cancel button clicked', async () => {
      const user = userEvent.setup();
      renderComponent();

      await user.click(screen.getByRole('button', { name: 'Cancel' }));

      expect(mockOnClose).toHaveBeenCalled();
    });

    it('should not submit data when cancelled', async () => {
      const user = userEvent.setup();
      const createMock = vi.mocked(api.mealTemplateAPI.create);

      renderComponent();

      await user.type(screen.getByLabelText('Schedule Name'), 'Test');
      await user.click(screen.getByRole('button', { name: 'Cancel' }));

      expect(createMock).not.toHaveBeenCalled();
    });
  });
});
