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
  const physicalInput = document.getElementById('damagePhysical') as HTMLInputElement | null;
  const energyFields: Array<{ id: string; key: string; label: string }> = [
    { id: 'damageAcid', key: 'acid', label: 'Acid' },
    { id: 'damageCold', key: 'cold', label: 'Cold' },
    { id: 'damageElectricity', key: 'electricity', label: 'Electricity' },
    { id: 'damageFire', key: 'fire', label: 'Fire' },
    { id: 'damageSonic', key: 'sonic', label: 'Sonic' }
  ];

  const parseField = (input: HTMLInputElement | null): { valid: boolean; value: number } => {
    const raw = input ? input.value.trim() : '';
    if (!raw) return { valid: true, value: 0 };
    if (!/^\d+$/.test(raw)) return { valid: false, value: 0 };
    const parsed = parseInt(raw, 10);
    return { valid: !isNaN(parsed) && parsed >= 0, value: parsed };
  };

  const physParsed = parseField(physicalInput);
  if (!physParsed.valid) {
    alert('Please enter a valid non-negative integer for physical damage.');
    if (physicalInput) physicalInput.focus();
    return;
  }

  const energyDamage: Record<string, number> = {};
  let totalEntered = physParsed.value;

  for (const field of energyFields) {
    const el = document.getElementById(field.id) as HTMLInputElement | null;
    const parsed = parseField(el);
    if (!parsed.valid) {
      alert(`Please enter a valid non-negative integer for ${field.label} damage.`);
      if (el) el.focus();
      return;
    }
    if (parsed.value > 0) {
      energyDamage[field.key] = parsed.value;
      totalEntered += parsed.value;
    }
  }

  if (totalEntered <= 0) {
    alert('Please enter a positive integer for at least one damage type (physical or energy).');
    if (physicalInput) physicalInput.focus();
    return;
  }

  closeInflictModal();

  console.log(`Inflicting ${physParsed.value} physical and`, energyDamage, `energy damage to ${characterRep?.name}`);

  google.script.run
    .withSuccessHandler(onCharacterRepresentation)
    .withFailureHandler(function (error) {
      console.error('Error calling server function:', error);
      alert('Error inflicting damage: ' + error.message);
    })
    .UpdateHp(characterRep.docId, physParsed.value, 'inflict', energyDamage);
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

