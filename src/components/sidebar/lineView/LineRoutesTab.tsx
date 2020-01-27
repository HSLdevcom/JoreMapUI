import classnames from 'classnames';
import { inject, observer } from 'mobx-react';
import React from 'react';
import { Button } from '~/components/controls';
import TransitIcon from '~/components/shared/TransitIcon';
import ButtonType from '~/enums/buttonType';
import { IRoute } from '~/models';
import navigator from '~/routing/navigator';
import QueryParams from '~/routing/queryParams';
import routeBuilder from '~/routing/routeBuilder';
import SubSites from '~/routing/subSites';
import { LineStore } from '~/stores/lineStore';
import { LoginStore } from '~/stores/loginStore';
import { SearchStore } from '~/stores/searchStore';
import TransitTypeUtils from '~/utils/TransitTypeUtils';
import s from './lineRoutesTab.scss';

interface ILineRoutesTabProps {
    lineStore?: LineStore;
    searchStore?: SearchStore;
    loginStore?: LoginStore;
}

@inject('lineStore', 'searchStore', 'loginStore')
@observer
class LineRoutesTab extends React.Component<ILineRoutesTabProps> {
    private redirectToNewRouteView = () => {
        const line = this.props.lineStore!.line;

        const newRouteViewLink = routeBuilder
            .to(SubSites.newRoute)
            .set(QueryParams.lineId, line!.id)
            .toLink();

        navigator.goTo({ link: newRouteViewLink });
    };

    private renderRouteList = (routes: IRoute[]) => {
        const line = this.props.lineStore!.line;

        return routes.map((route: IRoute, index: number) => {
            return (
                <div
                    key={index}
                    className={s.routeListItem}
                    onClick={this.redirectToRouteView(route.id)}
                >
                    <TransitIcon transitType={line!.transitType!} isWithoutBox={false} />
                    <div
                        className={classnames(
                            s.routeId,
                            TransitTypeUtils.getColorClass(line!.transitType!)
                        )}
                    >
                        {route.id}
                    </div>{' '}
                    {route.routeName}
                </div>
            );
        });
    };

    private redirectToRouteView = (routeId: string) => () => {
        const routeViewLink = routeBuilder
            .to(SubSites.routes, navigator.getQueryParamValues())
            .append(QueryParams.routes, routeId)
            .toLink();
        this.props.searchStore!.setSearchInput('');
        navigator.goTo({ link: routeViewLink });
    };

    render() {
        const lineStore = this.props.lineStore!;
        const line = lineStore.line;
        const routes = lineStore.routes;
        if (!line) return null;

        return (
            <div className={s.lineRoutesTabView} data-cy='lineRoutesTabView'>
                <div className={s.content}>
                    {routes.length === 0 ? (
                        <div>Linjalla ei olemassa olevia reittejä.</div>
                    ) : (
                        this.renderRouteList(routes)
                    )}

                    {this.props.loginStore!.hasWriteAccess && (
                        <Button
                            onClick={this.redirectToNewRouteView}
                            className={s.createRouteButton}
                            type={ButtonType.SQUARE}
                        >
                            {`Luo uusi reitti linjalle ${line.id}`}
                        </Button>
                    )}
                </div>
            </div>
        );
    }
}

export default LineRoutesTab;
