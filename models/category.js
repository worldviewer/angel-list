"use strict";
module.exports = function(sequelize, DataTypes) {
  var Category = sequelize.define("Category", {
    name: DataTypes.STRING,
    path: DataTypes.STRING,
    uuid: DataTypes.STRING,
    number_of_organizations: DataTypes.INTEGER
  }, {
    classMethods: {
      associate: function(models) {
        this.hasMany(models.User);
      }
    }
  });
  return Category;
};