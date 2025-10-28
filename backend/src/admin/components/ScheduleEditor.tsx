import React, { useState, useEffect } from 'react';
import { Box, Button, FormGroup, Label, CheckBox, Text } from '@adminjs/design-system';
import { EditPropertyProps } from 'adminjs';

const DAYS_OF_WEEK = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'];
const MEAL_TYPES = ['BREAKFAST', 'LUNCH', 'DINNER', 'SNACK'];

const ScheduleEditor: React.FC<EditPropertyProps> = (props) => {
  const { property, record, onChange } = props;
  const rawValue = record.params[property.path] || '[]';

  const [schedule, setSchedule] = useState<Array<{ dayOfWeek: string; mealTypes: string[] }>>(() => {
    try {
      return JSON.parse(rawValue);
    } catch {
      return [];
    }
  });

  useEffect(() => {
    onChange(property.path, JSON.stringify(schedule, null, 2));
  }, [schedule, property.path, onChange]);

  const toggleMeal = (day: string, mealType: string) => {
    setSchedule((prev) => {
      const dayEntry = prev.find((entry) => entry.dayOfWeek === day);

      if (!dayEntry) {
        // Day doesn't exist, add it with this meal type
        return [...prev, { dayOfWeek: day, mealTypes: [mealType] }].sort(
          (a, b) => DAYS_OF_WEEK.indexOf(a.dayOfWeek) - DAYS_OF_WEEK.indexOf(b.dayOfWeek)
        );
      }

      const mealIndex = dayEntry.mealTypes.indexOf(mealType);

      if (mealIndex === -1) {
        // Meal type doesn't exist, add it
        return prev.map((entry) =>
          entry.dayOfWeek === day
            ? { ...entry, mealTypes: [...entry.mealTypes, mealType] }
            : entry
        );
      } else {
        // Meal type exists, remove it
        const newMealTypes = dayEntry.mealTypes.filter((m) => m !== mealType);

        if (newMealTypes.length === 0) {
          // No meal types left, remove the entire day
          return prev.filter((entry) => entry.dayOfWeek !== day);
        }

        return prev.map((entry) =>
          entry.dayOfWeek === day ? { ...entry, mealTypes: newMealTypes } : entry
        );
      }
    });
  };

  const isMealChecked = (day: string, mealType: string) => {
    const dayEntry = schedule.find((entry) => entry.dayOfWeek === day);
    return dayEntry ? dayEntry.mealTypes.includes(mealType) : false;
  };

  const selectAllDay = (day: string) => {
    setSchedule((prev) => {
      const filtered = prev.filter((entry) => entry.dayOfWeek !== day);
      return [...filtered, { dayOfWeek: day, mealTypes: [...MEAL_TYPES] }].sort(
        (a, b) => DAYS_OF_WEEK.indexOf(a.dayOfWeek) - DAYS_OF_WEEK.indexOf(b.dayOfWeek)
      );
    });
  };

  const clearDay = (day: string) => {
    setSchedule((prev) => prev.filter((entry) => entry.dayOfWeek !== day));
  };

  const isDayFullySelected = (day: string) => {
    const dayEntry = schedule.find((entry) => entry.dayOfWeek === day);
    return dayEntry && dayEntry.mealTypes.length === MEAL_TYPES.length;
  };

  return (
    <Box>
      <Label style={{ marginBottom: '16px', fontSize: '16px', fontWeight: 'bold' }}>
        Meal Schedule
      </Label>
      <Box
        style={{
          border: '1px solid #e0e0e0',
          borderRadius: '8px',
          padding: '20px',
          backgroundColor: '#fafafa',
        }}
      >
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #ddd' }}>
              <th style={{ padding: '12px', textAlign: 'left', fontWeight: 'bold' }}>Day</th>
              {MEAL_TYPES.map((mealType) => (
                <th key={mealType} style={{ padding: '12px', textAlign: 'center', fontWeight: 'bold' }}>
                  {mealType.charAt(0) + mealType.slice(1).toLowerCase()}
                </th>
              ))}
              <th style={{ padding: '12px', textAlign: 'center' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {DAYS_OF_WEEK.map((day) => (
              <tr key={day} style={{ borderBottom: '1px solid #eee' }}>
                <td style={{ padding: '12px', fontWeight: '500' }}>
                  {day.charAt(0) + day.slice(1).toLowerCase()}
                </td>
                {MEAL_TYPES.map((mealType) => (
                  <td key={mealType} style={{ padding: '12px', textAlign: 'center' }}>
                    <CheckBox
                      checked={isMealChecked(day, mealType)}
                      onChange={() => toggleMeal(day, mealType)}
                    />
                  </td>
                ))}
                <td style={{ padding: '12px', textAlign: 'center' }}>
                  {isDayFullySelected(day) ? (
                    <Button
                      size="sm"
                      variant="text"
                      onClick={() => clearDay(day)}
                      style={{ fontSize: '12px' }}
                    >
                      Clear
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant="text"
                      onClick={() => selectAllDay(day)}
                      style={{ fontSize: '12px' }}
                    >
                      Select All
                    </Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <Box style={{ marginTop: '20px', padding: '12px', backgroundColor: '#f0f0f0', borderRadius: '4px' }}>
          <Text style={{ fontSize: '12px', color: '#666' }}>
            <strong>Total meals:</strong> {schedule.reduce((sum, day) => sum + day.mealTypes.length, 0)}
          </Text>
        </Box>
      </Box>
    </Box>
  );
};

export default ScheduleEditor;
