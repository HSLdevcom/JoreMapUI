import { LatLng } from 'leaflet';
import _ from 'lodash';
import { action, computed, observable, reaction } from 'mobx';
import NodeType from '~/enums/nodeType';
import NodeStopFactory from '~/factories/nodeStopFactory';
import { ILink, INode, IStop, IStopArea } from '~/models';
import IHastusArea from '~/models/IHastusArea';
import nodeValidationModel, {
    nodeIdEditingValidationModel,
    INodeValidationModel,
} from '~/models/validationModels/nodeValidationModel';
import stopValidationModel, {
    IStopValidationModel,
} from '~/models/validationModels/stopValidationModel';
import GeocodingService, { IGeoJSONFeature } from '~/services/geocodingService';
import GeometryUndoStore from '~/stores/geometryUndoStore';
import NodeLocationType from '~/types/NodeLocationType';
import { roundLatLng, roundLatLngs } from '~/utils/geomUtils';
import FormValidator from '~/validation/FormValidator';
import CodeListStore from './codeListStore';
import NavigationStore from './navigationStore';
import ValidationStore, { ICustomValidatorMap } from './validationStore';

interface UndoState {
    node: INode;
    links: ILink[];
}

interface INodeCacheObj {
    node: INode;
    links: ILink[];
    isNodeIdEditable: boolean;
}

interface INodeCache {
    newNodeCache: INodeCacheObj | null; // Have slot for new node in its own property because new node's dont have id
    [nodeId: string]: INodeCacheObj | null;
}

class NodeStore {
    @observable private _links: ILink[];
    @observable private _node: INode | null;
    @observable private _oldNode: INode | null;
    @observable private _oldLinks: ILink[];
    @observable private _hastusArea: IHastusArea | null;
    @observable private _oldHastusArea: IHastusArea | null;
    @observable private _isEditingDisabled: boolean;
    @observable private _nodeCache: INodeCache;
    @observable private _stopAreas: IStopArea[];
    @observable private _isNodeIdEditable: boolean;
    private _geometryUndoStore: GeometryUndoStore<UndoState>;
    private _nodeValidationStore: ValidationStore<INode, INodeValidationModel>;
    private _stopValidationStore: ValidationStore<IStop, IStopValidationModel>;

    // Constructor
    @action
    public initialize = () => {
        this._links = [];
        this._node = null;
        this._oldNode = null;
        this._oldLinks = [];
        this._geometryUndoStore = new GeometryUndoStore();
        this._nodeValidationStore = new ValidationStore();
        this._stopValidationStore = new ValidationStore();
        this._isEditingDisabled = true;
        this._nodeCache = {
            newNodeCache: null,
        };
        reaction(
            () => this.isDirty && !this._isEditingDisabled,
            (value: boolean) => NavigationStore.setShouldShowUnsavedChangesPrompt(value)
        );
        reaction(
            () => this._node && this._node.stop && this._node.stop.stopAreaId,
            (value: string) => this.onStopAreaChange(value)
        );
        reaction(
            () => this._stopAreas,
            () => this.onStopAreasChange()
        );
        reaction(() => this._isEditingDisabled, this.onChangeIsEditingDisabled);
    };

    @computed
    get links() {
        return this._links;
    }

    @computed
    get oldLinks() {
        return this._oldLinks;
    }

    @computed
    get node() {
        return this._node!;
    }

    @computed
    get oldNode() {
        return this._oldNode!;
    }

    @computed
    get hastusArea() {
        return this._hastusArea!;
    }

    @computed
    get oldHastusArea() {
        return this._oldHastusArea;
    }

    @computed
    get isDirty() {
        return !_.isEqual(this._node, this._oldNode) || !_.isEqual(this._links, this._oldLinks);
    }

    @computed
    get isEditingDisabled() {
        return this._isEditingDisabled;
    }

    @computed
    get stopAreas() {
        return this._stopAreas;
    }

    @computed
    get isNodeIdEditable() {
        return this._isNodeIdEditable;
    }

    @computed
    get isNodeFormValid() {
        return this._nodeValidationStore.isValid();
    }

    @computed
    get nodeInvalidPropertiesMap() {
        return this._nodeValidationStore.getInvalidPropertiesMap();
    }

    @computed
    get isStopFormValid() {
        return this._stopValidationStore.isValid();
    }

    @computed
    get stopInvalidPropertiesMap() {
        return this._stopValidationStore.getInvalidPropertiesMap();
    }

    @action
    public init = ({
        node,
        links,
        isNewNode,
        oldNode,
        oldLinks,
    }: {
        node: INode;
        links: ILink[];
        isNewNode: boolean;
        oldNode?: INode;
        oldLinks?: ILink[];
    }) => {
        const newNode = _.cloneDeep(node);
        const newLinks = _.cloneDeep(links);

        this.clear();
        this.clearNodeCache({ nodeId: node.id, shouldClearNewNodeCache: isNewNode });

        const currentUndoState: UndoState = {
            links: newLinks,
            node: newNode,
        };
        this._geometryUndoStore.addItem(currentUndoState);

        this._node = newNode;
        this._oldNode = oldNode ? oldNode : newNode;
        this._links = newLinks;
        this._oldLinks = oldLinks ? oldLinks : newLinks;
        this._isEditingDisabled = !isNewNode;

        const customValidatorMap: ICustomValidatorMap = {
            beginningOfNodeId: {
                validators: [
                    (node: INode, property: string, beginningOfNodeId: string) => {
                        if (this.isNodeIdEditable) {
                            const validationResult = FormValidator.validateProperty(
                                nodeValidationModel['beginningOfNodeId']!,
                                beginningOfNodeId
                            );
                            return validationResult;
                        }
                        return;
                    },
                ],
            },
            idSuffix: {
                validators: [
                    (node: INode, property: string, idSuffix: string) => {
                        if (this.isNodeIdEditable) {
                            const validationResult = FormValidator.validateProperty(
                                nodeValidationModel['idSuffix']!,
                                idSuffix
                            );
                            return validationResult;
                        }
                        return;
                    },
                ],
            },
            measurementType: {
                validators: [
                    (node: INode, property: string, measurementType: string) => {
                        if (node.type === NodeType.STOP) {
                            const validationResult = FormValidator.validateProperty(
                                'required|min:1|max:1|string',
                                measurementType
                            );
                            return validationResult;
                        }
                        const validationResult = FormValidator.validateProperty(
                            'min:0|max:0|string',
                            measurementType
                        );
                        return validationResult;
                    },
                ],
            },
            type: {
                validators: [],
                dependentProperties: ['measurementType'],
            },
        };

        const _nodeValidationModel = this.isNodeIdEditable
            ? nodeIdEditingValidationModel
            : nodeValidationModel;
        this._nodeValidationStore.init(node, _nodeValidationModel, customValidatorMap);
        if (node.stop) {
            this._stopValidationStore.init(node.stop, stopValidationModel);
        }
    };

    @action
    public updateLinkGeometry = (latLngs: L.LatLng[], index: number) => {
        if (!this._node) throw new Error('Node was null.'); // Should not occur

        const newLinks = _.cloneDeep(this._links);
        newLinks[index].geometry = roundLatLngs(latLngs);
        const currentUndoState: UndoState = {
            links: newLinks,
            node: this._node,
        };
        this._geometryUndoStore.addItem(currentUndoState);

        this._links = newLinks;
    };

    @action
    public updateNodeGeometry = (nodeLocationType: NodeLocationType, newCoordinates: LatLng) => {
        if (!this._node) throw new Error('Node was null.'); // Should not occur

        const newNode = _.cloneDeep(this._node);
        const newLinks = _.cloneDeep(this._links);

        newNode[nodeLocationType] = roundLatLng(newCoordinates);

        if (nodeLocationType === 'coordinates') this.mirrorCoordinates(newNode);

        const coordinatesProjection = newNode.coordinatesProjection;
        // Update the first link geometry of startNodes to coordinatesProjection
        newLinks
            .filter((link) => link.startNode.id === newNode!.id)
            .map((link) => (link.geometry[0] = coordinatesProjection));
        // Update the last link geometry of endNodes to coordinatesProjection
        newLinks
            .filter((link) => link.endNode.id === newNode!.id)
            .map((link) => (link.geometry[link.geometry.length - 1] = coordinatesProjection));

        const currentUndoState: UndoState = {
            links: newLinks,
            node: newNode,
        };
        this._geometryUndoStore.addItem(currentUndoState);

        this._links = newLinks;
        const geometryVariables: NodeLocationType[] = ['coordinates', 'coordinatesProjection'];
        geometryVariables.forEach((coordinateName) =>
            this.updateNodeProperty(coordinateName, newNode[coordinateName])
        );

        if (nodeLocationType === 'coordinatesProjection') {
            this.updateStopPropertiesAccordingToNodeLocation();
        }
    };

    @action
    public updateStopPropertiesAccordingToNodeLocation = async () => {
        const coordinates = this.node.coordinatesProjection;
        const features:
            | IGeoJSONFeature[]
            | null = await GeocodingService.makeDigitransitReverseGeocodingRequest({
            coordinates,
            searchResultCount: 1,
        });

        this.updateAddressData(features);
        this.updateMunicipality(features);
        this.updateSection(features);
    };

    @action
    public mirrorCoordinates = (node: INode) => {
        if (node.type !== NodeType.STOP) {
            node.coordinatesProjection = node.coordinates;
        }
    };

    @action
    public updateAddressData = async (features: IGeoJSONFeature[] | null) => {
        if (!this.node || !this.node.stop) return;

        const coordinates = this.node.coordinatesProjection;
        const addressFi: string = await GeocodingService.fetchStreetNameFromCoordinates(
            coordinates,
            'fi'
        );
        const addressSw: string = await GeocodingService.fetchStreetNameFromCoordinates(
            coordinates,
            'sv'
        );
        let postalNumber = '';
        if (features && features[0]) {
            postalNumber = features[0].properties.postalcode;
        }

        this.updateStopProperty('addressFi', addressFi);
        this.updateStopProperty('addressSw', addressSw);
        this.updateStopProperty('postalNumber', postalNumber);
    };

    @action
    public updateMunicipality = (features: IGeoJSONFeature[] | null) => {
        if (!this.node || !this.node.stop) return;

        const municipality =
            features && features[0] ? features[0].properties.localadmin : undefined;
        const municipalityDropdownItems = CodeListStore.getDropdownItemList('Kunta (KELA)');
        const municipalityCode = municipalityDropdownItems.find(
            (municipalityDropdownItem) => municipalityDropdownItem.label === municipality
        );
        if (municipalityCode) {
            this.updateStopProperty('municipality', municipalityCode.value);
        } else {
            this.updateStopProperty('municipality', '');
        }
    };

    @action
    public updateSection = (features: IGeoJSONFeature[] | null) => {
        if (!this.node || !this.node.stop) return;

        // Format: HSL:A, HSL:B etc.
        const externalSection =
            features &&
            features[0] &&
            features[0].properties.zones &&
            features[0].properties.zones[0]
                ? features[0].properties.zones[0]
                : undefined;
        if (externalSection) {
            const formattedSection = externalSection.replace('HSL:', '');
            this.updateStopProperty('section', formattedSection);
        } else {
            this.updateStopProperty('section', '');
        }
    };

    @action
    public updateNodeProperty = (property: keyof INode, value: string | Date | LatLng) => {
        (this._node as any)[property] = value;
        this._nodeValidationStore.updateProperty(property, value);
    };

    @action
    public updateStopProperty = (property: string, value?: string | number | Date) => {
        if (!this.node) return;
        this._node!.stop![property] = value;
        this._stopValidationStore.updateProperty(property, value);
    };

    @action
    public updateNodeType = (type: NodeType) => {
        this._node!.type = type;
        this._nodeValidationStore.updateProperty('type', type);

        this.mirrorCoordinates(this._node!);

        if (this._node!.type === NodeType.STOP && !this._node!.stop) {
            const stop = NodeStopFactory.createNewStop();
            this._node!.stop = stop;
            this._stopValidationStore.init(stop, stopValidationModel);
        } else {
            // Only node which type is stop has measurementType and measurementDate, remove them if type is not stop
            this.updateNodeProperty('measurementType', '');
            this.updateNodeProperty('measurementDate', '');
        }
    };

    @action
    public setHastusArea = (hastusArea: IHastusArea | null) => {
        this._hastusArea = hastusArea;
    };

    @action
    public setOldHastusArea = (hastusArea: IHastusArea | null) => {
        this._oldHastusArea = hastusArea;
    };

    @action
    public updateHastusAreaProperty = (property: keyof IHastusArea, value: string) => {
        this._hastusArea![property] = value;
    };

    @action
    public setIsEditingDisabled = (isEditingDisabled: boolean) => {
        this._isEditingDisabled = isEditingDisabled;
    };

    @action
    public toggleIsEditingDisabled = () => {
        this._isEditingDisabled = !this._isEditingDisabled;
    };

    @action
    public setCurrentStateIntoNodeCache = ({ isNewNode }: { isNewNode: boolean }) => {
        const nodeId = this._node!.id;
        const nodeCacheObj: INodeCacheObj = {
            node: _.cloneDeep(this._node!),
            links: _.cloneDeep(this._links),
            isNodeIdEditable: this._isNodeIdEditable,
        };
        if (isNewNode) {
            this._nodeCache.newNodeCache = nodeCacheObj;
        } else {
            this._nodeCache[nodeId] = nodeCacheObj;
        }
    };

    @action
    public clearNodeCache = ({
        nodeId,
        shouldClearNewNodeCache,
    }: {
        nodeId?: string;
        shouldClearNewNodeCache?: boolean;
    }) => {
        if (shouldClearNewNodeCache) {
            this._nodeCache.newNodeCache = null;
        }
        if (nodeId) {
            this._nodeCache[nodeId] = null;
        }
    };

    @action
    public setStopAreas = (stopAreas: IStopArea[]) => {
        this._stopAreas = stopAreas;
    };

    @action
    public setIsNodeIdEditable = (isEditable: boolean) => {
        this._isNodeIdEditable = isEditable;
    };

    @action
    public clear = () => {
        this._links = [];
        this._node = null;
        this._oldNode = null;
        this._oldLinks = [];
        this._geometryUndoStore.clear();
        this._nodeValidationStore.clear();
        this._stopValidationStore.clear();
        this._isEditingDisabled = true;
    };

    @action
    public resetChanges = () => {
        if (this._oldNode) {
            this.init({ node: this._oldNode, links: this._oldLinks, isNewNode: false });
        }
    };

    @action
    public undo = () => {
        this._geometryUndoStore.undo((previousUndoState: UndoState) => {
            this._links! = previousUndoState.links;
            this.updateNodeProperty('coordinates', previousUndoState.node.coordinates);
            this.updateNodeProperty(
                'coordinatesProjection',
                previousUndoState.node.coordinatesProjection
            );
        });
    };

    @action
    public redo = () => {
        this._geometryUndoStore.redo((nextUndoState: UndoState) => {
            this._links! = nextUndoState.links;
            this.updateNodeProperty('coordinates', nextUndoState.node.coordinates);
            this.updateNodeProperty(
                'coordinatesProjection',
                nextUndoState.node.coordinatesProjection
            );
        });
    };

    @action
    private onStopAreaChange = (stopAreaId: string) => {
        this.updateStopArea(stopAreaId);
    };

    @action
    private onStopAreasChange = () => {
        const stopAreaId = this.node && this.node.stop && this.node.stop.stopAreaId;
        if (stopAreaId) {
            this.updateStopArea(stopAreaId);
        }
    };

    @action
    private updateStopArea = (stopAreaId?: string) => {
        if (!this._stopAreas) return;

        this.updateStopProperty('stopAreaId', stopAreaId);
        if (!stopAreaId) return;

        const stopArea = this._stopAreas.find((obj) => {
            return obj.id === stopAreaId;
        });
        if (stopArea) {
            this.updateStopProperty('nameFi', stopArea.nameFi);
            this.updateStopProperty('nameSw', stopArea.nameSw);
        }
    };

    public getDirtyLinks() {
        // All links are dirty if the node coordinate has changed
        if (!_.isEqual(this._node!.coordinatesProjection, this._oldNode!.coordinatesProjection)) {
            return this._links;
        }
        return this._links.filter((link) => {
            const oldLink = this._oldLinks.find(
                (oldLink) =>
                    oldLink.transitType === link.transitType &&
                    oldLink.startNode.id === link.startNode.id &&
                    oldLink.endNode.id === link.endNode.id
            );
            return !_.isEqual(link, oldLink);
        });
    }

    public getNodeCacheObjById = (nodeId: string): INodeCacheObj | null => {
        return _.cloneDeep(this._nodeCache[nodeId]);
    };

    public getNewNodeCacheObj = (): INodeCacheObj | null => {
        return _.cloneDeep(this._nodeCache.newNodeCache);
    };

    private onChangeIsEditingDisabled = () => {
        if (this._isEditingDisabled) {
            this.resetChanges();
        } else {
            this._nodeValidationStore.validateAllProperties();
            this._stopValidationStore.validateAllProperties();
        }
    };
}

export default new NodeStore();

export { NodeStore, INodeCacheObj };
