import React from 'react';
import { inject, observer } from 'mobx-react';
import classnames from 'classnames';
import { FiEdit, FiCopy } from 'react-icons/fi';
import ButtonType from '~/enums/buttonType';
import Button from '~/components/controls/Button';
import { IRoutePath } from '~/models';
// TODO: Move this code to parent
// import RoutePathService from '~/services/routePathService';
import { NotificationStore } from '~/stores/notificationStore';
// TODO: Move this code to parent
// import NotificationType from '~/enums/notificationType';
import { RoutePathStore } from '~/stores/routePathStore';
import { IValidationResult } from '~/validation/FormValidator';
import navigator from '~/routing/navigator';
import routeBuilder from '~/routing/routeBuilder';
import subSites from '~/routing/subSites';
import RoutePathViewForm from './RoutePathViewForm';
import * as s from './routePathInfoTab.scss';

interface IRoutePathInfoTabState {
    isEditingDisabled: boolean;
    invalidFieldsMap: object;
    isLoading: boolean;
    hasSavedNewRoutePath: boolean;
}

interface IRoutePathInfoTabProps {
    routePathStore?: RoutePathStore;
    notificationStore?: NotificationStore;
    routePath: IRoutePath;
    isAddingNew: boolean;
}

@inject('routePathStore', 'notificationStore')
@observer
class RoutePathInfoTab extends React.Component<IRoutePathInfoTabProps, IRoutePathInfoTabState>{
    constructor(props: any) {
        super(props);
        this.state = {
            isEditingDisabled: true,
            invalidFieldsMap: {},
            isLoading: true,
            hasSavedNewRoutePath: false,
        };
    }

    /* TODO: Move this code to parent
    private routePathIsNew = () => {
        return this.props.isAddingNew && !this.state.hasSavedNewRoutePath;
    }
    */

    private toggleEditing = () => {
        const isEditingDisabled = !this.state.isEditingDisabled;
        this.setState({ isEditingDisabled });
    }

    /* TODO: Move this code to parent
    private save = async () => {
        this.setState({ isLoading: true });
        try {
            if (this.routePathIsNew()) {
                await RoutePathService.createRoutePath(this.props.routePathStore!.routePath!);
            } else {
                await RoutePathService.updateRoutePath(this.props.routePathStore!.routePath!);
            }
            this.props.routePathStore!.resetHaveLocalModifications();
            this.props.notificationStore!.addNotification({
                message: 'Tallennus onnistui',
                type: NotificationType.SUCCESS,
            });
        } catch (err) {
            const errMessage = err.message ? `, (${err.message})` : '';
            this.props.notificationStore!.addNotification({
                message: `Tallennus epäonnistui${errMessage}`,
                type: NotificationType.ERROR,
            });
        }
        this.setState({ isLoading: false });
    }
    */

    private markInvalidFields = (field: string, isValid: boolean) => {
        this.setState({
            invalidFieldsMap: {
                ...this.state.invalidFieldsMap,
                [field]: isValid,
            },
        });
    }

    /* TODO: Move this code to parent
    private isFormValid = () => {
        return !Object.values(this.state.invalidFieldsMap)
            .some(fieldIsValid => !fieldIsValid);
    }
    */

    private onChange = (property: string, value: any, validationResult?: IValidationResult) => {
        this.props.routePathStore!.updateRoutePathProperty(property, value);
        if (validationResult) {
            this.markInvalidFields(property, validationResult!.isValid);
        }
    }

    private redirectToNewRoutePathView = () => {
        const routePath = this.props.routePathStore!.routePath;
        if (!routePath) return;

        const newRoutePathLink = routeBuilder
        .to(subSites.newRoutePath, { routeId: routePath.routeId, lineId: routePath.lineId })
        .toLink();

        navigator.goTo(newRoutePathLink);
    }

    render() {
        // tslint:disable-next-line:max-line-length
        const routePath = this.props.routePathStore!.routePath;

        if (!routePath) return 'Error';
        return (
        <div className={classnames(s.routePathInfoTabView, s.form)}>
            <div className={s.content}>
                <div className={s.routePathTabActions}>
                    <Button
                        type={ButtonType.ROUND}
                        onClick={this.toggleEditing!}
                    >
                        <FiEdit/>
                        {
                            this.state.isEditingDisabled ? 'Muokkaa' : 'Peruuta'
                        }
                    </Button>
                    <Button
                        type={ButtonType.ROUND}
                        onClick={this.redirectToNewRoutePathView!}
                    >
                        <FiCopy />
                        Kopioi
                    </Button>
                </div>
                <div className={s.formSection}>
                    <RoutePathViewForm
                        onChange={this.onChange}
                        isEditingDisabled={this.state.isEditingDisabled}
                        routePath={this.props.routePathStore!.routePath!}
                    />
                </div>
            </div>
            {/*
            TODO: Move this code to parent
            <Button
                onClick={this.save}
                type={ButtonType.SAVE}
                disabled={
                    !this.props.routePathStore!.hasUnsavedModifications
                    || !this.props.routePathStore!.isGeometryValid
                    || !this.isFormValid()}
            >
                {this.routePathIsNew() ? 'Luo reitinsuunta' : 'Tallenna muutokset'}
            </Button>*/}
        </div>
        );
    }
}
export default RoutePathInfoTab;
