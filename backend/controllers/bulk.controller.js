/**
 * Bulk Upload Controller
 *
 * Strategy to avoid 504 Gateway Timeout:
 * 1. Immediately respond with 202 Accepted + a jobId
 * 2. Process the file in the background (chunked inserts)
 * 3. Client polls GET /api/bulk/status/:jobId for progress
 */
const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const Product = require('../models/Product');
const Category = require('../models/Category');

// In-memory job store (use Redis in production)
const jobs = {};

// POST /api/products/bulk-upload
const bulkUpload = async (req, res) => {
  if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' });

  const jobId = uuidv4();
  jobs[jobId] = { status: 'processing', total: 0, processed: 0, errors: [], startedAt: new Date() };

  // Respond immediately — client polls for progress
  res.status(202).json({ success: true, jobId, message: 'Upload received. Processing in background.' });

  // Background processing
  processFile(req.file.path, jobId).catch((err) => {
    jobs[jobId].status = 'failed';
    jobs[jobId].errorMessage = err.message;
  });
};

async function processFile(filePath, jobId) {
  try {
    const ext = path.extname(filePath).toLowerCase();
    let rows = [];

    if (ext === '.csv' || ext === '.xlsx' || ext === '.xls') {
      const workbook = XLSX.readFile(filePath);
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });
    } else {
      throw new Error('Unsupported file format');
    }

    jobs[jobId].total = rows.length;

    // Preload all categories to avoid N+1 queries
    const categories = await Category.findAll({ attributes: ['id', 'name'] });
    const categoryMap = {};
    categories.forEach((c) => { categoryMap[c.name.toLowerCase()] = c.id; });

    const CHUNK_SIZE = 100;
    for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
      const chunk = rows.slice(i, i + CHUNK_SIZE);
      const toInsert = [];

      for (const row of chunk) {
        const name = String(row['name'] || row['Name'] || '').trim();
        const price = parseFloat(row['price'] || row['Price'] || 0);
        const categoryName = String(row['category'] || row['Category'] || '').trim().toLowerCase();
        const categoryId = categoryMap[categoryName];

        if (!name || isNaN(price) || !categoryId) {
          jobs[jobId].errors.push({ row: i + chunk.indexOf(row) + 2, reason: 'Missing/invalid name, price, or category' });
          continue;
        }

        toInsert.push({ name, price, category_id: categoryId });
      }

      if (toInsert.length > 0) {
        await Product.bulkCreate(toInsert, { ignoreDuplicates: true });
      }

      jobs[jobId].processed += chunk.length;
    }

    jobs[jobId].status = 'completed';
    jobs[jobId].completedAt = new Date();

    // Clean up uploaded file
    fs.unlink(filePath, () => {});
  } catch (err) {
    jobs[jobId].status = 'failed';
    jobs[jobId].errorMessage = err.message;
    fs.unlink(filePath, () => {});
  }
}

// GET /api/products/bulk-status/:jobId
const getBulkStatus = (req, res) => {
  const job = jobs[req.params.jobId];
  if (!job) return res.status(404).json({ success: false, message: 'Job not found' });
  res.json({ success: true, data: job });
};

// GET /api/products/bulk-template  — download a sample CSV template
const getTemplate = (req, res) => {
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet([
    ['name', 'price', 'category'],
    ['Gold Ring', '5000', 'Jewellery'],
    ['Silver Coin', '1500', 'Coins'],
  ]);
  XLSX.utils.book_append_sheet(wb, ws, 'Products');
  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

  res.setHeader('Content-Disposition', 'attachment; filename="bulk_upload_template.xlsx"');
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.send(buf);
};

module.exports = { bulkUpload, getBulkStatus, getTemplate };
