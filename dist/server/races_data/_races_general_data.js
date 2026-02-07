function GetRaceSpeed(race) {
  if (race === 'Dwarf' || race === 'Gnome' || race === 'Halfling') {
    return 20;
  }
  return 30;
}

if (typeof module !== 'undefined') {
  module.exports = {
    GetRaceSpeed
  };
}
