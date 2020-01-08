import { inject, observer } from 'mobx-react';
import React from 'react';
import { ContentItem, ContentList, Tab, Tabs, TabList } from '~/components/shared/Tabs';
import { IRoute } from '~/models';
import { RouteListStore } from '~/stores/routeListStore';
import RoutePathListTab from './RoutePathListTab';
import RouteTab from './RouteTab';

interface IRouteItemProps {
    route: IRoute;
    isEditingDisabled: boolean;
    routeListStore?: RouteListStore;
}

interface IRouteItemState {
    selectedTabIndex: number;
}

@inject('routeListStore', 'mapStore')
@observer
class RouteItem extends React.Component<IRouteItemProps, IRouteItemState> {
    constructor(props: any) {
        super(props);
        this.state = {
            selectedTabIndex: 1
        };
    }

    async componentDidMount() {
        let index = 0;
        const promises: Promise<void>[] = [];
        for (const routePath of this.props.route.routePaths) {
            if (index < 2) {
                const promise = this.props.routeListStore!.setRoutePathVisibility(
                    true,
                    routePath.internalId
                );
                promises.push(promise);
            }
            index += 1;
        }
        await Promise.all(promises);
    }

    private setSelectedTabIndex = (index: number) => {
        this.setState({
            selectedTabIndex: index
        });
    };

    render() {
        const isEditingDisabled = this.props.isEditingDisabled;
        return (
            <Tabs>
                <TabList
                    selectedTabIndex={this.state.selectedTabIndex}
                    setSelectedTabIndex={this.setSelectedTabIndex}
                >
                    <Tab>
                        <div>Reitin tiedot</div>
                    </Tab>
                    <Tab>
                        <div>Reitinsuunnat</div>
                    </Tab>
                </TabList>
                <ContentList selectedTabIndex={this.state.selectedTabIndex}>
                    <ContentItem>
                        <RouteTab
                            route={this.props.route}
                            isEditingDisabled={isEditingDisabled}
                            isNewRoute={false}
                        />
                    </ContentItem>
                    <ContentItem>
                        <RoutePathListTab route={this.props.route} />
                    </ContentItem>
                </ContentList>
            </Tabs>
        );
    }
}

export default RouteItem;
