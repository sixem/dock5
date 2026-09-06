---
sidebarOrder: 1
---

# Missions

## Create a mission

`POST /v1/missions`

### Request fields

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| name | string | Yes | A short mission name |
| startsAt | string | No | Requested UTC start time |
| instruments | array | No | Instrument identifiers |

### Response

A successful request returns `201` and a mission object. Scheduling is fictional and subject to the satellite remembering its appointment.

## Get a mission

`GET /v1/missions/:id`

Unknown identifiers return the [standard error response](./errors.md).
