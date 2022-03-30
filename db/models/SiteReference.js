module.exports = function (sequelize, DataTypes) {
  const SiteReference = sequelize.define(
    'SiteReference',
    {
      site_name: {
        type: DataTypes.STRING(150),
      },
      description: {
        type: DataTypes.STRING(500),
      },
      site_url: {
        type: DataTypes.STRING(1024),
      },
      site_username: {
        type: DataTypes.STRING(30),
      },
      site_password: {
        type: DataTypes.STRING(30),
      },
    },
    {
      tableName: 'site_reference',
      createdAt: 'created_date',
      updatedAt: 'updated_date',
      timestamps: true,
      underscored: true,
      paranoid: false,
      classMethods: {},
    },
  );

  return SiteReference;
};
