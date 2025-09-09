// Simple logger wrapper used by backend modules.
// Honors SILENT_NON_ERRORS to silence info/warn/debug while always showing errors.
const SILENT = !!process.env.SILENT_NON_ERRORS;
const PUSH_DEBUG = !!process.env.PUSH_DEBUG;

function info(...args) {
  if (!SILENT) {
    console.info(...args);
  }
}

function warn(...args) {
  if (!SILENT) {
    console.warn(...args);
  }
}

function debug(...args) {
  if (PUSH_DEBUG) {
    console.debug(...args);
  }
}

function error(...args) {
  // Always print errors regardless of SILENT_NON_ERRORS
  console.error(...args);
}

module.exports = { info, warn, debug, error };
