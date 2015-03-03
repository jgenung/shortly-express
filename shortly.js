var express = require('express');
var session = require('express-session');
var util = require('./lib/utility');
var partials = require('express-partials');
var bodyParser = require('body-parser');


var db = require('./app/config');
var Users = require('./app/collections/users');
var User = require('./app/models/user');
var Links = require('./app/collections/links');
var Link = require('./app/models/link');
var Click = require('./app/models/click');

var app = express();

app.use(session({
  secret: 'f3j9ajf9AI4Q3;KFLAS',
  resave: true,
  saveUninitialized: false
}));

app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');
app.use(partials());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(__dirname + '/public'));


var session = function(req){
  req.session.id = 't123';
}

app.get('/', util.authenticate,
//app.get('/',
function(req, res) {
  res.render('index');
  res.end();
});

app.get('/create', util.authenticate,
//app.get('/create',
  function(req, res) {
    res.render('index');
    res.end();
});

app.get('/links', util.authenticate,
//app.get('/links',
function(req, res) {
  Links.reset().fetch().then(function(links) {
    res.send(200, links.models);
    //res.end();
  });
});

app.get('/login',
function(req,res){
  res.render('login');
  res.end();
});

app.post('/login',
function(req, res){
  var username = req.body.username;
  db.knex('users')
    .where('username', '=', username)
    .then(function(users){
      if(users['0']){
        var hashPassword = users['0']['password'];
        if(util.compare(req.body.password, hashPassword)){
          util.createSession(req, res);
        }
        else{
          res.send(404);
          res.end();
        }
      }
      else{
        res.redirect('/login');
      }
    });
});

app.get('/signup',
function(req,res){
  res.render('signup');
  res.end();
});

app.post('/signup',
function(req, res){
  var username = req.body['username'];
  new User({ username: username }).fetch().then(function(found){
    if(found){
      res.send(404);
      res.end();
    }
    else{
      var pass = util.hash(req.body['password']);
      var user = new User({username: username, password: pass})
        .save()
        .then(function(newUser){
          Users.add(newUser);
        });
      res.redirect('/');
    }

  })

});

app.post('/links',
function(req, res) {
  var uri = req.body.url;

  if (!util.isValidUrl(uri)) {
    console.log('Not a valid url: ', uri);
    return res.send(404);
  }

  new Link({ url: uri }).fetch().then(function(found) {
    if (found) {
      res.send(200, found.attributes);
    } else {
      util.getUrlTitle(uri, function(err, title) {
        if (err) {
          console.log('Error reading URL heading: ', err);
          return res.send(404);
        }

        var link = new Link({
          url: uri,
          title: title,
          base_url: req.headers.origin
        });

        link.save().then(function(newLink) {
          Links.add(newLink);
          res.send(200, newLink);
        });
      });
    }
  });
});

/************************************************************/
// Write your authentication routes here
/************************************************************/



/************************************************************/
// Handle the wildcard route last - if all other routes fail
// assume the route is a short code and try and handle it here.
// If the short-code doesn't exist, send the user to '/'
/************************************************************/

app.get('/*', function(req, res) {
  new Link({ code: req.params[0] }).fetch().then(function(link) {
    if (!link) {
      //res.redirect('/');
      res.redirect('/login');
    } else {
      var click = new Click({
        link_id: link.get('id')
      });

      click.save().then(function() {
        db.knex('urls')
          .where('code', '=', link.get('code'))
          .update({
            visits: link.get('visits') + 1,
          }).then(function() {
            return res.redirect(link.get('url'));
          });
      });
    }
  });
});

console.log('Shortly is listening on 4568');
app.listen(4568);
