import TransitType from '~/enums/transitType';
import { ISearchLineRoute } from './IRoute';

interface ILinePrimaryKey {
    id: string;
}

interface ILine extends ILinePrimaryKey {
    transitType?: TransitType;
    lineBasicRoute: string;
    publicTransportType: string;
    clientOrganization: string;
    modifiedBy?: string;
    modifiedOn?: Date;
    publicTransportDestination?: string;
    exchangeTime?: number;
    lineReplacementType?: string;
}

interface ISearchLine {
    id: string;
    transitType: TransitType;
    routes: ISearchLineRoute[];
}

export default ILine;

export { ILinePrimaryKey, ISearchLine };
