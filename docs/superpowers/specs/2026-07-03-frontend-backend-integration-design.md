# Frontend-Backend Integration Design

**Date:** 2026-07-03
**Status:** Approved

## Goal

Replace the frontend mock layer (`lib/mock/store.ts`) with real API calls to the backend across all 9 business modules. Add two new standalone CRUD modules: Qualification Management and Port Info Management.

## Architecture

```
QualificationInfo (NEW standalone CRUD)
PortInfo          (NEW standalone CRUD)
FilingRecord      (joins qualification_info_id + port_info_id)
Dashboard         (read-only stats/trends)
Users             (CRUD + enable/disable/reset-password)
Roles             (CRUD)
MainPort / SubPort (CRUD)
Login Logs        (read + delete)
API Access Config (CRUD + data display placeholder)
Operation Logs    (read + delete, API layer only)
```

## Backend Changes

### New CRUD files
- `app/crud/qualification.py` — `list_qualifications`, `get_qualification`, `create_qualification`, `update_qualification`, `delete_qualification`
- `app/crud/port_info.py` — `list_port_infos`, `get_port_info`, `create_port_info`, `update_port_info`, `delete_port_info`

### New route files
- `app/api/routes/qualifications.py` — prefix `/qualifications`, full CRUD, page/page_size pagination, filter by `enterprise_name`/`cert_number`
- `app/api/routes/port_info.py` — prefix `/port-info`, full CRUD, page/page_size pagination, filter by `carrier`/`province`/`business_type`

### Modified files
- `app/api/main.py` — register 2 new routers

## Frontend Changes

### New files
- `src/lib/api/qualifications.ts` — `getQualifications`, `getQualification`, `createQualification`, `updateQualification`, `deleteQualification`
- `src/lib/api/port-info.ts` — `getPortInfos`, `getPortInfo`, `createPortInfo`, `updatePortInfo`, `deletePortInfo`
- `src/features/qualifications/` — list page, create/edit form, detail page
- `src/features/port-info/` — list page, create/edit form, detail page
- Route files for both new modules

### Modified files
- **Dashboard** (3 files): stat-cards, trend chart, distribution charts → `useQuery` with real API
- **Records** (9 files): list, table, detail tabs → `useQuery` with real API, flat→nested field access
- **Users** (2 files): replace mock imports → real API calls
- **Roles** (2 files): replace mock imports → real API calls
- **Login Logs** (2 files): replace mock imports → real API calls
- **Ports Main/Sub** (4 files): replace mock imports → real API calls
- **API Data** (2 files): rewrite as API access config CRUD + data display
- **API layer** (2 files): fix `api-data.ts` URL, fix `dashboard.ts` types
- **Sidebar**: add menu items for new modules

### Deleted files (mock layer)
- `src/lib/mock/store.ts`
- `src/lib/mock/data/records.ts`
- `src/lib/mock/data/dashboard.ts`
- `src/lib/mock/data/api-data.ts`
- `src/lib/mock/handlers.ts`
- `src/lib/mock/browser.ts`
- Remove MSW init from `src/main.tsx`

## Type Transformation: Flat → Nested

Backend `FilingRecordPublic` nests data under `port_info` and `qualification_info` sub-objects. Frontend currently uses flat `FilingRecord`. All detail tab components must update field access paths:

| UI Section | Old (flat) | New (nested) |
|-----------|-----------|-------------|
| Basic Info | `record.carrier` | `record.port_info?.carrier` |
| Port fields | `record.main_port` | `record.port_info?.main_port_number` |
| Enterprise | `record.enterprise_name` | `record.qualification_info?.enterprise_name` |
| Contacts | `record.handler_name` | `record.qualification_info?.handler_name` |
| Signature | `record.sms_signature` | `record.port_info?.sms_signature` |
| Templates/Diversions | `record.templates` | Remove — no backend equivalent |
| Attachments | `record.attachments` | Fetch via `/files` endpoint |

## Implementation Order

1. Backend: `qualification.py` CRUD, `port_info.py` CRUD, routes, register
2. Frontend API: `qualifications.ts`, `port-info.ts`, fix `api-data.ts` URL, fix `dashboard.ts` types
3. Wire existing features: Dashboard → Users → Roles → Login Logs → Ports Main/Sub → API Access → Records
4. New modules: Qualification Management → Port Info Management
5. Cleanup: delete mock layer, remove MSW init, update sidebar
