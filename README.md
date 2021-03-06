# MySQL Grain for Sand.js

[![Build Status](https://travis-ci.org/SandJS/mysql.svg?branch=master)](https://travis-ci.org/SandJS/mysql)

This grain provides convenience functions working with MySQL.

These convenience functions include autoloading config, automatic connection setup and cleanup, basic querying, querying for a single row, update query building, insert query building, support for prepared statements (although please note that this uses [node-mysql](https://github.com/felixge/node-mysql) which does not use prepared statements under the hood as far as I know).

In the context of a Sand.js application which has also loaded `sand-http`, a mysql connection is autoloaded onto the `Context`. 
This is available globally throughout your sand application at `sand.ctx.mysql`. You do not need to worry about cleaning 
up connections, since `sand-http` will handle cleanup automatically when the request ends.

## Install

`npm install --save sand-mysql`

## Usage

```JavaScript
sand.ctx.mysql.query('select * from user where join_time > ? order by join_time desc', [1442023198]); // [{user_id: 1, name: 'me'}, ...]

sand.ctx.mysql.selectOne('select * from user where join_time > ? order by join_time desc limit 1', [1442023198]); // returns {user_id: 1, name: 'me'}

sand.ctx.mysql.selectOne('select * from user where join_time > ? order by join_time desc limit 1', [1442023198]); // returns {user_id: 1, name: 'me'}
```

## Config

Sand MySQL uses [node-mysql](https://github.com/felixge/node-mysql#connection-options) connection config options. Some of the basic options are listed below

#### File

`config/mysql.js`

#### Config Properties

All properties listed below are attached to the same config object.

##### node-mysql specific

| Property Name | Type | Required | Description
| --- | --- | --- | --- | ---
| host | string | Yes | IP or hostname where your database server lives. For more info, see [node-mysql](https://github.com/felixge/node-mysql#connection-options).
| user | string | Yes | User for connecting to your database server. For more info, see [node-mysql](https://github.com/felixge/node-mysql#connection-options).
| password | string | Yes | User's password for connecting to your database server. For more info, see [node-mysql](https://github.com/felixge/node-mysql#connection-options).
| database | string | Yes | Name of your database. For more info, see [node-mysql](https://github.com/felixge/node-mysql#connection-options).

These are the **required** properties for `node-mysql`; however, all `node-mysql` properties are valid as well.

##### sand-mysql specific

| Property Name | Type | Required | Description
| --- | --- | --- | --- | ---
| modifyRows | function |  | This hook will allow you to modify all results returned from the raw database query. The callback must be invoked with the desired result to be returned. `function modifyRows(err, rows, function callback(err, rows))`
| autoReconnect | bool |  | Allow sand to auto reconnect enqueue errors (Default: true) |


## Grain API

#### Global Grain Reference

`sand.mysql`

#### Properties

| Property Name | Type | Returns | Description
| --- | --- | --- | ---
| createConnection([config](#config)) | function | [Connection](https://github.com/SandJS/mysql/blob/master/lib/Connection.js) | Creates a new Sand MySQL connection object.

## MySQL Connection API

The Connection object is a Promise based wrapper around some of the most commonly used `node-mysql` functions. It also provides some convenience functions for common tasks.

#### Global MySQL Connection Reference

`sand.ctx.mysql`

#### Properties

| Property Name | Type | Returns | Description
| --- | --- | --- | ---
| query(sql, bindings) | function | Promise\<Array\<Object>> | Execute any valid SQL query against the database and return an array of row objects. If `modifyRows` config option is set, the array of objects will be transformed there and then returned.
| selectOne(sql, bindings) | function | Promise\<Object> | Execute a query against the database and return the first row of the results. This is handy when you're using `LIMIT 1` in your query and you just want the object. If the number of results from the database is 0, then `null` is returned. If `modifyRows` config option is set, the result will be transformed there and then returned.
| updateOne(table, values, where) | function | Promise\<Object> | Updates a single row matching the given where properties and returns the update result object from `node-mysql`. If `modifyRows` config option is set, the array of objects will be transformed there and then returned. `values` is an object of properties where each property key corresponds to a row in `table`. `where` is an object of properties which map to the columns in `table` and uniquely identify which rows to update. `LIMIT 1` is automatically applied to the query built from these results, so be sure that your `WHERE` clause updates only one row.
| insert(table, values, [postQuery]) | function | Promise\<Object> | Runs a `INSERT INTO` query using the given object of properties and the given table and returns the insert result object from `node-mysql`. If `modifyRows` config option is set, the array of objects will be transformed there and then returned. `values` is an object of properties where each property key corresponds to a row in `table`. `postQuery` is an optional string and, if set, will be appended directly to the internally built `INSERT` query; it can be used to add `ON DUPLICATE KEY UPDATE` clauses; note that the `ON DUPLICATE KEY UPDATE` must be in the `postQuery`; it is not appended automatically. 
| replace(table, values, [postQuery]) | function | Promise\<Object> | Runs a `REPLACE INTO` query with the given table name and properties and returns the replace result object from `node-mysql`.
| beginTransaction() | function | Promise | Opens a MySQL transaction
| commit() | function | Promise | Closes a MySQL transaction.
| rollback() | function | Promise | Rolls back a MySQL transaction.
| pause() | function |  | Wrapper for `pause()`. See `node-mysql`.
| resume() | function |  | Wrapper for `resume()`. See `node-mysql`.
| end() | function |  | Wrapper for `end()`. See `node-mysql`.
| destroy() | function |  | Wrapper for `destroy()`. See `node-mysql`.

## Tests

Running the unit tests requires a mysql server.

Set the environment variables MYSQL_DATABASE, MYSQL_HOST, MYSQL_PORT, MYSQL_USER and MYSQL_PASSWORD. Then run npm test.

For example, if you have an installation of mysql running on localhost:3306 and no password set for the root user, run:

```
$ mysql -u root -e "CREATE DATABASE IF NOT EXISTS sand_mysql"
$ MYSQL_HOST=localhost MYSQL_PORT=3306 MYSQL_DATABASE=sand_mysql MYSQL_USER=root MYSQL_PASSWORD= npm test
```