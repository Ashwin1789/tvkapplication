
const port    = process.env.PORT || 5000;
const http    =  require('http');
var app = require('./config/express');
var server    = http.createServer(app);
server.listen(port, () => console.log(`API running on localhost:${port}`));
