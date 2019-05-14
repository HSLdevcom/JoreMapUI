import * as L from 'leaflet';
import TransitType from '~/enums/transitType';
import INode from './INode';

interface IRoutePathLinkPrimaryKey {
    id: string;
}

export default interface IRoutePathLink extends IRoutePathLinkPrimaryKey {
    routeId: string;
    routePathDirection: string;
    routePathStartDate: Date;
    geometry: L.LatLng[];
    orderNumber: number;
    transitType: TransitType;
    startNode: INode;
    endNode: INode;
    startNodeStopType: string; // '0' = Ei, 2 = Otto, 3 = Jättö
    isStartNodeDisabled: boolean;
    startNodeTimeAlignmentStop: string; // '0' = false, '1/2' = true
    isStartNodeHastusStop: boolean;
    isStartNodeUsingBookSchedule: boolean;
    startNodeBookScheduleColumnNumber: number | null;
    modifiedBy: string;
    modifiedOn: Date;
}

export { IRoutePathLinkPrimaryKey };
