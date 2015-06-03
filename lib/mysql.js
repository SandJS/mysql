/**
 * Module Dependencies
 */

"use strict";

var SandGrain = require('sand-grain');
var mysql = require('mysql');
var knex = require('knex')({client: 'mysql'});

/**
 * Initialize a new `MySQL`.
 *
 * @api public
 */
class MySQL extends SandGrain {
  constructor() {
    super();
    this.name = this.configName = 'mysql';
    this.defaultConfig = require('./default');
    this.version = require('../package').version;
  }

  createConnection() {
    var Connection = require('./Connection');
    return new Connection(this.config);
  }

  getConnection() {
    let self = this;
    let connection;

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
              } catch (e) {}

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

    return connection;
  }

  query(query, params, callback) {

    return runWithCallbackOrPromise.call(this, runQuery, callback);

    function runQuery(callback) {
      var self = this;
      var connection = this.getConnection();

      connection.query(query, params, function (err, rows) {
        if (!process.domain || !process.domain.mysqlConnection) {
          destroyConn.call(self);
          connection.destroy();
        }
        callback(err, rows);
      });
    }
  }

  selectOne(query, params, callback) {

    return runWithCallbackOrPromise.call(this, runQuery, callback);

    function runQuery(callback) {
      this.query(query, params, function (err, rows) {
        callback.call(this, err, rows && rows.length > 0 ? rows[0] : null);
      });
    }

  }

  updateOne(table, values, where, callback) {

    return runWithCallbackOrPromise.call(this, runQuery, callback);

    function runQuery(callback) {

      if ('string' !== typeof table) {
        throw new Error('table must be a string');
      }

      var q = knex(table).update(values).where(where).limit(1).toSQL();
      this.query(q.sql, q.bindings, callback);
    }

  }

  insert(table, values, onDuplicateSQL, callback) {

    if ('function' !== typeof callback && 'function' === typeof onDuplicateSQL) {
      callback = onDuplicateSQL;
      onDuplicateSQL = '';
    }

    if (!onDuplicateSQL) {
      onDuplicateSQL = '';
    }

    return runWithCallbackOrPromise.call(this, runQuery, callback);

    function runQuery(callback) {

      if ('string' !== typeof table) {
        throw new Error('table must be a string');
      }

      if ('string' !== typeof onDuplicateSQL) {
        throw new Error('onDuplicate must be a string');
      }

      var q = knex(table).insert(values).toSQL();
      this.query(q.sql + ' ' + onDuplicateSQL, q.bindings, callback);

    }

  }

  beginTransaction(callback) {

    return runWithCallbackOrPromise.call(this, runQuery, callback);

    function runQuery(callback) {
      this.getConnection().beginTransaction(callback);
    }

  }

  commit(callback) {

    return runWithCallbackOrPromise.call(this, runQuery, callback);

    function runQuery(callback) {
      this.getConnection().commit(callback);
    }

  }

  rollback(callback) {

    return runWithCallbackOrPromise.call(this, runQuery, callback);

    function runQuery(callback) {
      this.getConnection().rollback(callback);
    }

  }

}

module.exports = exports = MySQL;
exports.runWithCallbackOrPromise = runWithCallbackOrPromise;

function createConn() {
  this.emit('connection:created');
}

function destroyConn() {
  this.emit('connection:destroyed');
}


function runWithCallbackOrPromise(runQuery, callback) {

  let self = this;
  if ('function' === typeof callback) {
    return callRunQuery(callback);
  }

  return new Promise(function(resolve, reject) {
    return callRunQuery(function(err, result) {
      if (err) {
        return reject(err);
      }
      resolve(result);
    });
  });

  function callRunQuery(callback) {
    return runQuery.call(self, function (err, result) {
      self.config.modifyRows.call(self, err, result, callback.bind(self));
    });
  }
}