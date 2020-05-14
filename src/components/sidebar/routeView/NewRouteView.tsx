import classnames from 'classnames';
import { inject, observer } from 'mobx-react';
import React from 'react';
import SaveButton from '~/components/shared/SaveButton';
import constants from '~/constants/constants';
import RouteFactory from '~/factories/routeFactory';
import { IRoute } from '~/models';
import navigator from '~/routing/navigator';
import QueryParams from '~/routing/queryParams';
import routeBuilder from '~/routing/routeBuilder';
import SubSites from '~/routing/subSites';
import RouteService from '~/services/routeService';
import { AlertStore } from '~/stores/alertStore';
import { ErrorStore } from '~/stores/errorStore';
import { MapStore } from '~/stores/mapStore';
import { RouteStore } from '~/stores/routeStore';
import SidebarHeader from '../SidebarHeader';
import RouteForm from './RouteForm';
import * as s from './newRouteView.scss';

interface IRouteViewState {
    isLoading: boolean;
}

interface IRouteViewProps {
    isEditingDisabled: boolean;
    isNewRoute: boolean;
    route?: IRoute;
    routeStore?: RouteStore;
    mapStore?: MapStore;
    alertStore?: AlertStore;
    errorStore?: ErrorStore;
}

const ENVIRONMENT = constants.ENVIRONMENT;

@inject('routeStore', 'mapStore', 'alertStore', 'errorStore')
@observer
class NewRouteView extends React.Component<IRouteViewProps, IRouteViewState> {
    constructor(props: IRouteViewProps) {
        super(props);
        this.state = {
            isLoading: true,
        };
    }

    componentDidMount() {
        this.fetchAllRouteIds();
        this.createNewRoute();
    }

    componentDidUpdate() {
        this.fetchAllRouteIds();
    }

    componentWillUnmount() {
        this.props.routeStore!.clear();
    }

    private fetchAllRouteIds = async () => {
        if (this.props.routeStore!.existingRouteIds.length > 0) return;

        try {
            const existinRouteIds = await RouteService.fetchAllRouteIds();
            this.props.routeStore!.setExistingRouteIds(existinRouteIds);
        } catch (e) {
            this.props.errorStore!.addError('Olemassa olevien reittien haku ei onnistunut', e);
        }
    };

    private createNewRoute = async () => {
        this.props.mapStore!.initCoordinates();

        try {
            const lineId = navigator.getQueryParam(QueryParams.lineId);
            const newRoute = RouteFactory.createNewRoute(lineId);
            this.props.routeStore!.activate({ route: newRoute, isNewRoute: true });
        } catch (e) {
            this.props.errorStore!.addError('Uuden reitin luonti epäonnistui', e);
        }

        this.setState({
            isLoading: false,
        });
    };

    private save = async () => {
        const routeStore = this.props.routeStore!;
        this.setState({ isLoading: true });

        const route = routeStore.route;
        try {
            await RouteService.createRoute(route!);
            this.props.alertStore!.setFadeMessage({ message: 'Tallennettu!' });
        } catch (e) {
            this.props.errorStore!.addError(`Tallennus epäonnistui`, e);
            return;
        }
        this.redirectToLineView();
    };

    private redirectToLineView = () => {
        const lineId = navigator.getQueryParam(QueryParams.lineId);
        const lineViewLink = routeBuilder.to(SubSites.line).toTarget(':id', lineId).toLink();
        navigator.goTo({ link: lineViewLink, shouldSkipUnsavedChangesPrompt: true });
    };

    private onChangeRouteProperty = (property: keyof IRoute) => (value: any) => {
        this.props.routeStore!.updateRouteProperty(property, value);
        this.forceUpdate();
    };

    render() {
        const routeStore = this.props.routeStore!;
        const isEditingDisabled = this.props.isEditingDisabled;
        const invalidPropertiesMap = isEditingDisabled ? {} : routeStore.invalidPropertiesMap;
        const route = isEditingDisabled ? this.props.route : routeStore.route;
        const lineId = navigator.getQueryParam(QueryParams.lineId);
        if (!route) return null;
        const isRouteFormValid = routeStore.isRouteFormValid;
        const isSaveAllowed = ENVIRONMENT !== 'prod' && ENVIRONMENT !== 'stage';
        const savePreventedNotification = isSaveAllowed
            ? ''
            : 'Uuden reitin tallentamista ei vielä tueta, sillä vanha käyttöliittymä ei näytä reittiä ellei sillä ole olemassa olevaa reitinsuuntaa eikä reitinsuuntia voi vielä luoda uudella käyttöliittymällä. Voit kokeilla reitin luontia dev-ympäristössä. Jos haluat luoda reittejä tuotannossa, joudut käyttämään vanhaa JORE-ympäristöä.';
        return (
            <div className={classnames(s.routeView, s.form)}>
                <SidebarHeader
                    isBackButtonVisible={true}
                    isCloseButtonVisible={true}
                    isEditing={true}
                >
                    <div>Luo uusi reitti linjalle {lineId}</div>
                </SidebarHeader>
                <div className={s.routeFormWrapper}>
                    <RouteForm
                        route={route}
                        isNewRoute={true}
                        isEditing={!isEditingDisabled}
                        onChangeRouteProperty={this.onChangeRouteProperty}
                        invalidPropertiesMap={invalidPropertiesMap}
                    />
                </div>
                <SaveButton
                    onClick={this.save}
                    disabled={!isRouteFormValid}
                    savePreventedNotification={savePreventedNotification}
                    isWarningButton={!isSaveAllowed}
                >
                    Luo uusi reitti
                </SaveButton>
            </div>
        );
    }
}
export default NewRouteView;
