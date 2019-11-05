import classnames from 'classnames';
import fi from 'date-fns/locale/fi';
import { observer } from 'mobx-react';
import Moment from 'moment';
import React from 'react';
import ReactDatePicker, { registerLocale } from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import ReactDOM from 'react-dom';
import { IoMdCalendar } from 'react-icons/io';
import { dateToDateString } from '~/util/dateFormatHelpers';
import { IValidationResult } from '~/validation/FormValidator';
import * as s from './inputContainer.scss';

registerLocale('fi', fi);

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
    capitalizeInput?: boolean;
    isClearButtonVisibleOnDates?: boolean;
    darkerInputLabel?: boolean;
}

const renderEditableContent = (props: IInputProps) => {
    const type = props.type || 'text';
    const validationResult = props.validationResult;
    const onChange = (e: React.FormEvent<HTMLInputElement>) => {
        let value = e.currentTarget.value;
        if (props.type === 'number') {
            const parsedValue = parseFloat(value);
            props.onChange!(!isNaN(parsedValue) ? parsedValue : null);
        } else {
            if (props.capitalizeInput) {
                value = value.toUpperCase();
            }
            props.onChange!(value);
        }
    };

    if (type === 'date') {
        return renderDatePicker({
            value: props.value! as Date,
            onChange: props.onChange!,
            isClearButtonVisible: props.isClearButtonVisibleOnDates
        });
    }

    return (
        <input
            placeholder={props.disabled ? '' : props.placeholder}
            type={props.type === 'number' ? 'number' : 'text'}
            className={classnames(
                s.staticHeight,
                s.inputField,
                props.disabled ? s.disabled : null,
                validationResult && !validationResult.isValid ? s.invalidInput : null
            )}
            value={
                props.value !== null && props.value !== undefined
                    ? (props.value as string | number)
                    : ''
            }
            onChange={onChange}
        />
    );
};

const renderDatePicker = ({
    value,
    onChange,
    isClearButtonVisible // TODO: implement functionality for this
}: {
    value?: Date;
    isClearButtonVisible?: boolean;
    onChange: (date: Date) => void;
}) => {
    const minDate = new Date();
    minDate.setFullYear(1970);
    minDate.setMonth(0);
    minDate.setDate(1);
    const maxDate = new Date();
    maxDate.setFullYear(2070);
    maxDate.setMonth(0);
    maxDate.setDate(1);
    return (
        <div className={classnames(s.staticHeight)}>
            <ReactDatePicker
                customInput={renderDatePickerInput({ value, onChange, placeholder: 'Syötä' })}
                selected={value}
                onChange={onChange}
                locale={fi}
                dateFormat={'dd.MM.yyyy'}
                showMonthDropdown={true}
                peekNextMonth={true}
                showYearDropdown
                scrollableYearDropdown={true}
                yearDropdownItemNumber={100}
                minDate={minDate}
                maxDate={maxDate}
                dateFormatCalendar={'dd.MM.yyyy'}
                popperContainer={_renderCalendarContainer}
            />
        </div>
    );
};

const _renderCalendarContainer = ({ children }: { children: JSX.Element[] }): React.ReactNode => {
    const el = document.getElementById('root');
    return ReactDOM.createPortal(children, el!);
};

const renderDatePickerInput = ({
    onChange,
    placeholder,
    value
}: {
    onChange: (value: any) => void;
    placeholder: string;
    value?: Date;
}) => {
    return (
        <div className={classnames(s.staticHeight, s.inputField)}>
            <input
                placeholder={placeholder}
                type={'text'}
                value={value ? dateToDateString(value) : ''}
                onChange={onChange}
            />
            <IoMdCalendar className={s.calendarIcon} />
        </div>
    );
};

const renderValidatorResult = (validationResult?: IValidationResult) => {
    if (!validationResult || !validationResult.errorMessage) {
        return null;
    }
    return <div className={s.errorMessage}>{validationResult.errorMessage}</div>;
};

const renderUneditableContent = (props: IInputProps) => (
    <div className={classnames(s.inputField, props.disabled ? s.staticHeight : null)}>
        {props.value instanceof Date
            ? Moment(props.value!).format('DD.MM.YYYY')
            : props.value
            ? props.value
            : '-'}
    </div>
);

const InputContainer = observer((props: IInputProps) => {
    return (
        <div className={classnames(s.formItem, s.inputContainer, props.className)}>
            {props.label && (
                <div className={props.darkerInputLabel ? s.darkerInputLabel : s.inputLabel}>
                    {props.label}
                </div>
            )}
            {props.disabled ? renderUneditableContent(props) : renderEditableContent(props)}
            {renderValidatorResult(props.validationResult)}
        </div>
    );
});

export default InputContainer;
