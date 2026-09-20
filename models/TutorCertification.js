const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const TutorCertification = sequelize.define('TutorCertification', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  tutor_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  certificate_name: {
    type: DataTypes.STRING(200),
    allowNull: false,
  },
  issuer: {
    type: DataTypes.STRING(150),
    allowNull: false,
  },
  issue_date: {
    type: DataTypes.DATEONLY,
    allowNull: true,
  },
  expiry_date: {
    type: DataTypes.DATEONLY,
    allowNull: true,
  },
  credential_id: {
    type: DataTypes.STRING(100),
    allowNull: true,
  },
  credential_url: {
    type: DataTypes.STRING(255),
    allowNull: true,
  },
  is_verified: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  verified_at: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  verified_by: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
}, {
  tableName: 'tutor_certifications',
  timestamps: true,
  underscored: true,
});

module.exports = TutorCertification;
