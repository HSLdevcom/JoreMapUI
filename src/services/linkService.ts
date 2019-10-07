import { ApolloQueryResult } from 'apollo-client';
import apolloClient from '~/util/ApolloClient';
import ILink from '~/models/ILink';
import ApiClient from '~/util/ApiClient';
import { LatLng } from 'leaflet';
import endpoints from '~/enums/endpoints';
import LinkFactory from '~/factories/linkFactory';
import IExternalLink from '~/models/externals/IExternalLink';
import { INode } from '~/models';
import GraphqlQueries from './graphqlQueries';

class LinkService {
    public static fetchLinksWithStartNodeOrEndNode = async (
        nodeId: string
    ): Promise<ILink[]> => {
        const queryResult: ApolloQueryResult<any> = await apolloClient.query({
            query: GraphqlQueries.getLinksByStartNodeAndEndNodeQuery(),
            variables: { nodeId }
        });
        const queriedLinks = [
            ...queryResult.data.solmuBySoltunnus.linkkisByLnkalkusolmu.nodes,
            ...queryResult.data.solmuBySoltunnus.linkkisByLnkloppusolmu.nodes
        ];
        return queriedLinks.map((link: IExternalLink) =>
            LinkFactory.mapExternalLink(link)
        );
    };

    public static fetchLink = async (
        startNodeId: string,
        endNodeId: string,
        transitTypeCode: string
    ): Promise<ILink> => {
        const queryResult: ApolloQueryResult<any> = await apolloClient.query({
            query: GraphqlQueries.getLinkQuery(),
            variables: { startNodeId, endNodeId, transitType: transitTypeCode }
        });
        return LinkFactory.mapExternalLink(queryResult.data.link);
    };

    public static fetchLinks = async (
        startNodeId: string,
        endNodeId: string
    ): Promise<ILink[]> => {
        const queryResult: ApolloQueryResult<any> = await apolloClient.query({
            query: GraphqlQueries.getLinksQuery(),
            variables: { startNodeId, endNodeId }
        });
        const queriedLinks = queryResult.data.getLinks.nodes;
        return queriedLinks.map((link: IExternalLink) =>
            LinkFactory.mapExternalLink(link)
        );
    };

    public static updateLink = async (link: ILink) => {
        const simplifiedLink = {
            ...link,
            geometry: link.geometry.map(coor => new LatLng(coor.lat, coor.lng))
        };
        await ApiClient.updateObject(endpoints.LINK, simplifiedLink);
        await apolloClient.clearStore();
    };

    public static createLink = async (link: ILink) => {
        await ApiClient.createObject(endpoints.LINK, link);
        await apolloClient.clearStore();
    };

    public static createLinksBySplitting = async (link: ILink, node: INode, date: Date, newLinks: ILink[]) => {
        const requestBody = {
            link,
            node,
            date,
            newLinks
        };
        console.log(endpoints.SPLIT_LINK, requestBody);
        await ApiClient.createObject(endpoints.SPLIT_LINK, requestBody);
        await apolloClient.clearStore();
    }
}

export default LinkService;
