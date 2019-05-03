import RouteBuilderContext from './routeBuilderContext';
import subSites from './subSites';
import Navigator from './navigator';

export class RouteBuilder {
    /**
     * @param {string} subSites
     * @param {Object} values - { field: value, ... }
     */
    public to = (subSites: subSites, values?: any) => {
        return new RouteBuilderContext(
            Navigator.getPathName(),
            subSites,
            values ? values : Navigator.getQueryParamValues()
        );
    };
}

export default new RouteBuilder();
