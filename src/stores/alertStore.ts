import { action, computed, observable } from 'mobx';
import constants from '~/constants/constants';

enum AlertType {
    Success = 1,
    Info,
    Loader,
}

class AlertStore {
    @observable private _message: string | null;
    @observable private _type: AlertType | null;
    @observable private _isCancelButtonVisible: boolean;

    // Constructor
    @action
    public initialize = () => {
        this._message = null;
        this._isCancelButtonVisible = false;
    };

    @computed
    get message() {
        return this._message;
    }

    @computed
    get type() {
        return this._type;
    }

    @computed
    get isCancelButtonVisible() {
        return this._isCancelButtonVisible;
    }

    @computed
    get isAlertOpen(): boolean {
        return this._message !== null;
    }

    @action
    public setNotificationMessage = ({ message }: { message: string }) => {
        this._message = message;
        this._isCancelButtonVisible = true;
    };

    @action
    public setFadeMessage = ({
        message,
        type = AlertType.Success,
    }: {
        message: string;
        type?: AlertType;
    }) => {
        this._message = message;
        this._type = type;

        return new Promise((resolve) => {
            setTimeout(() => {
                this.close();
                resolve();
            }, constants.FADE_ALERT_TIMEOUT);
        });
    };

    @action
    public setLoaderMessage = (message: string) => {
        this._message = message;
        this._type = AlertType.Loader;
    };

    @action
    public close = () => {
        this._message = null;
        this._type = null;
        this._isCancelButtonVisible = false;
    };
}

export default new AlertStore();

export { AlertStore, AlertType };
