"use strict";

const bind = require('co-bind');
const _ = require('lodash');
const co = require('co');
const pasync = require('pasync');
const debug = require('debug')('sand-mysql:Model');
const AbstractModel = require('sand-abstract-model').AbstractModel;
const memoize = require('concurrent-memoize');

const MAP_LIMIT_DEFAULT = 10;

const concurrentConfig = {
  getCache: function(funcName) {
    if (!sand.context._concurrentMemoize) {
      sand.context._concurrentMemoize = {};
    }
    if (!sand.context._concurrentMemoize[funcName]) {
      sand.context._concurrentMemoize[funcName] = {};
    }
    
    return sand.context._concurrentMemoize[funcName];
  },

  cacheKey: function(query, bindings, queryOpts) {
    return JSON.stringify(query) + '-' + JSON.stringify(bindings) + '-' + JSON.stringify(queryOpts)
  },

  parseOptions: function(query, bindings, queryOpts) {
    return queryOpts;
  },

  allowCache: function() {
    return sand.context && sand.context.req && 'GET' === sand.context.req.method;
  },

  modifyResult: function(result) {
    return Promise.resolve(result);
  },

  maxListeners: 100
};

class Model extends AbstractModel {

  /**
   * Builds and runs a custom query using the given options.
   *
   * @param opts
   * @param queryOpts
   * @returns {*}
   */
  static find(opts, queryOpts) {
    let q = knex(opts.table);

    if (opts.where) {
      q.where(opts.where);
    }

    if (opts.order) {
      if (_.isPlainObject(opts.order)) {
        q.orderBy(opts.order.col, opts.order.sort);
      } else if (_.isString(opts.order)) {
        let order = opts.order.replace(/\s+/g, ' ').split(' ', 2);
        q.orderBy(order[0], order[1] || 'asc');
      }
    }

    if (opts.limit) {
      q.limit(opts.limit);

      if (opts.page) {
        q.offset((opts.page - 1) * opts.limit);
      } else if (opts.offset) {
        q.offset(opts.offset);
      }
    }

    q = q.toSQL();

    if (opts.multiple) {
      return this.query(q.sql, q.bindings, queryOpts);

    } else if (opts.single) {
      return this.selectOne(q.sql, q.bindings, queryOpts);

    } else {
      return this.select(q.sql, q.bindings, queryOpts);
    }
  }

  /**
   * Automatically the `selectOne` and `query` functions based on whether the given query ends with `limit 1`.
   * It will use `selectOne` if it ends with `limit 1` otherwise it uses `query`
   *
   * @param query
   * @param bindings
   * @param queryOpts
   *
   * @returns {*}
   */
  static select(query, bindings, queryOpts) {
    let idx = query.indexOf('limit 1');
    if (idx >= 0 && query.length - 7 === idx) {
      return this.selectOne(query, bindings, queryOpts);
    }
    return this.query(query, bindings, queryOpts);
  }

  /**
   * Wraps `Model.mysql.query` with a per request query caching layer.
   *
   * @param query
   * @param bindings
   * @param queryOpts
   *
   * @returns {*}
   */
  static query(query, bindings, queryOpts) {
    return this.fromRow(this.mysql().query(query, bindings), queryOpts);
  }

  /**
   * Wraps `Model.mysql.selectOne` with a per request query caching layer.
   *
   * @param query
   * @param bindings
   * @param queryOpts
   *
   * @returns {*}
   */
  static selectOne(query, bindings, queryOpts) {
    return this.fromRow(this.mysql().selectOne(query, bindings), queryOpts);
  }

  /**
   * Returns the mysql connection that this model will use to execute queries. You can override this getter function to
   * have certain models use different databases if that fits your use case.
   *
   * @returns {Connection}
   */
  static mysql() {
    if (sand.context && sand.context.mysql) {

      memoize.property(this, 'query', concurrentConfig);
      memoize.property(this, 'selectOne', concurrentConfig);

      return sand.context.mysql;
    } else {
      throw new Error('No MySQL connection found.');
    }
  }

  static context(key) {
    if (!sand.context._concurrentMemoize) {
      sand.context._concurrentMemoize = {};
    }
    return sand.context._concurrentMemoize;
  }

}

module.exports = Model;