import _ from 'lodash';
import { action, computed, observable, reaction } from 'mobx';
import TransitType from '~/enums/transitType';
import { IStopArea } from '~/models';
import { IStopItem } from '~/models/IStop';
import stopAreaValidationModel, {
    IStopAreaValidationModel,
} from '~/models/validationModels/stopAreaValidationModel';
import NavigationStore from './navigationStore';
import ValidationStore from './validationStore';

interface UndoState {
    stopArea: IStopArea;
}

class StopAreaStore {
    @observable private _stopArea: IStopArea | null;
    @observable private _oldStopArea: IStopArea | null;
    @observable private _stopItems: IStopItem[];
    @observable private _isEditingDisabled: boolean;
    private _validationStore: ValidationStore<IStopArea, IStopAreaValidationModel>;

    // Constructor
    @action
    public initialize = () => {
        this._stopArea = null;
        this._oldStopArea = null;
        this._stopItems = [];
        this._isEditingDisabled = true;

        this._validationStore = new ValidationStore();

        reaction(() => this._isEditingDisabled, this.onChangeIsEditingDisabled);
        reaction(
            () => this.isDirty && !this._isEditingDisabled,
            (value: boolean) => NavigationStore.setShouldShowUnsavedChangesPrompt(value)
        );
    };

    @computed
    get stopArea() {
        return this._stopArea!;
    }

    @computed
    get oldStopArea() {
        return this._oldStopArea!;
    }

    @computed
    get stopItems() {
        return this._stopItems;
    }

    @computed
    get isDirty() {
        return this._stopArea && !_.isEqual(this._stopArea, this._oldStopArea);
    }

    @computed
    get isEditingDisabled() {
        return this._isEditingDisabled;
    }

    @computed
    get invalidPropertiesMap() {
        return this._validationStore.getInvalidPropertiesMap();
    }

    @computed
    get isFormValid() {
        return this._validationStore.isValid();
    }

    @action
    public activate = ({
        stopArea,
        isNewStopArea,
    }: {
        stopArea: IStopArea;
        isNewStopArea: boolean;
    }) => {
        this.clear();

        const oldStopArea = _.cloneDeep(stopArea);
        const newStopArea = _.cloneDeep(stopArea);

        this._stopArea = newStopArea;
        this._oldStopArea = _.cloneDeep(oldStopArea);

        this._isEditingDisabled = !isNewStopArea;
        this._validationStore.activate(this._stopArea, stopAreaValidationModel);
    };

    @action
    public setStopItems = (stopItems: IStopItem[]) => {
        this._stopItems = stopItems;
    };

    @action
    public updateStopAreaProperty = (
        property: keyof IStopArea,
        value: string | Date | TransitType
    ) => {
        (this._stopArea as any)[property] = value;
        this._validationStore.updateProperty(property, value);
    };

    @action
    public setIsEditingDisabled = (isEditingDisabled: boolean) => {
        this._isEditingDisabled = isEditingDisabled;
    };

    @action
    public toggleIsEditingDisabled = () => {
        this._isEditingDisabled = !this._isEditingDisabled;
    };

    @action
    public clear = () => {
        this._stopArea = null;
        this._oldStopArea = null;
        this._isEditingDisabled = true;
        this._stopItems = [];
        this._validationStore.clear();
    };

    @action
    public resetChanges = () => {
        if (this._oldStopArea) {
            this.activate({ stopArea: this._oldStopArea, isNewStopArea: false });
        }
    };

    private onChangeIsEditingDisabled = () => {
        if (this._isEditingDisabled) {
            this.resetChanges();
        } else {
            this._validationStore.validateAllProperties();
        }
    };
}

export default new StopAreaStore();

export { StopAreaStore, UndoState };
