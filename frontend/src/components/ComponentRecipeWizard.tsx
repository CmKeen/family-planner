import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { recipeAPI, foodComponentAPI } from '@/lib/api';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import StepBasicInfo from './StepBasicInfo';
import StepSelectComponents from '@/components/StepSelectComponents';
import StepReview from './StepReview';
import SuccessScreen from './SuccessScreen';
import { ArrowLeft, ArrowRight } from 'lucide-react';

export interface ComponentSelection {
  componentId: string;
  componentName: string;
  quantity: number;
  unit: string;
  category?: string;
}

export interface RecipeFormData {
  name: string;
  nameEn?: string;
  nameNl?: string;
  description?: string;
  servings: number;
  mealTypes: string[];
  components: ComponentSelection[];
}

interface ComponentRecipeWizardProps {
  familyId: string;
  recipe?: any; // If provided, wizard is in edit mode
  onSuccess?: () => void;
}

export default function ComponentRecipeWizard({ familyId, recipe, onSuccess }: ComponentRecipeWizardProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const isEditMode = !!recipe;
  const [currentStep, setCurrentStep] = useState(1);

  // Track if we've initialized components (to avoid re-running useEffect)
  const [componentsInitialized, setComponentsInitialized] = useState(false);

  // Fetch all components to map ingredient names back to component IDs (for edit mode)
  const { data: componentsData } = useQuery({
    queryKey: ['components', familyId],
    queryFn: async () => {
      const response = await foodComponentAPI.getAll({ familyId });
      return response.data; // API returns array directly
    },
    enabled: isEditMode // Only fetch when in edit mode
  });

  // Initialize form data - pre-fill if editing
  const [formData, setFormData] = useState<RecipeFormData>(() => {
    if (recipe) {
      // Pre-fill form with existing recipe data
      return {
        name: recipe.title || '',
        nameEn: recipe.titleEn || '',
        description: recipe.description || '',
        servings: recipe.servings || 4,
        mealTypes: recipe.mealType || [],
        components: [] // Will be populated after components are loaded
      };
    }
    return {
      name: '',
      nameEn: '',
      description: '',
      servings: 4,
      mealTypes: [],
      components: []
    };
  });

  // Update components once they're loaded (for edit mode)
  useEffect(() => {
    if (isEditMode && recipe && componentsData && !componentsInitialized) {
      const mappedComponents = recipe.ingredients?.map((ing: any) => {
        // Find the component by matching name
        const component = componentsData.find((c: any) =>
          c.name.toLowerCase() === ing.name.toLowerCase()
        );

        return {
          componentId: component?.id || '', // Use component ID if found
          componentName: ing.name,
          quantity: ing.quantity,
          unit: ing.unit || component?.unit || 'g', // Use ingredient unit, fallback to component unit, then 'g'
          category: ing.category || component?.shoppingCategory
        };
      }) || [];

      setFormData(prev => ({ ...prev, components: mappedComponents }));
      setComponentsInitialized(true);
    }
  }, [isEditMode, recipe, componentsData, componentsInitialized]);

  const [createdRecipe, setCreatedRecipe] = useState<any>(null);

  const totalSteps = 3;
  const progressPercentage = (currentStep / totalSteps) * 100;

  // Create or update recipe mutation
  const saveRecipeMutation = useMutation({
    mutationFn: (data: RecipeFormData) => {
      const payload = {
        name: data.name,
        nameEn: data.nameEn,
        description: data.description,
        servings: data.servings,
        mealTypes: data.mealTypes,
        components: data.components.map(c => ({
          componentId: c.componentId,
          quantity: c.quantity,
          unit: c.unit
        }))
      };

      if (isEditMode && recipe) {
        // Update existing recipe
        return recipeAPI.updateComponentBased(recipe.id, payload);
      } else {
        // Create new recipe
        return recipeAPI.createComponentBased({
          ...payload,
          familyId
        });
      }
    },
    onSuccess: (response) => {
      const updatedRecipe = response.data.data.recipe;
      setCreatedRecipe(updatedRecipe);
      setCurrentStep(4); // Success screen
      queryClient.invalidateQueries({ queryKey: ['recipes'] });
      onSuccess?.();
    }
  });

  const handleNext = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    } else if (currentStep === totalSteps) {
      // Submit the form
      saveRecipeMutation.mutate(formData);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleReset = () => {
    setCurrentStep(1);
    setFormData({
      name: '',
      nameEn: '',
      nameNl: '',
      description: '',
      servings: 4,
      mealTypes: [],
      components: []
    });
    setCreatedRecipe(null);
  };

  const updateFormData = (updates: Partial<RecipeFormData>) => {
    setFormData(prev => ({ ...prev, ...updates }));
  };

  // Validation for each step
  const canProceed = (): boolean => {
    switch (currentStep) {
      case 1:
        return formData.name.trim().length > 0 && formData.mealTypes.length > 0;
      case 2:
        return formData.components.length > 0;
      case 3:
        return true;
      default:
        return false;
    }
  };

  // Show success screen
  if (currentStep === 4 && createdRecipe) {
    return <SuccessScreen recipe={createdRecipe} onCreateAnother={handleReset} />;
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Progress Bar */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-2">
          <h2 className="text-xl font-bold">
            {isEditMode ? t('recipes.edit.title') : t('recipes.create.title')}
          </h2>
          <span className="text-sm text-muted-foreground">
            {t('recipes.create.steps.step')} {currentStep} {t('recipes.create.steps.of')} {totalSteps}
          </span>
        </div>
        <Progress value={progressPercentage} className="h-2" />
        <div className="flex justify-between mt-2 text-sm">
          <span className={currentStep === 1 ? 'text-primary font-medium' : 'text-muted-foreground'}>
            {t('recipes.create.steps.basicInfo')}
          </span>
          <span className={currentStep === 2 ? 'text-primary font-medium' : 'text-muted-foreground'}>
            {t('recipes.create.steps.components')}
          </span>
          <span className={currentStep === 3 ? 'text-primary font-medium' : 'text-muted-foreground'}>
            {t('recipes.create.steps.review')}
          </span>
        </div>
      </div>

      {/* Step Content */}
      <Card className="p-6 mb-6">
        {currentStep === 1 && (
          <StepBasicInfo formData={formData} updateFormData={updateFormData} />
        )}
        {currentStep === 2 && (
          <StepSelectComponents
            familyId={familyId}
            formData={formData}
            updateFormData={updateFormData}
          />
        )}
        {currentStep === 3 && (
          <StepReview formData={formData} />
        )}
      </Card>

      {/* Navigation Buttons */}
      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={handlePrevious}
          disabled={currentStep === 1}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          {t('common.previous')}
        </Button>
        <Button
          onClick={handleNext}
          disabled={!canProceed() || saveRecipeMutation.isPending}
        >
          {currentStep === totalSteps ? (
            <>
              {saveRecipeMutation.isPending ? t('common.saving') : (isEditMode ? t('recipes.edit.updateRecipe') : t('recipes.create.saveRecipe'))}
            </>
          ) : (
            <>
              {t('recipes.create.nextStep')}
              <ArrowRight className="h-4 w-4 ml-2" />
            </>
          )}
        </Button>
      </div>

      {/* Error Display */}
      {saveRecipeMutation.isError && (
        <div className="mt-4 p-4 bg-destructive/10 border border-destructive rounded-md">
          <p className="text-sm text-destructive">
            {t('common.error')}: {(saveRecipeMutation.error as any)?.response?.data?.message || t('common.errorOccurred')}
          </p>
        </div>
      )}
    </div>
  );
}
