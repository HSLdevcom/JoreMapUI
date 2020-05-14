import _ from 'lodash';
import { action, computed, observable } from 'mobx';
import EventHelper from '~/helpers/EventHelper';
import { IRoutePathLink } from '~/models';

class RoutePathLinkMassEditStore {
    @observable private _isMassEditSelectionAllowed: boolean;
    @observable private _selectedMassEditRoutePathLinks: IRoutePathLink[];

    // Constructor
    @action
    public initialize = () => {
        this._isMassEditSelectionAllowed = false;
        this._selectedMassEditRoutePathLinks = [];

        EventHelper.on('ctrl', () => this.setIsMassEditSelectionAllowed(true));
        EventHelper.on('shift', () => this.setIsMassEditSelectionAllowed(true));
        EventHelper.on('keyUp', () => this.setIsMassEditSelectionAllowed(false));
    };

    @computed
    get isMassEditSelectionEnabled() {
        return this._isMassEditSelectionAllowed;
    }

    @computed
    get selectedMassEditRoutePathLinks() {
        return this._selectedMassEditRoutePathLinks;
    }

    @action
    public setIsMassEditSelectionAllowed = (isAllowed: boolean) => {
        this._isMassEditSelectionAllowed = isAllowed;
    };

    @action
    public toggleSelectedRoutePathLink = (routePathLink: IRoutePathLink) => {
        const currentIndex = this.getSelectedRoutePathLinkIndex(routePathLink);
        currentIndex > -1
            ? this._selectedMassEditRoutePathLinks.splice(currentIndex, 1)
            : (this._selectedMassEditRoutePathLinks = this._selectedMassEditRoutePathLinks.concat([
                  routePathLink,
              ]));
    };

    public getSelectedRoutePathLinkIndex = (routePathLink: IRoutePathLink) => {
        return this._selectedMassEditRoutePathLinks.findIndex(
            (rpLink) =>
                rpLink.startNode.id === routePathLink.startNode.id &&
                rpLink.endNode.id === routePathLink.endNode.id
        );
    };

    // TODO: call this when routePathLinks change:
    @action
    public removeSelectedRoutePathLink = (routePathLink: IRoutePathLink) => {
        const currentIndex = this.getSelectedRoutePathLinkIndex(routePathLink);
        if (currentIndex) {
            this._selectedMassEditRoutePathLinks.splice(currentIndex, 1);
        }
    };

    @action
    public clear = () => {
        this._selectedMassEditRoutePathLinks = [];
    };
}

export default new RoutePathLinkMassEditStore();

export { RoutePathLinkMassEditStore };
