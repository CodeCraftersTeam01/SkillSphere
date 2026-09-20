const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const TutorApplication = sequelize.define('TutorApplication', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  cv_url: {
    type: DataTypes.STRING(255),
    allowNull: true,
  },
  certificate_document_url: {
    type: DataTypes.STRING(255),
    allowNull: true,
  },
  linkedin_url: {
    type: DataTypes.STRING(255),
    allowNull: true,
  },
  portfolio_url: {
    type: DataTypes.STRING(255),
    allowNull: true,
  },
  institution_name: {
    type: DataTypes.STRING(150),
    allowNull: true,
  },
  experience_years: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  status: {
    type: DataTypes.ENUM('pending', 'approved', 'rejected'),
    defaultValue: 'pending',
  },
  rejection_reason: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
}, {
  tableName: 'tutor_applications',
  timestamps: true,
  underscored: true,
});

module.exports = TutorApplication;
