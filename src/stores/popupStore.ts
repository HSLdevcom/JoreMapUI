import { action, computed, observable, reaction } from 'mobx';
import NetworkStore, { MapLayer } from './networkStore';

type PopupType = 'selectNetworkEntityPopup' | 'nodePopup' | 'nodeUsagePopup';

interface IPopupProps {
    type?: PopupType;
    data?: any;
    content?: (popupId: number) => React.ReactNode;
    coordinates: L.LatLng;
    isCloseButtonVisible: boolean;
    isAutoCloseOn?: boolean;
    hasOpacity?: boolean;
}

interface IPopup extends IPopupProps {
    id: number;
}

class PopupStore {
    // Observable.ref prevents react from re-rendering when properties other than first level IPopup properties change
    @observable.ref private _popups: IPopup[];
    private _idCounter: number;

    // Constructor
    @action
    public initialize = () => {
        this._popups = [];
        this._idCounter = 0;

        reaction(
            () => [NetworkStore.visibleMapLayers && NetworkStore.isMapLayerVisible(MapLayer.node)],
            this.closePopups
        );
    };

    @computed
    get popups() {
        return this._popups;
    }

    @action
    public showPopup = (popupProps: IPopupProps) => {
        const id = this._idCounter;
        const popup: IPopup = {
            id,
            ...popupProps,
        };
        this._idCounter += 1;
        // Need to do concat (instead of push) to trigger observable reaction
        this._popups = this._popups.concat([popup]);
        return popup.id;
    };

    @action
    public closePopup = (id: number) => {
        this._popups = this._popups.filter((p) => p.id !== id);
        if (this._popups.length === 0) {
            this._idCounter = 0;
        }
    };

    @action
    private closePopups = (arg: boolean[]) => {
        const isNodeLayerVisible = arg[0];
        if (!isNodeLayerVisible) {
            this._popups = [];
        }
    };
}

export default new PopupStore();

export { PopupStore, IPopup, IPopupProps, PopupType };
