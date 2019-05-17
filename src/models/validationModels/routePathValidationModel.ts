const originRule = 'required|min:1|max:20|string';
const destinationRule = 'required|min:1|max:20|string';
const nameRule = 'required|min:1|max:60|string';
const shortNameRule = 'required|min:1|max:20|string';
const dateRule = 'required|date';

const routePathValidationModel = {
    originFi: originRule,
    originSw: originRule,
    destinationFi: destinationRule,
    destinationSw: destinationRule,
    name: nameRule,
    nameSw: nameRule,
    shortName: shortNameRule,
    shortNameSw: shortNameRule,
    startTime: dateRule,
    endTime: dateRule,
    length: 'required|min:0|max:99999|numeric',
    isStartNodeUsingBookSchedule: 'boolean',
    startNodeBookScheduleColumnNumber: 'numeric|min:1|max:99',
    direction: 'required|min:1|max:1|string'
};

export default routePathValidationModel;
