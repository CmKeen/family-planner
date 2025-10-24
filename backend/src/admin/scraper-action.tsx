import React from 'react';
import { Box, H2, H5, Text, Button } from '@adminjs/design-system';

const Dashboard: React.FC = () => {
  const handleOpenScraper = () => {
    window.open('/api/admin/scraper-form', '_blank');
  };

  return (
    <Box variant="grey">
      <Box variant="white" boxShadow="card" marginBottom="xxl">
        <Box padding="x3" borderBottom="default">
          <H2>Welcome to Family Planner Admin</H2>
        </Box>
        <Box padding="x3">
          <Text marginBottom="xl">
            Manage your family planning application from this admin panel.
          </Text>

          <Box marginTop="xl" padding="xl" bg="primary100" borderRadius="default">
            <H5 marginBottom="default">🥘 Recipe Scraper</H5>
            <Text marginBottom="lg">
              Quickly add recipes from HelloFresh to your database
            </Text>
            <Button
              onClick={handleOpenScraper}
              variant="primary"
              size="lg"
            >
              Open Recipe Scraper
            </Button>
          </Box>

          <Box marginTop="xl">
            <H5 marginBottom="default">Quick Stats</H5>
            <Text color="grey60">
              Use the sidebar to navigate to different sections and manage your data.
            </Text>
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

export default Dashboard;
