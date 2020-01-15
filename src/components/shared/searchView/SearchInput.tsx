import { inject, observer } from 'mobx-react';
import React from 'react';
import { SearchResultStore } from '~/stores/searchResultStore';
import { SearchStore } from '~/stores/searchStore';
import Loader from '../loader/Loader';
import * as s from './searchInput.scss';

interface ISearchInputProps {
    searchStore?: SearchStore;
    searchResultStore?: SearchResultStore;
}

@inject('searchStore', 'searchResultStore')
@observer
class SearchInput extends React.Component<ISearchInputProps> {
    private onSearchInputChange = (event: React.FormEvent<HTMLInputElement>) => {
        const newValue = event.currentTarget.value;
        this.props.searchStore!.setSearchInput(newValue);
    };

    render() {
        return (
            <div className={s.lineSearchView} data-cy='lineSearch'>
                <div className={s.inputContainer}>
                    <input
                        placeholder='Hae'
                        type='text'
                        value={this.props.searchStore!.searchInput}
                        onChange={this.onSearchInputChange}
                    />
                    {this.props.searchResultStore!.isSearching && (
                        <div className={s.loader}>
                            <Loader size='tiny' hasNoMargin={true} />
                        </div>
                    )}
                </div>
            </div>
        );
    }
}

export default SearchInput;
