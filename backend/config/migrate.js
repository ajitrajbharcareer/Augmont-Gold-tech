require('dotenv').config();
const sequelize = require('./database');
const User = require('../models/User');
const Category = require('../models/Category');
const Product = require('../models/Product');

// Define associations
Category.hasMany(Product, { foreignKey: 'category_id', as: 'products' });
Product.belongsTo(Category, { foreignKey: 'category_id', as: 'category' });

const migrate = async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ DB connection established.');
    await sequelize.sync({ alter: true });
    console.log('✅ All models synchronized.');
    process.exit(0);
  } catch (err) {
    console.error('❌ Migration failed:', err);
    process.exit(1);
  }
};

migrate();
