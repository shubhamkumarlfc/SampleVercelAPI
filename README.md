# SampleVercelAPI

# Mock Search API (Vercel)

A JSON Server mock API with a custom **POST /search** endpoint that accepts a JSON body and returns results in the order they’re “found”, with optional filters and sorting.

## Endpoints

- `POST /search` → handled via Vercel rewrite to `/api/search`
- `GET /records` → standard JSON Server collection

### Example search body

```json
{
  "query": "laptop",
  "filters": { "category": ["electronics"], "price": { "lte": 1500 } },
  "sortBy": "foundAt",
  "order": "asc",
  "limit": 5
}
