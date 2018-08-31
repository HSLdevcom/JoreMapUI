import { action, computed, observable, toJS } from 'mobx';
import { IRoute, IRoutePath } from '../models';

export class RouteStore {
    @observable private _routes = observable<IRoute>([]);
    @observable private _routePaths = observable<IRoutePath>([]);

    @computed get routes(): IRoute[] {
        return toJS(this._routes);
    }

    @computed get routePaths(): IRoutePath[] {
        return toJS(this._routePaths);
    }

    get visibleRoutePathAmount(): number {
        let visibleRoutePathsTotal = 0;
        this._routes.forEach((route: IRoute) => {
            const visibleRoutePaths = route.routePaths.filter(
                x => x.visible).length;
            visibleRoutePathsTotal = visibleRoutePathsTotal + visibleRoutePaths;
        });

        return visibleRoutePathsTotal;
    }

    @action
    public addToRoutes(node: IRoute) {
        this._routes.push(node);
    }

    @action
    public addToRoutePaths(routePath: IRoutePath) {
        this._routePaths.push(routePath);
    }

    @action
    public clearRoutePaths() {
        this._routePaths.clear();
    }

    @action
    public removeFromRoutes(routeId: string) {
        for (let i = 0; i < this._routes.length; i += 1) {
            if (this._routes[i].routeId === routeId) {
                this._routes.splice(i, 1);
            }
        }
    }

    @action
    public clearRoutes() {
        this._routes.clear();
    }

    private getRoutePath(internalId: string): IRoutePath | null {
        let routePathObservable: IRoutePath | null = null;
        this._routes.find((_route) => {
            const found = _route.routePaths.find(_routePath =>
                _routePath.internalId === internalId,
            );
            if (found) {
                routePathObservable = found;
                return true;
            }
            return false;
        });
        return routePathObservable;
    }

    @action
    public toggleRoutePathVisibility(internalId: string) {
        const routePathObservable = this.getRoutePath(internalId);
        if (routePathObservable) {
            routePathObservable.visible = !routePathObservable.visible;
        }
    }
}

const observableStoreStore = new RouteStore();

export default observableStoreStore;
