import _ from 'lodash';
import { action, computed, observable } from 'mobx';
import ColorScale from '~/helpers/ColorScale';
import { IRoutePath, IRoutePathLink } from '~/models';
import RoutePathService from '~/services/routePathService';

class RoutePathLayerStore {
    @observable private _routePaths: IRoutePath[];
    @observable private _highlightedRoutePathId: string | null;
    @observable private _selectedRoutePathId: string | null;
    private colorScale: ColorScale;

    constructor() {
        this._routePaths = [];
        this._highlightedRoutePathId = null;
        this._selectedRoutePathId = null;
        this.colorScale = new ColorScale();
    }

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
        // TODO: init colorScale from routePath.color?
        this._routePaths = _.cloneDeep(routePaths);
    };

    @action
    public addRoutePaths = (routePaths: IRoutePath[]) => {
        // TODO: init colorScale from routePath.color?
        this._routePaths = this._routePaths.concat(_.cloneDeep(routePaths));
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
        if (isVisible === routePath.visible) return;

        routePath.visible = isVisible;
        routePath.color = routePath.visible
            ? this.colorScale.reserveColor()
            : this.colorScale.releaseColor(routePath.color!);
        if (routePath.visible && routePath.routePathLinks.length === 0) {
            const routePathWithGeometry = await RoutePathService.fetchRoutePath(
                routePath.routeId,
                routePath.startTime,
                routePath.direction
            );
            this.setRoutePathLinksToRoutePath(routePathWithGeometry!.routePathLinks, id);
        }
    };

    @action
    public setRoutePathLinksToRoutePath = (routePathLinks: IRoutePathLink[], id: string) => {
        this._routePaths.find((rp) => rp.internalId === id)!.routePathLinks = routePathLinks;
    };

    @action
    public toggleRoutePathVisibility = async (id: string) => {
        const routePath = this._routePaths.find((rp) => rp.internalId === id);
        this.setRoutePathVisibility({ id, isVisible: !routePath!.visible });
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
        this._routePaths = [];
        this._highlightedRoutePathId = null;
        this._selectedRoutePathId = null;
        this.colorScale = new ColorScale();
    };

    public getRoutePath = (id: string): IRoutePath | undefined => {
        return this._routePaths.find((rp) => rp.internalId === id);
    };
}

export default new RoutePathLayerStore();

export { RoutePathLayerStore };
