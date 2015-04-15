// Grab the API key and session secret from OS
var env = process.env;
var crunchbaseAPIKey = env.CRUNCHBASE_API_KEY;
var sessionSecret = env.SESSION_SECRET;

// Set up the base URL for API calls
var url = "https://api.crunchbase.com/v/2/";
var key = "?user_key=" + crunchbaseAPIKey;

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

// If there is a user session, redirect to the user's
// track list; otherwise, redirect to login
app.get('/', function (req, res) {
	res.send('Homepage');
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
	res.render('login');
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
            res.redirect('/login');
        }
    });
});

// Provide a form from which locations and company categories
// can be selected
app.get('/list', function(req,res) {
    console.log("GET /list");

   	console.log("req.session.userId: " + req.session.userId);

	// and locations, so I'll use a promise inside of a
	// promise, and not render until both have returned:
	db.UserCategory.findAll( {where: {user_id: req.session.userId}} )
 	 		.then(function(dbCategories) {
 	 			console.log("Categories for a particular user:")
                console.log(dbCategories);

				db.UserLocation.findAll( {where: {user_id: req.session.userId}} )
						.then(function(dbLocations) {

							res.render('list', 
								{locations: dbLocations,
								 categories: dbCategories});

						}); // End of Location Promise

	 	 	}); // End of Category Promise

});

// Accept lists of locations and categories to pay attention to
app.post('/list', function(req,res) {
    console.log("POST /list");

    // Catch new values from form submission
    var body = req.body;
    var location = body.location;
    var category = body.category;

    // Handle location deletions
    // Assume maximum of 10 locations
    for(var i=1; i<11; i++) {
        if (body.hasOwnProperty('spot_'+i)) {

            db.UserLocation.destroy({where: {id: i}})
                .then(function(dbResult) {
                    console.log(dbResult);
                });

        }
    }

    // Handle category deletions
    // Assume maximum of 100 locations
    for(var i=1; i<101; i++) {
        if (body.hasOwnProperty('cat_'+i)) {

            db.UserCategory.destroy({where: {id: i}})
                .then(function(dbResult) {
                    console.log(dbResult);
                });

        }
    }

    // If there is a submission, add it to the db for the
    // current session user
    if (location) {
    	// The first step is to convert that location string
    	// into a location ID with an API call
    	console.log("POST /list location: " + location);

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

     if (category) {
    	console.log("POST /list category: " + category);
 		db.UserCategory.create({user_id: req.session.userId, name: category})
	 	  	.then(function(dbResult) {
	 	  		console.log(dbResult);
 	  	});
     }

     res.redirect('/list');
});

app.get('/list/:type/:id', function(req,res) {
    console.log("DELETE /list");

    var type = req.params.type;
    var id = req.params.id;
    var body = req.body;

    // Delete the location designated by id
    if (type === "loc") {

        db.UserLocation.delete(id)
            .then(function(dbResult) {
                console.log(dbResult);
            });

    // Delete the category designated by id
    } else if (type === "cat") {

        db.UserCategory.delete(id)
            .then(function(dbResult) {
                console.log(dbResult);
            });

    } else {
        console.log('Something went wrong ...');
    }

    res.redirect('/list');
});

// COMPANY ROUTES

// On successful login, redirect to the user's current
// list of companies
app.get('/companies', function (req, res) {
	req.currentUser().then(function(user) {
		res.send("User: " + user.email);
	});
});

// Add a new company to the track list
app.post('/companies', function (req, res) {
//	var newCompany = req.body.company;

	res.send("Create new company in list");
});

// View details for a particular company
app.get('/company/:id', function (req, res) {
	var company = req.params.id;

	res.render('company', {companyId: company});
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

});

// This is where the CrunchBase API call goes; should
// re-render the search page to show search results
app.post('/search', function (req, res) {
	// Call to API here ...

	// render with API results ...
	res.render('search');
});

db.sequelize.sync().then(function() {
    app.listen(3000, function() {
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