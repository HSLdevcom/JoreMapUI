import { action, computed, observable } from 'mobx';

const DEFAULT_CONFIRM_BUTTON_TEXT = 'Hyväksy';
const DEFAULT_CANCEL_BUTTON_TEXT = 'Peruuta';

type confirmType = 'default' | 'save';

class ConfirmStore {
    private _content: React.ReactNode;
    @observable private _isOpen: boolean;
    @observable private _isConfirmButtonDisabled: boolean;
    private _onConfirm: null | (() => void);
    private _onCancel: null | (() => void);
    private _confirmButtonText: string | null;
    private _cancelButtonText: string | null;
    private _confirmNotification: string | null;
    private _confirmType: confirmType;

    // Constructor
    @action
    public initialize = () => {
        this._content = null;
        this._isOpen = false;
    };

    @computed
    get isOpen(): boolean {
        return this._isOpen;
    }

    @computed
    get isConfirmButtonDisabled(): boolean {
        return this._isConfirmButtonDisabled;
    }

    @computed
    get content() {
        return this._content;
    }

    @computed
    get confirmButtonText(): string | null {
        return this._confirmButtonText;
    }

    @computed
    get cancelButtonText(): string | null {
        return this._cancelButtonText;
    }

    @computed
    get confirmNotification(): string | null {
        return this._confirmNotification;
    }

    @computed
    get confirmType(): string {
        return this._confirmType;
    }

    @action
    public openConfirm = ({
        content,
        onConfirm,
        onCancel,
        confirmButtonText,
        cancelButtonText,
        confirmNotification,
        confirmType = 'default',
    }: {
        content: React.ReactNode | string;
        onConfirm: () => void;
        onCancel?: () => void;
        confirmButtonText?: string;
        cancelButtonText?: string;
        confirmNotification?: string;
        confirmType?: confirmType;
    }) => {
        this._content = content;
        this._onConfirm = onConfirm;
        this._isOpen = true;
        this._onCancel = onCancel ? onCancel : null;
        this._confirmButtonText = confirmButtonText
            ? confirmButtonText
            : DEFAULT_CONFIRM_BUTTON_TEXT;
        this._cancelButtonText = cancelButtonText ? cancelButtonText : DEFAULT_CANCEL_BUTTON_TEXT;
        this._confirmNotification = confirmNotification ? confirmNotification : null;
        this._confirmType = confirmType;
    };

    @action
    public cancel = () => {
        if (this._onCancel) {
            this._onCancel();
        }
        this.clear();
    };

    @action
    public confirm = () => {
        if (this._onConfirm) {
            this._onConfirm();
        }
        this.clear();
    };

    @action
    public setIsConfirmButtonDisabled = (isDisabled: boolean) => {
        this._isConfirmButtonDisabled = isDisabled;
    };

    @action
    private clear = () => {
        this._content = null;
        this._onCancel = null;
        this._onConfirm = null;
        this._isOpen = false;
        this._confirmButtonText = DEFAULT_CONFIRM_BUTTON_TEXT;
        this._cancelButtonText = DEFAULT_CANCEL_BUTTON_TEXT;
        this._confirmNotification = null;
        this._isConfirmButtonDisabled = false;
    };
}

export default new ConfirmStore();

export { ConfirmStore };
