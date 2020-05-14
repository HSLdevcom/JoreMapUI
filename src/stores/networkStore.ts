import { action, computed, observable } from 'mobx';
import Moment from 'moment';
import TransitType from '~/enums/transitType';
import LocalStorageHelper from '~/helpers/LocalStorageHelper';

enum NodeSize {
    normal,
    large,
}

enum MapLayer {
    node = 'node',
    link = 'link',
    linkPoint = 'linkPoint',
    unusedNode = 'unusedNode',
    unusedLink = 'unusedLink',
}

class NetworkStore {
    @observable private _selectedTransitTypes: TransitType[];
    @observable private _selectedDate: Moment.Moment | null;
    @observable private _visibleMapLayers: MapLayer[];
    @observable private _nodeSize: NodeSize;
    private _savedMapLayers: MapLayer[];

    // Constructor
    @action
    public initialize = () => {
        this._selectedTransitTypes = this.getInitialVisibleTransitTypes();
        this._visibleMapLayers = this.getInitialVisibleMapLayers();
        this._nodeSize = NodeSize.normal;
        this._savedMapLayers = [];
        this._selectedDate = Moment();
    };

    @computed
    get selectedTransitTypes() {
        return this._selectedTransitTypes;
    }

    @computed
    get selectedDate(): Moment.Moment | null {
        return this._selectedDate;
    }

    @action
    public setSelectedDate = (value: Moment.Moment | null) => {
        this._selectedDate = value;
    };

    @computed
    get nodeSize(): NodeSize {
        return this._nodeSize;
    }

    @computed
    get visibleMapLayers() {
        return this._visibleMapLayers;
    }

    @computed
    get isMapLayersVisible(): boolean {
        return this._visibleMapLayers && this._visibleMapLayers.length !== 0;
    }

    public isMapLayerVisible = (mapLayer: MapLayer) => {
        return this._visibleMapLayers.includes(mapLayer);
    };

    @action
    public setVisibleMapLayers = (layers: MapLayer[]) => {
        this._visibleMapLayers = layers;
    };

    @action
    public toggleMapLayerVisibility = (mapLayer: MapLayer) => {
        if (this._visibleMapLayers.includes(mapLayer)) {
            this.hideMapLayer(mapLayer);
            _setLocalStorageLayerVisibility({ mapLayer, isVisible: false });
        } else {
            this.showMapLayer(mapLayer);
            _setLocalStorageLayerVisibility({ mapLayer, isVisible: true });
        }
    };

    @action
    public showMapLayer = (mapLayer: MapLayer) => {
        // Need to do concat (instead of push) to trigger observable reaction
        this._visibleMapLayers = this._visibleMapLayers.concat([mapLayer]);
    };

    @action
    public hideAllMapLayers = () => {
        this._visibleMapLayers = [];
    };

    @action
    public hideMapLayer = (mapLayer: MapLayer) => {
        this._visibleMapLayers = this._visibleMapLayers.filter((mL) => mL !== mapLayer);
    };

    @action
    public setSelectedTransitTypes = (types: TransitType[]) => {
        this._selectedTransitTypes = types;
    };

    @action
    public setNodeSize = (nodeSize: NodeSize) => {
        this._nodeSize = nodeSize;
    };

    @action
    public toggleSelectedTransitType = (transitType: TransitType) => {
        if (this._selectedTransitTypes.includes(transitType)) {
            this._selectedTransitTypes = this._selectedTransitTypes.filter(
                (t) => t !== transitType
            );
            _setLocalStorageTransitTypeVisibility({ transitType, isVisible: false });
        } else {
            // Need to do concat (instead of push) to trigger observable reaction
            this._selectedTransitTypes = this._selectedTransitTypes.concat([transitType]);
            _setLocalStorageTransitTypeVisibility({ transitType, isVisible: true });
        }
    };

    @action
    public restoreSavedMapLayers() {
        this.setVisibleMapLayers(this._savedMapLayers);
        this._savedMapLayers = [];
    }

    @action
    public saveMapLayers() {
        this._savedMapLayers = this._visibleMapLayers;
    }

    private getInitialVisibleMapLayers = () => {
        const localStorageVisibleLayers = LocalStorageHelper.getItem('visible_layers');
        const layers: MapLayer[] = [];
        if (!Array.isArray(localStorageVisibleLayers)) return [];

        const addLayer = (layer: MapLayer) => {
            if (localStorageVisibleLayers.includes(layer)) {
                layers.push(layer);
            }
        };
        addLayer(MapLayer.node);
        addLayer(MapLayer.link);
        addLayer(MapLayer.unusedNode);
        addLayer(MapLayer.unusedLink);

        return layers;
    };

    private getInitialVisibleTransitTypes = () => {
        const localStorageVisibleLayers = LocalStorageHelper.getItem('visible_transitTypes');
        const transitTypes: TransitType[] = [];
        if (!Array.isArray(localStorageVisibleLayers)) return [];

        const addTransitType = (transitType: TransitType) => {
            if (localStorageVisibleLayers.includes(transitType)) {
                transitTypes.push(transitType);
            }
        };
        addTransitType(TransitType.BUS);
        addTransitType(TransitType.FERRY);
        addTransitType(TransitType.SUBWAY);
        addTransitType(TransitType.TRAIN);
        addTransitType(TransitType.TRAM);

        return transitTypes;
    };
}

const _setLocalStorageLayerVisibility = ({
    mapLayer,
    isVisible,
}: {
    mapLayer: MapLayer;
    isVisible: boolean;
}) => {
    if (mapLayer === 'linkPoint') {
        return;
    }

    const localStorageVisibleLayers = LocalStorageHelper.getItem('visible_layers');
    let layers: string[] = Array.isArray(localStorageVisibleLayers)
        ? localStorageVisibleLayers
        : [];
    if (isVisible) {
        if (!layers.includes(mapLayer)) {
            layers.push(mapLayer);
        }
    } else {
        layers = layers.filter((l) => l !== mapLayer);
    }
    LocalStorageHelper.setItem('visible_layers', layers);
};

const _setLocalStorageTransitTypeVisibility = ({
    transitType,
    isVisible,
}: {
    transitType: TransitType;
    isVisible: boolean;
}) => {
    const localStorageVisibleTransitTypes = LocalStorageHelper.getItem('visible_transitTypes');
    let transitTypes: string[] = Array.isArray(localStorageVisibleTransitTypes)
        ? localStorageVisibleTransitTypes
        : [];
    if (isVisible) {
        if (!transitTypes.includes(transitType)) {
            transitTypes.push(transitType);
        }
    } else {
        transitTypes = transitTypes.filter((t) => t !== transitType);
    }
    LocalStorageHelper.setItem('visible_transitTypes', transitTypes);
};

export default new NetworkStore();

export { NetworkStore, NodeSize, MapLayer };
