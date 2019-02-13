import { Component } from 'react';

interface IViewFormBaseState {
    isLoading: boolean;
    invalidFieldsMap: object;
    isEditingDisabled: boolean;
}

class ViewFormBase<Props, State extends IViewFormBaseState> extends Component<Props, State> {
    protected isFormValid = () => {
        return !Object.values(this.state.invalidFieldsMap)
            .some(fieldIsValid => !fieldIsValid);
    }

    protected markInvalidFields = (field: string, isValid: boolean) => {
        const invalidFieldsMap = this.state.invalidFieldsMap;
        invalidFieldsMap[field] = isValid;
        this.setState({
            invalidFieldsMap,
        });
    }

    protected toggleIsEditingDisabled = (undoChange: () => void) => {
        if (!this.state.isEditingDisabled) {
            undoChange();
        }
        const isEditingDisabled = !this.state.isEditingDisabled;
        this.setState({
            isEditingDisabled,
            invalidFieldsMap: {},
        });
    }
}

export default ViewFormBase;
