const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const Product = require('../models/Product');
const Category = require('../models/Category');

const jobs = {};

const bulkUpload = async (req, res) => {
  if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' });

  const jobId = uuidv4();
  jobs[jobId] = { status: 'processing', total: 0, processed: 0, errors: [], startedAt: new Date() };

  res.status(202).json({ success: true, jobId, message: 'Upload received. Processing in background.' });

  // ✅ pass original filename
  processFile(req.file.path, jobId, req.file.originalname).catch((err) => {
    jobs[jobId].status = 'failed';
    jobs[jobId].errorMessage = err.message;
    console.error('Bulk upload error:', err);
  });
};

async function processFile(filePath, jobId, originalName) {
  try {
    const absolutePath = path.isAbsolute(filePath)
      ? filePath
      : path.join(process.cwd(), filePath);

    // ✅ use original filename extension, not saved filename
    const ext = path.extname(originalName).toLowerCase();

    if (!['.csv', '.xlsx', '.xls'].includes(ext)) {
      throw new Error('Unsupported file format: ' + ext);
    }

    const workbook = XLSX.readFile(absolutePath);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });

    jobs[jobId].total = rows.length;

    // Preload categories
 const categories = await Category.findAll({ attributes: ['id', 'name'] });
const categoryMap = {};
categories.forEach((c) => { categoryMap[c.name.toLowerCase().trim()] = c.id; });

console.log('Loaded categories:', categories.map(c => c.name)); // ✅ add this
console.log('categoryMap keys:', Object.keys(categoryMap));      // ✅ add this

 
const CHUNK_SIZE = 100;
for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
  const chunk = rows.slice(i, i + CHUNK_SIZE);
  const toInsert = [];

  for (let idx = 0; idx < chunk.length; idx++) {
    const row = chunk[idx];
    const name = String(row['name'] || row['Name'] || '').trim();
    const price = parseFloat(row['price'] || row['Price'] || 0);
    const categoryNameRaw = String(row['category'] || row['Category'] || '').trim();
    const categoryKey = categoryNameRaw.toLowerCase();

    let categoryId = categoryMap[categoryKey];

    // ✅ auto-create category if it doesn't exist yet
    if (!categoryId && categoryKey) {
      try {
        const [category] = await Category.findOrCreate({
          where: { name: categoryNameRaw },
          defaults: { name: categoryNameRaw },
        });
        categoryId = category.id;
        categoryMap[categoryKey] = categoryId; // cache for subsequent rows in this job
      } catch (err) {
        jobs[jobId].errors.push({
          row: i + idx + 2,
          reason: `Failed to create category "${categoryNameRaw}": ${err.message}`,
        });
        continue;
      }
    }

    const imageFile = String(row['image'] || row['Image'] || '').trim();
    const imagePath = imageFile ? `uploads/images/${imageFile}` : null;

    if (!name || isNaN(price) || price <= 0 || !categoryId) {
      jobs[jobId].errors.push({
        row: i + idx + 2,
        reason: `name="${name}" price="${price}" category="${categoryNameRaw}" categoryFound=${!!categoryId}`,
      });
      continue;
    }

    toInsert.push({
      unique_id: uuidv4(),
      name,
      price,
      category_id: categoryId,
      image: imagePath,
      is_active: true,
    });
  }

  if (toInsert.length > 0) {
    await Product.bulkCreate(toInsert);
  }

  jobs[jobId].processed += chunk.length;
}
    jobs[jobId].status = 'completed';
    jobs[jobId].completedAt = new Date();

    fs.unlink(absolutePath, () => { });
  } catch (err) {
    jobs[jobId].status = 'failed';
    jobs[jobId].errorMessage = err.message;
    console.error('Bulk upload error:', err);
  }
}

const getBulkStatus = (req, res) => {
  const job = jobs[req.params.jobId];
  if (!job) return res.status(404).json({ success: false, message: 'Job not found' });
  res.json({ success: true, data: job });
};

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