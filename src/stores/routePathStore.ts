import _ from 'lodash';
import { action, computed, observable, reaction } from 'mobx';
import ToolbarToolType from '~/enums/toolbarToolType';
import { IRoutePath, IRoutePathLink } from '~/models';
import INeighborLink from '~/models/INeighborLink';
import routePathLinkValidationModel, {
    IRoutePathLinkValidationModel,
} from '~/models/validationModels/routePathLinkValidationModel';
import routePathValidationModel, {
    IRoutePathValidationModel,
} from '~/models/validationModels/routePathValidationModel';
import GeometryUndoStore from '~/stores/geometryUndoStore';
import RoutePathValidator from '~/utils/RoutePathValidator';
import { toDateString } from '~/utils/dateUtils';
import { getText } from '~/utils/textUtils';
import { IValidationResult } from '~/validation/FormValidator';
import NavigationStore from './navigationStore';
import RoutePathCopySegmentStore from './routePathCopySegmentStore';
import ToolbarStore from './toolbarStore';
import ValidationStore, { ICustomValidatorMap } from './validationStore';

// Is the neighbor to add either startNode or endNode
enum NeighborToAddType {
    AfterNode,
    BeforeNode,
}

interface UndoState {
    routePathLinks: IRoutePathLink[];
    isStartNodeUsingBookSchedule: boolean;
    startNodeBookScheduleColumnNumber?: number;
}

enum ListFilter {
    stop,
    otherNodes,
    link,
}

class RoutePathStore {
    @observable private _routePath: IRoutePath | null;
    @observable private _oldRoutePath: IRoutePath | null;
    @observable private _isNewRoutePath: boolean;
    @observable private _existingRoutePaths: IRoutePath[];
    @observable private _neighborRoutePathLinks: INeighborLink[];
    @observable private _neighborToAddType: NeighborToAddType;
    @observable private _listFilters: ListFilter[];
    @observable private _invalidLinkOrderNumbers: number[];
    @observable private _extendedListItemId: string | null;
    @observable private _highlightedListItemId: string | null;
    @observable private _toolHighlightedNodeIds: string[]; // node's highlighted (to indicate that they can be clicked)
    @observable private _isEditingDisabled: boolean;
    @observable private _selectedTabIndex: number;
    private _geometryUndoStore: GeometryUndoStore<UndoState>;
    private _validationStore: ValidationStore<IRoutePath, IRoutePathValidationModel>;
    private _routePathLinkValidationStoreMap: Map<
        string,
        ValidationStore<IRoutePathLink, IRoutePathLinkValidationModel>
    >;

    // Constructor
    @action
    public initialize = () => {
        this._neighborRoutePathLinks = [];
        this._listFilters = [ListFilter.link];
        this._invalidLinkOrderNumbers = [];
        this._extendedListItemId = null;
        this._highlightedListItemId = null;
        this._toolHighlightedNodeIds = [];
        this._isEditingDisabled = true;
        this._selectedTabIndex = 0;
        this._geometryUndoStore = new GeometryUndoStore();
        this._validationStore = new ValidationStore();
        this._routePathLinkValidationStoreMap = new Map();

        reaction(
            () => this.isDirty && !this._isEditingDisabled,
            (value: boolean) => NavigationStore.setShouldShowUnsavedChangesPrompt(value)
        );
        reaction(() => this._isEditingDisabled, this.onChangeIsEditingDisabled);
    };

    @computed
    get routePath(): IRoutePath | null {
        return this._routePath;
    }

    @computed
    get oldRoutePath(): IRoutePath | null {
        return this._oldRoutePath;
    }

    get isNewRoutePath(): boolean {
        return this._isNewRoutePath;
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
    get selectedTabIndex() {
        return this._selectedTabIndex;
    }

    @computed
    get listFilters() {
        return this._listFilters;
    }

    @computed
    get invalidLinkOrderNumbers() {
        return this._invalidLinkOrderNumbers;
    }

    @computed
    get extendedListItemId() {
        return this._extendedListItemId;
    }

    @computed
    get highlightedListItemId() {
        return this._highlightedListItemId;
    }

    @computed
    get toolHighlightedNodeIds() {
        return this._toolHighlightedNodeIds;
    }

    @computed
    get invalidPropertiesMap() {
        return this._validationStore.getInvalidPropertiesMap();
    }

    @computed
    get isFormValid() {
        let areRoutePathLinksValid = true;
        this._routePathLinkValidationStoreMap.forEach((rpLinkValidationStore) => {
            if (!rpLinkValidationStore.isValid()) {
                areRoutePathLinksValid = false;
            }
        });
        return this._validationStore.isValid() && areRoutePathLinksValid;
    }

    @computed
    get isEditingDisabled() {
        return this._isEditingDisabled;
    }

    @action
    public activate = ({
        routePath,
        isNewRoutePath,
    }: {
        routePath: IRoutePath;
        isNewRoutePath: boolean;
    }) => {
        this.clear();
        this._routePath = routePath;
        this._isNewRoutePath = isNewRoutePath;
        const routePathLinks = routePath.routePathLinks ? routePath.routePathLinks : [];
        this.setRoutePathLinks(routePathLinks);
        const currentUndoState: UndoState = {
            routePathLinks,
            isStartNodeUsingBookSchedule: Boolean(this.routePath!.isStartNodeUsingBookSchedule),
            startNodeBookScheduleColumnNumber: this.routePath!.startNodeBookScheduleColumnNumber,
        };
        this._geometryUndoStore.addItem(currentUndoState);

        this.setOldRoutePath(this._routePath);

        const validateRoutePathPrimaryKey = (routePath: IRoutePath) => {
            if (!this.isNewRoutePath) return;
            if (routePath.startDate.getTime() > routePath.endDate.getTime()) {
                const validationResult: IValidationResult = {
                    isValid: false,
                    errorMessage:
                        'Reitinsuunnan loppupäivämäärän täytyy olla alkupäivämäärän jälkeen.',
                };
                return validationResult;
            }

            const isPrimaryKeyDuplicated = this._existingRoutePaths.some(
                (rp) =>
                    routePath.routeId === rp.routeId &&
                    routePath.direction === rp.direction &&
                    routePath.startDate.getTime() === rp.startDate.getTime()
            );

            if (isPrimaryKeyDuplicated) {
                const validationResult: IValidationResult = {
                    isValid: false,
                    errorMessage:
                        'Reitinsuunta samalla reitillä, suunnalla ja alkupäivämäärällä on jo olemassa.',
                };
                return validationResult;
            }

            let validationResult: IValidationResult | null = null;
            this._existingRoutePaths.forEach((existingRp) => {
                if (routePath.direction !== existingRp.direction) return;
                if (
                    _areDateRangesOverlapping({
                        startDate1: routePath.startDate,
                        endDate1: routePath.endDate,
                        startDate2: existingRp.startDate,
                        endDate2: existingRp.endDate,
                    })
                ) {
                    validationResult = {
                        isValid: false,
                        errorMessage: `Reitinsuunta menee päällekkäin olemassa olevan reitinsuunnan kanssa: ${
                            existingRp.direction
                        } | ${toDateString(existingRp.startDate)} | ${toDateString(
                            existingRp.endDate
                        )}.`,
                    };
                }
            });
            if (validationResult) return validationResult;

            return {
                isValid: true,
            };
        };

        const customValidatorMap: ICustomValidatorMap = {
            // New property to routePath for validating routePathPrimaryKey to validate primary key only once and get that validation result into a single place
            routePathPrimaryKey: {
                validators: [validateRoutePathPrimaryKey],
            },
            direction: {
                validators: [],
                dependentProperties: ['routePathPrimaryKey'],
            },
            startDate: {
                validators: [],
                dependentProperties: ['routePathPrimaryKey'],
            },
            endDate: {
                validators: [],
                dependentProperties: ['routePathPrimaryKey'],
            },
        };
        this._validationStore.activate(
            this._routePath,
            routePathValidationModel,
            customValidatorMap
        );
    };

    @action
    public setRoutePathLinks = (routePathLinks: IRoutePathLink[]) => {
        this._routePath!.routePathLinks = routePathLinks;

        // Need to recalculate orderNumbers to ensure that they are correct
        this.recalculateOrderNumbers();
        this.sortRoutePathLinks();

        // Need to reinitialize routePathLinkValidationStore
        this._routePathLinkValidationStoreMap.clear();
        this._routePath!.routePathLinks.forEach((rpLink) =>
            this.initRoutePathLinkValidationStore(rpLink)
        );
    };

    @action
    public setIsNewRoutePath = (isNewRoutePath: boolean) => {
        this._isNewRoutePath = isNewRoutePath;
    };

    @action
    public setExistingRoutePaths = (existingRoutePaths: IRoutePath[]) => {
        this._existingRoutePaths = existingRoutePaths;
    };

    @action
    public setSelectedTabIndex = (index: number) => {
        this._selectedTabIndex = index;
    };

    @action
    public removeListFilter = (listFilter: ListFilter) => {
        if (this._listFilters.includes(listFilter)) {
            this._listFilters = this._listFilters.filter((lF) => lF !== listFilter);
        }
    };

    @action
    public toggleListFilter = (listFilter: ListFilter) => {
        if (this._listFilters.includes(listFilter)) {
            this._listFilters = this._listFilters.filter((lF) => lF !== listFilter);
        } else {
            // Need to do concat (instead of push) to trigger observable reaction
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
            const newRoutePathLinks = undoRoutePathLinks.map((undoRpLink) => {
                const oldRpLink = oldRoutePathLinks.find((rpLink) => {
                    return rpLink.id === undoRpLink.id;
                });
                if (oldRpLink) {
                    return _.cloneDeep(oldRpLink);
                }
                return undoRpLink;
            });

            this.restoreBookScheduleProperties(nextUndoState);
            this.setRoutePathLinks(newRoutePathLinks);
        });
    };

    @action
    public redo = () => {
        this._geometryUndoStore.redo((previousUndoState: UndoState) => {
            this._neighborRoutePathLinks = [];

            const redoRoutePathLinks = previousUndoState.routePathLinks;
            const oldRoutePathLinks = this._routePath!.routePathLinks;
            // Prevent redo if oldLink is found
            const newRoutePathLinks = redoRoutePathLinks.map((redoRpLink) => {
                const oldRpLink = oldRoutePathLinks.find((rpLink) => {
                    return rpLink.id === redoRpLink.id;
                });
                if (oldRpLink) {
                    return _.cloneDeep(oldRpLink);
                }
                return redoRpLink;
            });

            this.restoreBookScheduleProperties(previousUndoState);
            this.setRoutePathLinks(newRoutePathLinks);
        });
    };

    @action
    public setExtendedListItemId = (id: string | null) => {
        this._extendedListItemId = id;
    };

    @action
    public setHighlightedListItemId = (id: string | null) => {
        this._highlightedListItemId = id;
    };

    @action
    public setToolHighlightedNodeIds = (nodeIds: string[]) => {
        return (this._toolHighlightedNodeIds = nodeIds);
    };

    @action
    public setRoutePath = (routePath: IRoutePath) => {
        this._routePath = routePath;

        const routePathLinks = routePath.routePathLinks ? routePath.routePathLinks : [];
        this.setRoutePathLinks(routePathLinks);
        const currentUndoState: UndoState = {
            routePathLinks,
            isStartNodeUsingBookSchedule: Boolean(this.routePath!.isStartNodeUsingBookSchedule),
            startNodeBookScheduleColumnNumber: this.routePath!.startNodeBookScheduleColumnNumber,
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
        property: keyof IRoutePath | keyof IRoutePathLink,
        value?: string | number | Date | boolean | null
    ) => {
        this._routePath![property] = value;
        this._validationStore.updateProperty(property, value);
    };

    @action
    public updateRoutePathLinkProperty = (
        orderNumber: number,
        property: keyof IRoutePathLink,
        value: string | number | boolean
    ) => {
        const rpLinkToUpdate: IRoutePathLink | undefined = this._routePath!.routePathLinks.find(
            (rpLink) => rpLink.orderNumber === orderNumber
        );
        // As any to fix typing error: Type 'string' is not assignable to type 'never'
        (rpLinkToUpdate as any)[property] = value;
        this._routePathLinkValidationStoreMap
            .get(rpLinkToUpdate!.id)
            ?.updateProperty(property, value);
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
        routePathLink.viaNameId = routePathLink.id;
        const rpLinks = this._routePath!.routePathLinks;

        // Need to do splice to trigger ReactionDisposer watcher
        rpLinks.splice(
            // Order numbers start from 1
            routePathLink.orderNumber - 1,
            0,
            routePathLink
        );

        // Copy bookSchedule properties from routePath to last routePathLink
        if (this.isLastRoutePathLink(routePathLink) && rpLinks.length > 1) {
            const routePathLinkToCopyFor = rpLinks[rpLinks.length - 1];
            this.copyPropertyToRoutePathLinkFromRoutePath(
                routePathLinkToCopyFor,
                'isStartNodeUsingBookSchedule'
            );
            this.copyPropertyToRoutePathLinkFromRoutePath(
                routePathLinkToCopyFor,
                'startNodeBookScheduleColumnNumber'
            );
        }

        this.recalculateOrderNumbers();
        this.addCurrentStateToUndoStore();

        this.initRoutePathLinkValidationStore(routePathLink);
    };

    @action
    public removeLink = (id: string) => {
        const rpLinks = this._routePath!.routePathLinks;

        const linkToRemoveIndex = rpLinks.findIndex((link) => link.id === id);
        const routePathLinkToCopyFor = rpLinks[rpLinks.length - 1];

        // Need to do splice to trigger ReactionDisposer watcher
        rpLinks.splice(linkToRemoveIndex, 1);

        // Copy bookSchedule properties from last routePathLink to routePath
        if (linkToRemoveIndex === this._routePath!.routePathLinks.length) {
            this.copyPropertyToRoutePathFromRoutePathLink(
                routePathLinkToCopyFor,
                'isStartNodeUsingBookSchedule'
            );
            this.copyPropertyToRoutePathFromRoutePathLink(
                routePathLinkToCopyFor,
                'startNodeBookScheduleColumnNumber'
            );
        }

        this.recalculateOrderNumbers();
        this.addCurrentStateToUndoStore();

        this._routePathLinkValidationStoreMap.delete(id);
    };

    @action
    public addCurrentStateToUndoStore() {
        this._neighborRoutePathLinks = [];

        const routePathLinks =
            this._routePath && this._routePath.routePathLinks ? this._routePath.routePathLinks : [];
        const currentUndoState: UndoState = {
            routePathLinks: _.cloneDeep(routePathLinks),
            isStartNodeUsingBookSchedule: Boolean(this._routePath!.isStartNodeUsingBookSchedule),
            startNodeBookScheduleColumnNumber: this._routePath!.startNodeBookScheduleColumnNumber,
        };
        this._geometryUndoStore.addItem(currentUndoState);
    }

    @action
    public sortRoutePathLinks = () => {
        this._routePath!.routePathLinks = this._routePath!.routePathLinks.slice().sort(
            (a, b) => a.orderNumber - b.orderNumber
        );
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
    public clear = () => {
        this._routePath = null;
        this._oldRoutePath = null;
        this._neighborRoutePathLinks = [];
        this._invalidLinkOrderNumbers = [];
        this._listFilters = [ListFilter.link];
        this._geometryUndoStore.clear();
        this._validationStore.clear();
        this._routePathLinkValidationStoreMap = new Map();
    };

    @action
    public resetChanges = () => {
        if (this._oldRoutePath) {
            this.activate({ routePath: this._oldRoutePath, isNewRoutePath: this._isNewRoutePath });
        }
        RoutePathCopySegmentStore.clear();
    };

    @action
    private restoreBookScheduleProperties(undoState: UndoState) {
        this.updateRoutePathProperty(
            'isStartNodeUsingBookSchedule',
            undoState.isStartNodeUsingBookSchedule
        );
        this.updateRoutePathProperty(
            'startNodeBookScheduleColumnNumber',
            undoState.startNodeBookScheduleColumnNumber
        );
    }

    public getSavePreventedText = (): string => {
        const routePathLinks = this.routePath!.routePathLinks;
        if (this.isEditingDisabled) {
            return getText('routePath_savePrevented_isEditingDisabled');
        }
        if (routePathLinks.length === 0) {
            return getText('routePath_savePrevented_routePathLinksMissing');
        }
        if (!RoutePathValidator.validateRoutePathLinkCoherency(routePathLinks)) {
            return getText('routePath_savePrevented_geometryInvalid');
        }
        const stopIdAppearingTwice = RoutePathValidator.getStopIdThatAppearsTwice(routePathLinks);
        if (stopIdAppearingTwice) {
            return getText('routePath_savePrevented_stopAppearingTwice', {
                stopId: stopIdAppearingTwice,
            });
        }
        if (RoutePathValidator.isRoutePathStartNodeTheSameAsEndNode(routePathLinks)) {
            return getText('routePath_savePrevented_startNodeTheSameAsEndNode');
        }
        if (!this.isFormValid) {
            return getText('routePath_savePrevented_checkRoutePathInfoTab');
        }
        if (!this.isDirty) {
            return getText('savePrevented_isNotDirty');
        }
        return '';
    };

    public getRoutePathLinkInvalidPropertiesMap = (id: string) => {
        return this._routePathLinkValidationStoreMap.get(id)!.getInvalidPropertiesMap();
    };

    public isLastRoutePathLink = (routePathLink: IRoutePathLink): boolean => {
        const routePathLinks = this._routePath!.routePathLinks;
        const index = routePathLinks.findIndex((rpLink) => {
            return rpLink.id === routePathLink.id;
        });
        return index === routePathLinks.length - 1;
    };

    public getLinkGeom = (linkId: string): L.LatLng[] => {
        const link = this._routePath!.routePathLinks.find((l) => l.id === linkId);
        if (link) {
            return link.geometry;
        }
        return [];
    };

    public getNodeGeom = (nodeId: string): L.LatLng[] => {
        let node = this._routePath!.routePathLinks.find((l) => l.startNode.id === nodeId);
        if (!node) {
            node = this._routePath!.routePathLinks.find((l) => l.endNode.id === nodeId);
        }
        if (node) {
            return node.geometry;
        }
        return [];
    };

    public hasNodeOddAmountOfNeighbors = (nodeId: string): boolean => {
        const routePath = this.routePath;
        return (
            routePath!.routePathLinks.filter((x) => x.startNode.id === nodeId).length !==
            routePath!.routePathLinks.filter((x) => x.endNode.id === nodeId).length
        );
    };

    private initRoutePathLinkValidationStore = (routePathLink: IRoutePathLink) => {
        this._routePathLinkValidationStoreMap.set(routePathLink.id, new ValidationStore());
        this._routePathLinkValidationStoreMap
            .get(routePathLink.id)!
            .activate(routePathLink, routePathLinkValidationModel);
    };

    private recalculateOrderNumbers = () => {
        this._routePath!.routePathLinks.forEach((rpLink, index) => {
            // Order numbers start from 1
            rpLink.orderNumber = index + 1;
        });
    };

    // Expects that both routePath and routePathLink have property to copy with the same name
    private copyPropertyToRoutePathFromRoutePathLink = (
        routePathLink: IRoutePathLink,
        property: keyof IRoutePathLink | keyof IRoutePath
    ) => {
        const valueToCopy = routePathLink[property];
        this.updateRoutePathProperty(property, valueToCopy);
    };

    // Expects that both routePath and routePathLink have property to copy with the same name
    private copyPropertyToRoutePathLinkFromRoutePath = (
        routePathLink: IRoutePathLink,
        property: keyof IRoutePathLink
    ) => {
        const valueToCopy = this.routePath![property];
        this.updateRoutePathLinkProperty(routePathLink.orderNumber, property, valueToCopy);
        this.updateRoutePathProperty(property, null);
    };

    private onChangeIsEditingDisabled = () => {
        this.setNeighborRoutePathLinks([]);
        if (this._isEditingDisabled) {
            this.resetChanges();
            const selectedTool = ToolbarStore.selectedTool;
            if (
                selectedTool &&
                (selectedTool.toolType === ToolbarToolType.AddNewRoutePathLink ||
                    selectedTool.toolType === ToolbarToolType.RemoveRoutePathLink ||
                    selectedTool.toolType === ToolbarToolType.CopyRoutePathSegmentTool)
            ) {
                ToolbarStore.selectDefaultTool();
            }
        } else {
            this._validationStore.validateAllProperties();
        }
    };
}

const _areDateRangesOverlapping = ({
    startDate1,
    endDate1,
    startDate2,
    endDate2,
}: {
    startDate1: Date;
    endDate1: Date;
    startDate2: Date;
    endDate2: Date;
}) => {
    // Date1 range is before date2 range
    if (startDate1.getTime() < startDate2.getTime()) {
        if (endDate1.getTime() < startDate2.getTime()) {
            return false;
        }
        return true;
    }
    // Date1 range is after date2 range
    if (startDate1.getTime() > startDate2.getTime()) {
        if (endDate2.getTime() < startDate1.getTime()) {
            return false;
        }
        return true;
    }
    return true;
};

export default new RoutePathStore();

export { RoutePathStore, NeighborToAddType, UndoState, ListFilter };
