"use strict";

const mysql = require('../..');
const Connection = require('../../lib/Connection');
const co = require('co');

function verifyQuery(mysql) {
  return co(function *() {
    (yield select1Query(mysql)).value.should.be.equal(1);
  });
}

function select1Query(mysql) {
  return mysql.selectOne('select 1 as value');
}


describe('Connection', function() {

  it('should auto reconnect on connection lost after timeout', function (done) {
    sand.runInContext(function*() {
      // Lets set the timeouts to 1 so it crashes
      let timeout = '1';
      yield sand.ctx.mysql.query('SET @@GLOBAL.interactive_timeout=' + timeout);
      yield sand.ctx.mysql.query('SET @@GLOBAL.wait_timeout=' + timeout);

      sand.runInContext(function *() {
        let waitTimeout = (yield sand.ctx.mysql.query('SHOW SESSION VARIABLES LIKE "wait_timeout"'))[0].Value;
        let interactiveTimeout = (yield sand.ctx.mysql.query('SHOW SESSION VARIABLES LIKE "interactive_timeout"'))[0].Value;

        // Make sure the timeouts have been set
        waitTimeout.should.be.equal(timeout);
        interactiveTimeout.should.be.equal(timeout);

        yield new Promise(() => {
          setTimeout(() => {
              co(function *() {
                  let res = yield sand.ctx.mysql.selectOne('select 1 as value');
                  res.value.should.be.equal(1);
                done();
              });
          }, 1100);
        });
      });
    });
  });

  it('should auto reconnect after destroy', function *() {
    let mysql = newMySQLConnection();
    yield verifyQuery(mysql);

    // Destroy mysql to simulate dropped connection
    mysql.destroy();

    yield verifyQuery(mysql);
  });

  it('should not auto reconnect if turned off', function *() {
    let mysql = newMySQLConnection({ autoReconnect: false });
    yield verifyQuery(mysql);

    // Destroy mysql to simulate dropped connection
    mysql.destroy();

    verifyQuery(mysql).should.be.rejected();
  });

//   describe('query', function() {
//
//     it('should deliver sql and bindings to a mysql library');
//
//   });
//
//   describe('selectOne', function() {
//
//     it('should return a single object as a result of a query');
//
//   });
//
//   describe('insert', function() {
//
//     it('should build and execute a valid insert query');
//
//     it('should support on duplicate key update');
//
//   });
//
//   describe('updateOne', function() {
//
//     it('should build and execute a valid update query');
//
//   });
//
//   describe('replace', function() {
//
//     it('should build and execute a valid replace query');
//
//   });
//
// });
//
// describe('Model', function() {
//
//   describe('*load', function() {
//
//     it('should return a valid instance of the model');
//
//     it('should asynchronously load all it\'s properties');
//
//   });
//
//   describe('create', function() {
//
//     it('should return an instance of the model from the given row');
//
//     it('should not double wrap an already wrapped model instance');
//
//   });
//
//   describe('fromRow', function() {
//
//     it('should wrap a single mysql row in instances of the model and call the *load GeneratorFunction');
//
//     it('should not double wrap a single mysql row in instances of the model and call the *load GeneratorFunction');
//
//     it('should wrap multiple mysql rows in instances of the model and call the *load GeneratorFunction');
//
//     it('should not double wrap multiple mysql rows in instances of the model and call the *load GeneratorFunction');
//
//     it('should wrap a "numeric map" of mysql rows in instances of the model and call the *load GeneratorFunction');
//
//     it('should not double wrap a "numeric map" of mysql rows in instances of the model and call the *load GeneratorFunction');
//
//   });
//
//   describe('find', function() {
//
//     it('should build and execute a valid query');
//
//   });
//
//   describe('selectOne', function() {
//
//     it('should select and return a single row from the database');
//
//     it('should cache the single row it returns');
//
//     it('should wrap the single row it returns');
//
//   });
//
//   describe('select', function() {
//
//     it('should choose the proper function to call based on whether the query ends with `limit 1`');
//
//   });
//
//   describe('query', function() {
//
//     it('should cache the single row it returns');
//
//     it('should wrap the single row it returns');
//
//   });
//
});