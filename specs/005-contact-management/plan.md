# Implementation Plan: Contact Management

**Branch**: `005-contact-management` | **Date**: 2026-04-06 | **Spec**: [spec.md](spec.md)  
**Input**: Feature specification from `/specs/005-contact-management/spec.md`

## Summary

Lightweight CRM profiles for every WhatsApp customer. Contacts auto-create on first inbound message (already wired). This feature adds: full CRUD from the inbox conversation panel (all roles), a dedicated Contacts page with search (all roles), manual add + CSV import (admin/supervisor), archiving, and custom fields. The `contacts` table already exists in schema; two additions needed: `isArchived` field and a new `customFields` table.

## Technical Context

**Language/Version**: TypeScript (strict, no `any`) — Next.js 15 App Router  
**Primary Dependencies**: Convex (DB + serverless), Clerk (auth/roles), shadcn/ui, Tailwind CSS v4, Lucide React  
**Storage**: Convex — `contacts` table (exists), `customFields` table (new)  
**Testing**: Manual WhatsApp flow testing (per Definition of Done)  
**Target Platform**: Web (Vercel), mobile-responsive  
**Project Type**: Web application feature (dashboard module)  
**Performance Goals**: Contact search < 5s (SC-002); CSV import of 1k contacts < 60s (SC-003); contact profile visible within 3s of first message (SC-001)  
**Constraints**: Max 10,000 contacts per CSV import; E.164 phone storage; last-write-wins for concurrent edits  
**Scale/Scope**: Per-tenant contact lists; no cross-tenant access

## Constitution Check

| Gate | Status | Notes |
|------|--------|-------|
| **RTL Gate** | ✅ PASS | Contacts page and panel are UI — RTL required from first commit. Cairo/Tajawal font, `dir="rtl"`, `ms-`/`me-` Tailwind classes, flipped directional icons. |
| **Tenant Scope Gate** | ✅ PASS | Every Convex query/mutation must include `tenantId` from `getCallerIdentity`. `customFields` table also scoped by `tenantId` (via contactId's tenantId). |
| **Real-Time Gate** | ✅ PASS | Contact panel in inbox and contacts list must use `useQuery` (Convex subscriptions). No polling. |
| **Security Gate** | ✅ N/A | No Meta API or webhook interaction in this feature. |
| **Schema Gate** | ✅ PASS | `contacts` table already has `tenantId`. New `customFields` table must include `tenantId` from day one. `isArchived` added to contacts. |
| **Simplicity Gate** | ✅ PASS | No new onboarding steps added. CSV import is behind a modal, not in the onboarding flow. |

## Project Structure

### Documentation (this feature)

```text
specs/005-contact-management/
├── plan.md              ← this file
├── research.md          ← Phase 0 output
├── data-model.md        ← Phase 1 output
├── contracts/
│   └── convex-api.md    ← Convex function contracts
└── tasks.md             ← Phase 2 output (/speckit.tasks)
```

### Source Code (affected paths)

```text
convex/
├── schema.ts                    ← add isArchived to contacts; add customFields table
├── contacts.ts                  ← extend with: getById, update, create, archive, search, importBatch
└── customFields.ts              ← new: list, upsert, delete

app/(dashboard)/
├── contacts/
│   ├── layout.tsx               ← change min role from "supervisor" to "agent"
│   └── page.tsx                 ← new: contacts list page with search + add + import

components/contacts/
├── contact-panel.tsx            ← sidebar panel used in inbox conversation view
├── contact-list.tsx             ← searchable/filterable table for /contacts page
├── add-contact-dialog.tsx       ← manual add form (admin/supervisor only)
├── csv-import-dialog.tsx        ← CSV upload → preview → import (admin/supervisor only)
└── contact-detail-sheet.tsx     ← full profile sheet (from contacts page)

app/(dashboard)/inbox/page.tsx   ← add <ContactPanel> to conversation thread sidebar
```

## Complexity Tracking

No constitution violations requiring justification.
