import _ from 'lodash';
import { action, computed, observable } from 'mobx';
import TransitType from '~/enums/transitType';
import { IRoutePath } from '~/models';
import RoutePathLayerStore from './routePathLayerStore';
import RoutePathMassEditStore from './routePathMassEditStore';

interface IRoutePathToCopy {
    id: string;
    direction: string;
    routePath: IRoutePath;
}

class CopyRoutePathStore {
    @observable private _lineId: string | null;
    @observable private _routeId: string | null;
    @observable private _transitType: TransitType;
    @observable private _routePathsToCopy: IRoutePathToCopy[];
    @observable private _storedRouteListRoutePaths: IRoutePath[] | null;

    // Constructor
    @action
    public initialize = () => {
        this.clear();
    };

    @computed
    get lineId() {
        return this._lineId;
    }

    @computed
    get routeId() {
        return this._routeId;
    }

    @computed
    get transitType() {
        return this._transitType;
    }

    @computed
    get routePathsToCopy() {
        return this._routePathsToCopy;
    }

    @computed
    get isVisible() {
        return this._lineId !== null && this._routeId !== null && this._transitType !== null;
    }

    @action
    public init = ({
        lineId,
        routeId,
        transitType,
    }: {
        lineId: string;
        routeId: string;
        transitType: TransitType;
    }) => {
        this._lineId = lineId;
        this._routeId = routeId;
        this._transitType = transitType;

        this._storedRouteListRoutePaths = _.cloneDeep(RoutePathLayerStore.routePaths);
        RoutePathLayerStore.clear();
    };

    @action
    public addRoutePathsToCopy = (routePaths: IRoutePath[]) => {
        const newRoutePaths: IRoutePathToCopy[] = [];
        routePaths.forEach((rp) => {
            newRoutePaths.push({
                routePath: rp,
                direction: rp.direction,
                id: rp.internalId,
            });
        });

        this._routePathsToCopy = this._routePathsToCopy.concat(newRoutePaths);
    };

    @action
    public setRoutePathToCopyDirection = (id: string, direction: string) => {
        this._routePathsToCopy.find((rpToCopy) => rpToCopy.id === id)!.direction = direction;
    };

    @action
    public removeRoutePathToCopy = (id: string) => {
        const removeIndex = this._routePathsToCopy.findIndex((rpToCopy) => rpToCopy.id === id);
        this._routePathsToCopy.splice(removeIndex, 1);

        RoutePathLayerStore.removeRoutePath(id);
    };

    @action
    public copyRoutePathPair = () => {
        this.restoreRouteListRoutePaths();
        RoutePathMassEditStore.addCopiedRoutePaths(this._routePathsToCopy);
        this.clear();
    };

    @action
    public restoreRouteListRoutePaths = () => {
        RoutePathLayerStore.clear();
        RoutePathLayerStore.addRoutePaths({ routePaths: this._storedRouteListRoutePaths! });
    };

    @action
    public clear = () => {
        this._lineId = null;
        this._routeId = null;
        this._routePathsToCopy = [];
        this._storedRouteListRoutePaths = null;
    };
}

export default new CopyRoutePathStore();

export { CopyRoutePathStore, IRoutePathToCopy };
