import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { familyAPI, weeklyPlanAPI } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Utensils, Plus, Calendar, ShoppingCart, LogOut, Settings } from 'lucide-react';
import { getMonday, formatDate } from '@/lib/utils';

export default function DashboardPage() {
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const navigate = useNavigate();
  const [selectedFamily, setSelectedFamily] = useState<string | null>(null);

  const { data: families, isLoading: loadingFamilies } = useQuery({
    queryKey: ['families'],
    queryFn: async () => {
      const response = await familyAPI.getAll();
      return response.data.data.families;
    }
  });

  const { data: plans, isLoading: loadingPlans } = useQuery({
    queryKey: ['weeklyPlans', selectedFamily],
    queryFn: async () => {
      if (!selectedFamily) return [];
      const response = await weeklyPlanAPI.getByFamily(selectedFamily);
      return response.data.data.plans;
    },
    enabled: !!selectedFamily
  });

  useEffect(() => {
    if (families && families.length > 0 && !selectedFamily) {
      setSelectedFamily(families[0].id);
    }
  }, [families, selectedFamily]);

  useEffect(() => {
    if (families && families.length === 0) {
      navigate('/onboarding');
    }
  }, [families, navigate]);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const handleCreatePlan = async () => {
    if (!selectedFamily) return;

    try {
      const weekStart = getMonday(new Date());
      const response = await weeklyPlanAPI.generateAuto(selectedFamily, {
        weekStartDate: weekStart.toISOString()
      });
      const newPlan = response.data.data.plan;
      navigate(`/plan/${newPlan.id}`);
    } catch (error) {
      console.error('Error creating plan:', error);
    }
  };

  if (loadingFamilies) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header - Mobile Optimized */}
      <header className="bg-white dark:bg-gray-800 border-b sticky top-0 z-10 safe-top">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="h-10 w-10 bg-primary rounded-xl flex items-center justify-center">
                <Utensils className="h-6 w-6 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-lg font-bold">Family Planner</h1>
                <p className="text-xs text-muted-foreground">Welcome, {user?.firstName}</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Button variant="ghost" size="icon" onClick={handleLogout}>
                <LogOut className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6 pb-safe">
        {/* Quick Actions - Mobile First */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <Button
            onClick={handleCreatePlan}
            className="h-24 flex-col space-y-2"
            size="lg"
          >
            <Plus className="h-6 w-6" />
            <span className="text-sm">New Plan</span>
          </Button>
          <Button
            variant="outline"
            className="h-24 flex-col space-y-2"
            size="lg"
            onClick={() => navigate('/recipes')}
          >
            <Utensils className="h-6 w-6" />
            <span className="text-sm">Recipes</span>
          </Button>
        </div>

        {/* Recent Plans */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Your Plans</h2>
            {families && families.length > 1 && (
              <select
                value={selectedFamily || ''}
                onChange={(e) => setSelectedFamily(e.target.value)}
                className="border rounded-md px-3 py-1 text-sm"
              >
                {families.map((family: any) => (
                  <option key={family.id} value={family.id}>
                    {family.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          {loadingPlans ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            </div>
          ) : plans && plans.length > 0 ? (
            <div className="grid gap-4">
              {plans.map((plan: any) => (
                <Card key={plan.id} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg">
                          Week {plan.weekNumber}, {new Date(plan.weekStartDate).getFullYear()}
                        </CardTitle>
                        <CardDescription>
                          {formatDate(plan.weekStartDate)}
                        </CardDescription>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        plan.status === 'VALIDATED'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {plan.status}
                      </span>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="text-sm text-muted-foreground">
                      {plan.meals?.length || 0} meals planned
                    </div>
                    <div className="flex gap-2">
                      <Button
                        asChild
                        size="sm"
                        className="flex-1"
                      >
                        <Link to={`/plan/${plan.id}`}>
                          <Calendar className="h-4 w-4 mr-2" />
                          View Plan
                        </Link>
                      </Button>
                      {plan.status === 'VALIDATED' && (
                        <Button
                          asChild
                          variant="outline"
                          size="sm"
                          className="flex-1"
                        >
                          <Link to={`/shopping/${plan.id}`}>
                            <ShoppingCart className="h-4 w-4 mr-2" />
                            Shopping
                          </Link>
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No plans yet</h3>
                <p className="text-muted-foreground mb-4">
                  Create your first weekly meal plan
                </p>
                <Button onClick={handleCreatePlan}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Plan
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
}
