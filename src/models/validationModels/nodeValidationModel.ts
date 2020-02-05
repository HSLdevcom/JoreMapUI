import regexRules from '~/validation/regexRules';
import { INode } from '..';

type INodeValidationModel = { [key in keyof INode]: string };

// TODO: rename as nodeValidationObject
const nodeValidationModel: INodeValidationModel = {
    id: '',
    idSuffix: '',
    type: 'required|min:1|max:1|string',
    shortIdString: `min:4|max:4|string|${regexRules.numbers}`,
    modifiedBy: '',
    modifiedOn: '',
    shortIdLetter: 'min:0|max:2|string',
    coordinates: 'latLngValidator',
    coordinatesProjection: 'latLngValidator',
    measurementType: '',
    measurementDate: 'date',
    stop: '',
    transitTypes: ''
};

const editableNodeIdValidationModel = {
    id: `required|min:5|max:5|string|${regexRules.numbers}`,
    idSuffix: `required|min:2|max:2|string|${regexRules.numbers}`
};

export default nodeValidationModel;

export { INodeValidationModel, editableNodeIdValidationModel };
