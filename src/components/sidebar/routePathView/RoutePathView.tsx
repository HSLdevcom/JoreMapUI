import L from 'leaflet';
import _ from 'lodash';
import { inject, observer } from 'mobx-react';
import Moment from 'moment';
import React from 'react';
import ReactMoment from 'react-moment';
import { match } from 'react-router';
import SavePrompt, { ISaveModel } from '~/components/overlays/SavePrompt';
import SaveButton from '~/components/shared/SaveButton';
import { ContentItem, ContentList, Tab, Tabs, TabList } from '~/components/shared/Tabs';
import TransitTypeLink from '~/components/shared/TransitTypeLink';
import Loader from '~/components/shared/loader/Loader';
import constants from '~/constants/constants';
import ToolbarToolType from '~/enums/toolbarToolType';
import RoutePathFactory from '~/factories/routePathFactory';
import EventHelper from '~/helpers/EventHelper';
import { IRoutePath, IRoutePathLink, IViaName } from '~/models';
import IViaShieldName from '~/models/IViaShieldName';
import navigator from '~/routing/navigator';
import QueryParams from '~/routing/queryParams';
import routeBuilder from '~/routing/routeBuilder';
import SubSites from '~/routing/subSites';
import LineService from '~/services/lineService';
import RoutePathService from '~/services/routePathService';
import RouteService from '~/services/routeService';
import ViaNameService from '~/services/viaNameService';
import { AlertStore } from '~/stores/alertStore';
import { ConfirmStore } from '~/stores/confirmStore';
import { ErrorStore } from '~/stores/errorStore';
import { MapStore } from '~/stores/mapStore';
import { MapLayer, NetworkStore, NodeSize } from '~/stores/networkStore';
import { RoutePathCopySegmentStore } from '~/stores/routePathCopySegmentStore';
import { RoutePathLinkMassEditStore } from '~/stores/routePathLinkMassEditStore';
import { ListFilter, RoutePathStore } from '~/stores/routePathStore';
import { ToolbarStore } from '~/stores/toolbarStore';
import NavigationUtils from '~/utils/NavigationUtils';
import SidebarHeader from '../SidebarHeader';
import RoutePathCopySegmentView from './RoutePathCopySegmentView';
import RoutePathInfoTab from './routePathInfoTab/RoutePathInfoTab';
import RoutePathLinksTab from './routePathListTab/RoutePathLinksTab';
import * as s from './routePathView.scss';

interface IRoutePathViewProps {
    isNewRoutePath: boolean;
    match?: match<any>;
    alertStore?: AlertStore;
    routePathStore?: RoutePathStore;
    routePathCopySegmentStore?: RoutePathCopySegmentStore;
    networkStore?: NetworkStore;
    toolbarStore?: ToolbarStore;
    errorStore?: ErrorStore;
    mapStore?: MapStore;
    confirmStore?: ConfirmStore;
    routePathLinkMassEditStore?: RoutePathLinkMassEditStore;
}

interface IRoutePathViewState {
    isLoading: boolean;
}

const ENVIRONMENT = constants.ENVIRONMENT;

@inject(
    'routePathStore',
    'routePathCopySegmentStore',
    'networkStore',
    'toolbarStore',
    'errorStore',
    'alertStore',
    'mapStore',
    'confirmStore',
    'routePathLinkMassEditStore'
)
@observer
class RoutePathView extends React.Component<IRoutePathViewProps, IRoutePathViewState> {
    private _isMounted: boolean;
    constructor(props: IRoutePathViewProps) {
        super(props);
        this.state = {
            isLoading: true,
        };
    }

    private _setState = (newState: object) => {
        if (this._isMounted) {
            this.setState(newState);
        }
    };

    componentDidMount() {
        this._isMounted = true;
        EventHelper.on('undo', this.undo);
        EventHelper.on('redo', this.redo);
        this.initialize();
        this.props.routePathStore!.setIsEditingDisabled(!this.props.isNewRoutePath);
    }

    componentWillUnmount() {
        this._isMounted = false;
        this.props.toolbarStore!.selectTool(null);
        this.props.networkStore!.setNodeSize(NodeSize.normal);
        this.props.routePathStore!.clear();
        EventHelper.off('undo', this.undo);
        EventHelper.off('redo', this.redo);
    }

    private undo = () => {
        this.undoIfAllowed(this.props.routePathStore!.undo);
    };

    private redo = () => {
        this.undoIfAllowed(this.props.routePathStore!.redo);
    };

    private undoIfAllowed = (undo: () => void) => {
        if (this.props.toolbarStore!.areUndoButtonsDisabled) {
            this.props.errorStore!.addError(
                `'kumoa' ja 'tee uudestaan' estetty. Sulje ensin valitut pysäkit.`
            );
        } else {
            this.props.routePathStore!.setIsEditingDisabled(false);
            undo();
        }
    };

    private initialize = async () => {
        if (this.props.isNewRoutePath) {
            await this.fetchExistingRoutePaths();
            await this.createNewRoutePath();
        } else {
            await this.initExistingRoutePath();
        }
        await this.initializeMap();
    };

    private fetchExistingRoutePaths = async () => {
        const queryParams = navigator.getQueryParamValues();
        const routeId = queryParams[QueryParams.routeId];
        const route = await RouteService.fetchRoute({
            routeId,
            areRoutePathLinksExcluded: true,
        });
        this.props.routePathStore!.setExistingRoutePaths(route!.routePaths);
    };

    private createNewRoutePath = async () => {
        this._setState({ isLoading: true });
        this.props.mapStore!.initCoordinates();
        try {
            if (!this.props.routePathStore!.routePath) {
                const queryParams = navigator.getQueryParamValues();
                const routeId = queryParams[QueryParams.routeId];
                const lineId = queryParams[QueryParams.lineId];
                const line = await LineService.fetchLine(lineId);
                const routePath = RoutePathFactory.createNewRoutePath(
                    lineId,
                    routeId,
                    line.transitType!
                );
                this.props.routePathStore!.activate({
                    routePath,
                    isNewRoutePath: this.props.isNewRoutePath,
                });
            } else {
                this.props.routePathStore!.activate({
                    routePath: RoutePathFactory.createNewRoutePathFromOld(
                        this.props.routePathStore!.routePath!
                    ),
                    isNewRoutePath: this.props.isNewRoutePath,
                });
            }
            this.props.toolbarStore!.selectTool(ToolbarToolType.AddNewRoutePathLink);
        } catch (e) {
            this.props.errorStore!.addError('Uuden reitinsuunnan luonti epäonnistui', e);
        }
        this._setState({ isLoading: false });
    };

    private initializeMap = async () => {
        if (this.props.isNewRoutePath) {
            this.props.networkStore!.setNodeSize(NodeSize.large);
            this.props.networkStore!.showMapLayer(MapLayer.node);
            this.props.networkStore!.showMapLayer(MapLayer.link);
        }

        await this.setTransitType();
    };

    private setTransitType = async () => {
        const routePath = this.props.routePathStore!.routePath;
        if (routePath && routePath.lineId) {
            try {
                const line = await LineService.fetchLine(routePath.lineId);
                this.props.networkStore!.setSelectedTransitTypes([line.transitType!]);
            } catch (e) {
                this.props.errorStore!.addError('Linjan haku epäonnistui', e);
            }
        }
    };

    private initExistingRoutePath = async () => {
        this._setState({ isLoading: true });
        await this.fetchRoutePath();
        const itemToShow = navigator.getQueryParamValues()[QueryParams.showItem];
        if (itemToShow) {
            this.props.routePathStore!.setSelectedTabIndex(1);
            this.props.routePathStore!.setExtendedListItemId(itemToShow);
            this.props.routePathStore!.removeListFilter(ListFilter.link);
        }
        this._setState({ isLoading: false });
    };

    private fetchRoutePath = async () => {
        const [routeId, startDateString, direction] = this.props.match!.params.id.split(',');
        const routePath = await RoutePathService.fetchRoutePath(
            routeId,
            startDateString,
            direction
        );
        if (!routePath) {
            this.props.errorStore!.addError(
                `Reitinsuunnan (reitin tunnus: ${routeId}, alkupvm ${startDateString}, suunta ${direction}) haku ei onnistunut.`
            );
            const homeViewLink = routeBuilder.to(SubSites.home).toLink();
            navigator.goTo({ link: homeViewLink });
            return;
        }
        await this.fetchViaNames(routePath);
        this.centerMapToRoutePath(routePath);
        this.props.routePathStore!.activate({
            routePath,
            isNewRoutePath: this.props.isNewRoutePath,
        });
    };

    // fetch & set viaName properties to routePathLink
    private fetchViaNames = async (routePath: IRoutePath) => {
        try {
            const routePathLinks: IRoutePathLink[] = routePath.routePathLinks;

            const viaNames: IViaName[] = await ViaNameService.fetchViaName({
                routeId: routePath.routeId,
                startDate: routePath.startDate,
                direction: routePath.direction,
            });

            const viaShieldNames: IViaShieldName[] = await ViaNameService.fetchViaShieldName({
                routeId: routePath.routeId,
                startDate: routePath.startDate,
                direction: routePath.direction,
            });

            routePathLinks.forEach((routePathLink: IRoutePathLink) => {
                const viaName = viaNames.find((viaName) => viaName.viaNameId === routePathLink.id);
                if (viaName) {
                    routePathLink.viaNameId = viaName.viaNameId;
                    routePathLink.destinationFi1 = viaName?.destinationFi1;
                    routePathLink.destinationFi2 = viaName?.destinationFi2;
                    routePathLink.destinationSw1 = viaName?.destinationSw1;
                    routePathLink.destinationSw2 = viaName?.destinationSw2;
                }
                const viaShieldName = viaShieldNames.find(
                    (viaShieldName) => viaShieldName.viaShieldNameId === routePathLink.id
                );
                if (viaShieldName) {
                    routePathLink.viaShieldNameId = viaShieldName.viaShieldNameId;
                    routePathLink.destinationShieldFi = viaShieldName?.destinationShieldFi;
                    routePathLink.destinationShieldSw = viaShieldName?.destinationShieldSw;
                }
            });
        } catch (err) {
            this.props.errorStore!.addError(
                'Määränpää tietojen (via nimet ja via kilpi nimet) haku ei onnistunut.',
                err
            );
        }
        return [];
    };

    private centerMapToRoutePath = (routePath: IRoutePath) => {
        const bounds: L.LatLngBounds = new L.LatLngBounds([]);

        routePath!.routePathLinks.forEach((link) => {
            link.geometry.forEach((pos) => bounds.extend(pos));
        });

        this.props.mapStore!.setMapBounds(bounds);
    };

    private save = async () => {
        this._setState({ isLoading: true });
        const routePath = this.props.routePathStore!.routePath;
        const oldRoutePath = this.props.routePathStore!.oldRoutePath;
        try {
            if (this.props.isNewRoutePath) {
                const routePathPrimaryKey = await RoutePathService.createRoutePath(routePath!);
                const routePathViewLink = routeBuilder
                    .to(SubSites.routePath)
                    .toTarget(
                        ':id',
                        [
                            routePathPrimaryKey.routeId,
                            Moment(routePathPrimaryKey.startDate).format('YYYY-MM-DDTHH:mm:ss'),
                            routePathPrimaryKey.direction,
                        ].join(',')
                    )
                    .toLink();
                navigator.goTo({ link: routePathViewLink, shouldSkipUnsavedChangesPrompt: true });
            } else {
                await RoutePathService.updateRoutePath(routePath!, oldRoutePath!);
                await this.fetchRoutePath();
                this.props.routePathStore!.setIsEditingDisabled(true);
                this._setState({ isLoading: false });
            }
            this.props.routePathLinkMassEditStore!.clear();
            this.props.alertStore!.setFadeMessage({ message: 'Tallennettu!' });
        } catch (e) {
            this.props.errorStore!.addError(`Tallennus epäonnistui`, e);
        }
    };

    private showSavePrompt = () => {
        const confirmStore = this.props.confirmStore;
        const currentRoutePath = this.props.routePathStore!.routePath;
        const oldRoutePath = this.props.routePathStore!.oldRoutePath;
        const saveModel: ISaveModel = {
            type: 'saveModel',
            newData: currentRoutePath ? currentRoutePath : {},
            oldData: oldRoutePath,
            model: 'routePath',
        };
        confirmStore!.openConfirm({
            content: <SavePrompt models={[saveModel]} />,
            onConfirm: () => {
                this.save();
            },
        });
    };

    render() {
        const routePathStore = this.props.routePathStore;
        if (this.state.isLoading) {
            return (
                <div className={s.routePathView}>
                    <Loader size='medium' />
                </div>
            );
        }
        const routePath = routePathStore!.routePath;
        if (!routePath) return null;

        const isEditingDisabled = routePathStore!.isEditingDisabled;
        const routePathCopySegmentStore = this.props.routePathCopySegmentStore;
        const isCopyRoutePathSegmentViewVisible =
            routePathCopySegmentStore!.startNode && routePathCopySegmentStore!.endNode;
        const isSaveAllowed = ENVIRONMENT !== 'prod' && ENVIRONMENT !== 'stage';
        const savePreventedNotification = isSaveAllowed
            ? routePathStore!.getSavePreventedText()
            : 'Reitinsuunnan tallentaminen ei ole vielä valmis. Voit kokeilla tallentamista dev-ympäristössä. Jos haluat tallentaa reitinsuuntia tuotannossa, joudut käyttämään vanhaa JORE-ympäristöä.';
        return (
            <div className={s.routePathView} data-cy='routePathView'>
                <div className={s.sidebarHeaderSection}>
                    <SidebarHeader
                        isEditButtonVisible={!this.props.isNewRoutePath}
                        isBackButtonVisible={true}
                        isCloseButtonVisible={true}
                        onEditButtonClick={routePathStore!.toggleIsEditingDisabled}
                        isEditing={!routePathStore!.isEditingDisabled}
                    >
                        {this.props.isNewRoutePath ? (
                            `Uusi reitinsuunta reitille ${routePath.routeId}`
                        ) : (
                            <div className={s.linkContainer}>
                                <TransitTypeLink
                                    transitType={routePath.transitType!}
                                    shouldShowTransitTypeIcon={true}
                                    text={routePath.lineId!}
                                    onClick={() =>
                                        NavigationUtils.openLineView({ lineId: routePath!.lineId! })
                                    }
                                    hoverText={`Avaa linja ${routePath.lineId!}`}
                                />
                                <div className={s.lineLinkGreaterThanSign}>&nbsp;>&nbsp;</div>
                                <TransitTypeLink
                                    transitType={routePath.transitType!}
                                    shouldShowTransitTypeIcon={false}
                                    text={routePath.routeId}
                                    onClick={() =>
                                        NavigationUtils.openRouteView({
                                            routeId: routePath.routeId,
                                        })
                                    }
                                    hoverText={`Avaa reitti ${routePath.routeId}`}
                                />
                            </div>
                        )}
                    </SidebarHeader>
                    <div className={s.subTopic}>
                        <ReactMoment date={routePath.startDate} format='DD.MM.YYYY' /> -{' '}
                        <ReactMoment date={routePath.endDate} format='DD.MM.YYYY' />
                        <br />
                        Suunta {routePath.direction}: {routePath.originFi} -{' '}
                        {routePath.destinationFi}
                    </div>
                </div>

                {isCopyRoutePathSegmentViewVisible ? (
                    <RoutePathCopySegmentView />
                ) : (
                    <>
                        <Tabs>
                            <TabList
                                selectedTabIndex={routePathStore!.selectedTabIndex}
                                setSelectedTabIndex={routePathStore!.setSelectedTabIndex}
                            >
                                <Tab>
                                    <div>Reitinsuunnan tiedot</div>
                                </Tab>
                                <Tab>
                                    <div>Solmut ja linkit</div>
                                </Tab>
                            </TabList>
                            <ContentList selectedTabIndex={routePathStore!.selectedTabIndex}>
                                <ContentItem>
                                    <RoutePathInfoTab
                                        isEditingDisabled={isEditingDisabled}
                                        routePath={this.props.routePathStore!.routePath!}
                                        invalidPropertiesMap={
                                            this.props.routePathStore!.invalidPropertiesMap
                                        }
                                    />
                                </ContentItem>
                                <ContentItem>
                                    <RoutePathLinksTab
                                        routePath={this.props.routePathStore!.routePath!}
                                        isEditingDisabled={isEditingDisabled}
                                    />
                                </ContentItem>
                            </ContentList>
                        </Tabs>
                        <SaveButton
                            onClick={this.showSavePrompt}
                            disabled={isSaveAllowed && savePreventedNotification.length > 0}
                            savePreventedNotification={savePreventedNotification}
                            isWarningButton={!isSaveAllowed}
                        >
                            {this.props.isNewRoutePath ? 'Luo reitinsuunta' : 'Tallenna muutokset'}
                        </SaveButton>
                    </>
                )}
            </div>
        );
    }
}

export default RoutePathView;
