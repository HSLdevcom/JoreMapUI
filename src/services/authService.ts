import EndpointPath from '~/enums/endpointPath';
import navigator from '~/routing/navigator';
import QueryParams from '~/routing/queryParams';
import ErrorStore from '~/stores/errorStore';
import LoginStore from '~/stores/loginStore';
import ApiClient from '~/util/ApiClient';
import CodeListHelper from '~/util/CodeListHelper';

export interface IAuthorizationResponse {
    isOk: boolean;
    hasWriteAccess: boolean;
    errorTextKey?: string;
    email?: string;
}

class AuthService {
    public static async authenticate(onSuccess: () => void, onError: () => void) {
        const code = navigator.getQueryParam(QueryParams.code);
        const isTesting = navigator.getQueryParam(QueryParams.testing);
        let authorizationResponse: IAuthorizationResponse;
        try {
            authorizationResponse = (await ApiClient.authorizeUsingCode({
                code,
                isTesting
            })) as IAuthorizationResponse;
        } catch (error) {
            const errorResponse = JSON.parse(error.message) as IAuthorizationResponse;
            authorizationResponse = {
                isOk: errorResponse.isOk,
                hasWriteAccess: errorResponse.hasWriteAccess
            };
            if (errorResponse.errorTextKey) {
                let errorMessage;
                if (errorResponse.email) {
                    errorMessage = CodeListHelper.getText(errorResponse.errorTextKey, {
                        email: errorResponse.email
                    });
                } else {
                    errorMessage = CodeListHelper.getText(errorResponse.errorTextKey);
                }
                ErrorStore.addError(errorMessage);
            }
        }
        LoginStore.setAuthenticationInfo(authorizationResponse);

        authorizationResponse.isOk ? onSuccess() : onError();
    }

    public static async logout() {
        // TODO: Implement full logout clearing session in backend
        // https://github.com/HSLdevcom/jore-map-ui/issues/669
        await ApiClient.postRequest(EndpointPath.LOGOUT, {});
        LoginStore.clear();
    }
}

export default AuthService;
