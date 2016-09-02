'use strict';

let bluebird = require('bluebird');
let request = bluebird.promisify(require('request'));
request = request.defaults({ jar: true });
let _ = require('lodash');
let cheerio = require('cheerio');
let knex = require('knex')({
  client: 'pg',
  connection: process.env['DATABASE_URL']
});

const MEMBERS_AREA_REGEX = /^ReactDOM\.render\(React.createElement\(MembersArea.MembersAreaInfo, ({.+})/;

function expect(res, statusCode) {
  if (res.statusCode !== statusCode) {
    throw new Error(`non-200 response for ${res.req.method} ${res.req.path}`);
  }
}

function getPeopleInGym() {
  return request({
    method: 'GET',
    url: 'https://www.puregym.com/Login'
  })
  .then(res => {
    expect(res, 200);
    let $ = cheerio.load(res.body);
    let token = $('input[name="__RequestVerificationToken"]').val();
    return request({
      method: 'POST',
      url: 'https://www.puregym.com/api/members/login/',
      json: true,
      headers: {
        '__RequestVerificationToken': token
      },
      body: {
        email: process.env['PUREGYM_EMAIL'],
        pin: process.env['PUREGYM_PIN']
      }
    });
  })
  .then(res => {
    expect(res, 200);
    return request({
      method: 'GET',
      url: 'https://www.puregym.com/members/'
    })
  })
  .then(res => {
    expect(res, 200);
    let peopleInGym = -1;
    _.forEach(res.body.split('\n'), line => {
      let match = line.match(MEMBERS_AREA_REGEX);
      if (match) {
        let data = JSON.parse(match[1]);
        peopleInGym = data.peopleInGym;
      }
    });
    if (peopleInGym === -1) {
      throw new Error('unable to find MembersAreaInfo');
    } else if (peopleInGym === 'Fewer than 20') {
      peopleInGym = 19;
    } else if (peopleInGym === '100+') {
      peopleInGym = 100;
    }
    return peopleInGym;
  });
}

function getAndSave() {
  let now = new Date();
  return getPeopleInGym()
  .then(peopleInGym => {
    console.log(`${now.toISOString()} | ${peopleInGym}`);
    return knex('puregym').insert({
      time: now,
      people_in_gym: peopleInGym
    });
  })
  .catch(err => {
    console.log(now, err);
  })
  .finally(() => {
    knex.destroy();
  });
}

getAndSave();
