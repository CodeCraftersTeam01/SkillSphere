const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Certificate = sequelize.define('Certificate', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  certificate_code: {
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
  exam_result_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  issue_date: {
    type: DataTypes.DATEONLY,
    defaultValue: DataTypes.NOW,
  },
  certificate_url: {
    type: DataTypes.STRING(255),
    allowNull: true,
  },
}, {
  tableName: 'certificates',
  timestamps: true,
  underscored: true,
});

module.exports = Certificate;
