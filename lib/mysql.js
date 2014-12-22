/**
 * Module Dependencies
 */

var SandGrain = require('sand-grain');
var mysql = require('mysql');
var Connection = require('./Connection');

/**
 * Initialize a new `MySQL`.
 *
 * @api public
 */
exports = module.exports = SandGrain.extend({
  name: 'mysql',

  construct: function() {
    this.super();

    this.defaultConfig = require('./default');
    this.version = require('../package').version;
  },

  createConnection: function() {
    return new Connection(this.config);
  },

  query: function(query, params, callback) {
    var self = this;
    var connection = null;

    if (process.domain) {
      if (process.domain.mysqlConnection) {
        connection = process.domain.mysqlConnection;
      } else {
        createConn.call(self);
        connection = process.domain.mysqlConnection = mysql.createConnection(this.config);

        if (process.domain.res) {
          process.domain.res.once('finish', function () {
            if (process.domain.mysqlConnection) {
              try {
                destroyConn.call(self);
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
      createConn.call(self);
      connection = mysql.createConnection(this.config)
    }

    connection.query(query, params, function(err, rows) {
      if (!process.domain || !process.domain.mysqlConnection) {
        destroyConn.call(self);
        connection.destroy();
      }
      callback(err, rows);
    });
  }
});

function createConn() {
  this.emit('connection:created');
}

function destroyConn() {
  this.emit('connection:destroyed');
}