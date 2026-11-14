import { characterRep } from '../state';
import { onCharacterRepresentation } from '../character_script';

export function PromprForPositiveInteger(message) {
  const amount = prompt(message, '1');

  if (amount === null || amount === '') {
    return { error: true, message: 'User cancelled' };
  }
  const result = parseInt(amount);
  if (Number.isNaN(result) || result <= 0) {
    alert('Please enter a valid positive integer.');
    return { error: true, message: 'invalid input' };
  }

  return { error: false, result: result };
}

/**
 * Shows the Inflict Damage modal.
 */
export function showInflictModal() {
  const modal = document.getElementById('inflictModal');
  if (!modal) return;

  const titleEl = document.getElementById('inflictModalTitle');
  if (titleEl && characterRep && characterRep.name) {
    titleEl.textContent = `Inflict Damage on ${characterRep.name}`;
  }

  const physicalInput = document.getElementById('damagePhysical') as HTMLInputElement;
  if (physicalInput) physicalInput.value = '';

  const energyIds = ['damageAcid', 'damageCold', 'damageElectricity', 'damageFire', 'damageSonic'];
  energyIds.forEach(id => {
    const el = document.getElementById(id) as HTMLInputElement;
    if (el) el.value = '';
  });

  const container = document.getElementById('additionalDamageTypesContainer');
  const icon = document.getElementById('toggleAdditionalDamageIcon');
  if (container) container.style.display = 'none';
  if (icon) icon.textContent = '▶';

  modal.style.display = 'block';

  if (physicalInput) {
    setTimeout(() => physicalInput.focus(), 50);
  }
}

/**
 * Closes the Inflict Damage modal.
 */
export function closeInflictModal() {
  const modal = document.getElementById('inflictModal');
  if (modal) {
    modal.style.display = 'none';
  }
}

/**
 * Toggles the extendable additional damage types section.
 */
export function toggleAdditionalDamageTypes() {
  const container = document.getElementById('additionalDamageTypesContainer');
  const icon = document.getElementById('toggleAdditionalDamageIcon');
  if (!container) return;

  const isHidden = container.style.display === 'none';
  container.style.display = isHidden ? 'block' : 'none';
  if (icon) {
    icon.textContent = isHidden ? '▼' : '▶';
  }
}

/**
 * Submits the inflicted damage (physical only for now).
 */
export function submitInflictDamage() {
  const physicalInput = document.getElementById('damagePhysical') as HTMLInputElement;
  const rawValue = physicalInput ? physicalInput.value.trim() : '';

  if (!rawValue) {
    alert('Please enter a valid positive integer for physical damage.');
    if (physicalInput) physicalInput.focus();
    return;
  }

  const damageAmount = parseInt(rawValue, 10);
  if (isNaN(damageAmount) || damageAmount <= 0) {
    alert('Please enter a valid positive integer for physical damage.');
    if (physicalInput) physicalInput.focus();
    return;
  }

  closeInflictModal();

  console.log(`Inflicting ${damageAmount} physical damage to ${characterRep?.name}`);

  google.script.run
    .withSuccessHandler(onCharacterRepresentation)
    .withFailureHandler(function (error) {
      console.error('Error calling server function:', error);
      alert('Error inflicting damage: ' + error.message);
    })
    .UpdateHp(characterRep.docId, damageAmount, 'inflict');
}

/**
 * Inflicts damage on the character (entry point for Inflict button).
 */
export function inflict() {
  showInflictModal();
}

export function cure() {
  const promptResult = PromprForPositiveInteger(`How much damage to cure on ${characterRep.name}?`);
  if (promptResult.error) {
    alert(promptResult.message);
    return;
  }
  const damageAmount = promptResult.result;

  console.log(`Curing ${damageAmount} damage to ${characterRep.name}`);

  google.script.run
    .withSuccessHandler(onCharacterRepresentation)
    .withFailureHandler(function (error) {
      console.error('Error calling server function:', error);
      alert('Error curing damage: ' + error.message);
    })
    .UpdateHp(characterRep.docId, damageAmount, 'cure');
}

if (typeof window !== 'undefined') {
  window.addEventListener('click', function (event) {
    const inflictModal = document.getElementById('inflictModal');
    if (inflictModal && event.target === inflictModal) {
      inflictModal.style.display = 'none';
    }
  });

  window.addEventListener('keydown', function (event) {
    const inflictModal = document.getElementById('inflictModal');
    if (inflictModal && inflictModal.style.display === 'block') {
      if (event.key === 'Escape') {
        inflictModal.style.display = 'none';
      } else if (event.key === 'Enter') {
        const activeEl = document.activeElement;
        if (activeEl && inflictModal.contains(activeEl)) {
          event.preventDefault();
          submitInflictDamage();
        }
      }
    }
  });
}

