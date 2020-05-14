import { inject, observer } from 'mobx-react';
import React from 'react';
import { Button } from '~/components/controls';
import InputContainer from '~/components/controls/InputContainer';
import { IRoutePathLink } from '~/models';
import routePathLinkValidationModel from '~/models/validationModels/routePathLinkValidationModel';
import { RoutePathLinkMassEditStore } from '~/stores/routePathLinkMassEditStore';
import { RoutePathStore } from '~/stores/routePathStore';
import FormValidator, { IValidationResult } from '~/validation/FormValidator';
import SidebarHeader from '../../SidebarHeader';
import s from './routePathLinkMassEditView.scss';

interface IRoutePathLinkMassEditViewProps {
    routePathLinks: IRoutePathLink[];
    isEditingDisabled: boolean;
    routePathStore?: RoutePathStore;
    routePathLinkMassEditStore?: RoutePathLinkMassEditStore;
}

interface IRoutePathLinkMassEditViewState {
    editMode: EditMode | null;
    destinationFi1: string;
    destinationFi2: string;
    destinationSw1: string;
    destinationSw2: string;
    destinationShieldFi: string;
    destinationShieldSw: string;
    invalidPropertiesMap: object;
}

type EditMode = 'via' | 'kilpiVia';

@inject('routePathStore', 'routePathLinkMassEditStore')
@observer
class RoutePathLinkMassEditView extends React.Component<
    IRoutePathLinkMassEditViewProps,
    IRoutePathLinkMassEditViewState
> {
    private initialState = {
        editMode: null,
        destinationFi1: '',
        destinationFi2: '',
        destinationSw1: '',
        destinationSw2: '',
        destinationShieldFi: '',
        destinationShieldSw: '',
        invalidPropertiesMap: {},
    };
    state = this.initialState;

    componentDidUpdate(prevProps: IRoutePathLinkMassEditViewProps) {
        if (prevProps.routePathLinks.length === 0 && this.props.routePathLinks.length > 0) {
            const firstRpLink = this.props.routePathLinks[0];
            this.setState({
                editMode: null,
                destinationFi1: firstRpLink.destinationFi1 ? firstRpLink.destinationFi1 : '',
                destinationFi2: firstRpLink.destinationFi2 ? firstRpLink.destinationFi2 : '',
                destinationSw1: firstRpLink.destinationSw1 ? firstRpLink.destinationSw1 : '',
                destinationSw2: firstRpLink.destinationSw2 ? firstRpLink.destinationSw2 : '',
                destinationShieldFi: firstRpLink.destinationShieldFi
                    ? firstRpLink.destinationShieldFi
                    : '',
                destinationShieldSw: firstRpLink.destinationShieldSw
                    ? firstRpLink.destinationShieldSw
                    : '',
                invalidPropertiesMap: {},
            });
        }
    }

    componentWillUnmount() {
        this.props.routePathLinkMassEditStore!.clear();
    }

    private onPropertyChange = (property: string) => (value: string) => {
        const currentState = this.state;
        const invalidPropertiesMap = currentState.invalidPropertiesMap;

        invalidPropertiesMap[property] = FormValidator.validateProperty(
            routePathLinkValidationModel[property],
            value
        );

        currentState[property] = value;
        currentState.invalidPropertiesMap = invalidPropertiesMap;
        this.setState(currentState);
    };

    private editRoutePathLinks = () => {
        const routePathLinks = this.props.routePathLinks;
        if (this.state.editMode === 'via') {
            routePathLinks.forEach((rpLink) => {
                this.updateRoutePathLinkProperty(rpLink, 'destinationFi1');
                this.updateRoutePathLinkProperty(rpLink, 'destinationFi2');
                this.updateRoutePathLinkProperty(rpLink, 'destinationSw1');
                this.updateRoutePathLinkProperty(rpLink, 'destinationSw2');
            });
        } else if (this.state.editMode === 'kilpiVia') {
            routePathLinks.forEach((rpLink) => {
                this.updateRoutePathLinkProperty(rpLink, 'destinationShieldFi');
                this.updateRoutePathLinkProperty(rpLink, 'destinationShieldSw');
            });
        } else {
            throw 'editMode not supported.';
        }
    };

    private updateRoutePathLinkProperty = (
        routePathLink: IRoutePathLink,
        property: keyof IRoutePathLink
    ) => {
        this.props.routePathStore!.updateRoutePathLinkProperty(
            routePathLink.orderNumber,
            property,
            this.state[property]
        );
    };

    private setEditMode = (mode: EditMode | null) => {
        this.setState({
            editMode: mode,
        });
    };

    private closeEditing = () => {
        this.setState(this.initialState);
        this.props.routePathLinkMassEditStore!.clear();
    };

    private isFormValid = () => {
        const invalidPropertiesList: any = [];
        const _insertInvalidProperty = (property: string) => {
            if (this.state.invalidPropertiesMap[property]) {
                invalidPropertiesList.push(this.state.invalidPropertiesMap[property]);
            }
        };
        if (this.state.editMode === 'via') {
            _insertInvalidProperty('destinationFi1');
            _insertInvalidProperty('destinationFi2');
            _insertInvalidProperty('destinationSw1');
            _insertInvalidProperty('destinationSw2');
        } else if (this.state.editMode === 'kilpiVia') {
            _insertInvalidProperty('destinationShieldFi');
            _insertInvalidProperty('destinationShieldSw');
        } else {
            throw 'editMode not supported.';
        }

        return !invalidPropertiesList.some(
            (validatorResult: IValidationResult) => !validatorResult.isValid
        );
    };

    render() {
        const { isEditingDisabled } = this.props;
        const {
            editMode,
            destinationFi1,
            destinationFi2,
            destinationSw1,
            destinationSw2,
            destinationShieldFi,
            destinationShieldSw,
            invalidPropertiesMap,
        } = this.state;

        const routePathLinks = this.props.routePathLinks;
        if (routePathLinks.length === 0) return null;

        return (
            <div className={s.routePathMassEditView}>
                <div className={s.headerWrapper}>
                    <SidebarHeader
                        onCloseButtonClick={this.closeEditing}
                        onBackButtonClick={() => this.setEditMode(null)}
                        isCloseButtonVisible={true}
                        isBackButtonVisible={editMode !== null}
                    >
                        {`Muokkaa valittuja pysäkkejä (${routePathLinks.length})`}
                    </SidebarHeader>
                </div>
                <div className={s.content}>
                    {editMode === null ? (
                        <>
                            <Button
                                className={s.editModeSelectionButton}
                                onClick={() => this.setEditMode('via')}
                            >
                                Muokkaa määränpää tietoja
                            </Button>
                            <Button
                                className={s.editModeSelectionButton}
                                onClick={() => this.setEditMode('kilpiVia')}
                            >
                                Muokkaa määränpää kilpi tietoja
                            </Button>
                        </>
                    ) : editMode === 'via' ? (
                        <>
                            <div className={s.flexRow}>
                                <InputContainer
                                    label='1. MÄÄRÄNPÄÄ SUOMEKSI'
                                    disabled={isEditingDisabled}
                                    value={destinationFi1}
                                    validationResult={invalidPropertiesMap['destinationFi1']}
                                    onChange={this.onPropertyChange('destinationFi1')}
                                />
                                <InputContainer
                                    label='2. MÄÄRÄNPÄÄ SUOMEKSI'
                                    disabled={isEditingDisabled}
                                    value={destinationFi2}
                                    validationResult={invalidPropertiesMap['destinationFi2']}
                                    onChange={this.onPropertyChange('destinationFi2')}
                                />
                            </div>
                            <div className={s.flexRow}>
                                <InputContainer
                                    label='1. MÄÄRÄNPÄÄ RUOTSIKSI'
                                    disabled={isEditingDisabled}
                                    value={destinationSw1}
                                    validationResult={invalidPropertiesMap['destinationSw1']}
                                    onChange={this.onPropertyChange('destinationSw1')}
                                />
                                <InputContainer
                                    label='2. MÄÄRÄNPÄÄ RUOTSIKSI'
                                    disabled={isEditingDisabled}
                                    value={destinationSw2}
                                    validationResult={invalidPropertiesMap['destinationSw2']}
                                    onChange={this.onPropertyChange('destinationSw2')}
                                />
                            </div>
                        </>
                    ) : (
                        <div className={s.flexRow}>
                            <InputContainer
                                label='1. MÄÄRÄNPÄÄ KILPI SUOMEKSI'
                                disabled={isEditingDisabled}
                                value={destinationShieldFi}
                                validationResult={invalidPropertiesMap['destinationShieldFi']}
                                onChange={this.onPropertyChange('destinationShieldFi')}
                            />
                            <InputContainer
                                label='2. MÄÄRÄNPÄÄ KILPI RUOTSIKSI'
                                disabled={isEditingDisabled}
                                value={destinationShieldSw}
                                validationResult={invalidPropertiesMap['destinationShieldSw']}
                                onChange={this.onPropertyChange('destinationShieldSw')}
                            />
                        </div>
                    )}

                    {editMode !== null && (
                        <Button
                            className={s.editButton}
                            onClick={this.editRoutePathLinks}
                            disabled={!this.isFormValid()}
                        >
                            Muokkaa
                        </Button>
                    )}
                </div>
            </div>
        );
    }
}

export default RoutePathLinkMassEditView;
