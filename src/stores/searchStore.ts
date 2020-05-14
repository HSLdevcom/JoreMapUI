import { action, computed, observable } from 'mobx';
import TransitType from '~/enums/transitType';

class SearchStore {
    @observable private _searchInput: string;
    @observable private _selectedTransitTypes: TransitType[];
    @observable private _isSearchingForLines: boolean;
    @observable private _isSearchingForNodes: boolean;
    @observable private _isSearchDisabled: boolean;

    // Constructor
    @action
    public initialize = () => {
        this._searchInput = '';
        this._selectedTransitTypes = [
            TransitType.BUS,
            TransitType.FERRY,
            TransitType.SUBWAY,
            TransitType.TRAIN,
            TransitType.TRAM,
        ];
        this._isSearchingForLines = true;
        this._isSearchingForNodes = false;
        this._isSearchDisabled = false;
    };

    @computed
    get searchInput(): string {
        return this._searchInput;
    }

    @action
    public setSearchInput = (input: string) => {
        this._searchInput = input;
    };

    @computed
    get selectedTransitTypes(): TransitType[] {
        return this._selectedTransitTypes;
    }

    @computed
    get isSearchingForLines() {
        return this._isSearchingForLines;
    }

    @computed
    get isSearchingForNodes() {
        return this._isSearchingForNodes;
    }

    @computed
    get isSearchDisabled() {
        return this._isSearchDisabled;
    }

    @action
    public toggleIsSearchingForLines() {
        this._isSearchingForLines = true;
        this._isSearchingForNodes = false;
    }

    @action
    public toggleIsSearchingForNodes() {
        this._isSearchingForNodes = true;
        this._isSearchingForLines = false;
    }

    @action
    public toggleTransitType = (type: TransitType) => {
        if (this._selectedTransitTypes.includes(type)) {
            this._selectedTransitTypes = this._selectedTransitTypes.filter((t) => t !== type);
        } else {
            // Need to do concat (instead of push) to trigger observable reaction
            this._selectedTransitTypes = this._selectedTransitTypes.concat(type);
        }
    };

    @action
    public setIsSearchDisabled(isSearchDisabled: boolean) {
        this._isSearchDisabled = isSearchDisabled;
    }
}

export default new SearchStore();

export { SearchStore };
