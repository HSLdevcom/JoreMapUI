import React from 'react';
import classnames from 'classnames';
import * as L from 'leaflet';
import { observer, inject } from 'mobx-react';
import { RouteComponentProps } from 'react-router';
import { MapStore } from '~/stores/mapStore';
import { ErrorStore } from '~/stores/errorStore';
import { LinkStore } from '~/stores/linkStore';
import { NodeStore } from '~/stores/nodeStore';
import { ConfirmStore } from '~/stores/confirmStore';
import RoutePathService from '~/services/routePathService';
import { IRoutePath } from '~/models';
import NodeType from '~/enums/nodeType';
import LinkService from '~/services/linkService';
import NodeService from '~/services/nodeService';
import { NetworkStore } from '~/stores/networkStore';
import Loader from '~/components/shared/loader/Loader';
import { Button } from '~/components/controls';
import ButtonType from '~/enums/buttonType';
import { AlertStore, AlertType } from '~/stores/alertStore';
import LinkFactory from '~/factories/linkFactory';
import SidebarHeader from '../SidebarHeader';
import InputContainer from '../../controls/InputContainer';
import RoutePathSelector from './RoutePathSelector';
import SplitLinkInfo from './SplitLinkInfo';
import * as s from './splitLinkView.scss';

interface ISplitLinkViewState {
    isLoading: boolean;
    selectedDate?: Date;
    selectedRoutePathIds: object;
    routePaths: IRoutePath[];
    isLoadingRoutePaths: boolean;
}

interface ISplitLinkViewProps extends RouteComponentProps<any> {
    mapStore?: MapStore;
    errorStore?: ErrorStore;
    linkStore?: LinkStore;
    nodeStore?: NodeStore;
    alertStore?: AlertStore;
    networkStore?: NetworkStore;
    confirmStore?: ConfirmStore;
}

@inject(
    'mapStore',
    'errorStore',
    'linkStore',
    'nodeStore',
    'alertStore',
    'networkStore',
    'confirmStore'
)
@observer
class SplitLinkView extends React.Component<
    ISplitLinkViewProps,
    ISplitLinkViewState
> {
    constructor(props: ISplitLinkViewProps) {
        super(props);
        this.state = {
            isLoading: false,
            selectedRoutePathIds: {},
            routePaths: [],
            isLoadingRoutePaths: false
        };
    }

    componentDidMount() {
        this.init();
    }

    componentWillUnmount() {
        this.resetToPreviousSelectedMapLayers();
    }

    private hideAllMapLayers = () => {
        this.props.networkStore!.saveMapLayers();
        this.props.networkStore!.hideAllMapLayers();
    };

    private resetToPreviousSelectedMapLayers = () => {
        if (this.props.networkStore!.visibleMapLayers.length === 0) {
            this.props.networkStore!.restoreSavedMapLayers();
        }
    };

    private init = async () => {
        this.setState({ isLoading: true });

        const [
            linkStartNodeId,
            linkEndNodeId,
            linkTransitType,
            nodeId
        ] = this.props.match!.params.id.split(',');
        try {
            if (linkStartNodeId && linkEndNodeId && linkTransitType && nodeId) {
                const link = await LinkService.fetchLink(
                    linkStartNodeId,
                    linkEndNodeId,
                    linkTransitType
                );
                const node = await NodeService.fetchNode(nodeId);
                this.props.linkStore!.setLink(link);
                this.props.linkStore!.setIsLinkGeometryEditable(false);
                this.props.linkStore!.setNodes([node]);
                const bounds = L.latLngBounds(link.geometry);
                bounds.extend(node.coordinates);
                this.props.mapStore!.setMapBounds(bounds);
                this.hideAllMapLayers();
            }
        } catch (e) {
            this.props.errorStore!.addError(
                `Jaettavan linkin ja solmun haussa tapahtui virhe.`,
                e
            );
        }
        this.setState({ isLoading: false });
    };

    private fetchRoutePaths = async (date: Date) => {
        if (!date) return;
        this.setState({
            isLoadingRoutePaths: true
        });
        const link = this.props.linkStore!.link;
        const routePaths = await RoutePathService.fetchRoutePathsUsingLinkFromDate(
            link!.startNode.id,
            link!.endNode.id,
            link!.transitType!,
            date
        );
        this.setState({
            routePaths,
            isLoadingRoutePaths: false
        });
    };

    private updateSelectedDate = (date: Date) => {
        this.setState({ selectedDate: date });
        this.unselectAllRoutePaths();
        this.fetchRoutePaths(date);
    };

    private toggleIsRoutePathSelected = (routePathId: string) => {
        this.setState({
            selectedRoutePathIds: {
                ...this.state.selectedRoutePathIds,
                [routePathId]: !this.state.selectedRoutePathIds[routePathId]
            }
        });
    };

    private openSaveConfirm = () => {
        let confirmText =
            'Oletko varma, että haluat jakaa tämän linkin? Tätä toimenpidettä ei pysty peruutamaan tämän varmistuksen jälkeen.';
        if (this.getNode()!.type === NodeType.STOP && this.state.selectedDate) {
            confirmText = `${confirmText} Toimenpide vaikuttaa yhteensä ${
                this.getRoutepathsBeingSplit().length
            } reitinsuuntaan.`;
        } else {
            confirmText = `${confirmText} Tämä toimenpide vaikuttaa kaikkiin tätä linkkiä käyttäviin reitinsuuntiin.`;
        }
        this.props.confirmStore!.openConfirm(confirmText, this.save);
    };

    private save = () => {
        const startNode = this.props.linkStore!.link.startNode;
        const endNode = this.props.linkStore!.link.endNode;
        const intermediateNode = this.props.linkStore!.nodes[0];
        const startLink = LinkFactory.createNewLink(
            startNode,
            intermediateNode
        );
        const endLink = LinkFactory.createNewLink(intermediateNode, endNode);
        endLink.transitType = this.props.linkStore!.link.transitType;
        startLink.transitType = this.props.linkStore!.link.transitType;
        // tslint:disable-next-line
        LinkService.createLinksBySplitting(
            this.props.linkStore!.link,
            this.props.linkStore!.nodes[0],
            this.state.selectedDate!,
            [startLink, endLink]
        );
        this.props.alertStore!.setFadeMessage(
            'Linkin jaon kehitys kesken.',
            AlertType.Info
        );
    };

    private selectAllRoutePaths = () => {
        this.setState({
            selectedRoutePathIds: this.state.routePaths.reduce<{}>(
                (acc, curr) => ({ ...acc, [curr.internalId]: true }),
                {}
            )
        });
    };

    private unselectAllRoutePaths = () => {
        this.setState({
            selectedRoutePathIds: {}
        });
    };

    private getNode = () => {
        return this.props.linkStore!.nodes.length > 0
            ? this.props.linkStore!.nodes[0]
            : null;
    };

    private getRoutepathsBeingSplit = () => {
        return this.state.routePaths.filter(rp =>
            Boolean(this.state.selectedRoutePathIds[rp.internalId])
        );
    };

    render() {
        const isSaveButtonDisabled =
            this.state.selectedDate &&
            this.getRoutepathsBeingSplit().length === 0;
        const node = this.getNode();

        const link = this.props.linkStore!.link;
        if (this.state.isLoading) {
            return (
                <div className={classnames(s.splitLinkView, s.loaderContainer)}>
                    <Loader />
                </div>
            );
        }
        if (!node || !link) return null;
        return (
            <div className={s.splitLinkView}>
                <div className={s.content}>
                    <SidebarHeader>Linkin jako solmulla</SidebarHeader>
                    <div className={s.section}>
                        <SplitLinkInfo link={link} node={node} />
                    </div>
                    {node.type === NodeType.STOP && (
                        <div className={s.section}>
                            <InputContainer
                                label='Mistä eteenpäin jaetaan?'
                                type='date'
                                value={this.state.selectedDate}
                                onChange={this.updateSelectedDate}
                                isClearButtonVisibleOnDates={true}
                            />
                        </div>
                    )}
                    {!this.state.selectedDate &&
                        node.type === NodeType.STOP && (
                            <div className={s.section}>
                                Tyhjä päivämäärä jakaa kaikki reitinsuunnat.
                            </div>
                        )}
                    {this.state.selectedDate && (
                        <div className={classnames(s.section, s.expanded)}>
                            <div className={s.inputLabel}>
                                Mitkä reitinsuunnat jaetaan?
                            </div>
                            <RoutePathSelector
                                toggleIsRoutePathSelected={
                                    this.toggleIsRoutePathSelected
                                }
                                routePaths={this.state.routePaths}
                                selectedIds={this.state.selectedRoutePathIds}
                                isLoading={this.state.isLoadingRoutePaths}
                                selectedDate={this.state.selectedDate}
                            />
                            <div className={s.toggleButtons}>
                                <Button
                                    onClick={this.selectAllRoutePaths}
                                    type={ButtonType.SQUARE}
                                >
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
                    )}
                </div>
                <Button
                    type={ButtonType.SAVE}
                    disabled={isSaveButtonDisabled}
                    onClick={this.openSaveConfirm}
                >
                    Jaa linkki
                </Button>
            </div>
        );
    }
}
export default SplitLinkView;
