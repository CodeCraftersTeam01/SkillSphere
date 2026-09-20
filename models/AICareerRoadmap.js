const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const AICareerRoadmap = sequelize.define('AICareerRoadmap', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  target_role: {
    type: DataTypes.STRING(150),
    allowNull: false,
  },
  recommended_skills: {
    type: DataTypes.JSON,
    allowNull: true,
  },
  roadmap_data: {
    type: DataTypes.JSON,
    allowNull: false,
  },
  status: {
    type: DataTypes.ENUM('draft', 'active', 'completed'),
    defaultValue: 'active',
  },
}, {
  tableName: 'ai_career_roadmaps',
  timestamps: true,
  underscored: true,
});

module.exports = AICareerRoadmap;
