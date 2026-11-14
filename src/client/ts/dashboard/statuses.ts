import { characterRep } from '../state';
import { onCharacterRepresentation } from '../character_script';

/**
 * Converts duration from various time units to rounds.
 */
export function convertToRounds(duration, unit) {
  switch (unit) {
    case 'rounds':
      return duration;
    case 'minutes':
      return duration * 10; // 1 minute = 10 rounds (6 seconds per round)
    case 'hours':
      return duration * 600; // 1 hour = 60 minutes = 600 rounds
    default:
      return duration; // Default to rounds if unknown unit
  }
}

export function NewStatus() {
  console.log('NewStatus for ' + characterRep.name);
  const statusesList = document.getElementById('statusesList');
  const emptyStatus = document.getElementById('emptyStatus') as HTMLElement;
  const clone = emptyStatus.cloneNode(true) as HTMLElement;
  clone.id = ''; // Clear the ID to avoid duplicates
  statusesList.insertBefore(clone, emptyStatus);

  (clone.querySelector('.status-name-input') as HTMLElement).style.display = 'inline-block';
  (clone.querySelector('.timed-controls') as HTMLElement).style.display = 'inline-flex';
  (clone.querySelector('.status-confirm-btn') as HTMLElement).style.display = 'inline-block';
  (clone.querySelector('.status-remove-btn') as HTMLElement).style.display = 'inline-block'; // Show remove for cancelling

  // Disable add button to prevent multiple new statuses
  (document.getElementById('addButton') as HTMLButtonElement).disabled = true;
}

export function AddStatus(button) {
  console.log('AddStatus for ' + characterRep.name);
  const statusDiv = button.closest('.status-item');
  const inputElem = statusDiv.querySelector('.status-name-input');

  if (inputElem.value.trim() === '') {
    alert('Please enter a valid status.');
    return;
  }

  const statusName = inputElem.value.trim();

  if (characterRep.statuses) {
    const existingStatus = characterRep.statuses.find(status =>
      status.name.toLowerCase() === statusName.toLowerCase()
    );

    if (existingStatus) {
      alert(`A status with the name "${statusName}" already exists.`);
      return;
    }
  }

  const durationInput = statusDiv.querySelector('.status-duration-input');
  const unitSelect = statusDiv.querySelector('.status-unit-select');
  const durationValue = durationInput ? parseInt(durationInput.value) || 1 : 1;
  const unit = unitSelect ? unitSelect.value : 'rounds';
  const durationInRounds = convertToRounds(durationValue, unit);

  google.script.run
    .withSuccessHandler(onCharacterRepresentation)
    .withFailureHandler(function (error) {
      console.error('Error adding status:', error);
      alert('Error adding status: ' + error.message);
    })
    .AddStatusToCharacter(characterRep.docId, statusName, durationInRounds);

  (document.getElementById('addButton') as HTMLButtonElement).disabled = false;
}

export function RemoveStatus(button, statusName) {
  const statusDiv = button.closest('.status-item');
  const confirmButton = statusDiv.querySelector('.status-confirm-btn');

  // If the confirm button exists and is visible, it's an unconfirmed row, so re-enable the add button.
  if (confirmButton && confirmButton.style.display !== 'none') {
    (document.getElementById('addButton') as HTMLButtonElement).disabled = false;
    statusDiv.remove();
    console.log('RemoveStatus for unconfirmed status');
    return;
  }

  if (statusName) {
    google.script.run
      .withSuccessHandler(onCharacterRepresentation)
      .withFailureHandler(function (error) {
        console.error('Error removing status:', error);
        alert('Error removing status: ' + error.message);
      })
      .RemoveStatusFromCharacter(characterRep.docId, statusName);
  } else {
    statusDiv.remove();
    console.log('RemoveStatus for ' + characterRep.name);
  }
}

export function ClearAllStatuses() {
  if (!confirm('Are you sure you want to clear all active statuses?')) {
    return;
  }
  google.script.run
    .withSuccessHandler(onCharacterRepresentation)
    .withFailureHandler(function (error) {
      console.error('Error clearing statuses:', error);
      alert('Error clearing statuses: ' + error.message);
    })
    .RemoveAllStatusesFromCharacter(characterRep.docId);
}

