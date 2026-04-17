const express = require('express');
const path = require('path');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;
const PIN_HASH = parseInt(process.env.PIN_HASH || '1600858', 10); // hash of '4471'

app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// ---------------------------------------------------------------------------
// Middleware: PIN check for write operations
// ---------------------------------------------------------------------------
function requirePin(req, res, next) {
  const pin = req.headers['x-pin-hash'];
  if (!pin || parseInt(pin, 10) !== PIN_HASH) {
    return res.status(401).json({ error: 'Invalid PIN' });
  }
  next();
}

// ---------------------------------------------------------------------------
// GET /api/expenses — list all expenses, with optional filters
// ---------------------------------------------------------------------------
app.get('/api/expenses', async (req, res) => {
  try {
    const { month, dateFrom, dateTo } = req.query;
    const rows = await db.getExpenses({ month, dateFrom, dateTo });
    res.json({ ok: true, count: rows.length, rows });
  } catch (err) {
    console.error('GET /api/expenses error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// POST /api/expenses — bulk upsert from CSV upload (dedup by expense_id)
// ---------------------------------------------------------------------------
app.post('/api/expenses', requirePin, async (req, res) => {
  try {
    const { rows } = req.body;
    if (!Array.isArray(rows) || !rows.length) {
      return res.status(400).json({ error: 'No rows provided' });
    }
    const result = await db.upsertExpenses(rows);
    res.json({ ok: true, ...result });
  } catch (err) {
    console.error('POST /api/expenses error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// PUT /api/expenses/:id — update a single expense field(s)
// ---------------------------------------------------------------------------
app.put('/api/expenses/:id', requirePin, async (req, res) => {
  try {
    const { id } = req.params;
    const { fields } = req.body; // { description: "new val", comment: "new val", ... }
    if (!fields || typeof fields !== 'object') {
      return res.status(400).json({ error: 'No fields provided' });
    }
    const updated = await db.updateExpense(id, fields);
    if (!updated) return res.status(404).json({ error: 'Expense not found' });
    res.json({ ok: true, row: updated });
  } catch (err) {
    console.error('PUT /api/expenses/:id error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// DELETE /api/expenses/:id — delete a single expense
// ---------------------------------------------------------------------------
app.delete('/api/expenses/:id', requirePin, async (req, res) => {
  try {
    const deleted = await db.deleteExpense(req.params.id);
    if (!deleted) return res.status(404).json({ error: 'Not found' });
    res.json({ ok: true });
  } catch (err) {
    console.error('DELETE /api/expenses/:id error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// GET /api/health
// ---------------------------------------------------------------------------
app.get('/api/health', async (req, res) => {
  try {
    await db.pool.query('SELECT 1');
    res.json({ ok: true, db: 'connected' });
  } catch (err) {
    res.status(500).json({ ok: false, db: 'disconnected', error: err.message });
  }
});

// SPA fallback
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ---------------------------------------------------------------------------
// Startup
// ---------------------------------------------------------------------------
async function start() {
  await db.migrate();
  app.listen(PORT, () => {
    console.log(`INCYT Expense Report running on port ${PORT}`);
  });
}

start().catch(err => {
  console.error('Failed to start:', err);
  process.exit(1);
});
