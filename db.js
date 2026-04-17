const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// ---------------------------------------------------------------------------
// Auto-migration: create table if it doesn't exist
// ---------------------------------------------------------------------------
async function migrate() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS expenses (
      id              SERIAL PRIMARY KEY,
      expense_id      VARCHAR(255) UNIQUE NOT NULL,
      txn_id          VARCHAR(255),
      date            DATE NOT NULL,
      month           VARCHAR(7),
      merchant        VARCHAR(500),
      description     TEXT DEFAULT '',
      line_description TEXT DEFAULT '',
      comment         TEXT DEFAULT '',
      employees       TEXT DEFAULT '',
      category        VARCHAR(500) DEFAULT '',
      category_gl     VARCHAR(50) DEFAULT '',
      txn_status      VARCHAR(50) DEFAULT '',
      exp_status      VARCHAR(50) DEFAULT '',
      card_name       VARCHAR(255) DEFAULT '',
      card_number     VARCHAR(50) DEFAULT '',
      customer_type   VARCHAR(100) DEFAULT '',
      url             TEXT DEFAULT '',
      billing_amt     DECIMAL(12,2) DEFAULT 0,
      billing_ccy     VARCHAR(10) DEFAULT 'AUD',
      txn_amt         DECIMAL(12,2) DEFAULT 0,
      txn_ccy         VARCHAR(10) DEFAULT 'AUD',
      orig_amount     DECIMAL(12,2) DEFAULT 0,
      orig_currency   VARCHAR(10) DEFAULT 'AUD',
      department_project VARCHAR(500) DEFAULT '',
      raw_data        JSONB DEFAULT '{}',
      edited_fields   JSONB DEFAULT '{}',
      created_at      TIMESTAMPTZ DEFAULT NOW(),
      updated_at      TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(date);
    CREATE INDEX IF NOT EXISTS idx_expenses_month ON expenses(month);
    CREATE INDEX IF NOT EXISTS idx_expenses_expense_id ON expenses(expense_id);
  `);
  console.log('Database migration complete');
}

// ---------------------------------------------------------------------------
// GET: Retrieve expenses with optional filters
// ---------------------------------------------------------------------------
async function getExpenses({ month, dateFrom, dateTo } = {}) {
  let sql = 'SELECT * FROM expenses WHERE 1=1';
  const params = [];
  let i = 1;

  if (month) {
    sql += ` AND month = $${i++}`;
    params.push(month);
  }
  if (dateFrom) {
    sql += ` AND date >= $${i++}`;
    params.push(dateFrom);
  }
  if (dateTo) {
    sql += ` AND date <= $${i++}`;
    params.push(dateTo);
  }

  sql += ' ORDER BY date DESC, merchant ASC';
  const result = await pool.query(sql, params);

  return result.rows.map(dbRowToApp);
}

// ---------------------------------------------------------------------------
// UPSERT: Bulk insert/update from CSV data (dedup by expense_id)
// ---------------------------------------------------------------------------
async function upsertExpenses(rows) {
  let inserted = 0, updated = 0;

  // Use a transaction for atomicity
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    for (const row of rows) {
      const eid = row.expenseId;
      if (!eid) continue; // skip rows without expense ID

      // Check if exists
      const existing = await client.query(
        'SELECT id, edited_fields FROM expenses WHERE expense_id = $1',
        [eid]
      );

      if (existing.rows.length > 0) {
        // Update — but preserve user edits
        const editedFields = existing.rows[0].edited_fields || {};
        const mergedRow = { ...row };

        // Don't overwrite fields that were manually edited
        for (const field of Object.keys(editedFields)) {
          if (editedFields[field] && mergedRow[field] !== undefined) {
            // Keep the current DB value for edited fields
            // (the edit is already in the DB, don't overwrite with CSV)
          }
        }

        await client.query(`
          UPDATE expenses SET
            txn_id = $2, date = $3, month = $4, merchant = $5,
            description = CASE WHEN edited_fields ? 'description' THEN description ELSE $6 END,
            line_description = $7,
            comment = CASE WHEN edited_fields ? 'comment' THEN comment ELSE $8 END,
            employees = $9,
            category = CASE WHEN edited_fields ? 'category' THEN category ELSE $10 END,
            category_gl = $11, txn_status = $12, exp_status = $13,
            card_name = $14, card_number = $15, customer_type = $16,
            url = $17, billing_amt = $18, billing_ccy = $19,
            txn_amt = $20, txn_ccy = $21, orig_amount = $22, orig_currency = $23,
            department_project = $24, raw_data = $25,
            updated_at = NOW()
          WHERE expense_id = $1
        `, [
          eid, row.txnId || '', row.date, row.month, row.merchant || '',
          row.description || '', row.lineDescription || '', row.comment || '',
          Array.isArray(row.employees) ? row.employees.join(', ') : (row.employees || ''),
          row.category || '', row.categoryGL || '', row.txnStatus || '', row.expStatus || '',
          row.cardName || '', row.cardNumber || '', row.customerType || '',
          row.url || '', row.billingAmt || 0, row.billingCcy || 'AUD',
          row.txnAmt || 0, row.txnCcy || 'AUD', row.origAmount || 0, row.origCurrency || 'AUD',
          row.raw?.['Department/Project'] || '', JSON.stringify(row.raw || {})
        ]);
        updated++;
      } else {
        // Insert new row
        await client.query(`
          INSERT INTO expenses (
            expense_id, txn_id, date, month, merchant, description,
            line_description, comment, employees, category, category_gl,
            txn_status, exp_status, card_name, card_number, customer_type,
            url, billing_amt, billing_ccy, txn_amt, txn_ccy,
            orig_amount, orig_currency, department_project, raw_data
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11,
            $12, $13, $14, $15, $16, $17, $18, $19, $20, $21,
            $22, $23, $24, $25
          )
        `, [
          eid, row.txnId || '', row.date, row.month, row.merchant || '',
          row.description || '', row.lineDescription || '', row.comment || '',
          Array.isArray(row.employees) ? row.employees.join(', ') : (row.employees || ''),
          row.category || '', row.categoryGL || '', row.txnStatus || '', row.expStatus || '',
          row.cardName || '', row.cardNumber || '', row.customerType || '',
          row.url || '', row.billingAmt || 0, row.billingCcy || 'AUD',
          row.txnAmt || 0, row.txnCcy || 'AUD', row.origAmount || 0, row.origCurrency || 'AUD',
          row.raw?.['Department/Project'] || '', JSON.stringify(row.raw || {})
        ]);
        inserted++;
      }
    }

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }

  return { inserted, updated, total: inserted + updated };
}

// ---------------------------------------------------------------------------
// UPDATE: Edit specific fields on a single expense
// ---------------------------------------------------------------------------
async function updateExpense(expenseId, fields) {
  // Allowed editable fields
  const ALLOWED = ['description', 'comment', 'category', 'department_project'];
  const fieldMap = {
    description: 'description',
    comment: 'comment',
    category: 'category',
    project: 'department_project'
  };

  // Build the edit tracking
  const existing = await pool.query(
    'SELECT * FROM expenses WHERE expense_id = $1',
    [expenseId]
  );
  if (!existing.rows.length) return null;

  const row = existing.rows[0];
  const editedFields = row.edited_fields || {};

  const setClauses = [];
  const params = [expenseId];
  let i = 2;

  for (const [key, value] of Object.entries(fields)) {
    const dbCol = fieldMap[key];
    if (!dbCol || !ALLOWED.includes(dbCol)) continue;

    // Track the edit
    if (!editedFields[key]) {
      editedFields[key] = {
        original: row[dbCol],
        editedAt: new Date().toISOString()
      };
    }
    editedFields[key].editedAt = new Date().toISOString();

    setClauses.push(`${dbCol} = $${i++}`);
    params.push(value);
  }

  if (!setClauses.length) return dbRowToApp(row);

  setClauses.push(`edited_fields = $${i++}`);
  params.push(JSON.stringify(editedFields));

  setClauses.push(`updated_at = NOW()`);

  const sql = `UPDATE expenses SET ${setClauses.join(', ')} WHERE expense_id = $1 RETURNING *`;
  const result = await pool.query(sql, params);
  return result.rows[0] ? dbRowToApp(result.rows[0]) : null;
}

// ---------------------------------------------------------------------------
// DELETE: Remove a single expense
// ---------------------------------------------------------------------------
async function deleteExpense(expenseId) {
  const result = await pool.query(
    'DELETE FROM expenses WHERE expense_id = $1 RETURNING id',
    [expenseId]
  );
  return result.rowCount > 0;
}

// ---------------------------------------------------------------------------
// Transform: DB row → app-compatible object
// ---------------------------------------------------------------------------
function dbRowToApp(r) {
  return {
    expenseId: r.expense_id,
    txnId: r.txn_id,
    date: r.date instanceof Date ? r.date.toISOString().slice(0, 10) : String(r.date || '').slice(0, 10),
    month: r.month,
    merchant: r.merchant,
    description: r.description,
    lineDescription: r.line_description,
    comment: r.comment,
    employees: (r.employees || '').split(',').map(s => s.trim()).filter(Boolean),
    category: r.category,
    categoryGL: r.category_gl,
    txnStatus: r.txn_status,
    expStatus: r.exp_status,
    cardName: r.card_name,
    cardNumber: r.card_number,
    customerType: r.customer_type,
    url: r.url,
    billingAmt: parseFloat(r.billing_amt) || 0,
    billingCcy: r.billing_ccy,
    txnAmt: parseFloat(r.txn_amt) || 0,
    txnCcy: r.txn_ccy,
    origAmount: parseFloat(r.orig_amount) || 0,
    origCurrency: r.orig_currency,
    raw: r.raw_data || {},
    _edited: r.edited_fields || {},
    _dbId: r.id
  };
}

module.exports = { pool, migrate, getExpenses, upsertExpenses, updateExpense, deleteExpense };
