import { action, computed, observable, observe, IObjectDidChange, Lambda } from 'mobx';
import IEvent from '~/models/IEvent';
import eventType from '~/enums/eventType';
import entityName from '~/enums/entityName';
import { IRoutePathLink } from '~/models';
import RoutePathStore from './routePathStore';
import Navigator from '../routing/navigator';

const enum IObjectDidChangeUpdateTypes {
    ADDED = 'added',
}

export class GeometryEventStore {
    @observable private _events: IEvent[];

    constructor() {
        this._events = [];

        this.initRoutePathLinkObservable();
        this.initClearEventListOnPageChange();
    }

    @computed get events(): IEvent[] {
        return this._events;
    }

    @action
    private clearEvents() {
        this._events = [];
    }

    @action
    private pushToEvents(
        { action, entityName, objectId, oldObject, newObject }
      : {
          action: eventType,
          entityName: entityName,
          objectId: string,
          oldObject?: object,
          newObject?: object,
      },
      ) {
        this._events.push({
            action,
            objectId,
            postObject: newObject,
            preObject: oldObject,
            timestamp: new Date(),
            entity: entityName,
        });
    }

    private logRoutePathLinkChanges(change: IObjectDidChange) {
        if (change.hasOwnProperty(IObjectDidChangeUpdateTypes.ADDED)) {
            change[IObjectDidChangeUpdateTypes.ADDED].slice()
                .forEach((routePathLink: IRoutePathLink) => {
                    this.pushToEvents({
                        action: eventType.ADD,
                        entityName: entityName.ROUTELINK,
                        newObject: routePathLink,
                        objectId: routePathLink.id,
                    });
                });
        }
    }

    private initClearEventListOnPageChange() {
        observe(
            Navigator!.getStore(),
            () => {
                this.clearEvents();
            },
        );
    }

    private initRoutePathLinkObservable() {
        let reactor : Lambda | null = null;
        // Creating watcher which will trigger when RoutePathStore is initialized
        // We cannot watch RoutePathStore!.routePath!.routePathLinks!
        // before we know that it is defined
        observe(
            RoutePathStore!,
            (change) => {
                // We need to watch routePath, however, this object is created and
                // deleted when switching between pages. Here we create a watcher
                // when routePath is created, and remove the watcher when it is
                // deleted.
                if (
                    change.name === '_routePath'
                    && !change['oldValue']
                    && change['newValue']
                ) {
                    // Creating watcher for RoutePathStore.routePath.routePathLinks.
                    // Which is the list that we want to observe.
                    reactor = observe(
                        RoutePathStore!.routePath!.routePathLinks!,
                        (change) => {
                            this.logRoutePathLinkChanges(change);
                        },
                    );
                } else if (
                    change.name === '_routePath'
                    && !change['newValue']
                    && reactor !== null
                ) {
                    reactor!();
                }
            },
        );
    }
}

const observableGeometryEventStore = new GeometryEventStore();

export default observableGeometryEventStore;
