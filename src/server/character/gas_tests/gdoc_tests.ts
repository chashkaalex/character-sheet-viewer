/**
 * Tests for Google Document integration and property updates.
 */

const throrsTAndASheetId = '1_Is4lS5xB7Wz14-SKDw7NpWKI17FO6hFN6TzZjgbIaU';   //Thors t&a sheet

export function LogTabs() {
  const tabs = (DocumentApp as any).openById(throrsTAndASheetId).getTabs();
  console.log(tabs);
}
