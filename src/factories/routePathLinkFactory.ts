import { IRoutePathLink, INode } from '~/models';
import NodeFactory from './nodeFactory';

export interface IRoutePathLinkResult {
    link: IRoutePathLink;
    nodes: INode[];
}

class RoutePathLinkFactory {
    public static createRoutePathLink = (routePathLinkNode: any): IRoutePathLinkResult => {
        const nodes = [];
        if (routePathLinkNode.solmuByLnkalkusolmu) {
            const node = NodeFactory.createNode(routePathLinkNode.solmuByLnkalkusolmu);
            if (routePathLinkNode.relpysakki === 'E') {
                node.disabled = true;
            }
            nodes.push(node);
        }
        if (routePathLinkNode.solmuByLnkloppusolmu) {
            nodes.push(NodeFactory.createNode(routePathLinkNode.solmuByLnkloppusolmu));
        }
        const coordinates = JSON.parse(
            routePathLinkNode.linkkiByLnkverkkoAndLnkalkusolmuAndLnkloppusolmu.geojson).coordinates;
        const positions = coordinates.map((coor: [number, number]) => [coor[1], coor[0]]);
        return {
            nodes,
            link: {
                positions,
                id: routePathLinkNode.relid,
                startNodeId: routePathLinkNode.lnkalkusolmu,
                endNodeId: routePathLinkNode.lnkloppusolmu,
                orderNumber: routePathLinkNode.reljarjnro,
            },
        };
    }
}

export default RoutePathLinkFactory;
