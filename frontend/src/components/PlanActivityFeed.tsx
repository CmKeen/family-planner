import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { auditLogAPI } from '@/lib/api';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  History,
  PlusCircle,
  MinusCircle,
  RefreshCw,
  Lock,
  Unlock,
  MessageCircle,
  ThumbsUp,
  Calendar,
  Clock,
  User,
  ChevronDown,
  ChevronUp,
  Filter
} from 'lucide-react';

interface AuditLog {
  id: string;
  changeType: string;
  description: string;
  descriptionEn?: string;
  descriptionNl?: string;
  oldValue?: any;
  newValue?: any;
  createdAt: string;
  member?: {
    id: string;
    name: string;
    role: string;
  };
  meal?: {
    id: string;
    dayOfWeek: string;
    mealType: string;
  };
}

interface PlanActivityFeedProps {
  planId: string;
  limit?: number;
}

const changeTypeIcons: Record<string, any> = {
  PLAN_CREATED: Calendar,
  PLAN_STATUS_CHANGED: RefreshCw,
  MEAL_ADDED: PlusCircle,
  MEAL_REMOVED: MinusCircle,
  RECIPE_CHANGED: RefreshCw,
  PORTIONS_CHANGED: RefreshCw,
  MEAL_LOCKED: Lock,
  MEAL_UNLOCKED: Unlock,
  COMPONENT_ADDED: PlusCircle,
  COMPONENT_REMOVED: MinusCircle,
  COMPONENT_CHANGED: RefreshCw,
  COMMENT_ADDED: MessageCircle,
  COMMENT_EDITED: MessageCircle,
  COMMENT_DELETED: MessageCircle,
  VOTE_ADDED: ThumbsUp,
  VOTE_CHANGED: ThumbsUp,
  TEMPLATE_SWITCHED: Calendar,
  CUTOFF_CHANGED: Clock,
  ATTENDANCE_CHANGED: User
};

const changeTypeColors: Record<string, string> = {
  MEAL_ADDED: 'bg-green-100 text-green-700 border-green-200',
  MEAL_REMOVED: 'bg-red-100 text-red-700 border-red-200',
  RECIPE_CHANGED: 'bg-blue-100 text-blue-700 border-blue-200',
  MEAL_LOCKED: 'bg-orange-100 text-orange-700 border-orange-200',
  MEAL_UNLOCKED: 'bg-orange-100 text-orange-700 border-orange-200',
  COMMENT_ADDED: 'bg-purple-100 text-purple-700 border-purple-200',
  COMMENT_EDITED: 'bg-purple-100 text-purple-700 border-purple-200',
  COMMENT_DELETED: 'bg-purple-100 text-purple-700 border-purple-200',
  VOTE_ADDED: 'bg-pink-100 text-pink-700 border-pink-200',
  TEMPLATE_SWITCHED: 'bg-indigo-100 text-indigo-700 border-indigo-200'
};

export function PlanActivityFeed({ planId, limit = 50 }: PlanActivityFeedProps) {
  const { t, i18n } = useTranslation();
  const [showDetails, setShowDetails] = useState<Record<string, boolean>>({});
  const [filterMember, setFilterMember] = useState<string | null>(null);
  const [filterChangeType, setFilterChangeType] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  const { data: auditData, isLoading } = useQuery({
    queryKey: ['audit-log', planId, filterMember, filterChangeType],
    queryFn: async () => {
      const response = await auditLogAPI.getPlanAuditLog(planId, {
        memberId: filterMember || undefined,
        changeType: filterChangeType || undefined,
        limit
      });
      return response.data.data;
    }
  });

  const toggleDetails = (logId: string) => {
    setShowDetails((prev) => ({
      ...prev,
      [logId]: !prev[logId]
    }));
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    const diffWeeks = Math.floor(diffMs / 604800000);
    const diffMonths = Math.floor(diffMs / 2592000000);

    if (diffMins < 1) return t('activity.timeAgo.justNow');
    if (diffMins < 60) return t('activity.timeAgo.minutesAgo', { count: diffMins });
    if (diffHours < 24) return t('activity.timeAgo.hoursAgo', { count: diffHours });
    if (diffDays < 7) return t('activity.timeAgo.daysAgo', { count: diffDays });
    if (diffWeeks < 4) return t('activity.timeAgo.weeksAgo', { count: diffWeeks });
    return t('activity.timeAgo.monthsAgo', { count: diffMonths });
  };

  const getDescription = (log: AuditLog) => {
    // Use language-specific description if available
    if (i18n.language === 'en' && log.descriptionEn) return log.descriptionEn;
    if (i18n.language === 'nl' && log.descriptionNl) return log.descriptionNl;
    return log.description;
  };

  const Icon = (changeType: string) => changeTypeIcons[changeType] || History;
  const getColorClass = (changeType: string) =>
    changeTypeColors[changeType] || 'bg-gray-100 text-gray-700 border-gray-200';

  const logs = auditData?.logs || [];
  const uniqueMembers = Array.from(
    new Set(logs.filter((log: AuditLog) => log.member).map((log: AuditLog) => log.member!.id))
  ).map((id) => {
    const log = logs.find((l: AuditLog) => l.member?.id === id);
    return log?.member;
  }).filter(Boolean);

  if (isLoading) {
    return (
      <div className="text-center py-8">
        <p className="text-sm text-muted-foreground">{t('activity.loading')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <History className="h-5 w-5 text-primary" />
            <h3 className="font-semibold text-lg">{t('activity.title')}</h3>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            {t('activity.subtitle')}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowFilters(!showFilters)}
        >
          <Filter className="h-4 w-4 mr-2" />
          {t('activity.filterBy')}
        </Button>
      </div>

      {/* Filters */}
      {showFilters && (
        <Card className="p-4 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* Member Filter */}
            <div>
              <label className="text-sm font-medium mb-2 block">
                {t('activity.filterBy')} {t('family.membersList.name')}
              </label>
              <select
                value={filterMember || ''}
                onChange={(e) => setFilterMember(e.target.value || null)}
                className="w-full px-3 py-2 border rounded-md text-sm"
              >
                <option value="">{t('activity.allMembers')}</option>
                {uniqueMembers.map((member: any) => (
                  <option key={member.id} value={member.id}>
                    {member.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Change Type Filter */}
            <div>
              <label className="text-sm font-medium mb-2 block">
                {t('activity.filterBy')} {t('activity.changeTypes.RECIPE_CHANGED')}
              </label>
              <select
                value={filterChangeType || ''}
                onChange={(e) => setFilterChangeType(e.target.value || null)}
                className="w-full px-3 py-2 border rounded-md text-sm"
              >
                <option value="">{t('activity.allChanges')}</option>
                {Object.keys(changeTypeIcons).map((type) => (
                  <option key={type} value={type}>
                    {t(`activity.changeTypes.${type}`)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {(filterMember || filterChangeType) && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setFilterMember(null);
                setFilterChangeType(null);
              }}
            >
              {t('common.reset')}
            </Button>
          )}
        </Card>
      )}

      {/* Timeline */}
      {logs.length === 0 ? (
        <Card className="p-8">
          <p className="text-sm text-muted-foreground text-center">
            {t('activity.empty')}
          </p>
        </Card>
      ) : (
        <div className="relative space-y-3">
          {/* Timeline Line */}
          <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-border hidden md:block" />

          {logs.map((log: AuditLog) => {
            const IconComponent = Icon(log.changeType);
            const colorClass = getColorClass(log.changeType);
            const isExpanded = showDetails[log.id];

            return (
              <Card key={log.id} className="relative">
                <div className="p-4">
                  <div className="flex items-start gap-3">
                    {/* Icon */}
                    <div
                      className={`flex-shrink-0 h-12 w-12 rounded-full border-2 flex items-center justify-center ${colorClass} relative z-10`}
                    >
                      <IconComponent className="h-5 w-5" />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <p className="text-sm font-medium leading-snug">
                            {getDescription(log)}
                          </p>
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            <span className="text-xs text-muted-foreground">
                              {formatDate(log.createdAt)}
                            </span>
                            {log.member && (
                              <Badge variant="outline" className="text-xs">
                                {log.member.name}
                              </Badge>
                            )}
                            {log.meal && (
                              <Badge variant="secondary" className="text-xs">
                                {t(`days.${log.meal.dayOfWeek.toLowerCase()}`)} -{' '}
                                {t(`weeklyPlan.mealTypes.${log.meal.mealType.toLowerCase()}`)}
                              </Badge>
                            )}
                          </div>
                        </div>

                        {/* Expand Button */}
                        {(log.oldValue || log.newValue) && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleDetails(log.id)}
                            className="flex-shrink-0 h-8 w-8 p-0"
                          >
                            {isExpanded ? (
                              <ChevronUp className="h-4 w-4" />
                            ) : (
                              <ChevronDown className="h-4 w-4" />
                            )}
                          </Button>
                        )}
                      </div>

                      {/* Details */}
                      {isExpanded && (log.oldValue || log.newValue) && (
                        <div className="mt-3 p-3 bg-muted rounded-md text-xs space-y-2">
                          {log.oldValue && (
                            <div>
                              <span className="font-semibold">{t('activity.oldValue')}:</span>{' '}
                              <pre className="inline">{JSON.stringify(log.oldValue, null, 2)}</pre>
                            </div>
                          )}
                          {log.newValue && (
                            <div>
                              <span className="font-semibold">{t('activity.newValue')}:</span>{' '}
                              <pre className="inline">{JSON.stringify(log.newValue, null, 2)}</pre>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
