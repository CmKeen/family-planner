import React from 'react';
import { Box, H2, H5, Text, Button, Icon } from '@adminjs/design-system';

const Dashboard: React.FC = () => {
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
              as="a"
              href="/api/admin/scraper-form"
              target="_blank"
              variant="primary"
              size="lg"
            >
              <Icon icon="Plus" />
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
