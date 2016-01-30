/**
 * @author Adam Jaso <ajaso@pocketly.com>
 * @copyright 2014 Pocketly
 */

"use strict";

const mysql = require('mysql');
const EventEmitter = require('events').EventEmitter;
const _ = require('lodash');
const lib = require('..');
const knex = require('knex')({client: 'mysql'});

class Connection extends EventEmitter {
  constructor(config) {
    super();
    this.config = _.merge({}, config);
    this.connection = mysql.createConnection(this.config);
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

  query(query, params, callback) {
    return runWithCallbackOrPromise.call(this, runQuery, callback);

    function runQuery(callback) {
      let self = this;
      let p = sand.profiler && sand.profiler.enabled ? sand.profiler.profile(query) : null;
      return self.connection.query(query, params, function(err, result) {
        p && p.step();
        self.config.modifyRows.call(self, err, result, callback.bind(self));
        p && p.stop();
      });
    }
  }

  beginTransaction(callback) {
    this.isInTransaction = true;
    return runWithCallbackOrPromise.call(this, runQuery, callback);

    function runQuery(callback) {
      this.connection.beginTransaction(callback);
    }
  }

  commit(callback) {
    this.isInTransaction = false;
    return runWithCallbackOrPromise.call(this, runQuery, callback);

    function runQuery(callback) {
      this.connection.commit(callback);
    }
  }

  rollback(callback) {
    this.isInTransaction = false;
    return runWithCallbackOrPromise.call(this, runQuery, callback);

    function runQuery(callback) {
      this.connection.rollback(callback);
    }
  }

  selectOne(query, params, callback) {
    return runWithCallbackOrPromise.call(this, runQuery, callback);

    function runQuery(callback) {
      let self = this;
      this.query(query, params)
        .catch(callback.bind(self))
        .then(function (rows) {
          callback.call(self, null, rows && rows.length > 0 ? rows[0] : null);
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
      this.connection.query(q.sql, q.bindings, callback);
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
      this.connection.query(q.sql + ' ' + onDuplicateSQL, q.bindings, callback);

    }

  }

  replace(table, values, postQuery, callback) {

    if (postQuery && _.isFunction(postQuery)) {
      callback = postQuery;
      postQuery = '';
    }

    return runWithCallbackOrPromise.call(this, runQuery, callback);

    function runQuery(callback) {

      if ('string' !== typeof table) {
        throw new Error('table must be a string');
      }

      table = table.replace(/[^\w]+/, '');
      values = exports.values(values);

      var q = `replace into \`${table}\` ${values.sql} ${postQuery || ''}`.trim();

      this.connection.query(q, values.bindings, callback);

    }
  }

  static values(n) {

    let str;
    let qs;
    let vals;

    if (!_.isArray(n) && !_.isPlainObject(n)) {
      str = '?,'.repeat(n).replace(/,$/, '');
    }

    if (_.isPlainObject(n)) {
      n = [n];
    }

    if (_.isArray(n)) {
      let cols = n;
      if (!_.isString(n[0])) {
        cols = Object.keys(n[0]);
        vals = [];

        qs = _.map(n, function(row) {
          vals = vals.concat(_.values(row));
          return this.values(cols.length);
        }.bind(this)).join(', ');

      } else {
        qs = '(' + this.values(n.length) + ')';
      }

      str = '`' + cols.join('`,`') + '`';
    }

    str = '(' + str + ')';

    if (_.isArray(n)) {
      str = [str, qs].join(' values ');
      if (vals) {
        str = {
          sql: str,
          bindings: vals
        };
      }
    }

    return str;

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
    return runQuery.call(self, callback.bind(self));
  }
}

module.exports = exports = Connection;
exports.runWithCallbackOrPromise = runWithCallbackOrPromise;