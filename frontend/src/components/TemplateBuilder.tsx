import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { mealTemplateAPI } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Check } from 'lucide-react';

const DAYS = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'];
const MEAL_TYPES = ['BREAKFAST', 'LUNCH', 'DINNER', 'SNACK'];

interface TemplateBuilderProps {
  familyId: string;
  template?: any;
  onClose: () => void;
}

interface ScheduleItem {
  dayOfWeek: string;
  mealTypes: string[];
}

export default function TemplateBuilder({ familyId, template, onClose }: TemplateBuilderProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [schedule, setSchedule] = useState<ScheduleItem[]>([]);

  // Initialize form with template data if editing
   
  useEffect(() => {
    if (template) {
      setName(template.name || '');
      setDescription(template.description || '');
      setSchedule(template.schedule || []);
    } else {
      // Initialize empty schedule
      setName('');
      setDescription('');
      setSchedule([]);
    }
  }, [template]);

  const createMutation = useMutation({
    mutationFn: (data: any) => mealTemplateAPI.create(familyId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mealTemplates'] });
      toast({
        title: t('mealTemplates.builder.success'),
        variant: 'default'
      });
      onClose();
    },
    onError: () => {
      toast({
        title: t('mealTemplates.builder.error'),
        variant: 'destructive'
      });
    }
  });

  const updateMutation = useMutation({
    mutationFn: (data: any) => mealTemplateAPI.update(familyId, template.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mealTemplates'] });
      toast({
        title: t('mealTemplates.builder.updateSuccess'),
        variant: 'default'
      });
      onClose();
    },
    onError: () => {
      toast({
        title: t('mealTemplates.builder.error'),
        variant: 'destructive'
      });
    }
  });

  const toggleMealType = (day: string, mealType: string) => {
    setSchedule(prev => {
      const daySchedule = prev.find(s => s.dayOfWeek === day);

      if (!daySchedule) {
        // Add new day with this meal type
        return [...prev, { dayOfWeek: day, mealTypes: [mealType] }];
      }

      const hasMealType = daySchedule.mealTypes.includes(mealType);

      if (hasMealType) {
        // Remove meal type
        const newMealTypes = daySchedule.mealTypes.filter(mt => mt !== mealType);
        if (newMealTypes.length === 0) {
          // Remove entire day if no meal types left
          return prev.filter(s => s.dayOfWeek !== day);
        }
        // Update day with new meal types
        return prev.map(s =>
          s.dayOfWeek === day ? { ...s, mealTypes: newMealTypes } : s
        );
      } else {
        // Add meal type
        return prev.map(s =>
          s.dayOfWeek === day ? { ...s, mealTypes: [...s.mealTypes, mealType] } : s
        );
      }
    });
  };

  const isMealTypeSelected = (day: string, mealType: string) => {
    const daySchedule = schedule.find(s => s.dayOfWeek === day);
    return daySchedule?.mealTypes.includes(mealType) || false;
  };

  const getTotalMeals = () => {
    return schedule.reduce((total, day) => total + day.mealTypes.length, 0);
  };

  const handleSubmit = () => {
    if (!name.trim()) {
      toast({
        title: t('mealTemplates.builder.error') + ': Name is required',
        variant: 'destructive'
      });
      return;
    }

    if (schedule.length === 0) {
      toast({
        title: t('mealTemplates.builder.error') + ': Please select at least one meal',
        variant: 'destructive'
      });
      return;
    }

    const data = {
      name: name.trim(),
      description: description.trim() || undefined,
      schedule
    };

    if (template) {
      updateMutation.mutate(data);
    } else {
      createMutation.mutate(data);
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t('mealTemplates.builder.title')}</DialogTitle>
          <DialogDescription>
            {template ? 'Edit your custom meal schedule' : 'Create a custom meal schedule for your family'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Step 1: Schedule Details */}
          <div className="space-y-4">
            <h3 className="font-semibold text-sm text-gray-700">{t('mealTemplates.builder.step1')}</h3>
            <div>
              <Label htmlFor="name">{t('mealTemplates.builder.nameLabel')}</Label>
              <Input
                id="name"
                placeholder={t('mealTemplates.builder.namePlaceholder')}
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="description">{t('mealTemplates.builder.descriptionLabel')}</Label>
              <Input
                id="description"
                placeholder={t('mealTemplates.builder.descriptionPlaceholder')}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="mt-1"
              />
            </div>
          </div>

          {/* Step 2: Select Meals */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-sm text-gray-700">{t('mealTemplates.builder.step2')}</h3>
              <Badge variant="secondary">
                {t('mealTemplates.builder.preview', { count: getTotalMeals() })}
              </Badge>
            </div>
            <p className="text-sm text-gray-600">{t('mealTemplates.builder.selectMeals')}</p>

            {/* Visual Grid */}
            <div className="border rounded-lg overflow-hidden">
              {/* Header Row */}
              <div className="grid grid-cols-5 bg-gray-50 border-b">
                <div className="p-3 font-semibold text-sm text-gray-700">Day</div>
                {MEAL_TYPES.map(mealType => (
                  <div key={mealType} className="p-3 font-semibold text-sm text-gray-700 text-center border-l">
                    {t(`weeklyPlan.mealTypes.${mealType.toLowerCase()}`)}
                  </div>
                ))}
              </div>

              {/* Day Rows */}
              {DAYS.map(day => (
                <div key={day} className="grid grid-cols-5 border-b last:border-b-0 hover:bg-gray-50">
                  <div className="p-3 font-medium text-sm">
                    {t(`days.${day.toLowerCase()}`)}
                  </div>
                  {MEAL_TYPES.map(mealType => {
                    const isSelected = isMealTypeSelected(day, mealType);
                    return (
                      <div key={mealType} className="p-3 flex items-center justify-center border-l">
                        <button
                          type="button"
                          onClick={() => toggleMealType(day, mealType)}
                          className={`w-10 h-10 rounded-md border-2 flex items-center justify-center transition-all ${
                            isSelected
                              ? 'bg-orange-500 border-orange-500 text-white'
                              : 'border-gray-300 hover:border-orange-300 hover:bg-orange-50'
                          }`}
                        >
                          {isSelected && <Check className="h-5 w-5" />}
                        </button>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isPending}>
            {t('mealTemplates.builder.cancel')}
          </Button>
          <Button onClick={handleSubmit} disabled={isPending}>
            {isPending ? t('mealTemplates.builder.saving') : t('mealTemplates.builder.save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
