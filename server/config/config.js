
(function () {
// Database connection pool

    module.exports = {
        development: {
            db: process.env.db || '',
            host: 'localhost',
            user: 'root',
            password: 'Office@25',
            database: 'qr_system',
            port: process.env.PORT || 5000,
            url : process.env.URL || 'http://localhost:3000',

        },
        production: {
            db: process.env.db || '',
            host: 'localhost',
            user: 'root',
            password: 'Office@25',
            database: 'qr_system',
            port: process.env.PORT || 5000,
            url : process.env.URL || 'https://a1codes.in',

        }
    }
})()