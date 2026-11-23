const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const LabSubmission = sequelize.define('LabSubmission', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  lab_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  submitted_code: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  language: {
    type: DataTypes.STRING(40),
    defaultValue: 'javascript',
    allowNull: false,
  },
  is_correct: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    allowNull: false,
  },
  score: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    allowNull: false,
  },
  verdict: {
    type: DataTypes.ENUM('correct', 'partial', 'incorrect'),
    defaultValue: 'incorrect',
    allowNull: false,
  },
  ai_feedback: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  ai_analysis: {
    type: DataTypes.JSON,
    allowNull: false,
    defaultValue: {},
  },
  ai_provider: {
    type: DataTypes.STRING(50),
    defaultValue: 'gemini',
    allowNull: false,
  },
}, {
  tableName: 'lab_submissions',
  timestamps: true,
  underscored: true,
});

module.exports = LabSubmission;
