import * as L from 'leaflet';
import { ILink, INode } from '~/models';
import { ILinkMapHighlight } from '~/models/ILink';
import IExternalLink from '~/models/externals/IExternalLink';
import { roundLatLngs } from '~/utils/geomUtils';
import NodeFactory from './nodeFactory';

class LinkFactory {
    public static mapExternalLink = (externalLink: IExternalLink): ILink => {
        const geojson = JSON.parse(externalLink.geojson);
        const latLngs: L.LatLng[] = L.GeoJSON.coordsToLatLngs(geojson.coordinates);

        return {
            startNode: NodeFactory.mapExternalNode(externalLink.solmuByLnkalkusolmu),
            endNode: NodeFactory.mapExternalNode(externalLink.solmuByLnkloppusolmu),
            geometry: roundLatLngs(latLngs),
            transitType: externalLink.lnkverkko,
            length: externalLink.lnkpituus,
            measuredLength: externalLink.lnkmitpituus,
            speed: externalLink.speed ? Math.round(externalLink.speed) : 0,
            modifiedBy: externalLink.lnkkuka,
            modifiedOn: externalLink.lnkviimpvm ? new Date(externalLink.lnkviimpvm) : undefined
        };
    };

    public static createLinkMapHighlight = (externalLink: IExternalLink): ILinkMapHighlight => {
        const geojson = JSON.parse(externalLink.geojson);
        const latLngs: L.LatLng[] = L.GeoJSON.coordsToLatLngs(geojson.coordinates);
        return {
            transitType: externalLink.lnkverkko,
            startNodeId: externalLink.lnkalkusolmu!,
            endNodeId: externalLink.lnkloppusolmu!,
            geometry: roundLatLngs(latLngs),
            dateRanges: externalLink.dateRanges!
        };
    };

    public static createNewLink = (startNode: INode, endNode: INode): ILink => {
        const geometry = [startNode.coordinatesProjection, endNode.coordinatesProjection];
        return {
            geometry,
            startNode,
            endNode,
            length: 0,
            measuredLength: 0,
            speed: 0,
            modifiedBy: '',
            modifiedOn: new Date()
        };
    };
}

export default LinkFactory;
