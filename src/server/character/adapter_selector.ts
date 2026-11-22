import { GDocsAdapter } from './gdocs_adapter';
import { DocumentAdapter } from './document_adapter';

let adapter: DocumentAdapter;
let LocalAdapter: any;

// Determine environment dynamically
if (typeof DocumentApp !== 'undefined') {
    // We are running in Google Apps Script context
    adapter = new GDocsAdapter();
} else {
    // We are running in Node.js / Local context
    try {
        // Dynamically require the local adapter from the test directory (prevent Vite from bundling local_adapter into GAS)
        const localAdapterPath = '../../tests/local_tests/' + 'local_adapter';
        // @ts-ignore
        LocalAdapter = require(localAdapterPath).LocalAdapter;
        adapter = new LocalAdapter();
    } catch (e) {
        // @ts-ignore
        console.error('Failed to load LocalAdapter:', e.message);
    }
}

export { adapter, GDocsAdapter, LocalAdapter };
