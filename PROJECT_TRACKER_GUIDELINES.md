# Project Tracker Agent Guidelines

**Version:** 1.0
**Last Updated:** November 7, 2025

> Comprehensive guidelines for the project-tracker agent on managing Linear issues, milestones, and project organization.

---

## 🎯 Core Responsibilities

The project-tracker agent is responsible for:

1. **Creating and organizing Linear issues** from development tasks
2. **Assigning project milestones** to all issues (including sub-issues)
3. **Maintaining milestone structure** for the Family Planner project
4. **Tracking dependencies** between issues
5. **Documenting decisions** and rationale in Linear

---

## 📊 Project Structure

### Current Project

- **Project:** Family Planner
- **Project ID:** `80e2d151-e5db-4ee9-bec5-e04e1e93e268`
- **Team:** Obuone (ID: `1b2098c5-4c73-486d-b3e8-94e6b46a91c7`)

### Current Milestones

| Milestone | ID | Purpose | Target Date |
|-----------|-----|---------|-------------|
| **MVP** | `7b32d8d1-d077-4de0-b4af-a899ffeab98b` | Launch-ready functionality | Nov 28, 2025 |
| **1.1** | `5dd1d0d6-00ae-497d-93f5-503e07cfdd3c` | Post-launch enhancements | Dec 12, 2025 |

---

## 🏗️ Milestone Assignment Standards

### Industry Best Practice

**ALL issues MUST be assigned to milestones, including sub-issues.**

**Why:**

1. **Filtering** - When filtering by milestone, users need to see ALL work items, not just parent epics
2. **Progress Tracking** - Linear calculates milestone progress based on ALL assigned issues
3. **Work Visibility** - Team members need to see their actual work items (sub-issues)
4. **Independence** - If sub-issues move to different parents, milestone assignment remains correct

### Assignment Pattern

```
Epic: OBU-10 (MVP Launch Preparation)
├─ Milestone: MVP ✅ (parent assigned)
├─ Sub-issue: OBU-12 (Shopping list fix)
│  └─ Milestone: MVP ✅ (sub-issue assigned)
├─ Sub-issue: OBU-14 (Error handling)
│  └─ Milestone: MVP ✅ (sub-issue assigned)
└─ Sub-issue: OBU-8 (Editable shopping list)
   └─ Milestone: v1.1 ✅ (different milestone OK!)
```

### When to Assign Milestones

**ALWAYS assign milestones when:**

- Creating new issues
- Creating sub-issues under existing epics
- Moving issues between projects
- Changing project scope (MVP → v1.1 or vice versa)

**EXCEPTION:**

- Issues that are already completed (status: Done/Cancelled) may skip milestone assignment

---

## 🔧 How to Assign Milestones

### Method 1: Using the Script (Recommended)

The project includes a Node.js script for programmatic milestone assignment:

```bash
# Single issue
node scripts/assign-milestone.js OBU-13 MVP

# Bulk assignment
node scripts/assign-milestone.js --bulk
```

**When to use:**

- When creating multiple issues at once
- When reorganizing project milestones
- When the project-tracker agent needs to assign milestones automatically

**Setup required:**

1. Linear API key stored in `.linear-api-key` file (gitignored)
2. Node.js installed
3. Script has correct PROJECT_ID and milestone IDs

### Method 2: Linear MCP Tools (Limited)

The Linear MCP server has limitations:

- ❌ Cannot query project milestones
- ❌ Cannot assign milestones via `update_issue`
- ✅ Can create issues and assign to projects
- ✅ Can query issue details

**Workaround:**

Use the Bash tool to call the script:

```typescript
// In project-tracker agent
await bash({
  command: `cd "C:\\Users\\olivi\\projects\\family-planner" && node scripts/assign-milestone.js ${issueId} ${milestoneName}`,
  description: `Assign ${milestoneName} milestone to ${issueId}`
});
```

### Method 3: GraphQL API (Direct)

For advanced use cases, use GraphQL directly:

```bash
curl -s "https://api.linear.app/graphql" \
  -H "Authorization: $(cat .linear-api-key)" \
  -H "Content-Type: application/json" \
  --data-raw '{
    "query": "mutation {
      issueUpdate(
        id: \"<issue-uuid>\",
        input: { projectMilestoneId: \"<milestone-uuid>\" }
      ) {
        success
        issue { identifier projectMilestone { name } }
      }
    }"
  }'
```

---

## 📝 Issue Creation Workflow

### Step-by-Step Process

When creating new Linear issues, follow this workflow:

#### 1. **Analyze the Task**

- Determine if it's a bug, feature, improvement, or testing task
- Identify which milestone it belongs to (MVP or v1.1)
- Check for dependencies on other issues
- Estimate effort (optional but recommended)

#### 2. **Create the Issue**

```typescript
const issue = await linearMCP.create_issue({
  team: "Obuone",
  project: "Family Planner",
  title: "Fix shopping list generation timing",
  description: "Detailed description...",
  priority: "Urgent",
  labels: ["Bug", "launch-blocker"]
});
```

#### 3. **Assign Milestone**

```typescript
await bash({
  command: `cd "C:\\Users\\olivi\\projects\\family-planner" && node scripts/assign-milestone.js ${issue.identifier} MVP`,
  description: `Assign MVP milestone to ${issue.identifier}`
});
```

#### 4. **Link Dependencies**

If the issue depends on or blocks other issues, add that information to the description:

```markdown
## Dependencies

- **Blocks:** OBU-16 (testing cannot complete without error handling)
- **Depends on:** OBU-12 (requires shopping list fix first)
```

#### 5. **Add to Parent Epic** (if applicable)

```typescript
await linearMCP.update_issue({
  id: issue.id,
  parentId: "0418724f-9ae9-4c83-8865-60deca1d9d30" // OBU-10 MVP Launch Preparation
});
```

---

## 🎨 Labeling Standards

Use consistent labels for better organization:

### Priority Labels

- `launch-blocker` - MUST be fixed before launch (P0)
- `go-live-criteria` - Required for production readiness (P0-P1)
- `ux-polish` - User experience improvements (P1-P2)

### Type Labels

- `Bug` - Something is broken
- `Feature` - New functionality
- `Improvement` - Enhancement to existing functionality
- `testing` - QA/testing tasks

### Version Labels

- `v1.1` - Explicitly deferred to v1.1 (also use v1.1 milestone)

---

## 🔍 Querying Milestones

### Get All Milestones in Project

```bash
curl -s "https://api.linear.app/graphql" \
  -H "Authorization: $(cat .linear-api-key)" \
  -H "Content-Type: application/json" \
  --data-raw '{
    "query": "query {
      project(id: \"80e2d151-e5db-4ee9-bec5-e04e1e93e268\") {
        name
        projectMilestones {
          nodes {
            id
            name
            sortOrder
          }
        }
      }
    }"
  }'
```

### Get Issues in a Milestone

```bash
curl -s "https://api.linear.app/graphql" \
  -H "Authorization: $(cat .linear-api-key)" \
  -H "Content-Type: application/json" \
  --data-raw '{
    "query": "query {
      project(id: \"80e2d151-e5db-4ee9-bec5-e04e1e93e268\") {
        issues(
          filter: {
            projectMilestone: {
              id: { eq: \"7b32d8d1-d077-4de0-b4af-a899ffeab98b\" }
            }
          }
        ) {
          nodes {
            identifier
            title
            status { name }
          }
        }
      }
    }"
  }'
```

---

## 🚨 Common Pitfalls to Avoid

### ❌ ANTI-PATTERN: Only assigning milestone to parent

```
Epic: OBU-10
├─ Milestone: MVP ✅
├─ Sub-issue: OBU-12
│  └─ Milestone: (none) ❌ WRONG!
```

**Problem:** Filtering by MVP milestone won't show OBU-12

### ❌ ANTI-PATTERN: Assuming sub-issues inherit milestone

Linear does NOT automatically inherit milestones from parents. You MUST explicitly assign them.

### ❌ ANTI-PATTERN: Using labels instead of milestones

```
Issue: OBU-12
├─ Labels: ["MVP", "Bug"] ❌ WRONG!
└─ Milestone: (none)
```

**Problem:** Can't use Linear's built-in milestone filtering and progress tracking

### ✅ CORRECT PATTERN: Explicit milestone assignment

```
Epic: OBU-10
├─ Milestone: MVP ✅
├─ Sub-issue: OBU-12
│  └─ Milestone: MVP ✅
└─ Sub-issue: OBU-13
   └─ Milestone: MVP ✅
```

---

## 📚 Reference: Issue UUID Map

For quick reference when using the script:

| Identifier | UUID |
|------------|------|
| OBU-5 | `c5522a44-b348-4392-8435-d8a8d71ac623` |
| OBU-6 | `e237a509-8aa5-47e3-802f-872319cc241a` |
| OBU-7 | `26b9b14f-d501-470d-b718-f416034b78b6` |
| OBU-8 | `8198ad3f-0276-49f1-9a7e-e7e219277239` |
| OBU-9 | `d681ff1e-9ef4-48cf-ac07-822c4c2d0885` |
| OBU-10 | `0418724f-9ae9-4c83-8865-60deca1d9d30` |
| OBU-11 | `1a2e61f0-8971-4ae4-8f8d-b3dddd79922e` |
| OBU-12 | `f625a88c-5fa7-474f-82cc-e2a545914590` |
| OBU-13 | `616a0321-dd65-464f-97b6-02d873162b8b` |
| OBU-14 | `e77b0f68-686e-40cf-a378-a06614e367a2` |
| OBU-15 | `f9e49782-aebf-4c1b-be4e-770c46dfac02` |
| OBU-16 | `9f8fa0e3-ee2b-4078-aaef-918fd0a2d6c4` |
| OBU-17 | `cf602a81-712e-4ed0-8ea8-ea0bc02657a9` |
| OBU-18 | `1a2f4e9a-1c59-4678-8d60-9efda70698f4` |

---

## 🔐 Security

### API Key Management

- **File:** `.linear-api-key` in project root
- **Format:** Single line with API key (starts with `lin_api_`)
- **Git:** MUST be in `.gitignore` (already configured)
- **Permissions:** Keep secret, never commit to version control

### Checking .gitignore

```bash
# Verify .linear-api-key is ignored
git status

# Should NOT show .linear-api-key in tracked files
```

---

## 📋 Checklist for New Issues

When creating issues, verify:

- [ ] Issue has clear, descriptive title
- [ ] Description includes problem statement, solution, and acceptance criteria
- [ ] Assigned to correct project (Family Planner)
- [ ] **Milestone assigned** (MVP or v1.1)
- [ ] Priority set appropriately
- [ ] Labels applied (Bug/Feature/Improvement + priority labels)
- [ ] Parent relationship set (if sub-issue)
- [ ] Dependencies documented in description
- [ ] Linked to related issues (blocks/blocked by)

---

## 🎓 Learning Resources

- [Linear Project Milestones Documentation](https://linear.app/docs/project-milestones)
- [Linear GraphQL API](https://developers.linear.app/docs/graphql/working-with-the-graphql-api)
- [Project Milestone Assignment Script](./scripts/assign-milestone.js)
- [Complete Milestone Management Guide](./LINEAR_MILESTONE_MANAGEMENT.md)

---

**Remember:** The goal of milestones is to make project tracking effortless. When in doubt, assign the milestone!

**Last Review:** November 7, 2025
