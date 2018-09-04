import { configure } from 'mobx';
import { Provider } from 'mobx-react';
import * as React from 'react';
import { ApolloProvider } from 'react-apollo';
import * as ReactDOM from 'react-dom';
import App from './components/App';
import observableNotificationStore from './stores/notificationStore';
import observableLoginStore from './stores/loginStore';
import observableMapStore from './stores/mapStore';
import observableLineStore from './stores/lineStore';
import observableRouteStore from './stores/routeStore';
import observableSidebarStore from './stores/sidebarStore';
import observablePopupStore from './stores/popupStore';
import observableToolbarStore from './stores/toolbarStore';
import apolloClient from './util/ApolloClient';
import './index.scss';
import createBrowserHistory from 'history/createBrowserHistory';
import { syncHistoryWithStore } from 'mobx-react-router';
import { Router } from 'react-router';
import navigator from './routing/navigator';

configure({ enforceActions: 'always' });

const browserHistory = createBrowserHistory();

const stores = {
    mapStore: observableMapStore,
    notificationStore: observableNotificationStore,
    lineStore: observableLineStore,
    loginStore: observableLoginStore,
    routeStore: observableRouteStore,
    sidebarStore: observableSidebarStore,
    popupStore: observablePopupStore,
    toolbarStore: observableToolbarStore,
};

const history = syncHistoryWithStore(browserHistory, navigator.getStore());

ReactDOM.render(
    <Provider {...stores}>
        <ApolloProvider client={apolloClient}>
            <Router history={history}>
                <App />
            </Router>
        </ApolloProvider>
    </Provider>,
    document.getElementById('root') as HTMLElement,
);
