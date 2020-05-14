import classnames from 'classnames';
import _ from 'lodash';
import { inject, observer } from 'mobx-react';
import React from 'react';
import { match } from 'react-router';
import TransitTypeLink from '~/components/shared/TransitTypeLink';
import TransitType from '~/enums/transitType';
import { ILine, IRoute, IRoutePath } from '~/models';
import navigator from '~/routing/navigator';
import QueryParams from '~/routing/queryParams';
import routeBuilder from '~/routing/routeBuilder';
import SubSites from '~/routing/subSites';
import LineService from '~/services/lineService';
import RouteService from '~/services/routeService';
import { AlertStore } from '~/stores/alertStore';
import { ConfirmStore } from '~/stores/confirmStore';
import { CopyRoutePathStore } from '~/stores/copyRoutePathStore';
import { ErrorStore } from '~/stores/errorStore';
import { LoginStore } from '~/stores/loginStore';
import { MapStore } from '~/stores/mapStore';
import { NetworkStore } from '~/stores/networkStore';
import { IRouteItem, RouteListStore } from '~/stores/routeListStore';
import { RoutePathMassEditStore } from '~/stores/routePathMassEditStore';
import { RoutePathStore } from '~/stores/routePathStore';
import { RouteStore } from '~/stores/routeStore';
import { SearchStore } from '~/stores/searchStore';
import NavigationUtils from '~/utils/NavigationUtils';
import { isCurrentTimeWithinTimeSpan } from '~/utils/dateUtils';
import TransitToggleButtonBar from '../../controls/TransitToggleButtonBar';
import Loader from '../../shared/loader/Loader';
import SearchInput from '../../shared/searchView/SearchInput';
import SearchResults from '../../shared/searchView/SearchResults';
import SidebarHeader from '../SidebarHeader';
import EntityTypeToggles from '../homeView/EntityTypeToggles';
import CopyRoutePathView from './CopyRoutePathView';
import RouteItem from './RouteItem';
import * as s from './routeListView.scss';

interface IRouteListViewProps {
    match?: match<any>;
    routeStore?: RouteStore;
    errorStore?: ErrorStore;
    confirmStore?: ConfirmStore;
    searchStore?: SearchStore;
    routeListStore?: RouteListStore;
    networkStore?: NetworkStore;
    routePathStore?: RoutePathStore;
    mapStore?: MapStore;
    copyRoutePathStore?: CopyRoutePathStore;
    alertStore?: AlertStore;
    loginStore?: LoginStore;
    routePathMassEditStore?: RoutePathMassEditStore;
}

interface IRouteListViewState {
    routeIds: string[];
    isLoading: boolean;
}

@inject(
    'routeStore',
    'searchStore',
    'routeListStore',
    'networkStore',
    'routePathStore',
    'errorStore',
    'confirmStore',
    'copyRoutePathStore',
    'mapStore',
    'alertStore',
    'loginStore',
    'routePathMassEditStore'
)
@observer
class RouteListView extends React.Component<IRouteListViewProps, IRouteListViewState> {
    private _isMounted: boolean;
    constructor(props: IRouteListViewProps) {
        super(props);
        this.state = {
            routeIds: [],
            isLoading: false,
        };
    }

    private _setState = (newState: object) => {
        if (this._isMounted) {
            this.setState(newState);
        }
    };

    async componentDidUpdate() {
        if (!navigator.getQueryParam(QueryParams.routes)) {
            const homeViewLink = routeBuilder.to(SubSites.home).toLink();
            navigator.goTo({ link: homeViewLink });
        }
        const currentRouteIds = navigator.getQueryParam(QueryParams.routes) as string[];
        const oldRouteIds = this.state.routeIds;
        if (!this.state.isLoading && !_.isEqual(oldRouteIds, currentRouteIds)) {
            await this.fetchRoutes(currentRouteIds);
        }
    }

    async componentDidMount() {
        this._isMounted = true;
        const routeIds = navigator.getQueryParam(QueryParams.routes) as string[];
        await this.fetchRoutes(routeIds);

        this.props.routePathStore!.clear();
        this.props.searchStore!.setSearchInput('');
    }

    componentWillUnmount() {
        this.props.routeStore!.clear();
        this._isMounted = false;
        this.props.routeListStore!.clear();
    }

    private fetchRoutes = async (routeIds: string[]) => {
        if (routeIds) {
            this._setState({ isLoading: true });
            const currentRouteIds = this.props.routeListStore!.routeItems.map(
                (routeItem) => routeItem.route.id
            );
            const missingRouteIds = routeIds.filter((id) => !currentRouteIds.includes(id));
            currentRouteIds
                .filter((id) => !routeIds.includes(id))
                .forEach((id) => this.props.routeListStore!.removeFromRouteItems(id));

            const routeIdsNotFound: string[] = [];
            const promises: Promise<void>[] = [];
            const missingRoutes: IRoute[] = [];
            const missingLines: ILine[] = [];
            missingRouteIds.map((routeId: string) => {
                const createPromise = async () => {
                    const route = await RouteService.fetchRoute({
                        routeId,
                        areRoutePathLinksExcluded: true,
                    });
                    if (!route) {
                        routeIdsNotFound.push(routeId);
                    } else {
                        missingRoutes.push(route);
                        const line = await LineService.fetchLine(route.lineId);
                        missingLines.push(line);
                    }
                };
                promises.push(createPromise());
            });

            await Promise.all(promises);
            this.props.routeListStore!.addToLines(missingLines);
            this.props.routeListStore!.addToRouteItems(missingRoutes);

            let hasActiveRoutePath: boolean = false;
            missingRoutes.forEach((route: IRoute) => {
                route.routePaths.forEach((rp: IRoutePath, index: number) => {
                    if (isCurrentTimeWithinTimeSpan(rp.startDate, rp.endDate)) {
                        hasActiveRoutePath = true;
                    }
                });
            });
            if (!hasActiveRoutePath) {
                this.props.mapStore!.initCoordinates();
            }

            if (routeIdsNotFound.length > 0) {
                this.props.errorStore!.addError(
                    `Reittien (${routeIdsNotFound.join(', ')}) haku epäonnistui.`
                );
            }
            this._setState({ routeIds, isLoading: false });
        }
    };

    private closeRoutePrompt = (route: IRoute) => {
        const routeListStore = this.props.routeListStore!;
        const routeStore = this.props.routeStore!;
        const routePathMassEditStore = this.props.routePathMassEditStore!;
        const selectedTabIndex = routeListStore.getRouteItem(route.id)?.selectedTabIndex;
        const isEditingRoutePaths = selectedTabIndex === 0;
        const isDirty = isEditingRoutePaths ? routePathMassEditStore.isDirty : routeStore.isDirty;
        if (routeListStore.routeIdToEdit === route.id && isDirty) {
            this.props.confirmStore!.openConfirm({
                content: `Sinulla on tallentamattomia muutoksia. Oletko varma, että haluat sulkea reitin? Tallentamattomat muutokset kumotaan.`,
                onConfirm: () => {
                    this.closeRoute(route, isEditingRoutePaths);
                },
                confirmButtonText: 'Kyllä',
            });
        } else {
            this.closeRoute(route, isEditingRoutePaths);
        }
    };

    private closeRoute = (route: IRoute, isEditingRoutePaths: boolean) => {
        const routeListStore = this.props.routeListStore!;
        const routeStore = this.props.routeStore!;
        const routePathMassEditStore = this.props.routePathMassEditStore!;

        if (routeListStore.routeIdToEdit === route.id) {
            if (isEditingRoutePaths) {
                routePathMassEditStore.clear();
            } else {
                routeStore.clear();
            }
            routeListStore.setRouteIdToEdit(null);
        }

        this.props.routeListStore!.removeFromRouteItems(route.id);
        const closeRouteLink = routeBuilder
            .to(SubSites.current, navigator.getQueryParamValues())
            .remove(QueryParams.routes, route.id)
            .toLink();
        navigator.goTo({
            link: closeRouteLink,
            shouldSkipUnsavedChangesPrompt: true,
            shouldSkipNavigationAction: true,
        });
    };

    private toggleEditPrompt = (route: IRoute) => {
        const confirmStore = this.props.confirmStore!;
        const routeListStore = this.props.routeListStore!;
        const routeStore = this.props.routeStore!;
        const routePathMassEditStore = this.props.routePathMassEditStore!;

        const newRouteId = route.id === routeListStore.routeIdToEdit ? null : route.id;
        const selectedTabIndex = routeListStore.getRouteItem(route.id)?.selectedTabIndex;
        const isEditingRoutePaths = selectedTabIndex === 0;

        const isDirty = isEditingRoutePaths ? routePathMassEditStore.isDirty : routeStore.isDirty;
        if (!isDirty) {
            this.toggleEdit({ route, newRouteId, isEditingRoutePaths });
            return;
        }

        let promptMessage;
        if (isEditingRoutePaths || route.id === routeListStore.routeIdToEdit) {
            promptMessage = `Sinulla on tallentamattomia muutoksia. Oletko varma, että haluat lopettaa muokkaamisen? Tallentamattomat muutokset kumotaan.`;
        } else {
            promptMessage = `Sinulla on reitin ${routeStore.route.routeName} muokkaus kesken. Oletko varma, että haluat muokata toista reittiä? Tallentamattomat muutokset kumotaan.`;
        }

        confirmStore.openConfirm({
            content: promptMessage,
            onConfirm: () => {
                this.toggleEdit({ route, newRouteId, isEditingRoutePaths });
            },
            confirmButtonText: 'Kyllä',
        });
    };

    private toggleEdit = ({
        route,
        newRouteId,
        isEditingRoutePaths,
    }: {
        route: IRoute;
        newRouteId: string | null;
        isEditingRoutePaths: boolean;
    }) => {
        const routeStore = this.props.routeStore!;
        const routeListStore = this.props.routeListStore!;
        const routePathMassEditStore = this.props.routePathMassEditStore!;
        const isEditing = Boolean(newRouteId);
        routeListStore.setRouteIdToEdit(newRouteId);
        // Start editing
        if (isEditing) {
            if (isEditingRoutePaths) {
                routeListStore.setAllRoutePathsVisible(route.id);
                routePathMassEditStore.activate({ routePaths: route.routePaths });
            } else {
                routeStore.activate({ route, isNewRoute: false });
            }
            // Stop editing
        } else {
            if (isEditingRoutePaths) {
                routePathMassEditStore.clear();
            } else {
                routeStore.clear();
            }
        }
    };

    private toggleTransitType = (type: TransitType) => {
        this.props.searchStore!.toggleTransitType(type);
    };

    private _render = () => {
        const routeListStore = this.props.routeListStore!;
        const routeItems = routeListStore.routeItems;
        const routeIdToEdit = routeListStore.routeIdToEdit;
        if (routeItems.length < 1) {
            return <Loader />;
        }
        if (this.props.copyRoutePathStore!.isVisible) {
            return <CopyRoutePathView />;
        }
        return (
            <>
                <SearchInput />
                {/* Render search container on top of routeList when needed to prevent routeList from re-rendering each time search container is shown. */}
                <div className={s.contentWrapper}>
                    {this.props.searchStore!.searchInput !== '' && (
                        <div className={s.searchContainerWrapper}>
                            <EntityTypeToggles />
                            <TransitToggleButtonBar
                                toggleSelectedTransitType={this.toggleTransitType}
                                selectedTransitTypes={this.props.searchStore!.selectedTransitTypes}
                            />
                            <SearchResults />
                        </div>
                    )}
                    <div className={s.routeList}>
                        {routeItems.map((routeItem: IRouteItem, index: number) => {
                            const route = routeItem.route;
                            const isEditing = routeIdToEdit === route.id;
                            const transitType = routeListStore.getLine(route.lineId)?.transitType!;
                            return (
                                <div key={index} className={s.routeListItem}>
                                    <SidebarHeader
                                        isEditing={isEditing}
                                        isCloseButtonVisible={true}
                                        isEditButtonVisible={true}
                                        isEditPromptHidden={true}
                                        onCloseButtonClick={() => this.closeRoutePrompt(route)}
                                        onEditButtonClick={() => this.toggleEditPrompt(route)}
                                    >
                                        <TransitTypeLink
                                            transitType={transitType}
                                            shouldShowTransitTypeIcon={true}
                                            text={route!.id}
                                            onClick={() =>
                                                NavigationUtils.openLineView({
                                                    lineId: route!.lineId,
                                                })
                                            }
                                            hoverText={`Avaa linja ${route!.lineId}`}
                                            data-cy='routeId'
                                        />
                                    </SidebarHeader>
                                    <div className={s.routeItemWrapper}>
                                        <RouteItem
                                            route={route}
                                            transitType={transitType}
                                            routeIdToEdit={routeIdToEdit}
                                            selectedTabIndex={routeItem.selectedTabIndex}
                                            areAllRoutePathsVisible={
                                                routeItem.areAllRoutePathsVisible
                                            }
                                        />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </>
        );
    };

    render() {
        const isCopyRouteListViewVisible = this.props.copyRoutePathStore!.isVisible;
        return (
            <div
                className={classnames(
                    s.routeListView,
                    isCopyRouteListViewVisible ? s.routeListWide : undefined
                )}
                data-cy='routeListView'
            >
                {this._render()}
            </div>
        );
    }
}

export default RouteListView;
