import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import ShoppingListView from '@/components/ShoppingListView';

export default function ShoppingListPage() {
  const { t } = useTranslation();
  const { planId } = useParams<{ planId: string }>();
  const navigate = useNavigate();

  const handleBack = () => {
    navigate(`/plan/${planId}`);
  };

  if (!planId) {
    return (
      <div className="container mx-auto p-4">
        <p className="text-center text-muted-foreground">{t('common.error')}</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 pb-20">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6 print:hidden">
        <Button variant="ghost" size="sm" onClick={handleBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          {t('shoppingList.actions.back')}
        </Button>
        <div className="flex-1"></div>
        <LanguageSwitcher />
      </div>

      {/* Shopping List Content */}
      <ShoppingListView planId={planId} showPrintButton={true} />
    </div>
  );
}
