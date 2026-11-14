import { addTooltip } from './tooltip_rolz';

export type SkillFilterMode = 'active' | 'trained' | 'all';

const VALID_MODES = new Set<SkillFilterMode>(['active', 'trained', 'all']);

function formatSigned(value: number): string {
  return value >= 0 ? `+${value}` : `${value}`;
}

function resolveSkillMode(characterRep: any, storageKey: string): SkillFilterMode {
  if (characterRep?.skillFilter && VALID_MODES.has(characterRep.skillFilter)) {
    return characterRep.skillFilter;
  }
  try {
    const stored = localStorage.getItem(storageKey) as SkillFilterMode | null;
    if (stored && VALID_MODES.has(stored)) {
      return stored;
    }
  } catch {
    // Ignore storage errors
  }
  return 'active';
}

export function renderSkillsSection(characterRep: any): void {
  const skillsGrid = document.getElementById('skillsGrid');
  if (!skillsGrid) return;

  skillsGrid.innerHTML = '';
  const filterInput = document.getElementById('skillsFilterInput') as HTMLInputElement | null;
  const modeToggle = document.getElementById('skillsModeToggle');
  const docId = characterRep?.docId || '';
  const storageKey = docId ? `skillFilter:${docId}` : 'skillFilter';

  let currentMode: SkillFilterMode = resolveSkillMode(characterRep, storageKey);

  const syncModeButtons = () => {
    if (!modeToggle) return;
    modeToggle.querySelectorAll('.skills-mode-btn').forEach((btn: Element) => {
      const btnMode = (btn as HTMLElement).dataset.skillMode;
      btn.classList.toggle('active', btnMode === currentMode);
    });
  };

  const applySkillFilter = () => {
    const query = (filterInput?.value || '').trim().toLowerCase();
    skillsGrid.querySelectorAll('.skill-card').forEach((card: Element) => {
      const el = card as HTMLElement;
      const name = el.dataset.skillName || '';
      const rank = Number(el.dataset.skillRank || '0');
      const bonus = Number(el.dataset.skillBonus || '0');

      const matchesMode =
        currentMode === 'all' ||
        (currentMode === 'trained' && rank > 0) ||
        (currentMode === 'active' && (rank > 0 || bonus > 0));
      const matchesQuery = !query || name.includes(query);
      el.style.display = matchesMode && matchesQuery ? '' : 'none';
    });
  };

  if (filterInput && !filterInput.dataset.bound) {
    filterInput.dataset.bound = 'true';
    filterInput.addEventListener('input', applySkillFilter);
  }

  if (modeToggle && !(modeToggle as HTMLElement).dataset.bound) {
    (modeToggle as HTMLElement).dataset.bound = 'true';
    modeToggle.addEventListener('click', (event: Event) => {
      const target = (event.target as HTMLElement)?.closest('.skills-mode-btn') as HTMLElement | null;
      const nextMode = target?.dataset.skillMode as SkillFilterMode | undefined;
      if (!nextMode || !VALID_MODES.has(nextMode) || nextMode === currentMode) return;

      currentMode = nextMode;
      if (characterRep) {
        characterRep.skillFilter = nextMode;
      }
      try {
        localStorage.setItem(storageKey, nextMode);
      } catch {
        // Ignore storage errors
      }
      syncModeButtons();
      applySkillFilter();

      if (docId && typeof google !== 'undefined' && google.script?.run) {
        google.script.run.SetSkillFilterPreference(docId, nextMode);
      }
    });
  }

  if (characterRep?.skills) {
    Object.entries(characterRep.skills)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .forEach(([skillName, skill]: [string, any]) => {
        const rankLabel = skill.score === 1 ? '1 rank' : `${skill.score} ranks`;
        const isUntrainedLocked = Boolean(skill.trainedOnly) && skill.score === 0;
        const trainedOnlyTag = isUntrainedLocked
          ? ' <span class="skill-card-trained-tag">&middot; Trained only</span>'
          : '';
        const card = document.createElement('div');
        card.className = 'skill-card' + (isUntrainedLocked ? ' skill-card-untrained-locked' : '');
        card.dataset.skillName = skillName.toLowerCase();
        card.dataset.skillRank = String(skill.score ?? 0);
        card.dataset.skillBonus = String(skill.bonus ?? 0);
        card.innerHTML = `
          <div class="skill-card-info">
            <div class="skill-card-name">${skillName}</div>
            <div class="skill-card-rank" data-skill="${skillName}">${rankLabel}${trainedOnlyTag}</div>
          </div>
          <div class="skill-card-bonus" data-skill="${skillName}">${formatSigned(skill.bonus)}</div>
        `;
        skillsGrid.appendChild(card);

        const bonusElement = card.querySelector('.skill-card-bonus');
        addTooltip(bonusElement, skill.string, skill.rolzRollMessage);
      });
  }

  syncModeButtons();
  applySkillFilter();
}

