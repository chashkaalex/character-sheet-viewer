
// Landing page functionality
document.addEventListener('DOMContentLoaded', function () {
  const landingPage = document.getElementById('landingPage');
  const characterSheetContainer = document.getElementById('characterSheetContainer');

  // Always show landing page first
  landingPage.style.display = 'block';
  characterSheetContainer.style.display = 'none';

  // Add button click handler
  document.getElementById('getButton').addEventListener('click', function () {
    const enteredValue = /** @type {HTMLInputElement} */ (document.getElementById('docId')).value.trim();
    const errorDiv = document.getElementById('errorMessage');

    // Clear previous errors
    errorDiv.style.display = 'none';

    if (!enteredValue) {
      showError('Please enter a document ID');
      return;
    }

    // Basic validation for Google Docs ID format
    if (!/^[a-zA-Z0-9_-]+$/.test(enteredValue)) {
      showError('Please enter a valid document ID');
      return;
    }

    // Load character data with the entered docId
    loadCharacterData(enteredValue);
  });

  // Focus on the input field when page loads
  document.getElementById('docId').focus();
});

function showError(message) {
  const errorDiv = document.getElementById('errorMessage');
  errorDiv.textContent = message;
  errorDiv.style.display = 'block';
}

function loadCharacterData(docId) {
  // Call the Google Apps Script function with the user-provided docId
  google.script.run.withSuccessHandler(function (response) {
    // Only switch UI after we have a valid character representation
    if (response && !response.error && response.parseSuccess) {
      document.getElementById('landingPage').style.display = 'none';
      document.getElementById('characterSheetContainer').style.display = 'block';
      onCharacterRepresentation(response);
    } else {
      const message = (response && response.errorMessage)
        ? response.errorMessage
        : 'Failed to load character. Please verify the document ID.';

      if (response && response.parseErrors && response.parseErrors.length > 0) {
        const detailedMessage = message + '\n\nDetails:\n' + response.parseErrors.join('\n');
        alert(detailedMessage);
      } else if (response && response.error) {
        alert(message);
      }

      showError(message);
    }
  }).GetCharacterRepByDocId(docId);
}
