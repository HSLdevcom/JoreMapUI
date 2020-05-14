import { action, computed, observable, reaction } from 'mobx';
import TransitType from '~/enums/transitType';
import { INodeBase } from '~/models/INode';
import ISearchLine from '~/models/searchModels/ISearchLine';
import NodeUtils from '~/utils/NodeUtils';
import SearchStore from './searchStore';

class SearchResultStore {
    @observable private _allLines: ISearchLine[];
    @observable private _allNodes: INodeBase[];
    @observable private _filteredItems: (INodeBase | ISearchLine)[];
    @observable private _isSearching: boolean;
    private delayTimer: NodeJS.Timeout;

    // Constructor
    @action
    public initialize = () => {
        this._allLines = [];
        this._allNodes = [];
        this._filteredItems = [];
        this._isSearching = false;

        reaction(
            () => [
                SearchStore.searchInput,
                SearchStore.selectedTransitTypes,
                SearchStore.isSearchingForLines,
                SearchStore.isSearchingForNodes,
            ],
            this.startUpdateTimer
        );
    };

    @computed
    get allLines(): ISearchLine[] {
        return this._allLines;
    }

    @computed
    get allNodes(): INodeBase[] {
        return this._allNodes;
    }

    @computed
    get isSearching(): boolean {
        return this._isSearching;
    }

    @computed
    get filteredItems(): (INodeBase | ISearchLine)[] {
        return this._filteredItems;
    }

    @action
    public setAllLines = (lines: ISearchLine[]) => {
        this._allLines = lines;
    };

    @action
    public setAllNodes = (nodes: INodeBase[]) => {
        this._allNodes = nodes;
    };

    private matchWildcard(text: string, rule: string) {
        return new RegExp(`^${rule.split('*').join('.*')}$`).test(text);
    }

    private matchText(text: string, searchInput: string) {
        if (searchInput.includes('*')) {
            return this.matchWildcard(text, searchInput);
        }
        return text.includes(searchInput);
    }

    @action
    private startUpdateTimer = () => {
        this._isSearching = true;
        clearTimeout(this.delayTimer);
        this.delayTimer = setTimeout(() => {
            this.search();
        }, 500);
    };

    @action
    private setIsSearching = (isSearching: boolean) => {
        this._isSearching = isSearching;
    };

    @action
    public search = async () => {
        this.setIsSearching(true);
        const searchInput = SearchStore.searchInput.trim();

        let list: (INodeBase | ISearchLine)[] = [];
        if (SearchStore.isSearchingForLines) {
            const lines = this.getFilteredLines(searchInput, SearchStore.selectedTransitTypes);
            list = [...list, ...lines];
        }
        if (SearchStore.isSearchingForNodes) {
            const nodes = this.getFilteredNodes(searchInput);
            list = [...list, ...nodes];
        }

        this._filteredItems = list.sort((a, b) => (a.id > b.id ? 1 : -1));
        this.setIsSearching(false);
    };

    private getFilteredLines = (searchInput: string, transitTypes: TransitType[]) => {
        return this._allLines.filter((line) => {
            // Filter by transitType
            if (!transitTypes.includes(line.transitType)) {
                return false;
            }

            // Filter by line.id
            if (this.matchText(line.id, searchInput)) return true;

            // Filter by route.name
            return line.routes
                .map((route) => route.name.toLowerCase())
                .some((name) => this.matchText(name, searchInput.toLowerCase()));
        });
    };

    private getFilteredNodes = (searchInput: string) => {
        return this._allNodes.filter((node) => {
            const shortId = NodeUtils.getShortId(node);
            return (
                this.matchText(node.id, searchInput) ||
                (Boolean(shortId) && this.matchText(shortId, searchInput))
            );
        });
    };
}

export default new SearchResultStore();

export { SearchResultStore };
