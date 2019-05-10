import React from 'react';
import { observer } from 'mobx-react';
import classnames from 'classnames';
import * as s from './checkbox.scss';

interface ICheckboxProps {
    disabled?: boolean;
    checked: boolean;
    content: React.ReactNode;
    onClick(): void;
}

const Checkbox = observer((props: ICheckboxProps) => {
    const doNothing = () => {};

    const onClick = (event: React.MouseEvent<HTMLElement>) => {
        props.onClick();
        event.stopPropagation();
        event.preventDefault();
    };

    return (
        <label
            onClick={onClick}
            className={classnames(
                s.container,
                props.disabled ? s.disabled : undefined
            )}
        >
            <div className={s.content}>{props.content}</div>
            <input
                type='checkbox'
                checked={props.checked}
                onChange={doNothing}
            />
            <span className={s.checkmark} />
        </label>
    );
});

export default Checkbox;
