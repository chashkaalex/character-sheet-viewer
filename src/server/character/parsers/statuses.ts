import { GetEffects, StatusesEffects } from '../_general_effects';
import { ParserUtils } from '../parser_utils';
import { Status } from '../state';

export function ParseStatuses(character: any): void {
  const statusesSectionLines = character.sectionLines['Statuses'];
  if (statusesSectionLines) {
    character.statuses = ParseStatusesLines(statusesSectionLines, character);
    character.statuses.forEach((status: Status) => {
      const statusEffects = GetEffects(StatusesEffects, status.name);
      if (statusEffects) {
        statusEffects.forEach((effect: any) => {
          character.ApplyEffect(effect);
        });
      }
    });
  }
}

export function ParseStatusesLines(statusesLines: string[], character: any): Status[] {
  const statuses: Status[] = [];

  statusesLines.forEach(line => {
    if (!line.includes(':') || !line.includes('/')) {
      character.parseWarnings.push(`Status ${line} - invalid line, skipping`);
      return;
    }

    const name = line.substring(0, line.indexOf(':')).trim();
    const duration = ParserUtils.GetFirstNumberFromALine(line.substring(line.indexOf('/')));
    const elapsed = ParserUtils.GetFirstNumberFromALine(line);

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
