/**
 * Module Dependencies
 */

"use strict";

const SandGrain = require('sand-grain');
const mysql = require('mysql');
const Timer = require('libstats').Timer;
const Connection = require('./Connection');
const knex = require('knex')({client: 'mysql'});

/**
 * Initialize a new `MySQL`.
 *
 * @api public
 */
class MySQL extends SandGrain {
  constructor() {
    super();
    this.cacheTimer = new Timer('sand.mysql Cache Timer');
    this.name = this.configName = 'mysql';
    this.defaultConfig = require('./default');
    this.version = require('../package').version;
  }

  createConnection() {
    return new Connection(this.config);
  }

  bindToContext(ctx) {
    ctx.mysql = new Connection(this.config);
    ctx.on('end', function() {
      try {
        ctx.mysql.destroy();
      } catch (e) {}
    });
  }

}

MySQL.Connection = Connection;
MySQL.Model = require('./Model');
MySQL.knex = knex;

module.exports = exports = MySQL;