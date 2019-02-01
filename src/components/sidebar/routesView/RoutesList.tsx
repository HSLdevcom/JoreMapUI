import { inject, observer } from 'mobx-react';
import classnames from 'classnames';
import React from 'react';
import { RouteStore } from '~/stores/routeStore';
import { SearchStore } from '~/stores/searchStore';
import { NetworkStore } from '~/stores/networkStore';
import { RoutePathStore } from '~/stores/routePathStore';
import { IRoute } from '~/models';
import QueryParams from '~/routing/queryParams';
import routeBuilder from '~/routing/routeBuilder';
import subSites from '~/routing/subSites';
import navigator from '~/routing/navigator';
import ButtonType from '~/enums/buttonType';
import Button from '~/components/controls/Button';
import RouteService from '~/services/routeService';
import RouteShow from './RouteShow';
import Loader from '../../shared/loader/Loader';
import * as s from './routesList.scss';

interface IRoutesListState {
    isLoading: boolean;
}

interface IRoutesListProps {
    searchStore?: SearchStore;
    routeStore?: RouteStore;
    networkStore?: NetworkStore;
    routePathStore?: RoutePathStore;
}

@inject('searchStore', 'routeStore', 'networkStore', 'routePathStore')
@observer
class RoutesList extends React.Component<IRoutesListProps, IRoutesListState> {
    constructor(props: any) {
        super(props);
        this.state = {
            isLoading: false,
        };
    }

    async componentDidMount() {
        await this.queryRoutes();
        this.props.routePathStore!.clear();
        this.props.searchStore!.setSearchInput('');
    }

    private queryRoutes = async () => {
        const routeIds = navigator.getQueryParam(QueryParams.routes) as string[];
        if (routeIds) {
            this.setState({ isLoading: true });
            const currentRouteIds = this.props.routeStore!.routes.map(r => r.id);
            const missingRouteIds = routeIds.filter(id => !currentRouteIds.includes(id));
            currentRouteIds
                .filter(id => !routeIds.includes(id))
                .forEach(id => this.props.routeStore!.removeFromRoutes(id));

            const routes = await RouteService.fetchMultipleRoutes(missingRouteIds);
            if (routes) {
                this.props.routeStore!.addToRoutes(routes);
            }
            this.setState({ isLoading: false });
        }
    }

    private renderRouteList = () => {
        const routes = this.props.routeStore!.routes;

        if (routes.length < 1) return null;

        return routes.map((route: IRoute) => {
            return (
                <div key={route.id}>
                    <RouteShow
                        key={route.id}
                        route={route}
                    />
                    <Button
                        onClick={this.redirectToNewRoutePathView(route)}
                        className={s.createRoutePathButton}
                        type={ButtonType.SQUARE}
                    >
                        {`Luo uusi reitin suunta reitille ${route.id}`}
                    </Button>
                </div>
            );
        });
    }

    private redirectToNewRoutePathView = (route: IRoute) => () => {
        const newRoutePathLink = routeBuilder
            .to(subSites.newRoutePath, { routeId: route.id, lineId: route.lineId })
            .toLink();

        navigator.goTo(newRoutePathLink);
    }

    render() {
        if (this.state.isLoading) {
            return(
                <div className={classnames(s.routesListView, s.loaderContainer)}>
                    <Loader/>
                </div>
            );
        }
        return (
            <div className={s.routesListView}>
                <div className={s.routeList}>
                    {
                        this.renderRouteList()
                    }
                </div>
            </div>
        );
    }
}

export default RoutesList;
