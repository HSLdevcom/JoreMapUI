import React from 'react';
import * as s from './toggleSwitch.scss';

interface IToggleSwitchState {
    isChecked: boolean;
}

interface IToggleSwitchProps {
    value: boolean;
    color: string;
    onClick(event: any): void;
}

class ToggleSwitch extends React.Component<IToggleSwitchProps, IToggleSwitchState> {
    private doNothing() {
        // Empty function
        // Needed because input field wants an onChange function if its checked field is changed
    }

    public render(): any {
        const onClick = (event: React.MouseEvent<HTMLElement>) => {
            this.props.onClick(event);
            event.stopPropagation();
            event.preventDefault();
        };

        const style = {
            backgroundColor: this.props.color,
        };

        return (
            <label
                onClick={onClick}
                className={s.toggleSwitchView}
            >
                <input
                    type='checkbox'
                    checked={this.props.value}
                    onChange={this.doNothing}
                />
                <div
                    style={style}
                    className={s.slider}
                />
            </label>
        );
    }
}

export default ToggleSwitch;
