const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const ExamResult = sequelize.define('ExamResult', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  exam_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  enrollment_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  score: {
    type: DataTypes.FLOAT,
    allowNull: false,
  },
  is_passed: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  answers_data: {
    type: DataTypes.JSON,
    allowNull: true,
  },
  submitted_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
}, {
  tableName: 'exam_results',
  timestamps: true,
  underscored: true,
});

module.exports = ExamResult;
