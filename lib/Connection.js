/**
 * @author Adam Jaso <ajaso@pocketly.com>
 * @copyright 2014 Pocketly
 */ 

var mysql = require('mysql');

exports = module.exports = require('sand').Class.extend(require('events').EventEmitter, {
  construct: function(config) {
    this.config = config;
    this.connection = mysql.createConnection(this.config);
  },

  query: function(query, params, callback) {
    return this.connection.query(query, params, callback);
  },

  pause: function() {
    this.connection.pause();
  },

  resume: function() {
    this.connection.resume();
  },

  end: function() {
    this.connection.end();
  },

  destroy: function() {
    this.connection.destroy();
  }
});