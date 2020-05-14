import { LatLng } from 'leaflet';
import _ from 'lodash';
import { action, computed, observable, reaction } from 'mobx';
import { ILink, INode } from '~/models';
import linkValidationModel, {
    ILinkValidationModel,
} from '~/models/validationModels/linkValidationModel';
import GeometryUndoStore from '~/stores/geometryUndoStore';
import { calculateLengthFromLatLngs, roundLatLngs } from '~/utils/geomUtils';
import NavigationStore from './navigationStore';
import ValidationStore from './validationStore';

interface UndoState {
    link: ILink;
}

class LinkStore {
    @observable private _link: ILink | null;
    @observable private _oldLink: ILink | null;
    @observable private _nodes: INode[];
    // variable for creating new link:
    @observable private _startMarkerCoordinates: LatLng | null;
    @observable private _isLinkGeometryEditable: boolean;
    @observable private _isEditingDisabled: boolean;
    private _geometryUndoStore: GeometryUndoStore<UndoState>;
    private _validationStore: ValidationStore<ILink, ILinkValidationModel>;

    // Constructor
    @action
    public initialize = () => {
        this._nodes = [];
        this._link = null;
        this._oldLink = null;
        this._startMarkerCoordinates = null;
        this._isLinkGeometryEditable = true;
        this._isEditingDisabled = true;
        this._geometryUndoStore = new GeometryUndoStore();
        this._validationStore = new ValidationStore();

        reaction(
            () => this.isDirty && !this._isEditingDisabled,
            (value: boolean) => NavigationStore.setShouldShowUnsavedChangesPrompt(value)
        );
        reaction(() => this._isEditingDisabled, this.onChangeIsEditingDisabled);
    };

    @computed
    get link() {
        return this._link!;
    }

    @computed
    get oldLink() {
        return this._oldLink!;
    }

    @computed
    get nodes() {
        return this._nodes;
    }

    @computed
    get startMarkerCoordinates() {
        return this._startMarkerCoordinates;
    }

    @computed
    get isLinkGeometryEditable() {
        return this._isLinkGeometryEditable;
    }

    @computed
    get invalidPropertiesMap() {
        return this._validationStore.getInvalidPropertiesMap();
    }

    @computed
    get isFormValid() {
        return this._validationStore.isValid();
    }

    @computed
    get isDirty() {
        return !_.isEqual(this._link, this._oldLink);
    }

    @computed
    get isEditingDisabled() {
        return this._isEditingDisabled;
    }

    @action
    public activate = ({
        link,
        nodes,
        isNewLink,
    }: {
        link: ILink;
        nodes: INode[];
        isNewLink: boolean;
    }) => {
        this.clear();

        const oldLink = _.cloneDeep(link);
        const newLink = _.cloneDeep(link);
        const newNodes = _.cloneDeep(nodes);

        this._link = newLink;
        this._nodes = newNodes;

        this.setOldLink(oldLink);

        this._isEditingDisabled = !isNewLink;

        this._validationStore.activate(newLink, linkValidationModel);
    };

    @action
    public updateLinkGeometry = (latLngs: L.LatLng[]) => {
        if (!this._link || !this._isLinkGeometryEditable) return;

        if (this._geometryUndoStore.getUndoObjectsLength() === 0) {
            // Add initial link to undoStore
            const currentLink = _.cloneDeep(this._link);
            const currentUndoState: UndoState = {
                link: currentLink,
            };
            this._geometryUndoStore.addItem(currentUndoState);
        }

        const updatedLink = _.cloneDeep(this._link);
        updatedLink.geometry = roundLatLngs(latLngs);
        this.updateLinkProperty('geometry', roundLatLngs(latLngs));
        this.updateLinkLength();
        updatedLink.length = this._link.length;
        const newUndoState: UndoState = {
            link: updatedLink,
        };
        this._geometryUndoStore.addItem(newUndoState);
    };

    @action
    public setOldLink = (link: ILink) => {
        this._oldLink = _.cloneDeep(link);
    };

    @action
    public setIsLinkGeometryEditable = (isEditable: boolean) => {
        this._isLinkGeometryEditable = isEditable;
    };

    @action
    public updateLinkProperty = (
        property: keyof ILink,
        value: string | number | Date | LatLng[]
    ) => {
        // As any to fix typing error: Type 'string' is not assignable to type 'never'
        (this._link as any)[property] = value;
        this._validationStore.updateProperty(property, value);
    };

    @action
    public updateLinkLength = () => {
        if (!this._link) return;

        this.updateLinkProperty('length', calculateLengthFromLatLngs(this._link.geometry));
    };

    @action
    public setMarkerCoordinates = (startMarkerCoordinates: LatLng | null) => {
        this._startMarkerCoordinates = startMarkerCoordinates;
    };

    @action
    public setIsEditingDisabled = (isEditingDisabled: boolean) => {
        this._isEditingDisabled = isEditingDisabled;
    };

    @action
    public toggleIsEditingDisabled = () => {
        this._isEditingDisabled = !this._isEditingDisabled;
    };

    @action
    public clear = () => {
        this._link = null;
        this._nodes = [];
        this._oldLink = null;
        this._startMarkerCoordinates = null;
        this._geometryUndoStore.clear();
        this._validationStore.clear();
        this._isEditingDisabled = true;
    };

    @action
    public resetChanges = () => {
        if (this._oldLink) {
            this.activate({ link: this._oldLink, nodes: this._nodes, isNewLink: false });
        }
    };

    @action
    public undo = () => {
        this._geometryUndoStore.undo((previousUndoState: UndoState) => {
            this.updateLinkProperty('length', previousUndoState.link.length);
            this.updateLinkProperty('geometry', previousUndoState.link.geometry);
        });
    };

    @action
    public redo = () => {
        this._geometryUndoStore.redo((nextUndoState: UndoState) => {
            this.updateLinkProperty('length', nextUndoState.link.length);
            this.updateLinkProperty('geometry', nextUndoState.link.geometry);
        });
    };

    private onChangeIsEditingDisabled = () => {
        if (this._isEditingDisabled) {
            this.resetChanges();
        } else {
            this.updateLinkLength();
            this._validationStore.validateAllProperties();
        }
    };
}

export default new LinkStore();

export { LinkStore, UndoState };
