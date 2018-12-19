import ToolbarTool from '~/enums/toolbarTool';

export default interface BaseTool {
    toolType: ToolbarTool;
    activate: Function;
    deactivate: Function;
    onNetworkNodeClick?: Function;
    /** TODO:
     * isNetworkLinksInteractive?: Function
     * onNetworkLinkClick?: Function
     * isNetworkLinkPointsInteractive?: Function
     * onNetworkLinkPointClick?: Function
    * **/
}
