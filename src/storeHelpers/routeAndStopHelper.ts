import routeStore from '../stores/routeStore';
import nodeStore from '../stores/nodeStore';
import NodeHelper from '../util/nodeHelper';
import RouteService from '../services/routeService';

export default class RouteAndStopHelper {
    private static getRouteIdsMissingFromStore(routeIds: string[]) {
        const currentRouteIds = routeStore.routes
            .map(route => route.routeId);
        return routeIds
            .filter(routeId => currentRouteIds.indexOf(routeId) < 0);
    }

    private static removeUnusedNodes() {
        const requiredStopIds = NodeHelper.getNodeIdsUsedByRoutes(routeStore.routes);

        const nodeIdsToRemove = nodeStore.nodes
            .map(node => node.id)
            .filter(nodeId => !requiredStopIds.some(rStop => rStop === nodeId));

        nodeStore.removeFromNodes(nodeIdsToRemove);
    }

    public static async addRequiredDataForRoutes(routeIds: string[]) {
        const missingRouteIds = RouteAndStopHelper.getRouteIdsMissingFromStore(routeIds);
        const routeServiceResults = await RouteService.fetchMultipleRoutes(missingRouteIds);
        routeStore.addToRoutes(routeServiceResults.routes);

        const currentNodeIds = nodeStore.nodes.map(node => node.id);

        const missingNodes = routeServiceResults.nodes
            .filter(nodeId => !currentNodeIds.some(cNodeId => cNodeId === nodeId.id));

        nodeStore.addToNodes(missingNodes);
    }

    public static removeRoute(routeId: string) {
        routeStore.removeFromRoutes(routeId);
        RouteAndStopHelper.removeUnusedNodes();
    }
}
