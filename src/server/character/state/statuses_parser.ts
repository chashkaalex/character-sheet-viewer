import { GetEffects, StatusesEffects } from '../_general_effects';
import { GetFirstNumberFromALine } from '../parser_utils';
import { EffectFactory, EffectData } from './effects';
import { Status } from './state';
import { ICharacter } from '../icharacter';

export function ParseStatuses(character: ICharacter): void {
  const statusesSectionLines = character.sectionLines['Statuses'];
  if (statusesSectionLines) {
    character.statuses = ParseStatusesLines(statusesSectionLines, character);
    character.statuses.forEach((status: Status) => {
      const statusEffects = GetEffects(StatusesEffects, status.name);
      if (statusEffects) {
        statusEffects.forEach((effect: EffectData) => {
          EffectFactory(effect).ApplyEffect(character);
        });
      }
    });
  }
}

export function ParseStatusesLines(statusesLines: string[], character: ICharacter): Status[] {
  const statuses: Status[] = [];

  statusesLines.forEach(line => {
    if (!line.includes(':') || !line.includes('/')) {
      character.parseWarnings.push(`Status ${line} - invalid line, skipping`);
      return;
    }

    const name = line.substring(0, line.indexOf(':')).trim();
    const duration = GetFirstNumberFromALine(line.substring(line.indexOf('/')));
    const elapsed = GetFirstNumberFromALine(line);

    if (name !== '' && !isNaN(duration) && !isNaN(elapsed)) {
      statuses.push({
        name,
        duration,
        elapsed
      });
    } else if (line.trim() === '') {
      character.parseWarnings.push(`Status ${line} - empty line, skipping`);
    } else {
      character.parseWarnings.push(`Status ${line} - name or duration or elapsed not found`);
    }
  });

  return statuses;
}
