import _ from 'lodash';
import { action, computed, observable, reaction } from 'mobx';
import Moment from 'moment';
import { IRoutePath } from '~/models';
import { IMassEditRoutePath } from '~/models/IRoutePath';
import RouteListStore from '~/stores/routeListStore';
import RoutePathLayerStore from '~/stores/routePathLayerStore';
import { getMaxDate, toDateString } from '~/utils/dateUtils';
import { IRoutePathToCopy } from './copyRoutePathStore';
import NavigationStore from './navigationStore';

class RoutePathMassEditStore {
    @observable private _massEditRoutePaths: IMassEditRoutePath[] | null;
    @observable private _newRoutePathIdCounter: number;
    @observable private _selectedRoutePath: IRoutePath | null;
    @observable private _selectedRoutePathIdPairs: string[][]; // RoutePath pairs that user has manually selected (shift+click)

    // Constructor
    @action
    public initialize = () => {
        this._massEditRoutePaths = null;
        this._newRoutePathIdCounter = 1;
        this._selectedRoutePathIdPairs = [];

        reaction(
            () => this.shouldShowUnsavedChangesPrompt,
            (value: boolean) => NavigationStore.setShouldShowUnsavedChangesPrompt(value)
        );
        reaction(
            () => this.shouldShowUnsavedChangesPrompt,
            (value: boolean) => this.setNavigationAction(value)
        );
    };

    @computed
    get massEditRoutePaths(): IMassEditRoutePath[] | null {
        return this._massEditRoutePaths;
    }

    @computed
    get selectedRoutePath(): IRoutePath | null {
        return this._selectedRoutePath;
    }

    @computed
    get selectedRoutePathIdPairs(): string[][] {
        return this._selectedRoutePathIdPairs;
    }

    @computed
    get shouldShowUnsavedChangesPrompt(): boolean {
        return this.isDirty && RouteListStore.routeIdToEdit != null;
    }

    @computed
    get isDirty() {
        return Boolean(
            this._massEditRoutePaths?.find(
                (massEditRp) =>
                    !massEditRp.oldRoutePath ||
                    massEditRp.routePath.startDate.getTime() !==
                        massEditRp.oldRoutePath.startDate.getTime() ||
                    massEditRp.routePath.endDate.getTime() !==
                        massEditRp.oldRoutePath.endDate.getTime()
            )
        );
    }

    @computed
    get isFormValid() {
        let isValid = true;
        this._massEditRoutePaths?.forEach((massEditRp) => {
            if (!massEditRp.validationResult.isValid) {
                isValid = false;
            }
        });
        return isValid;
    }

    @computed
    get routePaths(): IRoutePath[] {
        if (!this._massEditRoutePaths) return [];

        return this._massEditRoutePaths!.map((massEditRp) => massEditRp.routePath);
    }

    @action
    public setSelectedRoutePath = (selectedRoutePath: IRoutePath | null) => {
        this._selectedRoutePath = selectedRoutePath;
    };

    @action
    public activate = ({ routePaths }: { routePaths: IRoutePath[] }) => {
        const massEditRoutePaths: IMassEditRoutePath[] = [];
        _.cloneDeep(routePaths).forEach((rp: IRoutePath) => {
            massEditRoutePaths.push({
                id: rp.internalId,
                routePath: rp,
                oldRoutePath: _.cloneDeep(rp),
                validationResult: { isValid: true },
                isNew: false,
            });
        });
        this._massEditRoutePaths = massEditRoutePaths.slice().sort(_sortMassEditRoutePaths);
        this.validateMassEditRoutePaths();
    };

    @action
    public updateRoutePathStartDate = (id: string, newStartDate: Date) => {
        const routePathToUpdate = this._massEditRoutePaths?.find((m) => m.id === id)!.routePath;
        routePathToUpdate.startDate = newStartDate;
        // Update routePath's endDate as the same as startDate if endDate is not set
        if (routePathToUpdate.endDate.getTime() > getMaxDate().getTime()) {
            routePathToUpdate.endDate = _.cloneDeep(newStartDate);
        }
        this._massEditRoutePaths = this._massEditRoutePaths!.slice().sort(_sortMassEditRoutePaths);
        this.validateMassEditRoutePaths();
    };

    @action
    public updateRoutePathEndDate = (id: string, newEndDate: Date) => {
        this._massEditRoutePaths?.find((m) => m.id === id)!.routePath.endDate = newEndDate;
        this._massEditRoutePaths = this._massEditRoutePaths!.slice().sort(_sortMassEditRoutePaths);
        this.validateMassEditRoutePaths();
    };

    @action
    public removeRoutePath = (id: string) => {
        const massEditRpRemoveIndex = this._massEditRoutePaths?.findIndex((rp) => rp.id === id)!;
        this._massEditRoutePaths!.splice(massEditRpRemoveIndex, 1);
        const selectedRpPairRemoveIndex = this._selectedRoutePathIdPairs.findIndex(
            (idPair: string[]) => {
                return Boolean(idPair.find((_id: string) => _id === id));
            }
        );
        if (selectedRpPairRemoveIndex >= 0) {
            this._selectedRoutePathIdPairs.splice(selectedRpPairRemoveIndex, 1);
        }
        if (this._selectedRoutePath?.internalId === id) {
            this._selectedRoutePath = null;
        }
        this.validateMassEditRoutePaths();
        RoutePathLayerStore.removeRoutePath(id);
    };

    @action
    public addCopiedRoutePaths = (routePathsToCopy: IRoutePathToCopy[]) => {
        let idCounter = this._newRoutePathIdCounter;
        const routePathsWithNewId: IRoutePath[] = [];
        const newMassEditRoutePaths: IMassEditRoutePath[] = [];
        routePathsToCopy.forEach((rpToCopy) => {
            const newRoutePathId = `new-${idCounter}`;

            const routePathWithNewId: IRoutePath = _.cloneDeep(rpToCopy.routePath);
            routePathWithNewId.internalId = newRoutePathId;
            routePathWithNewId.isVisible = false;
            routePathWithNewId.color = undefined;
            routePathsWithNewId.push(routePathWithNewId);

            const newRoutePath = _.cloneDeep(rpToCopy.routePath);
            const oldRoutePath = _.cloneDeep(rpToCopy.routePath);
            newRoutePath.direction = rpToCopy.direction;
            newRoutePath.internalId = newRoutePathId;

            const maxDatePlusOne = getMaxDate();
            maxDatePlusOne.setDate(maxDatePlusOne.getDate() + 1);
            newRoutePath.startDate = _.cloneDeep(maxDatePlusOne);
            newRoutePath.endDate = _.cloneDeep(maxDatePlusOne);
            newMassEditRoutePaths.push({
                oldRoutePath,
                id: newRoutePathId,
                routePath: newRoutePath,
                validationResult: {
                    isValid: true,
                },
                isNew: true,
            });
            idCounter += 1;
        });
        RoutePathLayerStore.addRoutePaths({ routePaths: routePathsWithNewId });

        this._massEditRoutePaths = this._massEditRoutePaths!.concat(newMassEditRoutePaths);
        this._newRoutePathIdCounter = idCounter;
        this.validateMassEditRoutePaths();
    };

    // Expects that routePaths are sorted
    @action
    public validateMassEditRoutePaths = () => {
        this._massEditRoutePaths!.map((currMassEditRp: IMassEditRoutePath, index: number) => {
            if (currMassEditRp.routePath.startDate.getTime() > getMaxDate().getTime()) {
                currMassEditRp.validationResult = {
                    isValid: false,
                    errorMessage: 'Aseta alkupäivämäärä',
                };
                return currMassEditRp;
            }
            if (currMassEditRp.routePath.endDate.getTime() > getMaxDate().getTime()) {
                currMassEditRp.validationResult = {
                    isValid: false,
                    errorMessage: 'Aseta loppupäivämäärä',
                };
                return currMassEditRp;
            }

            const nextMassEditRp = _findNextMassEditRoutePath(
                this._massEditRoutePaths!,
                currMassEditRp,
                index
            );
            if (
                nextMassEditRp &&
                nextMassEditRp.routePath.startDate.getTime() <=
                    currMassEditRp.routePath.endDate.getTime()
            ) {
                currMassEditRp.validationResult = {
                    isValid: false,
                    errorMessage: `Päivämäärät menevät päällekkäin edellisen reitinsuunnan (${_getRoutePathDescription(
                        nextMassEditRp.routePath
                    )}) kanssa`,
                };
                return currMassEditRp;
            }

            const prevRoutePathWithGap = _getPreviousRoutePathWithGap(
                currMassEditRp,
                this._massEditRoutePaths!,
                index,
                currMassEditRp.routePath.direction
            );
            if (
                currMassEditRp.routePath.startDate.getTime() >
                currMassEditRp.routePath.endDate.getTime()
            ) {
                currMassEditRp.validationResult = {
                    isValid: false,
                    errorMessage: 'Alkupäivämäärä on loppupäivämäärän jälkeen.',
                };
            } else if (prevRoutePathWithGap) {
                currMassEditRp.validationResult = {
                    isValid: true,
                    errorMessage: `Tämän ja edellisen reitinsuunnan (${_getRoutePathDescription(
                        prevRoutePathWithGap
                    )}) päivämäärät eivät ole jatkuvia.`,
                };
            } else {
                currMassEditRp.validationResult = {
                    isValid: true,
                    errorMessage: '',
                };
            }
            return currMassEditRp;
        });
    };

    @action
    public addSelectedRoutePathPair = (routePathPair: IRoutePath[]) => {
        // Remove routePath pair from this._selectedRoutePathIdPairs, if found
        const routePathId1 = routePathPair[0].internalId;
        const routePathId2 = routePathPair[1].internalId;
        const removeIndex1 = this._selectedRoutePathIdPairs.findIndex((idPair: string[]) => {
            return Boolean(idPair.find((id: string) => id === routePathId1));
        });
        if (removeIndex1 >= 0) {
            this._selectedRoutePathIdPairs.splice(removeIndex1, 1);
        }
        const removeIndex2 = this._selectedRoutePathIdPairs.findIndex((idPair: string[]) => {
            return Boolean(idPair.find((id: string) => id === routePathId2));
        });
        if (removeIndex2 >= 0) {
            this._selectedRoutePathIdPairs.splice(removeIndex2, 1);
        }

        // Set new routePath pair's startDate and endDate as max dates
        const massEditRp1 = this._massEditRoutePaths!.find(
            (massEditRp) => massEditRp.id === routePathId1
        );
        const massEditRp2 = this._massEditRoutePaths!.find(
            (massEditRp) => massEditRp.id === routePathId2
        );
        const maxDatePlusOne = getMaxDate();
        maxDatePlusOne.setDate(maxDatePlusOne.getDate() + 1);
        massEditRp1!.routePath.startDate = _.cloneDeep(maxDatePlusOne);
        massEditRp1!.routePath.endDate = _.cloneDeep(maxDatePlusOne);
        massEditRp2!.routePath.startDate = _.cloneDeep(maxDatePlusOne);
        massEditRp2!.routePath.endDate = _.cloneDeep(maxDatePlusOne);

        // Add a new selectedRoutePathPair
        this._selectedRoutePathIdPairs = this._selectedRoutePathIdPairs.concat([
            [routePathId1, routePathId2],
        ]);

        // Have to re validate massEditRoutePaths since startDate and endDates were changed to maxDatePlusOne
        this.validateMassEditRoutePaths();
    };

    @action
    public clear = () => {
        this.setNavigationAction(false);

        // To clear unsaved routePaths, need to remove them from RoutePathLayerStore
        const routePathsToRemove = this._massEditRoutePaths!.filter((mEditRp) => mEditRp.isNew).map(
            (mEditRp) => mEditRp.routePath
        );
        routePathsToRemove.forEach((rp) => RoutePathLayerStore.removeRoutePath(rp.internalId));

        this._massEditRoutePaths = null;

        RouteListStore.setRouteIdToEdit(null);
    };

    private setNavigationAction = (value: boolean) => {
        const action = value ? this.clear : null;
        NavigationStore.setNavigationAction(action);
    };
}

const _getRoutePathDescription = (routePath: IRoutePath) => {
    return `${routePath.originFi} - ${routePath.destinationFi}, ${toDateString(
        routePath.startDate
    )} - ${toDateString(routePath.endDate)}`;
};

// Group above the current group
const _findNextMassEditRoutePath = (
    massEditRoutePaths: IMassEditRoutePath[],
    currentMassEditRp: IMassEditRoutePath,
    index: number
): IMassEditRoutePath | null => {
    if (index > 0) {
        for (let i = index - 1; i >= 0; i -= 1) {
            if (
                massEditRoutePaths[i].routePath.direction === currentMassEditRp.routePath.direction
            ) {
                return massEditRoutePaths[i];
            }
        }
    }
    return null;
};

const _getPreviousRoutePathWithGap = (
    currentMassEditRp: IMassEditRoutePath,
    massEditRps: IMassEditRoutePath[],
    index: number,
    direction: string
): IRoutePath | null => {
    let prevMassEditRoutePath;
    if (index < massEditRps.length - 1) {
        // Find massEditRoutePath below index
        for (let i = index + 1; i < massEditRps.length; i += 1) {
            if (massEditRps[i].routePath.direction === direction) {
                prevMassEditRoutePath = massEditRps[i];
                break;
            }
        }
    }
    if (!prevMassEditRoutePath) return null;
    const a = Moment(currentMassEditRp.routePath.startDate);
    const b = Moment(prevMassEditRoutePath.routePath.endDate);
    const diffInDays = a.diff(b, 'days');
    return diffInDays > 1 ? prevMassEditRoutePath.routePath : null;
};

const _sortMassEditRoutePaths = (a: IMassEditRoutePath, b: IMassEditRoutePath) => {
    if (a.routePath.startDate < b.routePath.startDate) return 1;
    if (a.routePath.startDate > b.routePath.startDate) return -1;
    return 0;
};

export default new RoutePathMassEditStore();

export { RoutePathMassEditStore };
