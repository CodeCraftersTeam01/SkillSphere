const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const CourseMilestone = sequelize.define('CourseMilestone', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  course_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  section_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  title: {
    type: DataTypes.STRING(200),
    allowNull: false,
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  target_days: {
    type: DataTypes.INTEGER,
    defaultValue: 3,
    allowNull: false,
  },
  reward_discount_percentage: {
    type: DataTypes.INTEGER,
    defaultValue: 10,
    allowNull: false,
  },
}, {
  tableName: 'course_milestones',
  timestamps: true,
  underscored: true,
});

module.exports = CourseMilestone;
