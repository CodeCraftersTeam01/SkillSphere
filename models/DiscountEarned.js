const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const DiscountEarned = sequelize.define('DiscountEarned', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  milestone_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  discount_code: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true,
  },
  discount_percentage: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  is_used: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  used_at: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  expires_at: {
    type: DataTypes.DATE,
    allowNull: true,
  },
}, {
  tableName: 'discounts_earned',
  timestamps: true,
  underscored: true,
});

module.exports = DiscountEarned;
