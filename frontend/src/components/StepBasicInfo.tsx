import { useTranslation } from 'react-i18next';
import { RecipeFormData } from './ComponentRecipeWizard';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Checkbox } from './ui/checkbox';

interface StepBasicInfoProps {
  formData: RecipeFormData;
  updateFormData: (updates: Partial<RecipeFormData>) => void;
}

const MEAL_TYPES = ['BREAKFAST', 'LUNCH', 'DINNER', 'SNACK'];

export default function StepBasicInfo({ formData, updateFormData }: StepBasicInfoProps) {
  const { t } = useTranslation();

  const handleMealTypeToggle = (mealType: string) => {
    const newMealTypes = formData.mealTypes.includes(mealType)
      ? formData.mealTypes.filter(mt => mt !== mealType)
      : [...formData.mealTypes, mealType];
    updateFormData({ mealTypes: newMealTypes });
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-4">{t('recipes.create.steps.basicInfo')}</h3>
        <p className="text-sm text-muted-foreground mb-6">
          {t('recipes.create.form.nameHelp')}
        </p>
      </div>

      {/* Recipe Name (French - required) */}
      <div className="space-y-2">
        <Label htmlFor="name" className="required">
          {t('recipes.create.form.nameLabel')} (Français)
        </Label>
        <Input
          id="name"
          value={formData.name}
          onChange={(e) => updateFormData({ name: e.target.value })}
          placeholder={t('recipes.create.form.namePlaceholder')}
          required
        />
      </div>

      {/* Recipe Name (English - optional) */}
      <div className="space-y-2">
        <Label htmlFor="nameEn">
          {t('recipes.create.form.nameLabel')} (English)
        </Label>
        <Input
          id="nameEn"
          value={formData.nameEn || ''}
          onChange={(e) => updateFormData({ nameEn: e.target.value })}
          placeholder={t('recipes.create.form.namePlaceholderEn')}
        />
      </div>

      {/* Recipe Name (Dutch - optional) */}
      <div className="space-y-2">
        <Label htmlFor="nameNl">
          {t('recipes.create.form.nameLabel')} (Nederlands)
        </Label>
        <Input
          id="nameNl"
          value={formData.nameNl || ''}
          onChange={(e) => updateFormData({ nameNl: e.target.value })}
          placeholder={t('recipes.create.form.namePlaceholderNl')}
        />
      </div>

      {/* Description */}
      <div className="space-y-2">
        <Label htmlFor="description">
          {t('recipes.create.form.descriptionLabel')}
        </Label>
        <Textarea
          id="description"
          value={formData.description || ''}
          onChange={(e) => updateFormData({ description: e.target.value })}
          placeholder={t('recipes.create.form.descriptionPlaceholder')}
          rows={3}
          maxLength={500}
        />
        <p className="text-xs text-muted-foreground text-right">
          {formData.description?.length || 0} / 500
        </p>
      </div>

      {/* Servings */}
      <div className="space-y-2">
        <Label htmlFor="servings">
          {t('recipes.create.form.servingsLabel')}
        </Label>
        <Input
          id="servings"
          type="number"
          min="1"
          max="12"
          value={formData.servings}
          onChange={(e) => updateFormData({ servings: parseInt(e.target.value) || 4 })}
        />
      </div>

      {/* Meal Types */}
      <div className="space-y-3">
        <Label className="required">{t('recipes.create.form.mealTypesLabel')}</Label>
        <div className="grid grid-cols-2 gap-3">
          {MEAL_TYPES.map(mealType => (
            <div key={mealType} className="flex items-center space-x-2">
              <Checkbox
                id={`meal-${mealType}`}
                checked={formData.mealTypes.includes(mealType)}
                onCheckedChange={() => handleMealTypeToggle(mealType)}
              />
              <Label
                htmlFor={`meal-${mealType}`}
                className="text-sm font-normal cursor-pointer"
              >
                {t(`weeklyPlan.mealTypes.${mealType.toLowerCase()}`)}
              </Label>
            </div>
          ))}
        </div>
        {formData.mealTypes.length === 0 && (
          <p className="text-xs text-destructive">{t('recipes.create.validation.mealTypesRequired')}</p>
        )}
      </div>

      {/* Info box */}
      <div className="p-4 bg-muted rounded-lg">
        <p className="text-sm text-muted-foreground">
          {t('recipes.create.form.autoTimingInfo')}
        </p>
      </div>
    </div>
  );
}
