const path = require('path');
const fs = require('fs');
const Module = require('module');

const backendModules = path.resolve(__dirname, '../backend/node_modules');
const frontendModules = path.resolve(__dirname, '../frontend/node_modules');

// Hook Module._resolveFilename to seamlessly resolve dependencies from backend/node_modules or frontend/node_modules
const originalResolveFilename = Module._resolveFilename;
Module._resolveFilename = function (request, parent, isMain, options) {
  try {
    return originalResolveFilename.call(this, request, parent, isMain, options);
  } catch (err) {
    try {
      return require.resolve(request, { paths: [backendModules, frontendModules] });
    } catch (e) {
      throw err;
    }
  }
};

// Try loading root .env first, fallback to backend/.env
const rootEnv = path.resolve(__dirname, '../.env');
const backendEnv = path.resolve(__dirname, '../backend/.env');

try {
  const dotenv = require('dotenv');
  if (fs.existsSync(rootEnv)) {
    dotenv.config({ path: rootEnv });
  } else if (fs.existsSync(backendEnv)) {
    dotenv.config({ path: backendEnv });
  }
} catch (e) {
  // Dotenv fallback
}

module.exports = {
  rootEnv,
  backendEnv,
};
