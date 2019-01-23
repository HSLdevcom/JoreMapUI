import React, { Component } from 'react';
import classnames from 'classnames';
import * as s from './mapControlButton.scss';

interface MapControlButtonProps {
    label: string;
    onClick: () => void;
    isActive: boolean;
    isDisabled: boolean;
}

class MapControlButton extends Component<MapControlButtonProps>{
    private onClick = () => {
        if (!this.props.isDisabled) {
            this.props.onClick();
        }
    }
    render () {
        const classes = classnames(
            s.mapControlButton,
            this.props.isActive && !this.props.isDisabled ? s.active : null,
            this.props.isDisabled ? s.disabled : null,
        );

        return (
            <div
                className={classes}
                onClick={this.onClick}
                title={this.props.label}
            >
                {
                    this.props.children
                }
            </div>
        );
    }
}

export default MapControlButton;
