import qs from 'qs';
import endpoints from '~/enums/endpoints';
import QueryParams from './queryParams';
import SubSites from './subSites';

class RouteBuilderContext {
    private currentLink: string;
    private linkToBuild: string;
    private queryValues: Object;

    constructor(currentLink: string, linkToBuild: SubSites | endpoints, queryValues: any) {
        this.currentLink = currentLink;
        this.linkToBuild = linkToBuild;
        this.queryValues = this.jsonCopy(queryValues);
    }

    private jsonCopy = (jsonObject: JSON) => {
        return JSON.parse(JSON.stringify(jsonObject));
    };

    public toTarget = (targetId: string, value: string) => {
        if (this.linkToBuild.indexOf(targetId) === -1) {
            throw new Error(
                `Link building error, targetId to replace with value (${value}) not found: ${targetId}`
            );
        }
        this.linkToBuild = this.linkToBuild.replace(targetId, value);
        return this;
    };

    public toLink = () => {
        let link =
            this.linkToBuild !== SubSites.current ? this.linkToBuild.toString() : this.currentLink;

        if (Object.keys(this.queryValues).length !== 0) {
            link += `?${qs.stringify(this.queryValues, { encode: false })}`;
        }
        return link;
    };

    public append = (param: QueryParams, value: string) => {
        if (param in this.queryValues) {
            this.queryValues[param].push(value);
        } else {
            this.queryValues[param] = [value];
        }
        return this;
    };

    public remove = (param: QueryParams, value: string) => {
        if (param in this.queryValues) {
            if (Array.isArray(this.queryValues[param])) {
                this.queryValues[param] = this.queryValues[param].filter(
                    (v: string) => v !== value
                );
            } else {
                this.queryValues[param] = null;
            }
        }
        return this;
    };

    public set = (param: QueryParams, value: string) => {
        this.queryValues[param] = value;
        return this;
    };

    public clear = () => {
        this.queryValues = {};
        return this;
    };
}

export default RouteBuilderContext;
