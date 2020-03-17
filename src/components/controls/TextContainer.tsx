import classnames from 'classnames';
import { observer } from 'mobx-react';
import Moment from 'moment';
import React from 'react';
import { IValidationResult } from '~/validation/FormValidator';
import * as s from './inputContainer.scss';

interface ITextContainerProps {
    label?: string | JSX.Element;
    value?: string | number | null | Date;
    validationResult?: IValidationResult;
    isTimeIncluded?: boolean;
    isInputLabelDarker?: boolean;
    isInputColorRed?: boolean;
}

const renderValidatorResult = (validationResult?: IValidationResult) => {
    if (!validationResult || !validationResult.errorMessage) {
        return null;
    }
    return <div className={s.errorMessage}>{validationResult.errorMessage}</div>;
};

const TextContainer = observer((props: ITextContainerProps) => {
    const {
        label,
        value,
        validationResult,
        isTimeIncluded,
        isInputLabelDarker,
        isInputColorRed,
        ...attrs
    } = props;
    return (
        <div className={s.formItem}>
            {label && (
                <div className={isInputLabelDarker ? s.darkerInputLabel : s.inputLabel}>
                    {label}
                </div>
            )}
            <div
                className={classnames(
                    s.textField,
                    s.staticHeight,
                    isInputColorRed ? s.redInputText : null
                )}
                {...attrs}
            >
                {value instanceof Date
                    ? Moment(value!).format(isTimeIncluded ? 'DD.MM.YYYY HH:mm' : 'DD.MM.YYYY')
                    : value
                    ? value
                    : '-'}
            </div>
            {renderValidatorResult(validationResult)}
        </div>
    );
});

export default TextContainer;
