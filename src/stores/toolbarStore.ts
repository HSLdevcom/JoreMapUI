import _ from 'lodash';
import { action, computed, observable, reaction } from 'mobx';
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
import RoutePathStore from './routePathStore';

const defaultTool = new SelectNetworkEntityTool();

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
    @observable private _selectedTool: BaseTool | null;
    @observable private _disabledTools: ToolbarToolType[];
    @observable private _shouldShowEntityOpenPrompt: boolean;
    @observable private _areUndoButtonsDisabled: boolean;

    // Constructor
    @action
    public initialize = () => {
        this._disabledTools = DEFAULT_DISABLED_TOOLS;
        this.selectDefaultTool();
        this._shouldShowEntityOpenPrompt = false;
        this.initListeners();
    };

    private initListeners = async () => {
        reaction(
            () =>
                RoutePathLinkMassEditStore &&
                RoutePathLinkMassEditStore.selectedMassEditRoutePathLinks.length,
            _.debounce(() => this.updateDisabledToolStatus(), 25)
        );
        reaction(
            () => RoutePathStore.routePath && RoutePathStore.routePath.routePathLinks.length,
            _.debounce(() => this.updateDisabledToolStatus(), 25)
        );
    };

    @computed
    get selectedTool(): BaseTool | null {
        return this._selectedTool;
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
            // Network click event also triggers mapClick event
            // Prevents bugs where deselecting tool after a click on map also triggers map click event.
            // TODO: find a better way of achieving this.
            setTimeout(() => {
                this.selectDefaultTool();
            }, 0);
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
        this._selectedTool = defaultTool;
        this._selectedTool.activate();
    }

    @action
    public updateDisabledToolStatus = () => {
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

        this.isAddNewRoutePathLinkToolDisabled()
            ? addTool(ToolbarToolType.AddNewRoutePathLink)
            : removeTool(ToolbarToolType.AddNewRoutePathLink);

        this.isRemoveRoutePathLinkToolDisabled()
            ? addTool(ToolbarToolType.RemoveRoutePathLink)
            : removeTool(ToolbarToolType.RemoveRoutePathLink);

        this.isCopyRoutePathSegmentToolDisabled()
            ? addTool(ToolbarToolType.CopyRoutePathSegmentTool)
            : removeTool(ToolbarToolType.CopyRoutePathSegmentTool);

        this._disabledTools = disabledTools;

        this.setUndoButtonsDisabled(this.areUndoToolsDisabled());
    };

    public isSelected = (tool: ToolbarToolType): boolean => {
        return Boolean(this._selectedTool && this._selectedTool.toolType === tool);
    };

    public isDisabled = (tool: ToolbarToolType): boolean => {
        return this._disabledTools.indexOf(tool) > -1;
    };

    private isAddNewRoutePathLinkToolDisabled = () => {
        return RoutePathLinkMassEditStore.selectedMassEditRoutePathLinks.length > 0;
    };

    private isRemoveRoutePathLinkToolDisabled = () => {
        return RoutePathLinkMassEditStore.selectedMassEditRoutePathLinks.length > 0;
    };

    private isCopyRoutePathSegmentToolDisabled = () => {
        return (
            (RoutePathStore.routePath && RoutePathStore.routePath.routePathLinks.length === 0) ||
            RoutePathLinkMassEditStore.selectedMassEditRoutePathLinks.length > 0
        );
    };

    private areUndoToolsDisabled = () => {
        return RoutePathLinkMassEditStore.selectedMassEditRoutePathLinks.length > 0;
    };
}

export default new ToolbarStore();

export { ToolbarStore };
