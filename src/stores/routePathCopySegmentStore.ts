import { action, computed, observable } from 'mobx';
import INode from '~/models/INode';
import { IRoutePathSegment } from '~/models/IRoutePath';
import { IRoutePathSegmentLink } from '~/models/IRoutePathLink';

// which type of node will be set next when a node is selected on map
type setNodeType = 'startNode' | 'endNode';

class RoutePathCopySegmentStore {
    @observable private _isLoading: boolean;
    @observable private _startNode: INode | null;
    @observable private _endNode: INode | null;
    @observable private _routePaths: IRoutePathSegment[];
    @observable private _highlightedRoutePath: IRoutePathSegment | null;
    @observable private _setNodeType: setNodeType;
    @observable private _areNodePositionsValid: boolean;

    // Constructor
    @action
    public initialize = () => {
        this._isLoading = true;
        this._startNode = null;
        this._endNode = null;
        this._routePaths = [];
        this._highlightedRoutePath = null;
        this._setNodeType = 'startNode';
        this._areNodePositionsValid = true;
    };

    @computed
    get isLoading(): boolean {
        return this._isLoading;
    }

    @computed
    get startNode(): INode | null {
        return this._startNode;
    }

    @computed
    get endNode(): INode | null {
        return this._endNode;
    }

    @computed
    get routePaths(): IRoutePathSegment[] {
        return this._routePaths;
    }

    @computed
    get highlightedRoutePath(): IRoutePathSegment | null {
        return this._highlightedRoutePath;
    }

    @computed
    get setNodeType(): setNodeType {
        return this._setNodeType;
    }

    @computed
    get areNodePositionsValid(): boolean {
        return this._areNodePositionsValid;
    }

    @action
    public setIsLoading = (isLoading: boolean) => {
        this._isLoading = isLoading;
    };

    @action
    public setStartNode = (node: INode) => {
        this._startNode = node;
    };

    @action
    public setEndNode = (node: INode) => {
        this._endNode = node;
    };

    @action
    public setRoutePaths = (routePaths: IRoutePathSegment[]) => {
        this._routePaths = routePaths;
    };

    @action
    public setHighlightedRoutePath = (highlightedRoutePath: IRoutePathSegment | null) => {
        this._highlightedRoutePath = highlightedRoutePath;
    };

    @action
    public setSetNodeType = (_setNodeType: setNodeType) => {
        this._setNodeType = _setNodeType;
    };

    @action
    public setNodePositionValidity = (areNodePositionsValid: boolean) => {
        this._areNodePositionsValid = areNodePositionsValid;
    };

    @action
    public clear = () => {
        this._startNode = null;
        this._endNode = null;
        this._routePaths = [];
        this._highlightedRoutePath = null;
        this._setNodeType = 'startNode';
    };

    public getSegmentLinksToCopy = (
        routePath: IRoutePathSegment,
        startNodeId: string,
        endNodeId: string
    ): IRoutePathSegmentLink[] => {
        const startLinkOrderNumber = this._getStartLinkOrderNumber(routePath.links, startNodeId);
        const endLinkOrderNumber = this._getEndLinkOrderNumber(routePath.links, endNodeId);

        return routePath.links.filter((link: IRoutePathSegmentLink) => {
            return (
                link.orderNumber >= startLinkOrderNumber && link.orderNumber <= endLinkOrderNumber
            );
        });
    };

    public getSegmentLinksNotToCopy = (
        routePath: IRoutePathSegment,
        startNodeId: string,
        endNodeId: string
    ) => {
        const startLinkOrderNumber = this._getStartLinkOrderNumber(routePath.links, startNodeId);
        const endLinkOrderNumber = this._getEndLinkOrderNumber(routePath.links, endNodeId);

        return routePath.links.filter((link: IRoutePathSegmentLink) => {
            return link.orderNumber < startLinkOrderNumber || link.orderNumber > endLinkOrderNumber;
        });
    };

    private _getStartLinkOrderNumber = (links: IRoutePathSegmentLink[], startNodeId: string) => {
        return links.find((link: IRoutePathSegmentLink) => link.startNodeId === startNodeId)!
            .orderNumber;
    };

    private _getEndLinkOrderNumber = (links: IRoutePathSegmentLink[], endNodeId: string) => {
        return links.find((link: IRoutePathSegmentLink) => link.endNodeId === endNodeId)!
            .orderNumber;
    };
}

export default new RoutePathCopySegmentStore();

export { RoutePathCopySegmentStore, setNodeType };
