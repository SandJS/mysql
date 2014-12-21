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

  query: function(query, params, callback) {
    var connection = null;

    if (process.domain) {
      if (process.domain.mysqlConnection) {
        connection = process.domain.mysqlConnection;
      } else {
        connection = process.domain.mysqlConnection = mysql.createConnection(this.config);

        if (process.domain.res) {
          process.domain.res.once('finish', function () {
            if (process.domain.mysqlConnection) {
              try {
                process.domain.mysqlConnection.destroy();
                process.domain.mysqlConnection = null;
              } catch(e) {}
            }
          });
        } else {
          process.domain.mysqlConnection = null;
        }
      }
    } else {
      connection = mysql.createConnection(this.config)
    }

    connection.query(query, params, function(err, rows) {
      callback(err, rows);

      if (!process.domain || !process.domain.mysqlConnection) {
        connection.destroy();
      }
    });
  }
});