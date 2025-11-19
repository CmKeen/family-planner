import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { CheckCircle } from 'lucide-react';

interface SuccessScreenProps {
  recipe: any;
  onCreateAnother: () => void;
}

export default function SuccessScreen({ recipe, onCreateAnother }: SuccessScreenProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <div className="max-w-2xl mx-auto text-center space-y-6">
      {/* Success Icon */}
      <div className="flex justify-center">
        <div className="rounded-full bg-green-100 dark:bg-green-900 p-6">
          <CheckCircle className="h-16 w-16 text-green-600 dark:text-green-400" />
        </div>
      </div>

      {/* Success Message */}
      <div>
        <h2 className="text-2xl font-bold mb-2">{t('recipes.create.success.title')}</h2>
        <p className="text-muted-foreground">
          <span className="font-medium">{recipe.title}</span> {t('recipes.create.success.saved')}
        </p>
      </div>

      {/* Recipe Info Card */}
      <Card className="p-6 text-left">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-muted-foreground">{t('recipes.detail.servings')}</p>
            <p className="font-medium">{recipe.servings}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">{t('recipes.detail.time')}</p>
            <p className="font-medium">{recipe.totalTime} min</p>
          </div>
          <div className="col-span-2">
            <p className="text-sm text-muted-foreground">{t('recipes.create.selectedComponents')}</p>
            <p className="font-medium">{recipe.ingredients?.length || 0}</p>
          </div>
        </div>
      </Card>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <Button onClick={() => navigate('/recipes')} variant="outline">
          {t('recipes.create.success.backToBrowse')}
        </Button>
        <Button onClick={onCreateAnother}>
          {t('recipes.create.success.createAnother')}
        </Button>
      </div>
    </div>
  );
}
