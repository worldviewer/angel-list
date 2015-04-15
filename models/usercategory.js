"use strict";
module.exports = function(sequelize, DataTypes) {
  var UserCategory = sequelize.define("UserCategory", {
    user_id: DataTypes.INTEGER,
    category_name: DataTypes.STRING,
    category_path: DataTypes.STRING,
    category_uuid: DataTypes.STRING
  }, {
    classMethods: {
      associate: function(models) {
        // associations can be defined here
      }
    }
  });
  return UserCategory;
};
