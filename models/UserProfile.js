const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const UserProfile = sequelize.define('UserProfile', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    unique: true,
  },
  full_name: {
    type: DataTypes.STRING(150),
    allowNull: true,
  },
  avatar_url: {
    type: DataTypes.STRING(255),
    allowNull: true,
  },
  bio: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  phone_number: {
    type: DataTypes.STRING(30),
    allowNull: true,
  },
  career_goal: {
    type: DataTypes.STRING(150),
    allowNull: true,
  },
  study_preferences: {
    type: DataTypes.JSON,
    allowNull: true,
  },
}, {
  tableName: 'user_profiles',
  timestamps: true,
  underscored: true,
});

module.exports = UserProfile;
