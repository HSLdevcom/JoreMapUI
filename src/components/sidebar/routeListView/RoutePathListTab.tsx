import _ from 'lodash';
import { reaction, IReactionDisposer } from 'mobx';
import { inject, observer } from 'mobx-react';
import React from 'react';
import { Button } from '~/components/controls';
import SavePrompt, { ISaveModel } from '~/components/overlays/SavePrompt';
import SaveButton from '~/components/shared/SaveButton';
import constants from '~/constants/constants';
import ButtonType from '~/enums/buttonType';
import TransitType from '~/enums/transitType';
import { IRoutePath } from '~/models';
import navigator from '~/routing/navigator';
import QueryParams from '~/routing/queryParams';
import routeBuilder from '~/routing/routeBuilder';
import SubSites from '~/routing/subSites';
import RoutePathMassEditService from '~/services/routePathMassEditService';
import RoutePathService from '~/services/routePathService';
import { AlertStore } from '~/stores/alertStore';
import { ConfirmStore } from '~/stores/confirmStore';
import { CopyRoutePathStore } from '~/stores/copyRoutePathStore';
import { ErrorStore } from '~/stores/errorStore';
import { LoginStore } from '~/stores/loginStore';
import { MapStore } from '~/stores/mapStore';
import { RouteListStore } from '~/stores/routeListStore';
import { RoutePathLayerStore } from '~/stores/routePathLayerStore';
import { RoutePathMassEditStore } from '~/stores/routePathMassEditStore';
import { getMaxDate, isCurrentTimeWithinTimeSpan } from '~/utils/dateUtils';
import RoutePathGroup from './RoutePathGroup';
import * as s from './routePathListTab.scss';

interface IRoutePathStopNames {
    firstStopName: string;
    lastStopName: string;
}

interface IRoutePathListTabProps {
    originalRoutePaths: IRoutePath[];
    isEditing: boolean;
    lineId: string;
    routeId: string;
    transitType: TransitType;
    areAllRoutePathsVisible: boolean;
    toggleAllRoutePathsVisible: () => void;
    routeListStore?: RouteListStore;
    routePathLayerStore?: RoutePathLayerStore;
    mapStore?: MapStore;
    confirmStore?: ConfirmStore;
    loginStore?: LoginStore;
    alertStore?: AlertStore;
    errorStore?: ErrorStore;
    copyRoutePathStore?: CopyRoutePathStore;
    routePathMassEditStore?: RoutePathMassEditStore;
}

interface IRoutePathListTabState {
    stopNameMap: Map<string, IRoutePathStopNames>;
    areStopNamesLoading: boolean;
    allGroupedRoutePaths: IRoutePath[][];
    groupedRoutePathsToDisplay: IRoutePath[][];
}

const ENVIRONMENT = constants.ENVIRONMENT;

@inject(
    'routeListStore',
    'routePathLayerStore',
    'mapStore',
    'confirmStore',
    'loginStore',
    'alertStore',
    'errorStore',
    'copyRoutePathStore',
    'routePathMassEditStore'
)
@observer
class RoutePathListTab extends React.Component<IRoutePathListTabProps, IRoutePathListTabState> {
    private _isMounted: boolean;
    private selectedGroupsListener: IReactionDisposer | null = null;
    private routePathsListener: IReactionDisposer | null = null;
    constructor(props: IRoutePathListTabProps) {
        super(props);
        this.state = {
            stopNameMap: new Map(),
            areStopNamesLoading: true,
            allGroupedRoutePaths: [],
            groupedRoutePathsToDisplay: [],
        };
    }

    private _setState = (newState: object) => {
        if (this._isMounted) {
            this.setState(newState);
        }
    };

    componentDidMount() {
        this.selectedGroupsListener = reaction(
            () =>
                this.props.isEditing && this.props.routePathMassEditStore!.selectedRoutePathIdPairs,
            () => this.updateGroupedRoutePathsToDisplay()
        );
        this.routePathsListener = reaction(
            () =>
                this.props.isEditing &&
                this.props.routePathMassEditStore!.massEditRoutePaths !== null &&
                this.props.routePathMassEditStore!.routePaths,
            () => this.updateGroupedRoutePathsToDisplay()
        );
    }

    componentWillMount() {
        this._isMounted = true;
        this.updateGroupedRoutePathsToDisplay();
    }

    componentDidUpdate(prevProps: IRoutePathListTabProps) {
        if (prevProps.areAllRoutePathsVisible !== this.props.areAllRoutePathsVisible) {
            this.updateGroupedRoutePathsToDisplay();
        }
    }

    componentWillUnmount() {
        this._isMounted = false;
        if (this.selectedGroupsListener) {
            this.selectedGroupsListener();
        }
        if (this.routePathsListener) {
            this.routePathsListener();
        }
    }

    private getRoutePaths = (): IRoutePath[] => {
        return this.props.isEditing
            ? _.cloneDeep(this.props.routePathMassEditStore!.routePaths)
            : this.props.originalRoutePaths;
    };

    private updateGroupedRoutePathsToDisplay = () => {
        const routePaths = this.getRoutePaths();
        if (routePaths.length === 0) return;

        const allGroupedRoutePaths: IRoutePath[][] = this.getGroupedRoutePaths(routePaths);
        let groupedRoutePathsToDisplay = allGroupedRoutePaths;
        if (!this.props.areAllRoutePathsVisible) {
            const currIndex = allGroupedRoutePaths.findIndex((groupedRp: IRoutePath[]) => {
                return isCurrentTimeWithinTimeSpan(groupedRp[0].startDate, groupedRp[0].endDate);
            });
            groupedRoutePathsToDisplay = allGroupedRoutePaths.slice(0, currIndex + 1);
        }
        this.fetchStopNames(groupedRoutePathsToDisplay);
        this._setState({
            allGroupedRoutePaths,
            groupedRoutePathsToDisplay,
        });
        this.setRoutePathsVisible(groupedRoutePathsToDisplay);
    };

    /**
     * Creates routePath groups (1-2 routePaths in a group) with the following order:
     * - routePaths paired according to routePathMassEditStore.selectedRoutePathIdPairs
     * - remaining routePaths with date > getMaxDate in single groups
     * - remaining routePaths will be grouped by date
     */
    private getGroupedRoutePaths = (routePaths: IRoutePath[]): IRoutePath[][] => {
        let routePathsToGroup = _.cloneDeep(routePaths);
        const selectedRoutePathIdPairs = this.props.routePathMassEditStore!
            .selectedRoutePathIdPairs;
        const res = {};

        // Take out selectedRoutePaths from routePathsToGroup that have no start date
        const selectedRoutePathGroups: IRoutePath[][] = [];
        const selectedRoutePathsWithStartDate: IRoutePath[] = [];
        const visitedRoutePaths = {};
        routePathsToGroup = routePathsToGroup.filter((rp: IRoutePath) => {
            const idPair = selectedRoutePathIdPairs.find((idPair: string[]) => {
                return idPair.includes(rp.internalId);
            })!;
            const isSelected = Boolean(idPair);
            if (isSelected && !visitedRoutePaths[idPair[0]]) {
                const rp1 = routePathsToGroup.find((rp) => rp.internalId === idPair[0])!;
                const rp2 = routePathsToGroup.find((rp) => rp.internalId === idPair[1])!;
                visitedRoutePaths[rp1!.internalId] = true;
                visitedRoutePaths[rp2!.internalId] = true;

                if (rp1.startDate.getTime() > getMaxDate().getTime()) {
                    const sortedRpGroup = [rp1, rp2].sort((a: IRoutePath, b: IRoutePath) =>
                        a.direction === '1' ? -1 : 1
                    );
                    selectedRoutePathGroups.push(sortedRpGroup);
                } else {
                    selectedRoutePathsWithStartDate.push(rp1);
                    selectedRoutePathsWithStartDate.push(rp2);
                }
            }
            return !isSelected;
        });

        // Take out new routePaths with unselected date from routePathsToGroup
        const newRoutePathGroups: IRoutePath[][] = [];
        routePathsToGroup = routePathsToGroup.filter((rp: IRoutePath) => {
            const isNewRoutePath = rp.startDate.getTime() > getMaxDate().getTime();
            if (isNewRoutePath) {
                newRoutePathGroups.push([rp]);
            }
            return !isNewRoutePath;
        });

        // Add selected routePaths with startDate back to routePaths to group (so that they will be sorted)
        routePathsToGroup = routePathsToGroup.concat(selectedRoutePathsWithStartDate);

        // Create routePath pairs from remaining (existing) routePaths, sort them by date
        routePathsToGroup.forEach((rp) => {
            const identifier = rp.startDate.toLocaleDateString() + rp.endDate.toLocaleDateString();
            (res[identifier] = res[identifier] || []).push(rp);
        });

        const list: IRoutePath[][] = Object.values(res);
        list.sort(
            (a: IRoutePath[], b: IRoutePath[]) =>
                b[0].startDate.getTime() - a[0].startDate.getTime()
        );
        list.forEach((routePaths: IRoutePath[]) => {
            routePaths.sort((a: IRoutePath, b: IRoutePath) => (a.direction === '1' ? -1 : 1));
        });

        // Add selected routePaths to the beginning of the list
        selectedRoutePathGroups.forEach((rpGroup) => list.unshift(rpGroup));

        // Add new routePaths them to the beginning of the list
        newRoutePathGroups.forEach((rpGroup) => list.unshift(rpGroup));

        return list;
    };

    private fetchStopNames = async (groupedRoutePathsToDisplay: IRoutePath[][]) => {
        const stopNameMap = this.state.stopNameMap;
        this._setState({
            areStopNamesLoading: true,
        });
        const promises: Promise<void>[] = [];
        for (const routePaths of groupedRoutePathsToDisplay) {
            for (let i = 0; i < routePaths.length; i += 1) {
                const routePath: IRoutePath = routePaths[i];
                const oldStopNames = stopNameMap.get(routePath.internalId);
                if (!oldStopNames) {
                    const createPromise = async () => {
                        let direction = routePath.direction;
                        let startDate = routePath.startDate;
                        if (this.props.isEditing) {
                            // Have to use old routePath's data for querying, current routePath's data might have changed
                            const oldRoutePath = this.props.routePathMassEditStore!.massEditRoutePaths?.find(
                                (rp) => rp.id === routePath.internalId
                            )!.oldRoutePath!;
                            direction = oldRoutePath.direction;
                            startDate = oldRoutePath.startDate;
                        }
                        const stopNames = await RoutePathService.fetchFirstAndLastStopNamesOfRoutePath(
                            {
                                direction,
                                startDate,
                                routeId: routePath.routeId,
                            }
                        );
                        stopNameMap.set(routePath.internalId, stopNames as IRoutePathStopNames);
                    };
                    promises.push(createPromise());
                }
            }
        }

        Promise.all(promises).then(() => {
            this._setState({
                stopNameMap,
                areStopNamesLoading: false,
            });
        });
    };

    private setRoutePathsVisible = (groupedRoutePathsToDisplay: IRoutePath[][]) => {
        let isAnyRoutePathVisible = false;
        groupedRoutePathsToDisplay.forEach((groupedRoutePaths: IRoutePath[]) => {
            groupedRoutePaths.forEach((routePath: IRoutePath) => {
                if (routePath.isVisible) {
                    isAnyRoutePathVisible = true;
                }
            });
        });
        if (!isAnyRoutePathVisible) {
            groupedRoutePathsToDisplay.forEach((groupedRoutePaths: IRoutePath[]) => {
                groupedRoutePaths.forEach((routePath: IRoutePath) => {
                    if (isCurrentTimeWithinTimeSpan(routePath.startDate, routePath.endDate)) {
                        this.props.routePathLayerStore!.setRoutePathVisibility({
                            id: routePath.internalId,
                            isVisible: true,
                        });
                    }
                });
            });
        }
    };

    private showSavePrompt = () => {
        const confirmStore = this.props.confirmStore;
        const saveModels: ISaveModel[] = [];
        this.props.routePathMassEditStore!.massEditRoutePaths!.forEach((massEditRp) => {
            const newRoutePath = _.cloneDeep(massEditRp.routePath);
            delete newRoutePath.internalId;
            const oldRoutePath = _.cloneDeep(massEditRp.oldRoutePath);
            if (oldRoutePath) {
                delete oldRoutePath['internalId'];
                if (massEditRp.isNew) {
                    delete oldRoutePath['startDate'];
                    delete oldRoutePath['endDate'];
                }
            }
            saveModels.push({
                type: 'saveModel',
                newData: newRoutePath,
                oldData: oldRoutePath ? oldRoutePath : {},
                subTopic: `${newRoutePath.originFi} - ${newRoutePath.destinationFi}`,
                model: 'routePath',
            });
        });
        confirmStore!.openConfirm({
            content: <SavePrompt models={saveModels} />,
            onConfirm: () => {
                this.save();
            },
        });
    };

    private save = async () => {
        this._setState({ isLoading: true });

        try {
            await RoutePathMassEditService.massEditRoutePaths(
                this.props.routePathMassEditStore!.massEditRoutePaths!
            );
            this.props.routePathMassEditStore!.clear();
            // TODO: clear & fetch routePaths
            this.props.alertStore!.setFadeMessage({ message: 'Tallennettu!' });
        } catch (e) {
            this.props.errorStore!.addError(`Tallennus epäonnistui`, e);
        }
        this.props.routeListStore!.setRouteIdToEdit(null);
    };

    private renderBottomBarButtons = () => {
        if (!this.props.loginStore!.hasWriteAccess) return null;

        return (
            <div className={s.buttonContainer}>
                <Button
                    onClick={this.redirectToNewRoutePathView()}
                    type={ButtonType.SQUARE}
                    disabled={Boolean(this.props.routeListStore!.routeIdToEdit)}
                    isWide={true}
                >
                    {`Luo reitinsuunta`}
                </Button>
                <Button
                    onClick={this.openCopyRoutePathView()}
                    type={ButtonType.SQUARE}
                    disabled={this.props.routeId !== this.props.routeListStore!.routeIdToEdit}
                    isWide={true}
                >
                    {`Kopioi reitinsuunta`}
                </Button>
            </div>
        );
    };

    private redirectToNewRoutePathView = () => () => {
        const { lineId, routeId } = this.props;
        const newRoutePathLink = routeBuilder
            .to(SubSites.newRoutePath)
            .set(QueryParams.routeId, routeId)
            .set(QueryParams.lineId, lineId)
            .toLink();

        navigator.goTo({ link: newRoutePathLink });
    };

    private openCopyRoutePathView = () => () => {
        const { lineId, routeId, transitType } = this.props;
        this.props.copyRoutePathStore!.activate({ lineId, routeId, transitType });
    };

    render() {
        const isEditing = this.props.isEditing;
        const routePaths = this.getRoutePaths();
        if (routePaths.length === 0) {
            return (
                <div className={s.routePathListTab}>
                    <div className={s.noRoutePathsMessage}>Reitillä ei ole reitinsuuntia.</div>
                    {this.renderBottomBarButtons()}
                </div>
            );
        }
        const groupedRoutePathsToDisplay = this.state.groupedRoutePathsToDisplay;
        const isSaveButtonDisabled =
            !this.props.routePathMassEditStore!.isDirty ||
            !this.props.routePathMassEditStore!.isFormValid;
        const isSaveAllowed = ENVIRONMENT !== 'prod' && ENVIRONMENT !== 'stage';
        const savePreventedNotification = isSaveAllowed
            ? ''
            : 'Reitinsuuntien massatallentaminen ei ole vielä valmis. Voit kokeilla tallentamista dev-ympäristössä. Jos haluat tallentaa reitinsuuntia tuotannossa, joudut käyttämään vanhaa JORE-ympäristöä.';
        return (
            <div className={s.routePathListTab}>
                {groupedRoutePathsToDisplay.map((routePaths: IRoutePath[], index) => {
                    const hasDirection1 = Boolean(routePaths.find((rp) => rp.direction === '1'));
                    const hasDirection2 = Boolean(routePaths.find((rp) => rp.direction === '2'));
                    // Group above the current group
                    const nextGroup: IRoutePath[] | null = _findNextGroup(
                        groupedRoutePathsToDisplay,
                        index,
                        hasDirection1,
                        hasDirection2
                    );
                    // Group below the current group
                    const prevGroup: IRoutePath[] | null = _findPrevGroup(
                        groupedRoutePathsToDisplay,
                        index,
                        hasDirection1,
                        hasDirection2
                    );
                    return (
                        <RoutePathGroup
                            key={`routePathGroup-${index}`}
                            routePaths={routePaths}
                            nextGroup={nextGroup}
                            prevGroup={prevGroup}
                            isEditing={isEditing}
                            stopNameMap={this.state.stopNameMap}
                            areStopNamesLoading={this.state.areStopNamesLoading}
                            index={index}
                        />
                    );
                })}
                {!this.props.areAllRoutePathsVisible && groupedRoutePathsToDisplay.length === 0 && (
                    <div className={s.noRoutePathsWithCurrentTimespanMessage}>
                        Reitillä ei ole voimassaolevia reitinsuuntia.
                    </div>
                )}
                {!this.props.isEditing &&
                    (this.props.areAllRoutePathsVisible ||
                        this.state.groupedRoutePathsToDisplay.length <
                            this.state.allGroupedRoutePaths.length) && (
                        <div
                            className={s.toggleAllRoutePathsVisibleButton}
                            onClick={this.props.toggleAllRoutePathsVisible}
                        >
                            {!this.props.areAllRoutePathsVisible && (
                                <div className={s.threeDots}>...</div>
                            )}
                            <div className={s.toggleAllRoutePathsVisibleText}>
                                {this.props.areAllRoutePathsVisible
                                    ? `Piilota vanhentuneet reitinsuunnat`
                                    : `Näytä kaikki reitinsuunnat (${routePaths.length})`}
                            </div>
                        </div>
                    )}
                {this.renderBottomBarButtons()}
                {this.props.loginStore!.hasWriteAccess && isEditing && (
                    <SaveButton
                        onClick={() => this.showSavePrompt()}
                        disabled={isSaveButtonDisabled}
                        savePreventedNotification={savePreventedNotification}
                        isWarningButton={!isSaveAllowed}
                    >
                        Tallenna muutokset
                    </SaveButton>
                )}
            </div>
        );
    }
}

// Group above the current group
const _findNextGroup = (
    groupedRoutePaths: IRoutePath[][],
    index: number,
    hasDirection1: boolean,
    hasDirection2: boolean
): IRoutePath[] | null => {
    if (index > 0) {
        for (let i = index - 1; i >= 0; i -= 1) {
            const currentGroup = groupedRoutePaths[i];
            if (_hasGroupRoutePathWithDirection(currentGroup, hasDirection1, hasDirection2)) {
                return currentGroup;
            }
        }
    }
    return null;
};

// Group below the current group
const _findPrevGroup = (
    groupedRoutePaths: IRoutePath[][],
    index: number,
    hasDirection1: boolean,
    hasDirection2: boolean
): IRoutePath[] | null => {
    if (index < groupedRoutePaths.length - 1) {
        for (let i = index + 1; i < groupedRoutePaths.length; i += 1) {
            const currentGroup = groupedRoutePaths[i];
            if (_hasGroupRoutePathWithDirection(currentGroup, hasDirection1, hasDirection2)) {
                return currentGroup;
            }
        }
    }
    return null;
};

const _hasGroupRoutePathWithDirection = (
    routePaths: IRoutePath[],
    hasDirection1: boolean,
    hasDirection2: boolean
) => {
    return routePaths.find((rp) => {
        if (hasDirection1 && rp.direction === '1') return true;
        if (hasDirection2 && rp.direction === '2') return true;
        return false;
    });
};

export default RoutePathListTab;

export { IRoutePathStopNames };
