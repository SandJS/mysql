module.exports = {
  autoReconnect: true,
  maxRetries: 3,
  modifyRows: function(err, rows, callback) {
    callback(err, rows);
  }
};