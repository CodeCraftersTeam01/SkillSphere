const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Enrollment = sequelize.define('Enrollment', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  course_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  progress_percentage: {
    type: DataTypes.FLOAT,
    defaultValue: 0.0,
  },
  status: {
    type: DataTypes.ENUM('active', 'completed', 'dropped'),
    defaultValue: 'active',
  },
  enrolled_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
  completed_at: {
    type: DataTypes.DATE,
    allowNull: true,
  },
}, {
  tableName: 'enrollments',
  timestamps: true,
  underscored: true,
});

module.exports = Enrollment;
