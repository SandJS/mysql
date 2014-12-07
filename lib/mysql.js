/**
 * Module Dependencies
 */

var SandGrain = require('sand-grain');
var Extend = require('sand-extend').Extend;
var mysql = require('mysql2');

/**
 * Initialize a new `MySQL`.
 *
 * @api public
 */
function MySQL() {
  this.super();

  this.defaultConfig = require('./default');
}

Extend(MySQL, SandGrain, {
  name: 'mysql',

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

/**
 * Expose `MySQL`
 */
exports = module.exports = MySQL;