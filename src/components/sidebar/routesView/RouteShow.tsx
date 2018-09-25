import { inject, observer } from 'mobx-react';
import * as React from 'react';
import { FaTimes } from 'react-icons/fa';
import classNames from 'classnames';
import { FiInfo } from 'react-icons/fi';
import { RouteStore } from '../../../stores/routeStore';
import { IRoutePath, IRoute } from '../../../models';
import ToggleButton from '../../controls/ToggleButton';
import LineHelper from '../../../util/lineHelper';
import TransitTypeColorHelper from '../../../util/transitTypeColorHelper';
import ColorScale from '../../../util/colorScale';
import routeBuilder from '../../../routing/routeBuilder';
import subSites from '../../../routing/subSites';
import navigator from '../../../routing/navigator';
import QueryParams from '../../../routing/queryParams';
import RouteAndStopHelper from '../../../storeAbstractions/routeAndStopAbstraction';
import * as s from './routeShow.scss';

interface IRouteShowProps {
    routeStore?: RouteStore;
    route: IRoute;
    visibleRoutePathsIndex: number;
}

@inject('routeStore')
@observer
class RouteShow extends React.Component<IRouteShowProps> {
    constructor(props: IRouteShowProps) {
        super(props);
        this.closeRoute = this.closeRoute.bind(this);
    }

    private closeRoute() {
        // TODO: Move actual logic somwhere else, so this function only navigates to new url
        RouteAndStopHelper.removeRoute(this.props.route.routeId);
        const closeRouteLink = routeBuilder
            .to(subSites.current)
            .remove(QueryParams.routes, this.props.route.routeId)
            .toLink();
        navigator.goTo(closeRouteLink);
    }

    private renderRouteName() {
        return (
        <div className={s.routeName}>
            {LineHelper.getTransitIcon(this.props.route.line!.transitType, false)}
            <div
                className={classNames(
                    s.label,
                    TransitTypeColorHelper.getColorClass(this.props.route.line!.transitType),
                )}
            >
                {this.props.route.line!.lineNumber}
            </div>
            {this.props.route.routeName}
            <div
                onClick={this.closeRoute}
                className={s.closeView}
            >
                <FaTimes className={s.close}/>
            </div>
        </div>
        );
    }

    private renderRoutePaths() {
        let visibleRoutePathsIndex = this.props.visibleRoutePathsIndex;

        return this.props.route.routePaths
        .slice().sort((a, b) => a.lastModified.getTime() - b.lastModified.getTime())
        .map((routePath: IRoutePath) => {
            const toggleRoutePathVisibility = () => {
                this.props.routeStore!.toggleRoutePathVisibility(routePath.internalId);
            };
            const routeColor = ColorScale.getColors(
                this.props.routeStore!.visibleRoutePathAmount)[visibleRoutePathsIndex];
            if (routePath.visible) {
                visibleRoutePathsIndex += 1;
            }
            return (
                <div
                    className={s.toggle}
                    key={routePath.internalId}
                >
                    <div className={s.toggleTitle}>
                        Suunta {routePath.direction}
                    </div>
                    <ToggleButton
                        onClick={toggleRoutePathVisibility}
                        value={routePath.visible}
                        type={this.props.route.line!.transitType}
                        color={routePath.visible ? routeColor : '#898989'}
                    />
                    <div className={s.flexFiller} />
                    <div
                        className={s.routeInfoButton}
                        onClick={this.openRoutePathView}
                    >
                        <FiInfo />
                    </div>
                </div>
            );
        });
    }

    private openRoutePathView = () => {
        const routePathViewLink = routeBuilder.to(subSites.routePath).toLink();
        navigator.goTo(routePathViewLink);
    }

    public render(): any {
        return (
            <div className={s.routeShowView}>
                {this.renderRouteName()}
                {this.renderRoutePaths()}
            </div>
        );
    }
}

export default RouteShow;
