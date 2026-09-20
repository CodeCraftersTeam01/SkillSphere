const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Exam = sequelize.define('Exam', {
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
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  passing_score: {
    type: DataTypes.INTEGER,
    defaultValue: 70,
    allowNull: false,
  },
  duration_minutes: {
    type: DataTypes.INTEGER,
    defaultValue: 60,
    allowNull: false,
  },
  questions: {
    type: DataTypes.JSON,
    allowNull: false,
    defaultValue: [],
  },
}, {
  tableName: 'exams',
  timestamps: true,
  underscored: true,
});

module.exports = Exam;
