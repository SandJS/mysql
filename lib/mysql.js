/**
 * Module Dependencies
 */

var SandGrain = require('sand-grain');
var mysql = require('mysql2');

/**
 * Initialize a new `MySQL`.
 *
 * @api public
 */
module.exports = SandGrain.extend({
  name: 'mysql',

  construct: function() {
    this.super();

    this.defaultConfig = require('./default');
    this.version = require('../package').version;
  },

  ///**
  // * Initialize MySQL module
  // *
  // * @param config
  // * @returns {MySQL}
  // */
  //init: function(config) {
  //  this.super(config);
  //
  //  //this.pool = mysql.createPool(this.config);
  //
  //  return this;
  //},

  //shutdown: function(done) {
  //  this.pool.end(done);
  //},

  query: function(query, params, callback) {
    var connection = null;

    if (process.domain) {
      if (process.domain.mysqlConnection) {
        connection = process.domain.mysqlConnection;
      } else {
        connection = process.domain.mysqlConnection = mysql.createConnection(this.config);
      }
    } else {
      connection = mysql.createConnection(this.config)
    }

    connection.execute(query, params, function(err, rows) {
      callback(err, rows);

      if (!process.domain || !process.domain.mysqlConnection) {
        connection.end();
      }
    });

    if (process.domain && process.domain.mysqlConnection) {
      if (!process.domain.res) {
        process.domain.mysqlConnection = null;
      } else {
        process.domain.res.on('finish', function() {
          process.domain.mysqlConnection.end();
          process.domain.mysqlConnection = null;
        })
      }
    }
  }
});