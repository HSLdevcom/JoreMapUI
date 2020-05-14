import L from 'leaflet';
import _ from 'lodash';
import { action, autorun, computed, observable } from 'mobx';
import ColorScale from '~/helpers/ColorScale';
import { IRoutePath, IRoutePathLink } from '~/models';
import RoutePathService from '~/services/routePathService';
import MapStore from './mapStore';

class RoutePathLayerStore {
    @observable private _routePaths: IRoutePath[];
    @observable private _highlightedRoutePathId: string | null;
    @observable private _selectedRoutePathId: string | null;
    private colorScale: ColorScale;

    // Constructor
    @action
    public initialize = () => {
        this._routePaths = [];
        this._highlightedRoutePathId = null;
        this._selectedRoutePathId = null;
        this.colorScale = new ColorScale();
        autorun(() => this.centerMapToRoutePaths());
    };

    @computed
    get routePaths(): IRoutePath[] {
        return this._routePaths;
    }

    @computed
    get selectedRoutePathId(): string | null {
        return this._selectedRoutePathId;
    }

    @computed
    get highlightedRoutePathId(): string | null {
        return this._highlightedRoutePathId;
    }

    @action
    public init = ({ routePaths }: { routePaths: IRoutePath[] }) => {
        this.addRoutePaths({ routePaths });
    };

    @action
    public addRoutePaths = ({ routePaths }: { routePaths: IRoutePath[] }) => {
        const routePathsWithColor = _.cloneDeep(routePaths).map((rp) => {
            if (rp.isVisible && !rp.color) {
                rp.color = this.colorScale.reserveColor();
            } else if (rp.isVisible && rp.color) {
                this.colorScale.reserveColor(rp.color);
            }
            return rp;
        });
        this._routePaths = this._routePaths.concat(routePathsWithColor);
    };

    @action
    public setRoutePathVisibility = async ({
        isVisible,
        id,
    }: {
        isVisible: boolean;
        id: string;
    }) => {
        const routePath = this._routePaths.find((rp) => rp.internalId === id)!;
        if (isVisible === routePath.isVisible) return;

        routePath.isVisible = isVisible;
        routePath.color = routePath.isVisible
            ? this.colorScale.reserveColor()
            : this.colorScale.releaseColor(routePath.color!);
        if (routePath.isVisible && routePath.routePathLinks.length === 0) {
            const routePathWithGeometry = await RoutePathService.fetchRoutePath(
                routePath.routeId,
                routePath.startDate,
                routePath.direction
            );
            this.fetchRoutePathLinksToRoutePath(routePathWithGeometry!.routePathLinks, id);
        }
    };

    @action
    public fetchRoutePathLinksToRoutePath = (routePathLinks: IRoutePathLink[], id: string) => {
        const routePath = this._routePaths.find((rp) => rp.internalId === id);
        // If component is unmounted, routePath won't be found
        if (routePath) {
            routePath.routePathLinks = routePathLinks;
        }
    };

    @action
    public toggleRoutePathVisibility = async (id: string) => {
        const routePath = this._routePaths.find((rp) => rp.internalId === id);
        this.setRoutePathVisibility({ id, isVisible: !routePath!.isVisible });
    };

    @action
    public removeRoutePath = (id: string) => {
        let index: number;
        let routePath: IRoutePath;
        this._routePaths.find((rp: IRoutePath, i: number) => {
            if (rp.internalId === id) {
                index = i;
                routePath = rp;
                return true;
            }
            return false;
        });
        this._routePaths.splice(index!, 1);
        this.colorScale.releaseColor(routePath!.color!);
    };

    @action
    public toggleSelectedRoutePath = (id: string) => {
        if (this._selectedRoutePathId === id) {
            this._selectedRoutePathId = null;
        } else {
            this._selectedRoutePathId = id;
        }
    };

    @action
    public setRoutePathHighlight = (id: string | null) => {
        this._highlightedRoutePathId = id;
    };

    @action
    public clear = () => {
        this._routePaths.forEach((rp) => {
            this.colorScale.releaseColor(rp.color!);
        });
        this._routePaths = [];
        this._highlightedRoutePathId = null;
        this._selectedRoutePathId = null;
        this.colorScale = new ColorScale();
    };

    public getRoutePath = (id: string): IRoutePath | undefined => {
        return this._routePaths.find((rp) => rp.internalId === id);
    };

    private centerMapToRoutePaths = () => {
        if (this._routePaths.length === 0) return;
        const bounds: L.LatLngBounds = new L.LatLngBounds([]);
        this._routePaths.forEach((routePath) => {
            if (routePath.isVisible) {
                routePath.routePathLinks.forEach((routePathLink) => {
                    routePathLink.geometry.forEach((pos) => {
                        bounds.extend(pos);
                    });
                });
            }
        });
        if (bounds.isValid()) {
            MapStore!.setMapBounds(bounds);
        }
    };
}

export default new RoutePathLayerStore();

export { RoutePathLayerStore };
