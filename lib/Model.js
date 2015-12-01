"use strict";

const bind = require('co-bind');
const _ = require('lodash');
const co = require('co');
const pasync = require('pasync');
const EventEmitter = require('events').EventEmitter;

const loggingEnabled = false;
const MAP_LIMIT_DEFAULT = 10;

let mysqlQuery = mysql('query');
let mysqlSelectOne = mysql('selectOne');

class Model {

  constructor() {

  }

  /**
   * Loads a database row from a mysql query. Override this method to load custom properties onto a row object
   *
   * @param row {PlainObject} - the original mysql row (if you auto copy in the constructor, you don't need to use this. You need this if you don't autocopy)
   * @param opts {PlainObject} - user defined options that customize how the row is modified
   *
   * @returns {Model} NOTE: all overrides to this method MUST return `this`
   */
  *load(row, opts) {
    _.extend(this, row);
    return this
  }

  /**
   * Creates a new instance of this class initialized with the given row and calls its *load() GeneratorFunction.
   *
   * @param row {PlainObject} - see *load
   * @param opts {PlainObject} - see *load
   *
   * @returns {Promise}
   */
  static create(row, opts) {
    if (!(row instanceof this)) {
      let obj = new this(row, {autoCopy: true, rowOpts: opts});
      return co(bind(obj.load, obj, row, opts));
    } else {
      return Promise.resolve(row);
    }
  }

  /**
   * This property indicates if the fromRow function has been called at least once. This is used in the fromRow function which
   * passes an `isTop` property in the options so that the original caller of this can distinguish between top level
   * calls to fromRow and lower level calls. Consider two classes: `Object1` and `Object2`. In it's *load function `Object1`
   * initializes a property of type `Object2`. In it's *load function `Object2` initializes a property of type `Object1`.
   * An infinite loop occurs when an object or array of objects of type `Object1` call `fromRow()` and load a property of
   * type `Object2` which internally calls `fromRow()` on it's own custom property of type `Object1` which loads a property
   * of type `Object2`, etc... This can be fixed by checking if `isTop` is true, so that when an array of objects is
   * "fromRow"ed to be returned as the main API response, they will all get `isTop === true` and any sub calls within them,
   * will get `isTop === false`. You shouldn't need to call this outside of the contexts described
   *
   * @private
   *
   * @returns {boolean}
   */
  static get isTopLevel() {

    let val = sand.context._ApiObject.isTop;
    sand.context._ApiObject.isTop = false;
    return val;
  }

  /**
   * 1) Loads a row or group of rows in parallel mapLimited fashion,
   * 2) Applies `create` to each row
   *
   * @param rows
   * @param opts
   * @returns {*}
   */
  static fromRow(rows, opts) {
    this.init();

    opts = _.defaults({}, opts, {isTop: Model.isTopLevel});
    let cls = this;
    return co(function *() {

      if (rows instanceof Promise) {
        rows = yield rows;
      }

      if (!rows) {
        return Promise.resolve(null);
      }

      function domainBind(cb) {
        if (process.domain) {
          return process.domain.bind(cb);
        } else {
          return cb;
        }
      }

      if (_.isArray(rows)) {
        return pasync.mapLimit(rows, cls.mysql.config.mapLimit || MAP_LIMIT_DEFAULT, domainBind(function (row) {
          return row instanceof cls ? Promise.resolve(row) : cls.create(row, opts);
        }));

      } else if (isNumericMap(rows)) {
        return pasync.mapValuesLimit(rows, cls.mysql.config.mapLimit || MAP_LIMIT_DEFAULT, domainBind(function (row) {
          return row instanceof cls ? Promise.resolve(row) : cls.create(row, opts);
        }));

      } else {
        return rows instanceof cls ? Promise.resolve(rows) : cls.create(rows, opts);
      }

    });
  }

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
    return mysqlQuery.call(this, query, bindings, queryOpts);
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
    return mysqlSelectOne.call(this, query, bindings, queryOpts);
  }

  /**
   * @private
   */
  static init() {
    if (sand.context && !sand.context._ApiObject) {
      sand.context._ApiObject = {
        isTop: true
      };
    }
  }

  /**
   * Returns the mysql connection that this model will use to execute queries. You can override this getter function to
   * have certain models use different databases if that fits your use case.
   *
   * @returns {Connection}
   */
  static get mysql() {
    if (sand.context && sand.context.mysql) {
      return sand.context.mysql;
    } else {
      throw new Error('No MySQL connection found.');
    }
  }

  /**
   * This method is used to determine when to autoCache a query.
   *
   * By default, if this method is used in the context of an HTTP application (where `sand.context.req` exists) all GET
   * requests will have allow cache if not otherwise specified in the options. The reason behind this default is
   * that most of the time GET requests should not write data, and so a per request cache is safe to use most of the time.
   *
   * @returns {*|boolean}
   */
  static get cachePolicy() {
    return sand.context && sand.context.req && 'GET' === sand.context.req.method;
  }

  static quickIsNumericMap(map) {
    return isNumericMap(map);
  }

}

module.exports = Model;

/**
 * This function is used to build `executeCacheAndWrapQuery` functions that call `Connection` functions.
 *
 * @param func {String} the name of the function on `Connection` to call
 * @returns {Function}
 *
 * @private
 */
function mysql(func) {

  // create a context in which to cached query results for this connection
  let _cache = createMysqlExtension('_cache');

  // create a context in which to keep track of cache locks that are pending
  let _cacheLock = createMysqlExtension('_cacheLock');

  // create a context in which to keep track of which queries are waiting for the results of a query that is executing
  let _lockWait = createMysqlExtension('_lockWait', function() {
    return new EventEmitter();
  });


  return executeCacheAndWrapQuery;

  /**
   * This method performs 3 convenience operations on all query data.
   *
   * 1) Executes queries made by `Connection.selectOne` and `Connection.query`.
   *
   * 2) If caching option is enabled for the query, then the results are cached per `Connection`. Per `Connection` means
   * that the cache expires at the end of the mysql connection. Caching may be specified in the options, or if not
   * specified the `Model.cachePolicy` getter function will determine if the query should be cached.
   *
   * 3) This method also calls `Model.fromRow` on each entry from the query results. Results are cached
   * after `Model.fromRow` is applied.
   *
   * @param query
   * @param bindings
   * @param queryOpts
   * @returns {Array}
   */
  function executeCacheAndWrapQuery(query, bindings, queryOpts) {
    // use an instance of the cache function that is bound to the current model class
    let cache = _cache.bind(this);

    // use an instance of the cacheLock function that is bound to the current model class
    let cacheLock = _cacheLock.bind(this);

    // use an instance of the lockWait function that is bound to the current model class
    let lockWait = _lockWait.bind(this);

    let self = this;
    return co(function *() {

      // initialize the options
      if (!queryOpts) {
        queryOpts = {};
      }

      // if we haven't explicitly ordered it to cache the query, then check the cache policy
      if (_.isUndefined(queryOpts.cache) && self.cachePolicy) {
        queryOpts.cache = true;
      }

      let key; // cache key

      if (queryOpts.cache) {
        // generate cache key
        key = func + '-' + JSON.stringify(query) + '-' + JSON.stringify(bindings) + '-' + JSON.stringify(queryOpts);

        // check the cache
        let rows = cache(key);
        let lock = cacheLock(key);

        if (rows) { // return if we have cache
          if (loggingEnabled) {
            sand.log('CACHE ' + key);
          }
          return rows;

        } else if (lock) { // if the is query is executing, then wait
          return yield new Promise(function (resolve, reject) {
            lockWait().once('query:' + key, resolve);
            lockWait().once('error:' + key, reject);
          });

        } else { // if neither cache nor lock exists, then set the lock and execute the query
          cacheLock(key, 1);
        }
      }

      try {
        // run the query
        var rows = yield self.mysql[func](query, bindings);

      } catch (e) {
        lockWait().emit('error:' + key, e);
        throw e;
      }

      // fromRow the results
      if (!queryOpts.raw) {
        rows = yield self.fromRow(rows, queryOpts);
      }

      // save the cache
      if (queryOpts.cache) {
        if (loggingEnabled) {
          sand.log('FRESH ' + key);
        }
        cache(key, rows);
        cacheLock(key, undefined);
        lockWait().emit('query:' + key, rows);
      }

      return rows;
    });
  };

  /**
   * Creates a function that interacts with a specific property attached to `Model.mysql`
   *
   * @param cacheName {String} - name of the property on Model.mysql
   * @param [initialValue] {*|Function} - if function, then the function is called, otherwise the default is an empty object.
   * @returns {Function}
   */
  function createMysqlExtension(cacheName, initialValue) {

    return function() {
      let self = this;

      // ensure that the cache location exists
      if (!self.mysql[cacheName]) {
        self.mysql[cacheName] = _.isFunction(initialValue) ? initialValue() : {};
      }

      if (!arguments.length) {
        return self.mysql[cacheName]; // return the cache
      } else if (1 == arguments.length) {
        return self.mysql[cacheName][arguments[0]]; // return the value at the cache key
      } else if (2 == arguments.length) {
        if (_.isUndefined(arguments[1])) {
          delete self.mysql[cacheName][arguments[0]];
          return undefined;
        }
        return self.mysql[cacheName][arguments[0]] = arguments[1]; // set the cache key with the given value

      } else {
        return self.mysql[cacheName][arguments[0]] = Array.prototype.slice.call(arguments, 1); // set the cache key with an array of remaining arguments
      }

    }

  }

}

/**
 * Checks if the object passed in is an object with all numeric keys. This is used to test if we should wrap all values
 * in the numeric map.
 *
 * @param map
 * @returns {boolean}
 *
 * @private
 */
function isNumericMap(map) {
  let isNumericMap = false;
  if (!_.isArray(map)) {
    for (let key in map) {
      if (!isNaN(key)) {
        isNumericMap = true;
      }
      break;
    }
  }

  return isNumericMap;
}