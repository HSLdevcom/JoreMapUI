import * as L from 'leaflet';
import _ from 'lodash';
import { inject, observer } from 'mobx-react';
import * as React from 'react';
import { match } from 'react-router';
import SavePrompt, { ISaveModel, ITextModel } from '~/components/overlays/SavePrompt';
import RoutePathList from '~/components/shared/RoutePathList';
import SaveButton from '~/components/shared/SaveButton';
import Loader from '~/components/shared/loader/Loader';
import NodeType from '~/enums/nodeType';
import NodeFactory from '~/factories/nodeFactory';
import EventHelper from '~/helpers/EventHelper';
import { ILink, INode, IRoutePath } from '~/models';
import navigator from '~/routing/navigator';
import QueryParams from '~/routing/queryParams';
import routeBuilder from '~/routing/routeBuilder';
import SubSites from '~/routing/subSites';
import LinkService from '~/services/linkService';
import NodeService from '~/services/nodeService';
import RoutePathService from '~/services/routePathService';
import { AlertStore } from '~/stores/alertStore';
import { ConfirmStore } from '~/stores/confirmStore';
import { ErrorStore } from '~/stores/errorStore';
import { MapStore } from '~/stores/mapStore';
import { INodeCacheObj, NodeStore } from '~/stores/nodeStore';
import NodeLocationType from '~/types/NodeLocationType';
import SidebarHeader from '../SidebarHeader';
import NodeForm from './NodeForm';
import StopView from './StopView';
import * as s from './nodeView.scss';

interface INodeViewProps {
    isNewNode: boolean;
    match?: match<any>;
    alertStore?: AlertStore;
    nodeStore?: NodeStore;
    mapStore?: MapStore;
    errorStore?: ErrorStore;
    confirmStore?: ConfirmStore;
}

interface INodeViewState {
    isLoading: boolean;
    isRoutePathsUsingNodeQueryLoading: boolean;
    routePathsUsingNode: IRoutePath[];
}

@inject('alertStore', 'nodeStore', 'mapStore', 'errorStore', 'confirmStore')
@observer
class NodeView extends React.Component<INodeViewProps, INodeViewState> {
    private _isMounted: boolean;
    constructor(props: INodeViewProps) {
        super(props);
        this.state = {
            isLoading: true,
            isRoutePathsUsingNodeQueryLoading: false,
            routePathsUsingNode: [],
        };
    }

    private _setState = (newState: object) => {
        if (this._isMounted) {
            this.setState(newState);
        }
    };

    async componentDidMount() {
        this._isMounted = true;
        const params = this.props.match!.params.id;
        this._setState({ isLoading: true });
        this.props.nodeStore!.setIsEditingDisabled(!this.props.isNewNode);
        this.props.nodeStore!.setIsNodeIdEditable(false);
        if (this.props.isNewNode) {
            await this.createNewNode(params);
        } else {
            await this.initExistingNode(params);
        }
        this._setState({ isLoading: false });
        EventHelper.on('geometryChange', () => this.props.nodeStore!.setIsEditingDisabled(false));
    }

    async componentDidUpdate(prevProps: INodeViewProps) {
        const params = this.props.match!.params.id;
        if (prevProps.match!.params.id !== params) {
            this._setState({ isLoading: true });
            this.props.nodeStore!.setIsNodeIdEditable(false);
            if (this.props.isNewNode) {
                await this.createNewNode(params);
            } else {
                await this.initExistingNode(params);
            }
            this._setState({ isLoading: false });
        }
    }

    componentWillUnmount() {
        this._isMounted = false;
        this.props.nodeStore!.clear();
        this.props.mapStore!.setSelectedNodeId(null);
        EventHelper.off('geometryChange', () => this.props.nodeStore!.setIsEditingDisabled(false));
    }

    private createNewNode = async (params: any) => {
        const createNode = async () => {
            const [lat, lng] = params.split(':');
            const coordinate = new L.LatLng(lat, lng);
            const node = NodeFactory.createNewNode(coordinate);
            this.centerMapToNode(node, []);
            node.id = await this.fetchNodeId(node);
            this.props.nodeStore!.activate({ node, links: [], isNewNode: true });
            this.updateSelectedStopAreaId();
        };

        const nodeCacheObj: INodeCacheObj | null = this.props.nodeStore!.getNewNodeCacheObj();
        if (nodeCacheObj) {
            this.showNodeCachePrompt({ nodeCacheObj, promptCancelCallback: createNode });
        } else {
            await createNode();
        }
        this._setState({ isLoading: false });
    };

    private fetchNodeId = async (node: INode) => {
        const nodeId = await NodeService.fetchAvailableNodeId({ node });
        if (!nodeId) {
            this.props.alertStore!.setNotificationMessage({
                message:
                    'Solmun tunnuksen automaattinen generointi epäonnistui, koska aluedatasta ei löytynyt tarvittavia tietoja tai solmutunnusten avaruus on loppunut. Valitse solmun tyyppi, syötä solmun tunnus kenttään ensimmäiset 4 solmutunnuksen numeroa ja valitse lopuksi solmun tunnuksen viimeiset 2 juoksevaa numeroa.',
            });
            this.props.nodeStore!.setIsNodeIdEditable(true);
            return '';
        }
        return nodeId;
    };

    private initExistingNode = async (nodeId: string) => {
        const nodeStore = this.props.nodeStore!;
        this._setState({ isLoading: true });
        nodeStore.clear();

        const node = await NodeService.fetchNode(nodeId);
        if (!node) {
            this.props.errorStore!.addError(`Solmun ${nodeId} haku ei onnistunut.`);
            const homeViewLink = routeBuilder.to(SubSites.home).toLink();
            navigator.goTo({ link: homeViewLink });
            return;
        }
        const links = await this.fetchLinksForNode(node);
        const nodeCacheObj: INodeCacheObj | null = nodeStore.getNodeCacheObjById(nodeId);
        if (nodeCacheObj) {
            this.showNodeCachePrompt({
                nodeCacheObj,
                promptCancelCallback: async () => {
                    this.initNode(node!, links!);
                    this.updateSelectedStopAreaId();
                },
                oldNode: node!,
                oldLinks: links!,
            });
        } else {
            this.initNode(node!, links!);
            this.updateSelectedStopAreaId();
        }
        this.fetchRoutePathsUsingNode(node.id);
        this._setState({ isLoading: false });
    };

    private initNode = (node: INode, links: ILink[], oldNode?: INode, oldLinks?: ILink[]) => {
        if (!this._isMounted) return;

        this.props.mapStore!.setSelectedNodeId(node.id);
        this.centerMapToNode(node, links);
        this.props.nodeStore!.activate({
            node,
            links,
            oldNode,
            oldLinks,
            isNewNode: this.props.isNewNode,
        });
    };

    private showNodeCachePrompt = ({
        nodeCacheObj,
        promptCancelCallback,
        oldNode,
        oldLinks,
    }: {
        nodeCacheObj: INodeCacheObj;
        promptCancelCallback: Function;
        oldNode?: INode;
        oldLinks?: ILink[];
    }) => {
        const nodeStore = this.props.nodeStore;
        this.props.confirmStore!.openConfirm({
            content:
                'Välimuistista löytyi tallentamaton solmu. Palautetaanko tallentamattoman solmun tiedot ja jatketaan muokkausta?',
            onConfirm: async () => {
                this.initNode(nodeCacheObj.node, nodeCacheObj.links, oldNode, oldLinks);
                this.updateSelectedStopAreaId();
                nodeStore!.setIsNodeIdEditable(nodeCacheObj.isNodeIdEditable);
                nodeStore!.setIsEditingDisabled(false);
                this._setState({ isLoading: false });
            },
            onCancel: async () => await promptCancelCallback(),
        });
    };

    private updateSelectedStopAreaId = () => {
        const nodeStore = this.props.nodeStore!;
        const stopAreaIdQueryParam = navigator.getQueryParam(QueryParams.stopAreaId);
        const stopAreaId = stopAreaIdQueryParam ? stopAreaIdQueryParam[0] : undefined;

        if (stopAreaId) {
            if (nodeStore.node?.stop?.stopAreaId !== stopAreaId) {
                nodeStore.setIsEditingDisabled(false);
            }
            nodeStore!.updateStopProperty('stopAreaId', stopAreaId);
        }
    };

    private async fetchLinksForNode(node: INode) {
        try {
            return await LinkService.fetchLinksWithStartNodeOrEndNode(node.id);
        } catch (e) {
            this.props.errorStore!.addError(
                `Haku löytää linkkejä, joilla lnkalkusolmu tai lnkloppusolmu on ${node.id} (soltunnus), ei onnistunut.`,
                e
            );
            return null;
        }
    }

    private fetchRoutePathsUsingNode = async (nodeId: string) => {
        this._setState({ isRoutePathsUsingNodeQueryLoading: true });
        const routePaths = await RoutePathService.fetchRoutePathsUsingNode(nodeId);
        this._setState({
            isRoutePathsUsingNodeQueryLoading: false,
            routePathsUsingNode: routePaths,
        });
    };

    private centerMapToNode = (node: INode, links: ILink[]) => {
        let latLngs: L.LatLng[] = [node.coordinates, node.coordinatesProjection];
        links.forEach((link: ILink) => {
            latLngs = latLngs.concat(link.geometry);
        });
        const bounds = L.latLngBounds(latLngs);
        this.props.mapStore!.setMapBounds(bounds);
    };

    private save = async () => {
        this._setState({ isLoading: true });

        const nodeStore = this.props.nodeStore!;
        try {
            if (this.props.isNewNode) {
                const nodeId = await NodeService.createNode(nodeStore.node);
                const nodeViewLink = routeBuilder
                    .to(SubSites.node)
                    .toTarget(':id', nodeId)
                    .toLink();
                navigator.goTo({
                    link: nodeViewLink,
                    shouldSkipUnsavedChangesPrompt: true,
                });
                nodeStore.clearNodeCache({ shouldClearNewNodeCache: true });
            } else {
                await NodeService.updateNode(nodeStore.node, nodeStore.getDirtyLinks());
                nodeStore.clearNodeCache({ nodeId: nodeStore.node.id });
                this.initExistingNode(nodeStore.node.id);
                nodeStore.setIsEditingDisabled(true);
            }
            this.props.alertStore!.setFadeMessage({ message: 'Tallennettu!' });
        } catch (e) {
            this.props.errorStore!.addError(`Tallennus epäonnistui`, e);
        }
    };

    private showSavePrompt = () => {
        const nodeStore = this.props.nodeStore!;
        const currentNode = _.cloneDeep(nodeStore.node);
        const oldNode = _.cloneDeep(nodeStore.oldNode);
        const currentStop = _.cloneDeep(currentNode.stop);
        const oldStop = _.cloneDeep(oldNode.stop);
        const currentLinks = _.cloneDeep(nodeStore.links);
        const oldLinks = _.cloneDeep(nodeStore.oldLinks);

        // Create node save model
        if (currentStop) {
            delete currentNode['stop'];
            delete oldNode['stop'];

            if (
                currentNode.type === NodeType.CROSSROAD ||
                currentNode.type === NodeType.MUNICIPALITY_BORDER
            ) {
                delete currentNode['measurementType'];
                delete currentNode['coordinatesProjection'];
            }
        }
        const saveModels: (ISaveModel | ITextModel)[] = [
            {
                type: 'saveModel',
                subTopic: 'Solmu',
                newData: currentNode,
                oldData: oldNode,
                model: 'node',
            },
        ];

        if (!_.isEqual(currentLinks, oldLinks)) {
            const textModel: ITextModel = {
                type: 'textModel',
                subTopic: 'Linkit',
                oldText: 'Vanhat linkit',
                newText: 'Uudet linkit',
            };
            saveModels.push(textModel);
        }

        // Create stop save model
        if (currentStop && currentNode.type === NodeType.STOP) {
            // Generate stopArea label values for savePrompt
            currentStop.stopAreaId = `${currentStop.stopAreaId} - ${currentStop.nameFi}`;
            if (oldStop && oldStop.stopAreaId) {
                oldStop.stopAreaId = `${oldStop.stopAreaId} - ${oldStop.nameFi}`;
            }
            const stopSaveModel: ISaveModel = {
                type: 'saveModel',
                subTopic: 'Pysäkin tiedot',
                newData: currentStop!,
                oldData: oldStop!,
                model: 'stop',
            };
            saveModels.push(stopSaveModel);
        }

        this.props.confirmStore!.openConfirm({
            content: <SavePrompt models={saveModels} />,
            onConfirm: () => {
                this.save();
            },
        });
    };

    private onChangeNodeGeometry = (property: NodeLocationType) => (value: L.LatLng) => {
        this.props.nodeStore!.updateNodeGeometry(property, value);
    };

    private onChangeNodeProperty = (property: keyof INode) => (value: any) => {
        this.props.nodeStore!.updateNodeProperty(property, value);
    };

    private onChangeNodeType = async (type: NodeType) => {
        this.props.nodeStore!.updateNodeType(type);
    };

    render() {
        const nodeStore = this.props.nodeStore!;
        const node = nodeStore.node;
        if (this.state.isLoading || !node) {
            return (
                <div className={s.nodeView}>
                    <Loader />
                </div>
            );
        }
        const isNewNode = this.props.isNewNode;
        const isEditingDisabled = nodeStore.isEditingDisabled;
        const isNodeIdEditable = nodeStore.isNodeIdEditable;
        const invalidPropertiesMap = nodeStore.nodeInvalidPropertiesMap;
        const isNodeFormInvalid = !nodeStore.isNodeFormValid;
        const isStopFormInvalid = node.type === NodeType.STOP && !nodeStore.isStopFormValid;
        const isSaveButtonDisabled =
            isEditingDisabled || !nodeStore.isDirty || isNodeFormInvalid || isStopFormInvalid;
        return (
            <div className={s.nodeView} data-cy='nodeView'>
                <div className={s.content}>
                    <SidebarHeader
                        isEditButtonVisible={!isNewNode}
                        isBackButtonVisible={true}
                        isCloseButtonVisible={true}
                        isEditing={!isEditingDisabled}
                        onEditButtonClick={nodeStore.toggleIsEditingDisabled}
                    >
                        {isNewNode ? 'Luo uusi solmu' : `Solmu ${node.id}`}
                    </SidebarHeader>
                    <NodeForm
                        node={node}
                        isNewNode={isNewNode}
                        isEditingDisabled={isEditingDisabled}
                        isNodeIdEditable={isNodeIdEditable}
                        invalidPropertiesMap={invalidPropertiesMap}
                        onChangeNodeGeometry={this.onChangeNodeGeometry}
                        onChangeNodeProperty={this.onChangeNodeProperty}
                        onChangeNodeType={this.onChangeNodeType}
                    />
                    {node.type === NodeType.STOP && node.stop && (
                        <StopView
                            node={node}
                            onNodePropertyChange={this.onChangeNodeProperty}
                            isNewStop={isNewNode}
                            nodeInvalidPropertiesMap={invalidPropertiesMap}
                        />
                    )}
                    {!isNewNode && this.state.isRoutePathsUsingNodeQueryLoading ? (
                        <Loader size={'small'} />
                    ) : (
                        <RoutePathList
                            className={s.routePathList}
                            topic={'Solmua käyttävät reitinsuunnat'}
                            routePaths={this.state.routePathsUsingNode}
                        />
                    )}
                </div>
                <SaveButton
                    onClick={() => (isNewNode ? this.save() : this.showSavePrompt())}
                    disabled={isSaveButtonDisabled}
                    savePreventedNotification={''}
                >
                    {isNewNode ? 'Luo uusi solmu' : 'Tallenna muutokset'}
                </SaveButton>
            </div>
        );
    }
}

export default NodeView;
