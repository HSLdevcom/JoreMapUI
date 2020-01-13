import classNames from 'classnames';
import { inject, observer } from 'mobx-react';
import Moment from 'moment';
import React from 'react';
import { FiInfo } from 'react-icons/fi';
import { Button } from '~/components/controls';
import Loader from '~/components/shared/loader/Loader';
import { IRoute, IRoutePath } from '~/models';
import navigator from '~/routing/navigator';
import routeBuilder from '~/routing/routeBuilder';
import subSites from '~/routing/subSites';
import RoutePathService from '~/services/routePathService';
import { MapStore } from '~/stores/mapStore';
import { RouteListStore } from '~/stores/routeListStore';
import { toDateString } from '~/util/dateHelpers';
import ToggleSwitch from '../../controls/ToggleSwitch';
import * as s from './routePathListTab.scss';

interface IRoutePathStopNames {
    firstStopName: string;
    lastStopName: string;
}

interface IRoutePathListTabProps {
    route: IRoute;
    areAllRoutePathsVisible: boolean;
    toggleAllRoutePathsVisible: () => void;
    routeListStore?: RouteListStore;
    mapStore?: MapStore;
}

interface IRoutePathListTabState {
    stopNameMap: Map<string, IRoutePathStopNames>;
    areStopNamesLoading: boolean;
}

const ROUTE_PATH_GROUP_SHOW_LIMIT = 3;

@inject('routeListStore', 'mapStore')
@observer
class RoutePathListTab extends React.Component<IRoutePathListTabProps, IRoutePathListTabState> {
    private _isMounted: boolean;
    constructor(props: IRoutePathListTabProps) {
        super(props);
        this.state = {
            stopNameMap: new Map(),
            areStopNamesLoading: true
        };
    }

    private _setState = (newState: object) => {
        if (this._isMounted) {
            this.setState(newState);
        }
    };


    async componentDidMount() {
        this._isMounted = true;
        const stopNameMap = new Map();
        const routePaths = this.props.route.routePaths;
        for (let i = 0; i < routePaths.length; i += 1) {
            const routePath: IRoutePath = routePaths[i];
            const stopNames = await RoutePathService.fetchFirstAndLastStopNamesOfRoutePath({
                routeId: routePath.routeId,
                direction: routePath.direction,
                startTime: routePath.startTime
            });
            stopNameMap.set(routePath.internalId, stopNames);
        }
        this._setState({
            stopNameMap,
            areStopNamesLoading: false
        });
    }

    componentWillUnmount() {
        this._isMounted = false;
    }

    private groupRoutePathsOnDates = (routePaths: IRoutePath[]): IRoutePath[][] => {
        const res = {};
        routePaths.forEach(rp => {
            const identifier = rp.startTime.toLocaleDateString() + rp.endTime.toLocaleDateString();
            (res[identifier] = res[identifier] || []).push(rp);
        });

        const list: IRoutePath[][] = Object.values(res);
        list.sort(
            (a: IRoutePath[], b: IRoutePath[]) =>
                b[0].startTime.getTime() - a[0].startTime.getTime()
        );

        return list;
    };

    private renderRoutePathList = (routePaths: IRoutePath[]) => {
        return routePaths.map((routePath: IRoutePath) => {
            const toggleRoutePathVisibility = () => {
                this.props.routeListStore!.toggleRoutePathVisibility(routePath.internalId);
            };

            const openRoutePathView = () => {
                const routePathViewLink = routeBuilder
                    .to(subSites.routePath)
                    .toTarget(
                        ':id',
                        [
                            routePath.routeId,
                            Moment(routePath.startTime).format('YYYY-MM-DDTHH:mm:ss'),
                            routePath.direction
                        ].join(',')
                    )
                    .toLink();
                navigator.goTo(routePathViewLink);
            };

            const isWithinTimeSpan =
                Moment(routePath.startTime).isBefore(Moment()) &&
                Moment(routePath.endTime).isAfter(Moment());

            const stopNames = this.state.stopNameMap.get(routePath.internalId);
            const stopOriginFi = stopNames?.firstStopName ? stopNames.firstStopName : '-';
            const stopDestinationFi = stopNames?.lastStopName ? stopNames?.lastStopName : '-';
            return (
                <div className={s.routePathContainer} key={routePath.internalId}>
                    <div
                        className={
                            isWithinTimeSpan
                                ? classNames(s.routePathInfo, s.highlight)
                                : s.routePathInfo
                        }
                    >
                        {this.state.areStopNamesLoading ? (
                            <Loader containerClassName={s.stopNameLoader} size='tiny' hasNoMargin={true} />
                        ) :
                            <div className={s.stopNames}>{`${stopOriginFi} - ${stopDestinationFi}`}</div>
                        }
                        <div className={s.routePathPoints}>{`${routePath.originFi} - ${routePath.destinationFi}`}</div>
                    </div>
                    <div className={s.routePathControls}>
                        <ToggleSwitch
                            onClick={toggleRoutePathVisibility}
                            value={routePath.visible}
                            color={routePath.visible ? routePath.color! : '#898989'}
                        />
                        <Button
                            className={s.openRoutePathViewButton}
                            hasReverseColor={true}
                            onClick={openRoutePathView}
                        >
                            <FiInfo />
                        </Button>
                    </div>
                </div>
            );
        });
    };

    private renderGroupedRoutePaths = (groupedRoutePaths: IRoutePath[][]) => {
        return groupedRoutePaths.map((routePaths: IRoutePath[], index) => {
            const first = routePaths[0];
            const header = `${toDateString(first.startTime)} - ${toDateString(first.endTime)}`;

            return (
                <div
                    key={header}
                    className={classNames(s.groupedRoutes, index % 2 ? s.shadow : undefined)}
                >
                    <div className={s.groupedRoutesDate}>{header}</div>
                    <div className={s.groupedRoutesContent}>
                        {this.renderRoutePathList(routePaths)}
                    </div>
                </div>
            );
        });
    };

    render() {
        const routePaths = this.props.route.routePaths;
        if (routePaths.length === 0) {
            return (
                <div className={s.routePathListTab}>
                    <div className={s.noRoutePathsMessage}>Reitillä ei ole reitin suuntia.</div>
                </div>
            );
        }
        const groupedRoutePaths: IRoutePath[][] = this.groupRoutePathsOnDates(routePaths);
        const groupedRoutePathsToDisplay = this.props.areAllRoutePathsVisible
            ? groupedRoutePaths
            : groupedRoutePaths.slice(0, ROUTE_PATH_GROUP_SHOW_LIMIT);

        return (
            <div className={s.routePathListTab}>
                {this.renderGroupedRoutePaths(groupedRoutePathsToDisplay)}
                {groupedRoutePaths.length > ROUTE_PATH_GROUP_SHOW_LIMIT && (
                    <div
                        className={s.toggleAllRoutePathsVisibleButton}
                        onClick={this.props.toggleAllRoutePathsVisible}
                    >
                        {!this.props.areAllRoutePathsVisible && (
                            <div className={s.threeDots}>...</div>
                        )}
                        <div className={s.toggleAllRoutePathsVisibleText}>
                            {this.props.areAllRoutePathsVisible
                                ? `Piilota reitinsuunnat`
                                : `Näytä kaikki reitinsuunnat (${
                                      this.props.route.routePaths.length
                                  })`}
                        </div>
                    </div>
                )}
            </div>
        );
    }
}

export default RoutePathListTab;
