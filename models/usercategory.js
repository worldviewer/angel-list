"use strict";
module.exports = function(sequelize, DataTypes) {
  var UserCategory = sequelize.define("UserCategory", {
    user_id: DataTypes.INTEGER,
    name: DataTypes.STRING
  }, {
    classMethods: {
      associate: function(models) {
        // associations can be defined here
      }
    }
  });
  return UserCategory;
};