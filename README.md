# Sand MySQL Wrapper

## Description
This grain provides convenience functions working with mysql.

These convenience functions include autoloading config, automatic connection setup and cleanup, basic querying, 
querying for a single row, update query building, insert query building, support for prepared statements.
(although note that this uses node-mysql which does not use prepared statements under the hood as far as I know).

## Configuring in Sand.js Applications
Config is autoloaded from `config/mysql.js`.

To use with `sand.mysql`, in your `app.js`, call `.use(require('sand-mysql'))` on `new sand()` before you call `.start()`

Example
```
const sand = require('sand');

new sand()
    .use(require('sand-mysql'))
    .start();
```

In the context of a Sand.js application which has also loaded `sand-http`, a mysql connection is autoloaded onto the `Context`. 
This is available globally throughout your sand application at `sand.ctx.mysql`. You do not need to worry about cleaning 
up connections, since `sand-http` will handle cleanup automatically when the request ends.

NOTE: `sand.ctx` is like a `domain` and is just a unique context per request where connections can be set up. (We hope to add
more full documentation to `sand-http` eventually)

## Basic Usage
```
sand.ctx.mysql.query('select * from user where join_time > ? order by join_time desc', [1442023198]); // [{user_id: 1, name: 'me'}, ...]

sand.ctx.mysql.selectOne('select * from user where join_time > ? order by join_time desc limit 1', [1442023198]); // {user_id: 1, name: 'me'}

sand.ctx.mysql.selectOne('select * from user where join_time > ? order by join_time desc limit 1', [1442023198]); // {user_id: 1, name: 'me'}
```