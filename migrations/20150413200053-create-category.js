"use strict";
module.exports = {
  up: function(migration, DataTypes, done) {
    migration.createTable("Categories", {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: DataTypes.INTEGER
      },
      name: {
        type: DataTypes.STRING
      },
      path: {
        type: DataTypes.STRING
      },
      uuid: {
        type: DataTypes.STRING
      },
      number_of_organizations: {
        type: DataTypes.INTEGER
      },
      createdAt: {
        allowNull: false,
        type: DataTypes.DATE
      },
      updatedAt: {
        allowNull: false,
        type: DataTypes.DATE
      }
    }).done(done);
  },
  down: function(migration, DataTypes, done) {
    migration.dropTable("Categories").done(done);
  }
};