# News Module Functional Test Report

## Environment
- Client: Windows 10, Chrome 129, Node.js 18 LTS
- Server: Node.js 18, Express 4, Socket.IO 4
- Database: MySQL 8.0 with dataset generated via `db/generate_mock_data.js` (100k+ news rows)
- Cache: Redis 6.2

## Test Matrix

| ID | Scenario | Steps | Expected Result | Status |
|----|----------|-------|-----------------|--------|
| F-01 | Login and profile sync | Login via chat UI, open News tab | `/api/news/me` returns user profile persisted to MySQL | Pass |
| F-02 | Browse news list | Open News tab without filters | Paginated list (20 items default) sorted by newest | Pass |
| F-03 | Category filter | Select category from dropdown, click 筛选 | List only shows news from selected category | Pass |
| F-04 | Keyword search | Input keyword, press Enter | List narrows to matching title/summary/author/category | Pass |
| F-05 | Sort by 热度 | Choose “按热度” | Items ordered by metrics score descending | Pass |
| F-06 | View detail | Click news card | Detail pane displays full content, attachments, counters increment | Pass |
| F-07 | Post comment | In detail view, submit comment | Comment saved, list refreshes, counter increments | Pass |
| F-08 | Delete own comment | Post comment, click 删除 | Comment soft-deleted, counter decrements | Pass |
| F-09 | Create news | Click 发布新闻, fill form with cover + attachment | News persists, appears at top, recent cache updates | Pass |
| F-10 | Edit news | Open self-authored news, click 编辑 | Changes save, detail + list reflect updates | Pass |
| F-11 | Delete news | Open self-authored news, click 删除 | News removed, audit log recorded for admin | Pass |
| F-12 | Admin delete | Login as root, delete other user news | Deletion succeeds, audit log entry created | Pass |
| F-13 | Category CRUD | Admin creates/updates/deletes categories | Table mutates, validations applied (cannot delete in-use) | Pass |
| F-14 | Audit log | Admin opens 管理后台 | Latest actions visible with timestamps and actor | Pass |
| F-15 | Rate limit | Rapidly POST >120 requests/min | API responds 429 with message | Pass |
| F-16 | Hot cache | Fetch `/api/news/hot` | Returns top entries, Redis sorted set populated | Pass |
| F-17 | Recent cache | Fetch `/api/news/recent` | Returns 10 latest, Redis list populated | Pass |
| F-18 | Attachments | Upload txt + pdf | Files stored under `/upload/files`, metadata saved | Pass |
| F-19 | Non-auth GET | Access detail without token | Data returned, protected actions hidden | Pass |
| F-20 | Permission enforcement | Attempt delete with non-owner | API returns 403 | Pass |

## Regression Checks
- Legacy chat features (messaging, history, file upload) verified unaffected.
- Socket reconnection continues to function while REST endpoints operate simultaneously.

## Outstanding Issues
- AI weekly briefing toggle disabled (`config.json > ai.enabled` false). Requires API credentials before activation.
- Mobile layout shares desktop component; for small screens the table view scrolls. Optional enhancement: dedicated responsive tweaks.
