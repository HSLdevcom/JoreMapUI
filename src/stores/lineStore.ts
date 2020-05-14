import _ from 'lodash';
import { action, computed, observable, reaction } from 'mobx';
import { ILine, IRoute } from '~/models';
import ISearchLine from '~/models/searchModels/ISearchLine';
import lineValidationModel, {
    ILineValidationModel,
} from '~/models/validationModels/lineValidationModel';
import { IValidationResult } from '~/validation/FormValidator';
import NavigationStore from './navigationStore';
import ValidationStore, { ICustomValidatorMap } from './validationStore';

class LineStore {
    @observable private _line: ILine | null;
    @observable private _routes: IRoute[];
    @observable private _oldline: ILine | null;
    @observable private _isNewLine: boolean;
    @observable private _isEditingDisabled: boolean;
    @observable private _existingLines: ISearchLine[] = [];
    private _validationStore: ValidationStore<ILine, ILineValidationModel>;

    // Constructor
    @action
    public initialize = () => {
        this._isEditingDisabled = true;
        this._validationStore = new ValidationStore();

        reaction(
            () => this.isDirty && !this._isEditingDisabled,
            (value: boolean) => NavigationStore.setShouldShowUnsavedChangesPrompt(value)
        );
        reaction(() => this._isEditingDisabled, this.onChangeIsEditingDisabled);
    };

    @computed
    get line(): ILine | null {
        return this._line;
    }

    @computed
    get routes(): IRoute[] {
        return this._routes;
    }

    @computed
    get oldLine(): ILine | null {
        return this._oldline;
    }

    get isNewLine(): boolean {
        return this._isNewLine;
    }

    @computed
    get isDirty() {
        return !_.isEqual(this._line, this._oldline);
    }

    @computed
    get isEditingDisabled() {
        return this._isEditingDisabled;
    }

    @computed
    get existingLines() {
        return this._existingLines;
    }

    @computed
    get invalidPropertiesMap() {
        return this._validationStore.getInvalidPropertiesMap();
    }

    @computed
    get isLineFormValid() {
        return this._validationStore.isValid();
    }

    @action
    public activate = ({ line, isNewLine }: { line: ILine; isNewLine: boolean }) => {
        this._line = line;
        this._isNewLine = isNewLine;
        this.setOldLine(this._line);

        const customValidatorMap: ICustomValidatorMap = {
            id: {
                validators: [
                    (line: ILine, property: string, lineId: string) => {
                        if (!this._isNewLine) return;
                        if (this.isLineAlreadyFound(lineId)) {
                            const validationResult: IValidationResult = {
                                isValid: false,
                                errorMessage: `Linja ${lineId} on jo olemassa.`,
                            };
                            return validationResult;
                        }
                        return;
                    },
                ],
            },
        };

        this._validationStore.activate(line, lineValidationModel, customValidatorMap);
    };

    @action
    public setRoutes = (routes: IRoute[]) => {
        this._routes = routes;
    };

    @action
    public setOldLine = (line: ILine) => {
        this._oldline = _.cloneDeep(line);
    };

    @action
    public updateLineProperty = (property: keyof ILine, value: string | number | Date) => {
        (this._line as any)[property] = value;
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
    public setExistingLines = (existingLines: ISearchLine[]) => {
        this._existingLines = existingLines;
    };

    @action
    public clear = () => {
        this._line = null;
        this._oldline = null;
        this._validationStore.clear();
    };

    @action
    public resetChanges = () => {
        if (this._oldline) {
            this.activate({ line: this._oldline, isNewLine: this._isNewLine });
        }
    };

    private isLineAlreadyFound = (lineId: string): boolean => {
        return Boolean(
            this.existingLines.find((searchLine: ISearchLine) => searchLine.id === lineId)
        );
    };

    private onChangeIsEditingDisabled = () => {
        if (this._isEditingDisabled) {
            this.resetChanges();
        } else {
            this._validationStore.validateAllProperties();
        }
    };
}

export default new LineStore();

export { LineStore };
