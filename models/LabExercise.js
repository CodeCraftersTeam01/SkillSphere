const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const LabExercise = sequelize.define('LabExercise', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  course_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  created_by: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  room_type: {
    type: DataTypes.ENUM('lab', 'practicum'),
    defaultValue: 'lab',
    allowNull: false,
  },
  challenge_mode: {
    type: DataTypes.ENUM('create', 'fix'),
    defaultValue: 'create',
    allowNull: false,
  },
  title: {
    type: DataTypes.STRING(200),
    allowNull: false,
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  language: {
    type: DataTypes.STRING(40),
    defaultValue: 'javascript',
    allowNull: false,
  },
  difficulty: {
    type: DataTypes.ENUM('beginner', 'intermediate', 'advanced'),
    defaultValue: 'beginner',
    allowNull: false,
  },
  starter_code: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  solution_reference: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  expected_output: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  test_cases: {
    type: DataTypes.JSON,
    allowNull: false,
    defaultValue: [],
  },
  hints: {
    type: DataTypes.JSON,
    allowNull: false,
    defaultValue: [],
  },
  passing_score: {
    type: DataTypes.INTEGER,
    defaultValue: 75,
    allowNull: false,
  },
  is_published: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    allowNull: false,
  },
}, {
  tableName: 'lab_exercises',
  timestamps: true,
  underscored: true,
});

module.exports = LabExercise;
