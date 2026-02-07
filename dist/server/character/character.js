/**
 * @typedef {GoogleAppsScript.Document.Document} GDoc
 */



/**
 * @typedef {import('./property').Ability} Ability
 */














// Also ensure we load the class definitions so they populate classesData
if (typeof require !== 'undefined') {




}

// Attach parser methods to Character prototype


/**
 *@class Character
*/
class Character {
  /**
   * @param {string[]} lines The lines of the character data.
   * @param {string} docId The document ID.
  */
  constructor(lines, docId = 'unknown') {
    /**
     * @type {string}
     */
    this.docId = docId;
    /**
     * @type {string[]}
     */
    this.lines = lines;

    /**
     * @type {boolean}
     */
    this.parseSuccess = true;
    this.parseErrors = [];
    this.parseWarnings = [];

    // Parse sections by heading
    const parseResult = ParserUtils.ParseDocLines(this.lines);

    /** @type {Object.<string, string[]>} */
    this.sectionLines = parseResult.sectionLines;
    this.attackLine = parseResult.attackLine;
    this.resistanceLine = parseResult.resistanceLine;
    this.abilitiesLines = parseResult.abilitiesLines;
    this.parseSuccess = parseResult.success;

    if (parseResult.errors && parseResult.errors.length > 0) {
      this.parseErrors.push(...parseResult.errors);
    }

    this.name = this.lines[0];

    /**
     * @type {CreatureSize}
     */
    this.size = new CreatureSize(Sizes['Medium']);

    /**
     * @type {Object.<string, Ability>}
     */
    this.abilities = {};

    this.bodySlots = new Map(BodySlots.map(slot => [slot.slotName, slot.possibleAmount]));

    /**
     * @type {SpellCasting}
     */
    this.spellCasting = new SpellCasting();

    this.classes = [];

    this.domains = [''];

    /**
     * @type {ModifiableProperty}
     */
    this.bab = new ModifiableProperty(0);

    /**
     * @type {Object.<string, ModifiableProperty>}
     */
    this.specialAttacks = {};

    this.resistances = '';
    this.hp = {
      current: 0,
      max: 0
    };

    /**
     * @type {Number}
     */
    this.HD = 0;

    this.temporaryHp = 0;


    this.damageBonus = new ModifiableProperty(0);
    this.weapons = [];

    this.Special = new ListOfSpecialProperties();

    // speed initialization
    this.speed = new ModifiableProperty(0); // will be updated later
  }
  ParseCharacter() {

    //Parsing Abilities
    this.abilities = ParseAbilities(this.abilitiesLines);

    //Parsing Resistances
    if (this.resistanceLine) {
      this.resistances = this.resistanceLine.split(':')[1].trim();
    }

    //Saves
    this.saves = {
      Fort: new AbilityBasedProperty('Fort', this.abilities.Con),
      Ref: new AbilityBasedProperty('Ref', this.abilities.Dex),
      Will: new AbilityBasedProperty('Will', this.abilities.Wis)
    };

    //attacks of opportunity
    this.attacksOfOpportunity = new ModifiableProperty(1);

    //Parsing Special Attacks
    this.specialAttacks['Trip'] = new SpecialAttackBonus(this.abilities.Str, this.size);
    this.specialAttacks['Grapple'] = new SpecialAttackBonus(this.abilities.Str, this.size);
    this.specialAttacks['Disarm'] = new ModifiableProperty(0); //disarm depends on the specific weapon

    //Parsing Race and Classes
    const raceAndClassesLine = ParserUtils.GetLineThatContainsOneOfTheseTokens(this.lines, Races);
    if (raceAndClassesLine) {
      const parsed = ParserUtils.ParseRaceAndClasses(raceAndClassesLine);
      if (!parsed || !parsed.race || !parsed.classes || parsed.classes.length === 0) {
        this.LogParseError('Race and classes - parsing failed');
      }
      this.race = parsed.race;
      this.classes = parsed.classes;
      this.speed = new ModifiableProperty(GetRaceSpeed(this.race));

      //AC, must be done after race and classes are parsed
      const acAbilities = [this.abilities.Dex];
      if (this.classes.some(c => c.name.includes('Monk'))) {
        acAbilities.push(this.abilities.Wis);
      }
      this.ac = new ArmorClass(acAbilities, this.size);

      //parse Cleric domain names
      if (this.classes.some(c => c.name.includes('Cleric'))) {
        const domainLine = ParserUtils.GetLineThatContainsOneOfTheseTokens(this.lines, ['Domain', 'domains']);
        if (domainLine) {
          this.domains = ParserUtils.GetParenthesesContent(domainLine).split(',').map(domain => domain.trim());
        } else {
          this.LogParseError('No domains found for Cleric class');
          this.parseSuccess = false;
        }
      }

      //apply class effects
      this.classes.forEach(c => {
        const classData = ClassesData.get(c.name);
        if (classData) {
          this.HD += c.level;
          if (SpellcasterClasses.includes(c.name)) {
            const classSpellCastingData = classData.spellCastingData;
            if (!classSpellCastingData) {
              this.LogParseError(`${c.name} - the class is listed as a spellcaster, but no spell casting data found`);
            } else {
              this.spellCasting
                .addSpellCasterClass(
                  classSpellCastingData.casterClass,
                  c.level,
                  this.abilities[classSpellCastingData.bonusSpellAbility],
                  this.domains); //prestige classes may be counted towards other caster classes
            }
          }
          const levelData = classData.levelTable[c.level];
          if (levelData) {
            Object.entries(levelData).forEach(([property, value]) => {
              this.ApplyEffect(/*effect*/{ property: property, value: value, status: c.name }, /*isPermanent*/true);
            });
          } else {
            this.LogParseError(`${c.name} - no level data found`);
          }
        }
      });
    } else {
      this.LogParseError('Race and classes - no line found');
    }

    //Calculating Initiative
    this.InitiativeBonus = new AbilityBasedProperty('InitiativeBonus', this.abilities.Dex);

    //Parsing BAB, HP and Speed. TODO: this should be calculated from the classes and levels
    const hpLine = this.lines.find(line => { return line.includes('Hp') && line.includes('Speed'); });
    if (hpLine) {
      const hpPartOfTheLine = hpLine.substring(hpLine.indexOf('Hp'), hpLine.indexOf('Speed'));
      const hpDigits = hpPartOfTheLine.match(/\d+/g);
      this.hp.current = Number(hpDigits[0]);
      this.hp.max = Number(hpDigits[1]);
      console.log('hp is ' + this.hp.current + ' and hpMax is ' + this.hp.max);

    } else {
      this.LogParseError('HP - no line found');
    }

    //Parsing Skills (must be done after abilities are parsed)
    // Use pre-parsed section lines
    const skillsSectionLines = this.sectionLines['Skills'];
    if (skillsSectionLines) {
      this.skills = this.ParseSkills(skillsSectionLines);
    }

    //Parsing Attack and Damage Bonus
    if (this.attackLine) {
      this.weapons = this.ParseWeapons(this.attackLine);
      if (this.weapons.length === 0) {
        this.parseWarnings.push('No weapons found');
      }
    } else {
      // Should have been caught by validation, but safe to keep
      this.LogParseError('Attack - no line found');
    }


    //Parsing Items
    const battleGearLines = this.sectionLines['Battle Gear'];
    if (battleGearLines) {
      this.battleGear = ParserUtils.ParseItems(battleGearLines);
      this.battleGear.forEach(item => {
        let applyEffects = true;
        //check that the slot isn't taken
        if (item.bodySlot) {
          const numberOfAvailableSlots = this.bodySlots.get(item.bodySlot);
          if (numberOfAvailableSlots > 0) {
            this.bodySlots.set(item.bodySlot, numberOfAvailableSlots - 1);
          } else {
            this.parseWarnings.push(`Item ${item.name} body slot ${item.bodySlot} is already taken, effects will not be applied`);
            applyEffects = false;
          }
        }
        if (applyEffects) {
          const itemEffects = item.effects;
          if (itemEffects) {
            itemEffects.forEach(effect => { this.ApplyEffect(effect); });
          } else if (!item.IsUsable() && !item.isWeapon && item.bodySlot) {
            this.parseWarnings.push(`Item ${item.name} effects not found`);
          }
        }
      });
    } else {
      this.parseWarnings.push('No battle gear found');
    }

    //Updating spell slots (must be done after items and before statuses)
    if (this.spellCasting.isActive()) {
      this.spellCasting.updateSpellsData();
    }

    // Determine caster types
    let hasInAdvance = false;
    let hasSpontaneous = false;

    this.classes.forEach(c => {
      const classData = ClassesData.get(c.name);
      if (classData && classData.spellCastingData) {
        if (classData.spellCastingData.preparation === 'In Advance') {
          hasInAdvance = true;
        } else if (classData.spellCastingData.preparation === 'Spontaneous') {
          hasSpontaneous = true;
        }
      }
    });

    if (hasInAdvance) {
      const preparedSpells = this.ParsePreparedSpells();
      if (preparedSpells) {
        this.spellCasting.updatePreparedSpells(preparedSpells);
      }
    }

    //Parsing Known Spells (for spontaneous casters)
    if (hasSpontaneous) {
      const knownSpells = this.ParseKnownSpells();
      if (knownSpells) {
        this.spellCasting.updateKnownSpells(knownSpells);
      }
    }

    //Parsing Statuses
    const statusesSectionLines = this.sectionLines['Statuses'];
    if (statusesSectionLines) {
      this.statuses = this.ParseStatuses(statusesSectionLines);
      this.statuses.forEach(status => {
        const statusEffects = StatusesEffects[status.name];
        if (statusEffects) {
          console.log(`Applying effects for status ${status.name}`);
          statusEffects.forEach(effect => { this.ApplyEffect(effect); });
        }
      });
    }

    //Parsing Feats (must be done after statuses and items are parsed, some feats depend on statuses and items)
    const featsSectionLines = this.sectionLines['Feats'];
    if (featsSectionLines) {
      this.feats = this.ParseFeats(featsSectionLines);
      this.feats.forEach(feat => {
        feat.forEach(effect => {
          this.ApplyEffect(effect);
        });
      });
    } else {
      this.parseWarnings.push('Character has no feats');
    }

    const possessionsLines = this.sectionLines['Possessions'];
    if (possessionsLines) {
      this.possessions = ParserUtils.ParseItems(possessionsLines);
    }


  }

  //////////////////////////-- END OF PARSING --//////////////////////////////////


  ApplyEffect(effect, isPermanent = false) {
    const propertyKey = effect.property + (effect.casterClassName ? ` ${effect.casterClassName}` : '');
    const affectedProperty = this.GetNamedProperty(propertyKey);
    if (affectedProperty) {
      if (effect.value) {
        effect = this.ResolveEffectValue(effect);
        isPermanent ? affectedProperty.applyPermanentEffect(effect.value) : affectedProperty.applyEffect(effect);
      }
    } else {
      this.parseWarnings.push(`Property ${propertyKey} for effect ${effect.status} not found`);
    }
  }

  ResolveEffectValue(effect) {
    if (typeof effect.value === 'function') {
      //console.log('resolving effect value');
      effect.value = effect.value(this);
    }
    return effect;
  }

  GetNamedProperty(propertyName) {
    if (this[propertyName]) {
      return this[propertyName];
    } else if (AbilityNames.includes(propertyName)) {
      return this.abilities[propertyName];
    } else if (SaveNames.includes(propertyName)) {
      return this.saves[propertyName];
    }
    else if (SkillsAbilities[propertyName]) {
      return this.skills.find(s => s.name === propertyName);
    } else if (SpecialAttackNames.includes(propertyName)) {
      return this.specialAttacks[propertyName];
    } else if (propertyName.includes('casterLevel')) {
      const casterClassName = propertyName.split(' ')[1];
      return this.spellCasting.GetCasterLevel(casterClassName);
    }
    else {
      this.parseWarnings.push(`Property ${propertyName} not found`);
      return null;
    }
  }

  ParseSkills(skillsLines) {
    const skills = [];

    skillsLines.forEach(line => {
      const name = ParserUtils.GetSkillNameFromLine(line);
      const rank = ParserUtils.GetFirstNumberFromALine(line);
      const thisSkillRelatedAbilityName = SkillsAbilities[name];
      skills.push(new Skill(name, rank, this.abilities[thisSkillRelatedAbilityName]));
    });

    skills.forEach(skill => {
      const synergySkillsNames = SkillsSynergyReversed[skill.name];
      if (synergySkillsNames) {
        synergySkillsNames.forEach(synergySkillName => {
          const synergySkill = skills.find(s => s.name === synergySkillName);
          if (synergySkill) {
            skill.synergySkills.push(synergySkill);
          }
        });
      }
    });

    return skills;
  }

  ParseWeapons(attackLine) {
    if (!attackLine || !attackLine.includes('Attack:')) {
      return [];
    }

    const weapons = [];

    // Remove "Attack:" prefix and trim
    const cleanLine = attackLine.replace('Attack:', '').trim();

    // Split by "or" to handle multiple weapons
    const weaponParts = cleanLine.split(/\s+or\s+/);

    weaponParts.forEach(weaponPart => {
      const weapon = this.parseSingleWeapon(weaponPart.trim());
      if (weapon) {
        weapons.push(weapon);
      }
    });

    return weapons;
  }

  parseSingleWeapon(weaponText) {
    // Pattern: +11 Unarmed (2d10 + 3/X2).
    const weaponPattern = /^\+?\d*\s*([^(]+)\s*\([^)]+\)/;
    const match = weaponText.match(weaponPattern);

    if (match) {
      const weaponName = match[1].trim();
      return new Weapon(weaponName, this.bab, this.damageBonus, { Str: this.abilities.Str, Dex: this.abilities.Dex }, this.size);
    }

    console.warn(`Could not parse weapon: ${weaponText}`);
    return null;
  }

  /**
   * @param {string[]} statusesLines - The lines containing the statuses
   * @typedef {Object} Status
   * @property {string} name - The name of the status
   * @property {number} duration - The duration of the status
   * @property {number} elapsed - The elapsed rounds of the status
   * @returns {Status[]} The statuses
   */
  ParseStatuses(statusesLines) {
    const statuses = [];

    statusesLines.forEach(line => {
      const status = {};
      if (!line.includes(':') || !line.includes('/')) {
        this.parseWarnings.push(`Status ${line} - invalid line, skipping`);
        return;
      }
      status.name = line.substring(0, line.indexOf(':'));
      status.duration = ParserUtils.GetFirstNumberFromALine(line.substring(line.indexOf('/')));
      status.elapsed = ParserUtils.GetFirstNumberFromALine(line);
      if (status.name && status.name.trim() !== '' && status.duration && status.elapsed) {
        statuses.push(status);
      } else if (line.trim() === '') {
        this.parseWarnings.push(`Status ${line} - empty line, skipping`);
      } else {
        this.parseWarnings.push(`Status ${line} - name or duration or elapsed not found`);
      }
    });

    return statuses;
  }

  /**
   * @param {string[]} featsLines - The lines containing the feats
   */
  ParseFeats(featsLines) {
    const feats = [];
    featsLines.forEach(featLine => {
      const theFeat = Object.keys(FeatEffects).find(feat => featLine.startsWith(feat));
      if (theFeat) {
        const featEffects = FeatEffects[theFeat];
        if (theFeat === 'Practiced Spellcaster') {
          const casterClassName = this.classes.find(c => featLine.includes(c.name)).name;
          featEffects.forEach(f => { f.casterClassName = casterClassName; });
        }
        feats.push(featEffects);
      } else {
        this.parseWarnings.push(`Feat ${featLine} not found`);
      }
    });
    return feats;
  }

  /**
   * Parses the prepared spells from the document
   * @typedef {Object.<string, boolean>} PreparedSpellData
   * @returns {PreparedSpellsStructure} The prepared spells
   * @typedef {Object.<string, Object.<number|string, PreparedSpellData[]>>} PreparedSpellsStructure
   */
  ParsePreparedSpells() {
    //const preparedSpellsLines = ParserUtils.GetLinesBetweenTwoTokens(this.lines, "Prepared Spells", "Skills");
    const preparedSpellsLines = ParserUtils.GetLinesBetweenTwoTokens(this.lines, 'Prepared Spells', 'Skills');

    const preparedSpellsItems = preparedSpellsLines.map(line => ({ text: line, item: null }));

    if (preparedSpellsLines && preparedSpellsLines.length > 0 && this.spellCasting.isActive()) {
      /**
       * @type {PreparedSpellsStructure}
       */
      const preparedSpells = ParserUtils.ParsePreparedSpellsStructure(
        preparedSpellsItems,
        this.domains,
        Character.ValidatePreparedSpell
      );

      // Log warnings for invalid spells
      Object.keys(preparedSpells).forEach(casterClass => {
        Object.keys(preparedSpells[casterClass]).forEach(level => {
          preparedSpells[casterClass][level].forEach(spellData => {
            if (!spellData.isValid) {
              let warningMessage = `Spell ${spellData.spell} is not available for ${casterClass} at level ${level}`;
              if (level.includes('domain')) {
                warningMessage += `s: ${this.domains.join(' or ')}`;
              }
              this.parseWarnings.push(warningMessage);
            }
          });
        });
      });

      return preparedSpells;
    } else {
      if (!this.spellCasting.isActive()) {
        this.parseWarnings.push('Spell casting data not found, prepared spells will not be updated');
      }
      return null;
    }
  }

  /**
   * Validates if a spell is prepared for a given caster class and spell level
   * @param {string} casterClassName - The name of the caster class
   * @param {number} spellLevel - The level of the spell
   * @param {string} spellLevelName - The name of the spell level
   * @param {string} spellName - The name of the spell
   * @param {string[]} domains - The domains of the cleric
   * @returns {boolean} - Whether the spell is prepared
   */
  static ValidatePreparedSpell(casterClassName, spellLevel, spellLevelName, spellName, domains) {
    //correct spells are all the spells of the same level or lower
    const casterClassSpells = ClassesData.get(casterClassName).spellCastingData.spells;
    const correctSpells = [];
    if (spellLevelName.includes('domain')) {
      domains.forEach(domain => {
        correctSpells.push(...casterClassSpells.domainSpells[domain].slice(0, spellLevel));
      });
    } else {
      for (let level = 0; level <= spellLevel; level++) {
        correctSpells.push(...casterClassSpells[level]);
      }
    }
    return correctSpells.includes(spellName);
  }

  /**
   * Parses the known spells from the document
   * @returns {PreparedSpellsStructure} The known spells
   */
  ParseKnownSpells() {
    const knownSpellsLines = ParserUtils.GetLinesBetweenTwoTokens(this.lines, 'Spells Known', 'Skills');

    const knownSpellsItems = knownSpellsLines.map(line => ({ text: line, item: null }));

    if (knownSpellsLines && knownSpellsLines.length > 0 && this.spellCasting.isActive()) {
      // Reuse the same structure parser as for prepared spells
      // We don't really need validation against "class list" here because for spontaneous casters,
      // the known list IS the authority. But we could validate against the full potential list if we had it.
      // For now, let's assume valid.
      const knownSpells = ParserUtils.ParsePreparedSpellsStructure(
        knownSpellsItems,
        this.domains,
        () => true // validation always passes for known spells
      );
      return knownSpells;
    }
    return null;
  }

  //manipulation methods
  InflictDamage(amount) {
    if (this.temporaryHp > 0) {
      if (this.temporaryHp >= amount) {
        this.temporaryHp -= amount;
        return; //consider removing the status that causes the temporary hp
      } else {
        amount -= this.temporaryHp;
        this.temporaryHp = 0;
      }
    }
    this.hp.current = Math.max(0, this.hp.current - amount);
  }

  CureDamage(amount) {
    this.hp.current = Math.min(this.hp.max, this.hp.current + amount);
  }

  OnRoundsElapsed(amount) {
    const statusesToKeep = [];
    this.statuses.forEach(status => {
      status.elapsed += amount;
      if (status.elapsed <= status.duration) {
        statusesToKeep.push(status);
      }
    });
    return statusesToKeep;
  }

  //Methods



  LogParseError(errorMessage) {
    this.parseErrors.push(`${errorMessage} parsing failed`);
    this.parseSuccess = false;
  }

}

/**
 * @class CharacterError
 * @property {boolean} error
 */
class CharacterError {
  /**
   * @param {string} errorMessage
   * @param {string[]} parseErrors
   * @param {string[]} parseWarnings
   */
  constructor(errorMessage, parseErrors = [], parseWarnings = []) {
    this.error = true;
    this.errorMessage = errorMessage;
    this.parseErrors = parseErrors;
    this.parseWarnings = parseWarnings;
  }
}

if (typeof module !== 'undefined') {
  module.exports = {
    Character,
    CharacterError
  };
}
