import { onCharacterRepresentation } from './character_script';

/* global SCRIPT_URL, HAS_ID, CHARACTER_ID, CHARACTER_PAYLOAD, google */
document.addEventListener('DOMContentLoaded', function () {
  const landingPage = document.getElementById('landingPage');
  const characterSheetContainer = document.getElementById('characterSheetContainer');

  // If we have a pre-fetched character payload (page was loaded via redirect with ?id=),
  // skip the landing page entirely and apply the payload directly — no extra round-trip.
  if (typeof CHARACTER_PAYLOAD !== 'undefined' && CHARACTER_PAYLOAD) {
    landingPage.style.display = 'none';
    characterSheetContainer.style.display = 'block';
    // @ts-ignore
    onCharacterRepresentation(CHARACTER_PAYLOAD);
    return;
  }

  // If we have a character ID but no payload (e.g. parse error during doGet),
  // fall back to loading via API call.
  if (typeof HAS_ID !== 'undefined' && HAS_ID && typeof CHARACTER_ID !== 'undefined' && CHARACTER_ID) {
    landingPage.style.display = 'none';
    characterSheetContainer.style.display = 'block';
    // @ts-ignore
    loadCharacterData(CHARACTER_ID);
    return;
  }

  // Otherwise show the landing page
  if (landingPage) landingPage.style.display = 'block';
  if (characterSheetContainer) characterSheetContainer.style.display = 'none';

  // Add button click handler
  const getButton = document.getElementById('getButton');
  if (getButton) {
    getButton.addEventListener('click', function () {
      const docIdElement = document.getElementById('docId');
      const enteredValue = (docIdElement instanceof HTMLInputElement) ? docIdElement.value.trim() : '';
      const errorDiv = document.getElementById('errorMessage');

      // Clear previous errors
      if (errorDiv) errorDiv.style.display = 'none';

      if (!enteredValue) {
        showError('Please enter a document ID');
        return;
      }

      // Basic validation for Google Docs ID format
      if (!/^[a-zA-Z0-9_-]+$/.test(enteredValue)) {
        showError('Please enter a valid document ID');
        return;
      }

      // Redirect to trigger doGet with the ID so the browser tab title updates
      // @ts-ignore
      window.top.location.href = SCRIPT_URL + '?id=' + encodeURIComponent(enteredValue);
    });
  }

  // Focus on the input field when page loads
  const docIdInput = document.getElementById('docId');
  if (docIdInput) docIdInput.focus();
});

export function showError(message) {
  const errorDiv = document.getElementById('errorMessage');
  if (errorDiv) {
    errorDiv.textContent = message;
    errorDiv.style.display = 'block';
  }
}

export function loadCharacterData(docId) {
  console.log('Starting character data load for:', docId);
  // Call the Google Apps Script function with the user-provided docId
  // @ts-ignore
  google.script.run
    .withFailureHandler(function (err) {
      console.error('SERVER ERROR:', err);
      showError('Server error: ' + err.message);
    })
    .withSuccessHandler(function (response) {
      console.log('Character data received:', response ? 'Success' : 'Empty');
      // Only switch UI after we have a valid character representation
      if (response && !response.error && response.parseSuccess) {
        const landingPage = document.getElementById('landingPage');
        const characterSheetContainer = document.getElementById('characterSheetContainer');
        if (landingPage) landingPage.style.display = 'none';
        if (characterSheetContainer) characterSheetContainer.style.display = 'block';
        onCharacterRepresentation(response);

        // Update URL without reload for bookmarks/sharing
        // @ts-ignore
        if (typeof google !== 'undefined' && google.script && google.script.history) {
          // @ts-ignore
          google.script.history.push({ docId: docId }, { id: docId }, '');
        }
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
