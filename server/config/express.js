const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const app = express();
const env = process.env.NODE_ENV || 'development';
const routes = require('./routes');
const errorHandler = require('./errorHandler');

app.use(function (req, res, next) {
    res.header('Access-Control-Allow-Origin', '*'); // Allow all origins for development
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Allow-Headers', 'Content-Type, withCredentials, Authorization');
    next();
});


app.use(express.static(path.join(process.cwd(), '../client/build')));
app.use(bodyParser.urlencoded({ extended: false }));
require('./database.js');

// Serve static files
app.use('/api', routes);
// Catch all other routes and return the index file
app.get('/{*any}', (req, res) => {
    res.sendFile(path.join(process.cwd(), '../client/build/index.html'));
  });

//Global error Handler
app.use(errorHandler);

module.exports = app;