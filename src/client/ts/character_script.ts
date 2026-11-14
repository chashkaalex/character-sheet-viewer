import { characterRep, setCharacterRep } from './state';
import { populateWeaponDropdown, populateSpecialAttackDropdown, RemoveStatus, updateAttacksOfOpportunityDisplay } from './dashboard_script';
import { PrepareSpellsUI } from './spells_script';
import { startPartyStatusListener } from './party_sync_listener';
import { APP_VERSION as CLIENT_APP_VERSION } from '../../server/character/_version';
import { renderRoundActionsUI } from './round_actions';
import { addTooltip, UpdateValueAndTooltip } from './character/tooltip_rolz';
import { populateInventory } from './character/inventory';

export * from './character/tooltip_rolz';
export * from './character/inventory';


export function checkAppVersion(serverVersion?: string) {
  const badge = document.getElementById('appVersionBadge');
  if (badge) {
    badge.textContent = `v${CLIENT_APP_VERSION}`;
  }

  if (!serverVersion || serverVersion === CLIENT_APP_VERSION) {
    return;
  }

  const banner = document.getElementById('outdatedVersionBanner');
  const bannerText = document.getElementById('outdatedVersionText');
  if (bannerText) {
    bannerText.textContent = `⚠️ Outdated app version loaded (yours: v${CLIENT_APP_VERSION}, latest: v${serverVersion}). Please reload the page.`;
  }
  if (banner) {
    banner.style.display = 'flex';
  }
  if (badge) {
    badge.classList.add('outdated');
    badge.title = `Outdated! Loaded: v${CLIENT_APP_VERSION} | Latest on server: v${serverVersion}`;
  }
}


if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && typeof (window as any).google !== 'undefined' && (window as any).google.script?.run) {
      (window as any).google.script.run
        .withSuccessHandler((serverVer: string) => checkAppVersion(serverVer))
        .GetAppVersion();
    }
  });
}

export function onCharacterRepresentation(response) {
  console.log('char response handler called!!!');
  checkAppVersion(response?.appVersion);

  if (response.error) {
    let errorMessage = response.errorMessage;
    if (response.parseErrors && response.parseErrors.length > 0) {
      errorMessage += '\n\nDetails:\n' + response.parseErrors.join('\n');
    }
    alert(errorMessage);
    return;
  }

  if (!response.parseSuccess) {
    alert('Parse errors:\n' + response.parseErrors.join('\n'));
    return;
  }

  if (response.parseWarnings.length > 0) {
    alert('Parse warnings:\n' + response.parseWarnings.join('\n'));
  }

  setCharacterRep(response);

  if (response.mutationMessage) {
    alert(response.mutationMessage);
  }

  // Populate quick statuses datalist for adding new statuses
  const datalist = document.getElementById('quickStatusesList') as HTMLDataListElement;
  if (datalist) {
    datalist.innerHTML = '';
    if (characterRep.quickStatuses && characterRep.quickStatuses.length > 0) {
      characterRep.quickStatuses.forEach(status => {
        const option = document.createElement('option');
        option.value = status;
        datalist.appendChild(option);
      });
    }
  }

  // Always render statuses from server (this will clear existing ones and show only server statuses)
  renderServerStatuses(characterRep.statuses || []);

  //parsing and rendering
  // Format: Name, race classname1 classlevel1/classname2 classlevel2 etc.
  const docUrl = `https://docs.google.com/document/d/${characterRep.docId}/edit`;
  let nameDisplay = `<a href="${docUrl}" target="_blank" rel="noopener noreferrer">${characterRep.name}</a>`;

  if (characterRep.race) {
    nameDisplay += ` ( ${characterRep.race}`;
  }

  if (characterRep.classes && characterRep.classes.length > 0) {
    const classStrings = characterRep.classes.map(c => `${c.name} ${c.level}`);
    nameDisplay += ` ${classStrings.join('/')}`;
    nameDisplay += ' )';
  }

  document.getElementById('characterName').innerHTML = nameDisplay;

  //render hp
  document.getElementById('hpCurrent').innerHTML = characterRep.hp.current;
  document.getElementById('hpMax').innerHTML = characterRep.hp.max;
  const hpMeter = document.getElementById('hpMeter') as HTMLMeterElement;
  hpMeter.value = characterRep.hp.current;
  hpMeter.max = characterRep.hp.max;


  //render saves
  if (characterRep.saves) {
    UpdateValueAndTooltip('fortBonus', characterRep.saves.Fort);
    UpdateValueAndTooltip('refBonus', characterRep.saves.Ref);
    UpdateValueAndTooltip('willBonus', characterRep.saves.Will);
  }
  //render initiative and AC
  UpdateValueAndTooltip('initBonus', characterRep.initBonus);
  renderRoundActionsUI(characterRep.docId);

  //render speed
  document.getElementById('speedValue').innerHTML = characterRep.speed?.currentScore || '-';
  if (characterRep.speed) {
    addTooltip('speedValue', characterRep.speed.string);
  }

  UpdateValueAndTooltip('acValue', characterRep.ac);
  if (characterRep.ac && characterRep.ac.touch) {
    UpdateValueAndTooltip('touchAcValue', characterRep.ac.touch);
  }
  if (characterRep.ac && characterRep.ac.flatFooted) {
    UpdateValueAndTooltip('flatFootedAcValue', characterRep.ac.flatFooted);
  }

  // Populate weapon dropdown and display weapon stats
  populateWeaponDropdown();

  // Populate special attack dropdown and display special attack stats
  populateSpecialAttackDropdown();

  // Update attacks of opportunity
  updateAttacksOfOpportunityDisplay();

  //populate abilities table
  const abilitiesTableBody = document.querySelector('#abilitiesTable tbody');
  abilitiesTableBody.innerHTML = '';

  if (characterRep.abilities) {
    const abilityOrder = ['Str', 'Dex', 'Con', 'Int', 'Wis', 'Cha'];
    abilityOrder.forEach(abilityName => {
      const ability = characterRep.abilities[abilityName];
      if (ability) {
        const row = document.createElement('tr');
        row.innerHTML = `
          <td class="row-style">${abilityName}</td>
          <td class="row-style ability-score" data-ability="${abilityName}" data-field="score">${ability.score}</td>
          <td class="row-style ability-current" data-ability="${abilityName}" data-field="currentScore">${ability.currentScore}</td>
          <td class="row-style ability-modifier" data-ability="${abilityName}" data-field="modifier">${ability.modifier}</td>
        `;
        abilitiesTableBody.appendChild(row);

        // Add tooltips to ability properties
        const currentScoreElement = row.querySelector('.ability-current');
        addTooltip(currentScoreElement, ability.string, ability.rolzRollMessage);

        const modifierElement = row.querySelector('.ability-modifier');
        addTooltip(modifierElement, ability.string, ability.rolzRollMessage);
      }
    });
  }

  //populate skills table
  const skillsTableBody = document.querySelector('#skillsTable tbody');
  // Clear previous rows before repopulating to avoid duplicates
  skillsTableBody.innerHTML = '';
  if (characterRep.skills) {
    Object.entries(characterRep.skills)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .forEach(([skillName, skill]: [string, any]) => {
        const row = document.createElement('tr');
        row.innerHTML = `
              <td class="row-style">${skillName}</td>
              <td class="row-style skill-rank" data-skill="${skillName}">${skill.score}</td>
              <td class="row-style skill-bonus" data-skill="${skillName}">${skill.bonus}</td>
          `;
        skillsTableBody.appendChild(row);

        // Add tooltips to skill properties
        const bonusElement = row.querySelector('.skill-bonus');
        addTooltip(bonusElement, skill.string, skill.rolzRollMessage);
      });
  }

  //populate spells
  PrepareSpellsUI();

  //populate inventory
  populateInventory();

  //populate party UI
  const partyBtn = document.getElementById('partyButton');
  if (characterRep && characterRep.partyName) {
    partyBtn.style.display = 'inline-block';
  } else {
    partyBtn.style.display = 'none';
  }

  console.log(characterRep.partyName);
  console.log(characterRep.partyMembers);
  if (characterRep.dbLink) {
    console.log(`Firebase Realtime Database link: ${characterRep.dbLink}`);
    startPartyStatusListener(characterRep);
  } else {
    console.log('Firebase Realtime Database link (DB_LINK) not configured.');
  }

  // Trigger top bar ready animation
  const header = document.querySelector('.header');
  if (header) {
    header.classList.remove('ui-ready');
    void (header as HTMLElement).offsetWidth; // force reflow to restart animation
    header.classList.add('ui-ready');
  }
}
export function renderServerStatuses(statuses) {
  const statusesList = document.getElementById('statusesList');
  const emptyStatus = document.getElementById('emptyStatus');

  // Enable/disable the clear all button based on status presence
  const clearAllBtn = document.getElementById('clearAllStatusesButton') as HTMLButtonElement;
  if (clearAllBtn) {
    clearAllBtn.disabled = (!statuses || statuses.length === 0);
  }

  // Clear any existing statuses (except the empty template)
  const existingStatuses = statusesList.querySelectorAll('.status-item:not(#emptyStatus)');
  existingStatuses.forEach(status => status.remove());

  // Render each status from the server
  statuses.forEach(status => {
    const statusDiv = document.createElement('div');
    statusDiv.className = 'status-item';

    // Create the status display using the shared function
    const statusData = {
      name: status.name,
      duration: status.duration,
      elapsed: status.elapsed
    };

    createStatusDisplay(statusDiv, statusData);

    // Insert before the empty status template
    statusesList.insertBefore(statusDiv, emptyStatus);
  });
}

/**
 * Converts rounds to a readable time format
 * @param {number} rounds - The number of rounds
 * @returns {string} - Formatted time string
 */
export function formatRoundsToReadable(rounds) {
  if (rounds < 0) {
    return 'endless';
  }
  if (rounds >= 600) {
    const hours = Math.floor(rounds / 600);
    const remainingRounds = rounds % 600;
    if (remainingRounds === 0) {
      return `${hours} hour${hours !== 1 ? 's' : ''}`;
    }
    const minutes = Math.floor(remainingRounds / 10);
    const finalRounds = remainingRounds % 10;
    const parts = [`${hours} hour${hours !== 1 ? 's' : ''}`];
    if (minutes > 0) parts.push(`${minutes} min${minutes !== 1 ? 's' : ''}`);
    if (finalRounds > 0) parts.push(`${finalRounds} round${finalRounds !== 1 ? 's' : ''}`);
    return parts.join(', ');
  } else if (rounds >= 10) {
    const minutes = Math.floor(rounds / 10);
    const remainingRounds = rounds % 10;
    if (remainingRounds === 0) {
      return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
    }
    return `${minutes} min${minutes !== 1 ? 's' : ''}, ${remainingRounds} round${remainingRounds !== 1 ? 's' : ''}`;
  } else {
    return `${rounds} round${rounds !== 1 ? 's' : ''}`;
  }
}

export function createStatusDisplay(containerElement, statusData) {
  // Clear the container and create the new structure
  containerElement.innerHTML = '';

  // Create the status name display
  const nameSpan = document.createElement('span');
  nameSpan.className = 'status-name-display';
  nameSpan.textContent = statusData.name;
  containerElement.appendChild(nameSpan);

  // Create the duration display with readable format
  const durationSpan = document.createElement('span');
  durationSpan.className = 'status-duration-display';
  durationSpan.textContent = `Duration: ${formatRoundsToReadable(statusData.duration)}`;
  containerElement.appendChild(durationSpan);

  // Create the elapsed display with readable format
  const elapsedSpan = document.createElement('span');
  elapsedSpan.className = 'status-elapsed-display';
  elapsedSpan.textContent = `Elapsed: ${formatRoundsToReadable(statusData.elapsed)}`;
  containerElement.appendChild(elapsedSpan);

  // Add the remove button
  const removeBtn = document.createElement('button');
  removeBtn.className = 'status-remove-btn';
  removeBtn.textContent = '✖';
  removeBtn.onclick = function () { RemoveStatus(this, statusData.name); };
  containerElement.appendChild(removeBtn);
}

