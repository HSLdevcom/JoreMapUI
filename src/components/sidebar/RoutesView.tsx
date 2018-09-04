import * as React from 'react';
import * as s from './routesView.scss';
import LineSearch from './LineSearch';
import { Route, RouteComponentProps } from 'react-router';
import RoutesList from './RoutesList';
import { RouteStore } from '../../stores/routeStore';
import { LineStore } from '../../stores/lineStore';
import { SidebarStore } from '../../stores/sidebarStore';
import { inject, observer } from 'mobx-react';
import SearchResults from './SearchResults';
import TransitToggleButtonBar from '../controls/TransitToggleButtonBar';
import routeBuilder from '../../routing/routeBuilder';
import routing from '../../routing/routing';

interface ISidebarProps extends RouteComponentProps<any>{
    routeStore?: RouteStore;
    lineStore?: LineStore;
    sidebarStore?: SidebarStore;
}

@inject('routeStore', 'lineStore', 'sidebarStore')
@observer
class RoutesView extends React.Component<ISidebarProps> {
    public componentDidUpdate() {
        if (!routeBuilder.getValue('routes')) {
            this.props.history.push(
                routeBuilder
                    .to(routing.home)
                    .toLink());
        }
    }

    public render() {
        return (
            <div className={s.routesView}>
                <LineSearch/>
                { this.props.lineStore!.searchInput === '' ? (
                    <Route component={RoutesList} />
                ) : (
                    <>
                        <TransitToggleButtonBar filters={[]}/>
                        <Route component={SearchResults} />
                    </>
                )
                }
            </div>
        );
    }
}

export default RoutesView;
