import React from 'react';
import { observer } from 'mobx-react';
import classnames from 'classnames';
import ButtonType from '~/enums/buttonType';
import * as s from './button.scss';

interface IButtonProps {
    type: ButtonType;
    className?: string;
    disabled?: boolean;
    children: React.ReactNode;
    onClick(event: any): void;
}

const Button = observer((props: IButtonProps) => {
    const getTypeClass = (type: ButtonType) => {
        switch (type) {
        case ButtonType.SQUARE: {
            return s.square;
        }
        case ButtonType.SQUARE_SECONDARY: {
            return s.squareSecondary;
        }
        case ButtonType.ROUND: {
            return s.round;
        }
        case ButtonType.SAVE: {
            return s.save;
        }
        default: {
            return s.square;
        }
        }
    };

    const onClick = (e: any) => {
        if (!props.disabled) {
            props.onClick(e);
        }
    };

    return (
        <div
            className={
                classnames(
                    s.button,
                    props.className,
                    getTypeClass(props.type),
                    props.disabled ? s.disabled : null,
                )
            }
            onClick={onClick}
        >
            {props.children}
        </div>
    );
});

export default Button;
