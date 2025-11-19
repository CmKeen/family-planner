import { useTranslation } from 'react-i18next';
import { RecipeFormData } from './ComponentRecipeWizard';
import { Card } from './ui/card';
import { Badge } from './ui/badge';

interface StepReviewProps {
  formData: RecipeFormData;
}

export default function StepReview({ formData }: StepReviewProps) {
  const { t } = useTranslation();

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2">{t('recipes.create.steps.review')}</h3>
        <p className="text-sm text-muted-foreground">
          {t('recipes.create.reviewHelp')}
        </p>
      </div>

      {/* Recipe Name */}
      <Card className="p-4">
        <h4 className="font-semibold mb-3">{t('recipes.create.form.nameLabel')}</h4>
        <p className="font-medium">{formData.name}</p>
        {formData.nameEn && <p className="text-sm text-muted-foreground mt-1">EN: {formData.nameEn}</p>}
        {formData.nameNl && <p className="text-sm text-muted-foreground mt-1">NL: {formData.nameNl}</p>}
      </Card>

      {/* Description */}
      {formData.description && (
        <Card className="p-4">
          <h4 className="font-semibold mb-2">{t('recipes.create.form.descriptionLabel')}</h4>
          <p className="text-sm">{formData.description}</p>
        </Card>
      )}

      {/* Servings & Meal Types */}
      <Card className="p-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <h4 className="font-semibold mb-2">{t('recipes.create.form.servingsLabel')}</h4>
            <p>{formData.servings}</p>
          </div>
          <div>
            <h4 className="font-semibold mb-2">{t('recipes.create.form.mealTypesLabel')}</h4>
            <div className="flex flex-wrap gap-1">
              {formData.mealTypes.map(mt => (
                <Badge key={mt} variant="secondary">
                  {t(`weeklyPlan.mealTypes.${mt.toLowerCase()}`)}
                </Badge>
              ))}
            </div>
          </div>
        </div>
      </Card>

      {/* Components */}
      <Card className="p-4">
        <h4 className="font-semibold mb-3">{t('recipes.create.selectedComponents')} ({formData.components.length})</h4>
        <ul className="space-y-2">
          {formData.components.map(comp => (
            <li key={comp.componentId} className="flex justify-between items-center">
              <span>{comp.componentName}</span>
              <span className="text-sm text-muted-foreground">
                {comp.quantity} {comp.unit}
              </span>
            </li>
          ))}
        </ul>
      </Card>

      {/* Info */}
      <div className="p-4 bg-muted rounded-lg text-sm text-muted-foreground">
        <p>{t('recipes.create.form.autoTimingInfo')}</p>
      </div>
    </div>
  );
}
