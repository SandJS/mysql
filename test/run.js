'use strict';

const Mocha = new require('mocha');
const coMocha = require('co-mocha');
const sand = require('sand');
const mysql = require('../');

const mochaOptions = {
  ui: 'bdd',
  timeout: '5s',
  delay: true
};

coMocha(Mocha);
let mocha = new Mocha(mochaOptions);

mocha.addFile(__dirname + '/unit/index.test.js');

mocha.run(function(failures) {
  process.exit(failures);
});

global.mysqlConfig = {
  host: process.env.MYSQL_HOST,
  port: process.env.MYSQL_PORT,
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD,
  database: process.env.MYSQL_DATABASE,
};

new sand({
      log: '',
      appPath: __dirname
  })
  .use(mysql, {
    all: mysqlConfig
  })
  .start(function() {
    run();
  });

let defaultConfig = require('../lib/default');

global._ = require('lodash');
global.Connection = require('../lib/Connection');
global.newMySQLConnection = function(overrideConfig) {
  return new Connection(_.defaults(overrideConfig || {}, mysqlConfig, defaultConfig));
};