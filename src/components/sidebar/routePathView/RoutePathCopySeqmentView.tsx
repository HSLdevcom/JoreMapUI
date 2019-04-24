import React from 'react';
import { inject, observer } from 'mobx-react';
import Loader, { LoaderSize } from '~/components/shared/loader/Loader';
import { FiCopy, FiExternalLink } from 'react-icons/fi';
import Moment from 'moment';
import RoutePathLinkService from '~/services/routePathLinkService';
import routeBuilder from '~/routing/routeBuilder';
import SubSites from '~/routing/subSites';
import {
    RoutePathCopySeqmentStore, ICopySeqmentRoutePath,
} from '~/stores/routePathCopySeqmentStore';
import { IRoutePathLink } from '~/models';
import { RoutePathStore } from '~/stores/routePathStore';
import * as s from './routePathCopySeqmentView.scss';

interface IRoutePathCopySeqmentViewProps {
    routePathStore?: RoutePathStore;
    routePathCopySeqmentStore?: RoutePathCopySeqmentStore;
}

@inject('routePathStore', 'routePathCopySeqmentStore')
@observer
class RoutePathCopySeqmentView extends React.Component<IRoutePathCopySeqmentViewProps> {

    private renderRoutePathRow = (routePath: ICopySeqmentRoutePath, key: string) => {
        return (
            <div
                key={key}
                className={s.routePathRow}
                onMouseEnter={this.setHighlightedRoutePath(routePath)}
                onMouseLeave={this.setHighlightedRoutePath(null)}
            >
                {this.renderTextRow(routePath)}
                <div className={s.icons}>
                    <div
                        className={s.icon}
                        title={`Kopioi reitin ${routePath.routeId} reitin suunnan segmentti`}
                        onClick={this.copySeqments(routePath)}
                    >
                        <FiCopy />
                    </div>
                    <div
                        className={s.icon}
                        title={`Avaa reitin ${routePath.routeId} reitin  suunta uuteen ikkunaan`}
                        onClick={this.openRoutePathInNewTab(routePath)}
                    >
                        <FiExternalLink />
                    </div>
                </div>
            </div>
        );
    }

    private setHighlightedRoutePath = (routePath: ICopySeqmentRoutePath|null) => () => {
        this.props.routePathCopySeqmentStore!.setHighlightedRoutePath(routePath);
    }

    private renderTextRow = (routePath: ICopySeqmentRoutePath) => {
        return (
            <div>
                <div>{routePath.routeId} {routePath.originFi} - {routePath.destinationFi}</div>
                <div className={s.timestampRow}>
                    {Moment(routePath.startTime).format('DD.MM.YYYY')} -{' '}
                    {Moment(routePath.endTime).format('DD.MM.YYYY')}
                </div>
            </div>
        );
    }

    private copySeqments = (routePath: ICopySeqmentRoutePath) => () => {
        const copySeqmentStore = this.props.routePathCopySeqmentStore;
        const startNodeId = copySeqmentStore!.startNode!.nodeId;
        const endNodeId = copySeqmentStore!.endNode!.nodeId;
        const seqmentsToCopy = copySeqmentStore!.getLinksToCopy(routePath, startNodeId, endNodeId);
        console.log('seqmentsToCopy ', seqmentsToCopy);

        for (let i = 0; i < seqmentsToCopy.length; i += 1) {
            this.copySeqment(seqmentsToCopy[i].routePathLinkId);
        }
    }

    private copySeqment = async (routePathLinkId: number) => {
        const routePathLink: IRoutePathLink = await RoutePathLinkService
            .fetchRoutePathLink(routePathLinkId);
        console.log(routePathLink);
        this.props.routePathStore!.addLink(routePathLink);
    }

    private openRoutePathInNewTab = (routePath: ICopySeqmentRoutePath) => () => {
        const routePathLink = routeBuilder
        .to(SubSites.routePath)
        .toTarget([
                routePath.routeId,
                Moment(routePath.startTime).format('YYYY-MM-DDTHH:mm:ss'),
                routePath.direction,
        ].join(','))
        .toLink();
        window.open(routePathLink, '_blank');
    }

    render() {
        const routePaths = this.props.routePathCopySeqmentStore!.routePaths;
        const isLoading = this.props.routePathCopySeqmentStore!.isLoading;

        return (
            <div className={s.routePathCopySeqmentView}>
                <div className={s.topic}>
                    Kopioitavat reitinsuunnat
                </div>
                { isLoading ? (
                    <div className={s.loaderContainer}>
                        <Loader size={LoaderSize.SMALL} />
                    </div>
                ) : (
                    <div className={s.routePathList}>
                        { routePaths.length === 0 ? (
                            <div className={s.noResultsContainer}>
                                Kopioitavia reitinsuunnan segmenttejä valitulta väliltä ei
                                löytynyt. Kokeile asettaa pienempi kopioitava väli.
                            </div>
                        ) : (
                            <>
                            { routePaths.map((routePath, index) => {
                                return this.renderRoutePathRow(
                                    routePath, `row-${index}-${routePath.routeId}'`);
                            })
                            }
                            </>
                        )}
                    </div>
                )
                }
            </div>
        );
    }

}

export default RoutePathCopySeqmentView;
