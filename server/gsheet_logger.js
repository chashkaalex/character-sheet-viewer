// --- CONFIGURATION CONSTANTS ---
const LOG_SHEET_ID = '1QSNGzKy8-xmSyJZHh97bZlFJkC0aOlR_SWd0kpbxl8M';

const LOG_SHEET_NAME = 'ExecutionLogs';

/**
 * Custom logger that writes execution details to a shared Google Sheet.
 * @param {string} functionName The name of the function being executed (e.g., 'doGet').
 * @param {string} message The log message or error description.
 * @param {string} type The type of log: 'INFO' or 'ERROR'.
 */
function recordUserLog(functionName, message, type = 'INFO') {
  try {
    // Attempt to get the user's email; falls back if not authorized.
    const userEmail = Session.getActiveUser().getEmail() || Session.getEffectiveUser().getEmail() || 'ANONYMOUS/UNAUTHORIZED';
    const timestamp = new Date();

    const sheet = SpreadsheetApp.openById(LOG_SHEET_ID).getSheetByName(LOG_SHEET_NAME);

    // Append a new row with the structured log data
    sheet.appendRow([
      timestamp,
      type,
      userEmail,
      functionName,
      message
    ]);

  } catch (e) {
    // Critical failure: if the logger itself fails (e.g., wrong Sheet ID, quota exceeded)
    console.error('CRITICAL: Failed to write log to sheet: ' + e.message);
  }
}
