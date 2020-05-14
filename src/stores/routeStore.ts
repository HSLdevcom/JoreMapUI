import _ from 'lodash';
import { action, computed, observable, reaction } from 'mobx';
import { IRoute } from '~/models';
import routeValidationModel, {
    IRouteValidationModel,
} from '~/models/validationModels/routeValidationModel';
import { IValidationResult } from '~/validation/FormValidator';
import NavigationStore from './navigationStore';
import RouteListStore from './routeListStore';
import ValidationStore, { ICustomValidatorMap } from './validationStore';

class RouteStore {
    @observable private _route: IRoute | null;
    @observable private _oldRoute: IRoute | null;
    @observable private _isNewRoute: boolean;
    @observable private _existingRouteIds: string[] = [];
    private _validationStore: ValidationStore<IRoute, IRouteValidationModel>;

    // Constructor
    @action
    public initialize = () => {
        this._validationStore = new ValidationStore();

        reaction(
            () => this.shouldShowUnsavedChangesPrompt,
            (value: boolean) => NavigationStore.setShouldShowUnsavedChangesPrompt(value)
        );
    };

    @computed
    get route(): IRoute {
        return this._route!;
    }

    @computed
    get oldRoute(): IRoute {
        return this._oldRoute!;
    }

    @computed
    get isNewRoute(): boolean {
        return this._isNewRoute;
    }

    @computed
    get existingRouteIds(): string[] {
        return this._existingRouteIds;
    }

    @computed
    get shouldShowUnsavedChangesPrompt(): boolean {
        return this.isDirty && RouteListStore.routeIdToEdit != null;
    }

    @computed
    get isDirty() {
        // line and routePaths can't change in routeView, omit them from
        // the comparison to prevent lag
        return !_.isEqual(
            _.omit(this._route, ['line', 'routePaths']),
            _.omit(this._oldRoute, ['line', 'routePaths'])
        );
    }

    @computed
    get invalidPropertiesMap() {
        return this._validationStore.getInvalidPropertiesMap();
    }

    @computed
    get isRouteFormValid() {
        return this._validationStore.isValid();
    }

    @action
    public init = ({ route, isNewRoute }: { route: IRoute; isNewRoute: boolean }) => {
        this._route = _.cloneDeep(route);
        this._oldRoute = _.cloneDeep(route);
        this._validationStore.clear();

        this._isNewRoute = isNewRoute;
        const customValidatorMap: ICustomValidatorMap = {
            id: {
                validators: [
                    (route: IRoute, property: string, routeId: string) => {
                        if (!this._isNewRoute) return;
                        if (Boolean(this._existingRouteIds.includes(routeId))) {
                            const validationResult: IValidationResult = {
                                isValid: false,
                                errorMessage: `Reitti ${routeId} on jo olemassa.`,
                            };
                            return validationResult;
                        }
                        return;
                    },
                ],
            },
        };
        this._validationStore.init(this._route, routeValidationModel, customValidatorMap);
    };

    @action
    public updateRouteProperty = (property: keyof IRoute, value: string | number | Date) => {
        (this._route as any)[property] = value;
        this._validationStore.updateProperty(property, value);
    };

    @action
    public setExistingRouteIds = (existingRouteIds: string[]) => {
        this._existingRouteIds = existingRouteIds;
    };

    @action
    public clear = () => {
        this._route = null;
        this._oldRoute = null;
        this._validationStore.clear();
    };
}

export default new RouteStore();

export { RouteStore };
