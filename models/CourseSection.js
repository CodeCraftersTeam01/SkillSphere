const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const CourseSection = sequelize.define('CourseSection', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  course_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  title: {
    type: DataTypes.STRING(200),
    allowNull: false,
  },
  order_index: {
    type: DataTypes.INTEGER,
    defaultValue: 1,
  },
}, {
  tableName: 'course_sections',
  timestamps: true,
  underscored: true,
});

module.exports = CourseSection;
