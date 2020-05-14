import * as L from 'leaflet';
import { action, computed, observable } from 'mobx';
import constants from '~/constants/constants';
import CoordinateSystem from '~/enums/coordinateSystem';
import Environment from '~/enums/environment';

let INITIAL_COORDINATES: L.LatLng;
if (constants.ENVIRONMENT === Environment.LOCALHOST) {
    INITIAL_COORDINATES = new L.LatLng(60.2148, 24.8384);
} else {
    INITIAL_COORDINATES = new L.LatLng(60.1699, 24.9384);
}
const INITIAL_ZOOM = 15;

enum NodeLabel {
    hastusId,
    longNodeId,
    shortNodeId,
}

enum MapFilter {
    arrowDecorator,
    linkPoint,
}

type MapCursor = '' | 'crosshair';

class MapStore {
    @observable private _coordinates: L.LatLng | null;
    @observable private _displayCoordinateSystem: CoordinateSystem;
    @observable private _isMapFullscreen: boolean;
    @observable private _zoom: number;
    @observable private _selectedNodeId: string | null;
    @observable private _visibleNodeLabels: NodeLabel[];
    @observable private _mapFilters: MapFilter[];
    @observable private _mapBounds: L.LatLngBounds;
    @observable private _mapCursor: MapCursor;

    // Constructor
    @action
    public initialize = () => {
        this._coordinates = null;
        this._displayCoordinateSystem = CoordinateSystem.EPSG4326;
        this._zoom = INITIAL_ZOOM;
        this._isMapFullscreen = false;
        this._visibleNodeLabels = [NodeLabel.hastusId];
        this._mapFilters = [MapFilter.arrowDecorator];
        this._mapCursor = '';
    };

    @computed
    get coordinates(): L.LatLng | null {
        return this._coordinates;
    }

    @computed
    get isMapInteractionRestricted(): boolean {
        return !Boolean(this.coordinates);
    }

    @computed
    get areNetworkLayersHidden(): boolean {
        return this.isMapInteractionRestricted || this.zoom <= constants.MAP_LAYERS_MIN_ZOOM_LEVEL;
    }

    @computed
    get displayCoordinateSystem(): CoordinateSystem {
        return this._displayCoordinateSystem;
    }

    @computed
    get zoom(): number {
        return this._zoom;
    }

    @computed
    get isMapFullscreen(): boolean {
        return this._isMapFullscreen;
    }

    @computed
    get selectedNodeId() {
        return this._selectedNodeId;
    }

    @computed
    get visibleNodeLabels() {
        return this._visibleNodeLabels;
    }

    @computed
    get mapBounds() {
        return this._mapBounds;
    }

    @computed
    get mapCursor() {
        return this._mapCursor;
    }

    public isMapFilterEnabled = (mapFilter: MapFilter) => {
        return this._mapFilters.includes(mapFilter);
    };

    @action
    public setMapBounds = (bounds: L.LatLngBounds) => {
        this._mapBounds = bounds;
    };

    @action
    public setCoordinates = (coordinates: L.LatLng | null) => {
        this._coordinates = coordinates;
    };

    @action
    public setZoom = (zoom: number) => {
        this._zoom = zoom;
    };

    @action
    public initCoordinates = () => {
        if (!this._coordinates) {
            this._coordinates = INITIAL_COORDINATES;
        }
    };

    @action
    public toggleMapFullscreen = () => {
        this._isMapFullscreen = !this._isMapFullscreen;
    };

    @action
    public setDisplayCoordinateSystem = (value: CoordinateSystem) => {
        this._displayCoordinateSystem = value;
    };

    @action
    public setSelectedNodeId = (id: string | null) => {
        this._selectedNodeId = id;
    };

    @action
    public toggleNodeLabelVisibility = (nodeLabel: NodeLabel) => {
        if (this._visibleNodeLabels.includes(nodeLabel)) {
            this._visibleNodeLabels = this._visibleNodeLabels.filter((t) => t !== nodeLabel);
        } else {
            // Need to do concat (instead of push) to trigger observable reaction
            this._visibleNodeLabels = this._visibleNodeLabels.concat([nodeLabel]);
        }
    };

    @action
    public toggleMapFilter = (mapFilter: MapFilter) => {
        if (this._mapFilters.includes(mapFilter)) {
            this._mapFilters = this._mapFilters.filter((mF) => mF !== mapFilter);
        } else {
            // Need to do concat (instead of push) to trigger observable reaction
            this._mapFilters = this._mapFilters.concat([mapFilter]);
        }
    };

    @action
    public setMapCursor = (mapCursor: MapCursor) => {
        this._mapCursor = mapCursor;
    };

    public isNodeLabelVisible = (nodeLabel: NodeLabel) => {
        return this._visibleNodeLabels.includes(nodeLabel);
    };
}

export default new MapStore();

export { MapStore, NodeLabel, MapFilter, MapCursor };
