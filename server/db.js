const fs = require('fs');
const path = require('path');
const Datastore = require('nedb');

const fallbackRoot = path.resolve(__dirname, '../db-data');
const dataRoot = process.env.DATA_ROOT
  ? path.resolve(process.env.DATA_ROOT)
  : fallbackRoot;

if (!fs.existsSync(dataRoot)) {
  fs.mkdirSync(dataRoot, { recursive: true });
}

function createStore(name) {
  const filename = path.join(dataRoot, name);
  return new Datastore({ filename, autoload: true });
}

const db = {
  user: createStore('users.db'),
  message: createStore('messages.db')
};

module.exports = db;
