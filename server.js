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
    res.json(rows);
  })
  .catch(err => {
    res.status(500).end();
  });
});

app.listen(process.env.PORT || 3000);
