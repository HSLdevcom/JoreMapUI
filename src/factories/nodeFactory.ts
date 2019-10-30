import * as L from 'leaflet';
import NodeMeasurementType from '~/enums/nodeMeasurementType';
import NodeType from '~/enums/nodeType';
import TransitType from '~/enums/transitType';
import { INode } from '~/models';
import { INodeBase } from '~/models/INode';
import IExternalNode from '~/models/externals/IExternalNode';
import { roundLatLng } from '~/util/geomHelpers';
import NodeStopFactory from './nodeStopFactory';

class NodeFactory {
    public static mapExternalNode = (externalNode: IExternalNode): INode => {
        // Use less accurate location if measured location (solomx, solomy) is missing.
        const coordinates = _getLatLng(
            externalNode.geojson ? externalNode.geojson : externalNode.geojsonManual
        );
        const coordinatesManual = _getLatLng(externalNode.geojsonManual);
        const coordinatesProjection = _getLatLng(externalNode.geojsonProjection);
        const nodeStop = externalNode.pysakkiBySoltunnus;
        let transitTypes: TransitType[] = [];
        if (externalNode.transittypes) {
            transitTypes = externalNode.transittypes.split(',') as TransitType[];
        }

        return {
            ...NodeFactory.createNodeBase(externalNode),
            transitTypes,
            coordinates,
            coordinatesManual,
            coordinatesProjection,
            stop: nodeStop ? NodeStopFactory.mapExternalStop(nodeStop) : null,
            measurementDate: externalNode.mittpvm ? new Date(externalNode.mittpvm) : undefined,
            measurementType: externalNode.solotapa,
            modifiedOn: externalNode.solviimpvm ? new Date(externalNode.solviimpvm) : undefined,
            modifiedBy: externalNode.solkuka,
            tripTimePoint: externalNode.solmapiste
        };
    };

    public static createNodeBase = (externalNode: IExternalNode): INodeBase => {
        const type = _getNodeType(externalNode.soltyyppi, externalNode.soltunnus);
        return {
            type,
            shortIdLetter: externalNode.solkirjain,
            shortIdString: externalNode.sollistunnus,
            id: externalNode.soltunnus
        };
    };

    public static createNewNode(coordinates: L.LatLng): INode {
        const newStop = NodeStopFactory.createNewStop();
        return {
            coordinates,
            id: '',
            stop: newStop,
            type: NodeType.STOP,
            transitTypes: [],
            coordinatesManual: coordinates,
            coordinatesProjection: coordinates,
            modifiedOn: new Date(),
            modifiedBy: '',
            tripTimePoint: '0',
            measurementType: NodeMeasurementType.Calculated
        };
    }
}

const _getLatLng = (coordinates: string) => {
    return roundLatLng(L.GeoJSON.coordsToLatLng(JSON.parse(coordinates).coordinates));
};

const _getNodeType = (nodeType: string, nodeId: string) => {
    switch (nodeType) {
        case 'X':
            return NodeType.CROSSROAD;
        case 'P':
            return NodeType.STOP;
        case '-':
            return NodeType.MUNICIPALITY_BORDER;
        default:
            throw new Error(`Solmun (id: '${nodeId}') tyyppi on
                virheellinen: ${nodeType}`);
    }
};

export default NodeFactory;
