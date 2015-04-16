// https://angel-alert.herokuapp.com/
// https://git.heroku.com/angel-alert.git

// Grab the API key and session secret from OS
var env = process.env;
var crunchbaseAPIKey = env.CRUNCHBASE_API_KEY;
var sessionSecret = env.SESSION_SECRET;

// Set up the base URL for API calls
var url = "https://api.crunchbase.com/v/2/";
var key = "&user_key=" + crunchbaseAPIKey;
var comma = "%2C";

// Load Express router
var express = require('express');

// Body Parser facilitates data submission from req.body on POST's
var bodyParser = require('body-parser');

// Method Override permits RESTful routing, by adding in PUT, PATCH
// and DELETE
var methodOverride = require('method-override');

// Postgres is the db
var pg = require('pg');

// Express Session permits user ID's to be saved into client cookies
var session = require('express-session');

// Use the Request package to do the API call
var request = require('request');

// Create Express app
var app = express();

// Sequelize ORM checks for models in /models directory
var db = require('./models');

// Use EJS for templating
app.set('view engine', 'ejs');

// Set the static resources directory for CSS, image files
app.use( express.static("views/site") );

// The "extended" syntax allows for rich objects and arrays 
// to be encoded into the URL-encoded format, allowing for
// a JSON-like experience with URL-encoded.
app.use(bodyParser.urlencoded({extended: true}));

// Set up method override to work with POST requests that 
// have the parameter "_method=DELETE", etc
app.use( methodOverride('_method') );

// Express session uses cookies to store User state
app.use(session({
	// Required option: This is the secret used to sign the 
	// session ID cookie
	// secret: sessionSecret,
    secret: sessionSecret,

	// Forces the session to be saved back to the session 
	// store, even if the session was never modified during 
	// the request
	resave: false,

	// Forces a session that is "uninitialized" to be saved to 
	// the store. A session is uninitialized when it is new but 
	// not modified.
	saveUninitialized: true
}));

// Create middleware methods that are available for every 
// route request: login() + currentUser() + logout()
app.use('/', function(req, res, next) {

    // Save user session on req, and identify it w/ user.id
    // To logout, just erase this session information
    
    // 1.
    req.login = function(user) {
        // set the value on session.userId
        req.session.userId = user.id;
    };
    
	// 2.
	req.currentUser = function() {

		// Search User table for id that matches the
		// userId in cookie session
		return db.User.find({
	        where: {id: req.session.userId}

	    // 
	    }).then(function(user) {
	        req.user = user;
	        console.log("User in currentUser: " + user.email);
	        return user;
	    });
	};
  
  	// 3. 
	req.logout = function() {
    	req.session.userId = null;
		req.user = null;
	}

	// Go to next middleware, or route ...
	next();
});

// LATER:
// If there is a user session, the default behavior should
// be to redirect to the user's /list route; otherwise, 
// redirect to login
app.get('/', function (req, res) {
	if (req.session.userId) {
        res.redirect('/list');
    } else { // Check for session
        res.redirect('/login');
    }
});

// USER LOGIN AND SIGNUP ROUTES

app.get('/signup', function (req, res) {
	res.render('signup');
});

// Attempt to create a user; if successful, send them to the login
// route; otherwise, redirect back to the /signup route
app.post('/signup', function(req, res) {
    var user = req.body.user;

    db.User.
        createSecure(user.email, user.password)
        .then(function(dbUser) {
            if (dbUser) {
                console.log('User ' + dbUser.email + ' successfully created!');
                res.redirect('/login');
            } else {
                console.log('User not created');
                res.redirect('/signup');
            }
        });

});

// There should be a link on this page to the /signup route
// just in case user has no account
app.get('/login', function (req, res) {
	res.render('login', {error: null});
});

// If user authenticates, send them to the /profile route;
// otherwise, return them to /login route
app.post('/login', function(req, res) {
    var user = req.body.user;
    
    db.User
    .authenticate(user.email, user.password)
    .then(function(User) {
        if (User) {
            console.log('User ' + User.email + ' authenticated!');
            req.login(User);
            res.redirect('/search');

        // Our error handling on authentication is very
        // minimal at this point, so if authentication does
        // not produce a user, then just redirect to the
        // login route
        } else {
            var msg = "Not a valid email or password.";
            res.render('login', {error: msg});
        }
    });
});

// Provide a form from which locations and company categories
// can be selected
app.get('/user', function(req,res) {
    if (req.session.userId) {

        console.log("GET /user");
       	console.log("req.session.userId: " + req.session.userId);

    	// and locations, so I'll use a promise inside of a
    	// promise, and not render until both have returned:
    	db.UserCategory.findAll( {where: {user_id: req.session.userId}} )
   	 		.then(function(dbCategories) {
 	 			console.log("Categories for a particular user:")
                console.log(dbCategories);

				db.UserLocation.findAll( {where: {user_id: req.session.userId}} )
						.then(function(dbLocations) {

							res.render('user', 
								{locations: dbLocations,
								 categories: dbCategories});

						}); // End of Location Promise

	 	 	}); // End of Category Promise

    } else { // Checking for session
        res.redirect('/login');
    }
});

// Accept lists of locations and categories to pay attention to
app.post('/user', function(req,res) {
    console.log("POST /user");

    // Catch new values from form submission
    var body = req.body;
    var location = body.location;
    var category = body.category;

    var locationDeletions = [];
    var categoryDeletions = [];

    // Identify location & category deletions
    for(var i=1; i<101; i++) {
        if (body.hasOwnProperty('spot_'+i)) {
            locationDeletions.push(i);
        }
        if (body.hasOwnProperty('cat_'+i)) {
            categoryDeletions.push(i);
        }
    }

    if(locationDeletions.length > 0) {
        db.UserLocation.destroy({where: {id: locationDeletions}})
            .then(function(dbResult) {
                console.log(dbResult);
            });
    }

    if(categoryDeletions.length > 0) {
        db.UserCategory.destroy({where: {id: categoryDeletions}})
            .then(function(dbResult) {
                console.log(dbResult);
            });
    }

    // If there is a submission, add it to the db for the
    // current session user
    if (location) {
    	// The first step is to convert that location string
    	// into a location ID with an API call
    	console.log("POST /user location: " + location);

    	// For now, we will hardcode San Francisco as the
    	// location.  If time does not permit a better solution,
    	// I can just stick to the region.
    	var SFCity = '528f5e3c90d111115d1c2e4ff979d58e';
    	var SFRegion = 'eb879a83c91a121e0bb8829782dbcf04';
    	var SFLocation = 'San Francisco Region';

		db.UserLocation.create({user_id: req.session.userId, location_id: SFRegion, name: SFLocation})
		  	.then(function(dbResult) {
		  		console.log(dbResult);
		  	});
     }

     // If a category is added within the submitted form, then look up all
     // of the categories' associated data -- namely, the path and uuid --
     // and then save that into the UserCategory db so that this information
     // can be quickly accessed at a later point
     if (category) {
    	console.log("POST /user category: " + category);

        // First, look up the category ...
        db.Category.findAll( {where: {name: category}} )
            .then(function(dbCategories) {

                // if (!dbCategories) {
                //     console.log("No category of this name was found!");
                //     res.redirect('/user');
                // }

                console.log(dbCategories);

                // For now, just check for exact textual equivalence
                var dbCategory = null;
                console.log("curCategory:");
                dbCategories.forEach(function(curCategory) {
                    // console.log(curCategory);
                    if (curCategory.name.toUpperCase() ===
                        category.toUpperCase()) {
                        dbCategory = curCategory;
                    }
                });

                if (dbCategory) {

                    // If that happens, then create the new category for 
                    // a specific user
                    db.UserCategory.create({user_id: req.session.userId,
                        category_name: dbCategory.name, 
                        category_path: dbCategory.path,
                        category_uuid: dbCategory.uuid})
                        .then(function(dbResult) {
                            console.log(dbResult);
                            res.redirect('/user');
                    });

                } else {
                    console.log("No category of this name was found!");
                    res.redirect('/user');
                }
            }); // End of db.Category promise
     } // End of category submission

     // If the page hasn't been redirected by now, then do it
     // WARNING: THIS CREATES A SITUATION WHERE THE PAGE DOES NOT
     // PROPERLY UPDATE AFTER ALL CHANGES HAVE BEEN MADE ... GOING
     // TO MOVE ON FOR NOW ...
     res.redirect('/user');
});

// COMPANY ROUTES: THIS IS NOT A NECESSARY FEATURE FOR MVP

// User should be able to maintain a particular list of companies
// to track over time
app.get('/companies', function (req, res) {
    if (req.session.userId) {

    	req.currentUser().then(function(user) {
    		res.send("User: " + user.email);
    	});

    } else { // Check for session
        res.redirect('/login');
    }
});

// Add a new company to the track list
app.post('/companies', function (req, res) {
//	var newCompany = req.body.company;

	res.send("Create new company in list");
});

// View details for a particular company
app.get('/company/:id', function (req, res) {
    if (req.session.userId) {

    	var company = req.params.id;

    	res.render('company', {companyId: company});

    } else { // Check for session
        res.redirect('/login');
    }
});

// Delete company from track list
app.delete('/company/:id', function (req, res) {
	var company = req.params.id;
	
	res.send("Company id to delete: " + company);
});

// SEARCH ROUTES

// Brings up search page, from which the user can spawn
// a call to the CrunchBase API
app.get('/search', function (req, res) {
    if (req.session.userId) {

        // The search page requires db queries for both categories
        // and locations, so I'll use a promise inside of a
        // promise, and not render until both have returned:
        db.UserCategory.findAll( {where: {user_id: req.session.userId}} )
                .then(function(dbCategories) {
                    console.log("Categories for a particular user:")
                    console.log(dbCategories);

                    db.UserLocation.findAll( {where: {user_id: req.session.userId}} )
                            .then(function(dbLocations) {

                                res.render('search', 
                                    {locations: dbLocations,
                                     categories: dbCategories});

                            }); // End of Location Promise

                }); // End of Category Promise

    } else { // Check for session
        res.redirect('/login');
    }
});

// This is where the CrunchBase API call goes; should
// re-render the search page to show search results
app.post('/search', function (req, res) {
    // Grab values from POST
    var body = req.body;

    // Grab user-defined locations from UserLocations
    db.UserLocation.all()
        .then(function(dbLocations) {

            // Grab user-defined categories from UserCategories
            db.UserCategory.all()
                .then(function(dbCategories) {

                    // Sample API call:
                    // https://api.crunchbase.com/v/2/organizations?location_uuids=eb879a83c91a121e0bb8829782dbcf04&category_uuids=ae8f68d29319f2c235494f1ac2851660&user_key=054ee27637667c7969ed512eb8ac5d02&page=1

                	// Build the API call:

                    // For Reference:
                    // var url = "https://api.crunchbase.com/v/2/";
                    // var key = "?user_key=" + crunchbaseAPIKey;
                    // var comma = "%2C";

                    // 3D Printing UUID:
                    // ae8f68d29319f2c235494f1ac2851660
                    // 3D UUID:
                    // 2e43393be05e1e660538c576d1a5c26b

                    // SF Region location UUID:
                    var SanFrancisco = "eb879a83c91a121e0bb8829782dbcf04";

                    // Add in query parameter question mark after /organizations
                    // route under all circumstances
                    var APICall = url + "organizations?";

                    // LATER: USE REQUEST() TO CALL THE API
                    // var options = {
                    //   url: APICall,
                    //   headers: {
                    //     'location_uuids': 'request'
                    //   }
                    // };
                     
                    // function callback(error, response, body) {
                    //   if (!error && response.statusCode == 200) {
                    //     var info = JSON.parse(body);
                    //     console.log(info.stargazers_count + " Stars");
                    //     console.log(info.forks_count + " Forks");
                    //   }
                    // }
                    // request(options, callback);

                    // For now, assume location is San Francisco region
                    // LATER: EXPAND ABILITY TO SELECT OTHER REGIONS
                    if (dbLocations.length > 0) {
                        APICall += "location_uuids=" + SanFrancisco;
                    }

                    if (dbCategories.length > 0) {
                        APICall += "&category_uuids=";

                        dbCategories.forEach(function(dbCategory) {
                            APICall += dbCategory.category_uuid + comma;
                        });

                        // APICall += dbCategories.reduce(function(prev,cur,index,arr) {
                        //     return prev.name + comma + cur.name;
                        // }, "&category_uuids=");
                    }

                    // Remove the last comma (%2C)
                    APICall = APICall.slice(0,APICall.length-3);

                    APICall += key;

                    console.log(APICall);

                    var APIResponse = null;
                    request(APICall, function (error, response, body) {
                        if (!error && response.statusCode == 200) {
                            console.log("body:");
                            console.log(body);

                            // LATER: CHECK TO SEE IF THERE ARE MULTIPLE PAGES TO THE
                            // RESPONSE, AND CREATE ADDITIONAL REQUESTS TO CAPTURE
                            // THAT DATA IF SO

                            APIResponse = JSON.parse(body);

                            // Testing to see if I can pick out an individual item
                            console.log("body.data.items[0]:");
                            console.log(APIResponse.data.items[0]);

                            // Now, render the /list route with this JSON object
                            res.render('list', {companies: APIResponse.data.items, metadata: APIResponse.metadata});

                        } else {

                        }
                    });

                	// render with API results ...
                	// res.render('companies', {});

            }); // End of UserCategory promise
    }); // End of UserLocation promise
});

db.sequelize.sync().then(function() {
    app.listen(process.env.PORT || 3000, function() {
        var msg = "* Listening on Port 3000 *";

        /*
         * When the server starts listening, it displays:
         *
         *  **************************
         *  * Listening on Port 3000 *
         *  **************************
         *
        */
        console.log(Array(msg.length + 1).join("*"));
        console.log(msg);
        console.log(Array(msg.length + 1).join("*"));
    });
});