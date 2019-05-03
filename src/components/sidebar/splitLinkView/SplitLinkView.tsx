import React from 'react';
import classnames from 'classnames';
import * as L from 'leaflet';
import { observer, inject } from 'mobx-react';
import { RouteComponentProps } from 'react-router';
import { MapStore } from '~/stores/mapStore';
import { ErrorStore } from '~/stores/errorStore';
import { LinkStore } from '~/stores/linkStore';
import { NodeStore } from '~/stores/nodeStore';
import RoutePathService from '~/services/routePathService';
import { ILink, INode, IRoutePath } from '~/models';
import NodeType from '~/enums/nodeType';
import LinkService from '~/services/linkService';
import NodeService from '~/services/nodeService';
import { NetworkStore } from '~/stores/networkStore';
import Loader from '~/components/shared/loader/Loader';
import { Button } from '~/components/controls';
import ButtonType from '~/enums/buttonType';
import { AlertStore, AlertType } from '~/stores/alertStore';
import SidebarHeader from '../SidebarHeader';
import InputContainer from '../InputContainer';
import RoutePathSelector from './RoutePathSelector';
import SplitLinkInfo from './SplitLinkInfo';
import * as s from './splitLinkView.scss';

interface ISplitLinkViewState {
    isLoading: boolean;
    link: ILink | null;
    node: INode | null;
    selectedDate?: Date;
    selectedRoutePathIds: object;
    routePaths: IRoutePath[];
    isLoadingRoutePaths: boolean;
}

interface ISplitLinkViewProps extends RouteComponentProps<any>{
    mapStore?: MapStore;
    errorStore?: ErrorStore;
    linkStore?: LinkStore;
    nodeStore?: NodeStore;
    alertStore?: AlertStore;
    networkStore?: NetworkStore;
}

@inject('mapStore', 'errorStore', 'linkStore', 'nodeStore', 'alertStore', 'networkStore')
@observer
class SplitLinkView extends React.Component<ISplitLinkViewProps, ISplitLinkViewState> {
    constructor(props: ISplitLinkViewProps) {
        super(props);
        this.state = {
            isLoading: false,
            link: null,
            node: null,
            selectedRoutePathIds: {},
            routePaths: [],
            isLoadingRoutePaths: false,
        };
    }

    componentDidMount() {
        this.init();
    }

    private init = async () => {
        this.setState({ isLoading: true });

        const [
            linkStartNodeId,
            linkEndNodeId,
            linkTransitType,
            nodeId,
        ] = this.props.match!.params.id.split(',');
        try {
            if (linkStartNodeId && linkEndNodeId && linkTransitType && nodeId) {
                const link = await LinkService.fetchLink(
                    linkStartNodeId, linkEndNodeId, linkTransitType,
                );
                const node = await NodeService.fetchNode(nodeId);
                this.setState({
                    link,
                    node,
                });
                this.props.linkStore!.setLink(link);
                this.props.linkStore!.setIsLinkGeometryEditable(false);
                this.props.linkStore!.setNodes([node]);
                const bounds = L.latLngBounds(link.geometry);
                bounds.extend(node.coordinates);
                this.props.mapStore!.setMapBounds(bounds);
                this.props.networkStore!.hideAllMapLayers();
            }
        } catch (e) {
            this.props.errorStore!.addError(
                // tslint:disable-next-line:max-line-length
                `Jaettavan linkin ja solmun haussa tapahtui virhe.`,
                e,
            );
        }
        this.setState({ isLoading: false });
    }

    fetchRoutePaths = async (date: Date) => {
        this.setState({
            isLoadingRoutePaths: true,
        });
        const link = this.state.link;
        const routePaths = await RoutePathService.fetchRoutePathsUsingLinkFromDate(
            link!.startNode.id,
            link!.endNode.id,
            link!.transitType!,
            date,
        );
        this.setState({
            routePaths,
            isLoadingRoutePaths: false,
        });
    }

    updateSelectedDate = (date: Date) => {
        this.setState({ selectedDate: date });
        this.fetchRoutePaths(date);
    }

    toggleIsRoutePathSelected = (routePathId: string) => {
        this.setState({
            selectedRoutePathIds: {
                ...this.state.selectedRoutePathIds,
                [routePathId]: !this.state.selectedRoutePathIds[routePathId],
            },
        });
    }

    save = () => {
        const splittedRoutePaths =
            this.state.routePaths
                .filter(rp => Boolean(this.state.selectedRoutePathIds[rp.internalId]));
        // tslint:disable-next-line
        console.log(splittedRoutePaths);
        this.props.alertStore!.setFadeMessage('Linkin jako vielä kehitetään', AlertType.Info);
    }

    selectAllRoutePaths = () => {
        this.setState({
            selectedRoutePathIds:
                this.state.routePaths.reduce<{}>(
                    (acc, curr) => ({ ...acc, [curr.internalId]: true }), {}),
        });
    }

    unselectAllRoutePaths = () => {
        this.setState({
            selectedRoutePathIds: {},
        });
    }

    render() {
        const isSaveButtonDisabled = false;
        if (this.state.isLoading) {
            return (
                <div className={classnames(s.splitLinkView, s.loaderContainer)}>
                    <Loader />
                </div>
            );
        }
        if (!this.state.node || !this.state.link) return null;
        return (
            <div className={s.splitLinkView}>
                <div className={s.content}>
                    <SidebarHeader>
                        Linkin jako solmulla
                    </SidebarHeader>
                    <div className={s.section}>
                        <SplitLinkInfo link={this.state.link} node={this.state.node} />
                    </div>
                    { this.state.node.type === NodeType.STOP &&
                        <div className={s.section}>
                            <InputContainer
                                label='Mistä eteenpäin jaetaan'
                                type='date'
                                value={this.state.selectedDate}
                                onChange={this.updateSelectedDate}
                            />
                        </div>
                    }
                    { this.state.selectedDate &&
                        <div className={classnames(s.section, s.expanded)}>
                            <div className={s.inputLabel}>Mitkä reitinsuunnat jaetaan?</div>
                            <RoutePathSelector
                                toggleIsRoutePathSelected={this.toggleIsRoutePathSelected}
                                routePaths={this.state.routePaths}
                                selectedIds={this.state.selectedRoutePathIds}
                                isLoading={this.state.isLoadingRoutePaths}
                                selectedDate={this.state.selectedDate}
                            />
                            <div className={s.toggleButtons}>
                                <Button onClick={this.selectAllRoutePaths} type={ButtonType.SQUARE}>
                                    Valitse kaikki
                                </Button>
                                <Button
                                    onClick={this.unselectAllRoutePaths}
                                    type={ButtonType.SQUARE}
                                >
                                    Tyhjennä
                                </Button>
                            </div>
                        </div>
                    }
                </div>
                <Button
                    type={ButtonType.SAVE}
                    disabled={isSaveButtonDisabled}
                    onClick={this.save}
                >
                    Jaa linkki
                </Button>
            </div >
        );
    }
}
export default SplitLinkView;
