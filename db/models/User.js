module.exports = function (sequelize, DataTypes) {
  const User = sequelize.define(
    'User',
    {
      username: {
        type: DataTypes.STRING(150),
      },
      password: {
        type: DataTypes.STRING(500),
      },
      first_name: {
        type: DataTypes.STRING(30),
      },
      last_name: {
        type: DataTypes.STRING(30),
      },
      is_active: {
        type: DataTypes.TINYINT,
      },
      is_enabled: {
        type: DataTypes.TINYINT,
      },
    },
    {
      tableName: 'user',
      createdAt: 'created_at',
      updatedAt: 'updated_at',
      timestamps: true,
      underscored: true,
      paranoid: false,
      classMethods: {},
    },
  );

  return User;
};
