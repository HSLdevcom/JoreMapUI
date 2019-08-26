import { ApolloQueryResult } from 'apollo-client';
import apolloClient from '~/util/ApolloClient';
import GraphqlQueries from './graphqlQueries';

interface IStopAreaItem {
    pysalueid: string;
    nimi: string;
}

interface IStopSectionItem {
    selite: string;
}

class StopService {
    public static fetchAllStopAreas = async (): Promise<IStopAreaItem[]> => {
        const queryResult: ApolloQueryResult<any> = await apolloClient.query({
            query: GraphqlQueries.getAllStopAreas()
        });

        return queryResult.data.node.nodes;
    };

    public static fetchAllStopSections = async (): Promise<
        IStopSectionItem[]
    > => {
        const queryResult: ApolloQueryResult<any> = await apolloClient.query({
            query: GraphqlQueries.getAllStopSections()
        });

        return queryResult.data.node.nodes;
    };
}

export default StopService;

export { IStopAreaItem, IStopSectionItem };
