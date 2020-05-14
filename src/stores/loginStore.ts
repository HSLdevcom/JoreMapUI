import { action, computed, observable } from 'mobx';
import navigator from '~/routing/navigator';
import SubSites from '~/routing/subSites';
import AuthService, { IAuthorizationResponse } from '~/services/authService';

const SAVE_LOCK_CHECK_INTERVAL = 60000; // Minute

class LoginStore {
    @observable private _isAuthenticated: boolean;
    @observable private _hasWriteAccess: boolean;
    @observable private _userEmail?: string;
    @observable private _isSaveLockEnabled: boolean;
    private saveLockFetchInterval: any;

    // Constructor
    @action
    public initialize = () => {
        this.clear(false);
    };

    @computed
    get isAuthenticated() {
        return this._isAuthenticated;
    }

    @computed
    get hasWriteAccess() {
        return this._hasWriteAccess;
    }

    @computed
    get userEmail() {
        return this._userEmail;
    }

    @computed
    get isSaveLockEnabled() {
        return this._isSaveLockEnabled && this._hasWriteAccess;
    }

    @action
    public setAuthenticationInfo(authRespose: IAuthorizationResponse) {
        this._isAuthenticated = authRespose.isOk;
        this._hasWriteAccess = authRespose.hasWriteAccess;
        this._userEmail = authRespose.email;
    }

    @action
    public setIsSaveLockEnabled(isEnabled: boolean) {
        this._isSaveLockEnabled = isEnabled;
        clearInterval(this.saveLockFetchInterval);
        if (isEnabled) {
            // Do queries until lock is not enabled
            this.saveLockFetchInterval = setInterval(async () => {
                const isEnabled = await AuthService.fetchIsSaveLockEnabled();
                this.setIsSaveLockEnabled(isEnabled);
            }, SAVE_LOCK_CHECK_INTERVAL);
        }
    }

    @action
    public clear(redirectToLogin: boolean = true) {
        this._isAuthenticated = false;
        this._hasWriteAccess = false;
        this._userEmail = undefined;
        this._isSaveLockEnabled = false;
        if (redirectToLogin) {
            navigator.goTo({ link: SubSites.login, shouldSkipUnsavedChangesPrompt: true });
        }
    }
}

export default new LoginStore();

export { LoginStore };
