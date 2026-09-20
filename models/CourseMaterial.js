const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const CourseMaterial = sequelize.define('CourseMaterial', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  section_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  title: {
    type: DataTypes.STRING(200),
    allowNull: false,
  },
  content_type: {
    type: DataTypes.ENUM('video', 'ppt', 'pdf', 'doc', 'book'),
    allowNull: false,
  },
  file_url: {
    type: DataTypes.STRING(255),
    allowNull: false,
  },
  duration_minutes: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  is_preview: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  order_index: {
    type: DataTypes.INTEGER,
    defaultValue: 1,
  },
}, {
  tableName: 'course_materials',
  timestamps: true,
  underscored: true,
});

module.exports = CourseMaterial;
