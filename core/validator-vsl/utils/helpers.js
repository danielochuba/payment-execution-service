// const { processQualifiers, processPossibleValues } = require('./utils');

function processQualifiers(qualifiers) {
  let processedQualifiers;
  if (qualifiers) {
    processedQualifiers = {};
    const qualifierTokens = qualifiers.split('|');
    qualifierTokens.forEach((qt) => {
      const splitTokens = qt.split(':');
      const gtKey = splitTokens[0];
      const gtValue = splitTokens.slice(1).join(':');
      // console.log('🎉🎉🎉🎉', gtKey, gtValue);
      // const [gtKey, gtValue] =
      const isNot = gtKey.startsWith('!');
      let key = gtKey;
      if (isNot) {
        key = key.replace('!', '');
      }
      processedQualifiers[key] = {
        isNot,
        value: gtValue,
      };
    });
  }
  return processedQualifiers;
}

function processPossibleValues(values = '') {
  let processedValues;
  if (values) {
    processedValues = values.split('|');
  }
  return processedValues;
}

function compareDateWithToday(dateStr) {
  let result = -1;

  if (dateStr) {
    const parts = dateStr.split('-');

    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);

      const instructionDate = new Date(Date.UTC(year, month, day));

      const today = new Date();
      const todayUTC = new Date(
        Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate())
      );

      const instructionTime = instructionDate.getTime();
      const todayTime = todayUTC.getTime();

      if (instructionTime < todayTime) {
        result = -1;
      } else if (instructionTime === todayTime) {
        result = 0;
      } else {
        result = 1;
      }
    }
  }

  return result;
}

module.exports = {
  processQualifiers,
  processPossibleValues,
  compareDateWithToday,
};
