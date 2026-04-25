import { GDocsAdapter } from './_gdocs_adapter';
import { DocumentAdapter } from './_document_adapter';

let adapter: DocumentAdapter;
let LocalAdapter: any;

// Determine environment dynamically
if (typeof DocumentApp !== 'undefined') {
    // We are running in Google Apps Script context
    adapter = new GDocsAdapter();
} else {
    // We are running in Node.js / Local context
    try {
        // Dynamically require the local adapter from the test directory
        // Use require for dynamic loading in Node.js environment
        // @ts-ignore
        LocalAdapter = require('../../local_tests/_local_adapter').LocalAdapter;
        adapter = new LocalAdapter();
    } catch (e) {
        // @ts-ignore
        console.error('Failed to load LocalAdapter:', e.message);
    }
}

export { adapter, GDocsAdapter, LocalAdapter };

// @ts-ignore
if (typeof module !== 'undefined') {
    // @ts-ignore
    module.exports = {
        adapter,
        GDocsAdapter,
        LocalAdapter
    };
}
