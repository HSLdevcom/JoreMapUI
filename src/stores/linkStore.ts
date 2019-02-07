import { action, computed, observable } from 'mobx';
import { ILink, INode } from '~/models';

export class LinkStore {
    @observable private _link: ILink | null;
    @observable private _nodes: INode[];

    constructor() {
        this._nodes = [];
        this._link = null;
    }

    @computed
    get link() {
        return this._link;
    }

    @computed
    get nodes() {
        return this._nodes;
    }

    @action
    public setLink = (link: ILink) => {
        this._link = link;
    }

    @action
    public setNodes = (nodes: INode[]) => {
        this._nodes = nodes;
    }

    @action
    public clear = () => {
        this._link = null;
        this._nodes = [];
    }
}

const observableLinkStore = new LinkStore();

export default observableLinkStore;
