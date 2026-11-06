# Atelier Monorepo: Route Health Audit Report

*Generated automatically on: 2026-11-06T00:55:16.851Z*

## Executive Summary

- **Total Routes Tested**: `41`
- 🟢 **PASS**: `41` (100.0%)
- 🔴 **FAIL**: `0`
- 🟡 **MISSING / 404**: `0`

## Health Status Overview

| Metric | Count | Health Status |
| :--- | :--- | :--- |
| 🟢 Validated (200, 30x, 401, 403) | **41** | Healthy & Responsive |
| 🔴 Server Errors (500, Crashes) | **0** | Zero Regressions |
| 🟡 Missing / Unmapped (404) | **0** | Zero Missing |

### Application: `apps/storefront` (http://127.0.0.1:3000)

| Type | Route Path | Method | HTTP Status | Verdict | Duration |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `frontend` | `/` | `GET` | `200 OK` | 🟢 PASS | `7452ms` |
| `frontend` | `/about` | `GET` | `200 OK` | 🟢 PASS | `666ms` |
| `api` | `/api/auth/confirm` | `POST` | `400 Bad Request` | 🟢 PASS | `399ms` |
| `api` | `/api/auth/demo-patron` | `POST` | `200 OK` | 🟢 PASS | `578ms` |
| `api` | `/api/bolt/check-pincode?pin=560038` | `GET` | `200 OK` | 🟢 PASS | `7619ms` |
| `api` | `/api/bolt/timeslots` | `GET` | `200 OK` | 🟢 PASS | `7520ms` |
| `api` | `/api/orders` | `GET` | `401 Unauthorized` | 🟢 PASS | `386ms` |
| `api` | `/api/revalidate` | `GET` | `401 Unauthorized` | 🟢 PASS | `473ms` |
| `frontend` | `/cart` | `GET` | `200 OK` | 🟢 PASS | `236ms` |
| `frontend` | `/checkout` | `GET` | `200 OK` | 🟢 PASS | `809ms` |
| `frontend` | `/login` | `GET` | `200 OK` | 🟢 PASS | `70ms` |
| `frontend` | `/orders` | `GET` | `200 OK` | 🟢 PASS | `605ms` |
| `frontend` | `/product/b1000000-0000-0000-0000-000000000001` | `GET` | `200 OK` | 🟢 PASS | `7703ms` |
| `frontend` | `/register` | `GET` | `200 OK` | 🟢 PASS | `565ms` |
| `frontend` | `/shop` | `GET` | `200 OK` | 🟢 PASS | `72ms` |

### Application: `apps/admin` (http://127.0.0.1:3001)

| Type | Route Path | Method | HTTP Status | Verdict | Duration |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `frontend` | `/` | `GET` | `307 Temporary Redirect` | 🟢 PASS | `14ms` |
| `frontend` | `/categories` | `GET` | `307 Temporary Redirect` | 🟢 PASS | `12ms` |
| `frontend` | `/cms` | `GET` | `307 Temporary Redirect` | 🟢 PASS | `10ms` |
| `frontend` | `/customers` | `GET` | `307 Temporary Redirect` | 🟢 PASS | `8ms` |
| `frontend` | `/dashboard` | `GET` | `307 Temporary Redirect` | 🟢 PASS | `9ms` |
| `frontend` | `/inventory` | `GET` | `307 Temporary Redirect` | 🟢 PASS | `9ms` |
| `frontend` | `/inventory/new` | `GET` | `307 Temporary Redirect` | 🟢 PASS | `8ms` |
| `frontend` | `/inventory/b1000000-0000-0000-0000-000000000001` | `GET` | `307 Temporary Redirect` | 🟢 PASS | `8ms` |
| `frontend` | `/orders` | `GET` | `307 Temporary Redirect` | 🟢 PASS | `11ms` |
| `api` | `/api/admin/create-courier` | `GET` | `401 Unauthorized` | 🟢 PASS | `9ms` |
| `api` | `/api/auth/demo-admin` | `GET` | `401 Unauthorized` | 🟢 PASS | `9ms` |
| `api` | `/api/invoice/generate` | `GET` | `401 Unauthorized` | 🟢 PASS | `9ms` |
| `api` | `/api/invoice/ord-10000000-0000-0000-0000-000000000001` | `GET` | `401 Unauthorized` | 🟢 PASS | `12ms` |
| `api` | `/api/orders` | `GET` | `401 Unauthorized` | 🟢 PASS | `8ms` |
| `frontend` | `/invoice/ord-10000000-0000-0000-0000-000000000001` | `GET` | `307 Temporary Redirect` | 🟢 PASS | `8ms` |
| `frontend` | `/login` | `GET` | `200 OK` | 🟢 PASS | `70ms` |

### Application: `apps/delivery` (http://127.0.0.1:3002)

| Type | Route Path | Method | HTTP Status | Verdict | Duration |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `frontend` | `/` | `GET` | `307 Temporary Redirect` | 🟢 PASS | `16ms` |
| `frontend` | `/bolt-session/ord-10000000-0000-0000-0000-000000000001` | `GET` | `307 Temporary Redirect` | 🟢 PASS | `15ms` |
| `frontend` | `/manifest` | `GET` | `307 Temporary Redirect` | 🟢 PASS | `13ms` |
| `api` | `/api/bolt/complete-session` | `GET` | `307 Temporary Redirect` | 🟢 PASS | `12ms` |
| `api` | `/api/bolt/session-status` | `GET` | `307 Temporary Redirect` | 🟢 PASS | `12ms` |
| `frontend` | `/assigned-deliveries` | `GET` | `307 Temporary Redirect` | 🟢 PASS | `12ms` |
| `frontend` | `/login` | `GET` | `200 OK` | 🟢 PASS | `65ms` |
| `frontend` | `/order/ord-10000000-0000-0000-0000-000000000001` | `GET` | `307 Temporary Redirect` | 🟢 PASS | `18ms` |
| `frontend` | `/order/ord-10000000-0000-0000-0000-000000000001/try-on` | `GET` | `307 Temporary Redirect` | 🟢 PASS | `13ms` |
| `frontend` | `/order/ord-10000000-0000-0000-0000-000000000001/update-status` | `GET` | `307 Temporary Redirect` | 🟢 PASS | `8ms` |

