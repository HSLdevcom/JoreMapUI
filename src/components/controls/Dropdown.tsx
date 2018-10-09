import * as React from 'react';
import * as s from './dropdown.scss';

interface IDropdownState {
    selectedValue?: string;
}

interface IDropdownProps {
    selected: string;
    items: string[];
    onChange(selectedItem: string): void;
}

class Dropdown extends React.Component
<IDropdownProps, IDropdownState> {
    constructor(props: any) {
        super(props);
        this.state = {
            selectedValue: undefined,
        };
    }

    onChange = (event: any) => {
        this.setState({
            selectedValue: event.target.value,
        });
        this.props.onChange(event.target.value);
    }

    public render(): any {
        return (
            <select
                className={s.dropdownView}
                value={this.state.selectedValue}
                onChange={this.onChange}
                defaultValue={this.props.selected}
            >
            {
                this.props.items.map((item) => {
                    return (
                        <option
                            key={item}
                            value={item}
                        >
                            {item}
                        </option>
                    );
                })
            }
            </select>
        );
    }
}

export default Dropdown;
