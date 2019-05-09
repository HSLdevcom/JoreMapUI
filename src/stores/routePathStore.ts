import { action, computed, observable } from 'mobx';
import _ from 'lodash';
import { IRoutePath, IRoutePathLink } from '~/models';
import lengthCalculator from '~/util/lengthCalculator';
import INeighborLink from '~/models/INeighborLink';
import GeometryUndoStore from '~/stores/geometryUndoStore';

// Is the neighbor to add either startNode or endNode
export enum NeighborToAddType {
    AfterNode,
    BeforeNode
}

export enum RoutePathViewTab {
    Info,
    List
}

export interface UndoState {
    routePathLinks: IRoutePathLink[];
}

export enum ListFilter {
    stop,
    otherNodes,
    link
}

export class RoutePathStore {
    @observable private _routePath: IRoutePath | null;
    @observable private _oldRoutePath: IRoutePath | null;
    @observable private _neighborRoutePathLinks: INeighborLink[];
    @observable private _neighborToAddType: NeighborToAddType;
    @observable private _highlightedMapItem: string | null;
    @observable private _extendedListItems: string[];
    @observable private _activeTab: RoutePathViewTab;
    @observable private _listFilters: ListFilter[];
    @observable private _invalidLinkOrderNumbers: number[];
    private _geometryUndoStore: GeometryUndoStore<UndoState>;

    constructor() {
        this._neighborRoutePathLinks = [];
        this._highlightedMapItem = null;
        this._extendedListItems = [];
        this._activeTab = RoutePathViewTab.Info;
        this._listFilters = [ListFilter.link];
        this._geometryUndoStore = new GeometryUndoStore();
        this._invalidLinkOrderNumbers = [];
    }

    @computed
    get routePath(): IRoutePath | null {
        return this._routePath;
    }

    @computed
    get neighborLinks(): INeighborLink[] {
        return this._neighborRoutePathLinks;
    }

    @computed
    get neighborToAddType(): NeighborToAddType {
        return this._neighborToAddType;
    }

    @computed
    get isDirty() {
        return !_.isEqual(this._routePath, this._oldRoutePath);
    }

    @computed
    get activeTab() {
        return this._activeTab;
    }

    @computed
    get listFilters() {
        return this._listFilters;
    }

    @computed
    get extendedObjects() {
        return this._extendedListItems;
    }

    @computed
    get invalidLinkOrderNumbers() {
        return this._invalidLinkOrderNumbers;
    }

    @action
    public setActiveTab = (tab: RoutePathViewTab) => {
        this._activeTab = tab;
    };

    @action
    public toggleActiveTab = () => {
        if (this._activeTab === RoutePathViewTab.Info) {
            this._activeTab = RoutePathViewTab.List;
        } else {
            this._activeTab = RoutePathViewTab.Info;
        }
    };

    @action
    public removeListFilter = (listFilter: ListFilter) => {
        if (this._listFilters.includes(listFilter)) {
            this._listFilters = this._listFilters.filter(
                lF => lF !== listFilter
            );
        }
    };

    @action
    public toggleListFilter = (listFilter: ListFilter) => {
        if (this._listFilters.includes(listFilter)) {
            this._listFilters = this._listFilters.filter(
                lF => lF !== listFilter
            );
        } else {
            // Need to do concat (instead of push) to trigger ReactionDisposer watcher
            this._listFilters = this._listFilters.concat([listFilter]);
        }
    };

    @action
    public undo = () => {
        this._geometryUndoStore.undo((nextUndoState: UndoState) => {
            this._neighborRoutePathLinks = [];

            const undoRoutePathLinks = nextUndoState.routePathLinks;
            const oldRoutePathLinks = this._routePath!.routePathLinks;
            // Prevent undo if oldLink is found
            const newRoutePathLinks = undoRoutePathLinks.map(undoRpLink => {
                const oldRpLink = oldRoutePathLinks!.find(rpLink => {
                    return rpLink.id === undoRpLink.id;
                });
                if (oldRpLink) {
                    return _.cloneDeep(oldRpLink);
                }
                return undoRpLink;
            });
            this._routePath!.routePathLinks = newRoutePathLinks;
        });
    };

    @action
    public redo = () => {
        this._geometryUndoStore.redo((previousUndoState: UndoState) => {
            this._neighborRoutePathLinks = [];

            const redoRoutePathLinks = previousUndoState.routePathLinks;
            const oldRoutePathLinks = this._routePath!.routePathLinks;
            // Prevent redo if oldLink is found
            const newRoutePathLinks = redoRoutePathLinks.map(redoRpLink => {
                const oldRpLink = oldRoutePathLinks!.find(rpLink => {
                    return rpLink.id === redoRpLink.id;
                });
                if (oldRpLink) {
                    return _.cloneDeep(oldRpLink);
                }
                return redoRpLink;
            });
            this._routePath!.routePathLinks = newRoutePathLinks;
        });
    };

    @action
    public onRoutePathLinksChanged() {
        this.recalculateOrderNumbers();
    }

    @action
    public setHighlightedObject = (objectId: string | null) => {
        this._highlightedMapItem = objectId;
    };

    @action
    public toggleExtendedListItem = (objectId: string) => {
        if (this._extendedListItems.some(o => o === objectId)) {
            this._extendedListItems = this._extendedListItems.filter(
                o => o !== objectId
            );
        } else {
            this._extendedListItems.push(objectId);
        }
    };

    @action
    public setExtendedListItems = (objectIds: string[]) => {
        this._extendedListItems = objectIds;
    };

    @action
    public setRoutePath = (routePath: IRoutePath) => {
        this._routePath = routePath;
        // Need to recalculate orderNumbers to ensure that they are correct
        this.recalculateOrderNumbers();
        const routePathLinks = routePath.routePathLinks
            ? routePath.routePathLinks
            : [];
        const currentUndoState: UndoState = {
            routePathLinks
        };
        this._geometryUndoStore.addItem(currentUndoState);

        this.setOldRoutePath(this._routePath);
    };

    @action
    public setOldRoutePath = (routePath: IRoutePath) => {
        this._oldRoutePath = _.cloneDeep(routePath);
    };

    @action
    public updateRoutePathProperty = (
        property: string,
        value: string | number | Date
    ) => {
        this._routePath = {
            ...this._routePath!,
            [property]: value
        };
    };

    @action
    public updateRoutePathLinkProperty = (
        orderNumber: number,
        property: string,
        value: string | number | boolean
    ) => {
        const rpLinkToUpdate:
            | IRoutePathLink
            | undefined = this._routePath!.routePathLinks!.find(
            rpLink => rpLink.orderNumber === orderNumber
        );
        rpLinkToUpdate![property] = value;
    };

    @action
    public setLinkFormValidity = (orderNumber: number, isValid: boolean) => {
        if (isValid) {
            this._invalidLinkOrderNumbers = this._invalidLinkOrderNumbers.filter(
                item => item !== orderNumber
            );
        } else {
            if (!this.invalidLinkOrderNumbers.includes(orderNumber)) {
                this.invalidLinkOrderNumbers.push(orderNumber);
            }
        }
    };

    @action
    public setNeighborRoutePathLinks = (neighborLinks: INeighborLink[]) => {
        this._neighborRoutePathLinks = neighborLinks;
    };

    @action
    public setNeighborToAddType = (neighborToAddType: NeighborToAddType) => {
        this._neighborToAddType = neighborToAddType;
    };

    /**
     * Uses given routePathLink's orderNumber to place given routePathLink in the correct position
     * in routePath.routePathLinks array
     */
    @action
    public addLink = (routePathLink: IRoutePathLink) => {
        this._routePath!.routePathLinks!.splice(
            // Order numbers start from 1
            routePathLink.orderNumber - 1,
            0,
            routePathLink
        );

        this.recalculateOrderNumbers();
        this.addCurrentStateToUndoStore();
    };

    @action
    public removeLink = (id: string) => {
        // Need to do splice to trigger ReactionDisposer watcher
        const linkToRemoveIndex = this._routePath!.routePathLinks!.findIndex(
            link => link.id === id
        );
        this._routePath!.routePathLinks!.splice(linkToRemoveIndex, 1);

        this.recalculateOrderNumbers();
        this.addCurrentStateToUndoStore();
    };

    @action
    public addCurrentStateToUndoStore() {
        this._neighborRoutePathLinks = [];

        const routePathLinks =
            this._routePath && this._routePath.routePathLinks
                ? this._routePath.routePathLinks
                : [];
        const currentUndoState: UndoState = {
            routePathLinks: _.cloneDeep(routePathLinks)
        };
        this._geometryUndoStore.addItem(currentUndoState);
    }

    @action
    public setRoutePathLinks = (routePathLinks: IRoutePathLink[]) => {
        this._routePath!.routePathLinks = routePathLinks;
        this.recalculateOrderNumbers();
        this.sortRoutePathLinks();
    };

    @action
    public sortRoutePathLinks = () => {
        this._routePath!.routePathLinks = this._routePath!.routePathLinks!.slice().sort(
            (a, b) => a.orderNumber - b.orderNumber
        );
    };

    @action
    public undoChanges = () => {
        if (this._oldRoutePath) {
            this.setRoutePath(this._oldRoutePath);
        }
    };

    @action
    public clear = () => {
        this._routePath = null;
        this._neighborRoutePathLinks = [];
        this._geometryUndoStore.clear();
    };

    public isMapItemHighlighted = (objectId: string) => {
        return (
            this._highlightedMapItem === objectId ||
            (!this._highlightedMapItem && this.isListItemExtended(objectId))
        );
    };

    public isListItemExtended = (objectId: string) => {
        return this._extendedListItems.some(n => n === objectId);
    };

    public getCalculatedLength = () => {
        if (this.routePath && this.routePath.routePathLinks) {
            return Math.floor(
                lengthCalculator.fromRoutePathLinks(
                    this.routePath!.routePathLinks!
                )
            );
        }
        return 0;
    };

    public getLinkGeom = (linkId: string): L.LatLng[] => {
        const link = this._routePath!.routePathLinks!.find(
            l => l.id === linkId
        );
        if (link) {
            return link.geometry;
        }
        return [];
    };

    public getNodeGeom = (nodeId: string): L.LatLng[] => {
        let node = this._routePath!.routePathLinks!.find(
            l => l.startNode.id === nodeId
        );
        if (!node) {
            node = this._routePath!.routePathLinks!.find(
                l => l.endNode.id === nodeId
            );
        }
        if (node) {
            return node.geometry;
        }
        return [];
    };

    public hasNodeOddAmountOfNeighbors = (nodeId: string) => {
        const routePath = this.routePath;
        return (
            routePath!.routePathLinks!.filter(x => x.startNode.id === nodeId)
                .length !==
            routePath!.routePathLinks!.filter(x => x.endNode.id === nodeId)
                .length
        );
    };

    private recalculateOrderNumbers = () => {
        this._routePath!.routePathLinks!.forEach((rpLink, index) => {
            // Order numbers start from 1
            rpLink.orderNumber = index + 1;
        });
    };
}

const observableStoreStore = new RoutePathStore();

export default observableStoreStore;
