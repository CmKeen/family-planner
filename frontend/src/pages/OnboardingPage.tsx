import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { familyAPI } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';

export default function OnboardingPage() {
  const { t } = useTranslation();
  const [familyName, setFamilyName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      await familyAPI.create({ name: familyName });
      navigate('/');
    } catch (error) {
      console.error('Error creating family:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-emerald-100 p-4">
      <div className="absolute top-4 right-4">
        <LanguageSwitcher />
      </div>
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>{t('onboarding.welcome')}</CardTitle>
          <CardDescription>{t('onboarding.setupFamily')}</CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="familyName">{t('onboarding.familyName')}</Label>
              <Input
                id="familyName"
                placeholder={t('onboarding.familyNamePlaceholder')}
                value={familyName}
                onChange={(e) => setFamilyName(e.target.value)}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? t('onboarding.creating') : t('onboarding.continue')}
            </Button>
          </CardContent>
        </form>
      </Card>
    </div>
  );
}
