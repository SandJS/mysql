/**
 * @author Adam Jaso <ajaso@pocketly.com>
 * @copyright 2014 Pocketly
 */

"use strict";

const mysql = require('mysql');
const EventEmitter = require('events').EventEmitter;
const lib = require('..');

class Connection extends EventEmitter {
  constructor(config) {
    super();
    this.config = config;
    this.connection = mysql.createConnection(this.config);
  }

  query(query, params, callback) {
    return runWithCallbackOrPromise.call(this, runQuery, callback);

    function runQuery(callback) {
      return this.connection.query(query, params, callback);
    }
  }

  pause() {
    this.connection.pause();
  }

  resume() {
    this.connection.resume();
  }

  end() {
    this.connection.end();
  }

  destroy() {
    this.connection.destroy();
  }

  beginTransaction(callback) {
    return runWithCallbackOrPromise.call(this, runQuery, callback);

    function runQuery(callback) {
      this.connection.beginTransaction(callback)
    }
  }

  commit(callback) {
    return runWithCallbackOrPromise.call(this, runQuery, callback);

    function runQuery(callback) {
      this.connection.commit(callback);
    }
  }

  rollback(callback) {
    return runWithCallbackOrPromise.call(this, runQuery, callback);

    function runQuery(callback) {
      this.connection.rollback(callback);
    }
  }


  query(query, params, callback) {

    return runWithCallbackOrPromise.call(this, runQuery, callback);

    function runQuery(callback) {
      var self = this;
      var connection = this.connection;

      connection.query(query, params, function (err, rows) {
        if (!process.domain || !process.domain.mysqlConnection) {
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
      this.connection.beginTransaction(callback);
    }

  }

  commit(callback) {

    return runWithCallbackOrPromise.call(this, runQuery, callback);

    function runQuery(callback) {
      this.connection.commit(callback);
    }

  }

  rollback(callback) {

    return runWithCallbackOrPromise.call(this, runQuery, callback);

    function runQuery(callback) {
      this.connection.rollback(callback);
    }

  }
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

module.exports = exports = Connection;
exports.runWithCallbackOrPromise = runWithCallbackOrPromise;