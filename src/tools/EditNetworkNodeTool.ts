import NetworkStore, { NodeSize } from '~/stores/networkStore';
import EditNetworkStore from '~/stores/editNetworkStore';
import ToolbarTool from '~/enums/toolbarTool';
import BaseTool from './BaseTool';

/**
 * Tool for editing selected network node's 3 type of locations and links that have selected node
 * as either start or end node
 */
export default class EditNetworkNodeTool implements BaseTool {
    public toolType = ToolbarTool.EditNetworkNode;

    public activate() {
        EditNetworkStore.setIsWaitingForNodeSelection(true);
        NetworkStore.setNodeSize(NodeSize.large);
    }
    public deactivate() {
        EditNetworkStore.setIsWaitingForNodeSelection(false);
        NetworkStore.setNodeSize(NodeSize.normal);
    }

    isNetworkNodesInteractive() {
        return EditNetworkStore!.isWaitingForNodeSelection;
    }

    onNetworkNodeClick = async (clickEvent: any) => {
        // tslint:disable-next-line
        console.log('at EditNetworkNodeTools onNetworkNodeClick');
        // TODO: click handking.

        // const properties =  clickEvent.sourceTarget.properties;

        // TODO fetch nodes(?), links with start & endNode
        // --> add to store

        // const routePathLinks =
        //     await RoutePathLinkService.fetchLinksWithLinkStartNodeId(properties.soltunnus);
        // if (routePathLinks.length === 0) {
        //     this.props.notificationStore!.addNotification({
        //         message:
        // `Tästä solmusta (soltunnus:
        // ${properties.soltunnus}) alkavaa linkkiä ei löytynyt.`, // tslint:disable
        //         type: NotificationType.ERROR,
        //     });
        // } else {
        //     this.props.routePathStore!.setNeighborRoutePathLinks(routePathLinks);
        // }
    }
}
