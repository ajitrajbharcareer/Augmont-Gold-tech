/**
 * Report Controller
 *
 * Strategy to avoid 504 Gateway Timeout on large exports:
 * - For CSV: stream rows directly to response using Node.js streams + DB cursor (offset batching)
 * - For XLSX: batch-fetch rows and write chunks to buffer, then send — acceptable for <100k rows
 */
const XLSX = require('xlsx');
const { Op } = require('sequelize');
const Product = require('../models/Product');
const Category = require('../models/Category');
const sequelize = require('../config/database');

// GET /api/reports/products?format=csv|xlsx&category_id=&search=
const downloadProductReport = async (req, res) => {
  const { format = 'csv', category_id, search } = req.query;

  const where = {};
  if (search) where.name = { [Op.like]: `%${search}%` };
  if (category_id) where.category_id = category_id;

  try {
    if (format === 'csv') {
      // Stream CSV row by row to avoid memory bloat
      res.setHeader('Content-Disposition', 'attachment; filename="products_report.csv"');
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.write('\uFEFF'); // BOM for Excel UTF-8 compatibility
      res.write('ID,Unique ID,Name,Price,Category,Active,Created At\n');

      const BATCH = 500;
      let offset = 0;
      let hasMore = true;

      while (hasMore) {
        const rows = await Product.findAll({
          where,
          include: [{ model: Category, as: 'category', attributes: ['name'] }],
          order: [['id', 'ASC']],
          limit: BATCH,
          offset,
        });

        for (const p of rows) {
          const line = [
            p.id,
            p.unique_id,
            `"${(p.name || '').replace(/"/g, '""')}"`,
            p.price,
            `"${p.category?.name || ''}"`,
            p.is_active ? 'Yes' : 'No',
            p.createdAt.toISOString(),
          ].join(',');
          res.write(line + '\n');
        }

        offset += BATCH;
        hasMore = rows.length === BATCH;
      }

      res.end();
    } else {
      // XLSX — load in batches, build workbook
      const BATCH = 1000;
      let offset = 0;
      let hasMore = true;
      const allRows = [['ID', 'Unique ID', 'Name', 'Price (INR)', 'Category', 'Active', 'Created At']];

      while (hasMore) {
        const rows = await Product.findAll({
          where,
          include: [{ model: Category, as: 'category', attributes: ['name'] }],
          order: [['id', 'ASC']],
          limit: BATCH,
          offset,
        });

        for (const p of rows) {
          allRows.push([
            p.id,
            p.unique_id,
            p.name,
            parseFloat(p.price),
            p.category?.name || '',
            p.is_active ? 'Yes' : 'No',
            p.createdAt.toISOString(),
          ]);
        }

        offset += BATCH;
        hasMore = rows.length === BATCH;
      }

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.aoa_to_sheet(allRows);

      // Column widths
      ws['!cols'] = [{ wch: 8 }, { wch: 36 }, { wch: 30 }, { wch: 14 }, { wch: 20 }, { wch: 8 }, { wch: 22 }];

      XLSX.utils.book_append_sheet(wb, ws, 'Products');
      const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

      res.setHeader('Content-Disposition', 'attachment; filename="products_report.xlsx"');
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.send(buf);
    }
  } catch (err) {
    if (!res.headersSent) {
      res.status(500).json({ success: false, message: err.message });
    } else {
      res.end();
    }
  }
};

module.exports = { downloadProductReport };
