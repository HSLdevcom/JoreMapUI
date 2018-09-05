import * as React from 'react';
import * as s from './routesView.scss';
import LineSearch from './LineSearch';
import { Route } from 'react-router';
import RoutesList from './RoutesList';
import { RouteStore } from '../../stores/routeStore';
import { SidebarStore } from '../../stores/sidebarStore';
import { inject, observer } from 'mobx-react';
import SearchResults from './SearchResults';
import TransitToggleButtonBar from '../controls/TransitToggleButtonBar';
import routeBuilder from '../../routing/routeBuilder';
import routing from '../../routing/routing';
import navigator from '../../routing/navigator';
import { SearchStore } from '../../stores/searchStore';

interface ISidebarProps{
    routeStore?: RouteStore;
    searchStore?: SearchStore;
    sidebarStore?: SidebarStore;
}

@inject('routeStore', 'searchStore', 'sidebarStore')
@observer
class RoutesView extends React.Component<ISidebarProps> {
    public componentDidUpdate() {
        if (!routeBuilder.getValue('routes')) {
            navigator.push(
                routeBuilder
                    .to(routing.home)
                    .toLink());
        }
    }

    public render() {
        return (
            <div className={s.routesView}>
                <LineSearch/>
                { this.props.searchStore!.searchInput === '' ? (
                    <Route component={RoutesList} />
                ) : (
                    <>
                        <TransitToggleButtonBar filters={[]}/>
                        <SearchResults />
                    </>
                )
                }
            </div>
        );
    }
}

export default RoutesView;
