const { Op } = require('sequelize');
const { validationResult } = require('express-validator');
const Category = require('../models/Category');
const Product = require('../models/Product');

// GET /api/categories
const getAll = async (req, res) => {
  try {
    const { search, page = 1, limit = 20 } = req.query;
    const where = {};
    if (search) where.name = { [Op.like]: `%${search}%` };

    const offset = (parseInt(page) - 1) * parseInt(limit);
    const { count, rows } = await Category.findAndCountAll({
      where,
      limit: parseInt(limit),
      offset,
      order: [['createdAt', 'DESC']],
    });

    res.json({
      success: true,
      data: rows,
      pagination: { total: count, page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(count / limit) },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/categories/:id
const getOne = async (req, res) => {
  try {
    const cat = await Category.findByPk(req.params.id, { include: [{ model: Product, as: 'products' }] });
    if (!cat) return res.status(404).json({ success: false, message: 'Category not found' });
    res.json({ success: true, data: cat });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/categories
const create = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(422).json({ success: false, errors: errors.array() });

  try {
    const { name, description } = req.body;
    const exists = await Category.findOne({ where: { name } });
    if (exists) return res.status(409).json({ success: false, message: 'Category name already exists' });

    const cat = await Category.create({ name, description });
    res.status(201).json({ success: true, data: cat });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// PUT /api/categories/:id
const update = async (req, res) => {
  try {
    const cat = await Category.findByPk(req.params.id);
    if (!cat) return res.status(404).json({ success: false, message: 'Category not found' });

    const { name, description, is_active } = req.body;
    if (name && name !== cat.name) {
      const dup = await Category.findOne({ where: { name } });
      if (dup) return res.status(409).json({ success: false, message: 'Category name already exists' });
      cat.name = name;
    }
    if (description !== undefined) cat.description = description;
    if (is_active !== undefined) cat.is_active = is_active;
    await cat.save();

    res.json({ success: true, data: cat });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// DELETE /api/categories/:id
const remove = async (req, res) => {
  try {
    const cat = await Category.findByPk(req.params.id);
    if (!cat) return res.status(404).json({ success: false, message: 'Category not found' });

    const productCount = await Product.count({ where: { category_id: cat.id } });
    if (productCount > 0) {
      return res.status(400).json({ success: false, message: `Cannot delete: ${productCount} products belong to this category` });
    }

    await cat.destroy();
    res.json({ success: true, message: 'Category deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = { getAll, getOne, create, update, remove };
