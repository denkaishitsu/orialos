'use strict';

//Require modukle of basement
var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var morgan = require('morgan');
var expressSession = require('express-session');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
require('dotenv').config();

//Require of router middlewares
var index = require('./routes/index');
var samples = require('./routes/samples');
var conversation = require('./routes/conversation');
var qa_curl_test = require('./routes/test/conversation4test');

//Imstance express FW
var app = express();

//Instatnce session for sticky server of auto-scaling
var sessionStore  = new expressSession.MemoryStore;

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(morgan('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// Use JSESSIONID as cookie and in memory session store
app.use(expressSession({ key: 'JSESSIONID', secret: 'whatever', store: sessionStore})); 

//Using routers middlewares
app.use('/', index);
app.use('/samples', samples);
app.use('/v1/searchers/alias/main/search-answer', conversation);
app.use('/v1/searchers/alias/ur/search-answer', conversation);
app.use('/qa_curl_test', qa_curl_test);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
