"use strict";
module.exports = function(sequelize, DataTypes) {
  var UserLocation = sequelize.define("UserLocation", {
    user_id: DataTypes.INTEGER,
    location_id: DataTypes.STRING,
    name: DataTypes.STRING
  }, {
    classMethods: {
      associate: function(models) {
        // associations can be defined here
      }
    }
  });
  return UserLocation;
};