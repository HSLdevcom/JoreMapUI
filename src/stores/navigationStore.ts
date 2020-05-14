import { action, computed, observable } from 'mobx';

class NavigationStore {
    @observable private _shouldShowPrompt: boolean;
    @observable private _navigationAction: (() => void) | null; // Called when navigation happens. Can be e.g. used to clear store state when user enters home page

    // Constructor
    @action
    public initialize = () => {
        this._shouldShowPrompt = false;
        this._navigationAction = null;
    };

    @computed
    get shouldShowUnsavedChangesPrompt(): boolean {
        return this._shouldShowPrompt;
    }

    @computed
    get navigationAction(): (() => void) | null {
        return this._navigationAction;
    }

    @action
    public setShouldShowUnsavedChangesPrompt = (shouldShowPrompt: boolean) => {
        this._shouldShowPrompt = shouldShowPrompt;
    };

    @action
    public setNavigationAction = (navigationAction: (() => void) | null) => {
        this._navigationAction = navigationAction;
    };
}

export default new NavigationStore();

export { NavigationStore };
