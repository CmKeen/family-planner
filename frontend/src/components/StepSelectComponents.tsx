import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { RecipeFormData, ComponentSelection } from './ComponentRecipeWizard';
import { foodComponentAPI } from '@/lib/api';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { X, Plus } from 'lucide-react';

interface StepSelectComponentsProps {
  familyId: string;
  formData: RecipeFormData;
  updateFormData: (updates: Partial<RecipeFormData>) => void;
}

interface FoodComponent {
  id: string;
  name: string;
  category: string;
  baseUnit: string;
}

export default function StepSelectComponents({ familyId, formData, updateFormData }: StepSelectComponentsProps) {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch food components
  const { data: componentsData, isLoading } = useQuery({
    queryKey: ['foodComponents', familyId],
    queryFn: async () => {
      const response = await foodComponentAPI.getAll({ familyId });
      return response.data as FoodComponent[];
    }
  });

  const availableComponents = componentsData || [];
  const filteredComponents = availableComponents.filter(c =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAddComponent = (component: FoodComponent) => {
    if (!formData.components.find(c => c.componentId === component.id)) {
      const newComp: ComponentSelection = {
        componentId: component.id,
        componentName: component.name,
        quantity: 1,
        unit: component.baseUnit,
        category: component.category
      };
      updateFormData({ components: [...formData.components, newComp] });
    }
  };

  const handleRemoveComponent = (componentId: string) => {
    updateFormData({
      components: formData.components.filter(c => c.componentId !== componentId)
    });
  };

  const handleUpdateQuantity = (componentId: string, quantity: number) => {
    updateFormData({
      components: formData.components.map(c =>
        c.componentId === componentId ? { ...c, quantity } : c
      )
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2">{t('recipes.create.steps.components')}</h3>
        <p className="text-sm text-muted-foreground">
          {t('recipes.create.selectedComponents')}: {formData.components.length}
        </p>
      </div>

      {/* Selected Components */}
      {formData.components.length > 0 ? (
        <div className="space-y-2">
          <Label>{t('recipes.create.selectedComponents')}</Label>
          {formData.components.map(comp => (
            <Card key={comp.componentId} className="p-3">
              <div className="flex items-center justify-between gap-3">
                <div className="flex-1">
                  <p className="font-medium">{comp.componentName}</p>
                  {comp.category && (
                    <Badge variant="outline" className="mt-1">{comp.category}</Badge>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min="0.1"
                    step="0.1"
                    value={comp.quantity}
                    onChange={(e) => handleUpdateQuantity(comp.componentId, parseFloat(e.target.value))}
                    className="w-20"
                  />
                  <span className="text-sm text-muted-foreground min-w-[60px]">{comp.unit}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveComponent(comp.componentId)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-8 bg-muted rounded-lg">
          <p className="text-muted-foreground">{t('recipes.create.noComponentsYet')}</p>
          <p className="text-sm text-muted-foreground mt-1">{t('recipes.create.clickAddBelow')}</p>
        </div>
      )}

      {/* Search & Add */}
      <div className="space-y-3">
        <Label>{t('recipes.create.suggestedComponents')}</Label>
        <Input
          placeholder={t('common.search')}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        <div className="max-h-64 overflow-y-auto space-y-2">
          {isLoading ? (
            <p className="text-sm text-muted-foreground">{t('common.loading')}</p>
          ) : filteredComponents.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t('recipes.create.noComponentsFound')}</p>
          ) : (
            filteredComponents.slice(0, 10).map(component => (
              <Card
                key={component.id}
                className="p-3 cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => handleAddComponent(component)}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{component.name}</p>
                    <p className="text-xs text-muted-foreground">{component.category}</p>
                  </div>
                  <Button variant="ghost" size="sm">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </Card>
            ))
          )}
        </div>
      </div>

      {formData.components.length === 0 && (
        <p className="text-xs text-destructive">{t('recipes.create.validation.componentsRequired')}</p>
      )}
    </div>
  );
}
