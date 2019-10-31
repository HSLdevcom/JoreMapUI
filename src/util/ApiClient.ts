import Moment from 'moment';
import httpStatusDescriptionCodeList from '~/codeLists/httpStatusDescriptionCodeList';
import constants from '~/constants/constants';
import endpoints from '~/enums/endpoints';
import FetchStatusCode from '~/enums/fetchStatusCode';
import IError from '~/models/IError';
import AlertStore from '~/stores/alertStore';
import LoginStore from '~/stores/loginStore';
import ApolloClient from '~/util/ApolloClient';

enum RequestMethod {
    GET = 'GET',
    POST = 'POST',
    PUT = 'PUT',
    DELETE = 'DELETE'
}

interface IAuthorizationRequest {
    code: string;
}

type credentials = 'include';

class ApiClient {
    public updateObject = async (endpoint: endpoints, object: any) => {
        const response = this.postRequest(endpoint, object);
        ApolloClient.clearStore();
        return response;
    };

    public createObject = async (endpoint: endpoints, object: any) => {
        const response = await this.sendBackendRequest(RequestMethod.PUT, endpoint, object);
        ApolloClient.clearStore();
        return response;
    };

    public deleteObject = async (endpoint: endpoints, object: any) => {
        return await this.sendBackendRequest(RequestMethod.DELETE, endpoint, object);
    };

    public getRequest = async (endpoint: endpoints | string) => {
        return await this.sendBackendRequest(RequestMethod.GET, endpoint, {});
    };

    public postRequest = async (endpoint: endpoints, requestBody: any) => {
        return await this.sendBackendRequest(RequestMethod.POST, endpoint, requestBody);
    };

    public authorizeUsingCode = async (code: string) => {
        const requestBody: IAuthorizationRequest = { code };
        return await this.sendBackendRequest(RequestMethod.POST, endpoints.AUTH, requestBody);
    };

    private sendBackendRequest = async (
        method: RequestMethod,
        endpoint: endpoints | string,
        object: any
    ) => {
        const entityUrl = `${constants.API_URL}/${endpoint}`;
        return this.sendRequest(method, entityUrl, object, 'include');
    };

    public sendRequest = async (
        method: RequestMethod,
        url: string,
        object: any,
        credentials?: credentials
    ) => {
        const formattedObject = _format(object);
        let error: IError | null = null;

        try {
            const response = await fetch(url, {
                method,
                body: method === RequestMethod.GET ? undefined : JSON.stringify(formattedObject),
                // To keep the same express session information with each request
                credentials: credentials ? credentials : undefined,
                headers: {
                    Accept: 'application/json',
                    'Content-Type': 'application/json'
                }
            });

            if (response.status >= 200 && response.status < 300) {
                const contentType = response.headers.get('content-type');
                if (contentType && contentType.indexOf('application/json') !== -1) {
                    return await response.json();
                }
                return await response.text();
            }
            if (response.status === 403) {
                AlertStore!.setFadeMessage(httpStatusDescriptionCodeList[403]).then(() => {
                    LoginStore.clear();
                });
                return;
            }

            const responseText = await response.text();
            const errorMessage = responseText ? responseText : response.statusText;
            error = {
                message: errorMessage,
                name: 'Failed to fetch',
                errorCode: response.status
            };
        } catch {
            error = {
                name: 'Connectivity error',
                errorCode: FetchStatusCode.CONNECTION_ERROR,
                message: 'Yhteysongelma'
            };
        }

        if (error) {
            throw error;
        }
    };
}

// Formats the object to include dates as formatted strings, instead of Date objects
const _format = (obj: object) => {
    const entries = Object.entries(obj);
    const dates = entries
        .filter(([key, value]: [string, any]) => value instanceof Date)
        .map(([key, value]: [string, Date]) => [key, Moment(value).format()] as [string, string]);

    return {
        ...obj,
        ..._arrayToObject(dates)
    };
};

const _arrayToObject = (arr: [string, any][]) => {
    const res = {};
    arr.forEach(([key, value]: [string, any]) => {
        res[key] = value;
    });
    return res;
};

export default new ApiClient();

export { RequestMethod };
