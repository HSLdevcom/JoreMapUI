import endpoints from '~/enums/endpoints';
import Navigator from './navigator';
import RouteBuilderContext from './routeBuilderContext';
import subSites from './subSites';

export class RouteBuilder {
    /**
     * @param {string} subSites
     * @param {Object} queryValues - { field: value, ... }
     */
    public to = (subSites: subSites | endpoints, queryValues?: any) => {
        return new RouteBuilderContext(
            Navigator.getPathName(),
            subSites,
            queryValues ? queryValues : Navigator.getQueryParamValues()
        );
    };
}

export default new RouteBuilder();
