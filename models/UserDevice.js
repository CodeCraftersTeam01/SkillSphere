const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const UserDevice = sequelize.define('UserDevice', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id',
    },
    onDelete: 'CASCADE',
  },
  device_id: {
    type: DataTypes.STRING(255),
    allowNull: false,
  },
  device_name: {
    type: DataTypes.STRING(150),
    allowNull: true,
    defaultValue: 'Perangkat Web',
  },
  browser: {
    type: DataTypes.STRING(100),
    allowNull: true,
  },
  os: {
    type: DataTypes.STRING(100),
    allowNull: true,
  },
  ip_address: {
    type: DataTypes.STRING(100),
    allowNull: true,
  },
  user_agent: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  is_trusted: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
  last_login_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
}, {
  tableName: 'user_devices',
  timestamps: true,
  underscored: true,
  indexes: [
    {
      fields: ['user_id', 'device_id'],
      unique: true,
    },
  ],
});

module.exports = UserDevice;
