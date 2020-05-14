import _ from 'lodash';
import { action, computed, observable, reaction } from 'mobx';
import { ILineHeader } from '~/models';
import lineHeaderValidationModel from '~/models/validationModels/lineHeaderValidationModel';
import FormValidator, { IValidationResult } from '~/validation/FormValidator';
import NavigationStore from './navigationStore';

interface IMassEditLineHeader {
    id: number;
    lineHeader: ILineHeader;
    invalidPropertiesMap: object;
    isRemoved: boolean;
}

class LineHeaderMassEditStore {
    @observable private _massEditLineHeaders: IMassEditLineHeader[] | null;
    @observable private _selectedLineHeaderId: number | null;
    @observable private _oldlineHeaders: ILineHeader[] | null;
    @observable private _isEditingDisabled: boolean;

    // Constructor
    @action
    public initialize = () => {
        this._massEditLineHeaders = null;
        this._selectedLineHeaderId = null;
        this._isEditingDisabled = true;

        reaction(
            () => this.isDirty && !this._isEditingDisabled,
            (value: boolean) => NavigationStore.setShouldShowUnsavedChangesPrompt(value)
        );
    };

    @computed
    get massEditLineHeaders(): IMassEditLineHeader[] | null {
        return this._massEditLineHeaders;
    }

    @computed
    get selectedLineHeaderId(): number | null {
        return this._selectedLineHeaderId;
    }

    @computed
    get oldLineHeaders(): ILineHeader[] | null {
        return this._oldlineHeaders;
    }

    @computed
    get currentLineHeaders(): ILineHeader[] {
        return _.chain(this._massEditLineHeaders)
            .filter((massEditLineHeader) => !massEditLineHeader.isRemoved)
            .map((massEditLineHeader) => massEditLineHeader.lineHeader)
            .value();
    }

    @computed
    get removedLineHeaders(): ILineHeader[] {
        return _.chain(this._massEditLineHeaders)
            .filter((massEditLineHeader) => massEditLineHeader.isRemoved)
            .map((massEditLineHeader) => massEditLineHeader.lineHeader)
            .value();
    }

    @computed
    get isDirty() {
        if (!this._massEditLineHeaders) return false;

        for (const massEditLineHeader of this._massEditLineHeaders) {
            if (massEditLineHeader.isRemoved) return true;
        }
        const currentLineHeaders = _.chain(this._massEditLineHeaders)
            .map((massEditLineHeader) => massEditLineHeader.lineHeader)
            .value();
        return !_.isEqual(currentLineHeaders, this._oldlineHeaders);
    }

    @computed
    get isEditingDisabled() {
        return this._isEditingDisabled;
    }

    @action
    public activate = (lineHeaders: ILineHeader[]) => {
        this.clear();

        const _lineHeaders = lineHeaders.map((lineHeader: ILineHeader) => {
            return {
                ...lineHeader,
                originalStartDate: lineHeader.startDate,
            };
        });

        this._massEditLineHeaders = _lineHeaders.map((lineHeader: ILineHeader, index: number) => {
            const invalidPropertiesMap = FormValidator.validateAllProperties(
                lineHeaderValidationModel,
                lineHeader
            );
            const massEditLineHeader: IMassEditLineHeader = {
                invalidPropertiesMap,
                lineHeader,
                id: index,
                isRemoved: false,
            };
            return massEditLineHeader;
        });
        this.setOldLineHeaders(_lineHeaders);
    };

    @action
    public setOldLineHeaders = (lineHeaders: ILineHeader[]) => {
        this._oldlineHeaders = _.cloneDeep(lineHeaders);
    };

    @action
    public setSelectedLineHeaderId = (id: number | null) => {
        this._selectedLineHeaderId = id;
    };

    @action
    public updateLineHeaderProperty = (property: keyof ILineHeader, value: any) => {
        const massEditLineHeader = this.getMassEditLineHeader(this._selectedLineHeaderId!);

        massEditLineHeader!.lineHeader[property] = value;
        massEditLineHeader!.invalidPropertiesMap[property] = FormValidator.validateProperty(
            lineHeaderValidationModel[property]!,
            value
        );
    };

    @action
    public updateLineHeaderStartDate = (id: number, value: Date) => {
        const massEditLineHeader = this.getMassEditLineHeader(id);

        massEditLineHeader!.lineHeader.startDate = value;
        this._massEditLineHeaders = this._massEditLineHeaders!.slice().sort(
            _sortMassEditLineHeaders
        );
        this.validateDates();
    };

    @action
    public updateLineHeaderEndDate = (id: number, value: Date) => {
        const massEditLineHeader = this.getMassEditLineHeader(id);

        massEditLineHeader!.lineHeader.endDate = value;
        this._massEditLineHeaders = this._massEditLineHeaders!.slice().sort(
            _sortMassEditLineHeaders
        );
        this.validateDates();
    };

    @action
    public createLineHeader = (lineHeader: ILineHeader) => {
        const id = this.getNextAvailableLineHeaderId();
        const invalidPropertiesMap = FormValidator.validateAllProperties(
            lineHeaderValidationModel,
            lineHeader
        );
        const newMassEditLineHeader: IMassEditLineHeader = {
            lineHeader,
            id,
            invalidPropertiesMap,
            isRemoved: false,
        };

        this._massEditLineHeaders = _.chain(this.massEditLineHeaders!)
            .concat([newMassEditLineHeader])
            .sort(_sortMassEditLineHeaders)
            .value();

        this.validateDates();
        this.setIsEditingDisabled(false);
        this.setSelectedLineHeaderId(id);
    };

    @action
    public removeLineHeader = (id: number) => {
        const massEditLineHeaderToRemove = this._massEditLineHeaders!.find((m) => m.id === id);
        const isOldLineHeader = Boolean(massEditLineHeaderToRemove!.lineHeader.originalStartDate);
        // Keep old lineHeaders to remove in store
        if (isOldLineHeader) {
            massEditLineHeaderToRemove!.isRemoved = true;
        } else {
            this._massEditLineHeaders = this.massEditLineHeaders!.filter((m) => m.id !== id);
        }
        if (id === this._selectedLineHeaderId) {
            this.setSelectedLineHeaderId(null);
        }
        this.validateDates();
    };

    @action
    public setIsEditingDisabled = (isEditingDisabled: boolean) => {
        this._isEditingDisabled = isEditingDisabled;
    };

    @action
    public toggleIsEditingDisabled = () => {
        this._isEditingDisabled = !this._isEditingDisabled;
        if (this._isEditingDisabled) {
            this.resetChanges();
        } else {
            this.validateDates();
        }
    };

    @action
    public clear = () => {
        this._massEditLineHeaders = null;
        this._selectedLineHeaderId = null;
        this._oldlineHeaders = null;
        this._isEditingDisabled = true;
    };

    @action
    public resetChanges = () => {
        if (this._oldlineHeaders) {
            this.activate(this._oldlineHeaders);
        }
    };

    @action
    public getNextAvailableLineHeaderId = () => {
        this.sortLineHeadersById();

        let nextAvailableId = 0;
        for (const m of this._massEditLineHeaders!) {
            if (m.id !== nextAvailableId) {
                break;
            }
            nextAvailableId += 1;
        }
        return nextAvailableId;
    };

    @action
    public getLastLineHeader = (): ILineHeader | null => {
        const massEditLineHeaders = this._massEditLineHeaders!.filter(
            (massEditLineHeader) => !massEditLineHeader.isRemoved
        );
        if (massEditLineHeaders && massEditLineHeaders.length > 0) {
            return _.last(massEditLineHeaders!)!.lineHeader;
        }
        return null;
    };

    @action
    private sortLineHeadersById = () => {
        this._massEditLineHeaders = this._massEditLineHeaders!.slice().sort((a, b) =>
            a.id < b.id ? -1 : 1
        );
    };

    @action
    private validateDates = () => {
        let previousMassEditLineHeader: IMassEditLineHeader;
        this._massEditLineHeaders!.forEach((currentMassEditLineHeader) => {
            if (currentMassEditLineHeader.isRemoved) return;

            if (
                currentMassEditLineHeader.lineHeader.startDate >
                currentMassEditLineHeader.lineHeader.endDate
            ) {
                this.setValidationResult(currentMassEditLineHeader.id, 'startDate', {
                    isValid: false,
                    errorMessage: 'Voim.ast oltava ennen voim.viim',
                });
                return;
            }
            if (previousMassEditLineHeader) {
                const areDatesContinuing = _isNextDate(
                    previousMassEditLineHeader.lineHeader.endDate,
                    currentMassEditLineHeader.lineHeader.startDate
                );
                if (!areDatesContinuing) {
                    this.setValidationResult(currentMassEditLineHeader.id, 'startDate', {
                        isValid: false,
                        errorMessage: 'Päivämäärän oltava jatkuva',
                    });
                    return;
                }
            }
            this.setValidationResult(currentMassEditLineHeader.id, 'startDate', {
                isValid: true,
            });
            previousMassEditLineHeader = currentMassEditLineHeader;
        });
    };

    @action
    private setValidationResult = (
        id: number,
        property: keyof ILineHeader,
        validationResult: IValidationResult
    ) => {
        const massEditLineHeader = this.getMassEditLineHeader(id);

        massEditLineHeader!.invalidPropertiesMap[property] = validationResult;
    };

    @action
    private getMassEditLineHeader = (id: number) => {
        return this._massEditLineHeaders!.find((m) => _.isEqual(m.id, id));
    };
}

const _sortMassEditLineHeaders = (a: IMassEditLineHeader, b: IMassEditLineHeader) => {
    if (a.lineHeader.startDate < b.lineHeader.startDate) return -1;
    if (a.lineHeader.startDate > b.lineHeader.startDate) return 1;
    return 0;
};

// Is b next date of a
const _isNextDate = (a: Date, b: Date) => {
    const nextDayOfA = new Date(a);
    nextDayOfA.setDate(a.getDate() + 1);
    return _isSameDay(nextDayOfA, b);
};
const _isSameDay = (a: Date, b: Date) => {
    return (
        a.getFullYear() === b.getFullYear() &&
        a.getMonth() === b.getMonth() &&
        a.getDate() === b.getDate()
    );
};

export default new LineHeaderMassEditStore();

export { LineHeaderMassEditStore, IMassEditLineHeader };
