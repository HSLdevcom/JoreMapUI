import { ApolloQueryResult } from 'apollo-client';
import endpoints from '~/enums/endpoints';
import TransitType from '~/enums/transitType';
import NodeFactory from '~/factories/nodeFactory';
import { ILink, INode } from '~/models';
import { INodeBase, INodePrimaryKey } from '~/models/INode';
import IExternalNode from '~/models/externals/IExternalNode';
import QueryParams from '~/routing/queryParams';
import routeBuilder from '~/routing/routeBuilder';
import ApiClient from '~/util/ApiClient';
import ApolloClient from '~/util/ApolloClient';
import GraphqlQueries from './graphqlQueries';

interface INodeSaveModel {
    node: INode;
    links: ILink[];
}

class NodeService {
    public static fetchNode = async (nodeId: string) => {
        const queryResult: ApolloQueryResult<any> = await ApolloClient.query({
            query: GraphqlQueries.getNodeQuery(),
            variables: { nodeId },
            fetchPolicy: 'no-cache' // no-cache is needed because otherwise nested data fetch does not always work
        });
        return NodeFactory.mapExternalNode(queryResult.data.node);
    };

    public static fetchAllNodes = async () => {
        const queryResult: ApolloQueryResult<any> = await ApolloClient.query({
            query: GraphqlQueries.getAllNodesQuery()
        });
        return queryResult.data.allNodes.nodes.map((node: IExternalNode) =>
            NodeFactory.createNodeBase(node)
        ) as INodeBase[];
    };

    public static getGeneratedNodeId = async (transitType: TransitType, latLng: L.LatLng) => {
        const requestLink = routeBuilder
            .to(endpoints.GET_NODE_ID)
            .set(QueryParams.transitType, transitType)
            .set(QueryParams.latLng, JSON.stringify(latLng))
            .toLink();
        console.log('requestLink ', requestLink);

        const resp = await ApiClient.getRequest(requestLink);
        console.log('getNodeId resp ', resp);
    };

    public static updateNode = async (node: INode, links: ILink[]) => {
        const requestBody: INodeSaveModel = {
            node,
            links
        };

        await ApiClient.updateObject(endpoints.NODE, requestBody);
    };

    public static createNode = async (node: INode) => {
        const response = (await ApiClient.createObject(endpoints.NODE, node)) as INodePrimaryKey;
        return response.id;
    };
}

export default NodeService;
