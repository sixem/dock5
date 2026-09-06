---
sidebarLabel: Quickstart
---

# Send your first mission request

## Create a mission

```sh
curl https://api.orbit.example/v1/missions \
  -H 'Authorization: Bearer example-token' \
  -H 'Content-Type: application/json' \
  -d '{"name":"Count the clouds"}'
```

## Read the response

```json
{
  "id": "mission_001",
  "name": "Count the clouds",
  "status": "queued"
}
```

See the [request fields](./reference/v1/missions.md#request-fields) and [error format](./reference/v1/errors.md).
