/**
 * Module Dependencies
 */

var SandGrain = require('sand-grain');
var mysql = require('mysql');
var Connection = require('./Connection');
var knex = require('knex')({client: 'mysql'});

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
  },

  selectOne: function(query, params, callback) {
    this.query(query, params, function(err, rows) {
      callback.call(this, err, rows && rows.length > 0 ? rows[0] : null);
    });
  },

  updateOne: function(table, values, where, callback) {

    if ('string' !== typeof table) {
      throw new Error('table must be a string');
    }

    var q = knex(table).update(values).where(where).limit(1).toSQL();
    this.query(q.sql, q.bindings, callback);

  },

  insert: function(table, values, onDuplicateSQL, callback) {

    if ('function' !== typeof callback) {
      callback = onDuplicateSQL;
      onDuplicate = '';
    }

    if ('string' !== typeof table) {
      throw new Error('table must be a string');
    }

    if ('string' !== typeof onDuplicateSQL) {
      throw new Error('onDuplicate must be a string');
    }

    var q = knex(table).insert(values).toSQL();
    this.query(q.sql + ' ' + onDuplicateSQL, q.bindings, callback);

  }

});

function createConn() {
  this.emit('connection:created');
}

function destroyConn() {
  this.emit('connection:destroyed');
}