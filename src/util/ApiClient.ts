import endpoints from '~/enums/endpoints';
import FetchStatusCode from '~/enums/fetchStatusCode';
import ApiClientHelper from './apiClientHelper';

enum RequestMethod {
    POST= 'POST',
    PUT= 'PUT',
    DELETE= 'DELETE',
}

interface IAuthorizationRequest {
    code: string;
}

export class IRequestError {
    errorCode: FetchStatusCode;
    message: string;
}

const API_URL = process.env.API_URL || 'http://localhost:3040';

class ApiClient {
    public updateObject = async (entityName: endpoints, object: any) => {
        return await this.sendRequest(RequestMethod.POST, entityName, object);
    }

    public createObject = async (entityName: endpoints, object: any) => {
        return await this.sendRequest(RequestMethod.PUT, entityName, object);
    }

    public deleteObject = async (entityName: endpoints, object: any) => {
        return await this.sendRequest(RequestMethod.DELETE, entityName, object);
    }

    public authorizeUsingCode = async (code: string) => {
        const requestBody: IAuthorizationRequest = { code };
        return await this.sendRequest(
            RequestMethod.POST, endpoints.AUTH, requestBody);
    }

    private sendRequest = async (method: RequestMethod, endpoint: endpoints, object: any) => {
        const formattedObject = ApiClientHelper.format(object);
        let error : (IRequestError | null) = null;

        try {
            const response = await fetch(this.getUrl(endpoint), {
                method,
                body: JSON.stringify(formattedObject),
                // To keep the same express session information with each request
                credentials: 'include',
                headers: {
                    Accept: 'application/json',
                    'Content-Type': 'application/json',
                },
            });

            if (response.status >= 200 && response.status < 300) {
                const contentType = response.headers.get('content-type');
                if (contentType && contentType.indexOf('application/json') !== -1) {
                    return await response.json();
                }
                return await response.text();
            }
            error = {
                errorCode: response.status,
                message: response.statusText,
            };
        } catch (err) {
            error = {
                errorCode: FetchStatusCode.CONNECTION_ERROR,
                message: 'Yhteysongelma',
            };
        }

        if (error) {
            throw error;
        }
    }

    private getUrl = (entityName: endpoints) => {
        return `${API_URL}/${entityName}`;
    }
}

export default ApiClient;
