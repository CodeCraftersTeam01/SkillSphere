const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const WithdrawalRequest = sequelize.define('WithdrawalRequest', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  wallet_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  tutor_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  amount: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
  },
  bank_name: {
    type: DataTypes.STRING(100),
    allowNull: false,
  },
  account_number: {
    type: DataTypes.STRING(50),
    allowNull: false,
  },
  account_holder_name: {
    type: DataTypes.STRING(150),
    allowNull: false,
  },
  status: {
    type: DataTypes.ENUM('pending', 'approved', 'rejected', 'completed'),
    defaultValue: 'pending',
  },
  rejection_reason: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  processed_at: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  proof_url: {
    type: DataTypes.STRING(255),
    allowNull: true,
  },
}, {
  tableName: 'withdrawal_requests',
  timestamps: true,
  underscored: true,
});

module.exports = WithdrawalRequest;
