import classnames from 'classnames';
import { observer } from 'mobx-react';
import React from 'react';
import 'react-datepicker/dist/react-datepicker.css';
import { IValidationResult } from '~/validation/FormValidator';
import Loader from '../shared/loader/Loader';
import DatePicker from './DatePicker';
import TextContainer from './TextContainer';
import * as s from './inputContainer.scss';

type inputType = 'text' | 'number' | 'date';

interface IInputProps {
    label: string | JSX.Element;
    onChange?: (value: any) => void;
    validationResult?: IValidationResult;
    placeholder?: string;
    className?: string;
    disabled?: boolean;
    value?: string | number | Date | null;
    type?: inputType; // Defaults to text
    decimalLimit?: number;
    isEmptyDateValueAllowed?: boolean;
    capitalizeInput?: boolean;
    isClearButtonVisibleOnDates?: boolean;
    isTimeIncluded?: boolean;
    isInputLabelDarker?: boolean;
    isLoading?: boolean;
    onFocus?: () => void;
    minStartDate?: Date;
    maxEndDate?: Date;
}

const InputContainer = observer((props: IInputProps) => {
    const {
        label,
        onChange,
        validationResult,
        placeholder,
        className,
        disabled,
        value,
        type = 'text',
        decimalLimit,
        isEmptyDateValueAllowed,
        capitalizeInput,
        isClearButtonVisibleOnDates,
        isTimeIncluded,
        isInputLabelDarker,
        isLoading,
        onFocus,
        minStartDate,
        maxEndDate,
        ...attrs
    } = props;

    if (props.disabled) {
        return (
            <TextContainer
                label={label}
                value={value}
                validationResult={validationResult}
                isTimeIncluded={isTimeIncluded}
                isInputLabelDarker={isInputLabelDarker}
                isLoading={isLoading}
                className={className}
                {...attrs}
            />
        );
    }

    const onTextChange = (e: React.FormEvent<HTMLInputElement>) => {
        let value = e.currentTarget.value;
        if (props.type === 'number') {
            const onlyNumbersReg = new RegExp('^[0-9]+$');
            const onlyNumbersAndDotReg = new RegExp(`^[0-9]{1,2}([.][0-9]{1,${decimalLimit}})?$`);
            const testReg =
                decimalLimit && decimalLimit > 0 ? onlyNumbersAndDotReg : onlyNumbersReg;
            if (testReg.test(value)) {
                const parsedValue = parseFloat(value);
                props.onChange!(!isNaN(parsedValue) ? parsedValue : null);
            } else if (value.length === 0) {
                props.onChange!('');
            }
        } else {
            if (props.capitalizeInput) {
                value = value.toUpperCase();
            }
            props.onChange!(value);
        }
    };

    return (
        <div className={classnames(s.formItem, className)}>
            <div className={isInputLabelDarker ? s.darkerInputLabel : s.inputLabel}>
                {label ? label : ''}
            </div>
            {isLoading ? (
                <div className={s.loaderContainer}>
                    <Loader size='tiny' hasNoMargin={true} />
                </div>
            ) : type === 'date' ? (
                <DatePicker
                    value={props.value! as Date}
                    onChange={props.onChange!}
                    isClearButtonVisible={props.isClearButtonVisibleOnDates}
                    isEmptyValueAllowed={props.isEmptyDateValueAllowed}
                    onFocus={props.onFocus}
                    minStartDate={props.minStartDate}
                    maxEndDate={props.maxEndDate}
                    {...attrs}
                />
            ) : (
                <input
                    placeholder={props.disabled ? '' : props.placeholder}
                    type={props.type}
                    className={classnames(
                        s.staticHeight,
                        s.inputField,
                        props.disabled ? s.disabled : null,
                        validationResult && !validationResult.isValid ? s.invalidInput : null
                    )}
                    value={
                        props.value !== null && props.value !== undefined
                            ? (props.value as string)
                            : ''
                    }
                    onChange={onTextChange}
                    onFocus={props.onFocus}
                    {...attrs}
                />
            )}

            {validationResult && validationResult.errorMessage && (
                <div className={validationResult.isValid ? s.warningMessage : s.errorMessage}>
                    {validationResult.errorMessage}
                </div>
            )}
        </div>
    );
});

export default InputContainer;
