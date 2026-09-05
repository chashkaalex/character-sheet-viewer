import { CharacterRep } from '../../server/character/character_rep';
import { onCharacterRepresentation } from './character_script';

let activeEventSource: EventSource | null = null;
let activeStreamUrl: string | null = null;
const processedStatusKeys = new Set<string>();

/**
 * Displays a toast notification in the UI for party sync events.
 */
export function showPartyNotification(message: string, isError = false) {
  let container = document.getElementById('partyNotificationContainer');
  if (!container) {
    container = document.createElement('div');
    container.id = 'partyNotificationContainer';
    container.className = 'party-notification-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `party-toast ${isError ? 'party-toast-error' : 'party-toast-success'}`;
  toast.innerHTML = `
    <div class="party-toast-content">
      <span class="party-toast-icon">${isError ? '⚠' : '✨'}</span>
      <span class="party-toast-text">${message}</span>
    </div>
  `;

  container.appendChild(toast);

  // Animate in and auto-dismiss
  setTimeout(() => {
    toast.classList.add('show');
  }, 10);

  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 400);
  }, 5000);
}

/**
 * Consumes and deletes a status from Firebase Realtime Database.
 */
export async function deleteStatusFromDb(
  dbLink: string,
  partyName: string,
  memberName: string,
  statusKey: string
): Promise<void> {
  const url = `${dbLink}/parties/${encodeURIComponent(partyName)}/members/${encodeURIComponent(memberName)}/statuses/${encodeURIComponent(statusKey)}.json`;
  try {
    const response = await fetch(url, { method: 'DELETE' });
    if (!response.ok) {
      console.error(`Failed to delete consumed status ${statusKey} from DB: ${response.statusText}`);
    } else {
      console.log(`Successfully deleted consumed status ${statusKey} from DB.`);
    }
  } catch (err) {
    console.error(`Error deleting consumed status ${statusKey} from DB:`, err);
  }
}

/**
 * Processes an incoming status payload from Firebase and applies it to the character sheet.
 */
export function handleIncomingStatus(
  statusKey: string,
  statusData: any,
  characterRep: CharacterRep
) {
  if (!statusData || typeof statusData !== 'object') return;
  if (processedStatusKeys.has(statusKey)) {
    return;
  }

  const statusName = statusData.statusName;
  const duration = typeof statusData.duration === 'number' ? statusData.duration : 1;
  const senderName = statusData.senderName || 'Party member';
  const durationUnit = statusData.durationUnit || 'rounds';

  if (!statusName) {
    console.warn('Ignoring status with missing statusName:', statusData);
    return;
  }

  // Immediately mark as processed to prevent any duplicate execution
  processedStatusKeys.add(statusKey);
  console.log(`[PartySync] Processing incoming status '${statusName}' from ${senderName} (key: ${statusKey})...`);

  // Call GAS server to apply status to character sheet
  if (typeof google !== 'undefined' && google.script && google.script.run) {
    google.script.run
      .withSuccessHandler(function (updatedRep: CharacterRep) {
        onCharacterRepresentation(updatedRep);
        showPartyNotification(`Received status "<b>${statusName}</b>" from ${senderName} (${duration} ${durationUnit})`);

        // Delete from Realtime DB once successfully applied
        if (characterRep.dbLink && characterRep.partyName) {
          const dbMemberNode = characterRep.partyNickname || characterRep.name;
          deleteStatusFromDb(characterRep.dbLink, characterRep.partyName, dbMemberNode, statusKey);
        }
      })
      .withFailureHandler(function (error: Error) {
        processedStatusKeys.delete(statusKey);
        console.error(`[PartySync] Failed to apply status '${statusName}':`, error);
        showPartyNotification(`Failed to apply status "${statusName}": ${error.message}`, true);
      })
      .AddStatusToCharacter(characterRep.docId, statusName, duration);
  } else {
    console.log(`[PartySync (Local)] Would apply ${statusName} (${duration} ${durationUnit}) and delete ${statusKey}`);
    showPartyNotification(`[Simulated] Received "${statusName}" from ${senderName} (${duration} ${durationUnit})`);
    if (characterRep.dbLink && characterRep.partyName) {
      const dbMemberNode = characterRep.partyNickname || characterRep.name;
      deleteStatusFromDb(characterRep.dbLink, characterRep.partyName, dbMemberNode, statusKey);
    }
  }
}

/**
 * Starts the passive real-time status listener for the loaded character.
 */
export function startPartyStatusListener(characterRep: CharacterRep) {
  const dbLink = characterRep.dbLink;
  const partyName = characterRep.partyName;
  const memberName = characterRep.partyNickname || characterRep.name;

  if (!dbLink || !partyName || !memberName) {
    return;
  }

  if (typeof EventSource === 'undefined') {
    console.warn('[PartySync] EventSource is not supported in this browser environment.');
    return;
  }

  const streamUrl = `${dbLink}/parties/${encodeURIComponent(partyName)}/members/${encodeURIComponent(memberName)}/statuses.json`;

  // If already listening to this exact member stream, do not reconnect
  if (activeEventSource && activeStreamUrl === streamUrl) {
    return;
  }

  stopPartyStatusListener();
  console.log(`[PartySync] Connecting passive listener for '${memberName}' to: ${streamUrl}`);

  try {
    const eventSource = new EventSource(streamUrl);
    activeEventSource = eventSource;
    activeStreamUrl = streamUrl;

    eventSource.addEventListener('put', (event: MessageEvent) => {
      try {
        const payload = JSON.parse(event.data);
        if (!payload || payload.data === null || payload.data === undefined) {
          return;
        }

        const path = payload.path || '/';
        const data = payload.data;

        if (path === '/') {
          // Whole statuses map received
          if (typeof data === 'object') {
            for (const [key, item] of Object.entries(data)) {
              handleIncomingStatus(key, item, characterRep);
            }
          }
        } else {
          // Specific sub-path (e.g. "/-Ny123")
          const key = path.replace(/^\//, '');
          handleIncomingStatus(key, data, characterRep);
        }
      } catch (err) {
        console.error('[PartySync] Error parsing SSE put event:', err);
      }
    });

    eventSource.addEventListener('patch', (event: MessageEvent) => {
      try {
        const payload = JSON.parse(event.data);
        if (!payload || !payload.data) return;

        const data = payload.data;
        if (typeof data === 'object') {
          for (const [key, item] of Object.entries(data)) {
            handleIncomingStatus(key, item, characterRep);
          }
        }
      } catch (err) {
        console.error('[PartySync] Error parsing SSE patch event:', err);
      }
    });

    eventSource.onerror = (error) => {
      console.warn('[PartySync] EventSource connection event/reconnect:', error);
    };

    console.log(`[PartySync] Listening for statuses for ${memberName} in ${partyName}`);
  } catch (err) {
    console.error('[PartySync] Failed to initialize EventSource:', err);
  }
}

/**
 * Stops and closes the active party status listener.
 */
export function stopPartyStatusListener() {
  if (activeEventSource) {
    console.log('[PartySync] Closing active EventSource listener.');
    activeEventSource.close();
    activeEventSource = null;
  }
  activeStreamUrl = null;
}
