# Linear Milestone Management Guide

**Last Updated:** November 7, 2025

This guide documents the standard practices and technical implementation for managing project milestones in Linear for the Family Planner project.

---

## Table of Contents

1. [Overview](#overview)
2. [Current Milestone Structure](#current-milestone-structure)
3. [Industry Standard & Best Practices](#industry-standard--best-practices)
4. [Assignment Methods](#assignment-methods)
5. [GraphQL API Reference](#graphql-api-reference)
6. [MCP Tools Limitation](#mcp-tools-limitation)
7. [Troubleshooting](#troubleshooting)

---

## Overview

**Project:** Family Planner
**Project ID:** `80e2d151-e5db-4ee9-bec5-e04e1e93e268`
**Linear URL:** https://linear.app/obuone/project/family-planner-b6df5c153775

**Milestones:**
- **MVP** - Initial launch (Target: November 28, 2025)
- **v1.1** - Post-launch enhancements (Target: December 12, 2025)

---

## Current Milestone Structure

### MVP Milestone (8 issues)

**Timeline:** November 7-28, 2025
**Focus:** Critical stability, testing, and production readiness

| Issue | Title | Status | Priority |
|-------|-------|--------|----------|
| OBU-10 | MVP Launch Preparation (parent epic) | Todo | High |
| OBU-12 | Fix shopping list generation timing | DONE | Urgent |
| OBU-13 | Fix recipe view grouping | Backlog | High |
| OBU-14 | Add error handling across app | Backlog | Urgent |
| OBU-15 | Fix category translations | Backlog | Medium |
| OBU-16 | Complete critical testing Phase 2 | Backlog | Urgent |
| OBU-17 | Complete high-priority testing Phase 3 | Backlog | High |
| OBU-18 | MVP Go-Live Readiness Checklist | Backlog | Urgent |

### v1.1 Milestone (2 issues)

**Timeline:** December 1-12, 2025
**Focus:** User-requested collaborative features

| Issue | Title | Status | Priority |
|-------|-------|--------|----------|
| OBU-8 | Make shopping list editable | Todo | High |
| OBU-9 | Allow multi-user shopping list editing | Todo | High |

---

## Industry Standard & Best Practices

### Rule: ALL Issues Must Have Milestones

**Both parent epics AND sub-issues must be assigned to milestones.**

### Why This Matters

1. **Filtering & Visibility**
   - Teams need to filter work by milestone to see what's in scope
   - Example: "Show me all MVP work" should include all related sub-issues
   - Without milestone assignment, issues become invisible in milestone views

2. **Progress Tracking**
   - Milestone completion metrics only count explicitly assigned issues
   - Parent epic at 80% complete doesn't reflect reality if sub-issues aren't tracked
   - Burndown charts and velocity metrics depend on accurate milestone assignments

3. **Work Planning**
   - Sprint/iteration planning requires accurate milestone-based views
   - Resource allocation depends on seeing the full scope per milestone
   - Dependency management requires knowing what work belongs to which release

4. **Reporting**
   - Stakeholder reports show progress toward milestone goals
   - "How close are we to MVP launch?" requires all issues to be counted
   - Executive summaries depend on accurate milestone data

5. **Team Coordination**
   - Multiple teams working on same project need milestone filters
   - Prevents confusion about "what's in scope for this release"
   - Enables parallel work streams to stay aligned

### When to Assign Milestones

- **At issue creation** - Default practice, assign immediately
- **When issue is added to project** - If not assigned at creation
- **When scope changes** - Update milestone if work moves to different release
- **During planning sessions** - Bulk assignment during sprint planning

### Red Flags (Avoid These)

- Parent issue has milestone, but sub-issues don't
- Issues in project with no milestone assigned
- Completed work not assigned to any milestone (loses history)
- Different sub-issues assigned to conflicting milestones without justification

---

## Assignment Methods

### Method 1: Web UI (Single Issue)

**Steps:**
1. Open issue in Linear (click on issue identifier like OBU-13)
2. Find the "Milestone" field in the right sidebar
3. Click on the milestone field
4. Select the appropriate milestone (MVP or v1.1)
5. Change auto-saves

**Time:** ~30 seconds per issue

### Method 2: Web UI (Bulk Assignment)

**Steps:**
1. Navigate to Family Planner project view
2. Filter to show issues needing milestone assignment
3. Select multiple issues:
   - Click checkbox next to first issue
   - Hold Shift, click checkbox next to last issue
   - OR use Cmd/Ctrl+A to select all visible
4. Open command menu (Cmd/Ctrl+K)
5. Type "Set milestone"
6. Choose milestone and apply

**Time:** ~2-3 minutes for all issues

**Most Efficient for Multiple Issues**

### Method 3: Issue Creation URL

Pre-fill milestone when creating new issues:

```
https://linear.app/team/OBU/new?project=Family+Planner&projectMilestone=MVP
```

**Query Parameters:**
- `project` - Can be UUID or name (e.g., "Family+Planner")
- `projectMilestone` - Can be UUID or name (e.g., "MVP" or "v1.1")

**Note:** Milestone can only be set if project is also specified

### Method 4: GraphQL API

See [GraphQL API Reference](#graphql-api-reference) section below.

---

## GraphQL API Reference

### Prerequisites

**API Key Required:**
1. Go to Linear Settings > Account > Security & Access
2. Create a Personal API Key
3. Permissions needed: Write access
4. Store securely (treat like a password)

### Query: Get Project Milestones

**Purpose:** Retrieve milestone IDs and names for a project

```graphql
query GetProjectMilestones {
  project(id: "80e2d151-e5db-4ee9-bec5-e04e1e93e268") {
    id
    name
    projectMilestones {
      nodes {
        id
        name
        targetDate
        sortOrder
      }
    }
  }
}
```

**Expected Response:**
```json
{
  "data": {
    "project": {
      "id": "80e2d151-e5db-4ee9-bec5-e04e1e93e268",
      "name": "Family Planner",
      "projectMilestones": {
        "nodes": [
          {
            "id": "<milestone-uuid-1>",
            "name": "MVP",
            "targetDate": "2025-11-28",
            "sortOrder": 1
          },
          {
            "id": "<milestone-uuid-2>",
            "name": "1.1",
            "targetDate": "2025-12-12",
            "sortOrder": 2
          }
        ]
      }
    }
  }
}
```

### Mutation: Assign Milestone to Issue

**Purpose:** Update an issue to assign it to a project milestone

```graphql
mutation AssignMilestone {
  issueUpdate(
    id: "<issue-uuid>",
    input: {
      projectMilestoneId: "<milestone-uuid>"
    }
  ) {
    success
    issue {
      id
      identifier
      title
      projectMilestone {
        id
        name
      }
    }
  }
}
```

**Example (OBU-13 to MVP):**
```graphql
mutation {
  issueUpdate(
    id: "616a0321-dd65-464f-97b6-02d873162b8b",
    input: {
      projectMilestoneId: "<MVP-milestone-uuid>"
    }
  ) {
    success
    issue {
      identifier
      projectMilestone { name }
    }
  }
}
```

**Expected Response:**
```json
{
  "data": {
    "issueUpdate": {
      "success": true,
      "issue": {
        "identifier": "OBU-13",
        "projectMilestone": {
          "name": "MVP"
        }
      }
    }
  }
}
```

### Query: Verify Issue Milestone Assignment

**Purpose:** Check which milestone an issue is assigned to

```graphql
query GetIssueMilestone {
  issue(id: "<issue-uuid>") {
    id
    identifier
    title
    projectMilestone {
      id
      name
      targetDate
    }
  }
}
```

### Bulk Assignment Script Example

**Using curl (Bash/PowerShell):**

```bash
#!/bin/bash

# Configuration
LINEAR_API_KEY="your-api-key-here"
API_URL="https://api.linear.app/graphql"
MVP_MILESTONE_ID="<milestone-uuid>"

# Array of issue IDs to update
ISSUE_IDS=(
  "0418724f-9ae9-4c83-8865-60deca1d9d30"  # OBU-10
  "616a0321-dd65-464f-97b6-02d873162b8b"  # OBU-13
  "f9e49782-aebf-4c1b-be4e-770c46dfac02"  # OBU-15
  # ... add more issue IDs
)

# Loop through and update each issue
for ISSUE_ID in "${ISSUE_IDS[@]}"; do
  echo "Updating issue: $ISSUE_ID"

  curl -X POST "$API_URL" \
    -H "Authorization: Bearer $LINEAR_API_KEY" \
    -H "Content-Type: application/json" \
    -d "{
      \"query\": \"mutation { issueUpdate(id: \\\"$ISSUE_ID\\\", input: { projectMilestoneId: \\\"$MVP_MILESTONE_ID\\\" }) { success issue { identifier projectMilestone { name } } } }\"
    }"

  echo ""
done
```

**Using JavaScript/Node.js:**

```javascript
const LINEAR_API_KEY = 'your-api-key-here';
const MVP_MILESTONE_ID = '<milestone-uuid>';
const API_URL = 'https://api.linear.app/graphql';

const issueIds = [
  '0418724f-9ae9-4c83-8865-60deca1d9d30',  // OBU-10
  '616a0321-dd65-464f-97b6-02d873162b8b',  // OBU-13
  // ... add more
];

async function assignMilestone(issueId, milestoneId) {
  const query = `
    mutation {
      issueUpdate(
        id: "${issueId}",
        input: { projectMilestoneId: "${milestoneId}" }
      ) {
        success
        issue {
          identifier
          projectMilestone { name }
        }
      }
    }
  `;

  const response = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${LINEAR_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query }),
  });

  const data = await response.json();
  console.log(`Updated ${data.data.issueUpdate.issue.identifier}`);
}

// Run for all issues
for (const issueId of issueIds) {
  await assignMilestone(issueId, MVP_MILESTONE_ID);
}
```

---

## MCP Tools Limitation

### Current Status

**The Linear MCP server (used by Claude Code) does NOT support milestone operations.**

### What's Missing

1. **No milestone query capability**
   - Cannot retrieve project milestones via MCP
   - Cannot get milestone IDs programmatically

2. **No milestone assignment support**
   - `update_issue` function doesn't expose `projectMilestoneId` parameter
   - Cannot assign milestones via MCP tools

3. **No raw GraphQL access**
   - MCP wraps the Linear API with specific functions
   - No generic GraphQL query/mutation capability

### Why This Limitation Exists

The Linear MCP server is a community-maintained integration that provides a subset of Linear's full API capabilities. Milestone management was not included in the initial implementation.

### Workarounds

1. **Manual assignment** - Use Linear web UI (fastest for small numbers)
2. **Direct API calls** - Use GraphQL API with personal API key
3. **Feature request** - Request milestone support in Linear MCP server

### Future Enhancement

If milestone management via MCP becomes critical, options include:

1. **Contribute to Linear MCP server** - Add milestone query/mutation functions
2. **Custom MCP server** - Build wrapper with milestone support
3. **Hybrid approach** - Use web UI for setup, MCP for other operations

---

## Troubleshooting

### Issue Not Showing in Milestone View

**Symptom:** Issue exists but doesn't appear when filtering by milestone

**Causes:**
1. Issue not assigned to any milestone
2. Issue assigned to different milestone than filter
3. Issue archived or in private team

**Solution:**
1. Open the issue directly (use identifier like OBU-13)
2. Check the "Milestone" field in right sidebar
3. If blank or wrong, update to correct milestone
4. Refresh milestone view

### Cannot Set Milestone (Field Disabled)

**Symptom:** Milestone field is grayed out or not clickable

**Causes:**
1. Issue not in any project (milestones are project-specific)
2. Insufficient permissions

**Solution:**
1. Verify issue is assigned to "Family Planner" project
2. If not, add to project first, then assign milestone
3. Check your Linear permissions (must have write access)

### Milestone Not Available in Dropdown

**Symptom:** Can't find MVP or v1.1 in milestone selector

**Causes:**
1. Viewing wrong project's milestones
2. Milestone deleted or archived

**Solution:**
1. Confirm issue is in "Family Planner" project
2. Check project settings to verify milestones exist
3. Admin may need to recreate milestones if missing

### API Mutation Returns "Invalid milestone ID"

**Symptom:** GraphQL mutation fails with error about milestone ID

**Causes:**
1. Using wrong UUID (issue ID instead of milestone ID)
2. Milestone doesn't belong to same project as issue
3. Milestone ID typo

**Solution:**
1. Run milestone query first to get correct IDs
2. Verify milestone and issue both belong to Family Planner project
3. Double-check UUID format (no typos, correct dashes)

### Bulk Update Not Working

**Symptom:** Selected multiple issues but milestone didn't apply to all

**Causes:**
1. Some issues not in the project
2. Mixed selection across different projects
3. Permissions issue

**Solution:**
1. Filter view to only show Family Planner issues
2. Verify all selected issues have project assigned
3. Try smaller batches (10-20 issues at a time)
4. Check permissions for bulk actions

---

## Reference Links

- **Linear GraphQL API Docs:** https://developers.linear.app/docs/graphql/working-with-the-graphql-api
- **Linear GraphQL Schema Explorer:** https://studio.apollographql.com/public/Linear-API/home
- **Linear Concepts (Milestones):** https://linear.app/docs/conceptual-model#milestones
- **Family Planner Project:** https://linear.app/obuone/project/family-planner-b6df5c153775
- **Linear API Settings:** https://linear.app/settings/api

---

## Issue Reference

### MVP Milestone Issues

| Identifier | UUID | Title |
|------------|------|-------|
| OBU-10 | 0418724f-9ae9-4c83-8865-60deca1d9d30 | MVP Launch Preparation |
| OBU-12 | f625a88c-5fa7-474f-82cc-e2a545914590 | Fix shopping list generation timing |
| OBU-13 | 616a0321-dd65-464f-97b6-02d873162b8b | Fix recipe view grouping |
| OBU-14 | e77b0f68-686e-40cf-a378-a06614e367a2 | Add error handling across app |
| OBU-15 | f9e49782-aebf-4c1b-be4e-770c46dfac02 | Fix category translations |
| OBU-16 | 9f8fa0e3-ee2b-4078-aaef-918fd0a2d6c4 | Complete critical testing Phase 2 |
| OBU-17 | cf602a81-712e-4ed0-8ea8-ea0bc02657a9 | Complete high-priority testing Phase 3 |
| OBU-18 | 1a2f4e9a-1c59-4678-8d60-9efda70698f4 | MVP Go-Live Readiness Checklist |

### v1.1 Milestone Issues

| Identifier | UUID | Title |
|------------|------|-------|
| OBU-8 | 8198ad3f-0276-49f1-9a7e-e7e219277239 | Make shopping list editable |
| OBU-9 | d681ff1e-9ef4-48cf-ac07-822c4c2d0885 | Allow multi-user shopping list editing |

---

**End of Guide**
