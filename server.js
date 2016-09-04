'use strict';

let express = require('express');
let app = express();
let _ = require('lodash');
let cheerio = require('cheerio');
let knex = require('knex')({
  client: 'pg',
  connection: process.env['DATABASE_URL']
});

app.use(express.static(__dirname + '/'));

app.get('/data.json', (req, res, next) => {
  console.log('serving request for: /data.json');
  knex('puregym').select('*')
  .then(rows => {
    // Adjust the time according to the time zone
    _.forEach(rows, row => {
      row.time.setTime(row.time.getTime() - row.time.getTimezoneOffset() * 60 * 1000);
      row.time = row.time.toISOString();
    });
    res.json(rows);
  })
  .catch(err => {
    res.status(500).end();
  });
});

app.listen(process.env.PORT || 3000);
