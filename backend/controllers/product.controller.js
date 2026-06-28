const { Op } = require('sequelize');
const { validationResult } = require('express-validator');
const path = require('path');
const fs = require('fs');
const Product = require('../models/Product');
const Category = require('../models/Category');

// GET /api/products  — server-side pagination, sorting, search
const getAll = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      sortOrder = 'DESC',
      search = '',
      category_id,
    } = req.query;

    const allowedSorts = ['price', 'name', 'createdAt'];
    const safeSort = allowedSorts.includes(sortBy) ? sortBy : 'createdAt';
    const safeOrder = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
    const offset = (parseInt(page) - 1) * parseInt(limit);

    const where = {};
    if (search) {
      where.name = { [Op.like]: `%${search}%` };
    }
    if (category_id) {
      where.category_id = category_id;
    }

    const { count, rows } = await Product.findAndCountAll({
      where,
      include: [
        {
          model: Category,
          as: 'category',
          attributes: ['id', 'unique_id', 'name'],
          ...(search && !category_id
            ? {
                where: {
                  [Op.or]: [{ name: { [Op.like]: `%${search}%` } }],
                },
                required: false,
              }
            : {}),
        },
      ],
      order: [[safeSort, safeOrder]],
      limit: parseInt(limit),
      offset,
    });

    res.json({
      success: true,
      data: rows,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(count / parseInt(limit)),
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/products/:id
const getOne = async (req, res) => {
  try {
    const product = await Product.findByPk(req.params.id, {
      include: [{ model: Category, as: 'category' }],
    });
    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });
    res.json({ success: true, data: product });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/products
const create = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(422).json({ success: false, errors: errors.array() });

  try {
    const { name, price, category_id } = req.body;
    const cat = await Category.findByPk(category_id);
    if (!cat) return res.status(400).json({ success: false, message: 'Category not found' });

    const image = req.file ? `uploads/images/${req.file.filename}` : null;
    const product = await Product.create({ name, price, category_id, image });
    res.status(201).json({ success: true, data: product });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// PUT /api/products/:id
const update = async (req, res) => {
  try {
    const product = await Product.findByPk(req.params.id);
    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });

    const { name, price, category_id, is_active } = req.body;
    if (category_id) {
      const cat = await Category.findByPk(category_id);
      if (!cat) return res.status(400).json({ success: false, message: 'Category not found' });
      product.category_id = category_id;
    }
    if (name) product.name = name;
    if (price !== undefined) product.price = price;
    if (is_active !== undefined) product.is_active = is_active;

    if (req.file) {
      // Remove old image
      if (product.image && fs.existsSync(product.image)) fs.unlinkSync(product.image);
      product.image = `uploads/images/${req.file.filename}`;
    }

    await product.save();
    res.json({ success: true, data: product });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// DELETE /api/products/:id
const remove = async (req, res) => {
  try {
    const product = await Product.findByPk(req.params.id);
    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });

    if (product.image && fs.existsSync(product.image)) fs.unlinkSync(product.image);
    await product.destroy();
    res.json({ success: true, message: 'Product deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = { getAll, getOne, create, update, remove };
