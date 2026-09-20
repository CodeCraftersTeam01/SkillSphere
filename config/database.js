require('dotenv').config();
const { Sequelize } = require('sequelize');
const path = require('path');

const dialect = process.env.DB_DIALECT || 'sqlite';

let sequelize;

if (dialect === 'sqlite') {
  const storagePath = process.env.DB_STORAGE 
    ? path.resolve(__dirname, '..', process.env.DB_STORAGE) 
    : path.resolve(__dirname, '..', 'database.sqlite');

  sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: storagePath,
    logging: process.env.NODE_ENV === 'test' ? false : false, // Clean logs
  });
} else {
  sequelize = new Sequelize(
    process.env.DB_NAME || 'skillsphere',
    process.env.DB_USER || 'root',
    process.env.DB_PASS || '',
    {
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 3306,
      dialect: dialect,
      logging: false,
    }
  );
}

module.exports = sequelize;
