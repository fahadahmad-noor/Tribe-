/**
 * Server-side sport configuration map.
 * Defines allowed matchFormat values per sport for validation.
 */
const sportConfig = {
  Football:    { type: 'variable', min: 3, max: 11, label: 'X-a-side' },
  Cricket:     { type: 'variable', min: 5, max: 11, label: 'X-a-side' },
  Basketball:  { type: 'fixed-set', allowed: [1, 3, 5], labels: { 1: '1v1', 3: '3v3', 5: '5v5' } },
  Volleyball:  { type: 'fixed-set', allowed: [2, 3, 4, 6], labels: { 2: '2v2 Beach', 3: '3v3', 4: '4v4', 6: '6v6' } },
  Padel:       { type: 'fixed-set', allowed: [1, 2], labels: { 1: 'Singles', 2: 'Doubles' } },
  Tennis:      { type: 'fixed-set', allowed: [1, 2], labels: { 1: 'Singles', 2: 'Doubles' } },
  Pickleball:  { type: 'fixed-set', allowed: [1, 2], labels: { 1: 'Singles', 2: 'Doubles' } },
  Badminton:   { type: 'fixed-set', allowed: [1, 2], labels: { 1: 'Singles', 2: 'Doubles' } },
  TableTennis: { type: 'fixed-set', allowed: [1, 2], labels: { 1: 'Singles', 2: 'Doubles' } },
};

const SUPPORTED_SPORTS = Object.keys(sportConfig);

/**
 * Validate that a matchFormat is valid for a given sport.
 * @returns {boolean}
 */
const isValidFormat = (sport, matchFormat) => {
  const config = sportConfig[sport];
  if (!config) return false;
  
  if (config.type === 'variable') {
    return Number.isInteger(matchFormat) && matchFormat >= config.min && matchFormat <= config.max;
  }
  if (config.type === 'fixed-set') {
    return config.allowed.includes(matchFormat);
  }
  return false;
};

/**
 * Get the display label for a sport+format combination.
 */
const getFormatLabel = (sport, matchFormat) => {
  const config = sportConfig[sport];
  if (!config) return `${matchFormat}`;
  
  if (config.type === 'variable') {
    return `${matchFormat}-a-side`;
  }
  return config.labels?.[matchFormat] || `${matchFormat}`;
};

module.exports = { sportConfig, SUPPORTED_SPORTS, isValidFormat, getFormatLabel };
