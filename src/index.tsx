import createBrowserHistory from 'history/createBrowserHistory';
import { configure } from 'mobx';
import { Provider } from 'mobx-react';
import { syncHistoryWithStore } from 'mobx-react-router';
import React from 'react';
import { ApolloProvider } from 'react-apollo';
import ReactDOM from 'react-dom';
import { Router } from 'react-router';
import App from './components/App';
import './index.scss';
import navigator from './routing/navigator';
import AlertStore from './stores/alertStore';
import CodeListStore from './stores/codeListStore';
import ConfirmStore from './stores/confirmStore';
import ErrorStore from './stores/errorStore';
import LineHeaderStore from './stores/lineHeaderStore';
import LineStore from './stores/lineStore';
import LinkStore from './stores/linkStore';
import LoginStore from './stores/loginStore';
import MapStore from './stores/mapStore';
import NetworkStore from './stores/networkStore';
import NodeStore from './stores/nodeStore';
import PopupStore from './stores/popupStore';
import RouteListStore from './stores/routeListStore';
import RoutePathCopySegmentStore from './stores/routePathCopySegmentStore';
import RoutePathStore from './stores/routePathStore';
import RouteStore from './stores/routeStore';
import SearchResultStore from './stores/searchResultStore';
import SearchStore from './stores/searchStore';
import ToolbarStore from './stores/toolbarStore';
import ApolloClient from './util/ApolloClient';

configure({ enforceActions: 'always' });

const browserHistory = createBrowserHistory();

// Observable stores
const stores = {
    errorStore: ErrorStore,
    mapStore: MapStore,
    searchResultStore: SearchResultStore,
    loginStore: LoginStore,
    lineStore: LineStore,
    lineHeaderStore: LineHeaderStore,
    routeStore: RouteStore,
    routeListStore: RouteListStore,
    routePathStore: RoutePathStore,
    routePathCopySegmentStore: RoutePathCopySegmentStore,
    searchStore: SearchStore,
    popupStore: PopupStore,
    toolbarStore: ToolbarStore,
    networkStore: NetworkStore,
    nodeStore: NodeStore,
    linkStore: LinkStore,
    alertStore: AlertStore,
    codeListStore: CodeListStore,
    confirmStore: ConfirmStore
};

const history = syncHistoryWithStore(browserHistory, navigator.getStore());

ReactDOM.render(
    <Provider {...stores}>
        <ApolloProvider client={ApolloClient.getClient()}>
            <Router history={history}>
                <App />
            </Router>
        </ApolloProvider>
    </Provider>,
    document.getElementById('root') as HTMLElement
);
