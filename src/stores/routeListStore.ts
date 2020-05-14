import { action, computed, observable, reaction } from 'mobx';
import { ILine, IRoute } from '~/models';
import RoutePathLayerStore from './routePathLayerStore';
import SearchStore from './searchStore';

interface IRouteItem {
    route: IRoute;
    selectedTabIndex: number; // Needs to be in store instead of RouteItem's state to prevent state reseting when RouteItem re-renders
    areAllRoutePathsVisible: boolean; // Needs to be in store instead of RouteItem's state to prevent state reseting when RouteItem re-renders
}

class RouteListStore {
    @observable private _routeItems: IRouteItem[];
    @observable private _lines: ILine[];
    @observable private _routeIdToEdit: string | null;

    // Constructor
    @action
    public initialize = () => {
        this._routeItems = [];
        this._lines = [];
        this._routeIdToEdit = null;

        reaction(
            () => this.routeIdToEdit != null,
            (value: boolean) => SearchStore.setIsSearchDisabled(value)
        );
    };

    @computed
    get routeItems(): IRouteItem[] {
        return this._routeItems;
    }

    @computed
    get routes(): IRoute[] {
        return this._routeItems.map(
            (routeItem: IRouteItem): IRoute => {
                return routeItem.route;
            }
        );
    }

    @computed
    get routeIdToEdit(): string | null {
        return this._routeIdToEdit;
    }

    public getLine(lineId: string): ILine | undefined {
        return this._lines.find((line) => line.id === lineId);
    }

    @action
    public addToRouteItems = (routes: IRoute[]) => {
        const routeItems = routes.map(
            (route: IRoute): IRouteItem => {
                return {
                    route,
                    selectedTabIndex: 0,
                    areAllRoutePathsVisible: false,
                };
            }
        );
        this._routeItems = this._routeItems.concat(routeItems);
        routes.forEach((route) => {
            RoutePathLayerStore.addRoutePaths({ routePaths: route.routePaths });
        });
    };

    @action
    public addToLines = (lines: ILine[]) => {
        this._lines = this._lines.concat(lines);
    };

    @action
    public removeFromRouteItems = (routeId: string) => {
        for (let i = 0; i < this._routeItems.length; i += 1) {
            if (this._routeItems[i].route.id === routeId) {
                this._routeItems[i].route.routePaths.forEach((routePath) =>
                    RoutePathLayerStore.removeRoutePath(routePath.internalId)
                );
                this._routeItems.splice(i, 1);
            }
        }
    };

    @action
    public updateRoute = (route: IRoute) => {
        const routeToUpdateIndex = this._routeItems.findIndex((iterator: IRouteItem) => {
            return iterator.route.id === route.id;
        });
        this._routeItems[routeToUpdateIndex].route = route;
    };

    @action
    public setRouteIdToEdit = (routeId: string | null) => {
        this._routeIdToEdit = routeId;
    };

    @action
    public clear = () => {
        this._routeItems = [];
        this._routeIdToEdit = null;
        RoutePathLayerStore.clear();
    };

    @action
    public setSelectedTabIndex = (routeId: string, index: number) => {
        const routeItem = this._routeItems.find((routeItem) => routeItem.route.id === routeId);
        routeItem!.selectedTabIndex = index;
    };

    @action
    public toggleAllRoutePathsVisible = (routeId: string) => {
        const routeItem = this._routeItems.find((routeItem) => routeItem.route.id === routeId);
        routeItem!.areAllRoutePathsVisible = !routeItem!.areAllRoutePathsVisible;
    };

    @action
    public setAllRoutePathsVisible = (routeId: string) => {
        const routeItem = this._routeItems.find((routeItem) => routeItem.route.id === routeId);
        routeItem!.areAllRoutePathsVisible = true;
    };

    public getRouteItem = (routeId: string): IRouteItem | undefined => {
        return this._routeItems.find((routeItem) => routeItem.route.id === routeId);
    };
}

export default new RouteListStore();

export { RouteListStore, IRouteItem };
