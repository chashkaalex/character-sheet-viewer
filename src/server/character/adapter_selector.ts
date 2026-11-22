import { GDocsAdapter } from './gdocs_adapter';
import { DocumentAdapter } from './document_adapter';

declare const __IS_GAS_BUILD__: boolean | undefined;

let adapter: DocumentAdapter;
let LocalAdapter: any;

// Determine environment: in GAS builds, __IS_GAS_BUILD__ is replaced with true at compile time so LocalAdapter is tree-shaken out
if ((typeof __IS_GAS_BUILD__ !== 'undefined' && __IS_GAS_BUILD__) || typeof DocumentApp !== 'undefined') {
    // We are running in Google Apps Script context
    adapter = new GDocsAdapter();
} else {
    // We are running in Node.js / Local test context
    try {
        // @ts-ignore
        LocalAdapter = require('../../tests/local_tests/local_adapter').LocalAdapter;
        adapter = new LocalAdapter();
    } catch (e) {
        // @ts-ignore
        console.error('Failed to load LocalAdapter:', e.message);
    }
}

export { adapter, GDocsAdapter, LocalAdapter };
