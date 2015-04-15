"use strict";
module.exports = function(sequelize, DataTypes) {
  var Location = sequelize.define("Location", {
    city: DataTypes.STRING,
    location_uuid: DataTypes.STRING
  }, {
    classMethods: {
      associate: function(models) {
        this.hasMany(models.User);
      }
    }
  });
  return Location;
};