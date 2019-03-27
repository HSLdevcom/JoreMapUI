import { Component } from 'react';
import FormValidator, { IValidationResult } from '~/validation/FormValidator';
import EventManager from '~/util/EventManager';

interface IViewFormBaseState {
    isLoading: boolean;
    invalidPropertiesMap: object;
    isEditingDisabled: boolean;
}

class ViewFormBase<Props, State extends IViewFormBaseState> extends Component<Props, State> {
    componentDidMount() {
        EventManager.on('geometryChange', this.enableEditing);
    }

    componentWillUnmount() {
        EventManager.off('geometryChange', this.enableEditing);
    }

    protected isFormValid = () => {
        return !Object.values(this.state.invalidPropertiesMap)
            .some(validatorResult => !validatorResult.isValid);
    }

    protected validateAllProperties = (validationModel: object, validationEntity: any) => {
        this.setState({
            invalidPropertiesMap: {},
        });

        Object.entries(validationModel).forEach(([property, validatorRule]) => {
            this.validateProperty(
                validatorRule,
                property,
                validationEntity[property],
            );
        });
    }

    protected validateProperty = (validatorRule: string, property: string, value: any) => {
        if (!validatorRule) return;

        const validatorResult: IValidationResult
            = FormValidator.validate(value, validatorRule);
        this.markInvalidProperties(property, validatorResult);
    }

    protected markInvalidProperties = (property: string, validatorResult: IValidationResult) => {
        const invalidPropertiesMap = this.state.invalidPropertiesMap;
        invalidPropertiesMap[property] = validatorResult;
        this.setState({
            invalidPropertiesMap,
        });
    }

    protected toggleIsEditingDisabled = (undoChange: () => void) => {
        if (!this.state.isEditingDisabled) {
            undoChange();
        }
        const isEditingDisabled = !this.state.isEditingDisabled;
        this.setState({
            isEditingDisabled,
            invalidPropertiesMap: {},
        });
    }

    protected enableEditing = () => {
        this.setState({ isEditingDisabled: false });
    }
}

export default ViewFormBase;
