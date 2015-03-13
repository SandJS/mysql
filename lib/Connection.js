/**
 * @author Adam Jaso <ajaso@pocketly.com>
 * @copyright 2014 Pocketly
 */

"use strict";

const mysql = require('mysql');
const EventEmitter = require('events').EventEmitter;

class Connection extends EventEmitter {
  constructor(config) {
    super();
    this.config = config;
    this.connection = mysql.createConnection(this.config);
  }

  query(query, params, callback) {
    return this.connection.query(query, params, callback);
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
}

module.exports = exports = Connection;