import { action, computed, observable } from 'mobx';
import ToolbarTool from '~/enums/toolbarTool';
import BaseTool from '~/tools/BaseTool';
import AddNetworkNodeTool from '~/tools/AddNetworkNodeTool';
import AddNewRoutePathTool from '~/tools/AddNewRoutePathTool';
import CopyTool from '~/tools/CopyTool';
import DivideLinkTool from '~/tools/DivideLinkTool';
import EditNetworkNodeTool from '~/tools/EditNetworkNodeTool';
import PrintTool from '~/tools/PrintTool';

const TOOL_LIST = [
    new AddNetworkNodeTool(),
    new AddNewRoutePathTool(),
    new CopyTool(),
    new DivideLinkTool(),
    new EditNetworkNodeTool(),
    new PrintTool(),
];

/* Object with key: ToolbarTool, value: BaseTool*/
const TOOLS = TOOL_LIST.reduce((acc, c:BaseTool) => {
    return Object.assign({ [c.toolType]:c }, acc);
});

export class ToolbarStore {
    @observable private _selectedTool: BaseTool|null;
    @observable private _disabledTools: ToolbarTool[];
    constructor() {
        this._disabledTools = [
            ToolbarTool.Print,
        ];
    }

    @computed
    get selectedTool(): BaseTool | null {
        return this._selectedTool;
    }

    @action
    public selectTool(tool: ToolbarTool | null) {
        if (this._selectedTool) {
            this._selectedTool.deactivate();
        }

        // deselect current tool
        if (tool === null || (this._selectedTool && this._selectedTool.toolType === tool)) {
            this._selectedTool = null;
            return;
        }
        const foundTool = TOOLS[tool];
        this._selectedTool = foundTool;
        if (!this._selectedTool) {
            throw new Error('Tried to select tool that was not found');
        }
        this._selectedTool.activate();
    }

    public isSelected(tool: ToolbarTool): boolean {
        return Boolean(this._selectedTool && this._selectedTool.toolType === tool);
    }

    public isDisabled(tool: ToolbarTool): boolean {
        return this._disabledTools.indexOf(tool) > -1;
    }
}

const observableToolbarStore = new ToolbarStore();

export default observableToolbarStore;
