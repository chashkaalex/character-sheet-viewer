const { GDocsAdapter } = require('./_gdocs_adapter');
const { LocalAdapter } = require('./_local_adapter');

let adapter;

// Determine environment dynamically
if (typeof DocumentApp !== 'undefined') {
    // We are running in Google Apps Script context
    adapter = new GDocsAdapter();
} else {
    // We are running in Node.js / Local context
    adapter = new LocalAdapter();
}

if (typeof module !== 'undefined') {
    module.exports = {
        adapter,
        // Export classes for testing/override purposes
        GDocsAdapter,
        LocalAdapter
    };
}

