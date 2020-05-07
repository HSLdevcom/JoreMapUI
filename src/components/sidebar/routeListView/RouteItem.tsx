import _ from 'lodash';
import { inject, observer } from 'mobx-react';
import React from 'react';
import { ContentItem, ContentList, Tab, Tabs, TabList } from '~/components/shared/Tabs';
import TransitType from '~/enums/transitType';
import { IRoute } from '~/models';
import { RouteListStore } from '~/stores/routeListStore';
import RoutePathListTab from './RoutePathListTab';
import RouteTab from './RouteTab';

interface IRouteItemProps {
    route: IRoute;
    transitType: TransitType;
    routeIdToEdit: string | null;
    selectedTabIndex: number;
    areAllRoutePathsVisible: boolean;
    routeListStore?: RouteListStore;
}

@inject('routeListStore', 'mapStore')
@observer
class RouteItem extends React.Component<IRouteItemProps> {
    private setSelectedTabIndex = (index: number) => {
        this.props.routeListStore!.setSelectedTabIndex(this.props.route.id, index);
    };

    private toggleAllRoutePathsVisible = () => {
        this.props.routeListStore!.toggleAllRoutePathsVisible(this.props.route.id);
    };

    render() {
        const {
            route,
            transitType,
            routeIdToEdit,
            selectedTabIndex,
            areAllRoutePathsVisible,
        } = this.props;
        const isEditingRoutePaths = selectedTabIndex === 0 && route.id === routeIdToEdit;
        const isEditingRoute = selectedTabIndex === 1 && route.id === routeIdToEdit;
        return (
            <Tabs>
                <TabList
                    selectedTabIndex={selectedTabIndex}
                    setSelectedTabIndex={this.setSelectedTabIndex}
                >
                    <Tab isDisabled={isEditingRoute}>
                        <div>Reitinsuunnat</div>
                    </Tab>
                    <Tab isDisabled={isEditingRoutePaths}>
                        <div>Reitin tiedot</div>
                    </Tab>
                </TabList>
                <ContentList selectedTabIndex={selectedTabIndex}>
                    <ContentItem>
                        <RoutePathListTab
                            key={route.id}
                            transitType={transitType}
                            originalRoutePaths={route.routePaths}
                            isEditing={isEditingRoutePaths}
                            lineId={route.lineId}
                            routeId={route.id}
                            areAllRoutePathsVisible={areAllRoutePathsVisible}
                            toggleAllRoutePathsVisible={this.toggleAllRoutePathsVisible}
                        />
                    </ContentItem>
                    <ContentItem>
                        <RouteTab route={route} isEditing={isEditingRoute} isNewRoute={false} />
                    </ContentItem>
                </ContentList>
            </Tabs>
        );
    }
}

export default RouteItem;
