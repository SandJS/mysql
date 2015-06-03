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
    return lib.runWithCallbackOrPromise.call(this, runQuery, callback);

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
    return lib.runWithCallbackOrPromise.call(this, runQuery, callback);

    function runQuery(callback) {
      this.connection.beginTransaction(callback)
    }
  }

  commit(callback) {
    return lib.runWithCallbackOrPromise.call(this, runQuery, callback);

    function runQuery(callback) {
      this.connection.commit(callback);
    }
  }

  rollback(callback) {
    return lib.runWithCallbackOrPromise.call(this, runQuery, callback);

    function runQuery(callback) {
      this.connection.rollback(callback);
    }
  }
}

module.exports = exports = Connection;