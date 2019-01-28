import { ApolloQueryResult } from 'apollo-client';
import apolloClient from '~/util/ApolloClient';
import LineFactory from '~/factories/lineFactory';
import NotificationType from '~/enums/notificationType';
import NotificationStore from '~/stores/notificationStore';
import { ILine } from '~/models';
import GraphqlQueries from './graphqlQueries';

class LineService {
    public static fetchAllLines = async (): Promise<ILine[] | null> => {
        try {
            const queryResult: ApolloQueryResult<any> = await apolloClient.query(
                { query: GraphqlQueries.getAllLinesQuery() },
            );

            return queryResult.data.allLinjas.nodes.map(((linja: any) => {
                return LineFactory.createLine(linja);
            }));
        } catch (error) {
            console.error(error); // tslint:disable-line
            NotificationStore.addNotification(
                { message: 'Linjojen haku ei onnistunut.', type: NotificationType.ERROR },
            );
            // TODO: return object such as { success, result } to know
            // at view component if whether query ended up into an error or not
            return null;
        }
    }

    public static fetchLine = async (lintunnus: string): Promise<ILine | null> => {
        try {
            const queryResult: ApolloQueryResult<any> = await apolloClient.query(
                { query: GraphqlQueries.getLineQuery(), variables: { lineId: lintunnus } },
            );

            return LineFactory.createLine(queryResult.data.linjaByLintunnus);
        } catch (err) {
            NotificationStore.addNotification(
                { message: 'Linjan haku ei onnistunut.', type: NotificationType.ERROR },
            );
            // TODO: return object such as { success, result } to know
            // at view component if whether query ended up into an error or not
            return null;
        }
    }
}

export default LineService;
