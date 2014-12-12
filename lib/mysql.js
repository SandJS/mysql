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

  /**
   * Initialize MySQL module
   *
   * @param config
   * @returns {MySQL}
   */
  init: function(config) {
    this.super(config);

    this.pool = mysql.createPool(this.config);

    return this;
  },

  shutdown: function() {
    this.pool.end();
  },

  query: function(query, params, callback) {
    this.pool.getConnection(function(err, connection) {
      if (err) {
        this.log.error(err);
        callback(err);
        return;
      }

      connection.execute(query, params, function(err, rows) {
        callback(err, rows);
        connection.release();
      });
    }.bind(this));
  }
});