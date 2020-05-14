import { action, computed, observable } from 'mobx';
import TransitType from '~/enums/transitType';
import LocalStorageHelper from '~/helpers/LocalStorageHelper';

class UserStore {
    @observable private _userTransitType: TransitType;

    // Constructor
    @action
    public initialize = () => {
        const savedUserTransitType = LocalStorageHelper.getItem('userTransitType');
        this._userTransitType = savedUserTransitType ? savedUserTransitType : TransitType.BUS;
    };

    @computed
    get userTransitType() {
        return this._userTransitType;
    }

    @action
    public setUserTransitType(userType: TransitType) {
        this._userTransitType = userType;
        LocalStorageHelper.setItem('userTransitType', userType);
    }
}

export default new UserStore();

export { UserStore };
