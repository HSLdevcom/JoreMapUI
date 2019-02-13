import { ApolloQueryResult } from 'apollo-client';
import apolloClient from '~/util/ApolloClient';
import ILink from '~/models/ILink';
import LinkFactory from '~/factories/linkFactory';
import IExternalLink from '~/models/externals/IExternalLink';
import GraphqlQueries from './graphqlQueries';

class LinkService {
    public static fetchLinksWithStartNodeOrEndNode = async(nodeId: string) : Promise<ILink[]> => {
        const queryResult: ApolloQueryResult<any> = await apolloClient.query(
            { query: GraphqlQueries.getLinksByStartNodeAndEndNodeQuery(),
                variables: { nodeId } },
        );
        const queriedLinks = [
            ...queryResult.data.solmuBySoltunnus.linkkisByLnkalkusolmu.nodes,
            ...queryResult.data.solmuBySoltunnus.linkkisByLnkloppusolmu.nodes];
        return queriedLinks
            .map((link: IExternalLink) =>
            LinkFactory.createLinkFromExternalLink(link),
        );
    }

    public static fetchLink = async(startNodeId: string, endNodeId: string, transitTypeCode: string)
        : Promise<ILink> => {
        const queryResult: ApolloQueryResult<any> = await apolloClient.query(
            { query: GraphqlQueries.getLinkQuery(),
                variables: { startNodeId, endNodeId, transitType: transitTypeCode } },
        );
        return LinkFactory.createLinkFromExternalLink(queryResult.data.link);
    }
}

export default LinkService;
