#!/usr/bin/env node

/**
 * Assign Linear project milestones to issues
 *
 * Usage:
 *   node scripts/assign-milestone.js <issue-id> <milestone-name>
 *   node scripts/assign-milestone.js OBU-13 MVP
 *   node scripts/assign-milestone.js OBU-8 1.1
 *
 * This script reads the Linear API key from .linear-api-key file
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

// Configuration
const PROJECT_ID = '80e2d151-e5db-4ee9-bec5-e04e1e93e268'; // Family Planner project
const API_KEY_FILE = path.join(__dirname, '..', '.linear-api-key');

// Milestone name to ID mapping (cached after first query)
const MILESTONE_CACHE = {
  'MVP': '7b32d8d1-d077-4de0-b4af-a899ffeab98b',
  '1.1': '5dd1d0d6-00ae-497d-93f5-503e07cfdd3c'
};

// Issue identifier to UUID mapping (will be populated on demand)
const ISSUE_UUID_MAP = {
  'OBU-5': 'c5522a44-b348-4392-8435-d8a8d71ac623',
  'OBU-6': 'e237a509-8aa5-47e3-802f-872319cc241a',
  'OBU-7': '26b9b14f-d501-470d-b718-f416034b78b6',
  'OBU-8': '8198ad3f-0276-49f1-9a7e-e7e219277239',
  'OBU-9': 'd681ff1e-9ef4-48cf-ac07-822c4c2d0885',
  'OBU-10': '0418724f-9ae9-4c83-8865-60deca1d9d30',
  'OBU-11': '1a2e61f0-8971-4ae4-8f8d-b3dddd79922e',
  'OBU-12': 'f625a88c-5fa7-474f-82cc-e2a545914590',
  'OBU-13': '616a0321-dd65-464f-97b6-02d873162b8b',
  'OBU-14': 'e77b0f68-686e-40cf-a378-a06614e367a2',
  'OBU-15': 'f9e49782-aebf-4c1b-be4e-770c46dfac02',
  'OBU-16': '9f8fa0e3-ee2b-4078-aaef-918fd0a2d6c4',
  'OBU-17': 'cf602a81-712e-4ed0-8ea8-ea0bc02657a9',
  'OBU-18': '1a2f4e9a-1c59-4678-8d60-9efda70698f4'
};

/**
 * Read Linear API key from file
 */
function getApiKey() {
  if (!fs.existsSync(API_KEY_FILE)) {
    console.error(`Error: API key file not found at ${API_KEY_FILE}`);
    console.error('Create the file with your Linear API key (lin_api_...)');
    process.exit(1);
  }
  return fs.readFileSync(API_KEY_FILE, 'utf8').trim();
}

/**
 * Make a GraphQL request to Linear API
 */
function graphqlRequest(query, variables = {}) {
  const apiKey = getApiKey();

  return new Promise((resolve, reject) => {
    const data = JSON.stringify({ query, variables });

    const options = {
      hostname: 'api.linear.app',
      port: 443,
      path: '/graphql',
      method: 'POST',
      headers: {
        'Authorization': apiKey,
        'Content-Type': 'application/json',
        'Content-Length': data.length
      }
    };

    const req = https.request(options, (res) => {
      let body = '';

      res.on('data', (chunk) => {
        body += chunk;
      });

      res.on('end', () => {
        try {
          const json = JSON.parse(body);
          if (json.errors) {
            reject(new Error(json.errors[0].message));
          } else {
            resolve(json.data);
          }
        } catch (e) {
          reject(e);
        }
      });
    });

    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

/**
 * Get issue UUID by identifier
 */
async function getIssueUuid(identifier) {
  // Check cache first
  if (ISSUE_UUID_MAP[identifier]) {
    return ISSUE_UUID_MAP[identifier];
  }

  // Query Linear API
  const query = `
    query GetIssue($identifier: String!) {
      issue(id: $identifier) {
        id
        identifier
      }
    }
  `;

  const data = await graphqlRequest(query, { identifier });
  return data.issue.id;
}

/**
 * Get milestone ID by name
 */
async function getMilestoneId(milestoneName) {
  // Check cache first
  if (MILESTONE_CACHE[milestoneName]) {
    return MILESTONE_CACHE[milestoneName];
  }

  // Query Linear API
  const query = `
    query GetMilestones($projectId: String!) {
      project(id: $projectId) {
        projectMilestones {
          nodes {
            id
            name
          }
        }
      }
    }
  `;

  const data = await graphqlRequest(query, { projectId: PROJECT_ID });
  const milestone = data.project.projectMilestones.nodes.find(m => m.name === milestoneName);

  if (!milestone) {
    throw new Error(`Milestone "${milestoneName}" not found in project`);
  }

  // Cache for future use
  MILESTONE_CACHE[milestoneName] = milestone.id;
  return milestone.id;
}

/**
 * Assign milestone to issue
 */
async function assignMilestone(issueIdentifier, milestoneName) {
  console.log(`Assigning milestone "${milestoneName}" to ${issueIdentifier}...`);

  // Get issue UUID
  const issueId = await getIssueUuid(issueIdentifier);
  console.log(`  Issue UUID: ${issueId}`);

  // Get milestone ID
  const milestoneId = await getMilestoneId(milestoneName);
  console.log(`  Milestone ID: ${milestoneId}`);

  // Update issue
  const mutation = `
    mutation UpdateIssueMilestone($issueId: String!, $milestoneId: String!) {
      issueUpdate(
        id: $issueId,
        input: { projectMilestoneId: $milestoneId }
      ) {
        success
        issue {
          identifier
          title
          projectMilestone {
            name
          }
        }
      }
    }
  `;

  const data = await graphqlRequest(mutation, { issueId, milestoneId });

  if (data.issueUpdate.success) {
    console.log(`✅ Success! ${issueIdentifier} now assigned to milestone "${milestoneName}"`);
    return data.issueUpdate.issue;
  } else {
    throw new Error('Update failed');
  }
}

/**
 * Bulk assign milestones
 */
async function bulkAssign(assignments) {
  console.log(`Bulk assigning milestones to ${assignments.length} issues...\n`);

  const results = [];
  for (const { issue, milestone } of assignments) {
    try {
      const result = await assignMilestone(issue, milestone);
      results.push({ issue, milestone, success: true, result });
      console.log('');
    } catch (error) {
      console.error(`❌ Error assigning ${issue}: ${error.message}\n`);
      results.push({ issue, milestone, success: false, error: error.message });
    }
  }

  // Summary
  const successful = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;

  console.log('\n' + '='.repeat(60));
  console.log(`Summary: ${successful} successful, ${failed} failed`);
  console.log('='.repeat(60));

  return results;
}

/**
 * Main execution
 */
async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log('Usage:');
    console.log('  Single: node scripts/assign-milestone.js <issue-id> <milestone-name>');
    console.log('  Bulk:   node scripts/assign-milestone.js --bulk');
    console.log('');
    console.log('Examples:');
    console.log('  node scripts/assign-milestone.js OBU-13 MVP');
    console.log('  node scripts/assign-milestone.js OBU-8 1.1');
    console.log('  node scripts/assign-milestone.js --bulk  # Assigns all remaining issues');
    process.exit(1);
  }

  if (args[0] === '--bulk') {
    // Bulk assignment of remaining issues
    const assignments = [
      { issue: 'OBU-10', milestone: 'MVP' },
      { issue: 'OBU-12', milestone: 'MVP' },
      { issue: 'OBU-13', milestone: 'MVP' },
      { issue: 'OBU-14', milestone: 'MVP' },
      { issue: 'OBU-15', milestone: 'MVP' },
      { issue: 'OBU-16', milestone: 'MVP' },
      { issue: 'OBU-17', milestone: 'MVP' },
      { issue: 'OBU-18', milestone: 'MVP' },
      { issue: 'OBU-8', milestone: '1.1' },
      { issue: 'OBU-9', milestone: '1.1' }
    ];

    await bulkAssign(assignments);
  } else if (args.length === 2) {
    // Single assignment
    const [issueId, milestone] = args;
    await assignMilestone(issueId, milestone);
  } else {
    console.error('Error: Invalid arguments');
    console.error('Use --help for usage information');
    process.exit(1);
  }
}

// Run
main().catch(error => {
  console.error('Fatal error:', error.message);
  process.exit(1);
});
