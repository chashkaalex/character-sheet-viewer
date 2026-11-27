import { characterRep } from './state';
import { onCharacterRepresentation, UpdateValueAndTooltip } from './character_script';
import { advanceRound } from './round_actions';
import { convertToRounds } from './dashboard/statuses';

export * from './dashboard/weapons';
export * from './dashboard/special_attacks';
export * from './dashboard/combat';
export * from './dashboard/statuses';
export * from './dashboard/hp';

export function refreshCharacterData() {
  if (!characterRep) return;
  google.script.run
    .withSuccessHandler(onCharacterRepresentation)
    .withFailureHandler(function (error) {
      console.error('Error refreshing character data:', error);
    })
    .GetCharacterRepByDocId(characterRep.docId);

  if (characterRep.initBonus) {
    UpdateValueAndTooltip('initBonus', characterRep.initBonus);
    const initBonusSignEl = document.getElementById('initBonusSign');
    if (initBonusSignEl) {
      const bonusVal = Number(characterRep.initBonus.bonus ?? characterRep.initBonus.currentScore ?? 0);
      initBonusSignEl.textContent = bonusVal >= 0 ? '+' : '';
    }
  }
  if (characterRep.ac) {
    UpdateValueAndTooltip('acValue', characterRep.ac);
  }

  console.log('Character data refreshed successfully');
}

/**
 * Handles the time passed button click.
 */
export function onTimePassed() {
  const amountInput = document.querySelector('.time-amount-input');
  const unitSelect = document.querySelector('.time-unit-select');

  const amount = amountInput ? parseInt((amountInput as HTMLInputElement).value) || 1 : 1;
  const unit = unitSelect ? (unitSelect as HTMLSelectElement).value : 'rounds';
  const roundsElapsed = convertToRounds(amount, unit);

  console.log(`Time passing: ${amount} ${unit} (${roundsElapsed} rounds)`);

  google.script.run
    .withSuccessHandler((rep: any) => {
      if (roundsElapsed >= 1 && characterRep?.docId) {
        advanceRound(characterRep.docId, roundsElapsed);
      }
      onCharacterRepresentation(rep);
    })
    .withFailureHandler(function (error) {
      console.error('Error processing time elapsed:', error);
      alert('Error processing time elapsed: ' + error.message);
    })
    .OnRoundsElapsed(characterRep.docId, roundsElapsed);

  if (amountInput) {
    (amountInput as HTMLInputElement).value = '1';
  }
  if (unitSelect) {
    (unitSelect as HTMLSelectElement).value = 'rounds';
  }
}

/**
 * Handles the Long Rest button click: replenishes all spell slots, daily class/feat resources, and daily items.
 */
export function onLongRest() {
  if (!characterRep || !characterRep.docId) return;

  const eightHoursInRounds = convertToRounds(8, 'hours');
  google.script.run
    .withSuccessHandler((rep: any) => {
      if (characterRep?.docId) {
        advanceRound(characterRep.docId, eightHoursInRounds);
      }
      onCharacterRepresentation(rep);
    })
    .withFailureHandler(function (error) {
      console.error('Error performing Long Rest:', error);
      alert('Error performing Long Rest: ' + error.message);
    })
    .OnLongRest(characterRep.docId);
}

export function showPartyModal() {
  if (!characterRep || !characterRep.partyName) return;

  console.log(`Quick Statuses for ${characterRep.partyName}:`, characterRep.quickStatuses);

  const titleEl = document.getElementById('partyModalTitle');
  if (characterRep.partiesDocId) {
    titleEl.innerHTML = `<a href="https://docs.google.com/document/d/${characterRep.partiesDocId}/edit" target="_blank" style="color: inherit; text-decoration: underline;">${characterRep.partyName}</a>`;
  } else {
    titleEl.innerText = characterRep.partyName;
  }

  const rolzLinkEl = document.getElementById('partyModalRolzLink');
  if (rolzLinkEl) {
    if (characterRep.rolzRoomId) {
      const roomUrl = `https://rolz.org/dr?room=${encodeURIComponent(characterRep.rolzRoomId)}`;
      rolzLinkEl.innerHTML = `🎲 Rolz Room: <a href="${roomUrl}" target="_blank" rel="noopener noreferrer" style="color: inherit; text-decoration: underline; font-weight: 600;">${characterRep.rolzRoomId}</a>`;
      rolzLinkEl.style.display = 'block';
    } else {
      rolzLinkEl.innerHTML = '';
      rolzLinkEl.style.display = 'none';
    }
  }

  const list = document.getElementById('partyModalList');
  list.innerHTML = '';

  if (characterRep.partyMembers && characterRep.partyMembers.length > 0) {
    characterRep.partyMembers.forEach(member => {
      const li = document.createElement('li');
      li.style.padding = '8px 0';
      li.style.borderBottom = '1px solid #eee';

      if (member === characterRep.name) {
        li.style.fontWeight = 'bold';
        li.innerHTML = `${member} (You)`;
      } else {
        li.innerText = member;
      }
      list.appendChild(li);
    });
  } else {
    const li = document.createElement('li');
    li.innerText = 'No members discovered.';
    list.appendChild(li);
  }

  document.getElementById('partyModal').style.display = 'block';
}

export function closePartyModal() {
  document.getElementById('partyModal').style.display = 'none';
}

if (typeof window !== 'undefined') {
  window.addEventListener('click', function (event) {
    const partyModal = document.getElementById('partyModal');
    if (partyModal && event.target === partyModal) {
      partyModal.style.display = 'none';
    }
  });
}
