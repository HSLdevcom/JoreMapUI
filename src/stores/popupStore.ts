import { action, computed, observable } from 'mobx';

interface IPopup {
    id?: number;
    content: (popupId: number) => React.ReactNode;
    coordinates: L.LatLng;
    isCloseButtonVisible: boolean;
    isAutoCloseOn?: boolean;
}

export class PopupStore {
    // Observable.ref prevents react from re-rendering when properties other than first level IPopup properties change
    @observable.ref private _popups: IPopup[];
    private _idCounter: number;

    constructor() {
        this._popups = [];
        this._idCounter = 0;
    }

    @computed
    get popups() {
        return this._popups;
    }

    @action
    public showPopup = (popup: IPopup) => {
        popup.id = this._idCounter;
        this._idCounter += 1;
        // Need to do concat (instead of push) to trigger observable reaction
        this._popups = this._popups.concat([popup]);
        return popup.id;
    };

    @action
    public closePopup = (id: number) => {
        this._popups = this._popups.filter(p => p.id !== id);
        if (this._popups.length === 0) {
            this._idCounter = 0;
        }
    };
}

const observablePopupStore = new PopupStore();

export default observablePopupStore;

export { IPopup };
