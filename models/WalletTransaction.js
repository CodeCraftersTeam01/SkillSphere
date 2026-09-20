const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const WalletTransaction = sequelize.define('WalletTransaction', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  wallet_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  transaction_type: {
    type: DataTypes.ENUM('credit', 'debit'),
    allowNull: false,
  },
  amount: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
  },
  reference_id: {
    type: DataTypes.STRING(100),
    allowNull: true,
  },
  reference_type: {
    type: DataTypes.ENUM('sale', 'withdrawal', 'adjustment'),
    allowNull: false,
  },
  description: {
    type: DataTypes.STRING(255),
    allowNull: true,
  },
}, {
  tableName: 'wallet_transactions',
  timestamps: true,
  underscored: true,
  updatedAt: false, // Mutation history is append-only
});

module.exports = WalletTransaction;
