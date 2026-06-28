const { Router } = require('express');
const { body } = require('express-validator');
const { authenticate } = require('../middlewares/auth.middleware');
const { uploadImage, uploadBulk } = require('../middlewares/upload.middleware');

const authCtrl = require('../controllers/auth.controller');
const categoryCtrl = require('../controllers/category.controller');
const productCtrl = require('../controllers/product.controller');
const bulkCtrl = require('../controllers/bulk.controller');
const reportCtrl = require('../controllers/report.controller');

const router = Router();

// ─── Auth ────────────────────────────────────────────────────
router.post(
  '/auth/register',
  [body('name').notEmpty(), body('email').isEmail(), body('password').isLength({ min: 6 })],
  authCtrl.register
);
router.post(
  '/auth/login',
  [body('email').isEmail(), body('password').notEmpty()],
  authCtrl.login
);
router.get('/auth/profile', authenticate, authCtrl.getProfile);
router.put('/auth/profile', authenticate, authCtrl.updateProfile);

// ─── Categories ──────────────────────────────────────────────
router.get('/categories', authenticate, categoryCtrl.getAll);
router.get('/categories/:id', authenticate, categoryCtrl.getOne);
router.post(
  '/categories',
  authenticate,
  [body('name').notEmpty().trim()],
  categoryCtrl.create
);
router.put('/categories/:id', authenticate, categoryCtrl.update);
router.delete('/categories/:id', authenticate, categoryCtrl.remove);

// ─── Products ────────────────────────────────────────────────
router.get('/products', authenticate, productCtrl.getAll);
router.get('/products/bulk-template', authenticate, bulkCtrl.getTemplate);
router.get('/products/bulk-status/:jobId', authenticate, bulkCtrl.getBulkStatus);
router.get('/products/:id', authenticate, productCtrl.getOne);

router.post(
  '/products',
  authenticate,
  uploadImage.single('image'),
  [body('name').notEmpty(), body('price').isFloat({ min: 0 }), body('category_id').isInt()],
  productCtrl.create
);
router.put('/products/:id', authenticate, uploadImage.single('image'), productCtrl.update);
router.delete('/products/:id', authenticate, productCtrl.remove);

// Bulk upload
router.post('/products/bulk-upload', authenticate, uploadBulk.single('file'), bulkCtrl.bulkUpload);

// ─── Reports ─────────────────────────────────────────────────
router.get('/reports/products', authenticate, reportCtrl.downloadProductReport);

module.exports = router;
