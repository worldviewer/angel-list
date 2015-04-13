"use strict";

// Use bcrypt to create password hashes for DB storage
var bcrypt = require("bcrypt");

// salt + password = password_digest
var salt = bcrypt.genSaltSync(10);

module.exports = function (sequelize, DataTypes) {

    // defining a sequelize model
    var User = sequelize.define('User', {

        /**** THESE ARE ATTRIBUTES *****/

        // attribute: email
        email: {
            type: DataTypes.STRING, 
            unique: true,

            // email validation
            validate: {
                len: [6, 30] // check length on create
            }
        },

        // attribute: password
        password_digest: { 
            type: DataTypes.STRING,
            validate: {
                notEmpty: true // validates presence
            }
        }
    },
    /**** END OF ATTRIBUTES *****/
   
    {
        instanceMethods: { 

            // these belong to a particular user
            // eg, bill.checkPassword("foo") or jane.checkPassword("bar")
            checkPassword: function(password) {
                return bcrypt.compareSync(password, this.password_digest);
            }
        },

        classMethods: {

            // these belong on the User constructor,
            // eg, db.User.encryptPassword
            // encryptPassword() is a helper method createSecure()
            // which calls a hashing function on password
            encryptPassword: function(password) {
                var hash = bcrypt.hashSync(password, salt);
                return hash;
            },
          
            // Start here to securely create a user
            createSecure: function(email, password) { 
                              //   ^ -- attrs --^  
            if (password.length < 6) {
                throw new Error("Password too short!");
            }

            // then return the created object
            return this.create({
                email: email,
                password_digest: this.encryptPassword(password) 
                                // call encryptPassword
                                // don't want to save raw Password
                });
            },

            authenticate: function(email, password) {

                // find a user in the database
                return this.find({
                    where: {
                        email: email
                    }
                })

                .then (function(user) {
                  if (user === null) {
                    throw new Error("Email does not exist");
                  } else if (user.checkPassword(password)) {
                    return user;
                  }

                });
            }   
    
        } // close classMethods
    }); // close User Model

    return User;
};