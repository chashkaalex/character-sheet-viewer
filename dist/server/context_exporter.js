/**
 * Exports the content of a Google Document to a JSON string, preserving strikethrough formatting.
 * Run this function via 'clasp run exportDocumentContext --params "['YOUR_DOC_ID']"'
 * or from the Apps Script Editor.
 *
 * @param {string} docId The ID of the Google Document to export.
 * @returns {string} JSON string representation of the document content.
 */
function exportDocumentContext(docId) {
  if (!docId) {
    throw new Error('Please provide a document ID.');
  }

  const doc = DocumentApp.openById(docId);
  const body = doc.getBody();
  const numChildren = body.getNumChildren();
  const content = [];

  for (let i = 0; i < numChildren; i++) {
    const child = body.getChild(i);
    const type = child.getType();

    const item = {
      type: String(type),
      text: '',
      isStrikethrough: false
    };

    if (type === DocumentApp.ElementType.PARAGRAPH) {
      const p = child.asParagraph();
      item.text = p.getText();
      // Check if the first character is struck through as a proxy for the line
      if (item.text.length > 0) {
        item.isStrikethrough = p.editAsText().isStrikethrough(0) || false;
      }
    } else if (type === DocumentApp.ElementType.LIST_ITEM) {
      const l = child.asListItem();
      item.text = l.getText();
      if (item.text.length > 0) {
        item.isStrikethrough = l.editAsText().isStrikethrough(0) || false;
      }
      item.nestingLevel = l.getNestingLevel();
    } else if (type === DocumentApp.ElementType.TABLE) {
      // Basic table support - just getting text
      item.text = child.asTable().getText();
    }

    if (item.text.trim() !== '') {
      content.push(item);
    }
  }

  const result = JSON.stringify(content, null, 2);
  console.log(result); // Log to Stackdriver/Execution log
  return result;
}

if (typeof module !== 'undefined') {
  module.exports = {
    exportDocumentContext
  };
}
