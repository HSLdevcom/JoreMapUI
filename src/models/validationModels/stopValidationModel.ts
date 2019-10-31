import regexRules from '~/validation/regexRules';
import constants from '../../constants/constants';
import IStop from '../IStop';

const nameRule = 'required|min:1|max:20|string';
const addressRule = 'required|min:1|max:20|string';
const placeNameRule = 'min:1|max:20|string';
const longNameRule = 'min:1|max:60|string';

type StopKeys = keyof IStop;
type IStopValidationModel = { [key in StopKeys]: string };

const stopValidationModel: IStopValidationModel = {
    nodeId: 'required|min:7|max:7|string',
    municipality: 'required|min:1|max:3|string',
    nameFi: nameRule,
    nameSw: nameRule,
    placeNameFi: placeNameRule,
    placeNameSw: placeNameRule,
    addressFi: addressRule,
    addressSw: addressRule,
    modifiedBy: '',
    modifiedOn: '',
    platform: `min:0|max:3|string`,
    radius: `required|min:0|max:${constants.INTEGER_MAX_VALUE}|numeric`,
    hastusId: 'min:0|max:6|string',
    areaId: 'min:0|max:6|string',
    elyNumber: `min:0|max:10|string|${regexRules.numbers}`,
    nameLongFi: longNameRule,
    nameLongSw: longNameRule,
    nameModifiedOn: '',
    section: 'required|min:1|max:6|string',
    postalNumber: `min:5|max:5|string|${regexRules.numbers}`,
    transitType: 'min:0|max:1|string'
};

export default stopValidationModel;
