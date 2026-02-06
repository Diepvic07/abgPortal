# ABG Alumni Connect - Documentation Index

Welcome to the ABG Alumni Connect documentation. Choose the guide that best fits your role or task.

## Quick Navigation

### I'm Getting Started
- **New to the project?** Start with [README.md](../README.md) for product overview
- **Setting up locally?** See [setup-guide.md](./setup-guide.md) for environment configuration
- **Understanding the system?** Read [codebase-summary.md](./codebase-summary.md) for architecture overview

### I'm an Administrator
- **Managing members?** See [admin-operations-guide.md](./admin-operations-guide.md)
- **Approving new members?** Jump to "Member Approval Workflow" section
- **Managing membership tiers?** Jump to "Tier Management" section
- **Bulk importing members?** Jump to "CSV Bulk Import" section

### I'm a Developer
- **Understanding authentication?** See [authentication-guide.md](./authentication-guide.md)
- **Working with tiers?** See [tier-system-guide.md](./tier-system-guide.md)
- **Need technical details?** See [codebase-summary.md](./codebase-summary.md)
- **Debugging auth issues?** See "Troubleshooting" in [authentication-guide.md](./authentication-guide.md)

### I'm Deploying
- **Configure environment variables?** See [setup-guide.md](./setup-guide.md)
- **Deployment checklist?** See [admin-operations-guide.md](./admin-operations-guide.md#deployment-checklist)
- **Post-deployment testing?** See [authentication-guide.md](./authentication-guide.md#testing-authentication-locally)

## Documentation Files

### Core Documentation

| File | Purpose | Audience | Size |
|------|---------|----------|------|
| [codebase-summary.md](./codebase-summary.md) | Technical architecture, data schemas, request flows | Developers, Architects | 14 KB |
| [authentication-guide.md](./authentication-guide.md) | Auth methods, flows, setup, troubleshooting | Developers, DevOps | 13 KB |
| [tier-system-guide.md](./tier-system-guide.md) | Membership tiers, limits, enforcement | Developers, Product | 14 KB |
| [admin-operations-guide.md](./admin-operations-guide.md) | Admin dashboard, member management, CSV import | Administrators, DevOps | 15 KB |
| [setup-guide.md](./setup-guide.md) | Environment configuration, API key setup | DevOps, Developers | 6.3 KB |

### Sample Data

| File | Purpose |
|------|---------|
| `abg_members_portal_data_sample.csv` | Sample member data for CSV import |
| `ABG_date_matching_data.csv` | Test data for matching algorithm |

## Key Concepts

### Authentication
Two methods available:
- **Magic Link**: Email-based verification via Resend
- **Google OAuth**: Single-click login with Google account

Both require approval before platform access. See [authentication-guide.md](./authentication-guide.md)

### Approval Workflow
Members go through approval before gaining access:
1. New signup → `approval_status = "pending"`
2. Admin reviews in `/admin` dashboard
3. Approve → `approval_status = "approved"` → Can login
4. Reject → `approval_status = "rejected"` → Access denied

See [admin-operations-guide.md](./admin-operations-guide.md)

### Membership Tiers
Two tiers control what members can do:
- **Basic**: Free, 1 lifetime request, limited profile access
- **Premium**: Paid, 50 daily requests, full access

See [tier-system-guide.md](./tier-system-guide.md)

### CSV Bulk Import
Import pre-approved members in bulk:
- `npm run import-members -- --dry-run` (preview)
- `npm run import-members` (execute)
- Auto-approves with `is_csv_imported = TRUE`

See [admin-operations-guide.md](./admin-operations-guide.md#csv-bulk-import)

## Common Tasks

### For Admins
- [Approve new members](./admin-operations-guide.md#approve-new-members)
- [Reject problem members](./admin-operations-guide.md#reject-problem-members)
- [Manage member tiers](./admin-operations-guide.md#manage-member-tier)
- [Bulk import from CSV](./admin-operations-guide.md#csv-bulk-import)
- [Monitor requests](./admin-operations-guide.md#monitor-requests)

### For Developers
- [Setup local environment](./setup-guide.md)
- [Configure Google OAuth](./setup-guide.md#2-google-oauth-credentials)
- [Configure NextAuth](./setup-guide.md#3-nextauth-configuration)
- [Check authentication in code](./authentication-guide.md#checking-authentication-in-code)
- [Understand tier enforcement](./tier-system-guide.md#tier-enforcement-points)

### For DevOps
- [Environment variable setup](./setup-guide.md)
- [Deployment checklist](./admin-operations-guide.md#deployment-checklist)
- [Troubleshooting tips](./admin-operations-guide.md#troubleshooting)

## Data Models

### Member (Google Sheets)
Primary entity with approval and tier fields:
- `approval_status` (pending/approved/rejected)
- `is_csv_imported` (TRUE/FALSE)
- `paid` (TRUE=Premium, FALSE=Basic)
- See [codebase-summary.md](./codebase-summary.md#member-schema-typescript-interface)

### Requests
Connection requests with matching:
- `status` (pending/matched/connected/declined)
- `matched_ids` (comma-separated match member IDs)
- See [codebase-summary.md](./codebase-summary.md#google-sheets-schema-cloud-storage)

### Connections
Completed introductions:
- `from_id`, `to_id` (member IDs)
- `intro_sent` (TRUE/FALSE)
- See [codebase-summary.md](./codebase-summary.md#google-sheets-schema-cloud-storage)

## Environment Variables

Full list in [setup-guide.md](./setup-guide.md) with setup instructions.

**Required for Auth:**
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`
- `NEXTAUTH_SECRET`, `NEXTAUTH_URL`
- `RESEND_API_KEY`, `EMAIL_FROM`

## Troubleshooting

### Login Issues
See [authentication-guide.md#troubleshooting](./authentication-guide.md#troubleshooting-authentication)

### Admin Issues
See [admin-operations-guide.md#troubleshooting](./admin-operations-guide.md#troubleshooting)

### CSV Import Issues
See [admin-operations-guide.md#csv-import-issues](./admin-operations-guide.md#csv-import-not-finding-members)

## Production Deployment

1. Follow [setup-guide.md](./setup-guide.md) for all env vars
2. Use [admin-operations-guide.md#deployment-checklist](./admin-operations-guide.md#deployment-checklist)
3. Post-deployment testing in [authentication-guide.md#testing](./authentication-guide.md#testing-authentication-locally)

## Support

For issues not covered here:
1. Check the relevant guide's troubleshooting section
2. Review [codebase-summary.md](./codebase-summary.md) for technical details
3. Contact the development team

## Last Updated

These docs were last updated on **2026-02-06** with complete Auth & Tier System implementation details.

For changes and additions, see the report: `plans/reports/docs-manager-260206-1358-auth-tier-system-docs.md`
