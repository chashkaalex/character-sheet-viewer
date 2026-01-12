/**
 * @typedef {GoogleAppsScript.Document.Document} GDoc
 */

const { GetDocRawLines } = require("../gdocs");
const { ParserUtils } = require("../parser");
const { ModifiableProperty, CreatureSize, Ability, SpecialAttackBonus, ListOfSpecialProperties, AbilityBasedProperty, ArmorClass, Skill } = require("./property");
const { SpellCasting } = require("./spells");

/**
 *@class Character
*/
class Character {
  /**
   * @param {GDoc} document The document containing the character data.
  */
  constructor(document) {
    /**
     * @type {GDoc}
     */
    this.document = document;
    /**
     * @type {string}
     */
    this.docId = document.getId();
    /**
     * @type {string[]}
     */
    this.lines = GetDocRawLines(document);

    /**
     * @type {boolean}
     */
    this.parseSuccess = true;
    this.parseErrors = [];
    this.parseWarnings = [];
    this.name = this.lines[0];

    /**
     * @type {CreatureSize}
     */
    this.size = new CreatureSize(Sizes['Medium']);

    /**
     * @type {Object.<string, Ability>}
     */
    this.abilities = {};

    this.bodySlots = new Map(bodySlots.map(slot => [slot.slotName, slot.possibleAmount]));

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
  }
  ParseCharacter() {

    //Parsing Abilities
    abilityNames.forEach(abilityName => {
      const abiliryScore = ParserUtils.GetFirstNumberFromLineThatStartsWithToken(this.lines, abilityName);
      if (abiliryScore) {
        this.abilities[abilityName] = new Ability(abiliryScore, abilityName);
      } else {
        this.parseErrors.push(`abilities@ [${abilityName}] parsing failed`);
        this.parseSuccess = false;
      }
    });

    //Parsing Resistances
    const resistances = this.lines.find(line => line.includes('Resistance'));
    if (resistances) {
      this.resistances = resistances.split(':')[1].trim();
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
    const raceAndClassesLine = ParserUtils.GetLineThatContainsOneOfTheseTokens(this.lines, races);
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
        const classData = classesData.get(c.name);
        if (classData) {
          this.HD += c.level;
          if (spellcasterClasses.includes(c.name)) {
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
    const skillsSectionLines = ParserUtils.GetSectionLines(this.lines, 'Skills');
    if (skillsSectionLines) {
      this.skills = this.ParseSkills(skillsSectionLines);
    }

    //Parsing Attack and Damage Bonus
    const attackLine = this.lines.find(line => line.includes('Attack'));
    if (attackLine) {
      this.weapons = this.ParseWeapons(attackLine);
      if (this.weapons.length === 0) {
        this.parseWarnings.push('No weapons found');
      }
    } else {
      this.LogParseError('Attack - no line found');
    }


    //Parsing Items
    const battleGearLines = ParserUtils.GetSectionLines(this.lines, 'Battle Gear');
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

    const preparedSpells = this.ParsePreparedSpells();
    if (preparedSpells) {
      if (this.spellCasting.isActive()) {
        this.spellCasting.updatePreparedSpells(preparedSpells);
      } else {
        this.parseWarnings.push('Spell casting data not found, prepared spells will not be updated');
      }
    }

    //Parsing Statuses
    const statusesSectionLines = ParserUtils.GetSectionLines(this.lines, 'Statuses');
    if (statusesSectionLines) {
      this.statuses = this.ParseStatuses(statusesSectionLines);
      this.statuses.forEach(status => {
        const statusEffects = statusesEffects[status.name];
        if (statusEffects) {
          console.log(`Applying effects for status ${status.name}`);
          statusEffects.forEach(effect => { this.ApplyEffect(effect); });
        }
      });
    }

    //Parsing Feats (must be done after statuses and items are parsed, some feats depend on statuses and items)
    const featsSectionLines = ParserUtils.GetSectionLines(this.lines, 'Feats');
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

    const possessionsLines = ParserUtils.GetSectionLines(this.lines, 'Possessions');
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
      console.log('resolving effect value');
      effect.value = effect.value(this);
    }
    return effect;
  }

  GetNamedProperty(propertyName) {
    if (this[propertyName]) {
      return this[propertyName];
    } else if (abilityNames.includes(propertyName)) {
      return this.abilities[propertyName];
    } else if (saveNames.includes(propertyName)) {
      return this.saves[propertyName];
    }
    else if (skillsAbilities[propertyName]) {
      return this.skills.find(s => s.name === propertyName);
    } else if (specialAttackNames.includes(propertyName)) {
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
      const thisSkillRelatedAbilityName = skillsAbilities[name];
      skills.push(new Skill(name, rank, this.abilities[thisSkillRelatedAbilityName]));
    });

    skills.forEach(skill => {
      const synergySkillsNames = skillsSynergyReversed[skill.name];
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
        console.warn(`Feat ${featLine} not found`);
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
    const preparedSpellsItemsData = ParserUtils.ExtractListItemsBetweenMarkers(this.document, 'Prepared Spells', 'Skills');

    if (preparedSpellsItemsData && this.spellCasting.isActive()) {
      /**
       * @type {PreparedSpellsStructure}
       */
      const preparedSpells = ParserUtils.ParsePreparedSpellsStructure(
        preparedSpellsItemsData,
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
   * @returns {boolean} - Whether the spell is prepared
   */
  static ValidatePreparedSpell(casterClassName, spellLevel, spellLevelName, spellName, domains) {
    //correct spells are all the spells of the same level or lower
    const casterClassSpells = classesData.get(casterClassName).spellCastingData.spells;
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
