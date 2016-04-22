module.exports = {
  autoReconnect: true,
  modifyRows: function(err, rows, callback) {
    callback(err, rows);
  }
};