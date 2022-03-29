const db_config = {
  username: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  dialect: 'mysql',
  define: {
    freezeTableName: true,
    operatorsAliases: false,
    underscored: false,
    returning: true,
  },
  timezone: '-07:00',
  pool: {
    max: 5,
    min: 0,
    idle: 20000,
    acquire: 20000,
  },
  logging: false,
  operatorsAliases: false,
  use_env_variable: false,
};

module.exports = {
  default: db_config,
  development: db_config,
  production: db_config,
};
