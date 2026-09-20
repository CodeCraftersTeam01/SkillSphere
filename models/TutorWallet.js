const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const TutorWallet = sequelize.define('TutorWallet', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  tutor_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    unique: true,
  },
  balance: {
    type: DataTypes.DECIMAL(12, 2),
    defaultValue: 0.00,
    allowNull: false, // Available for withdrawal
  },
  pending_balance: {
    type: DataTypes.DECIMAL(12, 2),
    defaultValue: 0.00,
    allowNull: false, // Under 7-day holding period
  },
}, {
  tableName: 'tutor_wallets',
  timestamps: true,
  underscored: true,
});

module.exports = TutorWallet;
