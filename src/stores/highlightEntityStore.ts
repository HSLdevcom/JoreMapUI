import { action, computed, observable } from 'mobx';
import { ILinkMapHighlight } from '~/models/ILink';
import { INodeMapHighlight } from '~/models/INode';

class HighlightEntityStore {
    @observable private _nodes: INodeMapHighlight[];
    @observable private _links: ILinkMapHighlight[];

    // Constructor
    @action
    public initialize = () => {
        this._nodes = [];
        this._links = [];
    };

    @computed
    get nodes() {
        return this._nodes;
    }

    @computed
    get links() {
        return this._links;
    }

    @action
    public setNodes(nodes: INodeMapHighlight[]) {
        this._nodes = nodes;
    }

    @action
    public setLinks(links: ILinkMapHighlight[]) {
        this._links = links;
    }
}

export default new HighlightEntityStore();

export { HighlightEntityStore };
