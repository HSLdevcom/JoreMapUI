import _ from 'lodash';
import { action, computed, observable } from 'mobx';
import AddNetworkLinkTool from '~/components/map/tools/AddNetworkLinkTool';
import AddNetworkNodeTool from '~/components/map/tools/AddNetworkNodeTool';
import BaseTool from '~/components/map/tools/BaseTool';
import CopyRoutePathSegmentTool from '~/components/map/tools/CopyRoutePathSegmentTool';
import ExtendRoutePathTool from '~/components/map/tools/ExtendRoutePathTool';
import PrintTool from '~/components/map/tools/PrintTool';
import RemoveRoutePathLinkTool from '~/components/map/tools/RemoveRoutePathLinkTool';
import SelectNetworkEntityTool from '~/components/map/tools/SelectNetworkEntityTool';
import SplitLinkTool from '~/components/map/tools/SplitLinkTool';
import ToolbarToolType from '~/enums/toolbarToolType';
import RoutePathLinkMassEditStore from '~/stores/routePathLinkMassEditStore';
import RoutePathStore from '~/stores/routePathStore';

const DEFAULT_TOOL_TYPE = ToolbarToolType.SelectNetworkEntity;

const TOOL_LIST = [
    SelectNetworkEntityTool,
    AddNetworkNodeTool,
    AddNetworkLinkTool,
    ExtendRoutePathTool,
    CopyRoutePathSegmentTool,
    RemoveRoutePathLinkTool,
    PrintTool,
    SplitLinkTool,
];

const TOOLS = {};
TOOL_LIST.forEach((tool) => {
    const toolInstance = new tool();
    TOOLS[toolInstance.toolType] = toolInstance;
});

const DEFAULT_DISABLED_TOOLS = [ToolbarToolType.Print];

class ToolbarStore {
    @observable private _selectedTool: BaseTool;
    @observable private _toolPhase: string | null; // This property would be better inside each tool but then mobx listeners don't react to it's changes. TODO: find a way to achieve this.
    @observable private _disabledTools: ToolbarToolType[];
    @observable private _shouldShowEntityOpenPrompt: boolean;
    @observable private _areUndoButtonsDisabled: boolean;

    constructor() {
        this._disabledTools = DEFAULT_DISABLED_TOOLS;
        this.selectDefaultTool();
        this._shouldShowEntityOpenPrompt = false;
    }

    @computed
    get selectedTool(): BaseTool {
        return this._selectedTool;
    }

    @computed
    get toolPhase(): string | null {
        return this._toolPhase;
    }

    @computed
    get shouldShowEntityOpenPrompt(): boolean {
        return this._shouldShowEntityOpenPrompt;
    }

    @computed
    get areUndoButtonsDisabled(): boolean {
        return this._areUndoButtonsDisabled;
    }

    @computed
    get tools() {
        return TOOLS;
    }

    @action
    public setToolPhase = (phase: string | null) => {
        this._toolPhase = phase;
    };

    @action
    public selectTool = (tool: ToolbarToolType | null) => {
        if (this._selectedTool) {
            this._selectedTool.deactivate();
        }

        // deselect current tool
        if (
            tool === null ||
            tool === ToolbarToolType.SelectNetworkEntity ||
            (this._selectedTool && this._selectedTool.toolType === tool)
        ) {
            this._selectedTool = TOOLS[DEFAULT_TOOL_TYPE];
            this._selectedTool!.activate();
            return;
        }
        this._selectedTool = TOOLS[tool];
        if (!this._selectedTool) {
            throw new Error('Tried to select tool that was not found');
        }
        this._selectedTool.activate();
    };

    @action
    public setShouldShowEntityOpenPrompt = (shouldShowEntityOpenPrompt: boolean) => {
        this._shouldShowEntityOpenPrompt = shouldShowEntityOpenPrompt;
    };

    @action
    public setDisabledTools(disabledTools: ToolbarToolType[] | null) {
        if (disabledTools) {
            this._disabledTools = disabledTools;
        } else {
            this._disabledTools = DEFAULT_DISABLED_TOOLS;
        }
    }

    @action
    public setUndoButtonsDisabled = (areDisabled: boolean) => {
        this._areUndoButtonsDisabled = areDisabled;
    };

    @action
    public selectDefaultTool() {
        this.selectTool(DEFAULT_TOOL_TYPE);
    }

    @action
    public updateDisabledRoutePathToolStatus = () => {
        let disabledTools = _.cloneDeep(this._disabledTools);
        const addTool = (toolType: ToolbarToolType) => {
            if (disabledTools.indexOf(toolType) === -1) {
                disabledTools = disabledTools.concat([toolType]);
            }
        };
        const removeTool = (toolType: ToolbarToolType) => {
            const toolToRemoveIndex = disabledTools.findIndex((tool) => tool === toolType);
            disabledTools.splice(toolToRemoveIndex, 1);
        };

        const isExtendRoutePathToolDisabled =
            RoutePathLinkMassEditStore.selectedMassEditRoutePathLinks.length > 0;
        const isRemoveRoutePathLinkToolDisabled =
            RoutePathLinkMassEditStore.selectedMassEditRoutePathLinks.length > 0;
        const isCopyRoutePathSegmentToolDisabled =
            (RoutePathStore.routePath && RoutePathStore.routePath.routePathLinks.length === 0) ||
            RoutePathLinkMassEditStore.selectedMassEditRoutePathLinks.length > 0;

        isExtendRoutePathToolDisabled
            ? addTool(ToolbarToolType.ExtendRoutePath)
            : removeTool(ToolbarToolType.ExtendRoutePath);
        isRemoveRoutePathLinkToolDisabled
            ? addTool(ToolbarToolType.RemoveRoutePathLink)
            : removeTool(ToolbarToolType.RemoveRoutePathLink);
        isCopyRoutePathSegmentToolDisabled
            ? addTool(ToolbarToolType.CopyRoutePathSegment)
            : removeTool(ToolbarToolType.CopyRoutePathSegment);

        this._disabledTools = disabledTools;

        this.setUndoButtonsDisabled(this.areUndoToolsDisabled());
    };

    public isSelected = (tool: ToolbarToolType): boolean => {
        return Boolean(this._selectedTool.toolType === tool);
    };

    public isDisabled = (tool: ToolbarToolType): boolean => {
        return this._disabledTools.indexOf(tool) > -1;
    };

    private areUndoToolsDisabled = () => {
        return RoutePathLinkMassEditStore.selectedMassEditRoutePathLinks.length > 0;
    };
}

export default new ToolbarStore();

export { ToolbarStore };
