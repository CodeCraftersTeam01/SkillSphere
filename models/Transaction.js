const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Transaction = sequelize.define('Transaction', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  transaction_code: {
    type: DataTypes.STRING(100),
    allowNull: false,
    unique: true,
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  course_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  amount: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
  },
  platform_fee: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false, // 20%
  },
  tutor_earning: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false, // 80%
  },
  payment_method: {
    type: DataTypes.STRING(50),
    allowNull: true, // e.g. 'gopay', 'qris', 'bank_transfer'
  },
  payment_status: {
    type: DataTypes.ENUM('pending', 'settlement', 'expired', 'failed'),
    defaultValue: 'pending',
  },
  payment_response: {
    type: DataTypes.JSON,
    allowNull: true,
  },
  paid_at: {
    type: DataTypes.DATE,
    allowNull: true,
  },
}, {
  tableName: 'transactions',
  timestamps: true,
  underscored: true,
});

module.exports = Transaction;
