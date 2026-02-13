// /api/server.js (Vercel)
// JSON Server + custom POST /search (clean JS operators)

const jsonServer = require('json-server');
const server = jsonServer.create();
const data = require('../db.json');          // ✅ bundle db at build-time
const router = jsonServer.router(data);      // ✅ in-memory; no writes
const middlewares = jsonServer.defaults();

server.use(middlewares);
server.use(jsonServer.bodyParser);

// Optional: simple health route so /api/server returns 200
server.get('/', (req, res) => {
  res.status(200).json({ status: 'ok', time: new Date().toISOString() });
});

/**
 * POST /search
 * Body:
 * {
 *   query?: string,
 *   filters?: {
 *     [field]: value | { like?: string, gt?: number, gte?: number, lt?: number, lte?: number } | value[]
 *   },
 *   sortBy?: string,   // default 'foundAt'
 *   order?: 'asc'|'desc',
 *   limit?: number
 * }
 *
 * - Filters records
 * - Optional simple multi-field contains search (title, description, tags)
 * - Adds simulated 'foundAt' in order of match
 * - Sorts & limits results
 */
server.post('/search', (req, res) => {
  try {
    const { query, filters = {}, sortBy = 'foundAt', order = 'asc', limit = 50 } = req.body || {};
    const db = router.db; // lowdb used by json-server

    let results = db.get('records').value();

    // Apply field filters
    Object.entries(filters).forEach(([key, value]) => {
      results = results.filter((item) => {
        const fieldVal = key.split('.').reduce((o, k) => (o == null ? o : o[k]), item);

        if (value && typeof value === 'object' && !Array.isArray(value)) {
          if ('like' in value) {
            const re = new RegExp(String(value.like), 'i');
            return re.test(String(fieldVal ?? ''));
          }
          if ('gt' in value) return fieldVal > value.gt;
          if ('gte' in value) return fieldVal >= value.gte;
          if ('lt' in value) return fieldVal < value.lt;
          if ('lte' in value) return fieldVal <= value.lte;
        }

        if (Array.isArray(value)) return value.includes(fieldVal);
        return String(fieldVal).toLowerCase() === String(value).toLowerCase();
      });
    });

    // Simple contains search across multiple fields
    if (query) {
      const q = String(query).toLowerCase();
      const fields = ['title', 'description', 'tags'];
      results = results.filter((item) =>
        fields.some((f) => {
          const v = item[f];
          if (Array.isArray(v)) return v.join(' ').toLowerCase().includes(q);
          return String(v ?? '').toLowerCase().includes(q);
        })
      );
    }

    // Simulate discovery order
    const now = Date.now();
    results = results.map((r, idx) => ({ ...r, foundAt: r.foundAt ?? new Date(now + idx).toISOString() }));

    // Sort & limit
    results.sort((a, b) => {
      const av = a[sortBy], bv = b[sortBy];
      const cmp = av > bv ? 1 : av < bv ? -1 : 0;
      return order === 'desc' ? -cmp : cmp;
    });

    const items = results.slice(0, limit);
    res.json({ count: results.length, items });
  } catch (err) {
    console.error('SEARCH_ERROR', err);
    res.status(500).json({ error: 'SEARCH_ERROR', message: String(err?.message || err) });
  }
});

// Mount default router after custom routes
server.use(router);

// Export Express app for Vercel
module.exports = server;

