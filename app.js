// Do NOT save to Repo
var CrunchbaseAPIKey = '054ee27637667c7969ed512eb8ac5d02';

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

// env avoids saving API key + secrets to github
// var env = require('env')();

// env.ok(function(err) {
//   if (!err) return
//   console.error(err)
//   process.exit(1)
// });

// function handleEnv (err) {
//   if (!err) return
//   process.exit(1)
// }

// var sessionSecret = null;
// var crunchbaseAPIKey = null;

// if (env.ok(handleEnv)) {
//     sessionSecret = env.get('SESSION_SECRET');
//     crunchbaseAPIKey = env.get('CRUNCHBASE_API');
// }

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
    secret: 'taco',

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
            res.redirect('/companies');

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

//  db.Category.findAll({include: db.User})

    db.Category.all()
      .then(function(dbCategories) {
          res.render('list', {list: dbCategories});
      });
});

// Accept lists of locations and categories to pay attention to
app.post('/list', function(req,res) {
    console.log("POST /list");

    var list = req.body.list

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
	res.render('search');
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