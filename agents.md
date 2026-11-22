always consider the build process: Vite and clast TS transcompilation.
always check for lint errors and fix them before considering the task complete.
after creating a new test file to solve a bug, never delete it, keep the test base growing.
NEVER ever run the deploy command (npm run deploy or clasp push) on your own. Always present the changes and let the USER review them and run the deploy.
after each work chunk that requires deploy, always propose a deploy command that includes a fitting git commit/push message (e.g., `npm run deploy -- -m "<message>"`).
always implement D&D 3.5 rules. The primary sources for the rules are:
1. Local rulebook PDFs in `"C:\Users\Alex\Downloads\D&D Book Collection"` (especially `D&D Book Collection/Core/` for PHB, PHB II, DMG, MM; `D&D Book Collection/Magic Item Compendium.pdf`; and `D&D Book Collection/WotC Books/` for Spell Compendium, Tome of Battle, Complete series, and Races series).
2. https://www.d20srd.org/ (standard SRD) and https://dndtools.net/ (additional content/spells).